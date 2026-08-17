/**
 * ByteDance Doubao 字节豆包 — official volcengine.com CNY rates（2026-08-16 三轮核实版）。
 * 计费：类型二+五 — 缓存命中/未命中拆分；阶梯模型取基础档（seed-1.6 0-32K）。
 */
import type { ModelPricing } from '../../projection.ts'
import type { PriceKey } from '../index.ts'

export const doubaoModels: Record<PriceKey, ModelPricing> = {
  'doubao/doubao-seed-2.1-pro': { inputPerM: 6, outputPerM: 30, cacheReadPerM: 1.2, currency: 'CNY', source: 'bundled' },
  'doubao/doubao-seed-2.1-turbo': { inputPerM: 3, outputPerM: 15, cacheReadPerM: 0.6, currency: 'CNY', source: 'bundled' },
  'doubao/doubao-seed-2-0-pro': { inputPerM: 3.2, outputPerM: 16, currency: 'CNY', source: 'bundled' },
  'doubao/doubao-seed-1.6': { inputPerM: 0.8, outputPerM: 2, cacheReadPerM: 0.16, currency: 'CNY', source: 'bundled' },
  'doubao/doubao-seed-1.6-thinking': { inputPerM: 0.8, outputPerM: 8, cacheReadPerM: 0.16, currency: 'CNY', source: 'bundled' },
  'doubao/doubao-seed-1.6-vision': { inputPerM: 0.8, outputPerM: 8, cacheReadPerM: 0.16, currency: 'CNY', source: 'bundled' },
  'doubao/doubao-seed-1.6-lite': { inputPerM: 0.3, outputPerM: 0.6, cacheReadPerM: 0.06, currency: 'CNY', source: 'bundled' },
  'doubao/doubao-seed-1.6-flash': { inputPerM: 0.15, outputPerM: 1.5, cacheReadPerM: 0.03, currency: 'CNY', source: 'bundled' },
  'doubao/doubao-1.5-pro-32k': { inputPerM: 0.8, outputPerM: 2, cacheReadPerM: 0.16, currency: 'CNY', source: 'bundled' },
  'doubao/doubao-1.5-lite-32k': { inputPerM: 0.3, outputPerM: 0.6, cacheReadPerM: 0.06, currency: 'CNY', source: 'bundled' },
}
