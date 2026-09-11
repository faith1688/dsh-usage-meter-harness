// One-shot: point profile package.json at the 2.0.31 tgz (exact-match verified).
import fs from 'node:fs';
const p = 'C:/Users/faith/.dsh/profiles/web/package.json';
const c = fs.readFileSync(p, 'utf8');
const old = 'file:Z:/deepseek/dsh-usage-meter/faith1688-dsh-usage-meter-harness-2.0.30.tgz';
const n = 'file:Z:/deepseek/dsh-usage-meter/faith1688-dsh-usage-meter-harness-2.0.31.tgz';
const i = c.indexOf(old);
if (i < 0) { console.error('NOT FOUND'); process.exit(1); }
if (c.indexOf(old, i + 1) >= 0) { console.error('MULTIPLE'); process.exit(1); }
fs.writeFileSync(p, c.split(old).join(n));
console.log('OK profile ref -> 2.0.31');
console.log(fs.readFileSync(p, 'utf8').split(/\r?\n/).slice(4, 7).join('\n'));
