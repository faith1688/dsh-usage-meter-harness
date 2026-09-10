// v2.0.24 bundle verification: locale bridge + CJK estimator + select removal.
// Usage: node tools/check-bundle-2.0.24.mjs [installDir] — installDir (e.g. the
// profile's node_modules copy) overrides the local lib/ when given.
import { readFileSync } from 'node:fs';
const base = process.argv[2] ? process.argv[2] + '/' : new URL('../lib/', import.meta.url);
const c = readFileSync(base + 'client.js', 'utf8');
const i = readFileSync(base + 'index.js', 'utf8');
const g = readFileSync(base + 'globals.js', 'utf8');
const checks = [
  ['client: locale/change bridge', c.includes('locale/change')],
  ['client: um-lang-change event kept', c.includes('um-lang-change')],
  ['client: CJK range 0x3000 (or 12288)', c.includes('12288') || c.includes('0x3000')],
  ['client: CJK range 0x9fff (or 40959)', c.includes('40959') || c.includes('0x9fff')],
  ['client: old Language select removed', !c.includes('option value="zh"')],
  ['client: setShellLocaleProvider wiring', c.includes('setShellLocaleProvider') || c.includes('getLocale')],
  // Server lib is tsc output (not bundled): estTokens lives in lib/globals.js.
  ['server: index.js imports estTokens', i.includes('estTokens')],
  ['server: globals.js has CJK range', g.includes('12288') || g.includes('0x3000')],
  ['server: old chars/4 heuristic gone', !i.includes('Math.ceil(text.length / 4)')],
];
let fail = 0;
for (const [name, ok] of checks) {
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name);
  if (!ok) fail++;
}
process.exit(fail === 0 ? 0 : 1);
