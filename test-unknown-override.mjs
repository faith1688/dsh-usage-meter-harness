/**
 * Verify that a saved price override for an UNKNOWN vendor/model actually
 * lands in the live price table after a reload (the reported bug: 刷新后
 * 单价/用量仍空). Loads the DEPLOYED lib, writes a THROWAWAY override into the
 * config file (backed up + restored around the run), stub-applies the plugin
 * (which runs loadPersistedConfig → applyPriceOverrides), then drives the
 * projection fold for the unknown model and checks pricing/priceRows are
 * populated.
 *
 * Self-contained: does not depend on the developer's existing config contents.
 *
 * Run: node test-unknown-override.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { apply, usageCostProjection } from 'file:///C:/Users/faith/.dsh/profiles/node_modules/@deepseek-ai/dsh-usage-meter/lib/index.js'

const cfgPath = 'C:/Users/faith/.dsh/usage-meter.json'
const backup = existsSync(cfgPath) ? readFileSync(cfgPath, 'utf8') : null

let fails = 0
const A = (name, cond) => { console.log(`${cond ? 'PASS' : 'FAIL'} ${name}`); if (!cond) fails++ }

try {
  const cfg = backup ? JSON.parse(backup) : {}
  cfg.priceOverrides = {
    ...(cfg.priceOverrides ?? {}),
    'my-gateway/my-model': {
      prices: { inputPerM: 3, outputPerM: 15, cacheReadPerM: 0.3 },
      rows: [
        { label: '输入命中', buckets: ['cacheRead'] },
        { label: '输入未命中', buckets: ['input'] },
        { label: '输出', buckets: ['output'] },
      ],
    },
  }
  writeFileSync(cfgPath, JSON.stringify(cfg, null, 2))

  // Minimal stub ctx — only what `apply` touches.
  const ctx = {
    settings: { register: () => ({ get: () => ({}), watch: () => {} }) },
    sessionProjections: { register: () => {} },
    webServer: { register: () => {} },
    effect: () => () => {},
    on: () => {},
  }
  apply(ctx, {})

  const P = usageCostProjection
  let seq = 0
  const ev = (type, data, time) => ({ type, seq: seq++, time: time ?? 1000 + seq, data })
  let state = P.init()
  for (const e of [
    ev('request/header', { header: { config: { provider: 'my-gateway', model: 'my-model' } }, reason: 'initial' }, 1000),
    ev('turn/start', { turn: 1 }, 1000),
  ]) state = P.apply(state, e)
  const v = P.view(state)

  A('pricing resolved (non-null)', v.pricing !== null)
  A('pricing inputPerM 3', v.pricing?.inputPerM === 3)
  A('pricing outputPerM 15', v.pricing?.outputPerM === 15)
  A('pricing cacheReadPerM 0.3', v.pricing?.cacheReadPerM === 0.3)
  A('priceRows 3 rows (template applied)', v.priceRows.length === 3)
  A('row1 label 输入命中', v.priceRows[0]?.label === '输入命中')
  A('basePricing reflects override', v.basePricing?.inputPerM === 3)
} finally {
  if (backup !== null) writeFileSync(cfgPath, backup)
}

console.log(fails === 0 ? 'UNKNOWN-MODEL OVERRIDE APPLIED OK' : `${fails} FAILURE(S)`)
process.exit(fails === 0 ? 0 : 1)
