/**
 * Cohere — official USD rates (docs.cohere.com, 2026-08-16 采集).
 * 计费：类型一（输入+输出分开）。
 */
import type { ModelPricing } from '../../projection.ts'
import type { PriceKey } from '../index.ts'

export const cohereModels: Record<PriceKey, ModelPricing> = {
  'cohere/command-a-plus': { inputPerM: 2.5, outputPerM: 10, currency: 'USD', source: 'bundled' },
  'cohere/command-a': { inputPerM: 2.5, outputPerM: 10, currency: 'USD', source: 'bundled' },
  'cohere/command-r-plus': { inputPerM: 2.5, outputPerM: 10, currency: 'USD', source: 'bundled' },
  'cohere/command-r': { inputPerM: 0.15, outputPerM: 0.6, currency: 'USD', source: 'bundled' },
}
