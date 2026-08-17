/**
 * Anthropic Claude — official USD rates (platform.claude.com pricing, 2026-08-16 采集).
 * 计费：类型三 — 5m 缓存写 1.25×输入、1h 缓存写 2×输入、命中 0.1×输入；Batch ×0.5。
 * 本表 cacheWritePerM 取 5m 档（1.25×）；1h 档为 2×（未单列）。
 * ⚰️ 已退役（2026-08-05/06-15/02-19）：opus-4-1、sonnet-4/opus-4、3-7-sonnet、3-5-sonnet/haiku。
 */
import type { ModelPricing } from '../../projection.ts'
import type { PriceKey } from '../index.ts'

export const anthropicModels: Record<PriceKey, ModelPricing> = {
  // 旗舰（可用）
  'anthropic/claude-fable-5': { inputPerM: 10, outputPerM: 50, cacheReadPerM: 1, cacheWritePerM: 12.5, currency: 'USD', source: 'bundled' },
  'anthropic/claude-mythos-5': { inputPerM: 10, outputPerM: 50, cacheReadPerM: 1, cacheWritePerM: 12.5, currency: 'USD', source: 'bundled' },
  'anthropic/claude-opus-5': { inputPerM: 5, outputPerM: 25, cacheReadPerM: 0.5, cacheWritePerM: 6.25, currency: 'USD', source: 'bundled' },
  'anthropic/claude-opus-4-8': { inputPerM: 5, outputPerM: 25, cacheReadPerM: 0.5, cacheWritePerM: 6.25, currency: 'USD', source: 'bundled' },
  'anthropic/claude-opus-4-7': { inputPerM: 5, outputPerM: 25, cacheReadPerM: 0.5, cacheWritePerM: 6.25, currency: 'USD', source: 'bundled' },
  'anthropic/claude-opus-4-6': { inputPerM: 5, outputPerM: 25, cacheReadPerM: 0.5, cacheWritePerM: 6.25, currency: 'USD', source: 'bundled' },
  'anthropic/claude-opus-4-5': { inputPerM: 5, outputPerM: 25, cacheReadPerM: 0.5, cacheWritePerM: 6.25, currency: 'USD', source: 'bundled' },
  // 中端与轻量（可用）
  'anthropic/claude-sonnet-5': { inputPerM: 2, outputPerM: 10, cacheReadPerM: 0.2, cacheWritePerM: 2.5, currency: 'USD', source: 'bundled' },
  'anthropic/claude-sonnet-4-6': { inputPerM: 3, outputPerM: 15, cacheReadPerM: 0.3, cacheWritePerM: 3.75, currency: 'USD', source: 'bundled' },
  'anthropic/claude-sonnet-4-5': { inputPerM: 3, outputPerM: 15, cacheReadPerM: 0.3, cacheWritePerM: 3.75, currency: 'USD', source: 'bundled' },
  'anthropic/claude-haiku-4-5': { inputPerM: 1, outputPerM: 5, cacheReadPerM: 0.1, cacheWritePerM: 1.25, currency: 'USD', source: 'bundled' },
}
