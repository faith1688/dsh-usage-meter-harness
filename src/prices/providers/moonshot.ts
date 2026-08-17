/**
 * Moonshot Kimi 月之暗面 — official platform.kimi.com CNY rates（2026-08-16 三轮核实版）。
 * 计费：类型二 — 缓存命中/未命中拆分。
 * ⚰️ kimi-k2.5 与 moonshot-v1 全系 2026-08-31 下线；kimi-k2 全系 2026-05-25 已下线（价格行保留供核对）。
 */
import type { ModelPricing } from '../../projection.ts'
import type { PriceKey } from '../index.ts'

export const moonshotModels: Record<PriceKey, ModelPricing> = {
  'moonshot/kimi-k3': { inputPerM: 20, outputPerM: 100, cacheReadPerM: 2, currency: 'CNY', source: 'bundled' },
  'moonshot/kimi-k2.7-code-highspeed': { inputPerM: 13, outputPerM: 54, cacheReadPerM: 2.6, currency: 'CNY', source: 'bundled' },
  'moonshot/kimi-k2.7-code': { inputPerM: 6.5, outputPerM: 27, cacheReadPerM: 1.3, currency: 'CNY', source: 'bundled' },
  'moonshot/kimi-k2.6': { inputPerM: 6.5, outputPerM: 27, cacheReadPerM: 1.1, currency: 'CNY', source: 'bundled' },
  // ⚰️ 即将下线（2026-08-31），价格行保留
  'moonshot/kimi-k2.5': { inputPerM: 4, outputPerM: 21, cacheReadPerM: 0.7, currency: 'CNY', source: 'bundled' },
  'moonshot/moonshot-v1-8k': { inputPerM: 2, outputPerM: 10, currency: 'CNY', source: 'bundled' },
  'moonshot/moonshot-v1-32k': { inputPerM: 5, outputPerM: 20, currency: 'CNY', source: 'bundled' },
  'moonshot/moonshot-v1-128k': { inputPerM: 10, outputPerM: 30, currency: 'CNY', source: 'bundled' },
}
