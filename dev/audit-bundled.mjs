import { readFileSync } from 'node:fs';
const c = readFileSync('z:/deepseek/dsh-usage-meter/src/prices-providers.ts', 'utf8');
// 统计 BUNDLED_TABLE 的 key 数（'provider/model': { 行）
const keys = c.match(/^\s+'[^']+'(?:\s*as|\s*:\s*\{)/gm) ?? c.match(/^\s+'[^']*\/[^']*':\s*\{/gm) ?? [];
console.log('总行数(估):', keys.length);
// DeepSeek 行
const ds = c.match(/deepseek-official\/[^']*['"][^}]*\}/g);
if (ds) {
  for (const d of ds.slice(0, 6)) console.log('---\n', d.slice(0, 600));
}
// 统计 provider 数
const provs = new Set();
for (const m of c.matchAll(/^\s+'([^'\/]+)\/[^']*':\s*\{/gm)) provs.add(m[1]);
console.log('厂商数:', provs.size, [...provs].join(', '));
// 检查 peak/offPeak 行数
const peakRows = (c.match(/peak:/g) ?? []).length;
console.log('peak: 出现次数:', peakRows);
