/**
 * Cross-time peak/off-peak fold test — runs against the DEPLOYED bundle
 * (profile node_modules) like test-usage-meter.mjs. Verifies the DeepSeek
 * rule: an entire API request is billed at the rate active when the request
 * STARTED (recorded from step/start). A request that begins off-peak and
 * streams usage past the peak start stays off-peak; one that begins in peak
 * and ends after the off-peak start stays peak.
 *
 * Run: node test-cross-time.mjs
 */
import { usageCostProjection } from 'file:///C:/Users/faith/.dsh/profiles/node_modules/@deepseek-ai/dsh-usage-meter/lib/index.js'

const P = usageCostProjection
let seq = 0
const ev = (type, data, time) => ({ type, seq: seq++, time, data })
const req = (provider, model, time) => ev('request/header', { header: { config: { provider, model } }, reason: 'initial' }, time)
const turnStart = (turn, time) => ev('turn/start', { turn }, time)
const stepStart = (turn, step, time) => ev('step/start', { turn, step }, time)
const turnEnd = (turn, time) => ev('turn/end', { turn, reason: 'completed' }, time)
const usageEv = (turn, step, u, time) => ev('assistant/chunk', { turn, step, chunk: { type: 'usage', usage: u } }, time)

function run(events) {
  let state = P.init()
  for (const e of events) state = P.apply(state, e)
  return P.view(state)
}

let failures = 0
const A = (name, actual, expected, tol = 1e-9) => {
  const ok = typeof actual === 'number' && typeof expected === 'number'
    ? Math.abs(actual - expected) <= tol
    : actual === expected
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  if (!ok) failures++
}

// Beijing 2026-08-17 07:59:30 = UTC 2026-08-16 23:59:30 (off-peak)
const OFF_START = Date.UTC(2026, 7, 16, 23, 59, 30)
// Beijing 08:05 = UTC 00:05 (still off-peak; peak starts 09:00 Beijing)
const OFF_DELTA = Date.UTC(2026, 7, 17, 0, 5, 0)
// Beijing 17:58 = UTC 09:58 (peak)
const PEAK_START = Date.UTC(2026, 7, 17, 9, 58, 0)
// Beijing 18:08 = UTC 10:08 (off-peak)
const PEAK_DELTA = Date.UTC(2026, 7, 17, 10, 8, 0)

const u1 = { inputTokens: 1000, outputTokens: 1000, cacheReadTokens: 0, cacheWriteTokens: 0, reasoningTokens: 0 }
const u2 = { inputTokens: 2000, outputTokens: 2000, cacheReadTokens: 0, cacheWriteTokens: 0, reasoningTokens: 0 }

// ── Case A: request starts 07:59:30 (off-peak), second usage delta at 08:05 ──
const viewA = run([
  req('deepseek-official', 'deepseek-v4-flash', OFF_START),
  turnStart(1, OFF_START),
  stepStart(1, 1, OFF_START),
  usageEv(1, 1, u1, OFF_START + 100),
  usageEv(1, 1, u2, OFF_DELTA),   // crosses 08:00 — must still be off-peak-priced
  turnEnd(1, OFF_DELTA + 5000),
])
// off-peak: 1.5 input, 4.5 output → (2000*1.5 + 2000*4.5)/1e6 = (3000+9000)/1e6 = 0.012
const expectedA = (2000 * 1.5 + 2000 * 4.5) / 1e6
A('A: total cost (off-peak start, crossed 08:00)', viewA.estimatedCost, expectedA)
A('A: requestCount', viewA.requestCount, 0) // assistant/message not emitted; requestCount counts messages
A('A: inputTokens', viewA.inputTokens, 2000)
A('A: turns[0].cost', viewA.turns[0]?.cost, expectedA)

// ── Case B: request starts 17:58 (peak), second usage delta at 18:08 ──
const viewB = run([
  req('deepseek-official', 'deepseek-v4-flash', PEAK_START),
  turnStart(1, PEAK_START),
  stepStart(1, 1, PEAK_START),
  usageEv(1, 1, u1, PEAK_START + 100),
  usageEv(1, 1, u2, PEAK_DELTA),   // crosses 18:00 — must still be peak-priced
  turnEnd(1, PEAK_DELTA + 5000),
])
// peak: 3 input, 9 output → (2000*3 + 2000*9)/1e6 = (6000+18000)/1e6 = 0.024
const expectedB = (2000 * 3 + 2000 * 9) / 1e6
A('B: total cost (peak start, crossed 18:00)', viewB.estimatedCost, expectedB)
A('B: turns[0].cost', viewB.turns[0]?.cost, expectedB)

// ── Case C (regression): no step/start events (old logs) → falls back to turn start ──
const viewC = run([
  req('deepseek-official', 'deepseek-v4-flash', OFF_START),
  turnStart(1, OFF_START),
  usageEv(1, 1, u2, OFF_DELTA),
])
A('C: fallback cost (no step/start, turn started off-peak)', viewC.estimatedCost, expectedA)

console.log(failures === 0 ? '\nALL CROSS-TIME TESTS PASSED ✅' : `\n${failures} FAILURES ❌`)
process.exit(failures === 0 ? 0 : 1)
