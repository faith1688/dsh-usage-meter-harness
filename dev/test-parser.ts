// Verify pricing-page parser against the REAL captured fixtures.
import { readFileSync } from 'node:fs';
import { parsePricingTable, extractPeakWindows } from '../src/pricing-page.ts';

const tableHtml = readFileSync('z:\\deepseek\\dsh-usage-meter\\dev\\pricing-table.html', 'utf8');
const fullHtml = readFileSync('z:\\deepseek\\dsh-usage-meter\\dev\\pricing-page-full.html', 'utf8');

const parsed = parsePricingTable(tableHtml);
console.log('=== pageModels ===');
console.log(JSON.stringify(parsed.pageModels, null, 2));
console.log('=== prices ===');
console.log(JSON.stringify(parsed.prices, null, 2));
console.log('=== table warnings ===');
console.log(JSON.stringify(parsed.warnings, null, 2));

const peak = extractPeakWindows(fullHtml);
console.log('=== peak window ===');
console.log(JSON.stringify(peak, null, 2));

// ── assertions (fail loud) ──────────────────────────────────────────────────
const assert = (cond: boolean, msg: string): void => {
  if (!cond) { console.error(`ASSERT FAIL: ${msg}`); process.exitCode = 1; }
};

assert(parsed.pageModels.length >= 1, 'at least one model');
const flash = parsed.prices['deepseek-flash'];
assert(flash !== undefined, 'deepseek-flash parsed');
if (flash) {
  // from the real page: flash off-peak in=1 out=4 cacheRead=0.02, peak in=2 out=8 cacheRead=0.04
  assert(flash.offPeak.inputPerM === 1, `flash offPeak.inputPerM=${flash.offPeak.inputPerM} (want 1)`);
  assert(flash.offPeak.outputPerM === 4, `flash offPeak.outputPerM=${flash.offPeak.outputPerM} (want 4)`);
  assert(flash.offPeak.cacheReadPerM === 0.02, `flash offPeak.cacheReadPerM=${flash.offPeak.cacheReadPerM} (want 0.02)`);
  assert(flash.peak.inputPerM === 2, `flash peak.inputPerM=${flash.peak.inputPerM} (want 2)`);
  assert(flash.peak.outputPerM === 8, `flash peak.outputPerM=${flash.peak.outputPerM} (want 8)`);
  assert(flash.peak.cacheReadPerM === 0.04, `flash peak.cacheReadPerM=${flash.peak.cacheReadPerM} (want 0.04)`);
  // base == off-peak
  assert(flash.inputPerM === 1 && flash.outputPerM === 4 && flash.cacheReadPerM === 0.02, 'flash base == offPeak');
}
const pro = parsed.prices['deepseek-v4-pro'];
assert(pro !== undefined, 'deepseek-v4-pro parsed');
if (pro) {
  assert(pro.offPeak.inputPerM === 4.5, `pro offPeak.inputPerM=${pro.offPeak.inputPerM} (want 4.5)`);
  assert(pro.peak.inputPerM === 9.0, `pro peak.inputPerM=${pro.peak.inputPerM} (want 9)`);
  assert(pro.offPeak.outputPerM === 13.5, `pro offPeak.outputPerM=${pro.offPeak.outputPerM} (want 13.5)`);
  assert(pro.peak.outputPerM === 27.0, `pro peak.outputPerM=${pro.peak.outputPerM} (want 27)`);
}
assert(peak !== null, 'peak window parsed');
if (peak) {
  assert(JSON.stringify(peak.days) === JSON.stringify([1, 2, 3, 4, 5]), `peak.days=${JSON.stringify(peak.days)} (want [1,2,3,4,5])`);
  assert(peak.windows.length === 2, `peak.windows.length=${peak.windows.length} (want 2)`);
  assert(peak.windows[0].start === 540 && peak.windows[0].end === 720, `win0=${JSON.stringify(peak.windows[0])} (want 540-720)`);
  assert(peak.windows[1].start === 840 && peak.windows[1].end === 1080, `win1=${JSON.stringify(peak.windows[1])} (want 840-1080)`);
}
if (process.exitCode === 1) console.error('\n❌ FAILURES');
else console.log('\n✅ ALL PASS');
