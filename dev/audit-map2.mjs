import { readFileSync } from 'node:fs';
const S = 'z:/deepseek/dsh-usage-meter/src/';
const client = readFileSync(S + 'client.tsx', 'utf8');
const server = readFileSync(S + 'index.ts', 'utf8');

// 服务端：找 /api/usage-meter 出现的所有行
console.log('=== index.ts: lines mentioning /api/usage-meter ===');
server.split('\n').forEach((l, i) => {
  if (l.includes('/api/usage-meter') || l.includes('usage-meter/')) console.log(`${i + 1}: ${l.trim().slice(0, 140)}`);
});

// localStorage 配对（修正）
console.log('\n=== localStorage keys ===');
const ls = {};
for (const m of client.matchAll(/localStorage\.(getItem|setItem|removeItem)\(\s*['"]([^'"]+)['"]/g)) {
  (ls[m[2]] ??= new Set()).add(m[1]);
}
for (const [k, ops] of Object.entries(ls)) {
  const ok = ops.has('getItem') && ops.has('setItem');
  console.log(`${ok ? '✅' : '⚠️'} ${k}: [${[...ops].join(',')}] ${ok ? '' : '← 单边操作!'}`);
}

// 事件
console.log('\n=== events ===');
for (const m of client.matchAll(/dispatchEvent\(\s*new CustomEvent\(\s*['"]([^'"]+)/g)) console.log('DISPATCH:', m[1]);
for (const m of client.matchAll(/addEventListener\(\s*['"]([^'"]+)/g)) console.log('LISTEN  :', m[1]);

// pricing-page.ts 里的 fetch
const pp = readFileSync(S + 'pricing-page.ts', 'utf8');
console.log('\n=== pricing-page.ts fetch calls ===');
for (const m of pp.matchAll(/fetch\(\s*['"`]([^'"`]+)['"`]/g)) console.log(m[1]);
// wrapper.ts
const wr = readFileSync(S + 'wrapper.ts', 'utf8');
console.log('\n=== wrapper.ts: export markers ===');
wr.split('\n').forEach((l, i) => { if (/^export/.test(l)) console.log(`${i + 1}: ${l.trim().slice(0, 120)}`); });
