import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { z as zod } from 'zod';
import type { SessionEvent } from '@deepseek-ai/dsh-session';
import type { BalanceSnapshot } from './balance.ts';
import { costBreakdown, costOf } from './projection.ts';
import type { AccountBalance, ModelPricing, PriceRow, UsageCostValue } from './projection.ts';
declare module '@deepseek-ai/dsh-session/types' {
    interface SessionEventMap {
        'usage/balance': {
            balance: AccountBalance | null;
        };
        'usage/balance-ledger': {
            key: string;
            balance: number;
            currency: string;
            kind: 'deduct' | 'manual';
        };
    }
}
export interface Config {
    /** Display currency: `CNY` (default) or `USD`. */
    currency?: string;
    /** URL serving a LiteLLM-shaped `model_prices_and_context_window.json`. */
    priceSourceUrl?: string;
    /** Refresh cadence for prices/balance/rate in ms (default 4h). */
    refreshIntervalMs?: number;
    /** Optional DeepSeek API key override; falls back to `DEEPSEEK_API_KEY` env. */
    deepseekApiKey?: string;
    /** Manual starting balance (CNY) for providers without a balance API. */
    initialBalance?: number;
}
export declare const Config: z<Schemastery.ObjectS<{
    currency: z<string, string>;
    priceSourceUrl: z<string, string>;
    refreshIntervalMs: z<number, number>;
    deepseekApiKey: z<string, string>;
    initialBalance: z<number, number>;
}>, Schemastery.ObjectT<{
    currency: z<string, string>;
    priceSourceUrl: z<string, string>;
    refreshIntervalMs: z<number, number>;
    deepseekApiKey: z<string, string>;
    initialBalance: z<number, number>;
}>>;
/** Stable Cordis plugin name. */
export declare const name = "usage-meter";
/** Required services: settings (config namespace), projection registry, webserver (config route). */
export declare const inject: string[];
/** Per-provider display config (currency). DeepSeek's balance comes from the API. */
export interface ProviderConfig {
    currency?: string;
}
/**
 * THE GLOBAL BALANCE LEDGER — the single authoritative value per binding key.
 * Key shape: `p:<provider>` for official vendor models (all models of a
 * vendor share one balance), `m:<provider>/<model>` for user-custom models
 * (each custom model has its own balance). Every cost computation reads this
 * value, subtracts only the DELTA, writes back and broadcasts — so concurrent
 * sessions always operate on the latest global value. DeepSeek is excluded
 * (its truth comes from the live API anchor).
 */
export interface LedgerEntry {
    balance: number;
    currency: string;
}
/**
 * User price overrides keyed by `provider/model` (persisted). `prices` merge
 * over the bundled/remote row (computation uses them); `rows` replace the
 * default 用量 template (labels + bucket mapping). Removing the key restores
 * the official defaults — the popup 重置 button.
 */
export interface ModelPriceOverride {
    prices?: Partial<ModelPricing>;
    rows?: PriceRow[];
}
/** The 7 billing-method templates (计费方式) exposed to the popup dropdown. */
export interface BillingType {
    id: string;
    label: string;
    rows: PriceRow[];
    /** split = normal bucket pricing; combined = 讯飞/百川 one-rate; keep = Batch (leave rows as-is). */
    mode: 'split' | 'combined' | 'keep';
    /** peak/off-peak (峰谷分时) billing: prices entered are 高峰价, 闲时 = ×0.5. */
    peak?: boolean;
    discount?: number;
    note?: string;
}
/** 7 计费方式模板（替代原“厂商模板”下拉，让用户按计费类型选择）。
 *  无法自动计量的部分（Gemini 存储费、阶梯更高档）在 note 中注明。 */
export declare const BILLING_TYPES: BillingType[];
interface Buckets {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    reasoning: number;
}
interface TurnBucket extends Buckets {
    turn: number;
    cost: number;
    currency: string;
    /** Model used for this turn (stamped at turn/start, updated on mid-turn switches). */
    model: string | null;
    startedAt: number;
    endedAt: number;
    /** `turn/end` reason kind; null while the turn is still in progress. */
    endReason: string | null;
}
interface FoldState {
    requestCount: number;
    stepCount: number;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    reasoningTokens: number;
    provider: string | null;
    model: string | null;
    /**
     * The DEEPSEEK peak/off-peak billing window is fixed at the moment the
     * REQUEST STARTED (DeepSeek bills the whole request at the rate active when
     * it was sent — a request that begins off-peak stays off-peak even if it
     * streams past the peak start; one that begins in peak stays peak past the
     * off-peak start). Recorded from `step/start` (the model call = one API
     * request); pricing for every usage delta of that step uses this time, not
     * the per-chunk `event.time`.
     */
    stepStart: {
        turn: number;
        step: number;
        at: number;
    } | null;
    /**
     * The latest official account balance fetched from the DeepSeek API (the
     * "anchor"), plus the accumulated cost at the moment it was applied. The
     * live displayed balance is `anchor.totalBalance − (cost since anchor)`.
     */
    anchor: {
        currency: string;
        totalBalance: number;
        fetchedAt: number;
        /** Σ turn costs at the moment the anchor was applied (its timeline baseline). */
        costBaseline: number;
    } | null;
    /**
     * The GLOBAL ledger value for this session's binding key (non-DeepSeek),
     * pushed by `usage/balance-ledger` broadcasts. The ledger is already
     * decremented for every delta by the server, so the display IS this value
     * (no per-session subtraction — concurrent sessions always see the same
     * global balance).
     */
    manualAnchor: {
        currency: string;
        totalBalance: number;
        at: number;
        kind: 'deduct' | 'manual';
    } | null;
    /** Time of the last COST-CHANGING event — the "calculated at" stamp for the balance. */
    lastCostAt: number;
    turns: TurnBucket[];
    last: {
        turn: number;
        step: number;
        input: number;
        output: number;
        cacheRead: number;
        cacheWrite: number;
        reasoning: number;
    } | null;
}
declare const usageCostProjection: {
    key: "usageCost";
    schema: zod.ZodObject<{
        requestCount: zod.ZodNumber;
        stepCount: zod.ZodNumber;
        inputTokens: zod.ZodNumber;
        outputTokens: zod.ZodNumber;
        cacheReadTokens: zod.ZodNumber;
        cacheWriteTokens: zod.ZodNumber;
        reasoningTokens: zod.ZodNumber;
        provider: zod.ZodNullable<zod.ZodString>;
        model: zod.ZodNullable<zod.ZodString>;
        pricing: zod.ZodNullable<zod.ZodObject<{
            inputPerM: zod.ZodNumber;
            outputPerM: zod.ZodNumber;
            cacheReadPerM: zod.ZodOptional<zod.ZodNumber>;
            cacheWritePerM: zod.ZodOptional<zod.ZodNumber>;
            combinedPerM: zod.ZodOptional<zod.ZodNumber>;
            discount: zod.ZodOptional<zod.ZodNumber>;
            currency: zod.ZodOptional<zod.ZodString>;
            updatedAt: zod.ZodOptional<zod.ZodNumber>;
            source: zod.ZodOptional<zod.ZodEnum<{
                bundled: "bundled";
                remote: "remote";
                user: "user";
            }>>;
            peak: zod.ZodOptional<zod.ZodObject<{
                inputPerM: zod.ZodNumber;
                outputPerM: zod.ZodNumber;
                cacheReadPerM: zod.ZodOptional<zod.ZodNumber>;
            }, zod.core.$strict>>;
            offPeak: zod.ZodOptional<zod.ZodObject<{
                inputPerM: zod.ZodNumber;
                outputPerM: zod.ZodNumber;
                cacheReadPerM: zod.ZodOptional<zod.ZodNumber>;
            }, zod.core.$strict>>;
            peakOffPeakFrom: zod.ZodOptional<zod.ZodNumber>;
        }, zod.core.$strict>>;
        basePricing: zod.ZodNullable<zod.ZodObject<{
            inputPerM: zod.ZodNumber;
            outputPerM: zod.ZodNumber;
            cacheReadPerM: zod.ZodOptional<zod.ZodNumber>;
            cacheWritePerM: zod.ZodOptional<zod.ZodNumber>;
            combinedPerM: zod.ZodOptional<zod.ZodNumber>;
            discount: zod.ZodOptional<zod.ZodNumber>;
            currency: zod.ZodOptional<zod.ZodString>;
            updatedAt: zod.ZodOptional<zod.ZodNumber>;
            source: zod.ZodOptional<zod.ZodEnum<{
                bundled: "bundled";
                remote: "remote";
                user: "user";
            }>>;
            peak: zod.ZodOptional<zod.ZodObject<{
                inputPerM: zod.ZodNumber;
                outputPerM: zod.ZodNumber;
                cacheReadPerM: zod.ZodOptional<zod.ZodNumber>;
            }, zod.core.$strict>>;
            offPeak: zod.ZodOptional<zod.ZodObject<{
                inputPerM: zod.ZodNumber;
                outputPerM: zod.ZodNumber;
                cacheReadPerM: zod.ZodOptional<zod.ZodNumber>;
            }, zod.core.$strict>>;
            peakOffPeakFrom: zod.ZodOptional<zod.ZodNumber>;
        }, zod.core.$strict>>;
        priceRows: zod.ZodArray<zod.ZodObject<{
            label: zod.ZodString;
            buckets: zod.ZodArray<zod.ZodEnum<{
                input: "input";
                cacheRead: "cacheRead";
                cacheWrite: "cacheWrite";
                output: "output";
            }>>;
        }, zod.core.$strict>>;
        officialPrice: zod.ZodNullable<zod.ZodObject<{
            pricing: zod.ZodObject<{
                inputPerM: zod.ZodNumber;
                outputPerM: zod.ZodNumber;
                cacheReadPerM: zod.ZodOptional<zod.ZodNumber>;
                cacheWritePerM: zod.ZodOptional<zod.ZodNumber>;
                combinedPerM: zod.ZodOptional<zod.ZodNumber>;
                discount: zod.ZodOptional<zod.ZodNumber>;
                currency: zod.ZodOptional<zod.ZodString>;
                updatedAt: zod.ZodOptional<zod.ZodNumber>;
                source: zod.ZodOptional<zod.ZodEnum<{
                    bundled: "bundled";
                    remote: "remote";
                    user: "user";
                }>>;
                peak: zod.ZodOptional<zod.ZodObject<{
                    inputPerM: zod.ZodNumber;
                    outputPerM: zod.ZodNumber;
                    cacheReadPerM: zod.ZodOptional<zod.ZodNumber>;
                }, zod.core.$strict>>;
                offPeak: zod.ZodOptional<zod.ZodObject<{
                    inputPerM: zod.ZodNumber;
                    outputPerM: zod.ZodNumber;
                    cacheReadPerM: zod.ZodOptional<zod.ZodNumber>;
                }, zod.core.$strict>>;
                peakOffPeakFrom: zod.ZodOptional<zod.ZodNumber>;
            }, zod.core.$strict>;
            rows: zod.ZodArray<zod.ZodObject<{
                label: zod.ZodString;
                buckets: zod.ZodArray<zod.ZodEnum<{
                    input: "input";
                    cacheRead: "cacheRead";
                    cacheWrite: "cacheWrite";
                    output: "output";
                }>>;
            }, zod.core.$strict>>;
        }, zod.core.$strip>>;
        estimatedCost: zod.ZodNumber;
        currency: zod.ZodString;
        usdToCny: zod.ZodNumber;
        rateUpdatedAt: zod.ZodNumber;
        accountBalance: zod.ZodNullable<zod.ZodObject<{
            currency: zod.ZodString;
            totalBalance: zod.ZodNumber;
            updatedAt: zod.ZodNumber;
            source: zod.ZodEnum<{
                api: "api";
                computed: "computed";
            }>;
        }, zod.core.$strict>>;
        turns: zod.ZodArray<zod.ZodObject<{
            turn: zod.ZodNumber;
            cost: zod.ZodNumber;
            currency: zod.ZodString;
            model: zod.ZodNullable<zod.ZodString>;
            startedAt: zod.ZodNumber;
            endedAt: zod.ZodNumber;
            endReason: zod.ZodNullable<zod.ZodString>;
            inputTokens: zod.ZodNumber;
            outputTokens: zod.ZodNumber;
            cacheReadTokens: zod.ZodNumber;
            cacheWriteTokens: zod.ZodNumber;
            reasoningTokens: zod.ZodNumber;
        }, zod.core.$strict>>;
    }, zod.core.$strict>;
    init(): FoldState;
    apply(state: FoldState, event: SessionEvent): FoldState;
    view(state: FoldState): UsageCostValue;
    stateVersion: number;
};
/** Client-facing service face (returned value only; instance is internal). */
export interface UsageMeterFace {
    getPrice(provider: string, model: string): ModelPricing | undefined;
    estimateCost(usage: Pick<UsageCostValue, 'inputTokens' | 'outputTokens' | 'cacheReadTokens' | 'cacheWriteTokens'>, provider: string, model: string): number;
    getBalance(): BalanceSnapshot | null;
    refreshBalance(): Promise<void>;
    refreshPrices(): Promise<void>;
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        usageMeter: UsageMeterFace;
    }
}
/** Plugin entry: provide the service, register settings + the projection. */
export declare function apply(ctx: Context, config?: Config): void;
export { usageCostProjection, costBreakdown, costOf };
//# sourceMappingURL=index.d.ts.map