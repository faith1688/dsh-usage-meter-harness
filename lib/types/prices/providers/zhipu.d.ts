/**
 * Zhipu 智谱 GLM — official 国内 open.bigmodel.cn CNY rates（2026-08-16 三轮核实版）。
 * 计费：类型二+五 — 缓存命中/未命中拆分；GLM-4.7/4.5-Air 按输入×输出联合分档（本表取基础档）。
 * GLM-5.x 为第三方转述国内价（海外 Z.AI 美元价不同）；GLM-4.6（文本）已撤下定价页。
 */
import type { ModelPricing } from '../../projection.ts';
import type { PriceKey } from '../index.ts';
export declare const zhipuModels: Record<PriceKey, ModelPricing>;
//# sourceMappingURL=zhipu.d.ts.map