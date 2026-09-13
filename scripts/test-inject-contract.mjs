// scripts/test-inject-contract.mjs — 契约检查：不允许「访问了却没 inject 的服务」。
//
// 由来（v2.0.38 的真实事故）：把 `locale` 从客户端 inject 里删掉，代码里却仍写
// `ctx.locale`（用 `as unknown as {...}` 骗过 TypeScript）——编译期没事，**运行时**
// cordis 的 ctx 是代理，对未 inject 的服务名直接抛
// `cannot get property "locale" without inject`，导致整台机器启动即
// `Failed to load plugins`。类型转换不是探测，`ctx.get(name)` 才是。
//
// 判据：lib/*.js 里出现 `ctx.<已知服务名>` 的属性访问时，该名字必须在**同文件的
// inject 数组**里；否则 FAIL（非零退出）。`ctx.get('x')` 不算属性访问。
//
// 用 TypeScript 的 AST 解析，而不是正则：正则会把字符串/注释里的字面文本
// （实测 i18n 文案 "…（ctx.llm）。"）当成真实访问，产生假阳性。
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// 跨版本实测存在的宿主服务名。宁可少报（只收确定的名字）也不误报。
const SERVICES = new Set([
  'slots', 'locale', // 客户端
  'settings', 'sessionProjections', 'webServer', 'llm', // 服务端
  'session', 'workspace', 'theme', 'renderer', 'connection', // 其余已知宿主服务
]);

const FILES = ['lib/index.js', 'lib/client.js'];
let failures = 0;

/** 从 AST 里取 `const/var/let inject = ['a','b']` 的字符串元素。 */
function collectInjected(src) {
  const sf = ts.createSourceFile('f.js', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const names = [];
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'inject' &&
      node.initializer &&
      ts.isArrayLiteralExpression(node.initializer)
    ) {
      for (const el of node.initializer.elements) {
        if (ts.isStringLiteral(el)) names.push(el.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return names;
}

/** 收集所有 `ctx.<name>` 形式的属性访问（AST 级，忽略字符串与注释）。 */
function collectCtxPropertyReads(src) {
  const sf = ts.createSourceFile('f.js', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const hits = [];
  const visit = (node) => {
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'ctx'
    ) {
      hits.push(node.name.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return hits;
}

for (const file of FILES) {
  let src;
  try {
    src = readFileSync(file, 'utf8');
  } catch {
    console.log(`SKIP  ${file}（不存在）`);
    continue;
  }
  const declared = new Set(collectInjected(src));
  const bad = new Map();
  for (const name of collectCtxPropertyReads(src)) {
    if (SERVICES.has(name) && !declared.has(name)) bad.set(name, (bad.get(name) ?? 0) + 1);
  }

  console.log(`${file}\n    inject = [${[...declared].join(', ')}]`);
  if (bad.size === 0) {
    console.log('    PASS  没有「访问了却没 inject」的服务');
    continue;
  }
  for (const [name, n] of bad) {
    console.log(`    FAIL  ctx.${name} 被访问 ${n} 次却不在 inject 里 → 运行时会抛 cannot get property "${name}" without inject`);
    failures++;
  }
}

if (failures > 0) {
  console.log(`\ntest-inject-contract: ${failures} 处违规（用 ctx.get("<名字>") 做探测，或把它加进 inject）`);
  process.exit(1);
}
console.log('\ntest-inject-contract: ALL PASSED');
