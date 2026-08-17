/** StepFun 阶跃星辰 — official CNY rates (platform.stepfun.com, 2026-08). */
import type { ModelPricing } from '../../projection.ts'
import type { PriceKey } from '../index.ts'

export const stepfunModels: Record<PriceKey, ModelPricing> = {
  'stepfun/step-3.7-flash': { inputPerM: 1.35, outputPerM: 8.1, cacheReadPerM: 0.27, currency: 'CNY', source: 'bundled' },
  'stepfun/step-3.5-flash': { inputPerM: 0.7, outputPerM: 2.1, cacheReadPerM: 0.14, currency: 'CNY', source: 'bundled' },
  'stepfun/step-3.5-flash-2603': { inputPerM: 0.7, outputPerM: 2.1, cacheReadPerM: 0.14, currency: 'CNY', source: 'bundled' },
  'stepfun/step-1o-turbo-vision': { inputPerM: 2.5, outputPerM: 8, cacheReadPerM: 0.5, currency: 'CNY', source: 'bundled' },
}
