// 验证 lib/client.js bundle 里是否含指定中文串（esbuild 把非 ASCII 转成大写 \uXXXX）。
// 用法: node check-bundle.mjs [file] 键1 键2 ...（file 缺省 = ../lib/client.js）
import { readFileSync } from 'node:fs';
const argv = process.argv.slice(2);
let file, keys;
if (argv.length > 0 && /\.(js|mjs|tsx?)$/.test(argv[0]) && !/^[\u4e00-\u9fff]/.test(argv[0])) {
  file = argv[0];
  keys = argv.slice(1);
} else {
  file = new URL('../lib/client.js', import.meta.url);
  keys = argv;
}
const c = readFileSync(file, 'utf8');
const esc = (s) =>
  [...s].map((ch) => {
    const cp = ch.codePointAt(0);
    return cp < 128 ? ch : '\\u' + cp.toString(16).toUpperCase().padStart(4, '0');
  }).join('');
let bad = 0;
for (const k of keys) {
  const n = c.split(esc(k)).length - 1;
  console.log(`${k} = ${n}`);
  if (n === 0) bad++;
}
process.exit(bad > 0 ? 1 : 0);
