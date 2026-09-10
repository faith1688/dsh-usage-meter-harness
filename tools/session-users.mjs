import fs from 'node:fs';
const text = fs.readFileSync(process.argv[2], 'utf8');
const lines = text.split(/\r?\n/).filter(Boolean);
const userMsgs = [];
for (const l of lines) {
  let o; try { o = JSON.parse(l); } catch { continue; }
  if (o.type !== 'user/message') continue;
  const c = o.data?.content;
  let txt = '';
  if (typeof c === 'string') txt = c;
  else if (Array.isArray(c)) txt = c.map((b) => (b?.type === 'text' ? b.text : '')).join('');
  txt = txt.replace(/\s+/g, ' ').trim();
  if (!txt) continue;
  userMsgs.push({ seq: o.seq, time: o.time, txt });
}
console.log('user messages:', userMsgs.length);
for (const m of userMsgs) {
  const t = m.time ? new Date(m.time).toISOString().slice(11, 19) : '';
  const shown = m.txt.length > 700 ? m.txt.slice(0, 700) + '…[TRUNC]' : m.txt;
  console.log(`\n=== [seq ${m.seq}] ${t} ===\n${shown}`);
}
