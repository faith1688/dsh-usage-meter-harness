/**
 * Mistral — official USD rates (docs.mistral.ai/models/pricing, 2026-08-16 采集).
 * 计费：类型三+七 — 缓存输入 = 0.1×输入价；Batch ×0.5。
 */
import type { ModelPricing } from '../../projection.ts'
import type { PriceKey } from '../index.ts'

export const mistralModels: Record<PriceKey, ModelPricing> = {
  'mistral/mistral-large-latest': { inputPerM: 0.5, outputPerM: 1.5, cacheReadPerM: 0.05, currency: 'USD', source: 'bundled' },
  'mistral/mistral-medium-latest': { inputPerM: 1.5, outputPerM: 7.5, cacheReadPerM: 0.15, currency: 'USD', source: 'bundled' },
  'mistral/mistral-small-latest': { inputPerM: 0.15, outputPerM: 0.6, cacheReadPerM: 0.015, currency: 'USD', source: 'bundled' },
  'mistral/codestral-latest': { inputPerM: 0.3, outputPerM: 0.9, cacheReadPerM: 0.03, currency: 'USD', source: 'bundled' },
  'mistral/ministral-3-14b': { inputPerM: 0.2, outputPerM: 0.2, cacheReadPerM: 0.02, currency: 'USD', source: 'bundled' },
  'mistral/ministral-3-8b': { inputPerM: 0.15, outputPerM: 0.15, cacheReadPerM: 0.015, currency: 'USD', source: 'bundled' },
  'mistral/ministral-3-3b': { inputPerM: 0.1, outputPerM: 0.1, cacheReadPerM: 0.01, currency: 'USD', source: 'bundled' },
}
