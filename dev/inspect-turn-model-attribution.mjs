// 诊断：回合归因模型从哪来。只看 turn/start、turn/end、request/header 三类事件。
// 用法：node dev/inspect-turn-model-attribution.mjs <session.v3.jsonl.zstd> [sinceMinutes]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';

const file = process.argv[2];
const sinceMin = Number(process.argv[3] ?? 60);
if (!file || !fs.existsSync(file)) { console.error('usage: node dev/inspect-turn-model-attribution.mjs <session.v3.jsonl.zstd> [sinceMinutes]'); process.exit(2); }

const MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);
function decompressAll(buf) {
  const out = [];
  let off = 0;
  while (off < buf.length) {
    let tryEnd = buf.indexOf(MAGIC, off + 1);
    if (tryEnd === -1) tryEnd = buf.length;
    let piece = null;
    for (let k = 0; k < 64; k++) {
      try { piece = zlib.zstdDecompressSync(buf.subarray(off, tryEnd)); break; } catch {
        const nxt = buf.indexOf(MAGIC, tryEnd + 1);
        if (nxt === -1) { if (tryEnd === buf.length) break; tryEnd = buf.length; } else tryEnd = nxt;
      }
    }
    if (piece === null) { console.error(`frame decode aborted at ${off}`); break; }
    out.push(piece);
    off = tryEnd;
  }
  return Buffer.concat(out);
}

const side = path.join(os.tmpdir(), 'dsh-session-v3.jsonl');
const text = decompressAll(fs.readFileSync(file)).toString('utf8');
fs.writeFileSync(side, text);
console.log(`lines: ${text.split('\n').filter((l) => l.trim()).length}  sidecar: ${side}`);

const evs = [];
for (const l of text.split('\n')) { if (!l.trim()) continue; try { evs.push(JSON.parse(l)); } catch { /* tail */ } }
const KIND = { 'turn/start': 'START ', 'turn/end': 'END   ', 'request/header': 'HEADER' };
const rows = evs.filter((e) => KIND[e.type] !== undefined).map((e) => ({
  t: e.time, type: e.type, kind: KIND[e.type],
  turn: e.data?.turn, step: e.data?.step,
  provider: e.data?.header?.config?.provider, model: e.data?.header?.config?.model,
  reason: e.data?.reason?.kind,
}));
const cut = Date.now() - sinceMin * 60_000;
const last = rows.filter((r) => r.t >= cut);
console.log(`start/end/header events in last ${sinceMin}min: ${last.length} (of ${rows.length} total)`);
console.log('');
for (const r of last) {
  const bj = new Date(r.t + 8 * 3600_000);
  const hhmm = `${String(bj.getUTCHours()).padStart(2, '0')}:${String(bj.getUTCMinutes()).padStart(2, '0')}:${String(bj.getUTCSeconds()).padStart(2, '0')}`;
  const what = r.type === 'request/header' ? `${r.provider}/${r.model}` : `${r.type === 'turn/end' ? (r.reason ?? '') : ''}`;
  console.log(`  ${hhmm} BJ  ${r.kind}  turn=${r.turn ?? '-'} step=${r.step ?? '-'}  ${what}`);
}
console.log('\n── 每个回合 START 之前最近一条 HEADER ────────────────────');
const starts = rows.filter((r) => r.type === 'turn/start');
const headers = rows.filter((r) => r.type === 'request/header');
for (const s of starts.slice(-6)) {
  const prior = [...headers].reverse().find((h) => h.t <= s.t);
  const after = headers.find((h) => h.t > s.t);
  const bj = (t) => new Date(t + 8 * 3600_000).toISOString().slice(11, 19);
  console.log(`  turn ${s.turn} @${bj(s.t)}: prior header ${prior ? `${bj(prior.t)} ${prior.provider}/${prior.model}` : '(none)'} | next header ${after ? `${bj(after.t)} ${after.provider}/${after.model}` : '(none)'}`);
}
