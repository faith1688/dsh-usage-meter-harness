/**
 * The `usageCost` session-projection value type, its pure cost math, and its
 * merge into the shared {@link SessionProjectionMap}. One module owns both the
 * shape and the declaration-merge so the backend fold, the wire schema, and
 * the client readout all reference the same symbols.
 *
 * The value served for one session is fully host-computed: token buckets
 * (disjoint, mirroring `TokenUsage`), per-turn costs in each turn's native
 * currency, a display-currency total (`estimatedCost`), the live balance
 * (`accountBalance`) and the user budget (`budget`/`remainingBudget`). The
 * browser only converts between currencies for display; it never re-computes
 * accounting.
 *
 * @module dsh-usage-meter-harness/projection
 */
import type { SessionProjectionMap } from '@deepseek-ai/dsh-session-projection/types';

/** Peak / off-peak rates for time-of-day billing (DeepSeek domestic). */
export interface PeakRates {
  inputPerM: number;
  outputPerM: number;
  cacheReadPerM?: number;
}

/** Per-million-token pricing for one model route. */
export interface ModelPricing {
  /** Price per 1M uncached input tokens, in the model's native currency. */
  inputPerM: number;
  /** Price per 1M output tokens (reasoning is a subdivision of output — not billed twice). */
  outputPerM: number;
  /** Price per 1M cache-read tokens; falls back to `inputPerM` when absent. */
  cacheReadPerM?: number;
  /** Price per 1M cache-write tokens; falls back to `inputPerM` when absent. */
  cacheWritePerM?: number;
  /** COMBINED billing (讯飞/百川 style): one rate for ALL tokens. */
  combinedPerM?: number;
  /** Whole-cost multiplier (e.g. Batch ×0.5). */
  discount?: number;
  /** Peak-hour rates (inputPerM/outputPerM/cacheReadPerM); requires `offPeak`. */
  peak?: PeakRates;
  /** Off-peak-hour rates; requires `peak`. */
  offPeak?: PeakRates;
  /** Epoch ms from which peak/off-peak pricing applies (before it, base rates). */
  peakOffPeakFrom?: number;
  /**
   * Beijing weekday numbers (0=Sun .. 6=Sat) on which peak/off-peak splitting
   * applies; days NOT listed (e.g. Sat/Sun) are billed flat. Omit → all 7 days split.
   */
  peakDays?: number[];
  /** Peak-hour windows in BEIJING hours [0,24); e.g. [{start:9,end:12},{start:14,end:18}]. */
  peakWindows?: Array<{ start: number; end: number }>;
  /** Flat per-token rate for days NOT in `peakDays` (weekend); falls back to `offPeak` when absent. */
  weekend?: PeakRates;
  /** Billing currency, e.g. `CNY` / `USD`. */
  currency?: string;
  /** Epoch ms when this price was last refreshed. */
  updatedAt?: number;
  /** Where the price came from (`bundled` / `remote` / `user`). */
  source?: 'bundled' | 'remote' | 'user';
  /**
   * Custom user-defined unit-price rows (R5). When present and non-empty it is
   * the authoritative cost model: the whole cost = Σ per row `perM` × (tokens
   * of the buckets in that row). Rows bill at a FLAT rate per row (`perM`);
   * the peak/off-peak split is only applied by the legacy bucket path (v1).
   */
  customRows?: ModelPricingRow[];
}

/** One user-defined unit-price row (R5): a label + which token buckets it bills
 *  + the per-1M-token price for the SUM of those buckets. */
export interface ModelPricingRow {
  label: string;
  buckets: Array<'input' | 'cacheRead' | 'cacheWrite' | 'output'>;
  perM: number;
  /** Peak-window per-1M rate (overrides `perM` inside the peak window). */
  peakPerM?: number;
  /** Off-peak per-1M rate (defaults to `perM` when absent). */
  offPerM?: number;
}

/** One row of the per-model 用量 template: a label + which token buckets it sums. */
export interface BillingRow {
  label: string;
  buckets: Array<'input' | 'cacheRead' | 'cacheWrite' | 'output'>;
  /** Per-1M unit price carried by CUSTOM rows (R5); the readout uses it so a
   *  custom-row model shows its real unit price instead of a 0 from the legacy
   *  bucket fields. Present only on rows derived from `customRows`. */
  perM?: number;
  /** Flat-price (峰谷未启用) rows carry perM only. Peak/off-peak rows carry
   *  BOTH — the popup resolves which one applies by Beijing time. */
  peakPerM?: number;
  offPerM?: number;
}

/** Per-bucket cost breakdown of one usage sample (each in the pricing currency). */
export interface CostBreakdown {
  input: number;
  cacheRead: number;
  cacheWrite: number;
  output: number;
  total: number;
}

/** One turn's cost & token ledger (used by the 每轮费用 list). */
export interface TurnCost {
  turn: number;
  /** Native-currency cost of the turn (NOT display-converted). */
  cost: number;
  currency: string;
  model: string | null;
  startedAt: number;
  endedAt: number;
  endReason: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  reasoningTokens: number;
}

/** Live account balance served for one provider (DeepSeek API or funded ledger). */
export interface AccountBalance {
  currency: string;
  totalBalance: number;
  updatedAt: number;
  source: 'api' | 'computed';
}

/** Official bundled pricing + row template for the current model (for the reset button). */
export interface OfficialPrice {
  pricing: ModelPricing;
  rows: BillingRow[];
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
  /** Live streamed-output estimate from text/reasoning deltas (4 chars ≈ 1 token). */
  realtimeOutputTokens: number;
  /** Epoch ms of the last streamed-delta sample (0 = none yet). */
  realtimeUpdatedAt: number;
  /** Provider route of the latest request; null before any request. */
  provider: string | null;
  /** Model id of the latest request; null before any request. */
  model: string | null;
  /** Resolved pricing for the current route at "now" (peak/off-peak applied); null while unknown. */
  pricing: ModelPricing | null;
  /** The raw (un-resolved) pricing row backing `pricing`; null while unknown. */
  basePricing: ModelPricing | null;
  /** The per-model 用量 template rows (drives the detail card's 单价 column). */
  priceRows: BillingRow[];
  /** Official bundled pricing + rows for the current model (reset baseline); null when custom. */
  officialPrice: OfficialPrice | null;
  /** Display-currency total of every turn's cost (converted from each turn's native currency). */
  estimatedCost: number;
  /** Billing currency for `estimatedCost` / `budget` / `remainingBudget`. */
  currency: string;
  /** Latest USD→CNY rate (fallback 7.2); only meaningful when a conversion is active. */
  usdToCny: number;
  /** Epoch ms of the last successful exchange-rate fetch (0 = never). */
  rateUpdatedAt: number;
  /** Live account balance (DeepSeek API or funded ledger); null while unavailable. */
  accountBalance: AccountBalance | null;
  /** True when a DeepSeek balance SHOULD be shown but no value was fetched
   *  (the DeepSeek API key is missing/invalid, or the fetch failed). */
  balanceNeedsKey: boolean;
  /** Per-turn cost ledger (most recent last). */
  turns: TurnCost[];
  /** The latest turn (in-progress or just finished); null before the first turn.
   *  Powers the popup's 本轮 readout — it starts at zero each turn and grows
   *  as usage events land. */
  lastTurn: TurnCost | null;
  /** Peak/off-peak state of the CURRENT model's pricing at "now":
   *  'peak' | 'off'; null when the model has no peak/off-peak pricing. */
  peakState: 'peak' | 'off' | null;
  /** User-configured budget in `currency`; null = no budget set. */
  budget: number | null;
  /** `budget - estimatedCost`; null when no budget is set (may be negative). */
  remainingBudget: number | null;
}

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionMap {
    usageCost: UsageCostValue;
  }
}

/** Sum the three disjoint prompt-side billing buckets. */
export function billedInputTokens(
  v: Pick<UsageCostValue, 'inputTokens' | 'cacheReadTokens' | 'cacheWriteTokens'>,
): number {
  return v.inputTokens + v.cacheReadTokens + v.cacheWriteTokens;
}

/** Price (per 1M tokens) for a bucket under a resolved pricing row (undefined while pricing is unknown). */
export function bucketPricePerM(p: ModelPricing | null, b: BillingRow['buckets'][number]): number | undefined {
  if (p === null) return undefined;
  // COMBINED billing (讯飞/百川): one rate for ALL tokens.
  if (p.combinedPerM !== undefined) return p.combinedPerM;
  switch (b) {
    case 'input':
      return p.inputPerM;
    case 'cacheRead':
      return p.cacheReadPerM ?? p.inputPerM;
    case 'cacheWrite':
      return p.cacheWritePerM ?? p.inputPerM;
    case 'output':
      return p.outputPerM;
  }
}

/** Bucket-by-bucket cost (each bucket × its own price); 0 while pricing is unknown. */
export function costBreakdown(
  usage: Pick<UsageCostValue, 'inputTokens' | 'outputTokens' | 'cacheReadTokens' | 'cacheWriteTokens'>,
  pricing: ModelPricing | null,
): CostBreakdown {
  if (pricing === null) {
    return { input: 0, cacheRead: 0, cacheWrite: 0, output: 0, total: 0 };
  }
  const perM = (v: number) => v / 1_000_000;
  const discount = pricing.discount ?? 1;
  // COMBINED billing (讯飞/百川 style): all tokens at one rate; the whole cost
  // is attributed to the input bucket so a single combined row renders it.
  if (pricing.combinedPerM !== undefined) {
    const all = usage.inputTokens + usage.cacheReadTokens + usage.cacheWriteTokens + usage.outputTokens;
    const total = all * perM(pricing.combinedPerM) * discount;
    return { input: total, cacheRead: 0, cacheWrite: 0, output: 0, total };
  }
  // CUSTOM rows (R5): cost = Σ over the user-defined rows, each billing `perM`
  // × the token counts of its buckets. Whenever custom rows are present they are
  // the authoritative model; the fixed bucket split below does not apply.
  if (pricing.customRows !== undefined && pricing.customRows.length > 0) {
    const byBucket: Record<'input' | 'cacheRead' | 'cacheWrite' | 'output', number> = {
      input: usage.inputTokens,
      cacheRead: usage.cacheReadTokens,
      cacheWrite: usage.cacheWriteTokens,
      output: usage.outputTokens,
    };
    let total = 0;
    for (const r of pricing.customRows) {
      const tokens = r.buckets.reduce((s, b) => s + (byBucket[b] ?? 0), 0);
      total += tokens * perM(r.perM) * discount;
    }
    return { input: total, cacheRead: 0, cacheWrite: 0, output: 0, total };
  }
  const input = usage.inputTokens * perM(pricing.inputPerM) * discount;
  const cacheRead = usage.cacheReadTokens * perM(pricing.cacheReadPerM ?? pricing.inputPerM) * discount;
  const cacheWrite = usage.cacheWriteTokens * perM(pricing.cacheWritePerM ?? pricing.inputPerM) * discount;
  const output = usage.outputTokens * perM(pricing.outputPerM) * discount;
  return { input, cacheRead, cacheWrite, output, total: input + cacheRead + cacheWrite + output };
}

/** Cost of one usage sample under a pricing table (0 while pricing is unknown). */
export function costOf(
  usage: Pick<UsageCostValue, 'inputTokens' | 'outputTokens' | 'cacheReadTokens' | 'cacheWriteTokens'>,
  pricing: ModelPricing | null,
): number {
  return costBreakdown(usage, pricing).total;
}
