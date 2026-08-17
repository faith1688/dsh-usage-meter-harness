/**
 * DeepSeek V4 — official CNY rates (api-docs.deepseek.com/zh-cn/quick_start/pricing),
 * with peak/off-peak time-of-day billing.
 *
 * @module @deepseek-ai/dsh-usage-meter/prices/providers/deepseek
 */
import type { ModelPricing } from '../../projection.ts';
import type { PriceKey } from '../index.ts';
/**
 * DeepSeek V4 peak/off-peak effective time: 2026-08-17 00:00 Beijing
 * (= 2026-08-16T16:00Z). Peak hours (Beijing) 09:00–12:00, 14:00–18:00
 * = UTC 01:00–04:00 and 06:00–10:00.
 */
export declare const DEEPSEEK_PEAK_OFF_PEAK_FROM: number;
export declare const deepseekModels: Record<PriceKey, ModelPricing>;
//# sourceMappingURL=deepseek.d.ts.map