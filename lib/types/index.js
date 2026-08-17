/**
 * dsh-usage-meter — backend plugin (function plugin: `apply` + `Config`).
 *
 * Provides:
 *   - `ctx.usageMeter` service (price lookup, spend estimation, balance refresh),
 *   - a `usage-meter` settings namespace (editable from the web plugin list),
 *   - the `usageCost` session projection: per-session requests/tokens/model/pricing/cost,
 *     event-folded and replay-aware, served to the browser with zero client math.
 *
 * Canonical currency is CNY. DeepSeek account balance is fetched from
 * `/user/balance` with the same API key the DeepSeek adapter uses
 * (`DEEPSEEK_API_KEY`); providers without a balance API fall back to a
 * user-set `initialBalance` tracked locally.
 *
 * @module @deepseek-ai/dsh-usage-meter
 */
/// <reference types="node" />
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import z from '@deepseek-ai/schemastery';
import { z as zod } from 'zod';
import { settingsNamespace } from '@deepseek-ai/dsh-settings';
import { BUNDLED_TABLE, currentPrices, fetchRemotePrices, fetchUsdToCny, resolvePricingForTime } from "./prices/index.js";
import { fetchDeepSeekBalance, toSnapshot } from "./balance.js";
import { costBreakdown, costOf } from "./projection.js";
export const Config = z.object({
    currency: z.string().default('CNY'),
    priceSourceUrl: z.string(),
    refreshIntervalMs: z.number().default(4 * 60 * 60 * 1000),
    deepseekApiKey: z.string().role('secret'),
    initialBalance: z.number(),
});
/** Stable Cordis plugin name. */
export const name = 'usage-meter';
/** Required services: settings (config namespace), projection registry, webserver (config route). */
export const inject = ['settings', 'sessionProjections', 'webServer'];
// Ambient runtime facts the (pure, module-level) projection `view` reads.
const runtimeConfig = {
    currency: 'CNY',
    initialBalance: null,
};
/** Latest DeepSeek account-balance snapshot, surfaced through the projection. */
let currentBalance = null;
/**
 * True while the currently-active model needs a CNY↔USD conversion (its
 * official pricing currency differs from the configured display currency).
 * The exchange rate is only fetched/refreshed while this is true.
 */
let rateNeeded = false;
/** Epoch ms of the last successful exchange-rate fetch; 0 = never fetched yet. */
let lastRateFetchedAt = 0;
// ── config persistence ───────────────────────────────────────────────────────
function configPath() {
    return join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'usage-meter.json');
}
const providerConfigs = {};
const balances = {};
/** Per-session last usage sample (turn/step) — used to compute delta deductions. */
const lastUsageBySession = new WeakMap();
/** Per-session request (step) start time, mirroring the fold's `stepStart` for the live ledger path. */
const stepStartBySession = new WeakMap();
/** Binding key for a (provider, model) pair: official → vendor, custom → model. */
function balanceKeyOf(provider, model) {
    if (provider === null || model === null)
        return null;
    if (BUNDLED_TABLE[`${provider}/${model}`] !== undefined)
        return `p:${provider}`;
    return `m:${provider}/${model}`;
}
/** Read (or lazily create) the ledger entry for a key; DeepSeek returns null. */
function ledgerOf(key, defaultCurrency) {
    if (key === null || key.startsWith('p:deepseek'))
        return null;
    let entry = balances[key];
    if (entry === undefined) {
        entry = balances[key] = { balance: 0, currency: defaultCurrency };
    }
    return entry;
}
/** Broadcast a ledger value to every live session (fold re-emits immediately). */
function broadcastBalance(key, entry, kind) {
    for (const session of activeSessions) {
        appendSessionEvent(session, 'usage/balance-ledger', { key, balance: entry.balance, currency: entry.currency, kind });
    }
}
/** Live sessions seen by this plugin — used to push balance updates immediately. */
const activeSessions = new Set();
/**
 * Append a log-only event to a session, retrying on the session's "another
 * append is being published" reentrancy guard (the listeners are synchronous).
 */
function appendSessionEvent(session, type, data, attempt = 0) {
    try {
        ;
        session.append(type, data);
    }
    catch (err) {
        if (attempt < 4 && /reenter|another append|appending/i.test(String(err))) {
            setTimeout(() => appendSessionEvent(session, type, data, attempt + 1), 0);
            return;
        }
        console.warn('[usage-meter] failed to append session event:', err);
    }
}
const priceOverrides = {};
/** Re-apply every override onto the live price table (after load / edit / reset). */
function applyPriceOverrides() {
    for (const [key, override] of Object.entries(priceOverrides)) {
        if (override.prices === undefined)
            continue;
        const base = currentPrices.table.getRaw(key) ?? BUNDLED_TABLE[key];
        // Unknown vendor/model (no bundled base): still merge — the override row
        // IS the pricing (input/output per M are required for a valid row).
        if (base === undefined) {
            const p = override.prices;
            if (typeof p.inputPerM !== 'number' || typeof p.outputPerM !== 'number')
                continue;
            const row = {
                inputPerM: p.inputPerM,
                outputPerM: p.outputPerM,
                ...(p.cacheReadPerM !== undefined ? { cacheReadPerM: p.cacheReadPerM } : {}),
                ...(p.cacheWritePerM !== undefined ? { cacheWritePerM: p.cacheWritePerM } : {}),
                ...(p.combinedPerM !== undefined ? { combinedPerM: p.combinedPerM } : {}),
                ...(p.discount !== undefined ? { discount: p.discount } : {}),
                ...(p.peak !== undefined ? { peak: p.peak } : {}),
                ...(p.offPeak !== undefined ? { offPeak: p.offPeak } : {}),
                ...(p.currency !== undefined ? { currency: p.currency } : {}),
                source: 'user',
            };
            currentPrices.table.merge({ [key]: row });
            continue;
        }
        const row = {
            ...base,
            ...override.prices,
            currency: override.prices.currency ?? base.currency,
            source: 'user',
        };
        currentPrices.table.merge({ [key]: row });
    }
}
/** Derive the default 用量 template from one pricing row (shared by effective + official). */
function rowsFromPricing(base) {
    // COMBINED billing (讯飞/百川): one row covering ALL tokens at one rate.
    if (base.combinedPerM !== undefined) {
        return [{ label: '输入+输出（合并计价）', buckets: ['input', 'cacheRead', 'cacheWrite', 'output'] }];
    }
    const rows = [];
    if (base.cacheReadPerM !== undefined)
        rows.push({ label: '输入（缓存命中）', buckets: ['cacheRead'] });
    rows.push({
        label: '输入（缓存未命中）',
        buckets: base.cacheWritePerM === undefined ? ['input', 'cacheWrite'] : ['input'],
    });
    if (base.cacheWritePerM !== undefined)
        rows.push({ label: '缓存写入', buckets: ['cacheWrite'] });
    rows.push({ label: '输出', buckets: ['output'] });
    return rows;
}
/** Default 用量 template for a model with no bundled/override pricing (unknown vendor/model). */
function defaultUnknownRows() {
    return [
        { label: '输入（缓存未命中）', buckets: ['input', 'cacheWrite'] },
        { label: '输出', buckets: ['output'] },
    ];
}
/** 7 计费方式模板（替代原“厂商模板”下拉，让用户按计费类型选择）。
 *  无法自动计量的部分（Gemini 存储费、阶梯更高档）在 note 中注明。 */
export const BILLING_TYPES = [
    {
        id: 'basic',
        label: '基础计费（输入+输出）',
        rows: [
            { label: '输入', buckets: ['input', 'cacheWrite'] },
            { label: '输出', buckets: ['output'] },
        ],
        mode: 'split',
        note: '输入与输出分开计价（无缓存机制）。',
    },
    {
        id: 'cache-split',
        label: '缓存命中/未命中',
        rows: [
            { label: '输入（缓存命中）', buckets: ['cacheRead'] },
            { label: '输入（缓存未命中）', buckets: ['input', 'cacheWrite'] },
            { label: '输出', buckets: ['output'] },
        ],
        mode: 'split',
        note: '命中按缓存价（约 0.1×输入价），未命中按输入价。',
    },
    {
        id: 'peak-off-peak',
        label: '峰谷分时定价 ⚠️DeepSeek',
        rows: [
            { label: '输入（缓存命中）', buckets: ['cacheRead'] },
            { label: '输入（缓存未命中）', buckets: ['input'] },
            { label: '输出', buckets: ['output'] },
        ],
        mode: 'split',
        peak: true,
        note: '高峰时段（北京时间 9:00-12:00、14:00-18:00）按高峰单价；闲时单价自动 = 高峰 ×0.5（DeepSeek 2026-08-17 起生效）。',
    },
    {
        id: 'cache-write',
        label: '缓存写入+命中',
        rows: [
            { label: '输入（缓存命中）', buckets: ['cacheRead'] },
            { label: '输入（缓存未命中）', buckets: ['input'] },
            { label: '缓存写入', buckets: ['cacheWrite'] },
            { label: '输出', buckets: ['output'] },
        ],
        mode: 'split',
        note: '首次写入约 1.25×输入价、命中约 0.1×输入价（Anthropic 1h 写入为 2×）。',
    },
    {
        id: 'cache-storage',
        label: '上下文缓存存储 ⚠️存储费无法计量',
        rows: [
            { label: '输入（缓存命中）', buckets: ['cacheRead'] },
            { label: '输入（缓存未命中）', buckets: ['input'] },
            { label: '输出', buckets: ['output'] },
        ],
        mode: 'split',
        note: '⚠️ 存储费（存储量×小时）无法自动计量，仅计缓存读价；缓存输入与输出正常计价。',
    },
    {
        id: 'tiered',
        label: '上下文长度分档 ⚠️取基础档',
        rows: [
            { label: '输入', buckets: ['input', 'cacheWrite'] },
            { label: '输出', buckets: ['output'] },
        ],
        mode: 'split',
        note: '⚠️ 取基础档（≤200K 或 ≤32K）；更高档暂按基础档计。',
    },
    {
        id: 'combined',
        label: '输入+输出合并',
        rows: [
            { label: '输入+输出（合并计价）', buckets: ['input', 'cacheRead', 'cacheWrite', 'output'] },
        ],
        mode: 'combined',
        note: '输入+输出按统一单价（讯飞/百川）。',
    },
    {
        id: 'batch',
        label: 'Batch 半价（×0.5）',
        rows: [],
        mode: 'keep',
        discount: 0.5,
        note: '整单费用 ×0.5（Batch 调用；OpenAI/Anthropic/Gemini/Mistral/Qwen）。',
    },
];
/** The 用量 template for one model: user override, else derived from its base pricing,
 *  else the default input/output template (so unknown vendors/models are still
 *  editable in the popup — pick a vendor template or fill prices manually). */
function priceRowsOf(provider, model) {
    if (provider === null || model === null)
        return [];
    const key = `${provider}/${model}`;
    const overridden = priceOverrides[key]?.rows;
    if (overridden !== undefined && overridden.length > 0)
        return overridden;
    const base = currentPrices.table.getRaw(key);
    if (base === undefined)
        return defaultUnknownRows();
    return rowsFromPricing(base);
}
function loadPersistedConfig() {
    try {
        const p = configPath();
        if (!existsSync(p))
            return {};
        const doc = JSON.parse(readFileSync(p, 'utf8'));
        if (doc.providers) {
            for (const [provider, cfg] of Object.entries(doc.providers)) {
                const pc = {};
                if (cfg.currency !== undefined)
                    pc.currency = cfg.currency;
                providerConfigs[provider] = pc;
                // Migrate the legacy manual balance (initialBalance + topUps, CNY) into
                // the global ledger under the vendor binding key.
                const total = (cfg.initialBalance ?? 0) + ((cfg.topUps ?? []).reduce((s, u) => s + u.amount, 0));
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
        const global = {};
        if (doc.priceSourceUrl !== undefined)
            global.priceSourceUrl = doc.priceSourceUrl;
        if (doc.refreshIntervalMs !== undefined)
            global.refreshIntervalMs = doc.refreshIntervalMs;
        if (doc.deepseekApiKey !== undefined)
            global.deepseekApiKey = doc.deepseekApiKey;
        return global;
    }
    catch {
        return {};
    }
}
function savePersistedConfig() {
    try {
        writeFileSync(configPath(), JSON.stringify({ providers: providerConfigs, priceOverrides, balances }, null, 2), 'utf8');
    }
    catch (err) {
        console.warn('[usage-meter] failed to persist config:', err);
    }
}
/** Effective per-provider config; DeepSeek alias maps to canonical, then `*` defaults. */
function getProviderConfig(provider) {
    const key = provider === 'deepseek' ? 'deepseek-official' : provider;
    if (key !== null && providerConfigs[key] !== undefined)
        return providerConfigs[key];
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
/** True when the route is DeepSeek (alias or canonical id). */
function isDeepSeekProvider(provider) {
    return provider === 'deepseek-official' || provider === 'deepseek';
}
function bucketsOf(usage) {
    return {
        input: usage.inputTokens,
        output: usage.outputTokens,
        cacheRead: usage.cacheReadTokens ?? 0,
        cacheWrite: usage.cacheWriteTokens ?? 0,
        reasoning: usage.reasoningTokens ?? 0,
    };
}
function usageEventOf(event) {
    if (event.type === 'assistant/chunk' && event.data.chunk.type === 'usage') {
        return { turn: event.data.turn, step: event.data.step, usage: event.data.chunk.usage };
    }
    if (event.type === 'assistant/message' && event.data.usage !== undefined) {
        return { turn: event.data.turn, step: event.data.step, usage: event.data.usage };
    }
    return null;
}
/**
 * Resolve the pricing for a route at a given time. The fold passes the
 * EVENT's own time so a replayed log reproduces the same per-turn costs
 * (peak/off-peak window chosen at the original event time, not at replay
 * time — restarting the web server no longer shifts the numbers). The view
 * passes no time, i.e. resolves at "now" for the current-rate display.
 */
function pricingFor(provider, model, at) {
    if (provider === null || model === null)
        return null;
    const raw = currentPrices.table.get(provider, model);
    if (raw === undefined)
        return null;
    const resolved = resolvePricingForTime(raw, at ?? Date.now());
    const updatedAt = currentPrices.updatedAt > 0 ? currentPrices.updatedAt : resolved.updatedAt;
    return { ...resolved, ...(updatedAt === undefined ? {} : { updatedAt }) };
}
const peakRatesSchema = zod
    .object({
    inputPerM: zod.number(),
    outputPerM: zod.number(),
    cacheReadPerM: zod.number().optional(),
})
    .strict();
const pricingSchema = zod
    .object({
    inputPerM: zod.number(),
    outputPerM: zod.number(),
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
})
    .strict();
const accountBalanceSchema = zod
    .object({
    currency: zod.string(),
    totalBalance: zod.number(),
    updatedAt: zod.number(),
    source: zod.enum(['api', 'computed']),
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
    provider: zod.string().nullable(),
    model: zod.string().nullable(),
    pricing: pricingSchema.nullable(),
    basePricing: pricingSchema.nullable(),
    priceRows: zod.array(zod
        .object({
        label: zod.string(),
        buckets: zod.array(zod.enum(['input', 'cacheRead', 'cacheWrite', 'output'])),
    })
        .strict()),
    officialPrice: zod
        .object({
        pricing: pricingSchema,
        rows: zod.array(zod
            .object({
            label: zod.string(),
            buckets: zod.array(zod.enum(['input', 'cacheRead', 'cacheWrite', 'output'])),
        })
            .strict()),
    })
        .nullable(),
    estimatedCost: zod.number(),
    currency: zod.string(),
    usdToCny: zod.number(),
    rateUpdatedAt: zod.number(),
    accountBalance: accountBalanceSchema.nullable(),
    turns: zod.array(turnCostSchema),
})
    .strict();
function addToLastTurn(turns, delta, deltaCost, currency) {
    const last = turns[turns.length - 1];
    if (last === undefined)
        return turns;
    const next = [...turns];
    next[next.length - 1] = {
        turn: last.turn,
        cost: last.cost + deltaCost,
        currency,
        model: last.model,
        startedAt: last.startedAt,
        endedAt: last.endedAt,
        endReason: last.endReason,
        input: last.input + delta.input,
        output: last.output + delta.output,
        cacheRead: last.cacheRead + delta.cacheRead,
        cacheWrite: last.cacheWrite + delta.cacheWrite,
        reasoning: last.reasoning + delta.reasoning,
    };
    return next;
}
const usageCostProjection = {
    key: 'usageCost',
    schema: usageCostSchema,
    init() {
        return {
            requestCount: 0,
            stepCount: 0,
            inputTokens: 0,
            outputTokens: 0,
            cacheReadTokens: 0,
            cacheWriteTokens: 0,
            reasoningTokens: 0,
            provider: null,
            model: null,
            stepStart: null,
            anchor: null,
            manualAnchor: null,
            lastCostAt: 0,
            turns: [],
            last: null,
        };
    },
    apply(state, event) {
        let next = state;
        if (event.type === 'request/header') {
            const { provider, model } = event.data.header.config;
            if (provider !== state.provider || model !== state.model) {
                next = { ...next, provider, model };
                // Reflect a mid-turn model switch on the still-open turn bucket so the
                // per-turn row shows the model that actually served the turn.
                const open = next.turns[next.turns.length - 1];
                if (open !== undefined && open.endedAt === 0 && open.model !== model) {
                    const turns = [...next.turns];
                    turns[turns.length - 1] = { ...open, model };
                    next = { ...next, turns };
                }
                // The account balance belongs to the DeepSeek provider: switching to a
                // non-DeepSeek provider drops the API anchor so the manual balance
                // rules (and vice versa: a manual anchor must not leak across vendors).
                if (isDeepSeekProvider(provider) && state.manualAnchor !== null)
                    next = { ...next, manualAnchor: null };
                if (!isDeepSeekProvider(provider) && state.anchor !== null)
                    next = { ...next, anchor: null };
            }
        }
        if (event.type === 'turn/start') {
            const turn = event.data.turn;
            const last = next.turns[next.turns.length - 1];
            if (last === undefined || last.turn !== turn) {
                next = { ...next, turns: [...next.turns, { turn, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, cost: 0, currency: 'CNY', model: state.model, startedAt: event.time, endedAt: 0, endReason: null }] };
            }
        }
        if (event.type === 'turn/end') {
            const last = next.turns[next.turns.length - 1];
            if (last !== undefined && last.turn === event.data.turn && last.endedAt === 0) {
                const turns = [...next.turns];
                turns[turns.length - 1] = { ...last, endedAt: event.time, endReason: String(event.data.reason.kind ?? 'completed') };
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
        if (event.type === 'usage/balance' && isDeepSeekProvider(state.provider)) {
            const bal = event.data.balance;
            if (bal === null) {
                if (state.anchor !== null)
                    next = { ...next, anchor: null };
            }
            else if (state.anchor === null || state.anchor.totalBalance !== bal.totalBalance || state.anchor.fetchedAt !== bal.updatedAt) {
                // New official value: record it as the anchor, with the cost total at
                // this log position as the baseline the live balance subtracts from.
                const costTotal = state.turns.reduce((sum, t) => sum + t.cost, 0);
                next = { ...next, anchor: { currency: bal.currency, totalBalance: bal.totalBalance, fetchedAt: bal.updatedAt, costBaseline: costTotal } };
            }
        }
        if (event.type === 'usage/balance-ledger' && !isDeepSeekProvider(state.provider)) {
            const lb = event.data;
            const key = balanceKeyOf(state.provider, state.model);
            if (key !== null && lb.key === key) {
                if (state.manualAnchor === null || state.manualAnchor.totalBalance !== lb.balance || state.manualAnchor.currency !== lb.currency) {
                    next = { ...next, manualAnchor: { currency: lb.currency, totalBalance: lb.balance, at: event.time, kind: lb.kind } };
                }
            }
        }
        const ue = usageEventOf(event);
        if (ue !== null) {
            const prev = state.last !== null && state.last.turn === ue.turn && state.last.step === ue.step ? state.last : null;
            const b = bucketsOf(ue.usage);
            const samePrev = prev !== null &&
                prev.input === b.input &&
                prev.output === b.output &&
                prev.cacheRead === b.cacheRead &&
                prev.cacheWrite === b.cacheWrite &&
                prev.reasoning === b.reasoning;
            if (!samePrev) {
                const delta = {
                    input: b.input - (prev?.input ?? 0),
                    output: b.output - (prev?.output ?? 0),
                    cacheRead: b.cacheRead - (prev?.cacheRead ?? 0),
                    cacheWrite: b.cacheWrite - (prev?.cacheWrite ?? 0),
                    reasoning: b.reasoning - (prev?.reasoning ?? 0),
                };
                // DeepSeek bills an entire API request at the peak/off-peak rate that
                // was active when the request STARTED (跨时段按请求发起时间计费): a
                // request starting 17:58 stays peak-priced even when it ends 18:08,
                // and one starting 07:59 stays off-peak past 08:00. `stepStart` was
                // recorded from `step/start` (= one model call = one API request); a
                // fallback to the turn start keeps replay of logs without `step/start`
                // deterministic.
                const requestStart = state.stepStart !== null && state.stepStart.turn === ue.turn && state.stepStart.step === ue.step
                    ? state.stepStart.at
                    : (state.turns[state.turns.length - 1]?.startedAt ?? event.time);
                const pricing = pricingFor(state.provider, state.model, requestStart);
                const deltaCost = pricing === null
                    ? 0
                    : costOf({ inputTokens: delta.input, outputTokens: delta.output, cacheReadTokens: delta.cacheRead, cacheWriteTokens: delta.cacheWrite }, pricing);
                next = {
                    ...next,
                    inputTokens: state.inputTokens + delta.input,
                    outputTokens: state.outputTokens + delta.output,
                    cacheReadTokens: state.cacheReadTokens + delta.cacheRead,
                    cacheWriteTokens: state.cacheWriteTokens + delta.cacheWrite,
                    reasoningTokens: state.reasoningTokens + delta.reasoning,
                    lastCostAt: event.time,
                    turns: addToLastTurn(next.turns, delta, deltaCost, pricing?.currency ?? 'CNY'),
                    last: { turn: ue.turn, step: ue.step, ...b },
                };
            }
        }
        return next === state ? state : next;
    },
    view(state) {
        const pricing = pricingFor(state.provider, state.model);
        const estimatedCost = state.turns.reduce((sum, t) => sum + t.cost, 0);
        const pc = getProviderConfig(state.provider);
        const turns = state.turns.map((t) => ({
            turn: t.turn,
            cost: t.cost,
            currency: t.currency,
            model: t.model,
            startedAt: t.startedAt,
            endedAt: t.endedAt,
            endReason: t.endReason,
            inputTokens: t.input,
            outputTokens: t.output,
            cacheReadTokens: t.cacheRead,
            cacheWriteTokens: t.cacheWrite,
            reasoningTokens: t.reasoning,
        }));
        // Live balance, displayed identically for every provider:
        //   DeepSeek:   API anchor − (cost since anchor), source api→computed.
        //   others:     the GLOBAL ledger value for this binding key (already
        //               delta-decremented server-side; default 0, negative when
        //               spending without a funded balance). Broadcast events keep
        //               every concurrent session showing the same number.
        let accountBalance = null;
        if (isDeepSeekProvider(state.provider)) {
            if (state.anchor !== null) {
                const delta = estimatedCost - state.anchor.costBaseline;
                if (delta <= 0) {
                    accountBalance = { currency: state.anchor.currency, totalBalance: state.anchor.totalBalance, updatedAt: state.anchor.fetchedAt, source: 'api' };
                }
                else {
                    accountBalance = { currency: state.anchor.currency, totalBalance: Math.max(state.anchor.totalBalance - delta, 0), updatedAt: state.lastCostAt, source: 'computed' };
                }
            }
        }
        else {
            const key = balanceKeyOf(state.provider, state.model);
            const ledger = key !== null ? balances[key] : undefined;
            const manual = state.manualAnchor ?? (ledger !== undefined
                ? { currency: ledger.currency, totalBalance: ledger.balance, at: 0, kind: 'manual' }
                : null);
            if (manual !== null) {
                accountBalance = {
                    currency: manual.currency,
                    totalBalance: manual.totalBalance,
                    updatedAt: state.lastCostAt > manual.at ? state.lastCostAt : manual.at,
                    source: state.lastCostAt > manual.at ? 'computed' : (manual.kind === 'manual' ? 'api' : 'computed'),
                };
            }
        }
        // The OFFICIAL bundled pricing + row template for the current model — the
        // popup's 重置 button refills the editor inputs from these.
        const officialKey = state.provider !== null && state.model !== null ? `${state.provider}/${state.model}` : null;
        const officialRow = officialKey !== null ? BUNDLED_TABLE[officialKey] : undefined;
        const officialPrice = officialRow === undefined
            ? null
            : { pricing: officialRow, rows: rowsFromPricing(officialRow) };
        return {
            requestCount: state.requestCount,
            stepCount: state.stepCount,
            inputTokens: state.inputTokens,
            outputTokens: state.outputTokens,
            cacheReadTokens: state.cacheReadTokens,
            cacheWriteTokens: state.cacheWriteTokens,
            reasoningTokens: state.reasoningTokens,
            provider: state.provider,
            model: state.model,
            pricing,
            basePricing: currentPrices.table.get(state.provider ?? '', state.model ?? '') ?? null,
            priceRows: priceRowsOf(state.provider, state.model),
            officialPrice,
            estimatedCost,
            currency: pc.currency ?? runtimeConfig.currency,
            usdToCny: currentPrices.usdToCny,
            rateUpdatedAt: lastRateFetchedAt,
            accountBalance,
            turns,
        };
    },
    stateVersion: 15,
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
        runtimeConfig.currency = cfg.currency ?? 'CNY';
        runtimeConfig.initialBalance = cfg.initialBalance !== undefined && cfg.initialBalance > 0 ? cfg.initialBalance : null;
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
    maybeRefresh() {
        const ms = this.cfg.refreshIntervalMs ?? 4 * 60 * 60 * 1000;
        const now = Date.now();
        // Only refresh the exchange rate while a currency conversion is actually
        // in use (the current model's official pricing currency differs from the
        // display currency); otherwise the cached rate is fine and we skip the
        // periodic fetch entirely.
        if (rateNeeded && now - this.lastRateRefresh >= ms) {
            this.lastRateRefresh = now;
            void this.refreshRate();
        }
        if (now - currentPrices.updatedAt >= ms)
            void this.refreshPrices();
        if (currentBalance === null || now - currentBalance.fetchedAt >= ms)
            void this.refreshBalance();
    }
    async refreshRate() {
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
        const envKey = globalThis.process?.env?.DEEPSEEK_API_KEY;
        const apiKey = this.cfg.deepseekApiKey ?? envKey;
        if (!apiKey) {
            currentBalance = null;
            return;
        }
        if (this.balanceRefreshing)
            return this.balanceRefreshing;
        this.balanceRefreshing = (async () => {
            try {
                const raw = await fetchDeepSeekBalance(apiKey);
                currentBalance = toSnapshot(raw);
            }
            catch (err) {
                console.warn(`[usage-meter] balance refresh failed: ${String(err)}`);
            }
            finally {
                this.balanceRefreshing = null;
            }
        })();
        return this.balanceRefreshing;
    }
}
/** Plugin entry: provide the service, register settings + the projection. */
export function apply(ctx, config = {}) {
    // Persisted popup config overrides the composition defaults.
    const effectiveConfig = { ...config, ...loadPersistedConfig() };
    const meter = new UsageMeterCore(effectiveConfig);
    meter.applyConfig(effectiveConfig);
    // Register settings + the projection directly on THIS plugin's fiber. Both
    // services are declared in `inject`, so they are available here — no child
    // fiber (which would be disposed and drop the namespace).
    const scope = ctx.settings.register(settingsNamespace('usage-meter'), Config, { base: config });
    meter.applyConfig(scope.get());
    scope.watch((next) => meter.applyConfig(next));
    ctx.sessionProjections.register(usageCostProjection);
    // 计费方式模板（7 种类型）for the popup dropdown：按计费类型选择，而非厂商。
    // 每种模板给出行结构 + 计算方式（split/combined/discount）+ 无法计量的注明。
    ctx.webServer.register({
        kind: 'exact',
        path: '/api/usage-meter/templates',
        handler: async (_req, res) => {
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ ok: true, types: BILLING_TYPES }));
        },
    });
    // Force a fresh USD→CNY exchange-rate fetch on demand (popup currency switch
    // to a currency other than the model's pricing currency) and return it so the
    // popup can display 汇率 + 更新时间 immediately.
    ctx.webServer.register({
        kind: 'exact',
        path: '/api/usage-meter/refresh-rate',
        handler: async (_req, res) => {
            await meter.refreshRate();
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ ok: true, usdToCny: currentPrices.usdToCny, rateUpdatedAt: lastRateFetchedAt }));
        },
    });
    // Config channel: a small HTTP endpoint so the browser popup can save config.
    ctx.webServer.register({
        kind: 'exact',
        path: '/api/usage-meter/config',
        handler: async (req, res) => {
            if (req.method === 'GET') {
                const cfg = meter.getConfig();
                // Redact the secret before sending it to the browser.
                const safe = { ...cfg, deepseekApiKey: cfg.deepseekApiKey ? '***' : undefined };
                res.writeHead(200, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ ok: true, config: safe, providers: providerConfigs, priceOverrides, balances }));
                return;
            }
            if (req.method === 'POST') {
                let body = '';
                for await (const chunk of req)
                    body += String(chunk);
                const patch = JSON.parse(body);
                // Global fields (legacy path; never drop the key).
                const merged = { ...meter.getConfig() };
                if (patch.priceSourceUrl !== undefined)
                    merged.priceSourceUrl = patch.priceSourceUrl;
                if (patch.refreshIntervalMs !== undefined)
                    merged.refreshIntervalMs = patch.refreshIntervalMs;
                if (patch.deepseekApiKey !== undefined && patch.deepseekApiKey !== '***')
                    merged.deepseekApiKey = patch.deepseekApiKey;
                meter.applyConfig(merged);
                // Per-provider display currency + GLOBAL LEDGER edits (non-DeepSeek):
                //   balance   → overwrite the ledger value (账户余额编辑)
                //   recharge  → add to the ledger (positive adds, negative subtracts)
                //   currency  → switch the ledger currency (value converted by the client)
                let currencyChanged = false;
                let ledgerChanged = false;
                let ledgerKey = null;
                let ledgerEntry = null;
                if (patch.provider !== undefined && patch.provider !== null) {
                    const pc = providerConfigs[patch.provider] ?? (providerConfigs[patch.provider] = {});
                    if (patch.currency !== undefined && patch.currency !== pc.currency) {
                        pc.currency = patch.currency;
                        currencyChanged = true;
                    }
                    if (!isDeepSeekProvider(patch.provider)) {
                        ledgerKey = balanceKeyOf(patch.provider, patch.model ?? null);
                        ledgerEntry = ledgerOf(ledgerKey, pc.currency ?? runtimeConfig.currency);
                        if (ledgerKey !== null && ledgerEntry !== null) {
                            if (patch.balance !== undefined && Number.isFinite(patch.balance)) {
                                // 账户余额编辑：直接覆盖（客户端已按显示币种换算好）。
                                ledgerEntry.balance = patch.balance;
                                ledgerChanged = true;
                            }
                            if (patch.recharge !== undefined && Number.isFinite(patch.recharge) && patch.recharge !== 0) {
                                // 充值：正加负减。
                                ledgerEntry.balance = ledgerEntry.balance + patch.recharge;
                                ledgerChanged = true;
                            }
                            if (patch.currency !== undefined && patch.currency !== ledgerEntry.currency) {
                                if (patch.balance === undefined) {
                                    // 未随附 balance 的纯币种切换：用（尽量新鲜的）汇率换算存量值。
                                    if (lastRateFetchedAt === 0)
                                        await meter.refreshRate();
                                    const newCurrency = patch.currency;
                                    ledgerEntry.balance = toCurrency(ledgerEntry.balance, ledgerEntry.currency, newCurrency, currentPrices.usdToCny);
                                }
                                ledgerEntry.currency = patch.currency;
                                ledgerChanged = true;
                            }
                        }
                    }
                    savePersistedConfig();
                }
                // Switching the display currency: fetch a fresh official rate RIGHT
                // NOW (the very first thing after the switch), before any next
                // turn computes a conversion. The 4h cadence is enforced by
                // maybeRefresh() on subsequent turn starts.
                if (currencyChanged) {
                    rateNeeded = true;
                    void meter.refreshRate();
                }
                // Ledger change → push to every live session so the popup balance
                // updates IMMEDIATELY (no page refresh needed).
                if (ledgerChanged && ledgerKey !== null && ledgerEntry !== null) {
                    broadcastBalance(ledgerKey, ledgerEntry, 'manual');
                }
                // Per-model price overrides (popup editor): {provider, model, prices?,
                // rows?} saves the user's edits; {provider, model, reset:true} restores
                // the official bundled defaults.
                if (patch.model !== undefined && patch.model !== null && patch.provider !== undefined && patch.provider !== null) {
                    const key = `${patch.provider}/${patch.model}`;
                    const override = patch;
                    if (override.reset === true) {
                        delete priceOverrides[key];
                        // Restore the pristine bundled row (delete rows that only existed
                        // through an override).
                        if (BUNDLED_TABLE[key] !== undefined) {
                            currentPrices.table.merge({ [key]: BUNDLED_TABLE[key] });
                        }
                        else {
                            currentPrices.table.removeRaw(key);
                        }
                    }
                    else {
                        const next = { ...priceOverrides[key] };
                        if (override.prices !== undefined)
                            next.prices = { ...override.prices };
                        if (override.rows !== undefined)
                            next.rows = [...override.rows];
                        priceOverrides[key] = next;
                        applyPriceOverrides();
                    }
                    savePersistedConfig();
                }
                res.writeHead(200, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ ok: true }));
                return;
            }
            res.writeHead(405);
            res.end();
        },
    });
    console.log('[usage-meter] config route registered at /api/usage-meter/config');
    currentPrices.updatedAt = Date.now();
    ctx.effect(() => {
        const ms = meter.getConfig().refreshIntervalMs ?? 4 * 60 * 60 * 1000;
        const timer = setInterval(() => meter.maybeRefresh(), ms);
        return () => clearInterval(timer);
    });
    ctx.on('session/event', (session, event) => {
        activeSessions.add(session);
        // Track whether the active model needs a currency conversion (official
        // pricing currency ≠ display currency) — the 4h exchange-rate refresh
        // runs only while this is true.
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
        if (event.type === 'turn/start') {
            void meter.refreshBalance().then(() => {
                const b = meter.getBalance();
                appendSessionEvent(session, 'usage/balance', { balance: b === null ? null : { currency: b.currency, totalBalance: b.totalBalance, updatedAt: b.fetchedAt, source: 'api' } });
            });
        }
        if (event.type === 'step/start') {
            stepStartBySession.set(session, { turn: event.data.turn, step: event.data.step, at: event.time });
        }
        // GLOBAL LEDGER: every usage delta (non-DeepSeek) reads the latest global
        // balance for this binding key, subtracts ONLY the delta, writes back and
        // broadcasts — concurrent sessions always deduct from the newest value.
        if (!isDeepSeekProvider(provider)) {
            const ue = usageEventOf(event);
            if (ue !== null) {
                const b = bucketsOf(ue.usage);
                const prev = lastUsageBySession.get(session);
                const samePrev = prev !== undefined && prev.turn === ue.turn && prev.step === ue.step
                    && prev.input === b.input && prev.output === b.output
                    && prev.cacheRead === b.cacheRead && prev.cacheWrite === b.cacheWrite && prev.reasoning === b.reasoning;
                if (!samePrev) {
                    const p = prev !== undefined && prev.turn === ue.turn && prev.step === ue.step ? prev : undefined;
                    const delta = {
                        input: b.input - (p?.input ?? 0),
                        output: b.output - (p?.output ?? 0),
                        cacheRead: b.cacheRead - (p?.cacheRead ?? 0),
                        cacheWrite: b.cacheWrite - (p?.cacheWrite ?? 0),
                        reasoning: b.reasoning - (p?.reasoning ?? 0),
                    };
                    lastUsageBySession.set(session, { turn: ue.turn, step: ue.step, ...b });
                    const ss = stepStartBySession.get(session);
                    const requestStart = ss !== undefined && ss.turn === ue.turn && ss.step === ue.step ? ss.at : event.time;
                    const pricing = pricingFor(provider, model, requestStart);
                    if (pricing !== null) {
                        const key = balanceKeyOf(provider, model);
                        const ledger = ledgerOf(key, getProviderConfig(provider).currency ?? runtimeConfig.currency);
                        if (key !== null && ledger !== null) {
                            const deltaCost = costOf({ inputTokens: delta.input, outputTokens: delta.output, cacheReadTokens: delta.cacheRead, cacheWriteTokens: delta.cacheWrite }, pricing);
                            const costInLedger = toCurrency(deltaCost, pricing.currency ?? 'CNY', ledger.currency, currentPrices.usdToCny);
                            ledger.balance = ledger.balance - costInLedger;
                            savePersistedConfig();
                            broadcastBalance(key, ledger, 'deduct');
                        }
                    }
                }
            }
        }
        meter.maybeRefresh();
    });
    void meter.maybeRefresh();
}
export { usageCostProjection, costBreakdown, costOf };
//# sourceMappingURL=index.js.map