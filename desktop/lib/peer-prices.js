/**
 * 扫描本机*其它*计费插件已经存好的模型定价，供设置页「从其它插件获取定价」使用。
 *
 * 设计要点：
 *   - 只读：绝不修改别人的配置文件，也绝不猜数字——读不出来就是读不出来。
 *   - 每类插件一个 reader（`PEER_READERS`），新增一家只加一条，不改调用方。
 *   - 输出统一成 usage-meter 的 `ModelPricing` 口径（每百万 token 的
 *     inputPerM / outputPerM / cacheReadPerM + peak/offPeak），币种随行携带，
 *     由前端决定是否换算。
 *
 * 当前已支持：
 *   - dsh-cost-meter（`$DSH_HOME/storages/cost-meter/ledger.json`）
 *       · `config.prices.custom`   → 按渠道覆盖价（键 `provider:model`，优先级最高）
 *       · `config.prices.providers[provider].models[model]` → 按厂商价格
 *       · `config.prices.models[model]` → 全局价格表（无 provider，标为 `*`）
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
/** 数字兜底：只接受有限正数（含 0），其余一律当「没有」。 */
function num(v) {
    return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
}
/**
 * cost-meter 有**两套**字段命名，必须都认（2026-11-02 实测 835 条里 314 条曾漏读）：
 *   · DeepSeek 全局表那套：`cacheMiss`(输入) / `cacheHit`(缓存读) / `cacheWrite` / `output`
 *   · 厂商价格表那套：  `input`(输入) / `cachedInput`(缓存读) / `cacheWrite` / `output`
 * 另外：
 *   · 只有 `input`/`output`（OpenAI Pro 系列官网没给缓存价）→ cacheRead 记 0，不编造。
 *   · 带 `cny` 子对象（moonshot 同时给 USD 与 CNY 报价）→ 优先取 `cny`，
 *     并把 currency 标成 CNY，否则按外层（USD）算。
 * 任一项缺失即返回 null——宁可少一行，不编造半张价格表。
 */
function tripleOf(o, preferCny = false) {
    if (o === null || typeof o !== 'object')
        return null;
    let r = o;
    const cny = r.cny;
    if (preferCny && cny !== null && typeof cny === 'object')
        r = cny;
    // 输入价：两套命名都试。
    const input = num(r.cacheMiss) ?? num(r.input);
    const output = num(r.output);
    if (input === null || output === null)
        return null;
    const cacheRead = num(r.cacheHit) ?? num(r.cachedInput);
    return { inputPerM: input, outputPerM: output, cacheReadPerM: cacheRead ?? 0 };
}
/** 该条目的币种：带 `cny` 子对象就是 CNY，否则用外层 `currency` 或全局默认。 */
function currencyOf(raw, fallback) {
    if (raw !== null && typeof raw === 'object') {
        const o = raw;
        if (o.cny !== null && typeof o.cny === 'object')
            return 'CNY';
        if (typeof o.currency === 'string' && o.currency !== '')
            return o.currency;
    }
    return fallback;
}
/** dsh-cost-meter：从 ledger.json 的 config.prices 里抽出所有带明确价格的模型。 */
function readCostMeter(root, hint) {
    const file = join(root, 'storages', 'cost-meter', 'ledger.json');
    if (!existsSync(file))
        return [];
    let doc;
    try {
        doc = JSON.parse(readFileSync(file, 'utf8'));
    }
    catch {
        return [];
    }
    const cfg = doc.config;
    if (cfg === null || typeof cfg !== 'object')
        return [];
    const prices = cfg.prices;
    if (prices === null || typeof prices !== 'object')
        return [];
    const p = prices;
    const defaultCurrency = typeof cfg.pricingCurrency === 'string'
        ? String(cfg.pricingCurrency)
        : 'CNY';
    const mtime = (() => {
        try {
            return statSync(file).mtimeMs;
        }
        catch {
            return 0;
        }
    })();
    const rows = [];
    // 峰谷窗口：cost-meter 存的是 **UTC 小时**（`config.peakWindows = [{start:1,end:4},{start:6,end:10}]`），
    // usage-meter 要的是**北京时间的分钟数**（内置表是 [{540,720},{840,1080}]）。
    // 不换算直接搬 = 高峰时段整体错 8 小时，导入后金额就是错的。这里统一换。
    const peakWindows = (() => {
        const raw = cfg.peakWindows;
        if (!Array.isArray(raw))
            return null;
        const out = [];
        for (const w of raw) {
            if (w === null || typeof w !== 'object')
                continue;
            const s = w.start;
            const e = w.end;
            if (typeof s !== 'number' || typeof e !== 'number')
                continue;
            if (!Number.isFinite(s) || !Number.isFinite(e))
                continue;
            const start = (((Math.round(s) + 8) % 24) + 24) % 24 * 60;
            const rawEnd = (((Math.round(e) + 8) % 24) + 24) % 24 * 60;
            // 跨零点（如 UTC 20→24 = 北京 04→08 不跨；UTC 22→02 = 北京 06→10 也不跨，
            // 但 UTC 1→25 这种会落到 0）——终点不大于起点时按「到 24:00」处理。
            const end = rawEnd <= start ? 1440 : rawEnd;
            out.push({ start, end });
        }
        return out.length > 0 ? out : null;
    })();
    const push = (provider, model, raw, origin) => {
        const base = tripleOf(raw, true);
        if (base === null || model === '')
            return;
        const o = raw;
        const offPeak = tripleOf(o.offPeak, true) ?? base;
        const peakRaw = tripleOf(o.peak, true);
        // ★ 峰谷只在**价格真有差别**时才算数。
        //   来源插件里 `peak` 字段可能整份照抄谷价（实测 Kimi-K3：峰 20/2/100、谷 20/2/100，
        //   三项完全相等），此时它并不是峰谷定价。照搬会让界面挂上「含峰谷」徽章、
        //   导入后还替用户打开峰谷开关，而峰谷算出来的钱一分不差 —— 纯噪音。
        //   另外 cost-meter 的 peakWindows 是**整份配置级**的（有任一模型配了峰谷就有值），
        //   套到每一行会让没配峰谷的模型也显示「含峰谷」，所以窗口也一并按行判空。
        const peak = peakRaw !== null &&
            (peakRaw.inputPerM !== offPeak.inputPerM ||
                peakRaw.outputPerM !== offPeak.outputPerM ||
                peakRaw.cacheReadPerM !== offPeak.cacheReadPerM)
            ? peakRaw
            : null;
        const windows = peak !== null ? peakWindows : null;
        rows.push({
            plugin: 'dsh-cost-meter',
            pluginLabel: 'dsh-cost-meter',
            provider: provider === '' ? '*' : provider,
            model,
            inputPerM: offPeak.inputPerM,
            outputPerM: offPeak.outputPerM,
            cacheReadPerM: offPeak.cacheReadPerM,
            offPeak,
            peak,
            currency: currencyOf(raw, hint?.(provider, model, base) ?? defaultCurrency),
            origin,
            peakWindows: windows,
            // cost-meter 没有「生效星期」这一项（只有 peakHolidays 节假日表），不编造。
            peakDays: null,
            updatedAt: mtime,
        });
    };
    // ① 按渠道覆盖（键 `provider:model`）——用户手填的那份，优先级最高。
    const custom = p.custom;
    if (custom !== null && typeof custom === 'object') {
        for (const [k, v] of Object.entries(custom)) {
            const i = k.indexOf(':');
            if (i <= 0)
                continue;
            push(k.slice(0, i), k.slice(i + 1), v, '自定义');
        }
    }
    // ② 按厂商价格表。
    const providers = p.providers;
    if (providers !== null && typeof providers === 'object') {
        for (const [prov, pv] of Object.entries(providers)) {
            const models = pv.models;
            if (models === null || typeof models !== 'object')
                continue;
            for (const [model, v] of Object.entries(models))
                push(prov, model, v, '厂商价');
        }
    }
    // ③ 全局价格表（无渠道）——用 `*` 标记，前端要求用户先选渠道再取。
    const global = p.models;
    if (global !== null && typeof global === 'object') {
        for (const [model, v] of Object.entries(global))
            push('*', model, v, '价格表');
    }
    return rows;
}
/** 内置价格表里同名 **或同价** → 用它的币种。
 *
 *  cost-meter 的 `prices.currency` 只是个**全局**标注，它的厂商价格表里
 *  openai / anthropic 那一批存的是**美元原值**（与官方 USD 报价逐位相同），
 *  却被这个全局标注统成 CNY。直接照抄会让 ¥ 与 $ 差 7 倍。
 *
 *  判据两条，按可靠度排序：
 *    ① 同名（`provider/model` 或裸模型名）→ 用内置表那条的币种，最准；
 *    ② 同价（输入/输出/缓存读三项全等）→ 用命中那条的币种；
 *  都对不上就不猜（返回 null，沿用来源自己的标注）。
 */
export function makeBundledHint(table) {
    const byShape = new Map();
    const byBare = new Map();
    for (const [k, row] of Object.entries(table)) {
        const cur = typeof row.currency === 'string' && row.currency !== '' ? row.currency : null;
        if (cur === null)
            continue;
        const sig = `${row.inputPerM}|${row.outputPerM}|${row.cacheReadPerM ?? 0}`;
        if (!byShape.has(sig))
            byShape.set(sig, cur);
        const bare = k.includes('/') ? k.slice(k.indexOf('/') + 1) : k;
        if (!byBare.has(bare))
            byBare.set(bare, cur);
    }
    return (provider, model, triple) => {
        const direct = table[`${provider}/${model}`];
        if (direct !== undefined && typeof direct.currency === 'string' && direct.currency !== '')
            return direct.currency;
        const bare = model.includes('/') ? model.slice(model.indexOf('/') + 1) : model;
        const named = byBare.get(bare);
        if (named !== undefined)
            return named;
        const shaped = byShape.get(`${triple.inputPerM}|${triple.outputPerM}|${triple.cacheReadPerM}`);
        return shaped ?? null;
    };
}
/** 已支持的其它计费插件。新增一家 = 加一条。 */
const PEER_READERS = [
    { id: 'dsh-cost-meter', read: readCostMeter },
];
/**
 * 扫描本机所有已支持的计费插件，返回去重后的定价行。
 * 同一 (plugin, provider, model) 只保留第一条——`custom` 在前，所以自定义价压过价格表。
 *
 * `hint` 用来纠正来源插件自己标错的币种（见 `makeBundledHint`）。
 */
export function scanPeerPrices(dshHome, hint) {
    const rows = [];
    const scanned = [];
    const seen = new Set();
    for (const r of PEER_READERS) {
        let got = [];
        try {
            got = r.read(dshHome, hint);
        }
        catch {
            got = [];
        }
        if (got.length === 0)
            continue;
        scanned.push(r.id);
        for (const row of got) {
            const key = `${row.plugin}|${row.provider}|${row.model}`;
            if (seen.has(key))
                continue;
            seen.add(key);
            rows.push(row);
        }
    }
    rows.sort((a, b) => (a.plugin === b.plugin ? (a.provider === b.provider ? a.model.localeCompare(b.model) : a.provider.localeCompare(b.provider)) : a.plugin.localeCompare(b.plugin)));
    return { rows, scanned };
}
