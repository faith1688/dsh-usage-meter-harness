// Build the CLIENT half into DSH's `window.__ModuleLoader__.load({ id, factory })` bundle format.
// Run after `tsc -p tsconfig.build.json` (which emits host lib/*.js from src/).
// tsconfig.build emits a plain-ESM client.js; this step OVERWRITES it with the
// client-format bundle the harness's client-modules loader requires.
import { build } from 'esbuild';

const name = '@faith1688/dsh-usage-meter-harness';
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
console.log('build-client: wrote lib/client.js (__ModuleLoader__.load bundle)');
