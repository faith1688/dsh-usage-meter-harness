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
export declare const BILLING_TYPES: BillingType[];
/** Derive the default 用量 template from one pricing row (shared by effective + official). */
export declare function rowsFromPricing(base: ModelPricing): BillingRow[];
/** Default 用量 template for a model with no bundled/override pricing (unknown vendor/model). */
export declare function defaultUnknownRows(): BillingRow[];
/** Which billing type a pricing row structurally matches (for dropdown auto-select). */
export declare function matchTypeId(p: ModelPricing | null): string;
