/**
 * xAI Grok — official USD rates (x.ai/api, 2026-08-16 采集).
 * 计费：类型一（官方未提供缓存计价）。grok-3/3-mini/4/4-fast 未出现在当前官方定价页（可能下架），
 * 选型以 grok-4.5/4.6 为准。
 */
import type { ModelPricing } from '../../projection.ts'
import type { PriceKey } from '../index.ts'

export const xaiModels: Record<PriceKey, ModelPricing> = {
  'xai/grok-4.6': { inputPerM: 2, outputPerM: 6, currency: 'USD', source: 'bundled' },
  'xai/grok-4.5': { inputPerM: 2, outputPerM: 6, currency: 'USD', source: 'bundled' },
}
