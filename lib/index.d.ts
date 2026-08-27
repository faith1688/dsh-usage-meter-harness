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
import type { Context } from '@deepseek-ai/cordis';
import { PriceTable } from './prices.ts';
import type { BalanceSnapshot } from './balance.ts';
import { costBreakdown, costOf } from './projection.ts';
import type { BillingRow, ModelPricing, UsageCostValue } from './projection.ts';
import { BILLING_TYPES } from './billing.ts';
declare const Config: z<Schemastery.ObjectS<{
    /** Display / ledger currency (CNY default; USD via the popup). */
    currency: z<string, string>;
    /** URL serving a LiteLLM-shaped `model_prices_and_context_window.json`. */
    priceSourceUrl: z<string, string>;
    /** Refresh cadence for prices/balance/rate in ms (default 4h). */
    refreshIntervalMs: z<number, number>;
    /** DeepSeek API key, used ONLY to query `/user/balance` (kept secret). */
    deepseekApiKey: z<string, string>;
    /** Initial balance for providers without a balance API (legacy, ≥0). */
    initialBalance: z<number, number>;
    /** Optional per-session budget; remaining = budget − estimated cost. */
    budget: z<number, number>;
}>, Schemastery.ObjectT<{
    /** Display / ledger currency (CNY default; USD via the popup). */
    currency: z<string, string>;
    /** URL serving a LiteLLM-shaped `model_prices_and_context_window.json`. */
    priceSourceUrl: z<string, string>;
    /** Refresh cadence for prices/balance/rate in ms (default 4h). */
    refreshIntervalMs: z<number, number>;
    /** DeepSeek API key, used ONLY to query `/user/balance` (kept secret). */
    deepseekApiKey: z<string, string>;
    /** Initial balance for providers without a balance API (legacy, ≥0). */
    initialBalance: z<number, number>;
    /** Optional per-session budget; remaining = budget − estimated cost. */
    budget: z<number, number>;
}>>;
/** Stable Cordis plugin name. */
export declare const name = "usage-meter";
/** Required services: settings (config namespace), projection registry, webserver (config route). */
export declare const inject: string[];
/** Re-apply every override onto the live price table (after load / edit / reset). */
declare function applyPriceOverrides(): void;
/** 弹窗显示行的唯一来源优先级：customRows → override.rows → 内置推导。
 *  override.rows 的峰谷行按北京时间解析出"此刻生效"的单价。 */
declare function priceRowsOf(provider: string | null, model: string | null, pricing?: ModelPricing | null, now?: number): BillingRow[];
interface FoldTurn {
    turn: number;
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    reasoning: number;
    cost: number;
    currency: string;
    model: string | null;
    startedAt: number;
    endedAt: number;
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
    realtimeOutputTokens: number;
    realtimeUpdatedAt: number;
    provider: string | null;
    model: string | null;
    stepStart: {
        turn: number;
        step: number;
        at: number;
    } | null;
    lastCostAt: number;
    turns: FoldTurn[];
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
    key: string;
    stateSchema: zod.ZodObject<{
        requestCount: zod.ZodCatch<zod.ZodNumber>;
        stepCount: zod.ZodCatch<zod.ZodNumber>;
        inputTokens: zod.ZodCatch<zod.ZodNumber>;
        outputTokens: zod.ZodCatch<zod.ZodNumber>;
        cacheReadTokens: zod.ZodCatch<zod.ZodNumber>;
        cacheWriteTokens: zod.ZodCatch<zod.ZodNumber>;
        reasoningTokens: zod.ZodCatch<zod.ZodNumber>;
        realtimeOutputTokens: zod.ZodCatch<zod.ZodNumber>;
        realtimeUpdatedAt: zod.ZodCatch<zod.ZodNumber>;
        provider: zod.ZodCatch<zod.ZodNullable<zod.ZodString>>;
        model: zod.ZodCatch<zod.ZodNullable<zod.ZodString>>;
        stepStart: zod.ZodCatch<zod.ZodNullable<zod.ZodObject<{
            turn: zod.ZodCatch<zod.ZodNumber>;
            step: zod.ZodCatch<zod.ZodNumber>;
            at: zod.ZodCatch<zod.ZodNumber>;
        }, zod.core.$strip>>>;
        lastCostAt: zod.ZodCatch<zod.ZodNumber>;
        turns: zod.ZodCatch<zod.ZodArray<zod.ZodObject<{
            turn: zod.ZodCatch<zod.ZodNumber>;
            input: zod.ZodCatch<zod.ZodNumber>;
            output: zod.ZodCatch<zod.ZodNumber>;
            cacheRead: zod.ZodCatch<zod.ZodNumber>;
            cacheWrite: zod.ZodCatch<zod.ZodNumber>;
            reasoning: zod.ZodCatch<zod.ZodNumber>;
            cost: zod.ZodCatch<zod.ZodNumber>;
            currency: zod.ZodCatch<zod.ZodString>;
            model: zod.ZodCatch<zod.ZodNullable<zod.ZodString>>;
            startedAt: zod.ZodCatch<zod.ZodNumber>;
            endedAt: zod.ZodCatch<zod.ZodNumber>;
            endReason: zod.ZodCatch<zod.ZodNullable<zod.ZodString>>;
        }, zod.core.$strip>>>;
        last: zod.ZodCatch<zod.ZodNullable<zod.ZodObject<{
            turn: zod.ZodCatch<zod.ZodNumber>;
            step: zod.ZodCatch<zod.ZodNumber>;
            input: zod.ZodCatch<zod.ZodNumber>;
            output: zod.ZodCatch<zod.ZodNumber>;
            cacheRead: zod.ZodCatch<zod.ZodNumber>;
            cacheWrite: zod.ZodCatch<zod.ZodNumber>;
            reasoning: zod.ZodCatch<zod.ZodNumber>;
        }, zod.core.$strip>>>;
    }, zod.core.$strip>;
    init(): FoldState;
    apply(state: FoldState, event: {
        type: string;
        data: Record<string, unknown>;
        time: number;
    }): FoldState;
    wire: {
        viewSchema: zod.ZodObject<{
            requestCount: zod.ZodNumber;
            stepCount: zod.ZodNumber;
            inputTokens: zod.ZodNumber;
            outputTokens: zod.ZodNumber;
            cacheReadTokens: zod.ZodNumber;
            cacheWriteTokens: zod.ZodNumber;
            reasoningTokens: zod.ZodNumber;
            realtimeOutputTokens: zod.ZodNumber;
            realtimeUpdatedAt: zod.ZodNumber;
            provider: zod.ZodNullable<zod.ZodString>;
            model: zod.ZodNullable<zod.ZodString>;
            pricing: zod.ZodNullable<zod.ZodObject<{
                inputPerM: zod.ZodCatch<zod.ZodNumber>;
                outputPerM: zod.ZodCatch<zod.ZodNumber>;
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
                    inputPerM: zod.ZodCatch<zod.ZodNumber>;
                    outputPerM: zod.ZodCatch<zod.ZodNumber>;
                    cacheReadPerM: zod.ZodOptional<zod.ZodNumber>;
                }, zod.core.$strict>>;
                offPeak: zod.ZodOptional<zod.ZodObject<{
                    inputPerM: zod.ZodCatch<zod.ZodNumber>;
                    outputPerM: zod.ZodCatch<zod.ZodNumber>;
                    cacheReadPerM: zod.ZodOptional<zod.ZodNumber>;
                }, zod.core.$strict>>;
                peakOffPeakFrom: zod.ZodOptional<zod.ZodNumber>;
                peakDays: zod.ZodOptional<zod.ZodArray<zod.ZodNumber>>;
                peakWindows: zod.ZodOptional<zod.ZodArray<zod.ZodObject<{
                    start: zod.ZodNumber;
                    end: zod.ZodNumber;
                }, zod.core.$strip>>>;
                weekend: zod.ZodOptional<zod.ZodObject<{
                    inputPerM: zod.ZodCatch<zod.ZodNumber>;
                    outputPerM: zod.ZodCatch<zod.ZodNumber>;
                    cacheReadPerM: zod.ZodOptional<zod.ZodNumber>;
                }, zod.core.$strict>>;
                customRows: zod.ZodOptional<zod.ZodArray<zod.ZodObject<{
                    label: zod.ZodString;
                    buckets: zod.ZodArray<zod.ZodEnum<{
                        input: "input";
                        cacheRead: "cacheRead";
                        cacheWrite: "cacheWrite";
                        output: "output";
                    }>>;
                    perM: zod.ZodNumber;
                    peakPerM: zod.ZodOptional<zod.ZodNumber>;
                    offPerM: zod.ZodOptional<zod.ZodNumber>;
                }, zod.core.$strip>>>;
            }, zod.core.$strict>>;
            basePricing: zod.ZodNullable<zod.ZodObject<{
                inputPerM: zod.ZodCatch<zod.ZodNumber>;
                outputPerM: zod.ZodCatch<zod.ZodNumber>;
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
                    inputPerM: zod.ZodCatch<zod.ZodNumber>;
                    outputPerM: zod.ZodCatch<zod.ZodNumber>;
                    cacheReadPerM: zod.ZodOptional<zod.ZodNumber>;
                }, zod.core.$strict>>;
                offPeak: zod.ZodOptional<zod.ZodObject<{
                    inputPerM: zod.ZodCatch<zod.ZodNumber>;
                    outputPerM: zod.ZodCatch<zod.ZodNumber>;
                    cacheReadPerM: zod.ZodOptional<zod.ZodNumber>;
                }, zod.core.$strict>>;
                peakOffPeakFrom: zod.ZodOptional<zod.ZodNumber>;
                peakDays: zod.ZodOptional<zod.ZodArray<zod.ZodNumber>>;
                peakWindows: zod.ZodOptional<zod.ZodArray<zod.ZodObject<{
                    start: zod.ZodNumber;
                    end: zod.ZodNumber;
                }, zod.core.$strip>>>;
                weekend: zod.ZodOptional<zod.ZodObject<{
                    inputPerM: zod.ZodCatch<zod.ZodNumber>;
                    outputPerM: zod.ZodCatch<zod.ZodNumber>;
                    cacheReadPerM: zod.ZodOptional<zod.ZodNumber>;
                }, zod.core.$strict>>;
                customRows: zod.ZodOptional<zod.ZodArray<zod.ZodObject<{
                    label: zod.ZodString;
                    buckets: zod.ZodArray<zod.ZodEnum<{
                        input: "input";
                        cacheRead: "cacheRead";
                        cacheWrite: "cacheWrite";
                        output: "output";
                    }>>;
                    perM: zod.ZodNumber;
                    peakPerM: zod.ZodOptional<zod.ZodNumber>;
                    offPerM: zod.ZodOptional<zod.ZodNumber>;
                }, zod.core.$strip>>>;
            }, zod.core.$strict>>;
            priceRows: zod.ZodArray<zod.ZodObject<{
                label: zod.ZodString;
                buckets: zod.ZodArray<zod.ZodEnum<{
                    input: "input";
                    cacheRead: "cacheRead";
                    cacheWrite: "cacheWrite";
                    output: "output";
                }>>;
                perM: zod.ZodOptional<zod.ZodNumber>;
                peakPerM: zod.ZodOptional<zod.ZodNumber>;
                offPerM: zod.ZodOptional<zod.ZodNumber>;
            }, zod.core.$strict>>;
            officialPrice: zod.ZodNullable<zod.ZodObject<{
                pricing: zod.ZodObject<{
                    inputPerM: zod.ZodCatch<zod.ZodNumber>;
                    outputPerM: zod.ZodCatch<zod.ZodNumber>;
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
                        inputPerM: zod.ZodCatch<zod.ZodNumber>;
                        outputPerM: zod.ZodCatch<zod.ZodNumber>;
                        cacheReadPerM: zod.ZodOptional<zod.ZodNumber>;
                    }, zod.core.$strict>>;
                    offPeak: zod.ZodOptional<zod.ZodObject<{
                        inputPerM: zod.ZodCatch<zod.ZodNumber>;
                        outputPerM: zod.ZodCatch<zod.ZodNumber>;
                        cacheReadPerM: zod.ZodOptional<zod.ZodNumber>;
                    }, zod.core.$strict>>;
                    peakOffPeakFrom: zod.ZodOptional<zod.ZodNumber>;
                    peakDays: zod.ZodOptional<zod.ZodArray<zod.ZodNumber>>;
                    peakWindows: zod.ZodOptional<zod.ZodArray<zod.ZodObject<{
                        start: zod.ZodNumber;
                        end: zod.ZodNumber;
                    }, zod.core.$strip>>>;
                    weekend: zod.ZodOptional<zod.ZodObject<{
                        inputPerM: zod.ZodCatch<zod.ZodNumber>;
                        outputPerM: zod.ZodCatch<zod.ZodNumber>;
                        cacheReadPerM: zod.ZodOptional<zod.ZodNumber>;
                    }, zod.core.$strict>>;
                    customRows: zod.ZodOptional<zod.ZodArray<zod.ZodObject<{
                        label: zod.ZodString;
                        buckets: zod.ZodArray<zod.ZodEnum<{
                            input: "input";
                            cacheRead: "cacheRead";
                            cacheWrite: "cacheWrite";
                            output: "output";
                        }>>;
                        perM: zod.ZodNumber;
                        peakPerM: zod.ZodOptional<zod.ZodNumber>;
                        offPerM: zod.ZodOptional<zod.ZodNumber>;
                    }, zod.core.$strip>>>;
                }, zod.core.$strict>;
                rows: zod.ZodArray<zod.ZodObject<{
                    label: zod.ZodString;
                    buckets: zod.ZodArray<zod.ZodEnum<{
                        input: "input";
                        cacheRead: "cacheRead";
                        cacheWrite: "cacheWrite";
                        output: "output";
                    }>>;
                    perM: zod.ZodOptional<zod.ZodNumber>;
                    peakPerM: zod.ZodOptional<zod.ZodNumber>;
                    offPerM: zod.ZodOptional<zod.ZodNumber>;
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
            balanceNeedsKey: zod.ZodBoolean;
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
            lastTurn: zod.ZodCatch<zod.ZodNullable<zod.ZodObject<{
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
            }, zod.core.$strict>>>;
            peakState: zod.ZodCatch<zod.ZodNullable<zod.ZodEnum<{
                peak: "peak";
                off: "off";
            }>>>;
            budget: zod.ZodNullable<zod.ZodNumber>;
            remainingBudget: zod.ZodNullable<zod.ZodNumber>;
        }, zod.core.$strict>;
        view(state: FoldState): UsageCostValue;
    };
    stateVersion: number;
};
/** Plugin entry: provide the service, register settings + the projection. */
export declare function apply(ctx: Context, config?: Record<string, unknown>): void;
export { BILLING_TYPES, Config, costBreakdown, costOf, usageCostProjection };
/** Test-only hooks: expose the save→apply→display pipeline internals so the
 *  consistency suite can drive the REAL host code (not a copy). Not part of
 *  the plugin contract; never consumed by the harness runtime. */
export declare const __testInternals: {
    readonly priceOverrides: Record<string, unknown>;
    applyPriceOverrides: typeof applyPriceOverrides;
    priceRowsOf: typeof priceRowsOf;
    currentPrices: {
        table: PriceTable;
        currency: string;
        updatedAt: number;
        usdToCny: number;
    };
    readonly spentSinceAnchor: number;
    setSpentSinceAnchor(v: number): void;
    readonly lastLiveAt: number;
    setCurrentBalance(s: BalanceSnapshot | null): void;
    readonly currentBalance: BalanceSnapshot | null;
    readonly balancesMap: Record<string, {
        balance: number;
        currency: string;
    }>;
};
