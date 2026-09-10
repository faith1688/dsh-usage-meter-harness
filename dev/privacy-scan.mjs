import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const tgz = 'z:/deepseek/dsh-usage-meter/faith1688-dsh-usage-meter-harness-2.0.29.tgz';
const tmp = process.env.TEMP + '\\um-2.0.29-privacy';
import { mkdirSync, rmSync } from 'node:fs';
try { rmSync(tmp, { recursive: true, force: true }); } catch { /* ignore */ }
mkdirSync(tmp, { recursive: true });
execFileSync('tar', ['-xzf', tgz, '-C', tmp], { stdio: 'inherit' });

const root = join(tmp, 'package');
const patterns = [
  ['个人路径 C:', /C:\\\\Users\\/i],
  ['个人路径 Z:', /Z:\\\\deepseek/i],
  ['AppData', /AppData/i],
  ['API key 值 (sk-)', /sk-[a-zA-Z0-9_-]{8,}/],
  ['Bearer token', /Bearer\s+[a-zA-Z0-9._-]{10,}/i],
  ['邮箱', /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i],
  ['内网IP', /\b(?:192\.168|10|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}\b/],
  ['localhost 端口常量(白名单)', /127\.0\.0\.1/],
];
// 邮箱白名单：github.com 公共地址、npmjs 等
let total = 0, hits = {};
function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    total++;
    let c;
    try { c = readFileSync(p, 'utf8'); } catch { c = ''; /* binary */ }
    for (const [name, re] of patterns) {
      const m = c.match(re);
      if (m) {
        (hits[name] ??= []).push({ file: p.replace(root + '\\', ''), sample: m[0].slice(0, 80) });
      }
    }
  }
}
walk(root);
console.log(`scanned files: ${total}`);
for (const [name, arr] of Object.entries(hits)) {
  console.log(`\n## ${name}: ${arr.length} hit(s)`);
  for (const h of arr.slice(0, 8)) console.log(`  ${h.file}: ${JSON.stringify(h.sample)}`);
  if (arr.length > 8) console.log(`  ... +${arr.length - 8} more`);
}
const clean = !hits['个人路径 C:'] && !hits['个人路径 Z:'] && !hits['AppData'] && !hits['API key 值 (sk-)'] && !hits['Bearer token'] && !hits['内网IP'];
console.log(clean ? '\nPRIVACY CLEAN (path/secret/intranet)' : '\nPRIVACY ISSUES FOUND — see above');
