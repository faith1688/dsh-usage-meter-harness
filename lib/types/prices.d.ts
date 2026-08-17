/**
 * Price resolution: a bundled fallback table plus an optional remote source,
 * with time-of-day (peak/off-peak) resolution for providers that bill that way
 * (DeepSeek V4).
 *
 * Canonical currency is CNY (the DeepSeek official pricing unit). Remote
 * sources that price in USD are converted with the live exchange rate.
 *
 * @module @deepseek-ai/dsh-usage-meter/prices
 */
import type { ModelPricing } from './projection.ts';
/** Route key for a table row. `provider/model` is the primary shape. */
export type PriceKey = `${string}/${string}`;
/** Resolve one pricing row to the rate active at `now` (peak/off-peak when applicable). */
export declare function resolvePricingForTime(pricing: ModelPricing, now: number): ModelPricing;
/** The pristine bundled table — the "reset to official defaults" base for user price overrides. */
export declare const BUNDLED_TABLE: Record<string, ModelPricing>;
/**
 * A sparse price table keyed by `provider/model`. Lookup tries the exact key,
 * then a `*` wildcard for the provider, then returns undefined.
 */
export declare class PriceTable {
    private rows;
    constructor(rows?: Record<PriceKey, ModelPricing>);
    get(provider: string, model: string): ModelPricing | undefined;
    /** Exact-key lookup only (no wildcard) — used for user overrides/reset. */
    getRaw(key: string): ModelPricing | undefined;
    /** Remove one exact row (reset of a user-overridden row with no bundled base). */
    removeRaw(key: string): void;
    /** Merge a full set of rows (remote refresh / user override), keeping others. */
    merge(rows: Record<PriceKey, ModelPricing>): void;
    get size(): number;
}
/** The process-wide table the projection `view` reads; the service mutates it. */
export declare const currentPrices: {
    table: PriceTable;
    currency: string;
    updatedAt: number;
    usdToCny: number;
};
/** Fetch the live USD→CNY exchange rate (free, keyless source). */
export declare function fetchUsdToCny(signal?: AbortSignal): Promise<number>;
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
export declare function fetchRemotePrices(url: string, signal?: AbortSignal): Promise<Record<PriceKey, ModelPricing>>;
//# sourceMappingURL=prices.d.ts.map