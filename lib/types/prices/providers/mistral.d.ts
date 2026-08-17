/**
 * Mistral — official USD rates (docs.mistral.ai/models/pricing, 2026-08-16 采集).
 * 计费：类型三+七 — 缓存输入 = 0.1×输入价；Batch ×0.5。
 */
import type { ModelPricing } from '../../projection.ts';
import type { PriceKey } from '../index.ts';
export declare const mistralModels: Record<PriceKey, ModelPricing>;
//# sourceMappingURL=mistral.d.ts.map