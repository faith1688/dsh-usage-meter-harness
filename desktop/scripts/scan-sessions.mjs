// 探测脚本：解压 DSH 会话日志（多 zstd frame 拼接），统计出现过的
// provider/model 组合，并找出带「视觉包装」后缀的真实模型名。
// 用法：
//   node scripts/scan-sessions.mjs [sessionsRoot] [--limit N] [--grep 关键词]
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { zstdDecompressSync } from 'node:zlib';

const argv = process.argv.slice(2);
const rootArg = argv[0] && !argv[0].startsWith('--') ? argv[0] : null;
const root = rootArg ?? join(process.env.USERPROFILE ?? '', '.dsh', 'sessions');
const limitIdx = argv.indexOf('--limit');
const limit = limitIdx >= 0 ? Number(argv[limitIdx + 1]) : 6;
const grepIdx = argv.indexOf('--grep');
const grep = grepIdx >= 0 ? argv[grepIdx + 1] : null;

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.startsWith('session.jsonl')) out.push(p);
  }
  return out;
}

/** DSH 会话日志是「多个 zstd frame 顺序拼接」的文件，Node 的
 *  zstdDecompressSync 只解第一帧，必须按 magic 0x28B52FFD 切帧后逐帧解压。 */
function readMaybeZstd(path) {
  const buf = readFileSync(path);
  if (!path.endsWith('.zstd')) return buf.toString('utf8');
  const magic = [0x28, 0xb5, 0x2f, 0xfd];
  const starts = [];
  for (let i = 0; i + 4 <= buf.length; i++) {
    if (buf[i] === magic[0] && buf[i + 1] === magic[1] && buf[i + 2] === magic[2] && buf[i + 3] === magic[3]) starts.push(i);
  }
  if (starts.length === 0) { try { return zstdDecompressSync(buf).toString('utf8'); } catch { return ''; } }
  let out = '';
  for (let k = 0; k < starts.length; k++) {
    const end = k + 1 < starts.length ? starts[k + 1] : buf.length;
    try { out += zstdDecompressSync(buf.subarray(starts[k], end)).toString('utf8'); } catch { /* skip bad frame */ }
  }
  return out;
}

const files = walk(root)
  .map((f) => ({ f, mtime: statSync(f).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime)
  .slice(0, limit);

const providers = new Map();
const models = new Map();
const pairLines = new Map();
const wrapped = new Set();
const grepHits = new Set();

const PROVIDER_RE = /"provider"\s*:\s*"([^"]*)"/g;
const MODEL_RE = /"model"\s*:\s*"([^"]*)"/g;

function bump(map, key) { map.set(key, (map.get(key) ?? 0) + 1); }

for (const { f } of files) {
  const text = readMaybeZstd(f);
  for (const line of text.split('\n')) {
    if (line === '') continue;
    if (grep !== null && line.includes(grep)) grepHits.add(line.slice(0, 500));
    const pv = [...line.matchAll(PROVIDER_RE)].map((m) => m[1]);
    const md = [...line.matchAll(MODEL_RE)].map((m) => m[1]);
    for (const p of pv) { bump(providers, p); if (/vision|modlens/i.test(p)) wrapped.add(`provider: ${p}`); }
    for (const m of md) { bump(models, m); if (/vision|modlens/i.test(m)) wrapped.add(`model: ${m}`); }
    // 同一行里同时出现 provider/model（usage 事件）→ 记为一次路由
    if (pv.length > 0 && md.length > 0) {
      for (const p of pv) for (const m of md) {
        const k = `${p} :: ${m}`;
        pairLines.set(k, (pairLines.get(k) ?? 0) + 1);
      }
    }
  }
}

console.log(`# scanned ${files.length} session file(s) under ${root}`);
for (const { f, mtime } of files) console.log(`  - ${new Date(mtime).toISOString()} ${f}`);
const show = (title, map) => {
  console.log(`\n# ${title}`);
  for (const [k, n] of [...map.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(5)}  ${k}`);
};
show('providers seen', providers);
show('models seen', models);
show('co-occurring (provider :: model) in same log line', pairLines);
console.log('\n# vision/modlens-looking names');
for (const k of [...wrapped].sort()) console.log(`  ${k}`);
if (grep !== null) {
  console.log(`\n# grep "${grep}" hits (${grepHits.size})`);
  for (const h of [...grepHits].slice(0, 40)) console.log(`  ${h}`);
}
