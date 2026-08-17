/**
 * Google Gemini — official USD rates (ai.google.dev/pricing, 2026-08-16 采集).
 * 计费：类型四+五+七 — 缓存输入按缓存价 + 缓存存储费（$/1M/小时，插件无法获取存储量，暂不计量）
 * + 输出；Pro 系列按 200K 分档（本表取 ≤200K 档）；Batch ×0.5。
 * ⚰️ 已关停（2026-06-01）：gemini-2.0-flash / 2.0-flash-lite。
 */
import type { ModelPricing } from '../../projection.ts';
import type { PriceKey } from '../index.ts';
export declare const geminiModels: Record<PriceKey, ModelPricing>;
//# sourceMappingURL=gemini.d.ts.map