// One-shot v2.0.33: move 林滩晓色 (forest-beach-dawn) to THEMES[0] (becomes
// default), rename 靛蓝黎明（默认）→（浅色）, 林滩晓色（浅色）→（默认，浅色）,
// renumber section comments 1..20, add header note. Exact-match verified.
import fs from 'node:fs';
const p = 'z:/deepseek/dsh-usage-meter/src/theme.ts';
const c = fs.readFileSync(p, 'utf8');
const crlf = c.includes('\r\n');
const lines = c.split(/\r\n/);
let fail = (m) => { console.error('ABORT ' + m); process.exit(1); };

// 1) locate 11) 林滩晓色 block
let b0 = lines.findIndex((l) => l.includes('── 11) 林滩晓色'));
if (b0 < 0) fail('block not found');
let bEnd = -1;
for (let i = b0; i < lines.length; i++) if (lines[i].trim() === '},') { bEnd = i; break; }
if (bEnd < 0) fail('block end not found');
const block = lines.slice(b0, bEnd + 1);
if (!/id:\s*'forest-beach-dawn'/.test(block[2])) fail('block[2] wrong: ' + block[2]);
console.log(`block: ${block.length} lines, L${b0 + 1}-L${bEnd + 1}`);

block[0] = '  // ── 1) 林滩晓色（默认，浅色）';
block[2] = block[2].replace('林滩晓色（浅色）', '林滩晓色（默认，浅色）');

lines.splice(b0, block.length);

// 2) insert after array head
const h = lines.findIndex((l) => /export const THEMES: Theme\[\] = \[/.test(l));
if (h < 0) fail('head not found');
lines.splice(h + 1, 0, ...block);
console.log('inserted after L' + (h + 1));

// 3) renumber section comments 1..N
let n = 0;
for (let i = 0; i < lines.length; i++) {
  if (/^  \/\/ ── (\d+)\) /.test(lines[i])) {
    n++;
    lines[i] = lines[i].replace(/^  \/\/ ── \d+\) /, `  // ── ${n}) `);
  }
}
if (n !== 20) fail('theme comment count=' + n);
console.log('renumbered ' + n + ' themes');

// 4) rename indigo （默认）→（浅色） (comment + name = 2)
const indigoOld = '靛蓝黎明（默认）';
const ci = lines.join('\n').split(indigoOld).length - 1;
if (ci !== 2) fail('indigo rename count=' + ci);
for (let i = 0; i < lines.length; i++) lines[i] = lines[i].split(indigoOld).join('靛蓝黎明（浅色）');
console.log('indigo renamed x2');

// 5) header note
const headOld = '完整呈现主题视觉。 */';
const ch = lines.join('\n').split(headOld).length - 1;
if (ch !== 1) fail('header note count=' + ch);
for (let i = 0; i < lines.length; i++) lines[i] = lines[i].split(headOld).join('完整呈现主题视觉。 (v2.0.33: 林滩晓色置顶并设为默认主题)。 */');
console.log('header updated');

const out = lines.join(crlf ? '\r\n' : '\n');
fs.writeFileSync(p, out, 'utf8');
console.log('written, crlf=' + crlf + ', lines=' + lines.length);
