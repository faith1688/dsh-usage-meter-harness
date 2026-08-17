/**
 * Price resolution: a bundled fallback table (one module per provider under
 * `./providers/`), an optional remote source, and time-of-day (peak/off-peak)
 * resolution for providers that bill that way (DeepSeek V4).
 *
 * Every mainstream provider bills the SAME way — `input (uncached)`,
 * `cache-read`, `cache-write`, `output` tokens × per-million prices — so the
 * computation (`costOf`/`costBreakdown` in projection.ts) is shared by all
 * vendors; each provider directory only supplies its own pricing data (+ any
 * vendor-specific structure such as DeepSeek's peak/off-peak). Updating one
 * provider's models never affects another's.
 *
 * Canonical currency is CNY (the DeepSeek official pricing unit). Remote
 * sources that price in USD are converted with the live exchange rate.
 *
 * @module @deepseek-ai/dsh-usage-meter/prices
 */
import type { ModelPricing, PeakOffPeakRates } from '../projection.ts'
import { anthropicModels } from './providers/anthropic.ts'
import { baichuanModels } from './providers/baichuan.ts'
import { baiduModels } from './providers/baidu.ts'
import { cohereModels } from './providers/cohere.ts'
import { deepseekModels } from './providers/deepseek.ts'
import { doubaoModels } from './providers/doubao.ts'
import { geminiModels } from './providers/gemini.ts'
import { hunyuanModels } from './providers/hunyuan.ts'
import { iflytekModels } from './providers/iflytek.ts'
import { minimaxModels } from './providers/minimax.ts'
import { mistralModels } from './providers/mistral.ts'
import { moonshotModels } from './providers/moonshot.ts'
import { openaiModels } from './providers/openai.ts'
import { qwenModels } from './providers/qwen.ts'
import { skyworkModels } from './providers/skywork.ts'
import { stepfunModels } from './providers/stepfun.ts'
import { xaiModels } from './providers/xai.ts'
import { xiaomiModels } from './providers/xiaomi.ts'
import { zhipuModels } from './providers/zhipu.ts'

/** Route key for a table row. `provider/model` is the primary shape. */
export type PriceKey = `${string}/${string}`

/** Map remote-source provider keys onto the harness's provider route ids. */
const PROVIDER_ALIASES: Record<string, string> = {
  deepseek: 'deepseek-official',
  dashscope: 'qwen',
  zai: 'zhipu',
  'vertex_ai-language-models': 'gemini',
  volcengine: 'doubao',
  tencent: 'hunyuan',
  xfyun: 'iflytek',
}

function isPeakHour(utcHour: number): boolean {
  return (utcHour >= 1 && utcHour < 4) || (utcHour >= 6 && utcHour < 10)
}

/** Resolve one pricing row to the rate active at `now` (peak/off-peak when applicable). */
export function resolvePricingForTime(pricing: ModelPricing, now: number): ModelPricing {
  if (pricing.peak === undefined || pricing.offPeak === undefined) return pricing
  if (pricing.peakOffPeakFrom !== undefined && now < pricing.peakOffPeakFrom) return pricing
  const active: PeakOffPeakRates = isPeakHour(new Date(now).getUTCHours()) ? pricing.peak : pricing.offPeak
  return {
    ...pricing,
    inputPerM: active.inputPerM,
    outputPerM: active.outputPerM,
    ...(active.cacheReadPerM !== undefined ? { cacheReadPerM: active.cacheReadPerM } : {}),
  }
}

/** Aggregate of every provider's bundled models (snapshot 2026-08-16; sources per provider file). */
const BUNDLED: Record<PriceKey, ModelPricing> = {
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
}

/** The pristine bundled table — the "reset to official defaults" base for user price overrides. */
export const BUNDLED_TABLE: Record<string, ModelPricing> = BUNDLED

/**
 * A sparse price table keyed by `provider/model`. Lookup tries the exact key,
 * then a `*` wildcard for the provider, then returns undefined.
 */
export class PriceTable {  private rows: Map<string, ModelPricing>

  constructor(rows: Record<PriceKey, ModelPricing> = {}) {
    this.rows = new Map(Object.entries(rows))
  }

  get(provider: string, model: string): ModelPricing | undefined {
    return this.rows.get(`${provider}/${model}`) ?? this.rows.get(`${provider}/*`)
  }

  /** Exact-key lookup only (no wildcard) — used for user overrides/reset. */
  getRaw(key: string): ModelPricing | undefined {
    return this.rows.get(key)
  }

  /** Remove one exact row (reset of a user-overridden row with no bundled base). */
  removeRaw(key: string): void {
    this.rows.delete(key)
  }

  /** Merge a full set of rows (remote refresh / user override), keeping others. */
  merge(rows: Record<PriceKey, ModelPricing>): void {
    for (const [key, value] of Object.entries(rows)) this.rows.set(key, value)
  }

  get size(): number {
    return this.rows.size
  }
}

/** The process-wide table the projection `view` reads; the service mutates it. */
export const currentPrices = {
  table: new PriceTable(BUNDLED),
  currency: 'CNY',
  updatedAt: 0,
  usdToCny: 7.2,
}

/** Fetch the live USD→CNY exchange rate (free, keyless source). */
export async function fetchUsdToCny(signal?: AbortSignal): Promise<number> {
  const url = 'https://open.er-api.com/v6/latest/USD'
  const res = signal === undefined ? await fetch(url) : await fetch(url, { signal })
  if (!res.ok) throw new Error(`exchange rate HTTP ${res.status}`)
  const doc = (await res.json()) as { rates?: Record<string, unknown> }
  const rate = doc.rates?.CNY
  if (typeof rate !== 'number' || rate <= 0) throw new Error('exchange rate: missing CNY rate')
  return rate
}

/**
 * Normalize one LiteLLM `model_prices_and_context_window.json` entry. LiteLLM
 * prices in USD; keep USD native so the client converts for display.
 */
function fromLiteLLMEntry(entry: {
  input_cost_per_token?: number
  output_cost_per_token?: number
  cache_read_input_token_cost?: number
  cache_creation_input_token_cost?: number
}): ModelPricing | null {
  const input = entry.input_cost_per_token
  const output = entry.output_cost_per_token
  if (typeof input !== 'number' || typeof output !== 'number') return null
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
  }
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
  const res = signal === undefined ? await fetch(url) : await fetch(url, { signal })
  if (!res.ok) throw new Error(`price source HTTP ${res.status}`)
  const doc = (await res.json()) as Record<string, unknown>
  const rows: Record<PriceKey, ModelPricing> = {}
  for (const [modelId, raw] of Object.entries(doc)) {
    if (raw === null || typeof raw !== 'object') continue
    const pricing = fromLiteLLMEntry(raw as Parameters<typeof fromLiteLLMEntry>[0])
    if (pricing === null) continue
    const entry = raw as { litellm_provider?: string }
    const rawProvider = entry.litellm_provider ?? modelId.split('/')[0] ?? ''
    const provider = PROVIDER_ALIASES[rawProvider] ?? rawProvider
    rows[`${provider}/${modelId}`] = pricing
  }
  return rows
}
