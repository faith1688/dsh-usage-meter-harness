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
/**
 * DeepSeek V4 peak/off-peak effective time: 2026-08-17 00:00 Beijing
 * (= 2026-08-16T16:00Z). Peak hours (Beijing) 09:00–12:00, 14:00–18:00
 * = UTC 01:00–04:00 and 06:00–10:00.
 */
const DEEPSEEK_PEAK_OFF_PEAK_FROM = Date.UTC(2026, 7, 16, 16, 0, 0);
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
const BUNDLED = {
    // DeepSeek V4 — official CNY rates (api-docs.deepseek.com/zh-cn/quick_start/pricing).
    'deepseek-official/deepseek-v4-flash': {
        inputPerM: 1,
        outputPerM: 2,
        cacheReadPerM: 0.02,
        peak: { inputPerM: 3, outputPerM: 9, cacheReadPerM: 0.1 },
        offPeak: { inputPerM: 1.5, outputPerM: 4.5, cacheReadPerM: 0.05 },
        peakOffPeakFrom: DEEPSEEK_PEAK_OFF_PEAK_FROM,
        currency: 'CNY',
        source: 'bundled',
    },
    'deepseek-official/deepseek-v4-pro': {
        inputPerM: 3,
        outputPerM: 6,
        cacheReadPerM: 0.025,
        peak: { inputPerM: 9, outputPerM: 27, cacheReadPerM: 0.3 },
        offPeak: { inputPerM: 4.5, outputPerM: 13.5, cacheReadPerM: 0.15 },
        peakOffPeakFrom: DEEPSEEK_PEAK_OFF_PEAK_FROM,
        currency: 'CNY',
        source: 'bundled',
    },
    // Legacy DeepSeek ids (aliases of the V4 line).
    'deepseek-official/deepseek-chat': {
        inputPerM: 1,
        outputPerM: 2,
        cacheReadPerM: 0.02,
        peak: { inputPerM: 3, outputPerM: 9, cacheReadPerM: 0.1 },
        offPeak: { inputPerM: 1.5, outputPerM: 4.5, cacheReadPerM: 0.05 },
        peakOffPeakFrom: DEEPSEEK_PEAK_OFF_PEAK_FROM,
        currency: 'CNY',
        source: 'bundled',
    },
    'deepseek-official/deepseek-reasoner': {
        inputPerM: 3,
        outputPerM: 6,
        cacheReadPerM: 0.025,
        peak: { inputPerM: 9, outputPerM: 27, cacheReadPerM: 0.3 },
        offPeak: { inputPerM: 4.5, outputPerM: 13.5, cacheReadPerM: 0.15 },
        peakOffPeakFrom: DEEPSEEK_PEAK_OFF_PEAK_FROM,
        currency: 'CNY',
        source: 'bundled',
    },
    // Mainstream routes — bundled fallback prices, snapshot 2026-08.
    // Foreign providers price in USD; domestic ones in their official CNY where
    // verified (else the official international-platform USD). The client
    // converts for display using the live rate. Sources:
    //   OpenAI/Anthropic/Google/xAI/Mistral/MiniMax/Kimi-Thinking: LiteLLM
    //   `model_prices_and_context_window.json` (community-maintained).
    //   Zhipu GLM: docs.z.ai/guides/overview/pricing.md (official, USD).
    //   Qwen/Hunyuan/Doubao/StepFun/iFlytek/Kimi-K2.5: official CNY docs
    //   (aliyun 百炼 / wallstreetcn / 火山方舟 / platform.stepfun.com / aikkm).
    //   Baidu ERNIE-4.5: LLMReference qianfan (USD).
    // Configure `priceSourceUrl` (LiteLLM) to refresh authoritative numbers.
    // ── OpenAI (USD) ────────────────────────────────────────────────────────────
    'openai/gpt-4o': { inputPerM: 2.5, outputPerM: 10, cacheReadPerM: 1.25, currency: 'USD', source: 'bundled' },
    'openai/gpt-4o-mini': { inputPerM: 0.15, outputPerM: 0.6, cacheReadPerM: 0.075, currency: 'USD', source: 'bundled' },
    'openai/gpt-4.1': { inputPerM: 2, outputPerM: 8, cacheReadPerM: 0.5, currency: 'USD', source: 'bundled' },
    'openai/gpt-4.1-mini': { inputPerM: 0.4, outputPerM: 1.6, cacheReadPerM: 0.1, currency: 'USD', source: 'bundled' },
    'openai/gpt-4.1-nano': { inputPerM: 0.1, outputPerM: 0.4, cacheReadPerM: 0.025, currency: 'USD', source: 'bundled' },
    'openai/gpt-5': { inputPerM: 1.25, outputPerM: 10, cacheReadPerM: 0.125, currency: 'USD', source: 'bundled' },
    'openai/gpt-5.1': { inputPerM: 1.25, outputPerM: 10, cacheReadPerM: 0.125, currency: 'USD', source: 'bundled' },
    'openai/gpt-5.2': { inputPerM: 1.75, outputPerM: 14, cacheReadPerM: 0.175, currency: 'USD', source: 'bundled' },
    'openai/gpt-5.4': { inputPerM: 2.5, outputPerM: 15, cacheReadPerM: 0.25, currency: 'USD', source: 'bundled' },
    'openai/gpt-5.4-mini': { inputPerM: 0.75, outputPerM: 4.5, cacheReadPerM: 0.075, currency: 'USD', source: 'bundled' },
    'openai/gpt-5.4-nano': { inputPerM: 0.2, outputPerM: 1.25, cacheReadPerM: 0.02, currency: 'USD', source: 'bundled' },
    'openai/gpt-5.5': { inputPerM: 5, outputPerM: 30, cacheReadPerM: 0.5, currency: 'USD', source: 'bundled' },
    'openai/gpt-5.6-sol': { inputPerM: 5, outputPerM: 30, cacheReadPerM: 0.5, cacheWritePerM: 6.25, currency: 'USD', source: 'bundled' },
    'openai/gpt-5.6-terra': { inputPerM: 2, outputPerM: 12, cacheReadPerM: 0.2, cacheWritePerM: 2.5, currency: 'USD', source: 'bundled' },
    'openai/gpt-5.6-luna': { inputPerM: 0.2, outputPerM: 1.2, cacheReadPerM: 0.02, cacheWritePerM: 0.25, currency: 'USD', source: 'bundled' },
    'openai/o3': { inputPerM: 2, outputPerM: 8, cacheReadPerM: 0.5, currency: 'USD', source: 'bundled' },
    'openai/o3-mini': { inputPerM: 1.1, outputPerM: 4.4, cacheReadPerM: 0.55, currency: 'USD', source: 'bundled' },
    'openai/o4-mini': { inputPerM: 1.1, outputPerM: 4.4, cacheReadPerM: 0.275, currency: 'USD', source: 'bundled' },
    // ── Anthropic (USD) ─────────────────────────────────────────────────────────
    'anthropic/claude-sonnet-4-5': { inputPerM: 3, outputPerM: 15, cacheReadPerM: 0.3, cacheWritePerM: 3.75, currency: 'USD', source: 'bundled' },
    'anthropic/claude-opus-4-1': { inputPerM: 15, outputPerM: 75, cacheReadPerM: 1.5, cacheWritePerM: 18.75, currency: 'USD', source: 'bundled' },
    'anthropic/claude-haiku-4-5': { inputPerM: 1, outputPerM: 5, cacheReadPerM: 0.1, cacheWritePerM: 1.25, currency: 'USD', source: 'bundled' },
    'anthropic/claude-sonnet-5': { inputPerM: 2, outputPerM: 10, cacheReadPerM: 0.2, cacheWritePerM: 2.5, currency: 'USD', source: 'bundled' },
    'anthropic/claude-opus-5': { inputPerM: 5, outputPerM: 25, cacheReadPerM: 0.5, cacheWritePerM: 6.25, currency: 'USD', source: 'bundled' },
    'anthropic/claude-fable-5': { inputPerM: 10, outputPerM: 50, cacheReadPerM: 1, cacheWritePerM: 12.5, currency: 'USD', source: 'bundled' },
    'anthropic/claude-mythos-5': { inputPerM: 10, outputPerM: 50, cacheReadPerM: 1, cacheWritePerM: 12.5, currency: 'USD', source: 'bundled' },
    'anthropic/claude-3-7-sonnet': { inputPerM: 3, outputPerM: 15, cacheReadPerM: 0.3, cacheWritePerM: 3.75, currency: 'USD', source: 'bundled' },
    'anthropic/claude-3-5-sonnet-20241022': { inputPerM: 3, outputPerM: 15, cacheReadPerM: 0.3, cacheWritePerM: 3.75, currency: 'USD', source: 'bundled' },
    'anthropic/claude-3-5-haiku-20241022': { inputPerM: 0.8, outputPerM: 4, cacheReadPerM: 0.08, cacheWritePerM: 1, currency: 'USD', source: 'bundled' },
    // ── Google Gemini (USD) ─────────────────────────────────────────────────────
    'gemini/gemini-2.5-pro': { inputPerM: 1.25, outputPerM: 10, cacheReadPerM: 0.125, currency: 'USD', source: 'bundled' },
    'gemini/gemini-2.5-flash': { inputPerM: 0.3, outputPerM: 2.5, cacheReadPerM: 0.03, currency: 'USD', source: 'bundled' },
    'gemini/gemini-2.5-flash-lite': { inputPerM: 0.1, outputPerM: 0.4, cacheReadPerM: 0.01, currency: 'USD', source: 'bundled' },
    'gemini/gemini-2.0-flash': { inputPerM: 0.1, outputPerM: 0.4, cacheReadPerM: 0.025, currency: 'USD', source: 'bundled' },
    'gemini/gemini-2.0-flash-lite': { inputPerM: 0.075, outputPerM: 0.3, cacheReadPerM: 0.0188, currency: 'USD', source: 'bundled' },
    'gemini/gemini-3-pro-preview': { inputPerM: 2, outputPerM: 12, cacheReadPerM: 0.2, currency: 'USD', source: 'bundled' },
    'gemini/gemini-3-flash-preview': { inputPerM: 0.5, outputPerM: 3, cacheReadPerM: 0.05, currency: 'USD', source: 'bundled' },
    'gemini/gemini-3.1-flash-lite': { inputPerM: 0.25, outputPerM: 1.5, cacheReadPerM: 0.025, currency: 'USD', source: 'bundled' },
    'gemini/gemini-3.5-flash': { inputPerM: 1.5, outputPerM: 9, cacheReadPerM: 0.15, currency: 'USD', source: 'bundled' },
    // ── xAI Grok (USD) ──────────────────────────────────────────────────────────
    'xai/grok-3': { inputPerM: 3, outputPerM: 15, cacheReadPerM: 0.75, currency: 'USD', source: 'bundled' },
    'xai/grok-3-mini': { inputPerM: 0.3, outputPerM: 0.5, cacheReadPerM: 0.075, currency: 'USD', source: 'bundled' },
    'xai/grok-4': { inputPerM: 3, outputPerM: 15, currency: 'USD', source: 'bundled' },
    'xai/grok-4-fast': { inputPerM: 0.2, outputPerM: 0.5, cacheReadPerM: 0.05, currency: 'USD', source: 'bundled' },
    'xai/grok-4.6': { inputPerM: 2, outputPerM: 6, currency: 'USD', source: 'bundled' },
    // ── Mistral (USD) ───────────────────────────────────────────────────────────
    'mistral/mistral-large-latest': { inputPerM: 0.5, outputPerM: 1.5, currency: 'USD', source: 'bundled' },
    'mistral/mistral-medium-latest': { inputPerM: 1.5, outputPerM: 7.5, currency: 'USD', source: 'bundled' },
    'mistral/mistral-small-latest': { inputPerM: 0.06, outputPerM: 0.18, currency: 'USD', source: 'bundled' },
    'mistral/codestral-latest': { inputPerM: 1, outputPerM: 3, currency: 'USD', source: 'bundled' },
    // ── Zhipu GLM (official Z.AI platform, USD) ─────────────────────────────────
    'zhipu/glm-5': { inputPerM: 1, outputPerM: 3.2, cacheReadPerM: 0.2, currency: 'USD', source: 'bundled' },
    'zhipu/glm-5.1': { inputPerM: 1.4, outputPerM: 4.4, cacheReadPerM: 0.26, currency: 'USD', source: 'bundled' },
    'zhipu/glm-5.2': { inputPerM: 1.4, outputPerM: 4.4, cacheReadPerM: 0.26, currency: 'USD', source: 'bundled' },
    'zhipu/glm-4.7': { inputPerM: 0.6, outputPerM: 2.2, cacheReadPerM: 0.11, currency: 'USD', source: 'bundled' },
    'zhipu/glm-4.6': { inputPerM: 0.6, outputPerM: 2.2, cacheReadPerM: 0.11, currency: 'USD', source: 'bundled' },
    'zhipu/glm-4.5': { inputPerM: 0.6, outputPerM: 2.2, cacheReadPerM: 0.11, currency: 'USD', source: 'bundled' },
    'zhipu/glm-4.5-air': { inputPerM: 0.2, outputPerM: 1.1, cacheReadPerM: 0.03, currency: 'USD', source: 'bundled' },
    'zhipu/glm-4.7-flash': { inputPerM: 0, outputPerM: 0, currency: 'USD', source: 'bundled' },
    'zhipu/glm-4.5-flash': { inputPerM: 0, outputPerM: 0, currency: 'USD', source: 'bundled' },
    // ── Moonshot Kimi (official CNY / USD as sourced) ───────────────────────────
    'moonshot/kimi-k2': { inputPerM: 4, outputPerM: 16, cacheReadPerM: 1, currency: 'CNY', source: 'bundled' },
    'moonshot/kimi-k2.5': { inputPerM: 4, outputPerM: 21, cacheReadPerM: 0.7, currency: 'CNY', source: 'bundled' },
    'moonshot/kimi-k2-thinking': { inputPerM: 0.6, outputPerM: 2.5, cacheReadPerM: 0.15, currency: 'USD', source: 'bundled' },
    'moonshot/kimi-k2.6': { inputPerM: 0.95, outputPerM: 4, cacheReadPerM: 0.16, currency: 'USD', source: 'bundled' },
    'moonshot/kimi-k3': { inputPerM: 20, outputPerM: 100, cacheReadPerM: 2, currency: 'CNY', source: 'bundled' },
    'moonshot/moonshot-v1-8k': { inputPerM: 12, outputPerM: 12, currency: 'CNY', source: 'bundled' },
    'moonshot/moonshot-v1-32k': { inputPerM: 24, outputPerM: 24, currency: 'CNY', source: 'bundled' },
    // ── Qwen (百炼 official CNY) ────────────────────────────────────────────────
    'qwen/qwen-max': { inputPerM: 2.4, outputPerM: 9.6, currency: 'CNY', source: 'bundled' },
    'qwen/qwen3-max': { inputPerM: 2.5, outputPerM: 10, cacheReadPerM: 0.5, currency: 'CNY', source: 'bundled' },
    'qwen/qwen3.8-max': { inputPerM: 12, outputPerM: 36, cacheReadPerM: 2.4, currency: 'CNY', source: 'bundled' },
    'qwen/qwen3.7-max': { inputPerM: 12, outputPerM: 36, cacheReadPerM: 2.4, currency: 'CNY', source: 'bundled' },
    'qwen/qwen-plus': { inputPerM: 3, outputPerM: 9, currency: 'CNY', source: 'bundled' },
    'qwen/qwen-turbo': { inputPerM: 0.4, outputPerM: 1.4, currency: 'CNY', source: 'bundled' },
    'qwen/qwen-coder': { inputPerM: 2.2, outputPerM: 10.8, currency: 'CNY', source: 'bundled' },
    // ── Tencent Hunyuan (official CNY) ──────────────────────────────────────────
    'hunyuan/hy3': { inputPerM: 1, outputPerM: 4, cacheReadPerM: 0.25, currency: 'CNY', source: 'bundled' },
    'hunyuan/hunyuan-turbos': { inputPerM: 1, outputPerM: 4, cacheReadPerM: 0.25, currency: 'CNY', source: 'bundled' },
    // ── ByteDance Doubao (official CNY) ─────────────────────────────────────────
    'doubao/doubao-seed-2.1-pro': { inputPerM: 6, outputPerM: 30, currency: 'CNY', source: 'bundled' },
    'doubao/doubao-seed-2-0-pro': { inputPerM: 6, outputPerM: 30, currency: 'CNY', source: 'bundled' },
    'doubao/doubao-1.5-pro': { inputPerM: 2, outputPerM: 9, currency: 'CNY', source: 'bundled' },
    // ── MiniMax (USD) ───────────────────────────────────────────────────────────
    'minimax/MiniMax-M2': { inputPerM: 0.3, outputPerM: 1.2, cacheReadPerM: 0.03, cacheWritePerM: 0.375, currency: 'USD', source: 'bundled' },
    'minimax/MiniMax-M2.1': { inputPerM: 0.3, outputPerM: 1.2, cacheReadPerM: 0.03, cacheWritePerM: 0.375, currency: 'USD', source: 'bundled' },
    'minimax/MiniMax-M2.5': { inputPerM: 0.3, outputPerM: 1.2, cacheReadPerM: 0.03, cacheWritePerM: 0.375, currency: 'USD', source: 'bundled' },
    'minimax/MiniMax-M3': { inputPerM: 0.3, outputPerM: 1.2, cacheReadPerM: 0.06, currency: 'USD', source: 'bundled' },
    // ── Xiaomi MiMo (official CNY; flash from openrouter USD) ───────────────────
    'xiaomi/mimo-v2.5': { inputPerM: 1, outputPerM: 2, cacheReadPerM: 0.02, currency: 'CNY', source: 'bundled' },
    'xiaomi/mimo-v2.5-pro': { inputPerM: 3, outputPerM: 6, cacheReadPerM: 0.025, currency: 'CNY', source: 'bundled' },
    'xiaomi/mimo-v2-flash': { inputPerM: 0.1, outputPerM: 0.3, cacheReadPerM: 0.01, currency: 'USD', source: 'bundled' },
    // ── StepFun (official CNY) ──────────────────────────────────────────────────
    'stepfun/step-3.7-flash': { inputPerM: 1.35, outputPerM: 8.1, cacheReadPerM: 0.27, currency: 'CNY', source: 'bundled' },
    'stepfun/step-3.5-flash': { inputPerM: 0.7, outputPerM: 2.1, cacheReadPerM: 0.14, currency: 'CNY', source: 'bundled' },
    'stepfun/step-1o-turbo-vision': { inputPerM: 2.5, outputPerM: 8, cacheReadPerM: 0.5, currency: 'CNY', source: 'bundled' },
    // ── iFlytek Spark (official CNY) ────────────────────────────────────────────
    'iflytek/spark-x1.5': { inputPerM: 3, outputPerM: 3, currency: 'CNY', source: 'bundled' },
    'iflytek/spark-ultra': { inputPerM: 2, outputPerM: 2, currency: 'CNY', source: 'bundled' },
    'iflytek/spark-max': { inputPerM: 30, outputPerM: 30, currency: 'CNY', source: 'bundled' },
    'iflytek/spark-pro': { inputPerM: 7, outputPerM: 7, currency: 'CNY', source: 'bundled' },
    // ── Baidu ERNIE (Qianfan, USD) ──────────────────────────────────────────────
    'baidu/ernie-4.5': { inputPerM: 0.59, outputPerM: 2.36, currency: 'USD', source: 'bundled' },
    'baidu/ernie-4.5-turbo': { inputPerM: 0.3, outputPerM: 1.2, currency: 'USD', source: 'bundled' },
    'baidu/ernie-5.0': { inputPerM: 0.89, outputPerM: 3.54, currency: 'USD', source: 'bundled' },
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
//# sourceMappingURL=prices.js.map