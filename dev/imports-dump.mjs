import { readFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';
const src = 'z:/deepseek/dsh-usage-meter/src/';
for (const f of readdirSync(src).filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'))) {
  const c = readFileSync(src + f, 'utf8');
  const lines = c.split('\n');
  lines.forEach((l, i) => {
    if (/from\s+['"]@deepseek-ai/.test(l) || /import\s*\{[^}]*\}\s*from\s*['"]@deepseek-ai/.test(l)) {
      console.log(`${f}:${i + 1}: ${l.trim()}`);
    }
  });
}
