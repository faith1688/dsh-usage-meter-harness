/**
 * Xiaomi MiMo 小米 — official platform.xiaomimimo.com CNY rates（2026-08-16 三轮核实版）。
 * 计费：类型二 — 2026-05-27 调价后不再区分输入长度。
 * ⚠️ mimo-v2-flash 调价后价格未核实（下表为调价前旧价）；mimo-v2-omni 为官方页价。
 */
import type { ModelPricing } from '../../projection.ts'
import type { PriceKey } from '../index.ts'

export const xiaomiModels: Record<PriceKey, ModelPricing> = {
  'xiaomi/mimo-v2.5-pro': { inputPerM: 3, outputPerM: 6, cacheReadPerM: 0.025, currency: 'CNY', source: 'bundled' },
  'xiaomi/mimo-v2.5': { inputPerM: 1, outputPerM: 2, cacheReadPerM: 0.02, currency: 'CNY', source: 'bundled' },
  'xiaomi/mimo-v2-omni': { inputPerM: 2.8, outputPerM: 14, cacheReadPerM: 0.56, currency: 'CNY', source: 'bundled' },
  'xiaomi/mimo-v2-flash': { inputPerM: 0.7, outputPerM: 2.1, cacheReadPerM: 0.07, currency: 'CNY', source: 'bundled' },
}
