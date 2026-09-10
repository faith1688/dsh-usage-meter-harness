// 一次性检查：theme.ts 里每个主题 name 是否都有 EN i18n 键
import { readFileSync } from 'node:fs';
const th = readFileSync(new URL('../src/theme.ts', import.meta.url), 'utf8');
const i18 = readFileSync(new URL('../src/i18n.ts', import.meta.url), 'utf8');
const names = [...th.matchAll(/name: '([^']+)'/g)].map((m) => m[1]);
const missing = names.filter((n) => !i18.includes("'" + n + "'"));
console.log('themes total:', names.length);
console.log('missing EN keys:', missing.length);
missing.forEach((n) => console.log('  MISS:', n));
