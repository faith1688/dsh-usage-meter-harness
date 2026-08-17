/**
 * MiniMax — official 国内 platform.minimaxi.com CNY rates（2026-08-16 三轮核实版）。
 * 计费：类型三 — 缓存读取与缓存写入分开计价；Priority = 标准价 ×1.5。
 * ⚰️ M2.5/M2.1/M2 官方标记 Legacy（不再收录）；M3 ≤512K 永久五折后价。
 */
import type { ModelPricing } from '../../projection.ts'
import type { PriceKey } from '../index.ts'

export const minimaxModels: Record<PriceKey, ModelPricing> = {
  'minimax/MiniMax-M3': { inputPerM: 2.1, outputPerM: 8.4, cacheReadPerM: 0.42, currency: 'CNY', source: 'bundled' },
  'minimax/MiniMax-M2.7': { inputPerM: 2.1, outputPerM: 8.4, cacheReadPerM: 0.42, cacheWritePerM: 2.625, currency: 'CNY', source: 'bundled' },
}
