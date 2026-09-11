// 诊断2：turn 80 前后原始事件顺序（含索引与毫秒），确认 turn/start 是否先于本回合 header。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const side = path.join(os.tmpdir(), 'dsh-session-v3.jsonl');
const evs = [];
for (const l of fs.readFileSync(side, 'utf8').split('\n')) { if (!l.trim()) continue; try { evs.push(JSON.parse(l)); } catch { /* tail */ } }

const TURN = Number(process.argv[2] ?? 80);
const idx = evs.findIndex((e) => e.type === 'turn/start' && e.data?.turn === TURN);
console.log(`turn/start(${TURN}) at event index ${idx}`);
const bj = (t) => new Date(t + 8 * 3600_000).toISOString().slice(11, 23);
console.log('idx  time(BJ)          type                       data(trimmed)');
for (let i = Math.max(0, idx - 3); i < idx + 12; i++) {
  const e = evs[i]; if (!e) break;
  const d = e.data ?? {};
  const mark = i === idx ? '>>' : '  ';
  let detail = '';
  if (e.type === 'request/header') detail = JSON.stringify(d.header?.config);
  else if (e.type === 'assistant/chunk') detail = `chunk=${d.chunk?.type} turn=${d.turn} step=${d.step}`;
  else if (e.type === 'turn/start' || e.type === 'turn/end' || e.type === 'step/start') detail = `turn=${d.turn} step=${d.step} ${d.reason ? JSON.stringify(d.reason) : ''}`;
  else detail = Object.keys(d).slice(0, 6).join(',');
  console.log(`${mark} ${String(i).padStart(4)}  ${bj(e.time)}  ${e.type.padEnd(26)} ${detail.slice(0, 90)}`);
}
