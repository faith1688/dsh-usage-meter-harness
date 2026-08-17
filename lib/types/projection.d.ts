/** Peak / off-peak rates for providers with time-of-day pricing (DeepSeek V4). */
export interface PeakOffPeakRates {
    /** USD per 1M uncached input tokens. */
    inputPerM: number;
    /** USD per 1M output tokens. */
    outputPerM: number;
    /** USD per 1M cache-read tokens; falls back to `inputPerM` when absent. */
    cacheReadPerM?: number | undefined;
}
/** Per-million-token pricing for one model route, in USD. */
export interface ModelPricing {
    /** USD per 1M uncached input tokens (flat rate when no time-of-day pricing). */
    inputPerM: number;
    /** USD per 1M output tokens. */
    outputPerM: number;
    /** USD per 1M cache-read tokens; falls back to `inputPerM` when absent. */
    cacheReadPerM?: number | undefined;
    /** USD per 1M cache-write tokens; falls back to `inputPerM` when absent. */
    cacheWritePerM?: number | undefined;
    /**
     * COMBINED billing mode (e.g. iFlytek 讯飞, Baichuan 百川): input AND output
     * are charged together at ONE per-1M rate. When present, cost =
     * (input + cacheRead + cacheWrite + output)/1M × combinedPerM and the
     * per-bucket prices are ignored. Absent = the standard split mode.
     */
    combinedPerM?: number | undefined;
    /**
     * Cost multiplier applied to the whole result (default 1). Used for type 7
     * BATCH billing (×0.5 for OpenAI/Anthropic/Gemini/Mistral/Qwen batch calls).
     */
    discount?: number | undefined;
    /** Billing currency of the rates, e.g. `USD`. */
    currency?: string | undefined;
    /** Epoch ms when this price was last refreshed. */
    updatedAt?: number | undefined;
    /** Where the price came from (`bundled` fallback table, `remote` source, or `user` override). */
    source?: 'bundled' | 'remote' | 'user' | undefined;
    /** Peak-window rates, when the provider uses peak/off-peak billing. */
    peak?: PeakOffPeakRates | undefined;
    /** Off-peak-window rates, when the provider uses peak/off-peak billing. */
    offPeak?: PeakOffPeakRates | undefined;
    /** Epoch ms after which the peak/off-peak rates replace the flat rate. */
    peakOffPeakFrom?: number | undefined;
}
/** One displayed billing row: a label plus the token buckets it aggregates. */
export interface PriceRow {
    label: string;
    /** Billing buckets aggregated into this row (e.g. DeepSeek 未命中 = input+cacheWrite). */
    buckets: ('input' | 'cacheRead' | 'cacheWrite' | 'output')[];
}
/** Cost and token totals for one conversation turn (one user ask). */
export interface UsageTurnCost {
    turn: number;
    /** Cost of this turn, frozen at the price active when it was recorded. */
    cost: number;
    /** Native pricing currency of this turn (`CNY` or `USD`). */
    currency: string;
    /** Model that served this turn; null when the header never arrived. */
    model: string | null;
    /** Turn start time (epoch ms). */
    startedAt: number;
    /** Turn end time (epoch ms); 0 when still in progress. */
    endedAt: number;
    /** `turn/end` reason kind (`completed`, `aborted`, `error`, …); null while in progress. */
    endReason: string | null;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    reasoningTokens: number;
}
/** Account-balance snapshot surfaced by the projection (DeepSeek /user/balance). */
export interface AccountBalance {
    currency: string;
    totalBalance: number;
    /** Epoch ms when this value was produced: the API fetch time, or the turn-end compute time. */
    updatedAt: number;
    /** How the value was produced: live API fetch, or computed from the turn-start balance minus spend. */
    source: 'api' | 'computed';
}
/**
 * The whole value the `usageCost` projection serves for one session.
 *
 * Token buckets are DISJOINT (they mirror `TokenUsage`): billed input is
 * `inputTokens + cacheReadTokens + cacheWriteTokens`, and `reasoningTokens`
 * is already inside `outputTokens` — never added again.
 */
export interface UsageCostValue {
    /** Successful model completions (`assistant/message` events). */
    requestCount: number;
    /** Attempted model calls (`step/start` events), including failures/retries. */
    stepCount: number;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    reasoningTokens: number;
    /** Provider route of the latest request (`request/header`); null before any request. */
    provider: string | null;
    /** Model id of the latest request; null before any request. */
    model: string | null;
    /** Effective pricing for the current route and time; null while unknown/unlisted. */
    pricing: ModelPricing | null;
    /** The current model's BASE (unresolved) pricing row — what the popup editor edits. */
    basePricing: ModelPricing | null;
    /** The 用量 template for the current model (row labels + bucket mapping). */
    priceRows: PriceRow[];
    /** The OFFICIAL bundled pricing + template for the current model (popup 重置 refills from it). */
    officialPrice: {
        pricing: ModelPricing;
        rows: PriceRow[];
    } | null;
    /** Estimated spend = Σ(tokens × price), in CNY. */
    estimatedCost: number;
    /** Display currency preference: `CNY` or `USD`. */
    currency: string;
    /** Live USD→CNY exchange rate used for display conversion. */
    usdToCny: number;
    /** Epoch ms of the last successful exchange-rate fetch; 0 = never fetched yet. */
    rateUpdatedAt: number;
    /** DeepSeek account balance snapshot (API anchor) or non-DeepSeek global ledger; null until configured. */
    accountBalance: AccountBalance | null;
    /** Per-turn totals (most recent last). */
    turns: UsageTurnCost[];
}
declare module '@deepseek-ai/dsh-session-projection/types' {
    interface SessionProjectionMap {
        usageCost: UsageCostValue;
    }
}
/** Sum the three disjoint prompt-side billing buckets. */
export declare function billedInputTokens(v: Pick<UsageCostValue, 'inputTokens' | 'cacheReadTokens' | 'cacheWriteTokens'>): number;
/** Per-bucket cost breakdown for one usage sample under a pricing table. */
export interface CostBreakdown {
    input: number;
    cacheRead: number;
    cacheWrite: number;
    output: number;
    total: number;
}
/** Bucket-by-bucket cost (each bucket × its own price); 0 while pricing is unknown. */
export declare function costBreakdown(usage: Pick<UsageCostValue, 'inputTokens' | 'outputTokens' | 'cacheReadTokens' | 'cacheWriteTokens'>, pricing: ModelPricing | null): CostBreakdown;
/** Cost of one usage sample under a pricing table (0 while pricing is unknown). */
export declare function costOf(usage: Pick<UsageCostValue, 'inputTokens' | 'outputTokens' | 'cacheReadTokens' | 'cacheWriteTokens'>, pricing: ModelPricing | null): number;
//# sourceMappingURL=projection.d.ts.map