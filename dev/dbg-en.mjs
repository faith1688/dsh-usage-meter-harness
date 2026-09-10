import { readFileSync } from 'node:fs';
const i = readFileSync('z:/deepseek/dsh-usage-meter/src/i18n.ts', 'utf8');
const s = i.indexOf('const en: Partial<typeof zh> = {');
const e = i.indexOf('\n};', s);
const blk = i.slice(s, e);
const re = /(?:^|\n)\s{2}([A-Za-z_$][\w$]*):\s*['"]((?:[^'\\]|\\.)*)['"]/g;
let n = 0;
for (const m of blk.matchAll(re)) {
  if (m[1].startsWith('keyPlaceholder')) console.log('MATCH:', m[1], JSON.stringify(m[2]), 'at', m.index);
  n++;
}
console.log('total matches:', n);
// 手动找 keyPlaceholderNew 的上下文字节
const p = blk.indexOf('keyPlaceholderNew');
console.log('raw ctx:', JSON.stringify(blk.slice(p - 3, p + 40)));
