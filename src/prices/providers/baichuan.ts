/**
 * Baichuan 百川智能 — official platform.baichuan-ai.com/prices CNY（2026-08-16 三轮核实版）。
 * 计费：类型六（多数模型输入+输出合并计价，元/千tokens 已换算为元/1M 合并价）；
 * Baichuan-M2 输入输出分开；M3 Plus 免费。
 */
import type { ModelPricing } from '../../projection.ts'
import type { PriceKey } from '../index.ts'

export const baichuanModels: Record<PriceKey, ModelPricing> = {
  'baichuan/baichuan4': { inputPerM: 100, outputPerM: 100, combinedPerM: 100, currency: 'CNY', source: 'bundled' },
  'baichuan/baichuan4-turbo': { inputPerM: 15, outputPerM: 15, combinedPerM: 15, currency: 'CNY', source: 'bundled' },
  'baichuan/baichuan4-air': { inputPerM: 0.98, outputPerM: 0.98, combinedPerM: 0.98, currency: 'CNY', source: 'bundled' },
  'baichuan/baichuan-m2': { inputPerM: 2, outputPerM: 20, currency: 'CNY', source: 'bundled' },
  'baichuan/baichuan-m3-plus': { inputPerM: 0, outputPerM: 0, combinedPerM: 0, currency: 'CNY', source: 'bundled' },
}
