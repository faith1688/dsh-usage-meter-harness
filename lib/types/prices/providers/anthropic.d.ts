/**
 * Anthropic Claude — official USD rates (platform.claude.com pricing, 2026-08-16 采集).
 * 计费：类型三 — 5m 缓存写 1.25×输入、1h 缓存写 2×输入、命中 0.1×输入；Batch ×0.5。
 * 本表 cacheWritePerM 取 5m 档（1.25×）；1h 档为 2×（未单列）。
 * ⚰️ 已退役（2026-08-05/06-15/02-19）：opus-4-1、sonnet-4/opus-4、3-7-sonnet、3-5-sonnet/haiku。
 */
import type { ModelPricing } from '../../projection.ts';
import type { PriceKey } from '../index.ts';
export declare const anthropicModels: Record<PriceKey, ModelPricing>;
//# sourceMappingURL=anthropic.d.ts.map