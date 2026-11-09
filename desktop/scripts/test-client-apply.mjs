// scripts/test-client-apply.mjs — 用「会抛错的代理 ctx」真的跑一遍客户端 apply。
//
// 为什么需要它：服务端测试台的假 ctx 只是个普通对象，**访问任何属性都不会抛**，
// 所以「访问了没 inject 的服务」这类错误在测试里永远抓不到 —— v2.0.38 就是这么
// 漏出去的（ctx.locale 在真机抛 `cannot get property "locale" without inject`，
// 导致 Failed to load plugins，而所有测试全绿）。
//
// 本测试复刻真实 cordis 的关键行为：**ctx 是代理，读一个已提供但未 inject 的服务名
// 会抛错**；`ctx.get(name)` 是反射助手，不算访问。然后把真实的 client.tsx 打进
// 临时 ESM 跑一遍，断言 apply 不抛、两个席位都注册。
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

let failures = 0;
const eq = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: got=${JSON.stringify(actual)} want=${JSON.stringify(expected)}`);
};
const ok = (label, cond) => { if (!cond) failures++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`); };

// 产物必须落在项目内：external 的 react/react-dom 由 node 沿父目录解析 node_modules，
// 放到系统临时目录会 ERR_MODULE_NOT_FOUND（实测踩过）。
const out = join(process.cwd(), 'scripts', '.tmp-client-apply.mjs');
// react 由宿主提供、仓库里没有（见 react-stub.mjs 的说明），别名到最小替身。
await build({
  entryPoints: ['src/client.tsx'],
  outfile: out,
  bundle: true,
  format: 'esm',
  platform: 'node',
  jsx: 'automatic',
  logLevel: 'silent',
  alias: {
    react: join(process.cwd(), 'scripts', 'react-stub.mjs'),
    'react/jsx-runtime': join(process.cwd(), 'scripts', 'react-jsx-runtime-stub.mjs'),
  },
});
const mod = await import(pathToFileURL(out).href);
rmSync(out, { force: true });

// ── 宿主替身：复刻 cordis 的代理语义 ─────────────────────────────────────────
const registered = [];
const localeReads = { viaGet: 0, viaProperty: 0 };
const SERVICES = {
  slots: {
    inject: (_seat, cb) => cb(),
    register: (spec) => { registered.push(spec.id ?? spec.name); },
  },
  locale: { getLocale: () => ({ active: 'en' }) },
};
const injected = new Set(mod.inject ?? []);
console.log(`客户端 inject = [${[...injected].join(', ')}]`);

const ctx = new Proxy(
  {},
  {
    get(_target, prop) {
      if (typeof prop !== 'string') return undefined;
      if (prop === 'get') {
        return (name) => { if (name === 'locale') localeReads.viaGet++; return SERVICES[name]; };
      }
      if (prop in SERVICES) {
        // 真实 cordis：读「已提供但未 inject」的服务名 → 抛
        if (!injected.has(prop)) throw new Error(`cannot get property "${prop}" without inject`);
        if (prop === 'locale') localeReads.viaProperty++;
        return SERVICES[prop];
      }
      if (prop === 'on') return () => {};
      if (prop === 'effect') return () => () => {};
      if (prop === 'logger') return () => ({ info() {}, warn() {}, error() {} });
      return undefined;
    },
  },
);

// ── 元测试：先证明这个替身真的会抛（否则下面的 PASS 无意义）─────────────────
let threw = false;
try { void ctx.locale; } catch { threw = true; }
ok('元测试：未 inject 的 locale 直接读 → 抛错（复刻真机行为）', threw);
let gotViaGet = null;
try { gotViaGet = ctx.get('locale')?.getLocale().active; } catch { gotViaGet = 'THREW'; }
eq('元测试：ctx.get("locale") 是合法探测，不抛', gotViaGet, 'en');

// ── 正题：真实 client.tsx 的 apply 在这个宿主上必须跑通 ──────────────────────
let applyErr = null;
try {
  mod.apply(ctx);
} catch (err) {
  applyErr = err;
}
ok(`apply(ctx) 不抛错（真机 v2.0.38 就是在这里抛 cannot get property "locale"）${applyErr ? ' → ' + applyErr.message : ''}`, applyErr === null);
eq('注册了 2 个席位（dock 读数 + 设置页分区）', registered.length, 2);
ok(`locale 走的是探测路径（ctx.get，${localeReads.viaGet} 次；裸属性访问 ${localeReads.viaProperty} 次）`, localeReads.viaProperty === 0);

if (failures > 0) {
  console.log(`\ntest-client-apply: ${failures} 项失败`);
  process.exit(1);
}
console.log('\ntest-client-apply: ALL PASSED');
