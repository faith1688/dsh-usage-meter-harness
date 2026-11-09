// 探测脚本：查看真实会话日志里 `request/header` 事件的完整 data 形态，
// 以及它与 turn/start、step/start、usage 事件的先后顺序（判断能否做
// 「按发起请求的模型」精确归因：header 是否带 turn/step）。
// 用法：node scripts/probe-header-events.mjs [sessionsRoot] [--limit N]
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { zstdDecompressSync } from 'node:zlib';

const argv = process.argv.slice(2);
const rootArg = argv[0] && !argv[0].startsWith('--') ? argv[0] : null;
const root = rootArg ?? join(process.env.USERPROFILE ?? '', '.dsh', 'sessions');
const limitIdx = argv.indexOf('--limit');
const limit = limitIdx >= 0 ? Number(argv[limitIdx + 1]) : 4;

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
    try { out += zstdDecompressSync(buf.subarray(starts[k], end)).toString('utf8'); } catch { /* skip */ }
  }
  return out;
}

const files = walk(root)
  .map((f) => ({ f, mtime: statSync(f).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime)
  .slice(0, limit);

const INTEREST = ['request/header', 'turn/start', 'turn/end', 'step/start', 'assistant/message', 'assistant/chunk'];
let totalHeaders = 0;
let shown = 0;
const headerShapes = new Map();

for (const { f } of files) {
  const text = readMaybeZstd(f);
  const lines = text.split('\n').filter((l) => l !== '');
  console.log(`\n=== ${f} (${lines.length} lines)`);
  for (let i = 0; i < lines.length; i++) {
    let ev;
    try { ev = JSON.parse(lines[i]); } catch { continue; }
    const type = ev?.type ?? ev?.event?.type;
    if (!INTEREST.includes(type)) continue;
    if (type === 'request/header') {
      totalHeaders += 1;
      const data = JSON.stringify(ev.data ?? ev);
      // 只记 data 的顶层键形态（去重），避免刷屏
      let shapeKey;
      try { shapeKey = Object.keys((ev.data?.header?.config) ?? {}).join(',') + '|' + Object.keys(ev.data?.header ?? {}).join(','); } catch { shapeKey = '?'; }
      headerShapes.set(shapeKey, (headerShapes.get(shapeKey) ?? 0) + 1);
      if (shown < 12) {
        shown += 1;
        console.log(`[hdr#${shown}] t=${ev.time ?? ''} data=${data.slice(0, 700)}`);
      }
    } else {
      const d = ev.data ?? {};
      const brief = `${type} turn=${d.turn ?? '-'} step=${d.step ?? '-'} reason=${d.reason?.kind ?? ''} usage=${d.usage ? JSON.stringify(d.usage) : (d.chunk?.type ?? '')}`;
      console.log(`       ${brief}`);
    }
  }
}

console.log(`\n# total request/header events: ${totalHeaders}`);
console.log('# header data shapes (config-keys|header-keys):');
for (const [k, n] of [...headerShapes.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(5)}  ${k}`);
