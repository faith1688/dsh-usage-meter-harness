/**
 * Alibaba Qwen 通义 — official 百炼 (help.aliyun.com) CNY rates（2026-08-16 三轮核实版）。
 * 计费：类型三+五+七 — 显式缓存创建 1.25×P_in（cacheWritePerM）、命中 0.1×P_in（cacheReadPerM）；
 * 阶梯模型取基础档（qwen3-max 0-32K、qwen-plus 0-128K、qwen-flash ≤128K、coder 系 0-32K）。
 */
import type { ModelPricing } from '../../projection.ts';
import type { PriceKey } from '../index.ts';
export declare const qwenModels: Record<PriceKey, ModelPricing>;
//# sourceMappingURL=qwen.d.ts.map