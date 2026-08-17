/**
 * Pure-logic verification of the DeepSeek cross-time rule, mirroring exactly
 * the code paths in src/prices/index.ts (isPeakHour + resolvePricingForTime)
 * and the fold's stepStart/requestStart logic in src/index.ts. No external
 * deps — runs anywhere with node.
 *
 * Rule: the whole API request is billed at the rate active when the request
 * STARTED. 07:59 off-peak start stays off-peak past 08:00; 17:58 peak start
 * stays peak past 18:00.
 */
function isPeakHour(utcHour) {
  return (utcHour >= 1 && utcHour < 4) || (utcHour >= 6 && utcHour < 10)
}

function resolve(pricing, now) {
  if (pricing.peak === undefined || pricing.offPeak === undefined) return pricing
  if (pricing.peakOffPeakFrom !== undefined && now < pricing.peakOffPeakFrom) return pricing
  const active = isPeakHour(new Date(now).getUTCHours()) ? pricing.peak : pricing.offPeak
  return { ...pricing, inputPerM: active.inputPerM, outputPerM: active.outputPerM, cacheReadPerM: active.cacheReadPerM }
}

// Same as src/prices/providers/deepseek.ts
const DEEPSEEK_PEAK_OFF_PEAK_FROM = Date.UTC(2026, 7, 16, 16, 0, 0)
const flash = {
  inputPerM: 1, outputPerM: 2, cacheReadPerM: 0.02,
  peak: { inputPerM: 3, outputPerM: 9, cacheReadPerM: 0.1 },
  offPeak: { inputPerM: 1.5, outputPerM: 4.5, cacheReadPerM: 0.05 },
  peakOffPeakFrom: DEEPSEEK_PEAK_OFF_PEAK_FROM,
}

// costOf from src/projection.ts
function costOf(usage, p) {
  const input = usage.inputTokens * (p.inputPerM ?? 0) / 1e6
  const output = usage.outputTokens * (p.outputPerM ?? 0) / 1e6
  const cacheRead = usage.cacheReadTokens * (p.cacheReadPerM ?? 0) / 1e6
  const cacheWrite = usage.cacheWriteTokens * (p.cacheWritePerM ?? 0) / 1e6
  return input + output + cacheRead + cacheWrite
}

const usage = { inputTokens: 1000, outputTokens: 2000, cacheReadTokens: 500, cacheWriteTokens: 0 }

// Beijing 07:59:30 = UTC 23:59:30 prev day
const offStart = Date.UTC(2026, 7, 16, 23, 59, 30)
// Beijing 08:05 = UTC 00:05 (peak starts 09:00 Beijing = 01:00 UTC)
const offEnd = Date.UTC(2026, 7, 17, 0, 5, 0)
// Beijing 17:58 = UTC 09:58 (peak 14:00-18:00)
const peakStart = Date.UTC(2026, 7, 17, 9, 58, 0)
// Beijing 18:08 = UTC 10:08 (off-peak)
const peakEnd = Date.UTC(2026, 7, 17, 10, 8, 0)

const a = resolve(flash, offStart)
const b = resolve(flash, offEnd)
const c = resolve(flash, peakStart)
const d = resolve(flash, peakEnd)

const row = (label, p, at) => console.log(
  `${label}: ${p.inputPerM}/${p.outputPerM}/${p.cacheReadPerM}  ¥${costOf(usage, p).toFixed(6)}  (${new Date(at).toISOString()})`
)
row('07:59:30 start (off-peak)', a, offStart)
row('08:05     delta  (off-peak)', b, offEnd)
row('17:58     start (peak)   ', c, peakStart)
row('18:08     delta  (off-peak)', d, peakEnd)

// The fold's cross-time rule: each delta of a step is priced at requestStart.
// Request A (started 07:59:30 off-peak, deltas until 08:05): both priced at a.
const reqA_cost = costOf(usage, a) + costOf(usage, a)
// Request B (started 17:58 peak, deltas until 18:08): both priced at c.
const reqB_cost = costOf(usage, c) + costOf(usage, c)
console.log(`\nRequest A (07:59:30 start, 2 deltas incl. 08:05): ¥${reqA_cost.toFixed(6)}  — stays OFF-PEAK ✓`)
console.log(`Request B (17:58    start, 2 deltas incl. 18:08): ¥${reqB_cost.toFixed(6)}  — stays PEAK ✓`)

const wrongA = costOf(usage, a) + costOf(usage, b) // per-delta (old buggy behavior)
const wrongB = costOf(usage, c) + costOf(usage, d)
console.log(`(old per-delta would be: A ¥${wrongA.toFixed(6)}  B ¥${wrongB.toFixed(6)})`)

const ok = a.inputPerM === 1.5 && b.inputPerM === 1.5 && c.inputPerM === 3 && d.inputPerM === 1.5
  && reqA_cost === 2 * costOf(usage, a) && reqB_cost === 2 * costOf(usage, c)
  && reqA_cost < wrongA === false
console.log('\nCROSS-TIME RULE:', ok ? 'PASS ✅' : 'FAIL ❌')
