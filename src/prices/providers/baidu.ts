/**
 * Baidu ERNIE 百度文心 — official 千帆 cloud.baidu.com CNY rates（2026-08-16 三轮核实版）。
 * 计费：类型一+五 — 原始单位元/千tokens 已 ×1000 换算为元/1M；ernie-5.0 取 ≤32K 档。
 */
import type { ModelPricing } from '../../projection.ts'
import type { PriceKey } from '../index.ts'

export const baiduModels: Record<PriceKey, ModelPricing> = {
  'baidu/ernie-5.0': { inputPerM: 6, outputPerM: 24, currency: 'CNY', source: 'bundled' },
  'baidu/ernie-5.1': { inputPerM: 4, outputPerM: 18, currency: 'CNY', source: 'bundled' },
  'baidu/ernie-x1.1': { inputPerM: 1, outputPerM: 4, currency: 'CNY', source: 'bundled' },
  'baidu/ernie-4.5': { inputPerM: 4, outputPerM: 16, currency: 'CNY', source: 'bundled' },
  'baidu/ernie-4.5-turbo': { inputPerM: 0.8, outputPerM: 3.2, currency: 'CNY', source: 'bundled' },
  'baidu/ernie-x1-turbo': { inputPerM: 1, outputPerM: 4, currency: 'CNY', source: 'bundled' },
}
