import fs from 'node:fs';
import path from 'node:path';
const roots = [
  'z:/deepseek/dsh-usage-meter/node_modules/@deepseek-ai/dsh-client-runtime',
  'z:/deepseek/dsh-usage-meter/node_modules/@deepseek-ai/dsh-client-ui-slots',
];
const files = [];
for (const r of roots) {
  (function walk(d) {
    let es; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of es) {
      const q = path.join(d, e.name);
      if (e.isDirectory()) walk(q);
      else if (e.name.endsWith('.d.ts')) files.push(q);
    }
  })(r);
}
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  const marks = [];
  let i = s.indexOf('SessionStandardProps');
  let n = 0;
  while (i !== -1 && n < 4) { marks.push(i); i = s.indexOf('SessionStandardProps', i + 1); n++; }
  if (marks.length > 0) {
    console.log('=== ' + f + ' (' + n + '+ occurrences)');
    for (const m of marks) console.log('  @' + m + ': ' + s.slice(Math.max(0, m - 120), m + 200).replace(/\n/g, ' | '));
    console.log('-----');
  }
  const j = s.indexOf('SnapshotSelectorHook');
  if (j !== -1) {
    console.log('=== SnapshotSelectorHook in ' + f);
    console.log(s.slice(Math.max(0, j - 300), j + 400));
    console.log('-----');
  }
}
