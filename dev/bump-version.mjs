// One-shot: bump package.json version 2.0.30 -> 2.0.31 with exact-match verification.
import fs from 'node:fs';
const p = 'z:/deepseek/dsh-usage-meter/package.json';
const c = fs.readFileSync(p, 'utf8');
const old = '  "version": "2.0.30",';
const n = '  "version": "2.0.31",';
const i = c.indexOf(old);
if (i < 0) { console.error('NOT FOUND'); process.exit(1); }
if (c.indexOf(old, i + 1) >= 0) { console.error('MULTIPLE'); process.exit(1); }
fs.writeFileSync(p, c.split(old).join(n));
console.log('OK -> 2.0.31');
console.log(fs.readFileSync(p, 'utf8').split(/\r?\n/).slice(0, 6).join('\n'));
