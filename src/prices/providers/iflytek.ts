/**
 * iFlytek 讯飞星火 — official xinghuo.xfyun.cn（2026-08-16 三轮核实版）。
 * 计费：类型六 — 输入+输出合并计价（元/万tokens 换算为元/1M 合并价）。
 * ⚠️ spark-x1.5/ultra/pro 现行价未能从公开渠道核实（官网价格为图片），下表为 2024 官方公告价
 * （¥21/1M 合并）暂代，请以控制台为准；spark-max 已于 2026-03-10 下线。
 */
import type { ModelPricing } from '../../projection.ts'
import type { PriceKey } from '../index.ts'

export const iflytekModels: Record<PriceKey, ModelPricing> = {
  'iflytek/spark-x1.5': { inputPerM: 21, outputPerM: 21, combinedPerM: 21, currency: 'CNY', source: 'bundled' },
  'iflytek/spark-ultra': { inputPerM: 21, outputPerM: 21, combinedPerM: 21, currency: 'CNY', source: 'bundled' },
  'iflytek/spark-pro': { inputPerM: 21, outputPerM: 21, combinedPerM: 21, currency: 'CNY', source: 'bundled' },
  'iflytek/spark-lite': { inputPerM: 0, outputPerM: 0, combinedPerM: 0, currency: 'CNY', source: 'bundled' },
}
