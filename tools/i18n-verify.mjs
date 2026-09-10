// Verify: find {L( ... )} inside backtick template literals missing the $ prefix.
// Inside a template literal, {L('x')} without $ renders as LITERAL text "{L('x')}" in the UI.
// JSX expression containers like {L('x')} are legal and are NOT flagged (a naive
// (?<!\$)\{L\(' regex matches ~150 legal JSX sites — do not use it as a broken detector).
// Single-line template scan; multi-line templates (odd backtick count on a line) are warned.
// Run: node tools/i18n-verify.mjs   (exit 1 if broken interpolations found)
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
let bad = 0;
let warns = 0;
for (const f of readdirSync(SRC).filter((x) => /\.tsx?$/.test(x))) {
  const lines = readFileSync(join(SRC, f), 'utf8').split('\n');
  let carry = false; // template state carried from a previous multi-line template
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let inTpl = carry;
    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      if (c === '`') { inTpl = !inTpl; continue; }
      if (inTpl && line.startsWith('{L(', j) && line[j - 1] !== '$') {
        bad++;
        console.log(`${f}:${i + 1}: ...${line.slice(Math.max(0, j - 24), j + 16)}...`);
      }
    }
    const bt = (line.match(/`/g) || []).length;
    if (bt % 2 !== 0) { warns++; console.log(`WARN ${f}:${i + 1}: odd backtick count (multi-line template)`); }
    carry = inTpl;
  }
}
if (warns) console.log(`multi-line template warnings: ${warns} (scan may be off inside them; check manually)`);
console.log(bad ? `BROKEN interpolations: ${bad}` : 'OK: no missing-$ {L( inside template literals');
process.exit(bad ? 1 : 0);
