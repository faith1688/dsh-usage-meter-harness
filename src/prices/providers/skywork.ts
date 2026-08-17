/**
 * Kunlun Wanwei Skywork 昆仑万维 — official skywork.ai CNY（2026-08-16 媒体多源核实版）。
 * 计费：类型一（输入+输出分开）。
 */
import type { ModelPricing } from '../../projection.ts'
import type { PriceKey } from '../index.ts'

export const skyworkModels: Record<PriceKey, ModelPricing> = {
  'skywork/skyclaw-v1.0': { inputPerM: 0.5, outputPerM: 4, currency: 'CNY', source: 'bundled' },
  'skywork/skyclaw-v1.0-lite': { inputPerM: 0.3, outputPerM: 2, currency: 'CNY', source: 'bundled' },
}
