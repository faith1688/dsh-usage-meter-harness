import fs from 'node:fs';
const text = fs.readFileSync(process.argv[2], 'utf8');
const lines = text.split(/\r?\n/).filter(Boolean);
const SKIP = /^(<system-reminder|<hindsight_knowledge|Current runtime context|This is an automatically generated checkpoint|【env-triage|【执行纪律提醒|background job )/;
let n = 0;
for (const l of lines) {
  let o; try { o = JSON.parse(l); } catch { continue; }
  if (o.type !== 'user/message') continue;
  const c = o.data?.content;
  let txt = '';
  if (typeof c === 'string') txt = c;
  else if (Array.isArray(c)) txt = c.map((b) => (b?.type === 'text' ? b.text : '')).join('');
  txt = txt.replace(/\s+/g, ' ').trim();
  if (!txt) continue;
  const kind = o.data?.source?.kind ?? o.data?.kind;
  const isHuman = kind === 'user' && !SKIP.test(txt);
  n++;
  const t = o.time ? new Date(o.time).toISOString().slice(11, 19) : '';
  const tag = isHuman ? '### HUMAN' : '  (injected)';
  const shown = txt.length > 800 ? txt.slice(0, 800) + '…[TRUNC]' : txt;
  console.log(`\n[${n}] seq=${o.seq} ${t} ${tag}\n${shown}`);
}
