/**
 * OpenAI — official USD rates (platform.openai.com/docs/pricing, 2026-08-16 采集).
 * 计费：类型二+七（缓存命中价 + Batch/Flex ×0.5、Priority ×2.5）；长上下文输入×2/缓存×2/输出×1.5。
 * ⚰️ 退役标注：gpt-4o/4.1 系、o3/o3-mini/gpt-4.1-nano 即将或已退役（生产选型避开，价格行保留）。
 */
import type { ModelPricing } from '../../projection.ts';
import type { PriceKey } from '../index.ts';
export declare const openaiModels: Record<PriceKey, ModelPricing>;
//# sourceMappingURL=openai.d.ts.map