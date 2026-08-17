/**
 * Zhipu 智谱 GLM — official 国内 open.bigmodel.cn CNY rates（2026-08-16 三轮核实版）。
 * 计费：类型二+五 — 缓存命中/未命中拆分；GLM-4.7/4.5-Air 按输入×输出联合分档（本表取基础档）。
 * GLM-5.x 为第三方转述国内价（海外 Z.AI 美元价不同）；GLM-4.6（文本）已撤下定价页。
 */
import type { ModelPricing } from '../../projection.ts'
import type { PriceKey } from '../index.ts'

export const zhipuModels: Record<PriceKey, ModelPricing> = {
  'zhipu/glm-5.2': { inputPerM: 8, outputPerM: 28, cacheReadPerM: 2, currency: 'CNY', source: 'bundled' },
  'zhipu/glm-5.1': { inputPerM: 6, outputPerM: 24, cacheReadPerM: 1.3, currency: 'CNY', source: 'bundled' },
  'zhipu/glm-5': { inputPerM: 4, outputPerM: 18, cacheReadPerM: 1, currency: 'CNY', source: 'bundled' },
  'zhipu/glm-4.7': { inputPerM: 2, outputPerM: 8, cacheReadPerM: 0.4, currency: 'CNY', source: 'bundled' },
  'zhipu/glm-4.5-air': { inputPerM: 0.8, outputPerM: 2, cacheReadPerM: 0.16, currency: 'CNY', source: 'bundled' },
  'zhipu/glm-4.6v': { inputPerM: 1, outputPerM: 3, currency: 'CNY', source: 'bundled' },
  'zhipu/glm-4.6v-flash': { inputPerM: 0, outputPerM: 0, currency: 'CNY', source: 'bundled' },
  'zhipu/glm-4.7-flash': { inputPerM: 0, outputPerM: 0, currency: 'CNY', source: 'bundled' },
  'zhipu/glm-4.5-flash': { inputPerM: 0, outputPerM: 0, currency: 'CNY', source: 'bundled' },
}
