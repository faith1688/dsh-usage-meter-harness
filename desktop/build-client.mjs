// Build the CLIENT half into DSH's `window.__ModuleLoader__.load({ id, factory })` bundle format.
// Run after `tsc -p tsconfig.build.json` (which emits host lib/*.js from src/).
// tsconfig.build emits a plain-ESM client.js; this step OVERWRITES it with the
// client-format bundle the harness's client-modules loader requires.
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const name = 'dsh-usage-meter-desktop';
const banner =
  'window.__ModuleLoader__.load({id:"' + name + '",factory:(require)=>{' +
  'var module={exports:{}};var exports=module.exports;' +
  'Object.defineProperty(exports,Symbol.toStringTag,{value:"Module"});';
const footer = 'return module.exports;}});';

await build({
  entryPoints: ['src/client.tsx'],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  jsx: 'automatic',
  external: ['react', 'react/jsx-runtime'],
  define: { 'process.env.NODE_ENV': '"production"' },
  banner: { js: banner },
  footer: { js: footer },
  outfile: 'lib/client.js',
  logLevel: 'info',
});
// 产物必须是 __ModuleLoader__ 包装；裸 ESM 会被客户端 bundle 一起吞掉、
// 整条 bundle 语法错误 ⇒ 插件全部无法激活、应用起不来。这里硬校验并让构建失败。
const head = readFileSync('lib/client.js', 'utf8').slice(0, 64);
if (!head.startsWith('window.__ModuleLoader__.load(')) {
  throw new Error('build-client: lib/client.js is not a __ModuleLoader__ bundle — tsc must not emit client.tsx');
}
console.log('build-client: wrote lib/client.js (__ModuleLoader__.load bundle)');
