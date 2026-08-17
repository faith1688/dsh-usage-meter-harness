/**
 * Computation sanity tests for the `usageCost` projection fold, run against
 * the DEPLOYED bundle (profile node_modules) so every dependency resolves.
 *
 * Verifies that non-DeepSeek providers (and DeepSeek itself) are billed
 * correctly through the same bucket model: input (cache hit + miss) and
 * output tokens × per-million prices in each model's native currency, with
 * the account balance staying null for non-DeepSeek (manual initial balance
 * is a client-side display concern) and the anchor math for DeepSeek.
 *
 * Run: node test-usage-meter.mjs
 */
import { usageCostProjection, costBreakdown } from 'file:///C:/Users/faith/.dsh/profiles/node_modules/@deepseek-ai/dsh-usage-meter/lib/index.js'

const P = usageCostProjection
let seq = 0
const ev = (type, data, time) => ({ type, seq: seq++, time: time ?? 1_000 + seq, data })
const req = (provider, model, time) => ev('request/header', { header: { config: { provider, model } }, reason: 'initial' }, time)
const turnStart = (turn, time) => ev('turn/start', { turn }, time)
const turnEnd = (turn, time) => ev('turn/end', { turn, reason: 'completed' }, time)
const usage = (turn, step, u, time) => ev('assistant/chunk', { turn, step, chunk: { type: 'usage', usage: u } }, time)
const msg = (turn, step, time) => ev('assistant/message', { turn, step, message: { role: 'assistant', content: [] } }, time)
const balanceEvt = (balance, time) => ev('usage/balance', { balance }, time)

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

// 1. OpenAI gpt-4o — cached input billed at the cache rate (USD)
{
  const v = run([
    req('openai', 'gpt-4o', 1000), turnStart(0, 1000),
    usage(0, 0, { inputTokens: 1_000_000, outputTokens: 500_000, cacheReadTokens: 1_000_000, cacheWriteTokens: 0 }, 2000),
    msg(0, 0, 2500), turnEnd(0, 3000),
  ])
  // 1M×2.5 + 1M×1.25 + 0.5M×10 = 8.75 USD
  A('openai gpt-4o cost', v.estimatedCost, 8.75)
  A('openai gpt-4o native currency', v.turns[0].currency, 'USD')
  A('openai gpt-4o accountBalance null', v.accountBalance, null)
  A('openai model stamped', v.turns[0].model, 'gpt-4o')
}

// 2. Anthropic claude-sonnet-4-5 — cache read AND cache write buckets (USD)
{
  const v = run([
    req('anthropic', 'claude-sonnet-4-5', 1000), turnStart(0, 1000),
    usage(0, 0, { inputTokens: 500_000, outputTokens: 100_000, cacheReadTokens: 500_000, cacheWriteTokens: 200_000 }, 2000),
    msg(0, 0, 2500), turnEnd(0, 3000),
  ])
  // 0.5×3 + 0.5×0.3 + 0.2×3.75 + 0.1×15 = 3.9 USD
  A('anthropic sonnet-4-5 cost', v.estimatedCost, 3.9)
}

// 3. DeepSeek flash OFF-PEAK (2026-08-17T05:00Z is outside 01-04/06-10 UTC)
{
  const t = Date.UTC(2026, 7, 17, 5, 0, 0)
  const v = run([
    req('deepseek-official', 'deepseek-v4-flash', t), turnStart(0, t),
    usage(0, 0, { inputTokens: 1_000_000, outputTokens: 200_000, cacheReadTokens: 1_000_000, cacheWriteTokens: 0 }, t + 1000),
    msg(0, 0, t + 1500), turnEnd(0, t + 2000),
  ])
  // offPeak: 1×1.5 + 1×0.05 + 0.2×4.5 = 2.45 CNY
  A('deepseek flash off-peak cost', v.estimatedCost, 2.45)
  A('deepseek native currency CNY', v.turns[0].currency, 'CNY')
}

// 3b. DeepSeek PEAK hour (2026-08-17T02:00Z is Beijing 10:00 → 高峰):
//     0.5M×3 + 1M×0.1 + 0.1M×9 = 2.5 CNY
{
  const t = Date.UTC(2026, 7, 17, 2, 0, 0)
  const v = run([
    req('deepseek-official', 'deepseek-v4-flash', t), turnStart(0, t),
    usage(0, 0, { inputTokens: 500_000, outputTokens: 100_000, cacheReadTokens: 1_000_000, cacheWriteTokens: 0 }, t + 1000),
    msg(0, 0, t + 1500), turnEnd(0, t + 2000),
  ])
  A('deepseek flash peak cost', v.estimatedCost, 2.5)
}

// 4. DeepSeek ANCHOR math: balance = anchor − (cost since anchor), source flips
{
  const t = Date.UTC(2026, 7, 17, 5, 0, 0)
  let state = P.init()
  for (const e of [
    req('deepseek-official', 'deepseek-v4-flash', t), turnStart(0, t),
    usage(0, 0, { inputTokens: 500_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }, t + 1000),
    msg(0, 0, t + 1500), turnEnd(0, t + 2000),
    // anchor: 100 CNY; cost baseline at this log position = 0.5M×1.5 = 0.75
    balanceEvt({ currency: 'CNY', totalBalance: 100, updatedAt: t + 2500, source: 'api' }, t + 2500),
  ]) state = P.apply(state, e)
  let v = P.view(state)
  A('anchor shows api value', v.accountBalance.totalBalance, 100)
  A('anchor source api', v.accountBalance.source, 'api')
  // next usage: turn 1 adds 0.25M input → +0.375 cost → balance 100−0.375 = 99.625
  state = P.apply(state, turnStart(1, t + 2600))
  state = P.apply(state, usage(1, 0, { inputTokens: 250_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }, t + 3000))
  v = P.view(state)
  A('anchor computed balance', v.accountBalance.totalBalance, 99.625)
  A('anchor source computed', v.accountBalance.source, 'computed')
}

// 5. Non-DeepSeek IGNORES usage/balance events (account balance stays null)
{
  const v = run([
    req('openai', 'gpt-4o', 1000), turnStart(0, 1000),
    usage(0, 0, { inputTokens: 100_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }, 2000),
    msg(0, 0, 2500), turnEnd(0, 3000),
    balanceEvt({ currency: 'CNY', totalBalance: 100, updatedAt: 3500, source: 'api' }, 3500),
  ])
  A('openai ignores anchor event', v.accountBalance, null)
}

// 6. Qwen (official CNY) & Hunyuan cache-read pricing
{
  const v = run([
    req('qwen', 'qwen3-max', 1000), turnStart(0, 1000),
    usage(0, 0, { inputTokens: 1_000_000, outputTokens: 100_000, cacheReadTokens: 1_000_000, cacheWriteTokens: 0 }, 2000),
    msg(0, 0, 2500), turnEnd(0, 3000),
  ])
  // 1×2.5 + 1×0.25 + 0.1×10 = 3.75 CNY（显式缓存命中 0.1×）
  A('qwen3-max cost', v.estimatedCost, 3.75)
  A('qwen native currency CNY', v.turns[0].currency, 'CNY')
}
{
  const v = run([
    req('hunyuan', 'hy3', 1000), turnStart(0, 1000),
    usage(0, 0, { inputTokens: 1_000_000, outputTokens: 100_000, cacheReadTokens: 1_000_000, cacheWriteTokens: 0 }, 2000),
    msg(0, 0, 2500), turnEnd(0, 3000),
  ])
  // 1×1 + 1×0.25 + 0.1×4 = 1.65 CNY
  A('hunyuan hy3 cost', v.estimatedCost, 1.65)
}

// 7. Latest models: Kimi K3 (CNY ¥20/¥2/¥100), MiMo-V2.5-Pro (¥3/¥0.025/¥6),
//    Claude Fable 5 (USD $10/$1/$50 + cache write $12.5), GPT-5.6-sol (USD)
{
  const v = run([
    req('moonshot', 'kimi-k3', 1000), turnStart(0, 1000),
    usage(0, 0, { inputTokens: 1_000_000, outputTokens: 100_000, cacheReadTokens: 1_000_000, cacheWriteTokens: 0 }, 2000),
    msg(0, 0, 2500), turnEnd(0, 3000),
  ])
  // 1×20 + 1×2 + 0.1×100 = 32 CNY
  A('kimi-k3 cost', v.estimatedCost, 32)
  A('kimi-k3 native CNY', v.turns[0].currency, 'CNY')
}
{
  const v = run([
    req('xiaomi', 'mimo-v2.5-pro', 1000), turnStart(0, 1000),
    usage(0, 0, { inputTokens: 1_000_000, outputTokens: 200_000, cacheReadTokens: 1_000_000, cacheWriteTokens: 0 }, 2000),
    msg(0, 0, 2500), turnEnd(0, 3000),
  ])
  // 1×3 + 1×0.025 + 0.2×6 = 4.225 CNY
  A('xiaomi mimo-v2.5-pro cost', v.estimatedCost, 4.225)
  A('xiaomi native CNY', v.turns[0].currency, 'CNY')
}
{
  const v = run([
    req('anthropic', 'claude-fable-5', 1000), turnStart(0, 1000),
    usage(0, 0, { inputTokens: 1_000_000, outputTokens: 100_000, cacheReadTokens: 1_000_000, cacheWriteTokens: 200_000 }, 2000),
    msg(0, 0, 2500), turnEnd(0, 3000),
  ])
  // 1×10 + 1×1 + 0.2×12.5 + 0.1×50 = 18.5 USD
  A('claude-fable-5 cost', v.estimatedCost, 18.5)
}
{
  const v = run([
    req('openai', 'gpt-5.6-sol', 1000), turnStart(0, 1000),
    usage(0, 0, { inputTokens: 1_000_000, outputTokens: 100_000, cacheReadTokens: 1_000_000, cacheWriteTokens: 100_000 }, 2000),
    msg(0, 0, 2500), turnEnd(0, 3000),
  ])
  // 1×5 + 1×0.5 + 0.1×6.25 + 0.1×30 = 9.125 USD
  A('gpt-5.6-sol cost', v.estimatedCost, 9.125)
}
{
  const v = run([
    req('xai', 'grok-4.6', 1000), turnStart(0, 1000),
    usage(0, 0, { inputTokens: 1_000_000, outputTokens: 100_000, cacheReadTokens: 0, cacheWriteTokens: 0 }, 2000),
    msg(0, 0, 2500), turnEnd(0, 3000),
  ])
  A('grok-4.6 cost', v.estimatedCost, 2.6)
}
{
  const v = run([
    req('baidu', 'ernie-5.0', 1000), turnStart(0, 1000),
    usage(0, 0, { inputTokens: 1_000_000, outputTokens: 100_000, cacheReadTokens: 0, cacheWriteTokens: 0 }, 2000),
    msg(0, 0, 2500), turnEnd(0, 3000),
  ])
  // ernie-5.0 ≤32K 档 CNY ¥6/¥24：1×6 + 0.1×24 = 8.4
  A('ernie-5.0 cost', v.estimatedCost, 8.4)
  A('ernie-5.0 native CNY', v.turns[0].currency, 'CNY')
}
{
  const v = run([
    req('gemini', 'gemini-3.5-flash', 1000), turnStart(0, 1000),
    usage(0, 0, { inputTokens: 1_000_000, outputTokens: 100_000, cacheReadTokens: 1_000_000, cacheWriteTokens: 0 }, 2000),
    msg(0, 0, 2500), turnEnd(0, 3000),
  ])
  // 1×1.5 + 1×0.15 + 0.1×9 = 2.55 USD
  A('gemini-3.5-flash cost', v.estimatedCost, 2.55)
}
{
  const v = run([
    req('minimax', 'MiniMax-M3', 1000), turnStart(0, 1000),
    usage(0, 0, { inputTokens: 1_000_000, outputTokens: 100_000, cacheReadTokens: 1_000_000, cacheWriteTokens: 0 }, 2000),
    msg(0, 0, 2500), turnEnd(0, 3000),
  ])
  // MiniMax-M3 国内 CNY ¥2.1/¥8.4/缓存¥0.42：1×2.1 + 1×0.42 + 0.1×8.4 = 3.36
  A('minimax-m3 cost', v.estimatedCost, 3.36)
  A('minimax-m3 native CNY', v.turns[0].currency, 'CNY')
}

// 8. Turn end reason + row templates + base pricing
{
  const v = run([
    req('deepseek-official', 'deepseek-v4-flash', 1000), turnStart(0, 1000),
    usage(0, 0, { inputTokens: 100_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }, 2000),
    msg(0, 0, 2500), turnEnd(0, 3000),
  ])
  A('turn endReason completed', v.turns[0].endReason, 'completed')
  A('turn still open endReason null before end', (() => {
    const s0 = run([req('deepseek-official', 'deepseek-v4-flash', 1000), turnStart(0, 1000)])
    return s0.turns[0].endReason
  })(), null)
  // DeepSeek (cacheRead defined, cacheWrite undefined) → 3 rows incl 未命中=input+cacheWrite
  A('deepseek priceRows count', v.priceRows.length, 3)
  A('deepseek row2 buckets', JSON.stringify(v.priceRows[1].buckets), JSON.stringify(['input', 'cacheWrite']))
  A('deepseek basePricing inputPerM', v.basePricing.inputPerM, 1)
}
{
  const v = run([
    req('anthropic', 'claude-fable-5', 1000), turnStart(0, 1000),
    usage(0, 0, { inputTokens: 100_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }, 2000),
    msg(0, 0, 2500), turnEnd(0, 3000),
  ])
  // cacheWrite defined → 4 rows: 命中 / 未命中(input) / 缓存写入 / 输出
  A('anthropic priceRows count', v.priceRows.length, 4)
  A('anthropic row3 buckets', JSON.stringify(v.priceRows[2].buckets), JSON.stringify(['cacheWrite']))
  A('officialPrice exposed (anthropic)', v.officialPrice !== null && v.officialPrice.pricing.inputPerM === 10, true)
}

// 9. Balance "计算于" stamp only changes when accumulated cost changes
{
  const t = Date.UTC(2026, 7, 17, 5, 0, 0)
  let state = P.init()
  for (const e of [
    req('deepseek-official', 'deepseek-v4-flash', t), turnStart(0, t),
    usage(0, 0, { inputTokens: 500_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }, t + 1000),
    msg(0, 0, t + 1500), turnEnd(0, t + 2000),
    balanceEvt({ currency: 'CNY', totalBalance: 100, updatedAt: t + 2500, source: 'api' }, t + 2500),
  ]) state = P.apply(state, e)
  // non-cost event (turn/start of next turn) → still api source, stamp unchanged
  state = P.apply(state, turnStart(1, t + 2600))
  let v = P.view(state)
  A('non-cost event keeps api source', v.accountBalance.source, 'api')
  A('non-cost event keeps api stamp', v.accountBalance.updatedAt, t + 2500)
  // cost-changing usage event → computed with the event time
  state = P.apply(state, usage(1, 0, { inputTokens: 250_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }, t + 3000))
  v = P.view(state)
  A('cost change stamps computed time', v.accountBalance.updatedAt, t + 3000)
  // another non-cost event (turn/end) → stamp must NOT move
  state = P.apply(state, turnEnd(1, t + 4000))
  v = P.view(state)
  A('non-cost event does not move stamp', v.accountBalance.updatedAt, t + 3000)
}

// 10. Non-DeepSeek MANUAL balance — same anchor−cost display as DeepSeek
{
  // GLOBAL LEDGER: the broadcast value IS the display (no per-session subtraction).
  const t = Date.UTC(2026, 7, 17, 5, 0, 0)
  const v = run([
    req('openai', 'gpt-4o', t), turnStart(0, t),
    usage(0, 0, { inputTokens: 1_000_000, outputTokens: 100_000, cacheReadTokens: 0, cacheWriteTokens: 0 }, t + 1000),
    msg(0, 0, t + 1500), turnEnd(0, t + 2000),
    ev('usage/balance-ledger', { key: 'p:openai', balance: 96.5, currency: 'USD', kind: 'deduct' }, t + 2500),
  ])
  A('ledger broadcast shows the value as-is', v.accountBalance.totalBalance, 96.5)
  A('ledger currency', v.accountBalance.currency, 'USD')
  A('ledger deduct source computed', v.accountBalance.source, 'computed')
}
{
  // manual edit broadcast (kind manual, no later cost) → source api
  const t = Date.UTC(2026, 7, 17, 5, 0, 0)
  const v = run([
    req('openai', 'gpt-4o', t), turnStart(0, t),
    ev('usage/balance-ledger', { key: 'p:openai', balance: 200, currency: 'CNY', kind: 'manual' }, t + 1000),
  ])
  A('ledger manual source api', v.accountBalance.source, 'api')
  A('ledger manual balance', v.accountBalance.totalBalance, 200)
}
{
  // KEY MISMATCH → ignored (balance stays unset)
  const t = Date.UTC(2026, 7, 17, 5, 0, 0)
  const v = run([
    req('openai', 'gpt-4o', t), turnStart(0, t),
    ev('usage/balance-ledger', { key: 'm:custom/other', balance: 999, currency: 'USD', kind: 'manual' }, t + 1000),
  ])
  A('ledger key mismatch ignored', v.accountBalance, null)
}
{
  // negative ledger value is displayed as-is (透支)
  const t = Date.UTC(2026, 7, 17, 5, 0, 0)
  const v = run([
    req('openai', 'gpt-4o', t), turnStart(0, t),
    ev('usage/balance-ledger', { key: 'p:openai', balance: -3.5, currency: 'USD', kind: 'deduct' }, t + 1000),
  ])
  A('negative ledger shown as-is', v.accountBalance.totalBalance, -3.5)
}
{
  // CUSTOM model (not in bundled table) binds to m:provider/model
  const t = Date.UTC(2026, 7, 17, 5, 0, 0)
  const v = run([
    req('custom-vendor', 'my-model', t), turnStart(0, t),
    ev('usage/balance-ledger', { key: 'm:custom-vendor/my-model', balance: 55, currency: 'CNY', kind: 'manual' }, t + 1000),
  ])
  A('custom model ledger accepted', v.accountBalance.totalBalance, 55)
}
{
  // same custom session, WRONG key (vendor key) → ignored
  const t = Date.UTC(2026, 7, 17, 5, 0, 0)
  const v = run([
    req('custom-vendor', 'my-model', t), turnStart(0, t),
    ev('usage/balance-ledger', { key: 'p:custom-vendor', balance: 77, currency: 'CNY', kind: 'manual' }, t + 1000),
  ])
  A('custom model rejects vendor key', v.accountBalance, null)
}
{
  // DeepSeek ignores ledger events entirely
  const t = Date.UTC(2026, 7, 17, 5, 0, 0)
  const v = run([
    req('deepseek-official', 'deepseek-v4-flash', t), turnStart(0, t),
    ev('usage/balance-ledger', { key: 'p:deepseek-official', balance: 88, currency: 'CNY', kind: 'manual' }, t + 1000),
  ])
  A('deepseek ignores ledger', v.accountBalance, null)
}
{
  // vendor-shared: openai/gpt-4.1 accepts the SAME key p:openai
  const t = Date.UTC(2026, 7, 17, 5, 0, 0)
  const v = run([
    req('openai', 'gpt-4.1', t), turnStart(0, t),
    ev('usage/balance-ledger', { key: 'p:openai', balance: 42, currency: 'USD', kind: 'manual' }, t + 1000),
  ])
  A('vendor-shared key accepted for gpt-4.1', v.accountBalance.totalBalance, 42)
}
{
  // UNKNOWN model (no bundled row) → default 2-row template so the popup
  // editor is usable (pick a vendor template or fill prices manually).
  const v = run([req('my-gateway', 'my-model', 1000), turnStart(0, 1000)])
  A('unknown model default rows count', v.priceRows.length, 2)
  A('unknown model row1 buckets', JSON.stringify(v.priceRows[0].buckets), JSON.stringify(['input', 'cacheWrite']))
  A('unknown model row2 buckets', JSON.stringify(v.priceRows[1].buckets), JSON.stringify(['output']))
  A('unknown model basePricing null', v.basePricing, null)
}

// 12. 官方计费示例验证（来自 AI大模型API定价汇总_2026年8月.md）
// kimi-k3：输入50万(40万命中)、输出10万 → 0.4×2 + 0.1×20 + 0.1×100 = ¥12.8
{
  const v = run([
    req('moonshot', 'kimi-k3', 1000), turnStart(0, 1000),
    usage(0, 0, { inputTokens: 100_000, outputTokens: 100_000, cacheReadTokens: 400_000, cacheWriteTokens: 0 }, 2000),
    msg(0, 0, 2500), turnEnd(0, 3000),
  ])
  A('文件示例 kimi-k3 ¥12.8', v.estimatedCost, 12.8)
}
// doubao-seed-2.1-pro：输入30万(20万命中)、输出8万 → 0.2×1.2 + 0.1×6 + 0.08×30 = ¥3.24
{
  const v = run([
    req('doubao', 'doubao-seed-2.1-pro', 1000), turnStart(0, 1000),
    usage(0, 0, { inputTokens: 100_000, outputTokens: 80_000, cacheReadTokens: 200_000, cacheWriteTokens: 0 }, 2000),
    msg(0, 0, 2500), turnEnd(0, 3000),
  ])
  A('文件示例 doubao-2.1-pro ¥3.24', v.estimatedCost, 3.24)
}
// stepfun step-3.5-flash：输入100万(80万命中)、输出20万 → 0.8×0.14 + 0.2×0.7 + 0.2×2.1 = ¥0.672
{
  const v = run([
    req('stepfun', 'step-3.5-flash', 1000), turnStart(0, 1000),
    usage(0, 0, { inputTokens: 200_000, outputTokens: 200_000, cacheReadTokens: 800_000, cacheWriteTokens: 0 }, 2000),
    msg(0, 0, 2500), turnEnd(0, 3000),
  ])
  A('文件示例 step-3.5-flash ¥0.672', v.estimatedCost, 0.672)
}
// deepseek-v4-pro 文件示例（峰谷生效前平峰价）：输入20万(15万命中)、输出5万 → 0.00375+0.15+0.3 = ¥0.45375
{
  const t = Date.UTC(2026, 7, 10, 5, 0, 0) // 2026-08-10，早于峰谷生效
  const v = run([
    req('deepseek-official', 'deepseek-v4-pro', t), turnStart(0, t),
    usage(0, 0, { inputTokens: 50_000, outputTokens: 50_000, cacheReadTokens: 150_000, cacheWriteTokens: 0 }, t + 1000),
    msg(0, 0, t + 1500), turnEnd(0, t + 2000),
  ])
  A('文件示例 deepseek-v4-pro ¥0.45375', v.estimatedCost, 0.45375)
}
// gpt-5.4：输入10万(6万命中)、输出2万 → 0.06×0.25 + 0.04×2.5 + 0.02×15 = $0.415
{
  const v = run([
    req('openai', 'gpt-5.4', 1000), turnStart(0, 1000),
    usage(0, 0, { inputTokens: 40_000, outputTokens: 20_000, cacheReadTokens: 60_000, cacheWriteTokens: 0 }, 2000),
    msg(0, 0, 2500), turnEnd(0, 3000),
  ])
  A('文件示例 gpt-5.4 $0.415', v.estimatedCost, 0.415)
}
// Claude Sonnet 5 命中请求：命中10万、输出1万 → 0.1×0.2 + 0.01×10 = $0.12
{
  const v = run([
    req('anthropic', 'claude-sonnet-5', 1000), turnStart(0, 1000),
    usage(0, 0, { inputTokens: 0, outputTokens: 10_000, cacheReadTokens: 100_000, cacheWriteTokens: 0 }, 2000),
    msg(0, 0, 2500), turnEnd(0, 3000),
  ])
  A('文件示例 sonnet-5 $0.12', v.estimatedCost, 0.12)
}
// GLM-4.7（基础档）：输入10万(5万命中)、输出2万 → 0.05×0.4 + 0.05×2 + 0.02×8 = ¥0.28
{
  const v = run([
    req('zhipu', 'glm-4.7', 1000), turnStart(0, 1000),
    usage(0, 0, { inputTokens: 50_000, outputTokens: 20_000, cacheReadTokens: 50_000, cacheWriteTokens: 0 }, 2000),
    msg(0, 0, 2500), turnEnd(0, 3000),
  ])
  A('文件示例 glm-4.7 ¥0.28', v.estimatedCost, 0.28)
}
// 讯飞合并计价：输入30万+输出20万 → 50万×¥21/1M = ¥10.5
{
  const v = run([
    req('iflytek', 'spark-x1.5', 1000), turnStart(0, 1000),
    usage(0, 0, { inputTokens: 300_000, outputTokens: 200_000, cacheReadTokens: 0, cacheWriteTokens: 0 }, 2000),
    msg(0, 0, 2500), turnEnd(0, 3000),
  ])
  A('讯飞合并计价 ¥10.5', v.estimatedCost, 10.5)
  A('讯飞合并单行模板', v.priceRows.length, 1)
}
// 百川合并计价：输入20万+输出10万 → 30万×¥15/1M = ¥4.5
{
  const v = run([
    req('baichuan', 'baichuan4-turbo', 1000), turnStart(0, 1000),
    usage(0, 0, { inputTokens: 200_000, outputTokens: 100_000, cacheReadTokens: 0, cacheWriteTokens: 0 }, 2000),
    msg(0, 0, 2500), turnEnd(0, 3000),
  ])
  A('百川合并计价 ¥4.5', v.estimatedCost, 4.5)
  A('百川合并单行模板', v.priceRows.length, 1)
}

// 类型七 Batch 半价：costBreakdown 对整体乘以 discount（×0.5）
{
  const bd = costBreakdown(
    { inputTokens: 1_000_000, outputTokens: 100_000, cacheReadTokens: 0, cacheWriteTokens: 0 },
    { inputPerM: 2.5, outputPerM: 10, discount: 0.5 },
  )
  A('batch 半价 input', bd.input, 1.25)
  A('batch 半价 output', bd.output, 0.5)
  A('batch 半价 total', bd.total, 1.75)
}
{
  // discount 缺省 = 1（无折扣，不影响现有计费）
  const bd = costBreakdown(
    { inputTokens: 1_000_000, outputTokens: 100_000, cacheReadTokens: 0, cacheWriteTokens: 0 },
    { inputPerM: 2.5, outputPerM: 10 },
  )
  A('batch 缺省无折扣 total', bd.total, 3.5)
}
{
  // 合并计价 + Batch 折扣叠加（讯飞/百川若走 Batch）
  const bd = costBreakdown(
    { inputTokens: 300_000, outputTokens: 200_000, cacheReadTokens: 0, cacheWriteTokens: 0 },
    { inputPerM: 1, outputPerM: 1, combinedPerM: 21, discount: 0.5 },
  )
  A('合并+Batch total', bd.total, 5.25)
}

// 四轮核实版新增模型抽查（2026-08-16）
{
  // gpt-5.6-cyber：1M命中 + 0.1M写 + 0.1M输出 → 1×1.25 + 0.1×15.625 + 0.1×75 = 10.3125
  const v = run([
    req('openai', 'gpt-5.6-cyber', 1000), turnStart(0, 1000),
    usage(0, 0, { inputTokens: 0, outputTokens: 100_000, cacheReadTokens: 1_000_000, cacheWriteTokens: 100_000 }, 2000),
    msg(0, 0, 2500), turnEnd(0, 3000),
  ])
  A('gpt-5.6-cyber $10.3125', v.estimatedCost, 10.3125)
}
{
  // gemini-3.7-flash：1M命中 + 0.1M输出 → 1×0.075 + 0.1×3.75 = 0.45
  const v = run([
    req('gemini', 'gemini-3.7-flash', 1000), turnStart(0, 1000),
    usage(0, 0, { inputTokens: 0, outputTokens: 100_000, cacheReadTokens: 1_000_000, cacheWriteTokens: 0 }, 2000),
    msg(0, 0, 2500), turnEnd(0, 3000),
  ])
  A('gemini-3.7-flash $0.45', v.estimatedCost, 0.45)
}
{
  // qwen-turbo-thinking：1M命中 + 0.1M输出 → 1×0.03 + 0.1×3 = 0.33
  const v = run([
    req('qwen', 'qwen-turbo-thinking', 1000), turnStart(0, 1000),
    usage(0, 0, { inputTokens: 0, outputTokens: 100_000, cacheReadTokens: 1_000_000, cacheWriteTokens: 0 }, 2000),
    msg(0, 0, 2500), turnEnd(0, 3000),
  ])
  A('qwen-turbo-thinking ¥0.33', v.estimatedCost, 0.33)
}
{
  // doubao-seed-1.6-flash：1M命中 + 0.1M输出 → 1×0.03 + 0.1×1.5 = 0.18
  const v = run([
    req('doubao', 'doubao-seed-1.6-flash', 1000), turnStart(0, 1000),
    usage(0, 0, { inputTokens: 0, outputTokens: 100_000, cacheReadTokens: 1_000_000, cacheWriteTokens: 0 }, 2000),
    msg(0, 0, 2500), turnEnd(0, 3000),
  ])
  A('doubao-1.6-flash ¥0.18', v.estimatedCost, 0.18)
}
{
  // cohere command-r-plus：1M输入 + 0.1M输出 → 1×2.5 + 0.1×10 = 3.5
  const v = run([
    req('cohere', 'command-r-plus', 1000), turnStart(0, 1000),
    usage(0, 0, { inputTokens: 1_000_000, outputTokens: 100_000, cacheReadTokens: 0, cacheWriteTokens: 0 }, 2000),
    msg(0, 0, 2500), turnEnd(0, 3000),
  ])
  A('command-r-plus $3.5', v.estimatedCost, 3.5)
}

console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
