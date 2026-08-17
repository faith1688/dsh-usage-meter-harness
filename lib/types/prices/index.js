import { anthropicModels } from "./providers/anthropic.js";
import { baichuanModels } from "./providers/baichuan.js";
import { baiduModels } from "./providers/baidu.js";
import { cohereModels } from "./providers/cohere.js";
import { deepseekModels } from "./providers/deepseek.js";
import { doubaoModels } from "./providers/doubao.js";
import { geminiModels } from "./providers/gemini.js";
import { hunyuanModels } from "./providers/hunyuan.js";
import { iflytekModels } from "./providers/iflytek.js";
import { minimaxModels } from "./providers/minimax.js";
import { mistralModels } from "./providers/mistral.js";
import { moonshotModels } from "./providers/moonshot.js";
import { openaiModels } from "./providers/openai.js";
import { qwenModels } from "./providers/qwen.js";
import { skyworkModels } from "./providers/skywork.js";
import { stepfunModels } from "./providers/stepfun.js";
import { xaiModels } from "./providers/xai.js";
import { xiaomiModels } from "./providers/xiaomi.js";
import { zhipuModels } from "./providers/zhipu.js";
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
function isPeakHour(utcHour) {
    return (utcHour >= 1 && utcHour < 4) || (utcHour >= 6 && utcHour < 10);
}
/** Resolve one pricing row to the rate active at `now` (peak/off-peak when applicable). */
export function resolvePricingForTime(pricing, now) {
    if (pricing.peak === undefined || pricing.offPeak === undefined)
        return pricing;
    if (pricing.peakOffPeakFrom !== undefined && now < pricing.peakOffPeakFrom)
        return pricing;
    const active = isPeakHour(new Date(now).getUTCHours()) ? pricing.peak : pricing.offPeak;
    return {
        ...pricing,
        inputPerM: active.inputPerM,
        outputPerM: active.outputPerM,
        ...(active.cacheReadPerM !== undefined ? { cacheReadPerM: active.cacheReadPerM } : {}),
    };
}
/** Aggregate of every provider's bundled models (snapshot 2026-08-16; sources per provider file). */
const BUNDLED = {
    ...deepseekModels,
    ...openaiModels,
    ...anthropicModels,
    ...geminiModels,
    ...xaiModels,
    ...mistralModels,
    ...cohereModels,
    ...zhipuModels,
    ...moonshotModels,
    ...qwenModels,
    ...hunyuanModels,
    ...doubaoModels,
    ...minimaxModels,
    ...stepfunModels,
    ...iflytekModels,
    ...baiduModels,
    ...xiaomiModels,
    ...baichuanModels,
    ...skyworkModels,
};
/** The pristine bundled table — the "reset to official defaults" base for user price overrides. */
export const BUNDLED_TABLE = BUNDLED;
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
    table: new PriceTable(BUNDLED),
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
//# sourceMappingURL=index.js.map