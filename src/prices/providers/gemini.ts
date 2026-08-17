/**
 * Google Gemini — official USD rates (ai.google.dev/pricing, 2026-08-16 采集).
 * 计费：类型四+五+七 — 缓存输入按缓存价 + 缓存存储费（$/1M/小时，插件无法获取存储量，暂不计量）
 * + 输出；Pro 系列按 200K 分档（本表取 ≤200K 档）；Batch ×0.5。
 * ⚰️ 已关停（2026-06-01）：gemini-2.0-flash / 2.0-flash-lite。
 */
import type { ModelPricing } from '../../projection.ts'
import type { PriceKey } from '../index.ts'

export const geminiModels: Record<PriceKey, ModelPricing> = {
  'gemini/gemini-3.7-flash': { inputPerM: 0.75, outputPerM: 3.75, cacheReadPerM: 0.075, currency: 'USD', source: 'bundled' },
  'gemini/gemini-3.6-flash': { inputPerM: 0.75, outputPerM: 3.75, cacheReadPerM: 0.075, currency: 'USD', source: 'bundled' },
  'gemini/gemini-3.5-flash': { inputPerM: 1.5, outputPerM: 9, cacheReadPerM: 0.15, currency: 'USD', source: 'bundled' },
  'gemini/gemini-3.5-flash-lite': { inputPerM: 0.3, outputPerM: 2.5, cacheReadPerM: 0.03, currency: 'USD', source: 'bundled' },
  'gemini/gemini-3.1-pro-preview': { inputPerM: 2, outputPerM: 12, cacheReadPerM: 0.2, currency: 'USD', source: 'bundled' },
  'gemini/gemini-3.1-flash-lite': { inputPerM: 0.25, outputPerM: 1.5, cacheReadPerM: 0.025, currency: 'USD', source: 'bundled' },
  'gemini/gemini-3-flash-preview': { inputPerM: 0.5, outputPerM: 3, cacheReadPerM: 0.05, currency: 'USD', source: 'bundled' },
  'gemini/gemini-2.5-pro': { inputPerM: 1.25, outputPerM: 10, cacheReadPerM: 0.13, currency: 'USD', source: 'bundled' },
  'gemini/gemini-2.5-flash': { inputPerM: 0.3, outputPerM: 2.5, cacheReadPerM: 0.03, currency: 'USD', source: 'bundled' },
  'gemini/gemini-2.5-flash-lite': { inputPerM: 0.1, outputPerM: 0.4, cacheReadPerM: 0.01, currency: 'USD', source: 'bundled' },
}
