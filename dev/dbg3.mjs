import { readFileSync } from 'node:fs';
const c = readFileSync('z:/deepseek/dsh-usage-meter/src/client.tsx', 'utf8');
const re = /L\('((?:[^'\\]|\\.)*)'\)/g;
let n = 0, withDq = 0;
for (const m of c.matchAll(re)) {
  n++;
  if (m[1].includes('"')) { withDq++; console.log('DQ inside L():', JSON.stringify(m[1]).slice(0, 120)); }
}
console.log('total L():', n, 'with internal double-quote:', withDq);
