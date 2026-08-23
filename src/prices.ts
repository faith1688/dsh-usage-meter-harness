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
import { BUNDLED_TABLE } from './prices-providers.ts';
import type { ModelPricing } from './projection.ts';

/** Route key for a table row. `provider/model` is the primary shape. */
export type PriceKey = `${string}/${string}`;

/** Map remote-source provider keys onto the harness's provider route ids. */
const PROVIDER_ALIASES: Record<string, string> = {
  deepseek: 'deepseek-official',
  dashscope: 'qwen',
  zai: 'zhipu',
  'vertex_ai-language-models': 'gemini',
  volcengine: 'doubao',
  tencent: 'hunyuan',
  xfyun: 'iflytek',
};

/** DeepSeek domestic peak hours (UTC 1-4 & 6-10 = Beijing 9-12 & 14-18). */
export function isPeakHour(utcHour: number): boolean {
  return (utcHour >= 1 && utcHour < 4) || (utcHour >= 6 && utcHour < 10);
}

/** Resolve one pricing row to the rate active at `now` (peak/off-peak when applicable). */
export function resolvePricingForTime(pricing: ModelPricing, now: number): ModelPricing {
  if (pricing.peak === undefined || pricing.offPeak === undefined) return pricing;
  if (pricing.peakOffPeakFrom !== undefined && now < pricing.peakOffPeakFrom) return pricing;
  const active = isPeakHour(new Date(now).getUTCHours()) ? pricing.peak : pricing.offPeak;
  return {
    ...pricing,
    inputPerM: active.inputPerM,
    outputPerM: active.outputPerM,
    ...(active.cacheReadPerM !== undefined ? { cacheReadPerM: active.cacheReadPerM } : {}),
  };
}

/**
 * A sparse price table keyed by `provider/model`. Lookup tries the exact key,
 * then a `*` wildcard for the provider, then returns undefined.
 */
export class PriceTable {
  private rows: Map<PriceKey, ModelPricing>;

  constructor(rows: Record<PriceKey, ModelPricing> = {}) {
    this.rows = new Map(Object.entries(rows)) as Map<PriceKey, ModelPricing>;
  }

  get(provider: string, model: string): ModelPricing | undefined {
    return this.rows.get(`${provider}/${model}`) ?? this.rows.get(`${provider}/*`);
  }

  /** Exact-key lookup only (no wildcard) — used for user overrides/reset. */
  getRaw(key: string): ModelPricing | undefined {
    return this.rows.get(key as PriceKey);
  }

  /** Remove one exact row (reset of a user-overridden row with no bundled base). */
  removeRaw(key: string): void {
    this.rows.delete(key as PriceKey);
  }

  /** Merge a full set of rows (remote refresh / user override), keeping others. */
  merge(rows: Record<PriceKey, ModelPricing>): void {
    for (const [key, value] of Object.entries(rows)) this.rows.set(key as PriceKey, value);
  }

  get size(): number {
    return this.rows.size;
  }
}

/** The process-wide table the projection `view` reads; the service mutates it. */
export const currentPrices = {
  table: new PriceTable(BUNDLED_TABLE as unknown as Record<PriceKey, ModelPricing>),
  currency: 'CNY',
  updatedAt: 0,
  usdToCny: 7.2,
};

/** Fetch the live USD→CNY exchange rate (free, keyless source). */
export async function fetchUsdToCny(signal?: AbortSignal): Promise<number> {
  const url = 'https://open.er-api.com/v6/latest/USD';
  const res = signal === undefined ? await fetch(url) : await fetch(url, { signal });
  if (!res.ok) throw new Error(`exchange rate HTTP ${res.status}`);
  const doc = (await res.json()) as { rates?: { CNY?: unknown } };
  const rate = doc.rates?.CNY;
  if (typeof rate !== 'number' || rate <= 0) throw new Error('exchange rate: missing CNY rate');
  return rate;
}

/**
 * Normalize one LiteLLM `model_prices_and_context_window.json` entry. LiteLLM
 * prices in USD; keep USD native so the client converts for display.
 */
function fromLiteLLMEntry(entry: {
  input_cost_per_token?: number;
  output_cost_per_token?: number;
  cache_read_input_token_cost?: number;
  cache_creation_input_token_cost?: number;
}): ModelPricing | null {
  const input = entry.input_cost_per_token;
  const output = entry.output_cost_per_token;
  if (typeof input !== 'number' || typeof output !== 'number') return null;
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
export async function fetchRemotePrices(
  url: string,
  signal?: AbortSignal,
): Promise<Record<PriceKey, ModelPricing>> {
  const res = signal === undefined ? await fetch(url) : await fetch(url, { signal });
  if (!res.ok) throw new Error(`price source HTTP ${res.status}`);
  const doc = (await res.json()) as Record<string, unknown>;
  const rows: Record<PriceKey, ModelPricing> = {};
  for (const [modelId, raw] of Object.entries(doc)) {
    if (raw === null || typeof raw !== 'object') continue;
    const pricing = fromLiteLLMEntry(raw as Parameters<typeof fromLiteLLMEntry>[0]);
    if (pricing === null) continue;
    const entry = raw as { litellm_provider?: string };
    const rawProvider = entry.litellm_provider ?? modelId.split('/')[0] ?? '';
    const provider = PROVIDER_ALIASES[rawProvider] ?? rawProvider;
    rows[`${provider}/${modelId}`] = pricing;
  }
  return rows;
}
