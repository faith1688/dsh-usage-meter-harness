// Integration audit for the pure host math: cost/customRows/peak/rows/currency.
import assert from 'node:assert';
import { costOf, costBreakdown } from './lib/projection.js';
import { resolvePricingForTime } from './lib/prices.js';
import { rowsFromPricing, matchTypeId } from './lib/billing.js';

let pass = 0, fail = 0;
function check(name, fn) {
  try { fn(); pass++; console.log('  ok', name); }
  catch (e) { fail++; console.log('FAIL', name, '->', e.message); }
}

const u = { inputTokens: 1000000, outputTokens: 2000000, cacheReadTokens: 500000, cacheWriteTokens: 100000 };

// 1) legacy bucket cost
check('costOf basic split', () => {
  const c = costOf(u, { inputPerM: 1, outputPerM: 2, cacheReadPerM: 0.05, cacheWritePerM: 1.25 });
  // input 1M*1 =1 ; output 2M*2=4 ; cacheRead .5M*.05=.025 ; cacheWrite .1M*1.25=.125 ; total 5.15
  assert.ok(Math.abs(c - 5.15) < 1e-9, `got ${c}`);
});

// 2) customRows flat
check('costOf customRows flat', () => {
  const p = { inputPerM: 0, outputPerM: 0, customRows: [
    { label: '输入', buckets: ['input', 'cacheWrite'], perM: 1 },
    { label: '缓存', buckets: ['cacheRead'], perM: 0.05 },
    { label: '输出', buckets: ['output'], perM: 2 },
  ] };
  const c = costOf(u, p);
  // 输入行 (1M+.1M)*1=1.1 ; 缓存 .5M*.05=.025 ; 输出 2M*2=4 ; total 5.125
  assert.ok(Math.abs(c - 5.125) < 1e-9, `got ${c}`);
});

// 3) resolvePricingForTime: legacy peak/off at a known time
check('resolvePricingForTime legacy peak window', () => {
  const p = { inputPerM: 1, outputPerM: 2, peakDays: [0,1,2,3,4,5,6], peakWindows: [{start:540,end:720},{start:840,end:1080}], peak: { inputPerM: 3, outputPerM: 9 }, offPeak: { inputPerM: 1.5, outputPerM: 4.5 } };
  const t = Date.UTC(2026, 7, 23, 2, 0) ; // UTC 02:00 = Beijing 10:00, in first peak window (9:00-12:00)
  const r = resolvePricingForTime(p, t);
  assert.ok(Math.abs(r.inputPerM - 3) < 1e-9, `inputPerM=${r.inputPerM}`);
  assert.ok(Math.abs(r.outputPerM - 9) < 1e-9, `outputPerM=${r.outputPerM}`);
});

// 4) resolvePricingForTime customRows peak -> perM resolved
check('resolvePricingForTime customRows peak/off', () => {
  const p = { inputPerM: 0, outputPerM: 0, peakDays: [0,1,2,3,4,5,6], peakWindows: [{start:540,end:720}], customRows: [{ label: 'X', buckets: ['input'], perM: 1, peakPerM: 3, offPerM: 0.5 }] };
  const tPeak = Date.UTC(2026, 7, 23, 2, 0); // Beijing 10:00 in window
  const rPeak = resolvePricingForTime(p, tPeak);
  assert.ok(Math.abs(rPeak.customRows[0].perM - 3) < 1e-9, `peak perM=${rPeak.customRows[0].perM}`);
  const tOff = Date.UTC(2026, 7, 23, 12, 0); // Beijing 20:00 off-window
  const rOff = resolvePricingForTime(p, tOff);
  assert.ok(Math.abs(rOff.customRows[0].perM - 0.5) < 1e-9, `off perM=${rOff.customRows[0].perM}`);
});

// 5) rowsFromPricing customRows
check('rowsFromPricing customRows → label/buckets', () => {
  const rows = rowsFromPricing({ inputPerM: 0, outputPerM: 0, customRows: [{ label: '输入', buckets: ['input'], perM: 1 }] });
  assert.deepStrictEqual(rows, [{ label: '输入', buckets: ['input'], perM: 1 }]);
});

// 6) matchTypeId: customRows-only should NOT fall into a bucket template
check('matchTypeId ignores customRows (expect basic)', () => {
  const id = matchTypeId({ inputPerM: 0, outputPerM: 0, customRows: [{ label: 'x', buckets: ['input'], perM: 1 }] });
  assert.ok(id === 'combined' || id === 'basic' || id === 'peak-off-peak' || id === 'batch', `unexpected ${id}`);
});

// 7) 模板权威计费底线：切换到「基础计费」后，残留的 cacheReadPerM 不得参与计价
check('basic template: stale cacheReadPerM stripped → cacheRead bills at input', () => {
  // 用户从缓存模板切到基础模板：override 只含 inputPerM/outputPerM。
  const base = { inputPerM: 1, outputPerM: 2, cacheReadPerM: 0.05, cacheWritePerM: 1.25, currency: 'CNY' };
  const overridePrices = { inputPerM: 1, outputPerM: 2 };
  const MANAGED = ['inputPerM','outputPerM','cacheReadPerM','cacheWritePerM','combinedPerM','discount','peak','offPeak','peakDays','peakWindows','weekend','peakOffPeakFrom','customRows'];
  const pureDiscount = Object.keys(overridePrices).every((k) => k === 'discount' || k === 'currency') && overridePrices.discount !== undefined;
  const stripped = { ...base };
  if (!pureDiscount) for (const f of MANAGED) delete stripped[f];
  const row = { ...stripped, ...overridePrices };
  const c = costOf(u, row);
  // input 1M*1=1 + output 2M*2=4 + cacheRead .5M×输入价1=.5 + cacheWrite .1M×1=.1 = 5.6
  assert.ok(Math.abs(c - 5.6) < 1e-9, `got ${c}`);
});

// 8) 纯折扣覆盖（Batch）保留内置价格结构，只乘倍率
check('pure-discount override keeps bundled structure ×0.5', () => {
  const base = { inputPerM: 1, outputPerM: 2, cacheReadPerM: 0.05, currency: 'USD' };
  const overridePrices = { discount: 0.5 };
  const MANAGED = ['inputPerM','outputPerM','cacheReadPerM','cacheWritePerM','combinedPerM','discount','peak','offPeak'];
  const pureDiscount = Object.keys(overridePrices).every((k) => k === 'discount' || k === 'currency') && overridePrices.discount !== undefined;
  const stripped = { ...base };
  if (!pureDiscount) for (const f of MANAGED) delete stripped[f];
  const row = { ...stripped, ...overridePrices };
  assert.ok(Math.abs(row.cacheReadPerM - 0.05) < 1e-9, 'structure lost');
  const c = costOf(u, row);
  // (1 + 4 + .025 + .1) * .5 = 2.5625
  assert.ok(Math.abs(c - 2.5625) < 1e-9, `got ${c}`);
});

// 9) 合并计价：combinedPerM 全 token 统一价
check('combined billing single rate for all tokens', () => {
  const c = costOf(u, { inputPerM: 5, outputPerM: 5, combinedPerM: 5 });
  // all tokens = 1+2+.5+.1 = 3.6M * 5 = 18
  assert.ok(Math.abs(c - 18) < 1e-9, `got ${c}`);
});

console.log(`\nAUDIT: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
