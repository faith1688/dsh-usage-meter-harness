// v2.0.33 audit: (A) every L('中文') literal in the client bundle must have an
// EN_BY_ZH entry (else English mode shows Chinese); (B) every theme name must be
// translatable; (C) every localStorage read must have a fallback.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const i18nSrc = fs.readFileSync('z:/deepseek/dsh-usage-meter/src/i18n.ts', 'utf8');
const enBlock = i18nSrc.slice(i18nSrc.indexOf('const EN_BY_ZH'));
const enKeys = new Set();
for (const m of enBlock.matchAll(/^\s*(['"])(.+?)\1\s*:/gm)) enKeys.add(m[2]);
console.log('[A] EN_BY_ZH entries: ' + enKeys.size);

const bundle = fs.readFileSync('z:/deepseek/dsh-usage-meter/lib/client.js', 'utf8');
// esbuild (charset ascii) emits \xNN for Latin-1 chars and \uXXXX above;
// JSON.parse handles \uXXXX only, so decode \xNN manually first.
const unescape = (s) => {
  if (s.includes('"')) return s;
  try { return JSON.parse('"' + s + '"'); } catch { /* fall through */ }
  return s
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
};
const used = new Map();
for (const m of bundle.matchAll(/\bL\(\s*(['"])((?:(?!\1).)+?)\1\s*\)/g)) {
  used.set(unescape(m[2]), (used.get(unescape(m[2])) || 0) + 1);
}
console.log('[A] L(Chinese) literal calls in bundle: ' + used.size + ' unique');
const missing = [...used.keys()].filter((k) => !enKeys.has(k));
console.log('[A] MISSING en translations (' + missing.length + '):');
for (const k of missing) console.log('  !! ' + k + '  (x' + used.get(k) + ')');

// hardcoded ternary literals that flow through L()
for (const k of ['峰', '谷']) console.log('[A2] hardcoded ternary "' + k + '" in EN_BY_ZH: ' + enKeys.has(k));

// dynamic L() args that are literal-ish ternaries
const dyn = new Set();
for (const m of bundle.matchAll(/\bL\(\s*([^'")\s][^)]{0,80}?)\)/g)) {
  const a = m[1].trim();
  if (a && !a.startsWith("'") && !a.startsWith('"')) dyn.add(unescape(a));
}
console.log('[A] dynamic L(<expr>) call sites: ' + dyn.size);
for (const d of [...dyn].slice(0, 30)) console.log('  ~ ' + d);

// [B] theme names
const themeMod = await import(pathToFileURL('z:/deepseek/dsh-usage-meter/lib/theme.js'));
const themes = themeMod.THEMES;
console.log('\n[B] themes: ' + themes.length + ', default(THEMES[0])="' + themes[0].name + '"');
const missingTheme = themes.filter((t) => !enKeys.has(t.name));
console.log('[B] theme names without en translation: ' + (missingTheme.length ? missingTheme.map((t) => '  !! ' + t.name).join('\n') : 'NONE'));
const ids = themes.map((t) => t.id);
console.log('[B] duplicate theme ids: ' + (ids.filter((v, i) => ids.indexOf(v) !== i).join(',') || 'NONE'));
const refKeys = Object.keys(themes[0]);
const shapeBad = themes.filter((t) => refKeys.some((k) => !(k in t)) || Object.keys(t).some((k) => !refKeys.includes(k)));
console.log('[B] shape drift vs THEMES[0] (' + refKeys.length + ' keys): ' + (shapeBad.length ? shapeBad.map((t) => t.id).join(',') : 'NONE'));
// how are theme names rendered? grep bundle
const nameUses = [...bundle.matchAll(/theme\.name|\.name\b/g)].length;
console.log('[B] bundle uses of .name (incl. theme names): ' + nameUses);

// [C] localStorage
const storageKeys = new Set();
for (const m of bundle.matchAll(/localStorage\.(?:get|set)Item\(\s*(['"])([^'"]+)\1/g)) storageKeys.add(m[2]);
console.log('\n[C] localStorage keys in bundle: ' + storageKeys.size);
for (const k of [...storageKeys].sort()) console.log('  ' + k);
const src = fs.readFileSync('z:/deepseek/dsh-usage-meter/src/client.tsx', 'utf8').split(/\r?\n/);
console.log('\n[C] getItem sites in src (fallback check):');
let issues = 0;
for (const k of [...storageKeys].sort()) {
  const idxs = [];
  const needle1 = "getItem('" + k + "'";
  const needle2 = 'getItem("' + k + '"';
  src.forEach((l, i) => { if (l.includes(needle1) || l.includes(needle2)) idxs.push(i); });
  for (const i of idxs) {
    const ctx = src.slice(Math.max(0, i - 2), i + 6).join('\n');
    const hasGuard = /try\s*{|catch|===?\s*null|!=\s*null|\?\?|\|\|/.test(ctx);
    if (!hasGuard) { issues++; console.log('  !! L' + (i + 1) + ' ' + k + '\n' + ctx.split('\n').map((s) => '     ' + s).join('\n')); }
    else console.log('  ok L' + (i + 1) + ' ' + k);
  }
}
console.log(issues ? '[C] unguarded reads: ' + issues : '[C] all reads guarded');
// dynamic (non-literal) localStorage keys in source
const dynStore = new Set();
src.forEach((l, i) => {
  for (const m of l.matchAll(/localStorage\.(?:get|set)Item\(\s*([^'"(][^)]{0,60}?)\)/g)) dynStore.add('L' + (i + 1) + ' ' + m[1].trim());
});
console.log('[C] dynamic-key localStorage sites: ' + dynStore.size);
for (const d of dynStore) console.log('  ~ ' + d);
console.log('\nDONE i18n/storage audit');
