/**
 * Billing-method templates and per-model 用量-row derivation.
 *
 * DSH bills token buckets differently per provider (cached/un-cached input,
 * cache-write, output, combined flat rate, peak/off-peak time windows, batch
 * discounts). This module owns the 8 editable templates a user can pick from
 * in the price editor, plus the pure helpers that turn one pricing row into
 * the row template shown in the detail card.
 *
 * @module dsh-usage-meter-harness/billing
 */
import type { BillingRow, ModelPricing } from './projection.ts';

/** One billing-method template offered in the price editor. */
export interface BillingType {
  id: string;
  label: string;
  rows: BillingRow[];
  /** `split` (per-bucket prices), `combined` (one rate for all), `keep` (no row change). */
  mode: 'split' | 'combined' | 'keep';
  /** When set, the whole cost is multiplied by this (e.g. Batch ×0.5). */
  discount?: number;
  /** When true, the entered unit price is the peak price; off-peak = peak ×0.5. */
  peak?: boolean;
  note: string;
}

/** 8 计费方式模板（替代「厂商模板」下拉，让用户按计费类型选择）。 */
export const BILLING_TYPES: BillingType[] = [
  {
    id: 'basic',
    label: '基础计费（输入+输出）',
    rows: [
      { label: '输入', buckets: ['input', 'cacheWrite'] },
      { label: '输出', buckets: ['output'] },
    ],
    mode: 'split',
    note: '输入与输出分开计价（无缓存机制）。',
  },
  {
    id: 'cache-split',
    label: '缓存命中/未命中',
    rows: [
      { label: '输入（缓存命中）', buckets: ['cacheRead'] },
      { label: '输入（缓存未命中）', buckets: ['input', 'cacheWrite'] },
      { label: '输出', buckets: ['output'] },
    ],
    mode: 'split',
    note: '命中按缓存价（约 0.1×输入价），未命中按输入价。',
  },
  {
    id: 'peak-off-peak',
    label: '峰谷分时定价 ⚠️DeepSeek',
    rows: [
      { label: '输入（缓存命中）', buckets: ['cacheRead'] },
      { label: '输入（缓存未命中）', buckets: ['input'] },
      { label: '输出', buckets: ['output'] },
    ],
    mode: 'split',
    peak: true,
    note: '高峰时段（北京时间 9:00-12:00、14:00-18:00）按高峰单价；闲时单价自动 = 高峰 ×0.5（DeepSeek 2026-08-17 起生效）。',
  },
  {
    id: 'cache-write',
    label: '缓存写入+命中',
    rows: [
      { label: '输入（缓存命中）', buckets: ['cacheRead'] },
      { label: '输入（缓存未命中）', buckets: ['input'] },
      { label: '缓存写入', buckets: ['cacheWrite'] },
      { label: '输出', buckets: ['output'] },
    ],
    mode: 'split',
    note: '首次写入约 1.25×输入价、命中约 0.1×输入价（Anthropic 1h 写入为 2×）。',
  },
  {
    id: 'cache-storage',
    label: '上下文缓存存储 ⚠️存储费无法计量',
    rows: [
      { label: '输入（缓存命中）', buckets: ['cacheRead'] },
      { label: '输入（缓存未命中）', buckets: ['input'] },
      { label: '输出', buckets: ['output'] },
    ],
    mode: 'split',
    note: '⚠️ 存储费（存储量×小时）无法自动计量，仅计缓存读价；缓存输入与输出正常计价。',
  },
  {
    id: 'tiered',
    label: '上下文长度分档 ⚠️取基础档',
    rows: [
      { label: '输入', buckets: ['input', 'cacheWrite'] },
      { label: '输出', buckets: ['output'] },
    ],
    mode: 'split',
    note: '⚠️ 取基础档（≤200K 或 ≤32K）；更高档暂按基础档计。',
  },
  {
    id: 'combined',
    label: '输入+输出合并',
    rows: [
      { label: '输入+输出（合并计价）', buckets: ['input', 'cacheRead', 'cacheWrite', 'output'] },
    ],
    mode: 'combined',
    note: '输入+输出按统一单价（讯飞/百川）。',
  },
  {
    id: 'batch',
    label: 'Batch 半价（×0.5）',
    rows: [],
    mode: 'keep',
    discount: 0.5,
    note: '整单费用 ×0.5（Batch 调用；OpenAI/Anthropic/Gemini/Mistral/Qwen）。',
  },
];

/** Derive the default 用量 template from one pricing row (shared by effective + official). */
export function rowsFromPricing(base: ModelPricing): BillingRow[] {
  // COMBINED billing (讯飞/百川): one row covering ALL tokens at one rate.
  if (base.combinedPerM !== undefined) {
    return [{ label: '输入+输出（合并计价）', buckets: ['input', 'cacheRead', 'cacheWrite', 'output'] }];
  }
  const rows: BillingRow[] = [];
  if (base.cacheReadPerM !== undefined) rows.push({ label: '输入（缓存命中）', buckets: ['cacheRead'] });
  rows.push({
    label: '输入（缓存未命中）',
    buckets: base.cacheWritePerM === undefined ? ['input', 'cacheWrite'] : ['input'],
  });
  if (base.cacheWritePerM !== undefined) rows.push({ label: '缓存写入', buckets: ['cacheWrite'] });
  rows.push({ label: '输出', buckets: ['output'] });
  return rows;
}

/** Default 用量 template for a model with no bundled/override pricing (unknown vendor/model). */
export function defaultUnknownRows(): BillingRow[] {
  return [
    { label: '输入（缓存未命中）', buckets: ['input', 'cacheWrite'] },
    { label: '输出', buckets: ['output'] },
  ];
}

/** Which billing type a pricing row structurally matches (for dropdown auto-select). */
export function matchTypeId(p: ModelPricing | null): string {
  if (p === null) return 'basic';
  if (p.discount !== undefined && p.discount < 1) return 'batch';
  if (p.combinedPerM !== undefined) return 'combined';
  if (p.peak !== undefined && p.offPeak !== undefined) return 'peak-off-peak';
  if (p.cacheWritePerM !== undefined && p.cacheReadPerM !== undefined) return 'cache-write';
  if (p.cacheReadPerM !== undefined) return 'cache-split';
  return 'basic';
}
