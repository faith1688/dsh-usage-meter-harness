/**
 * Tencent Hunyuan 腾讯混元 — official cloud.tencent.com CNY rates（2026-08-16 四轮核实版）。
 * 计费：类型一（官方未列缓存价）。
 * ⚠️ hy3 未出现在官方定价页（保留早期官方公告价 ¥1/¥4/缓存¥0.25 供核对）；
 * hunyuan-turbos 实为 Hunyuan-turbos-vision（¥3/¥9）。
 */
import type { ModelPricing } from '../../projection.ts'
import type { PriceKey } from '../index.ts'

export const hunyuanModels: Record<PriceKey, ModelPricing> = {
  'hunyuan/hy3': { inputPerM: 1, outputPerM: 4, cacheReadPerM: 0.25, currency: 'CNY', source: 'bundled' },
  'hunyuan/hunyuan-a13b': { inputPerM: 0.5, outputPerM: 2, currency: 'CNY', source: 'bundled' },
  'hunyuan/hunyuan-role-latest': { inputPerM: 2.4, outputPerM: 9.6, currency: 'CNY', source: 'bundled' },
  'hunyuan/hunyuan-translation': { inputPerM: 1.2, outputPerM: 3.6, currency: 'CNY', source: 'bundled' },
  'hunyuan/hunyuan-translation-lite': { inputPerM: 1, outputPerM: 3, currency: 'CNY', source: 'bundled' },
  'hunyuan/hunyuan-turbos-vision': { inputPerM: 3, outputPerM: 9, currency: 'CNY', source: 'bundled' },
  'hunyuan/hunyuan-t1-vision': { inputPerM: 3, outputPerM: 9, currency: 'CNY', source: 'bundled' },
  'hunyuan/hy-vision-1.5': { inputPerM: 3, outputPerM: 9, currency: 'CNY', source: 'bundled' },
  'hunyuan/hunyuan-turbos-vision-video': { inputPerM: 3, outputPerM: 9, currency: 'CNY', source: 'bundled' },
  'hunyuan/hunyuan-embedding': { inputPerM: 0.7, outputPerM: 0.7, currency: 'CNY', source: 'bundled' },
}
