import { readFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';
const src = 'z:/deepseek/dsh-usage-meter/src/';
const files = readdirSync(src).filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));
const imports = new Map();
const versionRefs = [];
for (const f of files) {
  const c = readFileSync(src + f, 'utf8');
  for (const m of c.matchAll(/from\s+['"](@deepseek-ai\/[^'"]+)['"]/g)) {
    imports.set(m[1], (imports.get(m[1] ?? '') ?? 0) + 1);
  }
  for (const m of c.matchAll(/import\s+['"](@deepseek-ai\/[^'"]+)['"]/g)) {
    imports.set(m[1], (imports.get(m[1] ?? '') ?? 0) + 1);
  }
  const lines = c.split('\n');
  lines.forEach((l, i) => {
    if (/semver|minimumVersion|peerDependencies|version\s*[<>=]|requiresDsh|dshVersion/i.test(l) && !/^\s*\/\//.test(l)) {
      versionRefs.push(`${f}:${i + 1}: ${l.trim().slice(0, 130)}`);
    }
  });
}
console.log('=== @deepseek-ai imports in src/ ===');
for (const [k, v] of [...imports.entries()].sort()) console.log(`${v}× ${k}`);
console.log('\n=== version-guard-like code ===');
console.log(versionRefs.length ? versionRefs.join('\n') : '(none)');
