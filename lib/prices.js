/**
 * Price resolution: a bundled multi-vendor table plus an optional remote
 * source and user overrides.
 *
 * DSH ships no pricing vocabulary (`dsh-llm` resolves context/capacity, not
 * money), so "the latest price" must come from outside the harness. This
 * module layers the sources (highest wins):
 *
 *   1. user override (`priceOverrides`, edited in the price editor),
 *   2. remote table (LiteLLM `model_prices_and_context_window.json`),
 *   3. bundled fallback (`BUNDLED_TABLE` in `./prices-providers.ts`).
 *
 * It also owns the CNY/USD exchange rate and peak/off-peak resolution for
 * DeepSeek's time-of-day billing.
 *
 * @module dsh-usage-meter-harness/prices
 */
import { BUNDLED_TABLE } from "./prices-providers.js";
/** Map remote-source provider keys onto the harness's provider route ids. */
const PROVIDER_ALIASES = {
    deepseek: 'deepseek-official',
    dashscope: 'qwen',
    zai: 'zhipu',
    'vertex_ai-language-models': 'gemini',
    volcengine: 'doubao',
    tencent: 'hunyuan',
    xfyun: 'iflytek',
};
/** DeepSeek domestic peak hours (UTC 1-4 & 6-10 = Beijing 9-12 & 14-18). */
export function isPeakHour(utcHour) {
    return (utcHour >= 1 && utcHour < 4) || (utcHour >= 6 && utcHour < 10);
}
/** Resolve one pricing row to the rate active at `now` (peak/off-peak when applicable).
 *
 * Weekday-aware (BEIJING day & hour): if the current BEIJING weekday is in
 * `pricing.peakDays`, the peak/off-peak windows (BEIJING hours) apply; a day
 * NOT in `peakDays` (e.g. Sat/Sun) is billed flat with `weekend ?? offPeak`.
 */
export function resolvePricingForTime(pricing, now) {
    const hasLegacyPeak = pricing.peak !== undefined && pricing.offPeak !== undefined;
    const hasRowPeak = (pricing.customRows ?? []).some((r) => r.peakPerM !== undefined || r.offPerM !== undefined);
    if (!hasLegacyPeak && !hasRowPeak)
        return pricing;
    if (pricing.peakOffPeakFrom !== undefined && now < pricing.peakOffPeakFrom)
        return pricing;
    const beijing = new Date(now + 8 * 3600 * 1000);
    const bjDay = beijing.getUTCDay();
    const bjMin = beijing.getUTCHours() * 60 + beijing.getUTCMinutes(); // Beijing minutes since midnight
    const days = pricing.peakDays ?? [0, 1, 2, 3, 4, 5, 6];
    // Windows are in Beijing MINUTES since midnight (e.g. 9:00-12:00 = [540,720) ).
    const windows = pricing.peakWindows ?? [{ start: 540, end: 720 }, { start: 840, end: 1080 }];
    // 跨零点环绕窗口（如 22:00–02:00）：前半段（≥start）归属今天，
    // 后半段（<end）归属昨天——两段各自检查"所属日"是否勾选了峰谷。
    const inPeak = windows.some((w) => {
        if (w.start < w.end)
            return days.includes(bjDay) && bjMin >= w.start && bjMin < w.end;
        if (bjMin >= w.start)
            return days.includes(bjDay);
        if (bjMin < w.end)
            return days.includes((bjDay + 6) % 7);
        return false;
    });
    let out = pricing;
    if (hasLegacyPeak) {
        const active = inPeak ? pricing.peak : (days.includes(bjDay) ? pricing.offPeak : (pricing.weekend ?? pricing.offPeak));
        out = {
            ...out,
            inputPerM: active.inputPerM,
            outputPerM: active.outputPerM,
            ...(active.cacheReadPerM !== undefined ? { cacheReadPerM: active.cacheReadPerM } : {}),
        };
    }
    // Custom rows: resolve each row's effective per-1M rate for this instant
    // (peak window → peakPerM/perM; otherwise → offPerM/perM; days not in
    // `peakDays` are off-peak, i.e. "未勾选星期 = 谷价").
    if (hasRowPeak && pricing.customRows !== undefined && pricing.customRows.length > 0) {
        out = {
            ...out,
            customRows: pricing.customRows.map((r) => ({
                ...r,
                perM: inPeak ? (r.peakPerM ?? r.perM) : (r.offPerM ?? r.perM),
            })),
        };
    }
    return out;
}
/**
 * A sparse price table keyed by `provider/model`. Lookup tries the exact key,
 * then a `*` wildcard for the provider, then returns undefined.
 */
export class PriceTable {
    rows;
    constructor(rows = {}) {
        this.rows = new Map(Object.entries(rows));
    }
    get(provider, model) {
        return this.rows.get(`${provider}/${model}`) ?? this.rows.get(`${provider}/*`);
    }
    /** Exact-key lookup only (no wildcard) — used for user overrides/reset. */
    getRaw(key) {
        return this.rows.get(key);
    }
    /** Remove one exact row (reset of a user-overridden row with no bundled base). */
    removeRaw(key) {
        this.rows.delete(key);
    }
    /** Merge a full set of rows (remote refresh / user override), keeping others. */
    merge(rows) {
        for (const [key, value] of Object.entries(rows))
            this.rows.set(key, value);
    }
    get size() {
        return this.rows.size;
    }
}
/** The process-wide table the projection `view` reads; the service mutates it. */
export const currentPrices = {
    table: new PriceTable(BUNDLED_TABLE),
    currency: 'CNY',
    updatedAt: 0,
    usdToCny: 7.2,
};
/** Fetch the live USD→CNY exchange rate (free, keyless source). */
export async function fetchUsdToCny(signal) {
    const url = 'https://open.er-api.com/v6/latest/USD';
    const res = signal === undefined ? await fetch(url) : await fetch(url, { signal });
    if (!res.ok)
        throw new Error(`exchange rate HTTP ${res.status}`);
    const doc = (await res.json());
    const rate = doc.rates?.CNY;
    if (typeof rate !== 'number' || rate <= 0)
        throw new Error('exchange rate: missing CNY rate');
    return rate;
}
/**
 * Normalize one LiteLLM `model_prices_and_context_window.json` entry. LiteLLM
 * prices in USD; keep USD native so the client converts for display.
 */
function fromLiteLLMEntry(entry) {
    const input = entry.input_cost_per_token;
    const output = entry.output_cost_per_token;
    if (typeof input !== 'number' || typeof output !== 'number')
        return null;
    return {
        inputPerM: input * 1_000_000,
        outputPerM: output * 1_000_000,
        ...(typeof entry.cache_read_input_token_cost === 'number'
            ? { cacheReadPerM: entry.cache_read_input_token_cost * 1_000_000 }
            : {}),
        ...(typeof entry.cache_creation_input_token_cost === 'number'
            ? { cacheWritePerM: entry.cache_creation_input_token_cost * 1_000_000 }
            : {}),
        currency: 'USD',
        source: 'remote',
    };
}
/**
 * Fetch and normalize a LiteLLM-shaped pricing document. `litellm_provider`
 * is used as the provider route when present (mapped through
 * {@link PROVIDER_ALIASES}), else `provider` is synthesized from the model
 * id's first segment.
 *
 * @param url - endpoint serving `model_prices_and_context_window.json`.
 * @param signal - caller cancellation.
 * @returns a full provider/model price map (empty on failure to avoid clobbering).
 */
export async function fetchRemotePrices(url, signal) {
    const res = signal === undefined ? await fetch(url) : await fetch(url, { signal });
    if (!res.ok)
        throw new Error(`price source HTTP ${res.status}`);
    const doc = (await res.json());
    const rows = {};
    for (const [modelId, raw] of Object.entries(doc)) {
        if (raw === null || typeof raw !== 'object')
            continue;
        const pricing = fromLiteLLMEntry(raw);
        if (pricing === null)
            continue;
        const entry = raw;
        const rawProvider = entry.litellm_provider ?? modelId.split('/')[0] ?? '';
        const provider = PROVIDER_ALIASES[rawProvider] ?? rawProvider;
        rows[`${provider}/${modelId}`] = pricing;
    }
    return rows;
}
