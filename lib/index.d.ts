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
    /** Server-side directory for exported/imported billing configs
     *  (empty = $DSH_HOME/usage-meter; persists across DSH upgrades). */
    billingConfigDir: z<string, string>;
    /** 包装标记（视觉插件加在提供商/模型名上的前后缀），逐行可开关：
     *  新格式为 `[{pattern, enabled}]`；老格式（纯文本，换行分隔）仍可读，
     *  读取时自动补齐包装提供商相关的新默认行。命中即按底层 provider/model
     *  计费/聚合/查余额。用 `any` 承载两种形态，校验/归一在 wrapper.ts 内完成。 */
    wrapperMarkers: z<any, any>;
    /** 全局预算告警阈值（% 使用到 budget 的多少时预警，0/diff 关闭）。 */
    budgetAlertPct: z<number, number>;
    /** 全局余额告警下限（余额低于该金额预警；0 = 关闭）。 */
    balanceAlertFloor: z<number, number>;
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
    /** Server-side directory for exported/imported billing configs
     *  (empty = $DSH_HOME/usage-meter; persists across DSH upgrades). */
    billingConfigDir: z<string, string>;
    /** 包装标记（视觉插件加在提供商/模型名上的前后缀），逐行可开关：
     *  新格式为 `[{pattern, enabled}]`；老格式（纯文本，换行分隔）仍可读，
     *  读取时自动补齐包装提供商相关的新默认行。命中即按底层 provider/model
     *  计费/聚合/查余额。用 `any` 承载两种形态，校验/归一在 wrapper.ts 内完成。 */
    wrapperMarkers: z<any, any>;
    /** 全局预算告警阈值（% 使用到 budget 的多少时预警，0/diff 关闭）。 */
    budgetAlertPct: z<number, number>;
    /** 全局余额告警下限（余额低于该金额预警；0 = 关闭）。 */
    balanceAlertFloor: z<number, number>;
}>>;
/** Stable Cordis plugin name. */
export declare const name = "usage-meter";
/**
 * Required services. Only the two the meter cannot work without.
 *
 * `webServer` and `llm` are deliberately NOT declared here, for the same reason
 * the client plugin does not declare `locale`: cordis has no optional inject, so
 * a declared service that a composition never provides parks this plugin in
 * PENDING forever — `apply` never runs and the plugin silently does not exist.
 * Both are read through `ctx.get(...)` probes below instead: with no webServer
 * the HTTP settings routes are skipped (the readout and the projection still
 * work), with no llm the provider/model listing degrades to empty.
 */
export declare const inject: string[];
/** 用量看板聚合：按 (底层 provider, model) 累计真实 token/费用（只读会话事件，不碰计费/余额）。 */
interface StatsBucket {
    provider: string;
    model: string;
    requestCount: number;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    reasoningTokens: number;
    cost: number;
    inputCost: number;
    cacheReadCost: number;
    cacheWriteCost: number;
    outputCost: number;
    currency: string;
    updatedAt: number;
}
interface ThreshDef {
    budgetAlertPct?: number;
    balanceAlertFloor?: number;
    followProvider?: boolean;
}
/** Re-apply every override onto the live price table (after load / edit / reset). */
declare function applyPriceOverrides(): void;
/** 弹窗显示行的唯一来源优先级：customRows → override.rows → 内置推导。
 *  override.rows 的峰谷行按北京时间解析出"此刻生效"的单价。 */
declare function priceRowsOf(provider: string | null, model: string | null, pricing?: ModelPricing | null, now?: number): BillingRow[];
/** 包装标记识别：视觉插件把 **提供商 id** 包成 `modlens-<provider>` / `<provider>-modlens`
 *  （老版本是 `vision-toolkit-<provider>`），显示名加 ` (modlens vision)`，模型 id 不变。
 *  只剥模型名后缀无法映射回底层提供商 → 定价/余额/独立 Key/统计全部落空。
 *  这里对 provider 与 model 两侧都剥（标记表见 wrapper.ts，逐行可开关）。 */
declare function underlyingProvider(provider: string | null): string | null;
/** 当前生效的包装标记「行表」（含未开启行），设置页据此渲染逐行开关。 */
declare function wrapperRowList(cfg: Record<string, unknown>): Array<{
    pattern: string;
    enabled: boolean;
}>;
/** 归一化 (provider, model) 到「底层」绑定：剥包装前缀/后缀（提供商与模型两侧）。 */
declare function modelBinding(provider: string | null, model: string | null): {
    real: string;
    model: string;
} | null;
/** 每模型独立 API key / 余额快照的文件名安全键。 */
declare function modelSafeKey(provider: string | null, model: string | null): string | null;
/** 该模型的余额来源：显式设置优先；否则 DeepSeek 路由默认官方、其余默认手动（向后兼容）。 */
declare function balanceSourceOf(provider: string | null, model: string | null): 'manual' | 'deepseek';
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
    /** 本轮实际归属的底层提供商（显示统计用，不参与计费）。 */
    provider: string | null;
    startedAt: number;
    endedAt: number;
    endReason: string | null;
    /** 本轮各计费桶的金额（实际峰谷价；分项展示用，不参与计算）。 */
    inputCost: number;
    cacheReadCost: number;
    cacheWriteCost: number;
    outputCost: number;
    /** 本轮最近一次计费是否处于峰时段（显示用；仅峰谷计费模型有值）。 */
    peak: boolean;
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
            inputCost: zod.ZodCatch<zod.ZodNumber>;
            cacheReadCost: zod.ZodCatch<zod.ZodNumber>;
            cacheWriteCost: zod.ZodCatch<zod.ZodNumber>;
            outputCost: zod.ZodCatch<zod.ZodNumber>;
            currency: zod.ZodCatch<zod.ZodString>;
            model: zod.ZodCatch<zod.ZodNullable<zod.ZodString>>;
            startedAt: zod.ZodCatch<zod.ZodNumber>;
            endedAt: zod.ZodCatch<zod.ZodNumber>;
            endReason: zod.ZodCatch<zod.ZodNullable<zod.ZodString>>;
            provider: zod.ZodCatch<zod.ZodNullable<zod.ZodString>>;
            peak: zod.ZodCatch<zod.ZodBoolean>;
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
                inputCost: zod.ZodCatch<zod.ZodNumber>;
                cacheReadCost: zod.ZodCatch<zod.ZodNumber>;
                cacheWriteCost: zod.ZodCatch<zod.ZodNumber>;
                outputCost: zod.ZodCatch<zod.ZodNumber>;
                provider: zod.ZodCatch<zod.ZodNullable<zod.ZodString>>;
                peak: zod.ZodCatch<zod.ZodBoolean>;
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
                inputCost: zod.ZodCatch<zod.ZodNumber>;
                cacheReadCost: zod.ZodCatch<zod.ZodNumber>;
                cacheWriteCost: zod.ZodCatch<zod.ZodNumber>;
                outputCost: zod.ZodCatch<zod.ZodNumber>;
                provider: zod.ZodCatch<zod.ZodNullable<zod.ZodString>>;
                peak: zod.ZodCatch<zod.ZodBoolean>;
            }, zod.core.$strict>>>;
            peakState: zod.ZodCatch<zod.ZodNullable<zod.ZodEnum<{
                peak: "peak";
                off: "off";
            }>>>;
            budget: zod.ZodNullable<zod.ZodNumber>;
            remainingBudget: zod.ZodNullable<zod.ZodNumber>;
            alertBudgetPct: zod.ZodCatch<zod.ZodNumber>;
            alertBalanceFloor: zod.ZodCatch<zod.ZodNumber>;
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
    modelBinding: typeof modelBinding;
    underlyingProvider: typeof underlyingProvider;
    balanceSourceOf: typeof balanceSourceOf;
    modelSafeKey: typeof modelSafeKey;
    wrapperRowList: typeof wrapperRowList;
    readonly statsMap: Record<string, StatsBucket>;
    readonly thresholdsMap: Record<string, ThreshDef>;
    readonly providerConfigsMap: Record<string, {
        currency?: string;
        sharedBalance?: boolean;
        sharedApiKey?: boolean;
    }>;
    readonly balanceSourcesMap: Record<string, "manual" | "deepseek">;
    readonly modelApiKeyFlagsMap: Record<string, boolean>;
};
