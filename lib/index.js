/**
 * dsh-usage-meter-harness — backend plugin.
 *
 * Provides:
 *   - the `usageCost` session projection: per-session requests/tokens/model/
 *     pricing/cost, per-turn ledger, live account balance and budget,
 *     event-folded and replay-aware, served to the browser with zero client math,
 *   - a `usage-meter` settings namespace (currency, budget, price source, API key),
 *   - a small HTTP channel (`/api/usage-meter/*`) so the client popup can edit
 *     per-provider currency / balance / recharges and per-model price overrides,
 *   - a persisted popup config (`$DSH_HOME/usage-meter.json`) that survives
 *     restarts (per-provider ledger, price overrides, balances).
 *
 * rc.7 compatibility (IMPORTANT): the harness read path refuses to interpret a
 * session log containing an unknown event type that is not marked `ignorable`,
 * and `Session.append()` cannot attach `ignorable`. This plugin therefore NEVER
 * appends custom events (no `usage/balance`, no `usage/balance-ledger`). All
 * live numbers travel through the projection `view` reading in-memory state;
 * the log stays pristine and restart-loading keeps working.
 *
 * @module dsh-usage-meter-harness
 */
import z from '@deepseek-ai/schemastery';
import { z as zod } from 'zod';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, rmSync, copyFileSync, renameSync } from 'node:fs';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { BUNDLED_TABLE, DEEPSEEK_PEAK_OFF_PEAK_FROM } from "./prices-providers.js";
import { DEEPSEEK_PRICING_PAGE_URL, extractPricesViaLLM, fetchPricingPage, parsePricingPageHtml } from "./pricing-page.js";
// fetchParsedPricingPage 仍由 pricing-page.ts 导出（外部/测试可用）；端点内改用
// fetchPricingPage + parsePricingPageHtml 两步，以便模式2 LLM 兜底复用同一份 HTML。
import { estTokens } from "./globals.js";
import { currentPrices, fetchRemotePrices, fetchUsdToCny, resolvePricingForTime, PriceTable, } from "./prices.js";
import { fetchDeepSeekBalance, toSnapshot } from "./balance.js";
import { costBreakdown, costOf } from "./projection.js";
import { BILLING_TYPES, defaultUnknownRows, rowsFromPricing } from "./billing.js";
import { DEFAULT_WRAPPER_ROWS, LEGACY_DEFAULT_MARKERS, activePatterns, canonicalId, normalizeBindingKey, normalizePriceKey, normalizeProviderId, stripAllWrappers, wrapperRows, } from "./wrapper.js";
// ── configuration ────────────────────────────────────────────────────────────
const Config = z.object({
    /** Display / ledger currency (CNY default; USD via the popup). */
    currency: z.string().default('CNY'),
    /** URL serving a LiteLLM-shaped `model_prices_and_context_window.json`. */
    priceSourceUrl: z.string(),
    /** Refresh cadence for prices/balance/rate in ms (default 4h). */
    refreshIntervalMs: z.number().default(4 * 60 * 60 * 1000),
    /** DeepSeek API key, used ONLY to query `/user/balance` (kept secret). */
    deepseekApiKey: z.string().role('secret'),
    /** Initial balance for providers without a balance API (legacy, ≥0). */
    initialBalance: z.number(),
    /** Optional per-session budget; remaining = budget − estimated cost. */
    budget: z.number(),
    /** Server-side directory for exported/imported billing configs
     *  (empty = $DSH_HOME/usage-meter; persists across DSH upgrades). */
    billingConfigDir: z.string().default(''),
    /** 包装标记（视觉插件加在提供商/模型名上的前后缀），逐行可开关：
     *  新格式为 `[{pattern, enabled}]`；老格式（纯文本，换行分隔）仍可读，
     *  读取时自动补齐包装提供商相关的新默认行。命中即按底层 provider/model
     *  计费/聚合/查余额。用 `any` 承载两种形态，校验/归一在 wrapper.ts 内完成。 */
    wrapperMarkers: z.any().default(DEFAULT_WRAPPER_ROWS.map((r) => ({ ...r }))),
    /** 全局预算告警阈值（% 使用到 budget 的多少时预警，0/diff 关闭）。 */
    budgetAlertPct: z.number().default(0),
    /** 全局余额告警下限（余额低于该金额预警；0 = 关闭）。 */
    balanceAlertFloor: z.number().default(0),
});
/** Stable Cordis plugin name. */
export const name = 'usage-meter';
/** Required services: settings (config namespace), projection registry, webserver (config route). */
export const inject = ['settings', 'sessionProjections', 'webServer', 'llm'];
// Ambient runtime facts the (pure, module-level) projection `view` reads. The
// cfg-owned fields (priceSourceUrl / refreshIntervalMs / deepseekApiKey) are
// mirrored here so `savePersistedConfig()` can round-trip ALL global settings
// to the file regardless of which layer last set them.
const runtimeConfig = {
    currency: 'CNY',
    initialBalance: null,
    budget: null,
    budgetAlertPct: 0,
    balanceAlertFloor: 0,
};
/** Latest DeepSeek account-balance snapshot, surfaced through the projection. */
let currentBalance = null;
/** Live in-turn estimate (DeepSeek path only, in-memory — rc.7, never persisted):
 *  `spentSinceAnchor` is the sum of delta costs accrued since the last API
 *  anchor; the projection reports `currentBalance.totalBalance - spentSinceAnchor`.
 *  Every successful API refresh re-anchors (resets both to zero); a failed
 *  refresh KEEPS the estimate so the balance keeps ticking instead of freezing. */
let spentSinceAnchor = 0;
let lastLiveAt = 0;
/**
 * True while the currently-active model needs a CNY↔USD conversion (its
 * official pricing currency differs from the configured display currency).
 * The exchange rate is only fetched/refreshed while this is true.
 */
let rateNeeded = false;
/** Epoch ms of the last successful exchange-rate fetch; 0 = never fetched yet. */
let lastRateFetchedAt = 0;
// ── unified data directory (survives DSH upgrades) ───────────────────────────
// 插件所有持久化数据统一放在一个目录：config.json（额外状态）、salt（密钥加密盐）、
// stats.json（看板聚合）、exports/（计费配置导出）、apikeys/（每模型 DeepSeek key）。
// 该目录固定在 $DSH_HOME/usage-meter，与「工作目录路径」设置无关——内部状态绝
// 不能因一次设置改动而分裂或丢失。
function dataRoot() {
    return join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'usage-meter');
}
function configPath() {
    return join(dataRoot(), 'config.json');
}
/** 每模型独立 DeepSeek API key 目录（加密存储）。 */
function apikeysDir() {
    return join(dataRoot(), 'apikeys');
}
/** 旧版散落文件路径（向后兼容迁移用）。 */
function legacyStatePath() {
    return join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'usage-meter.json');
}
function legacySaltPath() {
    return join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'usage-meter.salt');
}
function saltFilePath() {
    return join(dataRoot(), 'salt');
}
/** 一次性迁移：旧散落文件 → 统一目录（config/salt 用 copy 保留旧文件；导出用 move 避免重复列出）。 */
function migrateToWorkdir() {
    try {
        mkdirSync(dataRoot(), { recursive: true });
        if (existsSync(legacyStatePath()) && !existsSync(configPath())) {
            try {
                copyFileSync(legacyStatePath(), configPath());
            }
            catch { /* ignore */ }
        }
        if (existsSync(legacySaltPath()) && !existsSync(saltFilePath())) {
            try {
                copyFileSync(legacySaltPath(), saltFilePath());
            }
            catch { /* ignore */ }
        }
        const exportsDir = join(dataRoot(), 'exports');
        try {
            mkdirSync(exportsDir, { recursive: true });
            for (const f of readdirSync(dataRoot())) {
                if (f.startsWith('dsh-billing-') && f.endsWith('.json')) {
                    const dst = join(exportsDir, f);
                    if (!existsSync(dst)) {
                        try {
                            renameSync(join(dataRoot(), f), dst);
                        }
                        catch { /* ignore */ }
                    }
                }
            }
        }
        catch { /* ignore */ }
    }
    catch { /* ignore */ }
}
// ── secret at-rest encryption (AES-256-CBC, machine-derived key) ────────────
// The DeepSeek API key never touches the disk in plaintext: it is encrypted
// with a key derived from a per-install random salt stored in the data dir
// (obfuscation-grade, instant — protects against casual file reading / sync
// leakage, not a targeted local attacker who can read this source).
let cachedSecretKey = null;
function secretKey() {
    if (cachedSecretKey !== null)
        return cachedSecretKey;
    let salt;
    try {
        if (existsSync(saltFilePath()))
            salt = readFileSync(saltFilePath(), 'utf8');
        else {
            salt = randomBytes(16).toString('hex');
            mkdirSync(dataRoot(), { recursive: true });
            writeFileSync(saltFilePath(), salt, 'utf8');
        }
    }
    catch {
        salt = 'dsh-usage-meter-fallback-salt';
    }
    cachedSecretKey = createHash('sha256').update(`dsh-usage-meter:${salt}`).digest();
    return cachedSecretKey;
}
function encryptSecret(plain) {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', secretKey(), iv);
    return `${iv.toString('base64')}:${Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]).toString('base64')}`;
}
function decryptSecret(stored) {
    try {
        const [ivB64, dataB64] = stored.split(':');
        if (ivB64 === undefined || dataB64 === undefined)
            return null;
        const decipher = createDecipheriv('aes-256-cbc', secretKey(), Buffer.from(ivB64, 'base64'));
        return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
    }
    catch {
        return null;
    }
}
/** Exchange rate older than this is refreshed on the next opportunity. */
const RATE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const providerConfigs = {};
const balances = {};
/** 每模型余额来源：`m:<provider>/<model>` → 'manual'（用户余额/ledger）| 'deepseek'（DeepSeek 官方余额）。 */
const balanceSources = {};
/** 每模型独立 DeepSeek 余额快照（内存，key = 模型安全键；重启后 turn/start 重新查询）。 */
const modelBalances = {};
/** 累计到该模型「已配置独立 key 但余额快照尚未返回」期间的费用（锚点币种）：
 *  余额未返回时先记账（不显示），refreshModelBalance 返回后一次性灌进 modelBalances[safeKey].spent。
 *  key = 模型安全键；只在「快照未返回但模型确有独立 key」时累积。 */
const pendingModelSpent = {};
/** 独立 key 余额查询进行中的模型安全键（防并发重复查询）。 */
const modelBalanceRefreshing = new Set();
/** `m:<provider>/<model>` → 是否已填入独立 DeepSeek key（布尔，非敏感，随 config.json 持久化）。 */
const modelApiKeyFlags = {};
/** 预警阈值：`p:<provider>` 供应商级，`m:<provider>/<model>` 模型级（含 followProvider）。 */
const thresholds = {};
const stats = {};
const lastStatsBySession = new WeakMap();
let statsDirty = false;
function statsPath() { return join(dataRoot(), 'stats.json'); }
function saveStats() {
    if (!statsDirty)
        return;
    statsDirty = false;
    try {
        writeFileSync(statsPath(), JSON.stringify(stats, null, 2), 'utf8');
    }
    catch { /* ignore */ }
}
function loadStats() {
    try {
        const p = statsPath();
        if (!existsSync(p))
            return;
        const doc = JSON.parse(readFileSync(p, 'utf8'));
        for (const [k, v] of Object.entries(doc))
            if (v !== null && typeof v === 'object') {
                const s = v;
                // 兼容旧格式：补齐按类别金额字段（旧 stats.json 无这些字段）。
                if (typeof s.inputCost !== 'number')
                    s.inputCost = 0;
                if (typeof s.cacheReadCost !== 'number')
                    s.cacheReadCost = 0;
                if (typeof s.cacheWriteCost !== 'number')
                    s.cacheWriteCost = 0;
                if (typeof s.outputCost !== 'number')
                    s.outputCost = 0;
                // 旧数据无分项金额：若总费用>0 但分项全 0，用当前定价按 token 重算近似分项，
                // 让看板统计图重启后不空（否则只有新产生用量才有分项）。
                if (s.inputCost === 0 && s.cacheReadCost === 0 && s.cacheWriteCost === 0 && s.outputCost === 0 && s.cost > 0) {
                    const pricing = pricingFor(s.provider, s.model) ?? null;
                    if (pricing !== null) {
                        const bd = costBreakdown({ inputTokens: s.inputTokens, outputTokens: s.outputTokens, cacheReadTokens: s.cacheReadTokens, cacheWriteTokens: s.cacheWriteTokens }, pricing);
                        s.inputCost = bd.input;
                        s.cacheReadCost = bd.cacheRead;
                        s.cacheWriteCost = bd.cacheWrite;
                        s.outputCost = bd.output;
                    }
                }
                stats[k] = s;
            }
    }
    catch { /* ignore */ }
}
/** 把已持久化的「包装键」回填成底层键：老数据里 `modlens-deepseek-zgktz/...`
 *  这类包装路由的定价覆盖 / 余额来源 / 独立 Key 标记 / 账本 / 阈值 / 看板统计，
 *  在识别到包装标记后应归属到底层 provider，否则历史配置与统计会变孤儿。
 *  合并语义：统计与账本求和；其余「底层键已存在则保留底层值」。
 *  必须在 `activeWrapperMarkers` 就绪后调用（loadPersistedConfig 内、价格覆盖应用前）。 */
function rekeyWrappedPersistedState() {
    if (activeWrapperMarkers.length === 0)
        return false;
    let priceKeysMoved = false;
    const moved = (k) => {
        const nk = k.startsWith('m:') || k.startsWith('p:') ? normalizeBindingKey(k, activeWrapperMarkers) : normalizePriceKey(k, activeWrapperMarkers);
        return nk === k ? null : nk;
    };
    // provider 配置（币种 / 共享余额 / 共享 Key）
    for (const [pv, cfg] of Object.entries(providerConfigs)) {
        const base = underlyingProvider(pv) ?? pv;
        if (base === pv)
            continue;
        providerConfigs[base] = { ...cfg, ...(providerConfigs[base] ?? {}) };
        delete providerConfigs[pv];
    }
    // 价格覆盖（价目表键 `provider/model`，在 applyPriceOverrides 之前回填）
    for (const [k, v] of Object.entries(priceOverrides)) {
        const nk = moved(k);
        if (nk === null)
            continue;
        if (priceOverrides[nk] === undefined)
            priceOverrides[nk] = v;
        delete priceOverrides[k];
        priceKeysMoved = true;
    }
    // 余额来源 / 独立 Key 标记 / 阈值：底层键优先
    const moveRecord = (map) => {
        for (const [k, v] of Object.entries(map)) {
            const nk = moved(k);
            if (nk === null)
                continue;
            if (map[nk] === undefined)
                map[nk] = v;
            delete map[k];
        }
    };
    moveRecord(balanceSources);
    moveRecord(modelApiKeyFlags);
    moveRecord(thresholds);
    // 账本：同一底层绑定的余额相加（币种一致时），否则保留底层值
    for (const [k, v] of Object.entries(balances)) {
        const nk = moved(k);
        if (nk === null)
            continue;
        const prev = balances[nk];
        if (prev === undefined)
            balances[nk] = v;
        else if (prev.currency === v.currency)
            balances[nk] = { currency: prev.currency, balance: prev.balance + v.balance };
        delete balances[k];
    }
    // 看板统计：同名底层模型的历史用量求和
    let statsMoved = false;
    for (const [k, v] of Object.entries(stats)) {
        const nk = `${canonicalId(underlyingProvider(v.provider) ?? v.provider)}/${canonicalId(stripAllWrappers(v.model, activeWrapperMarkers))}`;
        if (nk === k)
            continue;
        const prev = stats[nk];
        if (prev === undefined) {
            stats[nk] = v;
        }
        else {
            prev.requestCount += v.requestCount;
            prev.inputTokens += v.inputTokens;
            prev.outputTokens += v.outputTokens;
            prev.cacheReadTokens += v.cacheReadTokens;
            prev.cacheWriteTokens += v.cacheWriteTokens;
            prev.reasoningTokens += v.reasoningTokens;
            prev.cost += v.cost;
            prev.inputCost += v.inputCost;
            prev.cacheReadCost += v.cacheReadCost;
            prev.cacheWriteCost += v.cacheWriteCost;
            prev.outputCost += v.outputCost;
            prev.updatedAt = Math.max(prev.updatedAt, v.updatedAt);
        }
        delete stats[k];
        statsMoved = true;
    }
    if (statsMoved)
        statsDirty = true;
    return priceKeysMoved;
}
/** 解析某 (provider, model) 生效的预警阈值：模型（且 not followProvider）→ 供应商 → 全局。 */
function resolveThreshold(provider, model, cfg) {
    const globalPct = typeof cfg.budgetAlertPct === 'number' && cfg.budgetAlertPct > 0 ? cfg.budgetAlertPct : 0;
    const globalFloor = typeof cfg.balanceAlertFloor === 'number' && cfg.balanceAlertFloor > 0 ? cfg.balanceAlertFloor : 0;
    let modelDef;
    if (provider !== null && model !== null) {
        // 包装路由（modlens 等）与底层路由共用同一份阈值：先按归一化键找，再退回原始键。
        const mk = `m:${provider}/${model}`;
        const nk = normalizeBindingKey(mk, activeWrapperMarkers);
        modelDef = thresholds[nk] ?? thresholds[mk];
        if (modelDef !== undefined && modelDef.followProvider === true)
            modelDef = undefined;
    }
    if (modelDef !== undefined) {
        return { budgetAlertPct: typeof modelDef.budgetAlertPct === 'number' && modelDef.budgetAlertPct > 0 ? modelDef.budgetAlertPct : 0, balanceAlertFloor: typeof modelDef.balanceAlertFloor === 'number' && modelDef.balanceAlertFloor > 0 ? modelDef.balanceAlertFloor : 0 };
    }
    const real = underlyingProvider(provider) ?? provider;
    if (real !== null) {
        const pth = thresholds[`p:${real}`];
        if (pth !== undefined) {
            return { budgetAlertPct: typeof pth.budgetAlertPct === 'number' && pth.budgetAlertPct > 0 ? pth.budgetAlertPct : 0, balanceAlertFloor: typeof pth.balanceAlertFloor === 'number' && pth.balanceAlertFloor > 0 ? pth.balanceAlertFloor : 0 };
        }
    }
    return { budgetAlertPct: globalPct, balanceAlertFloor: globalFloor };
}
/** Per-session last usage sample (turn/step) — used to compute delta deductions. */
const lastUsageBySession = new WeakMap();
/** Per-session request (step) start time, mirroring the fold's `stepStart` for the live ledger path. */
const stepStartBySession = new WeakMap();
/** Binding key for a (provider, model) pair: shared-balance provider → vendor,
 *  official → vendor, custom → model. When the user turns on 「共享余额」 for a
 *  provider, ALL models under it bill one wallet (`p:<provider>`). */
function balanceKeyOf(provider, model) {
    if (provider === null || model === null)
        return null;
    const real = underlyingProvider(provider) ?? provider;
    if (providerConfigs[real]?.sharedBalance === true)
        return `p:${real}`;
    if (BUNDLED_TABLE[`${real}/${model}`] !== undefined)
        return `p:${real}`;
    return `m:${real}/${model}`;
}
/** 手动余额（user ledger）的绑定键：manual 来源的模型一律用 `m:<provider>/<model>`
 *  （即使 DeepSeek 官方模型），这样 DeepSeek 模型选「用户余额」也能独立建账；
 *  仅共享余额时用 `p:<provider>`。 */
function manualLedgerKeyOf(provider, model) {
    if (provider === null || model === null)
        return null;
    const real = underlyingProvider(provider) ?? provider;
    if (providerConfigs[real]?.sharedBalance === true)
        return `p:${real}`;
    return `m:${real}/${model}`;
}
/** Read (or lazily create) the ledger entry for a key; DeepSeek returns null. */
function ledgerOf(key, defaultCurrency) {
    // v2.0.16: 精确排除官方渠道（isDeepSeekProvider 语义：仅 deepseek-official）。
    // 此前 startsWith('p:deepseek') 会误伤名为 deepseek-* 的自定义供应商
    // （deepseek-zgktz 等），它们的共享余额账本建不出来、被静默吞掉。
    if (key === null || key === 'p:deepseek-official')
        return null;
    let entry = balances[key];
    // Seed a brand-new non-DeepSeek binding's ledger with the user-configured
    // 「非DeepSeek初始余额」so a newly-added model starts from that amount
    // (not 0). The seed survives as long as the entry is never touched.
    // v2.0.16: 兑现上方注释——新账本以「非DeepSeek初始余额」为种子
    // （未配置时为 0，行为不变）。
    if (entry === undefined)
        entry = balances[key] = { balance: runtimeConfig.initialBalance ?? 0, currency: defaultCurrency };
    return entry;
}
/**
 * Broadcast a ledger value to every live session.
 *
 * rc.7 compatibility: the harness read path refuses unknown event types that
 * are not marked ignorable, and `session.append` cannot attach `ignorable`.
 * Balance is kept in memory (`balances`) and read by the projection `view`,
 * so we no longer write `usage/balance-ledger` into the session log — every
 * live session re-emits the new value on its next fold, which is enough for
 * the popup and the readout to update immediately.
 */
function broadcastBalance(_key, _entry, _kind) {
    void _key;
    void _entry;
    void _kind;
}
/** Live sessions seen by this plugin — kept for the (now in-memory-only) push path. */
const activeSessions = new Set();
/** 当前正在使用（轮次进行中）的模型路由：设置页据此锁定该模型的编辑。 */
let activeModel = null;
const priceOverrides = {};
/** The billing fields a user override OWNS. When an override exists it must be
 *  the AUTHORITATIVE cost model: these fields are stripped from the bundled
 *  base before merging, so switching templates can never leave a stale field
 *  (e.g. an old cacheReadPerM) billing behind the user's chosen template. */
const OVERRIDE_MANAGED_FIELDS = [
    'inputPerM', 'outputPerM', 'cacheReadPerM', 'cacheWritePerM',
    'combinedPerM', 'discount', 'peak', 'offPeak', 'peakDays', 'peakWindows',
    'weekend', 'peakOffPeakFrom', 'customRows',
];
/** Re-apply every override onto the live price table (after load / edit / reset). */
function applyPriceOverrides() {
    for (const [key, override] of Object.entries(priceOverrides)) {
        if (override.prices === undefined)
            continue;
        const base = currentPrices.table.getRaw(key) ?? BUNDLED_TABLE[key];
        if (base === undefined) {
            const p = override.prices;
            const hasCustom = Array.isArray(p.customRows) && p.customRows.length > 0;
            // 纯峰谷模板 override 只有 peak/offPeak 对象、没有平铺 inputPerM/outputPerM。
            // 这里必须放行这类 override，否则会被 filter 跳过、不进价格表 → 会话定价 null
            // → “无价格数据”。（本机之前没暴露，因为本机用的是带平铺单价的基础模板。）
            const hasPeak = p.peak !== undefined || p.offPeak !== undefined;
            if ((typeof p.inputPerM !== 'number' || typeof p.outputPerM !== 'number') && !hasCustom && !hasPeak)
                continue;
            const row = {
                inputPerM: typeof p.inputPerM === 'number' ? p.inputPerM : 0,
                outputPerM: typeof p.outputPerM === 'number' ? p.outputPerM : 0,
                ...(p.cacheReadPerM !== undefined ? { cacheReadPerM: p.cacheReadPerM } : {}),
                ...(p.cacheWritePerM !== undefined ? { cacheWritePerM: p.cacheWritePerM } : {}),
                ...(p.combinedPerM !== undefined ? { combinedPerM: p.combinedPerM } : {}),
                ...(p.discount !== undefined ? { discount: p.discount } : {}),
                ...(p.peak !== undefined ? { peak: p.peak } : {}),
                ...(p.offPeak !== undefined ? { offPeak: p.offPeak } : {}),
                ...(p.peakDays !== undefined ? { peakDays: p.peakDays } : {}),
                ...(p.peakWindows !== undefined ? { peakWindows: p.peakWindows } : {}),
                ...(p.peakOffPeakFrom !== undefined ? { peakOffPeakFrom: p.peakOffPeakFrom } : {}),
                ...(p.weekend !== undefined ? { weekend: p.weekend } : {}),
                ...(p.currency !== undefined ? { currency: p.currency } : {}),
                ...(hasCustom ? { customRows: p.customRows } : {}),
                source: 'user',
            };
            currentPrices.table.merge({ [key]: row });
            continue;
        }
        // Managed-fields replacement: the override fully owns billing semantics —
        // BUT only when it actually carries at least one managed billing field.
        // A keep-mode/partial override (currency-only, or discount without prices)
        // must preserve the bundled base structure — stripping here used to wipe
        // every price to 0 (the "Batch 模板保存后输入框全清空" bug).
        const hasManaged = Object.keys(override.prices).some((k) => OVERRIDE_MANAGED_FIELDS.includes(k) && k !== 'discount');
        const stripped = { ...base };
        if (hasManaged) {
            for (const f of OVERRIDE_MANAGED_FIELDS)
                delete stripped[f];
        }
        const row = {
            ...stripped,
            ...override.prices,
            // Invariant: the strict viewSchema requires numeric inputPerM/outputPerM.
            // An override that owns billing via customRows (or a partial prices doc)
            // strips these from the base — default them ONLY when neither the
            // override nor a surviving base value provides a number (a pure-discount
            // override keeps the base structure intact, so base numbers must win).
            inputPerM: typeof override.prices.inputPerM === 'number' ? override.prices.inputPerM : (typeof stripped.inputPerM === 'number' ? stripped.inputPerM : 0),
            outputPerM: typeof override.prices.outputPerM === 'number' ? override.prices.outputPerM : (typeof stripped.outputPerM === 'number' ? stripped.outputPerM : 0),
            currency: override.prices.currency ?? base.currency,
            source: 'user',
        };
        currentPrices.table.merge({ [key]: row });
    }
}
/** The 用量 template for one model: user override, else derived from its base pricing.
 *  `pricing` (when given, already peak-resolved by the caller) is authoritative for
 *  CUSTOM-ROWS models: the popup rows must mirror exactly what billing charges. */
function peakActiveBJ(pricing, now) {
    if (!pricing)
        return false;
    const b = new Date(now + 8 * 3600 * 1000);
    const day = b.getUTCDay();
    const min = b.getUTCHours() * 60 + b.getUTCMinutes();
    const days = pricing.peakDays ?? [0, 1, 2, 3, 4, 5, 6];
    const wins = pricing.peakWindows ?? [{ start: 540, end: 720 }, { start: 840, end: 1080 }];
    // 与 prices.ts 的 resolvePricingForTime 同一套语义（含跨零点环绕窗口）。
    return wins.some((w) => {
        if (w.start < w.end)
            return days.includes(day) && min >= w.start && min < w.end;
        if (min >= w.start)
            return days.includes(day);
        if (min < w.end)
            return days.includes((day + 6) % 7);
        return false;
    });
}
/** 弹窗显示行的唯一来源优先级：customRows → override.rows → 内置推导。
 *  override.rows 的峰谷行按北京时间解析出"此刻生效"的单价。 */
function priceRowsOf(provider, model, pricing, now = Date.now()) {
    if (provider === null || model === null)
        return [];
    if (Array.isArray(pricing?.customRows) && pricing.customRows.length > 0) {
        return pricing.customRows.map((r) => ({ label: r.label, buckets: r.buckets, perM: r.perM }));
    }
    const candidates = [provider, underlyingProvider(provider) ?? provider];
    for (const p of candidates) {
        const key = `${p}/${model}`;
        const overridden = priceOverrides[key]?.rows;
        if (overridden !== undefined && overridden.length > 0) {
            const activePeak = peakActiveBJ(pricing, now);
            return overridden.map((r) => {
                if (r.peakPerM === undefined && r.offPerM === undefined)
                    return r; // 平价行
                const v = activePeak ? r.peakPerM : r.offPerM;
                return v === undefined ? r : { ...r, perM: v };
            });
        }
        const base = currentPrices.table.getRaw(key);
        if (base !== undefined)
            return rowsFromPricing(base);
    }
    return defaultUnknownRows();
}
/** Load the EXTRA state from `usage-meter.json` and seed the module maps.
 *  Global scalar settings (currency / budget / priceSourceUrl / refreshIntervalMs /
 *  deepseekApiKey) are deliberately NOT carried here: they belong to the
 *  `usage-meter` settings namespace, whose single canonical write path is
 *  `scope.update()` (→ settings.yaml). Keeping the API key out of this
 *  extra-state file removes a plaintext-secret leak, and removing the
 *  globals here fixes the two-writers-desync between the popup (file) and the
 *  settings namespace (settings.yaml). */
/** Globals restored from the file, applied onto the settings scope in `apply()`
 *  (fields the namespace itself already carries are NOT overwritten). */
let pendingGlobals = null;
function loadPersistedConfig() {
    migrateToWorkdir();
    try {
        const p = configPath();
        if (!existsSync(p))
            return;
        const doc = JSON.parse(readFileSync(p, 'utf8'));
        if (doc.globals)
            pendingGlobals = doc.globals;
        // Restore the last known exchange rate immediately (before any fetch) so
        // conversions after a restart use the persisted rate, never the 7.2
        // placeholder.
        if (doc.globals && typeof doc.globals.usdToCny === 'number' && doc.globals.usdToCny > 0) {
            currentPrices.usdToCny = doc.globals.usdToCny;
            lastRateFetchedAt = typeof doc.globals.rateFetchedAt === 'number' ? doc.globals.rateFetchedAt : 0;
        }
        if (doc.providers) {
            for (const [provider, cfg] of Object.entries(doc.providers)) {
                const pc = {};
                if (cfg.currency !== undefined)
                    pc.currency = cfg.currency;
                if (cfg.sharedBalance !== undefined)
                    pc.sharedBalance = cfg.sharedBalance === true;
                if (cfg.sharedApiKey !== undefined)
                    pc.sharedApiKey = cfg.sharedApiKey === true;
                providerConfigs[provider] = pc;
                // Migrate the legacy manual balance (initialBalance + topUps) into the
                // global ledger under the vendor binding key.
                const total = (cfg.initialBalance ?? 0) + (cfg.topUps ?? []).reduce((s, u) => s + u.amount, 0);
                if (provider !== '*' && provider !== 'deepseek-official' && (cfg.initialBalance !== undefined || (cfg.topUps?.length ?? 0) > 0)) {
                    balances[`p:${provider}`] = { balance: total, currency: pc.currency ?? 'CNY' };
                }
            }
        }
        if (doc.priceOverrides) {
            Object.assign(priceOverrides, doc.priceOverrides);
            applyPriceOverrides();
        }
        if (doc.balances)
            Object.assign(balances, doc.balances);
        if (doc.balanceSources)
            Object.assign(balanceSources, doc.balanceSources);
        if (doc.modelApiKeyFlags)
            Object.assign(modelApiKeyFlags, doc.modelApiKeyFlags);
        if (doc.thresholds)
            Object.assign(thresholds, doc.thresholds);
    }
    catch {
        // ignore
    }
}
/** Persist the EXTRA state + a restart-surviving copy of the global scalars
 *  (API key encrypted). The settings namespace stays canonical in-process; this
 *  file guarantees the values survive a restart even when the host composition
 *  lacks a persistent settings-file provider. */
function savePersistedConfig() {
    try {
        const globals = {};
        if (runtimeConfig.currency !== undefined && runtimeConfig.currency !== '')
            globals.currency = runtimeConfig.currency;
        if (runtimeConfig.budget !== null)
            globals.budget = runtimeConfig.budget;
        if (runtimeConfig.initialBalance !== null)
            globals.initialBalance = runtimeConfig.initialBalance;
        if (typeof runtimeConfig.priceSourceUrl === 'string' && runtimeConfig.priceSourceUrl !== '')
            globals.priceSourceUrl = runtimeConfig.priceSourceUrl;
        if (typeof runtimeConfig.refreshIntervalMs === 'number')
            globals.refreshIntervalMs = runtimeConfig.refreshIntervalMs;
        if (typeof runtimeConfig.deepseekApiKey === 'string' && runtimeConfig.deepseekApiKey !== '') {
            const enc = encryptSecret(runtimeConfig.deepseekApiKey);
            if (runtimeConfig.deepseekApiKeyEnc !== enc)
                runtimeConfig.deepseekApiKeyEnc = enc;
            globals.deepseekApiKeyEnc = enc;
        }
        if (currentPrices.usdToCny > 0) {
            globals.usdToCny = currentPrices.usdToCny;
            globals.rateFetchedAt = lastRateFetchedAt;
        }
        const payload = { providers: providerConfigs, priceOverrides, balances, balanceSources, modelApiKeyFlags, thresholds, globals };
        writeFileSync(configPath(), JSON.stringify(payload, null, 2), 'utf8');
    }
    catch (err) {
        console.warn('[usage-meter] failed to persist config:', err);
    }
}
/** Resolve the server-side billing-config export directory. Empty setting →
 *  `$DSH_HOME/usage-meter/exports` (DSH_HOME survives upgrades; isolation from
 *  session files). */
function effectiveBillingDir(cfg) {
    const s = typeof cfg.billingConfigDir === 'string' && cfg.billingConfigDir.trim() !== '' ? cfg.billingConfigDir.trim() : join(dataRoot(), 'exports');
    return s;
}
/** Sanitize provider/model into a safe filename segment. */
function safeName(s) {
    return String(s).replace(/[^\w.-]+/g, '_');
}
/** JSON 内容规范化：递归按 key 排序、数组保序，用于「同名配置内容是否一致」的
 *  顺序无关比较（避免 JSON 键序差异导致的误判）。 */
function canonicalize(v) {
    if (v === undefined)
        return '~undefined~';
    if (v === null)
        return 'null';
    if (typeof v === 'number')
        return Number.isFinite(v) ? String(v) : 'NaN';
    if (typeof v === 'string')
        return JSON.stringify(v);
    if (Array.isArray(v))
        return '[' + v.map(canonicalize).join(',') + ']';
    if (typeof v === 'object') {
        const o = v;
        return '{' + Object.keys(o).sort().map((k) => JSON.stringify(k) + ':' + canonicalize(o[k])).join(',') + '}';
    }
    return String(v);
}
/** Apply (or reset) a model's billing override — shared by the config POST
 *  handler and the import-config endpoint so both persist identically. */
function applyModelOverride(provider, model, patch) {
    if (provider === null || model === null)
        return;
    const key = `${provider}/${model}`;
    if (patch.reset === true) {
        delete priceOverrides[key];
        if (BUNDLED_TABLE[key] !== undefined)
            currentPrices.table.merge({ [key]: BUNDLED_TABLE[key] });
        else
            currentPrices.table.removeRaw(key);
    }
    else {
        const next = { ...(priceOverrides[key] ?? {}) };
        if (patch.prices !== undefined)
            next.prices = { ...patch.prices };
        if (patch.rows !== undefined)
            next.rows = [...patch.rows];
        if (typeof patch.templateId === 'string')
            next.templateId = patch.templateId;
        priceOverrides[key] = next;
        applyPriceOverrides();
    }
    savePersistedConfig();
}
/** Effective per-provider config; DeepSeek alias maps to canonical, then `*` defaults. */
function getProviderConfig(provider) {
    if (provider !== null && providerConfigs[provider] !== undefined)
        return providerConfigs[provider];
    const real = underlyingProvider(provider);
    // 用户自定义的 `deepseek` 不再当作官方 `deepseek-official` 拿配置（各用各的）。
    if (real !== null && providerConfigs[real] !== undefined)
        return providerConfigs[real];
    return providerConfigs['*'] ?? {};
}
/** Convert an amount between CNY and USD (display-time only; never feeds computations). */
function toCurrency(amount, from, to, usdToCny) {
    if (from === to)
        return amount;
    if (from === 'USD' && to === 'CNY')
        return amount * usdToCny;
    if (from === 'CNY' && to === 'USD')
        return amount / usdToCny;
    return amount;
}
/** Total cost of the given turns, each converted from its native currency into `currency` (display-time only). */
function totalCostInCurrency(turns, currency, usdToCny) {
    return turns.reduce((sum, t) => sum + toCurrency(t.cost, t.currency, currency, usdToCny), 0);
}
// ── debounced persistence (usage hot path only) ───────────────────────────────
// The debounce timers + process-exit flush are fiber-scoped (created inside
// `apply`, torn down by `ctx.effect`) so a plugin reload never leaks a timer
// or leaves a stale `process.on('exit')` listener behind. These are immutable
// cadence constants; per-fiber state lives in `apply`.
const PERSIST_DEBOUNCE_MS = 400;
const PERSIST_MAX_WAIT_MS = 2000;
// ── helpers ──────────────────────────────────────────────────────────────────
/** 包装标记识别：视觉插件把 **提供商 id** 包成 `modlens-<provider>` / `<provider>-modlens`
 *  （老版本是 `vision-toolkit-<provider>`），显示名加 ` (modlens vision)`，模型 id 不变。
 *  只剥模型名后缀无法映射回底层提供商 → 定价/余额/独立 Key/统计全部落空。
 *  这里对 provider 与 model 两侧都剥（标记表见 wrapper.ts，逐行可开关）。 */
function underlyingProvider(provider) {
    return normalizeProviderId(provider, activeWrapperMarkers);
}
// ── 包装标记 / 模型别名识别（视觉插件把模型名包上后缀/前缀，如
//   `DeepSeek-V4-Flash (modlens vision)` ≡ `deepseek-v4-flash`）。
//   只在检测到包装标记时启用规范化，非包装模型走原路径、零改动。
let activeWrapperMarkers = activePatterns(DEFAULT_WRAPPER_ROWS);
/** 当前生效的包装标记「行表」（含未开启行），设置页据此渲染逐行开关。 */
function wrapperRowList(cfg) {
    return wrapperRows(cfg.wrapperMarkers);
}
/** 检测 provider/model 是否带包装标记；有 → 返回底层 (provider, model)；无 → null。 */
function aliasOf(provider, model, markers) {
    if (provider === null || model === null || markers.length === 0)
        return null;
    const p1 = stripAllWrappers(provider, markers);
    const m1 = stripAllWrappers(model, markers);
    const changed = canonicalId(p1) !== canonicalId(provider) || canonicalId(m1) !== canonicalId(model);
    return changed ? { provider: p1, model: m1 } : null;
}
function isDeepSeekProvider(provider) {
    const real = underlyingProvider(provider);
    // 只有官方渠道 `deepseek-official` 才是 DeepSeek 官方；用户自定义的 provider
    // 即使名叫 `deepseek`（小写）也**不是**官方（走用户余额 / 独立 key，不用全局 key）。
    return real === 'deepseek-official';
}
/** 归一化 (provider, model) 到「底层」绑定：剥包装前缀/后缀（提供商与模型两侧）。 */
function modelBinding(provider, model) {
    if (provider === null || model === null)
        return null;
    const alias = aliasOf(provider, model, activeWrapperMarkers);
    const pv = alias !== null ? alias.provider : provider;
    const md = alias !== null ? alias.model : model;
    const real = underlyingProvider(pv) ?? pv;
    return { real, model: md };
}
/** 每模型余额来源的存储键（`m:<provider>/<model>`，模型已剥包装）。 */
function modelSourceKey(provider, model) {
    const b = modelBinding(provider, model);
    return b === null ? null : `m:${b.real}/${b.model}`;
}
/** 每模型独立 API key / 余额快照的文件名安全键。 */
function modelSafeKey(provider, model) {
    const b = modelBinding(provider, model);
    return b === null ? null : `${canonicalId(b.real)}__${canonicalId(b.model)}`;
}
/** 该模型的余额来源：显式设置优先；否则 DeepSeek 路由默认官方、其余默认手动（向后兼容）。 */
function balanceSourceOf(provider, model) {
    // DeepSeek 官方模型恒为「DeepSeek 官方」余额（不允许切换成用户余额）。
    if (isDeepSeekProvider(provider))
        return 'deepseek';
    const key = modelSourceKey(provider, model);
    if (key !== null && balanceSources[key] !== undefined)
        return balanceSources[key];
    return 'manual';
}
// ── 每模型独立 DeepSeek API key（加密存储，与全局 key 同一套 AES/salt）──
function modelApiKeyPath(safeKey) {
    return join(apikeysDir(), `${safeKey}.enc`);
}
function hasModelApiKey(safeKey) {
    try {
        return existsSync(modelApiKeyPath(safeKey));
    }
    catch {
        return false;
    }
}
function saveModelApiKey(sourceKey, safeKey, plain) {
    try {
        mkdirSync(apikeysDir(), { recursive: true });
        writeFileSync(modelApiKeyPath(safeKey), encryptSecret(plain), 'utf8');
        modelApiKeyFlags[sourceKey] = true;
    }
    catch (err) {
        console.warn('[usage-meter] save model api key failed:', err);
    }
}
function loadModelApiKey(safeKey) {
    try {
        if (!existsSync(modelApiKeyPath(safeKey)))
            return null;
        return decryptSecret(readFileSync(modelApiKeyPath(safeKey), 'utf8'));
    }
    catch {
        return null;
    }
}
/** 该模型「有效可用的 key」是否存在：模型自有优先；未自有且提供商开启共享 API Key
 *  时，看该提供商名下是否有任一已存 key（.enc）。 */
function hasModelApiKeyFor(provider, model) {
    const safeKey = modelSafeKey(provider, model);
    if (safeKey !== null && hasModelApiKey(safeKey))
        return true;
    if (provider === null || model === null)
        return false;
    const real = underlyingProvider(provider) ?? provider;
    if (providerConfigs[real]?.sharedApiKey !== true)
        return false;
    try {
        const prefix = `${canonicalId(real)}__`;
        return readdirSync(apikeysDir()).some((f) => f.startsWith(prefix) && f.endsWith('.enc'));
    }
    catch {
        return false;
    }
}
/** 读取该模型「有效可用的 key」：模型自有优先；未自有且提供商开启共享 API Key
 *  时，用该提供商名下字典序第一个已存 key。共享开关只影响 key 读取，不碰余额。 */
function loadModelApiKeyFor(provider, model) {
    const safeKey = modelSafeKey(provider, model);
    const own = safeKey !== null ? loadModelApiKey(safeKey) : null;
    if (own !== null)
        return own;
    if (provider === null || model === null)
        return null;
    const real = underlyingProvider(provider) ?? provider;
    if (providerConfigs[real]?.sharedApiKey !== true)
        return null;
    try {
        const prefix = `${canonicalId(real)}__`;
        const files = readdirSync(apikeysDir()).filter((f) => f.startsWith(prefix) && f.endsWith('.enc')).sort();
        for (const f of files) {
            const k = decryptSecret(readFileSync(join(apikeysDir(), f), 'utf8'));
            if (k !== null && k !== '')
                return k;
        }
    }
    catch { /* ignore */ }
    return null;
}
function deleteModelApiKey(sourceKey, safeKey) {
    try {
        rmSync(modelApiKeyPath(safeKey), { force: true });
    }
    catch { /* ignore */ }
    delete modelApiKeyFlags[sourceKey];
}
function bucketsOf(usage) {
    const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
    return {
        input: num(usage?.inputTokens),
        output: num(usage?.outputTokens),
        cacheRead: num(usage?.cacheReadTokens),
        cacheWrite: num(usage?.cacheWriteTokens),
        reasoning: num(usage?.reasoningTokens),
    };
}
/** All-zero usage sample (step-init / empty sample) is not billable and MUST NOT
 *  overwrite the running per-(turn,step) baseline — otherwise a later real
 *  sample re-counts the whole request. */
function isZeroUsage(b) {
    return b.input === 0 && b.output === 0 && b.cacheRead === 0 && b.cacheWrite === 0 && b.reasoning === 0;
}
/** Per-bucket delta from the previous sample of the SAME (turn, step), clamped
 *  to ≥0. A later smaller sample (provider retry / final correction) must never
 *  yield negative tokens or negative cost — the excess is simply dropped. */
function deltaOf(prev, b) {
    return {
        input: Math.max(0, b.input - (prev?.input ?? 0)),
        output: Math.max(0, b.output - (prev?.output ?? 0)),
        cacheRead: Math.max(0, b.cacheRead - (prev?.cacheRead ?? 0)),
        cacheWrite: Math.max(0, b.cacheWrite - (prev?.cacheWrite ?? 0)),
        reasoning: Math.max(0, b.reasoning - (prev?.reasoning ?? 0)),
    };
}
function usageEventOf(event) {
    if (event.type === 'assistant/chunk' && event.data.chunk?.type === 'usage') {
        const chunk = event.data.chunk;
        // turn/step live on the OUTER event.data (the host appends
        // `{ turn, step, chunk }`); the inner chunk carries only the model payload.
        // Reading `chunk.turn` made every usage chunk key as (0,0) and, together
        // with the following assistant/message at the real (turn,step), double-billed
        // the request (GitHub issue #1).
        return { turn: event.data.turn ?? chunk.turn ?? 0, step: event.data.step ?? chunk.step ?? 0, usage: chunk.usage };
    }
    if (event.type === 'assistant/message' && event.data.usage !== undefined) {
        return {
            turn: event.data.turn,
            step: event.data.step,
            usage: event.data.usage,
        };
    }
    return null;
}
/**
 * Resolve the pricing for a route at a given time. The fold passes the
 * EVENT's own time so a replayed log reproduces the same per-turn costs
 * (peak/off-peak window chosen at the original event time, not at replay
 * time). The view passes no time, i.e. resolves at "now".
 */
function pricingFor(provider, model, at) {
    if (provider === null || model === null)
        return null;
    const tableProvider = underlyingProvider(provider) ?? provider;
    let raw = currentPrices.table.get(tableProvider, model);
    // 包装模型兜底：原始名无价（视觉插件把模型名包了前后缀）→ 用规范键在价表里
    // 找到底层模型的价格。非包装模型 price 命中原路径时永不进入（零改动）。
    if (raw === undefined) {
        const alias = aliasOf(provider, model, activeWrapperMarkers);
        if (alias !== null) {
            const want = `${canonicalId(underlyingProvider(alias.provider) ?? alias.provider)}/${canonicalId(alias.model)}`;
            for (const e of currentPrices.table.entries()) {
                if (e.model === '' || e.model === '*')
                    continue;
                const eKey = `${canonicalId(underlyingProvider(e.provider) ?? e.provider)}/${canonicalId(e.model)}`;
                if (eKey === want) {
                    raw = e.value;
                    break;
                }
            }
        }
    }
    if (raw === undefined)
        return null;
    const resolved = resolvePricingForTime(raw, at ?? Date.now());
    const updatedAt = currentPrices.updatedAt > 0 ? currentPrices.updatedAt : resolved.updatedAt;
    return { ...resolved, ...(updatedAt === undefined ? {} : { updatedAt }) };
}
// ── projection schema ────────────────────────────────────────────────────────
const peakRatesSchema = zod
    .object({ inputPerM: zod.number().catch(0), outputPerM: zod.number().catch(0), cacheReadPerM: zod.number().optional() })
    .strict();
const pricingSchema = zod
    .object({
    // `.catch(0)` keeps a persisted/view row missing these (older override
    // data) from failing the parse and blocking the whole session reload.
    inputPerM: zod.number().catch(0),
    outputPerM: zod.number().catch(0),
    cacheReadPerM: zod.number().optional(),
    cacheWritePerM: zod.number().optional(),
    combinedPerM: zod.number().optional(),
    discount: zod.number().optional(),
    currency: zod.string().optional(),
    updatedAt: zod.number().optional(),
    source: zod.enum(['bundled', 'remote', 'user']).optional(),
    peak: peakRatesSchema.optional(),
    offPeak: peakRatesSchema.optional(),
    peakOffPeakFrom: zod.number().optional(),
    peakDays: zod.array(zod.number().int().min(0).max(6)).optional(),
    peakWindows: zod.array(zod.object({ start: zod.number(), end: zod.number() })).optional(),
    weekend: peakRatesSchema.optional(),
    customRows: zod.array(zod.object({
        label: zod.string(),
        buckets: zod.array(zod.enum(['input', 'cacheRead', 'cacheWrite', 'output'])),
        perM: zod.number(),
        peakPerM: zod.number().optional(),
        offPerM: zod.number().optional(),
    })).optional(),
})
    .strict();
const turnCostSchema = zod
    .object({
    turn: zod.number().int().nonnegative(),
    cost: zod.number(),
    currency: zod.string(),
    model: zod.string().nullable(),
    startedAt: zod.number(),
    endedAt: zod.number(),
    endReason: zod.string().nullable(),
    inputTokens: zod.number().int().nonnegative(),
    outputTokens: zod.number().int().nonnegative(),
    cacheReadTokens: zod.number().int().nonnegative(),
    cacheWriteTokens: zod.number().int().nonnegative(),
    reasoningTokens: zod.number().int().nonnegative(),
    inputCost: zod.number().catch(0),
    cacheReadCost: zod.number().catch(0),
    cacheWriteCost: zod.number().catch(0),
    outputCost: zod.number().catch(0),
    provider: zod.string().nullable().catch(null),
    peak: zod.boolean().catch(false),
})
    .strict();
const accountBalanceSchema = zod
    .object({ currency: zod.string(), totalBalance: zod.number(), updatedAt: zod.number(), source: zod.enum(['api', 'computed']) })
    .strict();
const billingRowSchema = zod
    .object({
    label: zod.string(),
    buckets: zod.array(zod.enum(['input', 'cacheRead', 'cacheWrite', 'output'])),
    perM: zod.number().optional(),
    peakPerM: zod.number().optional(),
    offPerM: zod.number().optional(),
})
    .strict();
const usageCostSchema = zod
    .object({
    requestCount: zod.number().int().nonnegative(),
    stepCount: zod.number().int().nonnegative(),
    inputTokens: zod.number().int().nonnegative(),
    outputTokens: zod.number().int().nonnegative(),
    cacheReadTokens: zod.number().int().nonnegative(),
    cacheWriteTokens: zod.number().int().nonnegative(),
    reasoningTokens: zod.number().int().nonnegative(),
    realtimeOutputTokens: zod.number().int().nonnegative(),
    realtimeUpdatedAt: zod.number().int().nonnegative(),
    provider: zod.string().nullable(),
    model: zod.string().nullable(),
    pricing: pricingSchema.nullable(),
    basePricing: pricingSchema.nullable(),
    priceRows: zod.array(billingRowSchema),
    officialPrice: zod.object({ pricing: pricingSchema, rows: zod.array(billingRowSchema) }).nullable(),
    estimatedCost: zod.number(),
    currency: zod.string(),
    usdToCny: zod.number(),
    rateUpdatedAt: zod.number(),
    accountBalance: accountBalanceSchema.nullable(),
    balanceNeedsKey: zod.boolean(),
    turns: zod.array(turnCostSchema),
    lastTurn: turnCostSchema.nullable().catch(null),
    peakState: zod.enum(['peak', 'off']).nullable().catch(null),
    budget: zod.number().nullable(),
    remainingBudget: zod.number().nullable(),
    alertBudgetPct: zod.number().catch(0),
    alertBalanceFloor: zod.number().catch(0),
})
    .strict();
function addToLastTurn(turns, delta, costBy, currency, peak) {
    const last = turns[turns.length - 1];
    if (last === undefined)
        return turns;
    const next = [...turns];
    next[next.length - 1] = {
        ...last,
        cost: last.cost + costBy.total,
        // v2.0.16: 保留本回合首个计费用法的币种（...last 已带入），不再被最后一个
        // usage 覆盖：回合内切换模型时 cost 是多币种金额之和，显示换算以「首个
        // 请求」的币种为准（与回合归因 = 首个请求模型的语义一致）。
        peak,
        input: last.input + delta.input,
        output: last.output + delta.output,
        cacheRead: last.cacheRead + delta.cacheRead,
        cacheWrite: last.cacheWrite + delta.cacheWrite,
        reasoning: last.reasoning + delta.reasoning,
        inputCost: last.inputCost + costBy.input,
        cacheReadCost: last.cacheReadCost + costBy.cacheRead,
        cacheWriteCost: last.cacheWriteCost + costBy.cacheWrite,
        outputCost: last.outputCost + costBy.output,
    };
    return next;
}
// ── projection ───────────────────────────────────────────────────────────────
/** Coerce to a finite number (NaN/Infinity would fail the strict view schema on reload). */
function safeNumber(n, fallback) {
    return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
}
/** A schema-safe fallback view: a session reload must never be taken down by a projection error. */
function emptyUsageCost(state) {
    const budget = runtimeConfig.budget;
    const safeBudget = budget === null ? null : safeNumber(budget, 0);
    const turns = state.turns.map((x) => ({
        turn: safeNumber(x.turn, 0),
        cost: safeNumber(x.cost, 0),
        currency: x.currency,
        model: x.model,
        startedAt: safeNumber(x.startedAt, 0),
        endedAt: safeNumber(x.endedAt, 0),
        endReason: x.endReason ?? null,
        inputTokens: Math.max(0, safeNumber(x.input, 0)),
        outputTokens: Math.max(0, safeNumber(x.output, 0)),
        cacheReadTokens: Math.max(0, safeNumber(x.cacheRead, 0)),
        cacheWriteTokens: Math.max(0, safeNumber(x.cacheWrite, 0)),
        reasoningTokens: Math.max(0, safeNumber(x.reasoning, 0)),
        inputCost: Math.max(0, safeNumber(x.inputCost, 0)),
        cacheReadCost: Math.max(0, safeNumber(x.cacheReadCost, 0)),
        cacheWriteCost: Math.max(0, safeNumber(x.cacheWriteCost, 0)),
        outputCost: Math.max(0, safeNumber(x.outputCost, 0)),
        provider: x.provider ?? null,
        peak: x.peak === true,
    }));
    return {
        requestCount: safeNumber(state.requestCount, 0),
        stepCount: safeNumber(state.stepCount, 0),
        inputTokens: Math.max(0, safeNumber(state.inputTokens, 0)),
        outputTokens: Math.max(0, safeNumber(state.outputTokens, 0)),
        cacheReadTokens: Math.max(0, safeNumber(state.cacheReadTokens, 0)),
        cacheWriteTokens: Math.max(0, safeNumber(state.cacheWriteTokens, 0)),
        reasoningTokens: Math.max(0, safeNumber(state.reasoningTokens, 0)),
        realtimeOutputTokens: Math.max(0, safeNumber(state.realtimeOutputTokens, 0)),
        realtimeUpdatedAt: Math.max(0, safeNumber(state.realtimeUpdatedAt, 0)),
        provider: state.provider,
        model: state.model,
        pricing: null,
        basePricing: null,
        priceRows: [],
        officialPrice: null,
        estimatedCost: 0,
        currency: getProviderConfig(state.provider).currency ?? runtimeConfig.currency,
        usdToCny: safeNumber(currentPrices.usdToCny, 7.2),
        rateUpdatedAt: safeNumber(lastRateFetchedAt, 0),
        accountBalance: null,
        balanceNeedsKey: false,
        turns,
        lastTurn: turns.length > 0 ? turns[turns.length - 1] : null,
        peakState: null,
        budget: safeBudget,
        remainingBudget: safeBudget === null ? null : safeBudget,
        alertBudgetPct: 0,
        alertBalanceFloor: 0,
    };
}
// The persisted fold-state schema. `stateSchema` is REQUIRED by the framework:
// `restore()` calls `stateSchema.parse(row.val)` for usable rows, and without it
// the restore aborts (session can't reload). `.catch(0)` keeps a lingering
// non-finite number from ever failing the parse and taking the reload down.
const foldTurnSchema = zod.object({
    turn: zod.number().catch(0),
    input: zod.number().catch(0),
    output: zod.number().catch(0),
    cacheRead: zod.number().catch(0),
    cacheWrite: zod.number().catch(0),
    reasoning: zod.number().catch(0),
    cost: zod.number().catch(0),
    // v2.0.16: 分项金额此前只在 wire schema（turnCostSchema）有、持久化 schema 漏了——
    // zod object 默认剥离未声明字段，重启恢复后逐轮分项费用（输入/输出/缓存成本）
    // 会静默归零。补齐 4 个字段。
    inputCost: zod.number().catch(0),
    cacheReadCost: zod.number().catch(0),
    cacheWriteCost: zod.number().catch(0),
    outputCost: zod.number().catch(0),
    currency: zod.string().catch('CNY'),
    model: zod.string().nullable().catch(null),
    startedAt: zod.number().catch(0),
    endedAt: zod.number().catch(0),
    endReason: zod.string().nullable().catch(null),
    // provider/peak 写入 turn 但之前没进持久化 schema：zod object 默认剥离未声明
    // 字段，导致 DSH 重启恢复投影状态时逐轮 provider（及峰谷标记）被丢掉 →
    // 弹窗看板按 provider 聚合的统计里供应商消失。这里补齐，保证重启后不丢。
    provider: zod.string().nullable().catch(null),
    peak: zod.boolean().catch(false),
});
const foldStateSchema = zod.object({
    requestCount: zod.number().int().nonnegative().catch(0),
    stepCount: zod.number().int().nonnegative().catch(0),
    inputTokens: zod.number().catch(0),
    outputTokens: zod.number().catch(0),
    cacheReadTokens: zod.number().catch(0),
    cacheWriteTokens: zod.number().catch(0),
    reasoningTokens: zod.number().catch(0),
    realtimeOutputTokens: zod.number().catch(0),
    realtimeUpdatedAt: zod.number().catch(0),
    provider: zod.string().nullable().catch(null),
    model: zod.string().nullable().catch(null),
    stepStart: zod.object({ turn: zod.number().catch(0), step: zod.number().catch(0), at: zod.number().catch(0) }).nullable().catch(null),
    lastCostAt: zod.number().catch(0),
    turns: zod.array(foldTurnSchema).catch([]),
    last: zod.object({ turn: zod.number().catch(0), step: zod.number().catch(0), input: zod.number().catch(0), output: zod.number().catch(0), cacheRead: zod.number().catch(0), cacheWrite: zod.number().catch(0), reasoning: zod.number().catch(0) }).nullable().catch(null),
});
const usageCostProjection = {
    key: 'usageCost',
    stateSchema: foldStateSchema,
    init() {
        return {
            requestCount: 0,
            stepCount: 0,
            inputTokens: 0,
            outputTokens: 0,
            cacheReadTokens: 0,
            cacheWriteTokens: 0,
            reasoningTokens: 0,
            realtimeOutputTokens: 0,
            realtimeUpdatedAt: 0,
            provider: null,
            model: null,
            stepStart: null,
            lastCostAt: 0,
            turns: [],
            last: null,
        };
    },
    apply(state, event) {
        try {
            let next = state;
            if (event.type === 'request/header') {
                const headerCfg = event.data.header?.config;
                const provider = headerCfg?.provider ?? null;
                const model = headerCfg?.model ?? null;
                if (provider === null && model === null)
                    return next === state ? state : next;
                if (provider !== state.provider || model !== state.model) {
                    next = { ...next, provider, model };
                }
                // 回合归因固定为「实际发起本回合第一个请求的模型」（v2.0.14 修复）：
                // 回合中途切换模型时，新模型的 request/header 到达不再改写已打开 turn 桶的
                // model/provider——否则本回合全部费用都会被记到切换后的模型名下，与真正
                // 干活的模型不符（用户实测：切到快结束时切模型，整轮费用全算给了新模型）。
                // 仅在 turn 桶还没有模型时回填（如会话第一个回合 turn/start 时尚无模型）；
                // 一旦回填永不改写。逐条 usage 的计费仍用 state.provider/model：实测每个 step
                // 恰好一个 header，且 usage 总在下一个 step 的 header 之前到达，所以 usage
                // 事件时刻的 state 就是产生该 usage 的那个请求的模型，逐请求计费天然正确。
                const open = next.turns[next.turns.length - 1];
                if (open !== undefined && open.endedAt === 0 && (open.model === null || open.provider === null) && (model !== null || provider !== null)) {
                    const turns = [...next.turns];
                    turns[turns.length - 1] = { ...open, model, provider };
                    next = { ...next, turns };
                }
            }
            // DeepSeek sends final usage only at [DONE]. Estimate streamed output from
            // text/reasoning deltas solely for the live token/s indicator; authoritative
            // accounting below still uses adapter-provided TokenUsage.
            if (event.type === 'assistant/chunk' && (event.data.chunk?.type === 'text-delta' || event.data.chunk?.type === 'reasoning-delta')) {
                const text = event.data.chunk.text;
                if (text.length > 0) {
                    next = {
                        ...next,
                        realtimeOutputTokens: next.realtimeOutputTokens + Math.max(1, estTokens(text)),
                        realtimeUpdatedAt: event.time,
                    };
                }
            }
            if (event.type === 'turn/start') {
                const turn = event.data.turn;
                const last = next.turns[next.turns.length - 1];
                if (last === undefined || last.turn !== turn) {
                    const tp = pricingFor(state.provider, state.model, event.time);
                    next = {
                        ...next,
                        turns: [...next.turns, {
                                turn,
                                input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0,
                                cost: 0, currency: 'CNY', model: state.model, provider: state.provider,
                                // v2.0.31: 回合创建即按时钟判定峰谷（与计费同一 peakActiveBJ 判定）。
                                // 此前硬编码 peak:false，徽章要等首个 usage 事件到达才翻正，
                                // 流式期间高峰期也先显示"谷"。
                                startedAt: event.time, endedAt: 0, endReason: null,
                                peak: tp !== null && peakActiveBJ(tp, event.time),
                                inputCost: 0, cacheReadCost: 0, cacheWriteCost: 0, outputCost: 0,
                            }],
                    };
                }
            }
            if (event.type === 'turn/end') {
                const last = next.turns[next.turns.length - 1];
                if (last !== undefined && last.turn === event.data.turn && last.endedAt === 0) {
                    const turns = [...next.turns];
                    turns[turns.length - 1] = { ...last, endedAt: event.time, endReason: String(event.data.reason?.kind ?? 'completed') };
                    next = { ...next, turns };
                }
            }
            if (event.type === 'step/start') {
                next = {
                    ...next,
                    stepCount: state.stepCount + 1,
                    stepStart: { turn: event.data.turn, step: event.data.step, at: event.time },
                };
            }
            if (event.type === 'assistant/message')
                next = { ...next, requestCount: state.requestCount + 1 };
            const ue = usageEventOf(event);
            if (ue !== null) {
                const b = bucketsOf(ue.usage);
                // All-zero samples (step init) are not billable and must not clobber the
                // running baseline, else the next real sample re-counts the request.
                if (isZeroUsage(b))
                    return next === state ? state : next;
                const prev = state.last !== null && state.last.turn === ue.turn && state.last.step === ue.step ? state.last : null;
                const samePrev = prev !== null &&
                    prev.input === b.input && prev.output === b.output &&
                    prev.cacheRead === b.cacheRead && prev.cacheWrite === b.cacheWrite && prev.reasoning === b.reasoning;
                if (!samePrev) {
                    const delta = deltaOf(prev, b);
                    // DeepSeek bills an entire API request at the peak/off-peak rate active
                    // when the request STARTED; `stepStart` was recorded from `step/start`,
                    // falling back to the turn start so replay stays deterministic.
                    const requestStart = state.stepStart !== null && state.stepStart.turn === ue.turn && state.stepStart.step === ue.step
                        ? state.stepStart.at
                        : (state.turns[state.turns.length - 1]?.startedAt ?? event.time);
                    const pricing = pricingFor(state.provider, state.model, requestStart);
                    const bd = pricing === null
                        ? { input: 0, cacheRead: 0, cacheWrite: 0, output: 0, total: 0 }
                        : costBreakdown({ inputTokens: delta.input, outputTokens: delta.output, cacheReadTokens: delta.cacheRead, cacheWriteTokens: delta.cacheWrite }, pricing);
                    next = {
                        ...next,
                        inputTokens: state.inputTokens + delta.input,
                        outputTokens: state.outputTokens + delta.output,
                        cacheReadTokens: state.cacheReadTokens + delta.cacheRead,
                        cacheWriteTokens: state.cacheWriteTokens + delta.cacheWrite,
                        reasoningTokens: state.reasoningTokens + delta.reasoning,
                        lastCostAt: event.time,
                        turns: addToLastTurn(next.turns, delta, bd, pricing?.currency ?? 'CNY', pricing !== null && peakActiveBJ(pricing, requestStart)),
                        last: { turn: ue.turn, step: ue.step, ...b },
                    };
                }
            }
            return next === state ? state : next;
        }
        catch {
            return state;
        }
    },
    wire: {
        viewSchema: usageCostSchema,
        view(state) {
            try {
                const pricing = pricingFor(state.provider, state.model);
                const currency = getProviderConfig(state.provider).currency ?? runtimeConfig.currency;
                const usdToCny = safeNumber(currentPrices.usdToCny, 7.2);
                // 对外（弹窗/设置页/看板）统一报「底层」provider/model：包装路由
                // （modlens-deepseek-zgktz 等）与底层路由聚合到同一条，显示名也能查到。
                const bind = modelBinding(state.provider, state.model);
                const viewProvider = bind?.real ?? state.provider;
                const viewModel = bind?.model ?? state.model;
                // Display-denominated total: every turn cost converted from its native
                // currency into the display currency.
                const estimatedCost = safeNumber(totalCostInCurrency(state.turns, currency, usdToCny), 0);
                const turns = state.turns.map((t) => ({
                    turn: t.turn,
                    cost: t.cost,
                    currency: t.currency,
                    model: modelBinding(t.provider, t.model)?.model ?? t.model,
                    startedAt: t.startedAt,
                    endedAt: t.endedAt,
                    endReason: t.endReason,
                    // Negative per-turn buckets are possible when a later usage sample for the
                    // same step is smaller than an earlier one (retry / provider re-report);
                    // the wire schema requires nonnegative counts, so clamp at the view edge.
                    inputTokens: Math.max(0, t.input),
                    outputTokens: Math.max(0, t.output),
                    cacheReadTokens: Math.max(0, t.cacheRead),
                    cacheWriteTokens: Math.max(0, t.cacheWrite),
                    reasoningTokens: Math.max(0, t.reasoning),
                    inputCost: Math.max(0, t.inputCost),
                    cacheReadCost: Math.max(0, t.cacheReadCost),
                    cacheWriteCost: Math.max(0, t.cacheWriteCost),
                    outputCost: Math.max(0, t.outputCost),
                    provider: modelBinding(t.provider, t.model)?.real ?? t.provider ?? null,
                    peak: t.peak === true,
                }));
                const safeTotals = {
                    requestCount: state.requestCount,
                    stepCount: state.stepCount,
                    inputTokens: Math.max(0, state.inputTokens),
                    outputTokens: Math.max(0, state.outputTokens),
                    cacheReadTokens: Math.max(0, state.cacheReadTokens),
                    cacheWriteTokens: Math.max(0, state.cacheWriteTokens),
                    reasoningTokens: Math.max(0, state.reasoningTokens),
                    realtimeOutputTokens: Math.max(0, state.realtimeOutputTokens),
                    realtimeUpdatedAt: Math.max(0, state.realtimeUpdatedAt),
                };
                // Live balance (rc.7 safe — reads in-memory state, never a log event):
                //   DeepSeek:   the in-memory API snapshot (anchor) MINUS the in-turn
                //               estimate accrued since that anchor. Between refreshes this
                //               ticks down with every usage sample, and the next
                //               `turn/start` re-anchors from API truth; a failed refresh
                //               keeps the stale anchor + estimate instead of freezing.
                //               (Negative values are legal here — the UI already renders
                //               the 透支 state; `source` flips to 'computed' while the
                //               estimate is non-zero.)
                //   others:     the GLOBAL ledger value for this binding key (already
                //               delta-decremented server-side; default 0, negative when
                //               spending without a funded balance).
                let accountBalance = null;
                const balanceSource = balanceSourceOf(state.provider, state.model);
                // 该模型是否「已配置独立 DeepSeek key」（不看余额快照，即使快照尚未查到）。
                // 官方模型恒走全局 key（视为已配置）；非官方模型 = 自有 key 或提供商共享 key。
                const modelKeySafe = modelSafeKey(state.provider, state.model);
                const modelHasKey = isDeepSeekProvider(state.provider)
                    ? true
                    : hasModelApiKeyFor(state.provider, state.model);
                if (balanceSource === 'deepseek') {
                    const safeKey = modelSafeKey(state.provider, state.model);
                    // 官方模型恒用全局 key（不读模型独立 key/快照）。
                    const mbal = isDeepSeekProvider(state.provider) ? undefined : (safeKey !== null ? modelBalances[safeKey] : undefined);
                    if (mbal !== undefined) {
                        // 该模型有独立 DeepSeek key：用独立锚点 − 独立场内估计。
                        accountBalance = {
                            currency: mbal.snapshot.currency,
                            totalBalance: mbal.snapshot.totalBalance - mbal.spent,
                            updatedAt: Math.max(mbal.snapshot.fetchedAt, mbal.liveAt),
                            source: mbal.spent > 0 ? 'computed' : 'api',
                        };
                    }
                    else if (isDeepSeekProvider(state.provider) && currentBalance !== null) {
                        // 全局 key：仅官方模型（deepseek-official）无独立 key 时用全局 key（默认合理）；
                        // 非官方自定义模型无独立 key → 不走全局 key，保持未配置（balanceNeedsKey）。
                        accountBalance = {
                            currency: currentBalance.currency,
                            totalBalance: currentBalance.totalBalance - spentSinceAnchor,
                            updatedAt: Math.max(currentBalance.fetchedAt, lastLiveAt),
                            source: spentSinceAnchor > 0 ? 'computed' : 'api',
                        };
                    }
                }
                else {
                    const key = manualLedgerKeyOf(state.provider, state.model);
                    const ledger = key !== null ? balances[key] : undefined;
                    if (ledger !== undefined) {
                        accountBalance = {
                            currency: ledger.currency,
                            totalBalance: ledger.balance,
                            updatedAt: state.lastCostAt,
                            source: state.lastCostAt > 0 ? 'computed' : 'api',
                        };
                    }
                }
                // The OFFICIAL bundled pricing + row template for the current model.
                const officialProvider = viewProvider;
                const officialKey = officialProvider !== null && viewModel !== null ? `${officialProvider}/${viewModel}` : null;
                const officialRow = officialKey !== null ? BUNDLED_TABLE[officialKey] : undefined;
                const officialPrice = officialRow === undefined ? null : { pricing: officialRow, rows: rowsFromPricing(officialRow) };
                const budget = runtimeConfig.budget;
                // 峰/谷状态标注：当前模型启用了峰谷计费时，按北京时间实时判定此刻
                // 适用峰价还是谷价，弹窗在单价表头显示「（峰）/（谷）」。
                let peakState = null;
                if (pricing !== null) {
                    const hasLegacyPeak = pricing.peak !== undefined && pricing.offPeak !== undefined;
                    const hasRowPeak = (pricing.customRows ?? []).some((r) => r.peakPerM !== undefined || r.offPerM !== undefined);
                    if (hasLegacyPeak || hasRowPeak) {
                        // v2.0.16: 与计费同一判定（peakActiveBJ，含跨零点环绕窗口）——此前这里
                        // 内联了一份不带环绕的旧逻辑，峰谷窗口跨午夜时弹窗「(峰)/(谷)」标注
                        // 与真实计费不一致。显示与计费从此共用一份语义。
                        peakState = peakActiveBJ(pricing, Date.now()) ? 'peak' : 'off';
                    }
                }
                return {
                    ...safeTotals,
                    provider: viewProvider,
                    model: viewModel,
                    pricing,
                    basePricing: currentPrices.table.get(viewProvider ?? '', viewModel ?? '') ?? null,
                    priceRows: priceRowsOf(viewProvider, viewModel, pricing),
                    officialPrice,
                    estimatedCost,
                    currency,
                    usdToCny,
                    rateUpdatedAt: lastRateFetchedAt,
                    accountBalance,
                    // 只在「来源是 DeepSeek + 余额确实取不到」时才算需要 key；但已配置独立 key
                    // 而快照尚未查到（重启后内存清空，等下一个 turn/start）时，不应报「未配置Key」，
                    // 而应让前端显示「获取中…」。modelHasKey 见上方 view 局部。
                    balanceNeedsKey: balanceSource === 'deepseek' && accountBalance === null && !modelHasKey,
                    turns,
                    lastTurn: turns.length > 0 ? turns[turns.length - 1] : null,
                    peakState,
                    budget,
                    remainingBudget: budget === null ? null : safeNumber(budget - estimatedCost, 0),
                    alertBudgetPct: resolveThreshold(state.provider, state.model, runtimeConfig).budgetAlertPct,
                    alertBalanceFloor: resolveThreshold(state.provider, state.model, runtimeConfig).balanceAlertFloor,
                };
            }
            catch {
                return emptyUsageCost(state);
            }
        },
    },
    stateVersion: 1,
};
// ── service ──────────────────────────────────────────────────────────────────
class UsageMeterCore {
    cfg;
    priceRefreshing = null;
    balanceRefreshing = null;
    rateRefreshing = null;
    lastRateRefresh = 0;
    constructor(config) {
        this.cfg = config;
    }
    getConfig() {
        return this.cfg;
    }
    applyConfig(cfg) {
        this.cfg = cfg;
        activeWrapperMarkers = activePatterns(cfg.wrapperMarkers);
        runtimeConfig.currency = cfg.currency ?? 'CNY';
        runtimeConfig.initialBalance = typeof cfg.initialBalance === 'number' && cfg.initialBalance > 0 ? cfg.initialBalance : null;
        runtimeConfig.budget = typeof cfg.budget === 'number' && cfg.budget > 0 ? cfg.budget : null;
        runtimeConfig.budgetAlertPct = typeof cfg.budgetAlertPct === 'number' && cfg.budgetAlertPct > 0 ? cfg.budgetAlertPct : 0;
        runtimeConfig.balanceAlertFloor = typeof cfg.balanceAlertFloor === 'number' && cfg.balanceAlertFloor > 0 ? cfg.balanceAlertFloor : 0;
        // Mirror cfg-owned globals into the runtimeConfig singleton so
        // savePersistedConfig() can round-trip ALL settings to the file, keeping
        // the mirror in sync no matter which layer (schema defaults → file →
        // settings.yaml user section) last set a value via applyConfig/
        // scope.watch.
        if (typeof cfg.priceSourceUrl === 'string')
            runtimeConfig.priceSourceUrl = cfg.priceSourceUrl;
        if (typeof cfg.refreshIntervalMs === 'number')
            runtimeConfig.refreshIntervalMs = cfg.refreshIntervalMs;
        else if (cfg.refreshIntervalMs === undefined)
            runtimeConfig.refreshIntervalMs = undefined;
        if (typeof cfg.deepseekApiKey === 'string')
            runtimeConfig.deepseekApiKey = cfg.deepseekApiKey;
    }
    getPrice(provider, model) {
        return currentPrices.table.get(provider, model);
    }
    estimateCost(usage, provider, model) {
        return costOf(usage, this.getPrice(provider, model) ?? null);
    }
    getBalance() {
        return currentBalance;
    }
    maybeRefresh(deepSeekWanted) {
        const ms = this.cfg.refreshIntervalMs ?? 4 * 60 * 60 * 1000;
        const now = Date.now();
        if (rateNeeded && now - lastRateFetchedAt >= RATE_MAX_AGE_MS && now - this.lastRateRefresh >= 5 * 60 * 1000) {
            // 汇率独立于价格周期：超过 24 小时未更新就重新拉取（5 分钟最多尝试一次，
            // 避免源故障时反复打）。
            this.lastRateRefresh = now;
            void this.refreshRate();
        }
        if (now - currentPrices.updatedAt >= ms)
            void this.refreshPrices();
        // Refuse to touch DeepSeek's balance endpoint unless the active session is
        // actually a DeepSeek provider — the balance is only surfaced for DeepSeek
        // sessions, so fetching it for e.g. qwen/ollama is pure noise and (with a
        // non-DeepSeek key) just produces repeated HTTP 401 spam.
        if (deepSeekWanted && (currentBalance === null || now - currentBalance.fetchedAt >= ms))
            void this.refreshBalance();
    }
    /** 拉取 USD→CNY。闸门统一收口在这里：24h 内已新鲜就直接返回——不管调用方
     *  是启动恢复、会话事件还是定时器，都只可能打一次日志。只有显式 force
     *  （用户切换币种、建账换算）才绕过新鲜期。 */
    async refreshRate(force = false) {
        if (!force && Date.now() - lastRateFetchedAt < RATE_MAX_AGE_MS)
            return;
        if (this.rateRefreshing)
            return this.rateRefreshing;
        this.rateRefreshing = (async () => {
            try {
                currentPrices.usdToCny = await fetchUsdToCny();
                lastRateFetchedAt = Date.now();
                console.info(`[usage-meter] exchange rate updated: 1 USD = ${currentPrices.usdToCny} CNY`);
            }
            catch (err) {
                console.warn(`[usage-meter] exchange rate refresh failed (keeping last): ${String(err)}`);
            }
            finally {
                this.rateRefreshing = null;
            }
        })();
        return this.rateRefreshing;
    }
    async refreshPrices() {
        const url = this.cfg.priceSourceUrl;
        if (!url)
            return;
        if (this.priceRefreshing)
            return this.priceRefreshing;
        this.priceRefreshing = (async () => {
            try {
                const rows = await fetchRemotePrices(url);
                currentPrices.table.merge(rows);
                currentPrices.updatedAt = Date.now();
                console.info(`[usage-meter] refreshed ${Object.keys(rows).length} price rows`);
            }
            catch (err) {
                console.warn(`[usage-meter] price refresh failed (keeping last table): ${String(err)}`);
            }
            finally {
                this.priceRefreshing = null;
            }
        })();
        return this.priceRefreshing;
    }
    async refreshBalance() {
        // 只读加密配置里的 Key，不回落 DEEPSEEK_API_KEY 环境变量。
        const apiKey = this.cfg.deepseekApiKey;
        if (!apiKey) {
            currentBalance = null;
            spentSinceAnchor = 0; // 无锚点：清零场内估计，避免残留脏 offset。
            lastLiveAt = 0;
            return;
        }
        if (this.balanceRefreshing)
            return this.balanceRefreshing;
        this.balanceRefreshing = (async () => {
            try {
                currentBalance = toSnapshot(await fetchDeepSeekBalance(apiKey));
                // 重新锚定：API 真值落地，场内估计清零（实时估计 → 下轮校准）。
                spentSinceAnchor = 0;
                lastLiveAt = 0;
            }
            catch (err) {
                // 刷新失败：保留旧锚点 + 场内估计，余额继续随采样下降而不冻结。
                console.warn(`[usage-meter] balance refresh failed: ${String(err)}`);
            }
            finally {
                this.balanceRefreshing = null;
            }
        })();
        return this.balanceRefreshing;
    }
    /** 刷新「当前模型」的余额：官方模型（deepseek-official）恒用全局 key；
     *  非官方自定义模型用「DS API Key」（各自独立，无则未配置，不回落全局）。 */
    async refreshModelBalance(provider, model) {
        // 官方模型恒用全局 key（不读模型独立 key）。
        if (isDeepSeekProvider(provider)) {
            void this.refreshBalance();
            return;
        }
        const safeKey = modelSafeKey(provider, model);
        if (safeKey === null)
            return;
        // 模型自有 key 优先；提供商开启「共享 API Key」时回退到共享 key。
        const apiKey = loadModelApiKeyFor(provider, model);
        if (apiKey === null)
            return; // 非官方无独立 key → 未配置（不走全局 key）。
        if (modelBalanceRefreshing.has(safeKey))
            return;
        modelBalanceRefreshing.add(safeKey);
        try {
            const snap = toSnapshot(await fetchDeepSeekBalance(apiKey));
            if (snap === null) {
                delete modelBalances[safeKey];
                return;
            }
            // 余额返回 → 建立快照；把「快照未返回期间」记入 pendingModelSpent 的费用一次性落地，
            // 使账户余额 = 真实余额 − 已花费（含首轮欠记的部分）。pending 记的是 CNY，按快照币种折算。
            const pending = pendingModelSpent[safeKey] ?? 0;
            delete pendingModelSpent[safeKey];
            const spentInSnap = toCurrency(pending, 'CNY', snap.currency, currentPrices.usdToCny);
            modelBalances[safeKey] = { snapshot: snap, spent: spentInSnap, liveAt: 0 };
        }
        catch (err) {
            // 失败：保留旧锚点 + 场内估计（若有），余额继续随采样下降而不冻结。
            console.warn(`[usage-meter] model balance refresh failed (${safeKey}): ${String(err)}`);
        }
        finally {
            modelBalanceRefreshing.delete(safeKey);
        }
    }
}
/** Plugin entry: provide the service, register settings + the projection. */
export function apply(ctx, config = {}) {
    // 包装标记先于持久化数据解析：老数据里包装路由的定价/余额/Key/统计键要在
    // 读取时就归一回底层，否则历史配置变孤儿（组合入口的 config 只作为兜底，
    // 用户设置命名空间里的值稍后由 meter.applyConfig 覆盖）。
    activeWrapperMarkers = activePatterns(config.wrapperMarkers);
    // Seed the per-provider currency / price overrides / ledger maps from the
    // extra-state file. Global scalars are NOT read here — they resolve through
    // the `usage-meter` settings namespace below (single canonical write path).
    loadPersistedConfig();
    loadStats();
    if (rekeyWrappedPersistedState())
        applyPriceOverrides();
    const meter = new UsageMeterCore(config);
    // 用量看板聚合（只读）：监听会话事件，按 (底层 provider, model) 累计真实 token/费用。
    ctx.on('session/event', (session, event) => {
        try {
            const ue = usageEventOf(event);
            if (ue === null)
                return;
            const b = bucketsOf(ue.usage);
            if (isZeroUsage(b))
                return;
            let provider = null;
            let model = null;
            try {
                const snap = ctx.sessionProjections.snapshot(session);
                const v = snap.values['usageCost'];
                provider = v?.provider ?? null;
                model = v?.model ?? null;
            }
            catch { /* ignore */ }
            if (provider === null || model === null)
                return;
            const alias = aliasOf(provider, model, activeWrapperMarkers);
            const pv = alias !== null ? alias.provider : provider;
            const md = alias !== null ? alias.model : model;
            const real = underlyingProvider(pv) ?? pv;
            const prev = lastStatsBySession.get(session);
            if (prev !== undefined && (prev.provider !== provider || prev.model !== model || (prev.input === b.input && prev.output === b.output && prev.cacheRead === b.cacheRead && prev.cacheWrite === b.cacheWrite && prev.reasoning === b.reasoning)))
                return;
            const delta = deltaOf(prev !== undefined && prev.provider === provider && prev.model === model ? { input: prev.input, output: prev.output, cacheRead: prev.cacheRead, cacheWrite: prev.cacheWrite, reasoning: prev.reasoning } : null, b);
            lastStatsBySession.set(session, { provider, model, input: b.input, output: b.output, cacheRead: b.cacheRead, cacheWrite: b.cacheWrite, reasoning: b.reasoning });
            if (delta.input === 0 && delta.output === 0 && delta.cacheRead === 0 && delta.cacheWrite === 0 && delta.reasoning === 0)
                return;
            const pricing = pricingFor(provider, model, event.time ?? Date.now());
            const bd = pricing === null ? null : costBreakdown({ inputTokens: delta.input, outputTokens: delta.output, cacheReadTokens: delta.cacheRead, cacheWriteTokens: delta.cacheWrite }, pricing);
            const deltaCost = bd === null ? 0 : bd.total;
            const currency = pricing?.currency ?? 'CNY';
            const key = `${canonicalId(real)}/${canonicalId(md)}`;
            const cur = stats[key] ?? (stats[key] = { provider: real, model: md, requestCount: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, reasoningTokens: 0, cost: 0, inputCost: 0, cacheReadCost: 0, cacheWriteCost: 0, outputCost: 0, currency, updatedAt: Date.now() });
            if (event.type === 'assistant/message')
                cur.requestCount += 1;
            cur.inputTokens += delta.input;
            cur.outputTokens += delta.output;
            cur.cacheReadTokens += delta.cacheRead;
            cur.cacheWriteTokens += delta.cacheWrite;
            cur.reasoningTokens += delta.reasoning;
            cur.cost += deltaCost;
            if (bd !== null) {
                cur.inputCost += bd.input;
                cur.cacheReadCost += bd.cacheRead;
                cur.cacheWriteCost += bd.cacheWrite;
                cur.outputCost += bd.output;
            }
            cur.currency = currency;
            cur.updatedAt = Date.now();
            statsDirty = true;
        }
        catch { /* ignore */ }
    });
    // 用看板统计的周期性持久化（每 5s flush；进程退出也 flush）。
    ctx.effect(() => {
        const statsFlush = setInterval(() => saveStats(), 5000);
        const onExit = () => saveStats();
        process.on('beforeExit', onExit);
        process.on('exit', onExit);
        return () => { clearInterval(statsFlush); process.off('beforeExit', onExit); process.off('exit', onExit); };
    });
    // Fiber-scoped debounced persistence + process-exit flush. Tearing these down
    // with `ctx.effect` keeps a plugin reload from leaking debounce timers or a
    // stale process listener.
    const persist = {
        debounce: null,
        maxWait: null,
        disposed: false,
        flush() {
            if (persist.disposed)
                return;
            if (persist.debounce === null && persist.maxWait === null)
                return;
            if (persist.debounce !== null) {
                clearTimeout(persist.debounce);
                persist.debounce = null;
            }
            if (persist.maxWait !== null) {
                clearTimeout(persist.maxWait);
                persist.maxWait = null;
            }
            savePersistedConfig();
        },
        schedule() {
            if (persist.disposed)
                return;
            if (persist.maxWait === null)
                persist.maxWait = setTimeout(() => persist.flush(), PERSIST_MAX_WAIT_MS);
            if (persist.debounce !== null)
                clearTimeout(persist.debounce);
            persist.debounce = setTimeout(() => persist.flush(), PERSIST_DEBOUNCE_MS);
        },
    };
    ctx.effect(() => {
        const onExit = () => persist.flush();
        process.on('beforeExit', onExit);
        process.on('exit', onExit);
        return () => {
            persist.disposed = true;
            process.off('beforeExit', onExit);
            process.off('exit', onExit);
            if (persist.debounce !== null) {
                clearTimeout(persist.debounce);
                persist.debounce = null;
            }
            if (persist.maxWait !== null) {
                clearTimeout(persist.maxWait);
                persist.maxWait = null;
            }
        };
    });
    // `base` = the composition entry config only. Global scalars resolve as
    // schema-defaults → composition `base` → settings.yaml `usage-meter` user
    // section; a user-written section always wins, and `scope.update` is the one
    // write path (the popup POST and the settings UI both go through it).
    const scope = ctx.settings.register('usage-meter', Config, { base: config });
    meter.applyConfig(scope.get());
    // 一次性迁移：老版本把包装标记存成「换行分隔的纯文本」，升级成逐行可开关的
    // 行表（并补齐包装提供商相关的新默认行）后写回，之后用户的增删/开关才持久。
    if (typeof scope.get().wrapperMarkers === 'string') {
        const rows = wrapperRowList(scope.get());
        void scope.update({ wrapperMarkers: rows })
            .then(() => meter.applyConfig(scope.get()))
            .catch((err) => console.warn('[usage-meter] wrapperMarkers migration failed:', err));
    }
    // Restore globals persisted in the extra-state file when the settings
    // namespace itself lost them across a restart (web compositions without a
    // persistent settings-file provider). Namespace values always win.
    if (pendingGlobals !== null) {
        const cur = scope.get();
        const restore = {};
        const g = pendingGlobals;
        if (g.initialBalance !== undefined && !(typeof cur.initialBalance === 'number' && cur.initialBalance > 0))
            restore.initialBalance = g.initialBalance;
        if (g.budget !== undefined && !(typeof cur.budget === 'number' && cur.budget > 0))
            restore.budget = g.budget;
        if (g.currency && cur.currency === undefined)
            restore.currency = g.currency;
        if (g.priceSourceUrl && (typeof cur.priceSourceUrl !== 'string' || cur.priceSourceUrl === ''))
            restore.priceSourceUrl = g.priceSourceUrl;
        if (typeof g.refreshIntervalMs === 'number' && typeof cur.refreshIntervalMs !== 'number')
            restore.refreshIntervalMs = g.refreshIntervalMs;
        if (g.deepseekApiKeyEnc !== undefined && (typeof cur.deepseekApiKey !== 'string' || cur.deepseekApiKey === '')) {
            const plain = decryptSecret(g.deepseekApiKeyEnc);
            if (plain !== null)
                restore.deepseekApiKey = plain;
            else
                console.warn('[usage-meter] stored DeepSeek API key could not be decrypted (salt changed?); please re-enter it');
        }
        pendingGlobals = null;
        // Startup rate freshness: a persisted rate older than 24h is refreshed once
        // right away so the UI never shows a stale quote all day.
        if (Date.now() - lastRateFetchedAt >= RATE_MAX_AGE_MS)
            void meter.refreshRate();
        if (Object.keys(restore).length > 0) {
            void scope.update(restore).then(() => meter.applyConfig(scope.get())).catch((err) => console.warn('[usage-meter] global restore failed:', err));
        }
    }
    // Watch the canonical namespace: mirror into runtimeConfig and keep the
    // extra-state file in sync so a settings-page edit survives a restart.
    scope.watch((next) => {
        meter.applyConfig(next);
        savePersistedConfig();
    });
    ctx.sessionProjections.register(usageCostProjection);
    // Billing-method templates for the popup dropdown.
    ctx.webServer.register({
        kind: 'exact',
        path: '/api/usage-meter/templates',
        handler: async (_req, res) => {
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ ok: true, types: BILLING_TYPES }));
        },
    });
    // Force a fresh USD→CNY rate on demand (popup currency switch).
    ctx.webServer.register({
        kind: 'exact',
        path: '/api/usage-meter/active',
        handler: async (_req, res) => {
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ active: activeModel }));
        },
    });
    ctx.webServer.register({
        kind: 'exact',
        path: '/api/usage-meter/refresh-rate',
        handler: async (_req, res) => {
            await meter.refreshRate(true); // 用户手动点击刷新：绕过 24h 新鲜期
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ ok: true, usdToCny: currentPrices.usdToCny, rateUpdatedAt: lastRateFetchedAt }));
        },
    });
    // 一键同步官方价格：抓官网价格页 → 解析价格表（rowspan 网格）+ 注释(3)峰谷窗口，
    // 写入本机官方模型的价格 override。绝不编造数字：解析不出的模型跳过并告警，
    // 窗口解析失败则保留本机现有窗口；页面结构变化时原样返回 warnings。
    ctx.webServer.register({
        kind: 'exact',
        path: '/api/usage-meter/refresh-official-prices',
        handler: async (_req, res) => {
            const send = (status, doc) => {
                res.writeHead(status, { 'content-type': 'application/json' });
                res.end(JSON.stringify(doc));
            };
            try {
                const rawKey = meter.getConfig().deepseekApiKey;
                const cfgKey = typeof rawKey === 'string' ? rawKey : '';
                let html;
                try {
                    html = await fetchPricingPage();
                }
                catch (err) {
                    send(502, { ok: false, error: `无法获取官网价格页：${String(err)}`, warnings: [] });
                    return;
                }
                // 模式1：规则解析（rowspan 网格 + 脚注(3)高峰时段）。
                let page = { ...parsePricingPageHtml(html), fetchedAt: Date.now() };
                // 模式2兜底：规则解析一个模型都没拿到 → 用全局 Key 让 LLM 静默从原始 HTML
                // 提取结构化价目表（不在 UI 提示该过程）；失败继续降级。
                let source = 'parse';
                if (page.pageModels.length === 0 && cfgKey !== '') {
                    const llmPage = await extractPricesViaLLM(cfgKey, DEEPSEEK_PRICING_PAGE_URL, html);
                    if (llmPage !== null) {
                        page = { ...llmPage, fetchedAt: page.fetchedAt };
                        source = 'llm';
                    }
                }
                // 模式3：两级都失败 → 提示手动填写。
                if (page.pageModels.length === 0) {
                    send(502, { ok: false, error: '一键提取失败：网页解析与模型提取均未成功，请手动填写价格', warnings: page.warnings });
                    return;
                }
                // 本机 DeepSeek 官方模型清单（包装提供商归并到底层、剥包装标记，与 /models 同语义）。
                const llm = ctx.llm;
                const local = [];
                for (const p of llm.listProviders()) {
                    const base = underlyingProvider(p.id) ?? p.id;
                    if (base !== 'deepseek-official')
                        continue;
                    let models = [];
                    try {
                        models = await llm.listModels(p.id);
                    }
                    catch {
                        models = [];
                    }
                    for (const m of models) {
                        const mid = stripAllWrappers(m.id, activeWrapperMarkers);
                        if (mid === '' || local.some((x) => x.model === mid))
                            continue;
                        local.push({ provider: base, model: mid });
                    }
                }
                // 页面模型名 → 本机模型 id 候选序（官方曾改名，如 v4-flash 系列 → flash）。
                const ALIAS = {
                    'deepseek-flash': ['deepseek-flash', 'deepseek-v4-flash', 'deepseek-v4-flash-vision-exp'],
                    'deepseek-v4-pro': ['deepseek-v4-pro'],
                };
                const updated = [];
                const missing = [];
                const matched = new Set();
                for (const [pageModel, pp] of Object.entries(page.prices)) {
                    const candidates = ALIAS[pageModel] ?? [pageModel];
                    const hit = candidates.find((c) => local.some((l) => l.model === c));
                    if (hit === undefined) {
                        missing.push({ pageModel, candidates });
                        continue;
                    }
                    matched.add(hit);
                    const key = `deepseek-official/${hit}`;
                    const existing = priceOverrides[key]?.prices ?? BUNDLED_TABLE[key];
                    const prices = {
                        // 基础价 = 空闲时段价（与 bundled 行同约定）。
                        inputPerM: pp.offPeak.inputPerM,
                        outputPerM: pp.offPeak.outputPerM,
                        cacheReadPerM: pp.offPeak.cacheReadPerM,
                        peak: pp.peak,
                        offPeak: pp.offPeak,
                        // 窗口解析失败（页面文案变了）→ 保留本机现有窗口，绝不猜。
                        peakDays: page.peak !== null ? page.peak.days : (existing?.peakDays ?? [1, 2, 3, 4, 5]),
                        peakWindows: page.peak !== null ? page.peak.windows : (existing?.peakWindows ?? [{ start: 540, end: 720 }, { start: 840, end: 1080 }]),
                        peakOffPeakFrom: existing?.peakOffPeakFrom ?? DEEPSEEK_PEAK_OFF_PEAK_FROM,
                        currency: 'CNY',
                        updatedAt: page.fetchedAt,
                        source: 'remote',
                    };
                    applyModelOverride('deepseek-official', hit, { prices });
                    updated.push({ pageModel, model: hit, input: pp.offPeak.inputPerM, output: pp.offPeak.outputPerM, cacheRead: pp.offPeak.cacheReadPerM, peakInput: pp.peak.inputPerM, peakOutput: pp.peak.outputPerM, peakCacheRead: pp.peak.cacheReadPerM });
                }
                const retired = local.filter((l) => !matched.has(l.model)).map((l) => l.model);
                send(200, { ok: true, source, fetchedAt: page.fetchedAt, pageModels: page.pageModels, updated, missing, retired, peak: page.peak, warnings: page.warnings });
            }
            catch (err) {
                send(502, { ok: false, error: String(err) });
            }
        },
    });
    // Config channel: a small HTTP endpoint so the browser popup can save config.
    ctx.webServer.register({
        kind: 'exact',
        path: '/api/usage-meter/config',
        handler: async (req, res) => {
            if (req.method === 'GET') {
                const cfg = meter.getConfig();
                // 包装标记统一以「行表」返回（老字符串会被升级并补齐新默认行），
                // 这样设置页拿到的就是服务端真正生效的那份，保存时不会把默认行丢掉。
                const safe = { ...cfg, deepseekApiKey: cfg.deepseekApiKey ? '***' : undefined, wrapperMarkers: wrapperRowList(cfg) };
                res.writeHead(200, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ ok: true, config: safe, providers: providerConfigs, priceOverrides, balances, balanceSources, modelApiKeyFlags, thresholds, rate: { usdToCny: currentPrices.usdToCny, rateUpdatedAt: lastRateFetchedAt } }));
                return;
            }
            if (req.method === 'POST') {
                let body = '';
                for await (const chunk of req)
                    body += String(chunk);
                const patch = JSON.parse(body);
                // GLOBAL scalar settings go through the canonical settings namespace
                // (single write path; persists to settings.yaml), so the popup and the
                // settings UI can never diverge. Provider/model overrides + the ledger
                // are EXTRA state and are persisted by savePersistedConfig() below.
                const globalPatch = {};
                if (patch.currency !== undefined && typeof patch.currency === 'string' && patch.currency !== '')
                    globalPatch.currency = patch.currency;
                if (patch.initialBalance !== undefined && typeof patch.initialBalance === 'number' && Number.isFinite(patch.initialBalance))
                    globalPatch.initialBalance = patch.initialBalance;
                if (patch.budget !== undefined && typeof patch.budget === 'number' && Number.isFinite(patch.budget))
                    globalPatch.budget = patch.budget;
                if (patch.priceSourceUrl !== undefined)
                    globalPatch.priceSourceUrl = patch.priceSourceUrl;
                if (patch.refreshIntervalMs !== undefined)
                    globalPatch.refreshIntervalMs = patch.refreshIntervalMs;
                if (patch.billingConfigDir !== undefined && typeof patch.billingConfigDir === 'string' && patch.billingConfigDir !== '')
                    globalPatch.billingConfigDir = patch.billingConfigDir;
                if (patch.wrapperMarkers !== undefined) {
                    // 行表（每行一个标记 + 开关）；仍兼容老客户端发来的纯文本字符串。
                    if (Array.isArray(patch.wrapperMarkers)) {
                        globalPatch.wrapperMarkers = wrapperRows(patch.wrapperMarkers);
                    }
                    else if (typeof patch.wrapperMarkers === 'string') {
                        globalPatch.wrapperMarkers = patch.wrapperMarkers === '' ? [] : wrapperRows(patch.wrapperMarkers);
                    }
                }
                if (patch.budgetAlertPct !== undefined && typeof patch.budgetAlertPct === 'number' && Number.isFinite(patch.budgetAlertPct))
                    globalPatch.budgetAlertPct = patch.budgetAlertPct;
                if (patch.balanceAlertFloor !== undefined && typeof patch.balanceAlertFloor === 'number' && Number.isFinite(patch.balanceAlertFloor))
                    globalPatch.balanceAlertFloor = patch.balanceAlertFloor;
                if (patch.deepseekApiKey !== undefined && patch.deepseekApiKey !== '***')
                    globalPatch.deepseekApiKey = patch.deepseekApiKey;
                if (Object.keys(globalPatch).length > 0) {
                    try {
                        await scope.update(globalPatch);
                    }
                    catch (err) {
                        res.writeHead(400, { 'content-type': 'application/json' });
                        res.end(JSON.stringify({ ok: false, error: String(err) }));
                        return;
                    }
                    // Mirror the resolved namespace value into the meter immediately; the
                    // async scope.watch also fires and re-applies the same value.
                    meter.applyConfig(scope.get());
                }
                let currencyChanged = false;
                let ledgerChanged = false;
                let ledgerKey = null;
                let ledgerEntry = null;
                if (patch.provider !== undefined && patch.provider !== null) {
                    const pv = String(patch.provider);
                    const pc = providerConfigs[pv] ?? (providerConfigs[pv] = {});
                    // 设置页模型编辑器保存时同步的「显示币种」：驱动弹窗所有金额/单位联动。
                    if (patch.displayCurrency !== undefined && typeof patch.displayCurrency === 'string' && ['CNY', 'USD'].includes(patch.displayCurrency)) {
                        if (pc.currency !== patch.displayCurrency) {
                            pc.currency = patch.displayCurrency;
                            currencyChanged = true;
                        }
                    }
                    // 共享余额开关：开启后该供应商所有模型共用一个钱包（p:<provider>）。
                    if (patch.sharedBalance !== undefined && typeof patch.sharedBalance === 'boolean' && !isDeepSeekProvider(pv)) {
                        pc.sharedBalance = patch.sharedBalance;
                        // 开启共享时，把该供应商已有的独立模型钱包（m:<provider>/<model>）
                        // 余额合并进共用钱包，避免切开关后用户看到「余额凭空消失」。
                        if (patch.sharedBalance === true) {
                            const targetKey = `p:${underlyingProvider(pv) ?? pv}`;
                            const prefix = `${targetKey.slice(2)}/`;
                            let merged = 0;
                            for (const k of Object.keys(balances)) {
                                if (!k.startsWith('m:') || !k.slice(2).startsWith(prefix))
                                    continue;
                                const src = balances[k];
                                const dst = balances[targetKey] ?? (balances[targetKey] = { balance: 0, currency: src.currency });
                                const amount = toCurrency(src.balance, src.currency, dst.currency, currentPrices.usdToCny);
                                dst.balance += amount;
                                merged += 1;
                                delete balances[k];
                            }
                            if (merged > 0)
                                ledgerChanged = true;
                        }
                    }
                    // 共享 API Key 开关：开启后该供应商内选择「DeepSeek 官方余额」的模型
                    // 共用同一把独立 key（任一模型已存的 key；模型自有 key 永远优先）。
                    // 仅影响 key 的读取，不触碰余额钱包，也不与共享余额联动。
                    if (patch.sharedApiKey !== undefined && typeof patch.sharedApiKey === 'boolean' && !isDeepSeekProvider(pv)) {
                        pc.sharedApiKey = patch.sharedApiKey;
                    }
                    if (patch.currency !== undefined && patch.currency !== pc.currency) {
                        pc.currency = String(patch.currency);
                        currencyChanged = true;
                    }
                    const md = patch.model === null || patch.model === undefined ? null : String(patch.model);
                    if (balanceSourceOf(pv, md) === 'manual') {
                        ledgerKey = manualLedgerKeyOf(pv, md);
                        ledgerEntry = ledgerOf(ledgerKey, pc.currency ?? runtimeConfig.currency);
                        if (ledgerKey !== null && ledgerEntry !== null) {
                            // 共享余额运行锁：该供应商已开启共享余额，且组内某一模型正在运行
                            // （activeModel 记录最近运行的 route），则当前模型写入的是同一个
                            // p:<provider> 钱包——运行期间任何余额/充值修改都会联带改到正在
                            // 消耗该钱包的模型 A，造成余额漂移。故运行时一律拒绝，仅对
                            // 非余额字段（单价/币种/模板）放行。
                            const balanceEdited = (patch.balance !== undefined && Number.isFinite(Number(patch.balance))) ||
                                (patch.recharge !== undefined && Number.isFinite(Number(patch.recharge)) && Number(patch.recharge) !== 0);
                            const sharedGroupLocked = pc.sharedBalance === true &&
                                activeModel !== null &&
                                underlyingProvider(activeModel.provider) === underlyingProvider(pv);
                            if (balanceEdited && sharedGroupLocked) {
                                const act = activeModel;
                                res.writeHead(409, { 'content-type': 'application/json' });
                                res.end(JSON.stringify({
                                    ok: false,
                                    error: 'shared-balance-running',
                                    message: `共享余额启用中，且「${act.provider}/${act.model}」正在运行——组内余额已被锁定，请在轮次结束后再修改余额。`,
                                }));
                                return;
                            }
                            if (patch.balance !== undefined && Number.isFinite(Number(patch.balance))) {
                                // 设置页「保存单价」语义：显示值 + 其币种一起原样落盘，不换算。
                                ledgerEntry.balance = Number(patch.balance);
                                if (typeof patch.balanceCurrency === 'string' && ['CNY', 'USD'].includes(patch.balanceCurrency)) {
                                    ledgerEntry.currency = patch.balanceCurrency;
                                }
                                ledgerChanged = true;
                            }
                            if (patch.recharge !== undefined && Number.isFinite(Number(patch.recharge)) && Number(patch.recharge) !== 0) {
                                ledgerEntry.balance = ledgerEntry.balance + Number(patch.recharge);
                                ledgerChanged = true;
                            }
                            if (patch.currency !== undefined && patch.currency !== ledgerEntry.currency) {
                                if (patch.balance === undefined) {
                                    if (lastRateFetchedAt === 0)
                                        await meter.refreshRate(true);
                                    ledgerEntry.balance = toCurrency(ledgerEntry.balance, ledgerEntry.currency, String(patch.currency), currentPrices.usdToCny);
                                }
                                ledgerEntry.currency = String(patch.currency);
                                ledgerChanged = true;
                            }
                        }
                    }
                    savePersistedConfig();
                }
                if (currencyChanged) {
                    rateNeeded = true;
                    void meter.refreshRate(true);
                }
                if (ledgerChanged && ledgerKey !== null && ledgerEntry !== null)
                    broadcastBalance(ledgerKey, ledgerEntry, 'manual');
                // 预警阈值编辑：`thresholds` 对象（key = `p:<provider>` 或 `m:<provider>/<model>`）。
                if (patch.thresholds !== undefined && typeof patch.thresholds === 'object' && patch.thresholds !== null) {
                    for (const [tk, tv] of Object.entries(patch.thresholds)) {
                        if (typeof tv !== 'object' || tv === null)
                            continue;
                        const o = tv;
                        const def = { ...(thresholds[tk] ?? {}) };
                        if (typeof o.budgetAlertPct === 'number' && Number.isFinite(o.budgetAlertPct))
                            def.budgetAlertPct = o.budgetAlertPct;
                        else
                            delete def.budgetAlertPct;
                        if (typeof o.balanceAlertFloor === 'number' && Number.isFinite(o.balanceAlertFloor))
                            def.balanceAlertFloor = o.balanceAlertFloor;
                        else
                            delete def.balanceAlertFloor;
                        if (typeof o.followProvider === 'boolean')
                            def.followProvider = o.followProvider;
                        else
                            delete def.followProvider;
                        thresholds[tk] = def;
                    }
                    savePersistedConfig();
                }
                // 每模型余额来源 + 独立 DeepSeek key（需求1）：只影响「余额来源」，不动计费。
                if (patch.provider !== undefined && patch.provider !== null && patch.model !== undefined && patch.model !== null) {
                    const pv = String(patch.provider);
                    const md = String(patch.model);
                    if (patch.balanceSource === 'manual' || patch.balanceSource === 'deepseek') {
                        const sk = modelSourceKey(pv, md);
                        if (sk !== null) {
                            balanceSources[sk] = patch.balanceSource;
                            delete modelBalances[modelSafeKey(pv, md) ?? ''];
                            // v2.0.16: 切换余额来源后，旧来源期间缓冲的「未刷新」费用不再适用
                            // （新来源会在下次刷新时重新锚定），一并清掉，避免泄漏/误冲抵。
                            delete pendingModelSpent[modelSafeKey(pv, md) ?? ''];
                            savePersistedConfig();
                        }
                    }
                    if (patch.modelApiKey !== undefined && typeof patch.modelApiKey === 'string') {
                        const sourceKey = modelSourceKey(pv, md);
                        const safeKey = modelSafeKey(pv, md);
                        if (sourceKey !== null && safeKey !== null) {
                            if (patch.modelApiKey.trim() === '') {
                                deleteModelApiKey(sourceKey, safeKey);
                                delete modelBalances[safeKey];
                                delete pendingModelSpent[safeKey]; // v2.0.16: 旧 key 期间的缓冲费用一并清掉
                            }
                            else {
                                saveModelApiKey(sourceKey, safeKey, patch.modelApiKey.trim());
                                delete modelBalances[safeKey]; // 重新锚定
                                delete pendingModelSpent[safeKey]; // v2.0.16: 旧 key 期间的缓冲费用不属于新 key
                                void meter.refreshModelBalance(pv, md); // 保存后立即用新 key 查余额
                            }
                            savePersistedConfig();
                        }
                    }
                }
                if (patch.model !== undefined && patch.model !== null && patch.provider !== undefined && patch.provider !== null) {
                    applyModelOverride(String(patch.provider), String(patch.model), patch);
                }
                res.writeHead(200, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ ok: true }));
                return;
            }
            res.writeHead(405);
            res.end();
        },
    });
    // ── 计费配置目录：导出/列出/从目录导入/删除（同一持久目录，浏览器 ↔ 宿主）──
    ctx.webServer.register({
        kind: 'exact',
        path: '/api/usage-meter/export-config',
        handler: async (req, res) => {
            let body = '';
            for await (const chunk of req)
                body += String(chunk);
            let doc;
            try {
                doc = JSON.parse(body);
            }
            catch {
                res.writeHead(400, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: 'bad json' }));
                return;
            }
            const provider = typeof doc.provider === 'string' ? doc.provider : '';
            const model = typeof doc.model === 'string' ? doc.model : '';
            if (provider === '' || model === '') {
                res.writeHead(400, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: 'provider/model required' }));
                return;
            }
            const dir = effectiveBillingDir(meter.getConfig());
            const templateId = typeof doc.templateId === 'string' ? doc.templateId : '';
            const displayCurrency = typeof doc.displayCurrency === 'string' && doc.displayCurrency !== '' ? doc.displayCurrency : 'CNY';
            const prices = typeof doc.prices === 'object' && doc.prices !== null ? doc.prices : {};
            const rows = Array.isArray(doc.rows) ? doc.rows : undefined;
            const requestedName = typeof doc.fileName === 'string' && doc.fileName.trim() !== '' ? doc.fileName.trim() : '';
            const force = doc.force === true;
            // 计费内容规范键（排除 exportedAt 时间戳），用于判定「同名配置内容是否一致」。
            const newKey = canonicalize([provider, model, templateId, displayCurrency, prices, rows]);
            const effectiveName = requestedName !== '' ? requestedName : `dsh-billing-${safeName(provider)}-${safeName(model)}.json`;
            if (!effectiveName.endsWith('.json') || effectiveName.includes('..') || effectiveName.includes('/') || effectiveName.includes('\\')) {
                res.writeHead(400, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: 'invalid fileName' }));
                return;
            }
            const full = join(dir, effectiveName);
            // 存在性/一致性检查：存在且未强制时先不写盘，交回客户端决定（覆盖/改名/跳过相同）。
            let exists = false;
            let identical = false;
            try {
                if (existsSync(full)) {
                    exists = true;
                    const prev = JSON.parse(readFileSync(full, 'utf8'));
                    identical = canonicalize([prev.sourceProvider, prev.sourceModel, prev.templateId, prev.displayCurrency, prev.prices, prev.rows]) === newKey;
                }
            }
            catch {
                exists = false;
            }
            if (exists && !force) {
                res.writeHead(200, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ ok: true, exists: true, identical, path: full }));
                return;
            }
            try {
                mkdirSync(dir, { recursive: true });
                const fileDoc = {
                    __dshUsageMeter: 1, kind: 'model-billing-config', version: 1,
                    sourceProvider: provider, sourceModel: model,
                    templateId, displayCurrency, prices, ...(rows !== undefined ? { rows } : {}),
                    exportedAt: new Date().toISOString(),
                };
                writeFileSync(full, JSON.stringify(fileDoc, null, 2), 'utf8');
            }
            catch (err) {
                res.writeHead(500, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: String(err) }));
                return;
            }
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ ok: true, created: true, exists, path: full }));
        },
    });
    ctx.webServer.register({
        kind: 'exact',
        path: '/api/usage-meter/delete-config',
        handler: async (req, res) => {
            let body = '';
            for await (const chunk of req)
                body += String(chunk);
            let doc;
            try {
                doc = JSON.parse(body);
            }
            catch {
                res.writeHead(400, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: 'bad json' }));
                return;
            }
            const fileName = typeof doc.fileName === 'string' ? doc.fileName : '';
            if (fileName === '' || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
                res.writeHead(400, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: 'invalid fileName' }));
                return;
            }
            const full = join(effectiveBillingDir(meter.getConfig()), fileName);
            try {
                if (!existsSync(full)) {
                    res.writeHead(404, { 'content-type': 'application/json' });
                    res.end(JSON.stringify({ ok: false, error: 'not found' }));
                    return;
                }
                rmSync(full, { force: true });
            }
            catch (err) {
                res.writeHead(500, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: String(err) }));
                return;
            }
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
        },
    });
    ctx.webServer.register({
        kind: 'exact',
        path: '/api/usage-meter/list-configs',
        handler: async (_req, res) => {
            const dir = effectiveBillingDir(meter.getConfig());
            let files = [];
            try {
                for (const f of readdirSync(dir)) {
                    if (!f.endsWith('.json') || !f.startsWith('dsh-billing-'))
                        continue;
                    let info = { provider: '', model: '' };
                    try {
                        const parsed = JSON.parse(readFileSync(join(dir, f), 'utf8'));
                        info = { provider: typeof parsed.sourceProvider === 'string' ? parsed.sourceProvider : '', model: typeof parsed.sourceModel === 'string' ? parsed.sourceModel : '' };
                    }
                    catch { /* skip malformed */ }
                    let mtime = 0;
                    try {
                        mtime = statSync(join(dir, f)).mtimeMs;
                    }
                    catch {
                        mtime = 0;
                    }
                    files.push({ name: f, provider: info.provider, model: info.model, mtime });
                }
            }
            catch {
                files = [];
            }
            files.sort((a, b) => b.mtime - a.mtime);
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ ok: true, dir, files }));
        },
    });
    ctx.webServer.register({
        kind: 'exact',
        path: '/api/usage-meter/import-config',
        handler: async (req, res) => {
            let body = '';
            for await (const chunk of req)
                body += String(chunk);
            let doc;
            try {
                doc = JSON.parse(body);
            }
            catch {
                res.writeHead(400, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: 'bad json' }));
                return;
            }
            const provider = typeof doc.provider === 'string' ? doc.provider : '';
            const model = typeof doc.model === 'string' ? doc.model : '';
            const fileName = typeof doc.fileName === 'string' ? doc.fileName : '';
            if (provider === '' || model === '' || fileName === '') {
                res.writeHead(400, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: 'provider/model/fileName required' }));
                return;
            }
            if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
                res.writeHead(400, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: 'invalid fileName' }));
                return;
            }
            const dir = effectiveBillingDir(meter.getConfig());
            let parsed;
            try {
                parsed = JSON.parse(readFileSync(join(dir, fileName), 'utf8'));
            }
            catch (err) {
                res.writeHead(404, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: String(err) }));
                return;
            }
            if (parsed === null || typeof parsed !== 'object' || parsed.__dshUsageMeter !== 1 || typeof parsed.prices !== 'object' || parsed.prices === null) {
                res.writeHead(400, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: 'invalid config' }));
                return;
            }
            applyModelOverride(provider, model, {
                prices: parsed.prices,
                ...(Array.isArray(parsed.rows) ? { rows: parsed.rows } : {}),
                ...(typeof parsed.templateId === 'string' ? { templateId: parsed.templateId } : {}),
            });
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
        },
    });
    // Model-directory channel: expose provider → models (from the DSH LLM runtime)
    // so the settings "供应商定价管理" block can build its provider/model UI.
    ctx.webServer.register({
        kind: 'exact',
        path: '/api/usage-meter/stats',
        handler: async (_req, res) => {
            saveStats();
            const values = Object.values(stats).map((s) => ({ ...s })).sort((a, b) => b.cost - a.cost);
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ ok: true, stats: values }));
        },
    });
    ctx.webServer.register({
        kind: 'exact',
        path: '/api/usage-meter/models',
        handler: async (_req, res) => {
            const send = (status, doc) => {
                res.writeHead(status, { 'content-type': 'application/json' });
                res.end(JSON.stringify(doc));
            };
            try {
                const llm = ctx.llm;
                const providers = [];
                // 包装提供商（modlens-* / *-modlens / vision-toolkit-*）归并到底层提供商：
                // 模型 id 本来就一样，包装只多一个 id。这样设置页只显示一份「同一个提供商」，
                // 用户在该处保存的定价/余额/Key 正好落在底层键上，与运行期查询一致。
                const byBase = new Map();
                for (const p of llm.listProviders()) {
                    let models = [];
                    try {
                        models = (await llm.listModels(p.id)).map((m) => ({ model: m.id, label: m.name }));
                    }
                    catch {
                        models = [];
                    }
                    const base = underlyingProvider(p.id) ?? p.id;
                    const entry = byBase.get(base) ?? { provider: base, label: p.name, models: [] };
                    // 底层提供商自己排在前面时，用它的（无包装）显示名，避免标签带上「(modlens vision)」。
                    if (p.id === base)
                        entry.label = p.name;
                    for (const m of models) {
                        const mid = stripAllWrappers(m.model, activeWrapperMarkers);
                        if (entry.models.some((x) => x.model === mid))
                            continue;
                        entry.models.push({ model: mid, label: m.label });
                    }
                    byBase.set(base, entry);
                }
                providers.push(...byBase.values());
                send(200, { providers });
            }
            catch (err) {
                send(500, { providers: [], error: String(err) });
            }
        },
    });
    console.log('[usage-meter] config route registered at /api/usage-meter/config');
    currentPrices.updatedAt = Date.now();
    ctx.effect(() => {
        // v2.0.16: 下限保护（schema 不动，避免拒载已保存的旧配置）：
        // 0/负数/亚秒级间隔会让 setInterval 退化成事件风暴。
        const ms = Math.max(1000, meter.getConfig().refreshIntervalMs ?? 4 * 60 * 60 * 1000);
        const timer = setInterval(() => meter.maybeRefresh(false), ms);
        return () => clearInterval(timer);
    });
    ctx.on('session/event', (session, event) => {
        activeSessions.add(session);
        // Track whether the active model needs a currency conversion.
        let provider = null;
        let model = null;
        try {
            const v = ctx.sessionProjections.snapshot(session).values['usageCost'];
            provider = v?.provider ?? null;
            model = v?.model ?? null;
            const pc = v?.pricing?.currency;
            rateNeeded = pc !== undefined && pc !== null && pc !== v?.currency;
        }
        catch {
            // keep the last known need on snapshot failure
        }
        // 使用中锁定：轮次开始记录路由，轮次结束清除——设置页据此禁用该模型的
        // 单价/余额编辑（跑 A 时锁 A；改 B 不受影响）。
        if (event.type === 'turn/start') {
            // 锁定的模型用「底层」键（与设置页/弹窗展示的一致，包装路由不会锁不到）。
            const b = provider !== null && model !== null ? modelBinding(provider, model) : null;
            activeModel = b !== null ? { provider: b.real, model: b.model } : (provider !== null && model !== null ? { provider, model } : null);
        }
        else if (event.type === 'turn/end') {
            activeModel = null;
        }
        // rc.7 safe: refresh the in-memory DeepSeek balance on every turn start; the
        // projection `view` reads it directly — nothing is written to the log.
        if (event.type === 'turn/start' && balanceSourceOf(provider, model) === 'deepseek')
            void meter.refreshModelBalance(provider, model);
        if (event.type === 'step/start') {
            stepStartBySession.set(session, { turn: event.data.turn, step: event.data.step, at: event.time });
        }
        if (balanceSourceOf(provider, model) === 'deepseek') {
            // LIVE IN-TURN ESTIMATE (DeepSeek path): each usage sample's delta cost
            // is accrued into `spentSinceAnchor` (CNY — the currency of the API
            // anchor) or into the model's own `modelBalances[safeKey].spent` when a
            // per-model key is set, so the projection's reported balance ticks down
            // between refreshes; the next `turn/start` recalibrates from API truth.
            // In-memory only (rc.7): no persist (module state dies with the process
            // and re-anchors on the next real refresh), no websocket broadcast
            // (the projection re-emits on every event → the client stays live).
            // 复用既有 pipeline：usageEventOf → bucketsOf → 去重(step+桶值) → delta
            // → stepStart 锚定峰/谷 → pricingFor → costOf；唯一差异是分叉到
            // spentSinceAnchor 而非 ledger，且转换目标固定 CNY（锚点币种），
            // 因此不受 UI 显示币种设置影响。
            const ue = usageEventOf(event);
            if (ue !== null) {
                const b = bucketsOf(ue.usage);
                if (!isZeroUsage(b)) {
                    const prev = lastUsageBySession.get(session);
                    const samePrev = prev !== undefined && prev.turn === ue.turn && prev.step === ue.step &&
                        prev.input === b.input && prev.output === b.output &&
                        prev.cacheRead === b.cacheRead && prev.cacheWrite === b.cacheWrite && prev.reasoning === b.reasoning;
                    if (!samePrev) {
                        const p = prev !== undefined && prev.turn === ue.turn && prev.step === ue.step ? prev : undefined;
                        const delta = deltaOf(p, b);
                        lastUsageBySession.set(session, { turn: ue.turn, step: ue.step, ...b });
                        const ss = stepStartBySession.get(session);
                        const requestStart = ss !== undefined && ss.turn === ue.turn && ss.step === ue.step ? ss.at : event.time;
                        const pricing = pricingFor(provider, model, requestStart);
                        if (pricing !== null) {
                            const deltaCost = costOf({ inputTokens: delta.input, outputTokens: delta.output, cacheReadTokens: delta.cacheRead, cacheWriteTokens: delta.cacheWrite }, pricing);
                            const safeKey = modelSafeKey(provider, model);
                            const mbal = isDeepSeekProvider(provider) ? undefined : (safeKey !== null ? modelBalances[safeKey] : undefined);
                            if (mbal !== undefined) {
                                // 独立 key：累计到该模型自己的场内估计（锚点币种取快照币种）。
                                mbal.spent += toCurrency(deltaCost, pricing.currency ?? 'CNY', mbal.snapshot.currency, currentPrices.usdToCny);
                                mbal.liveAt = Date.now();
                            }
                            else if (isDeepSeekProvider(provider)) {
                                // 全局 key：官方模型（deepseek-official）恒累计全局场内估计。
                                spentSinceAnchor += toCurrency(deltaCost, pricing.currency ?? 'CNY', 'CNY', currentPrices.usdToCny);
                                lastLiveAt = Date.now();
                            }
                            else if (safeKey !== null && hasModelApiKeyFor(provider, model)) {
                                // 非官方自定义模型 + 有效 key（自有或提供商共享）+ 余额快照尚未返回：
                                // 先记账到缓冲（不显示，等 refreshModelBalance 返回后一次性灌进
                                // modelBalances[safeKey].spent），避免首轮费用在余额返回前被「不累计」丢失。
                                pendingModelSpent[safeKey] = (pendingModelSpent[safeKey] ?? 0) + toCurrency(deltaCost, pricing.currency ?? 'CNY', 'CNY', currentPrices.usdToCny);
                                // 兜底触发：首轮若 turn/start 时 provider/model 未就绪导致没查询，这里已拿到
                                // 真实 provider/model，主动再拉一次真实余额，让「获取中」尽快变成真实数字。
                                if (!modelBalanceRefreshing.has(safeKey))
                                    void meter.refreshModelBalance(provider, model);
                            }
                        }
                    }
                }
            }
        }
        else {
            // GLOBAL LEDGER: every usage delta (non-DeepSeek) subtracts only the delta.
            const ue = usageEventOf(event);
            if (ue !== null) {
                const b = bucketsOf(ue.usage);
                if (!isZeroUsage(b)) {
                    const prev = lastUsageBySession.get(session);
                    const samePrev = prev !== undefined && prev.turn === ue.turn && prev.step === ue.step &&
                        prev.input === b.input && prev.output === b.output &&
                        prev.cacheRead === b.cacheRead && prev.cacheWrite === b.cacheWrite && prev.reasoning === b.reasoning;
                    if (!samePrev) {
                        const p = prev !== undefined && prev.turn === ue.turn && prev.step === ue.step ? prev : undefined;
                        const delta = deltaOf(p, b);
                        lastUsageBySession.set(session, { turn: ue.turn, step: ue.step, ...b });
                        const ss = stepStartBySession.get(session);
                        const requestStart = ss !== undefined && ss.turn === ue.turn && ss.step === ue.step ? ss.at : event.time;
                        const pricing = pricingFor(provider, model, requestStart);
                        if (pricing !== null) {
                            const key = manualLedgerKeyOf(provider, model);
                            const ledger = ledgerOf(key, getProviderConfig(provider).currency ?? runtimeConfig.currency);
                            if (key !== null && ledger !== null) {
                                const deltaCost = costOf({ inputTokens: delta.input, outputTokens: delta.output, cacheReadTokens: delta.cacheRead, cacheWriteTokens: delta.cacheWrite }, pricing);
                                const costInLedger = toCurrency(deltaCost, pricing.currency ?? 'CNY', ledger.currency, currentPrices.usdToCny);
                                ledger.balance = ledger.balance - costInLedger;
                                persist.schedule();
                                broadcastBalance(key, ledger, 'deduct');
                            }
                        }
                    }
                }
            }
        }
        meter.maybeRefresh(isDeepSeekProvider(provider));
    });
    void meter.maybeRefresh(false);
}
export { BILLING_TYPES, Config, costBreakdown, costOf, usageCostProjection };
/** Test-only hooks: expose the save→apply→display pipeline internals so the
 *  consistency suite can drive the REAL host code (not a copy). Not part of
 *  the plugin contract; never consumed by the harness runtime. */
export const __testInternals = {
    get priceOverrides() {
        return priceOverrides;
    },
    applyPriceOverrides,
    priceRowsOf,
    currentPrices,
    // Live in-turn estimate (DeepSeek path): the anchor snapshot and the accrued
    // offset the projection subtracts from it. Setters exist ONLY so the sim
    // script can mimic API refresh outcomes (success re-anchors; failure keeps).
    get spentSinceAnchor() { return spentSinceAnchor; },
    setSpentSinceAnchor(v) { spentSinceAnchor = v; },
    get lastLiveAt() { return lastLiveAt; },
    setCurrentBalance(s) { currentBalance = s; },
    get currentBalance() { return currentBalance; },
    get balancesMap() { return balances; },
    // 包装路由归一（供 test-wrapper-route.mjs 驱动真实代码路径）。
    modelBinding,
    underlyingProvider,
    balanceSourceOf,
    modelSafeKey,
    wrapperRowList,
    get statsMap() { return stats; },
    get thresholdsMap() { return thresholds; },
    get providerConfigsMap() { return providerConfigs; },
    get balanceSourcesMap() { return balanceSources; },
    get modelApiKeyFlagsMap() { return modelApiKeyFlags; },
};
