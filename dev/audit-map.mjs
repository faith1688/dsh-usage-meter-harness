import { readFileSync, readdirSync } from 'node:fs';
const S = 'z:/deepseek/dsh-usage-meter/src/';
const client = readFileSync(S + 'client.tsx', 'utf8');
const server = readFileSync(S + 'index.ts', 'utf8');

// 1) 客户端 fetch 调用
console.log('=== client.tsx: fetch(/api/...) calls ===');
const fetchCalls = new Map();
for (const m of client.matchAll(/fetch\(\s*['"`]([^'"`]+)['"`]/g)) {
  fetchCalls.set(m[1], (fetchCalls.get(m[1]) ?? 0) + 1);
}
for (const [k, v] of [...fetchCalls.entries()].sort()) console.log(`${v}× ${k}`);

// 2) 服务端端点注册（常见模式: app.route / app.get / app.post / .route('METHOD /path')）
console.log('\n=== index.ts: endpoint registrations ===');
const eps = new Set();
for (const m of server.matchAll(/\.route\(\s*['"`]([A-Z]+)\s+([^'"`]+)['"`]/g)) eps.add(`${m[1]} ${m[2]}`);
for (const m of server.matchAll(/\.get\(\s*['"`]([^'"`]+)['"`]/g)) eps.add(`GET ${m[1]}`);
for (const m of server.matchAll(/\.post\(\s*['"`]([^'"`]+)['"`]/g)) eps.add(`POST ${m[1]}`);
for (const e of [...eps].sort()) console.log(e);

// 3) client.tsx 顶层组件定义
console.log('\n=== client.tsx: function components (top-level) ===');
for (const m of client.matchAll(/^function ([A-Za-z0-9_]+)/gm)) console.log(m[1]);
for (const m of client.matchAll(/^const ([A-Za-z0-9_]+)\s*=\s*\(/gm)) console.log(`${m[1]} (arrow)`);

// 4) localStorage 键配对
console.log('\n=== localStorage keys (client.tsx) ===');
const ls = new Map();
for (const m of client.matchAll(/localStorage\.(getItem|setItem|removeItem)\(\s*['"]([^'"]+)['"]/g)) {
  (ls.get(m[2]) ?? new Set()).add(m[1]);
  ls.set(m[2], ls.get(m[2]));
}
for (const [k, ops] of ls.entries()) {
  const hasGet = ops.has('getItem'), hasSet = ops.has('setItem');
  console.log(`${hasGet && hasSet ? '✅' : '⚠️ '} ${k}: [${[...ops].join(',')}] ${hasGet !== hasSet ? '← 单边!' : ''}`);
}

// 5) 自定义事件 dispatch/listen
console.log('\n=== CustomEvent dispatch vs addEventListener ===');
for (const m of client.matchAll(/dispatchEvent\(\s*new CustomEvent\(\s*['"]([^'"]+)/g)) console.log('DISPATCH:', m[1]);
for (const m of client.matchAll(/addEventListener\(\s*['"]([^'"]+)/g)) console.log('LISTEN  :', m[1]);

// 6) src/ 全部文件
console.log('\n=== src/ files ===');
for (const f of readdirSync(S).sort()) {
  const c = readFileSync(S + f, 'utf8');
  console.log(`${f}: ${c.split('\n').length} lines`);
}
