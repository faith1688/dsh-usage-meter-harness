import fs from 'node:fs';
import path from 'node:path';
const root = 'c:/users/faith/appdata/roaming/npm/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai';
const files = [];
(function walk(d) {
  let es; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
  for (const e of es) {
    const q = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name === 'node_modules' || e.name === '.git') continue; walk(q); }
    else if (e.name.endsWith('.d.ts')) files.push(q);
  }
})(root);
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  if (/type UseChat\b|UseChat =|UseChat;/.test(s) || s.includes('UseChat,') || s.includes('UseChat>')) {
    const i = s.search(/UseChat/);
    console.log('=== UseChat ref in ' + f);
    console.log(s.slice(Math.max(0, i - 600), i + 500));
    console.log('-----');
  }
  if (s.includes('PartialAssistant')) {
    const i = s.indexOf('PartialAssistant');
    console.log('=== PartialAssistant ref in ' + f);
    console.log(s.slice(Math.max(0, i - 200), i + 600));
    console.log('-----');
  }
}
