/** Sum the three disjoint prompt-side billing buckets. */
export function billedInputTokens(v) {
    return v.inputTokens + v.cacheReadTokens + v.cacheWriteTokens;
}
/** Price (per 1M tokens) for a bucket under a resolved pricing row (undefined while pricing is unknown). */
export function bucketPricePerM(p, b) {
    if (p === null)
        return undefined;
    // COMBINED billing (讯飞/百川): one rate for ALL tokens.
    if (p.combinedPerM !== undefined)
        return p.combinedPerM;
    switch (b) {
        case 'input':
            return p.inputPerM;
        case 'cacheRead':
            return p.cacheReadPerM ?? p.inputPerM;
        case 'cacheWrite':
            return p.cacheWritePerM ?? p.inputPerM;
        case 'output':
            return p.outputPerM;
    }
}
/** Bucket-by-bucket cost (each bucket × its own price); 0 while pricing is unknown. */
export function costBreakdown(usage, pricing) {
    if (pricing === null) {
        return { input: 0, cacheRead: 0, cacheWrite: 0, output: 0, total: 0 };
    }
    const perM = (v) => v / 1_000_000;
    const discount = pricing.discount ?? 1;
    // COMBINED billing (讯飞/百川 style): all tokens at one rate; the whole cost
    // is attributed to the input bucket so a single combined row renders it.
    if (pricing.combinedPerM !== undefined) {
        const all = usage.inputTokens + usage.cacheReadTokens + usage.cacheWriteTokens + usage.outputTokens;
        const total = all * perM(pricing.combinedPerM) * discount;
        return { input: total, cacheRead: 0, cacheWrite: 0, output: 0, total };
    }
    // CUSTOM rows (R5): cost = Σ over the user-defined rows, each billing `perM`
    // × the token counts of its buckets. Whenever custom rows are present they are
    // the authoritative model; the fixed bucket split below does not apply.
    if (pricing.customRows !== undefined && pricing.customRows.length > 0) {
        const byBucket = {
            input: usage.inputTokens,
            cacheRead: usage.cacheReadTokens,
            cacheWrite: usage.cacheWriteTokens,
            output: usage.outputTokens,
        };
        let total = 0;
        for (const r of pricing.customRows) {
            const tokens = r.buckets.reduce((s, b) => s + (byBucket[b] ?? 0), 0);
            total += tokens * perM(r.perM) * discount;
        }
        return { input: total, cacheRead: 0, cacheWrite: 0, output: 0, total };
    }
    const input = usage.inputTokens * perM(pricing.inputPerM) * discount;
    const cacheRead = usage.cacheReadTokens * perM(pricing.cacheReadPerM ?? pricing.inputPerM) * discount;
    const cacheWrite = usage.cacheWriteTokens * perM(pricing.cacheWritePerM ?? pricing.inputPerM) * discount;
    const output = usage.outputTokens * perM(pricing.outputPerM) * discount;
    return { input, cacheRead, cacheWrite, output, total: input + cacheRead + cacheWrite + output };
}
/** Cost of one usage sample under a pricing table (0 while pricing is unknown). */
export function costOf(usage, pricing) {
    return costBreakdown(usage, pricing).total;
}
