// Sweep: find CJK string literals in src/ (non-comment lines) that are missing from EN_BY_ZH.
// Catches the L(variable) blind spot the literal audit misses: array labels, name fields,
// map values rendered via L(label) / raw.
// Run: node tools/i18n-sweep.mjs   (exit 1 if missing found)
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const files = readdirSync(SRC).filter((f) => /\.tsx?$/.test(f) && f !== 'i18n.ts');

// EN_BY_ZH keys: lines like   '中文': 'English',
const i18nText = readFileSync(join(SRC, 'i18n.ts'), 'utf8');
const enKeys = new Set();
const keyRe = /^  '(.+?)': '/gm;
let m;
while ((m = keyRe.exec(i18nText))) enKeys.add(m[1]);

const seen = new Set();
const missing = new Map(); // literal -> [file:line]
for (const f of files) {
  const lines = readFileSync(join(SRC, f), 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) continue;
    const litRe = /(['"])([^'"]*[\u4e00-\u9fff][^'"]*)\1/g;
    let lm;
    while ((lm = litRe.exec(lines[i]))) {
      const lit = lm[2];
      if (!seen.has(lit)) {
        seen.add(lit);
        if (!enKeys.has(lit)) {
          if (!missing.has(lit)) missing.set(lit, []);
          missing.get(lit).push(`${f}:${i + 1}`);
        }
      }
    }
  }
}

console.log(`EN_BY_ZH keys: ${enKeys.size}`);
console.log(`unique CJK literals (non-comment lines): ${seen.size}`);
console.log(`missing EN: ${missing.size}`);
for (const [k, v] of [...missing.entries()].sort((a, b) => a[0].localeCompare(b[0], 'zh'))) {
  console.log(`  ${JSON.stringify(k)}   [${v.join(', ')}]`);
}
process.exit(missing.size ? 1 : 0);
