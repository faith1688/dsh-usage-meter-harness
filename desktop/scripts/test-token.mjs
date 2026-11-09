// 校验 migrate-provider.mjs 里 TOKEN 正则的边界（直接从脚本源码里取，避免两边漂移）。
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('./migrate-provider.mjs', import.meta.url), 'utf8');
const m = /const TOKEN = (\/.*\/[gimsuy]*);/.exec(src);
if (m === null) { console.log('FAIL  找不到 migrate-provider.mjs 里的 TOKEN 定义'); process.exit(1); }
const TOKEN = eval(m[1]); // eslint-disable-line no-eval
console.log(`TOKEN = ${TOKEN}`);
const cases = [
  ['deepseek/deepseekv4pro', 'deepseek-custom/deepseekv4pro'],
  ['m:deepseek/deepseek-v4-flash', 'm:deepseek-custom/deepseek-v4-flash'],
  ['deepseek-official/deepseek-v4-flash', 'deepseek-official/deepseek-v4-flash'],
  ['p:deepseek', 'p:deepseek-custom'],
  ['deepseek', 'deepseek-custom'],
  ['DEEPSEEK_API_KEY', 'DEEPSEEK_API_KEY'],
  ['DEEPSEEK_CUSTOM_API_KEY', 'DEEPSEEK_CUSTOM_API_KEY'],
  ['deepseekcustom__deepseekv4flash', 'deepseekcustom__deepseekv4flash'],
  ['https://api.deepseek.com', 'https://api.deepseek.com'],
  ['deepseek-zgktz/deepseek-v4-flash', 'deepseek-zgktz/deepseek-v4-flash'],
  ['modlens-deepseek-zgktz/deepseek-v4-flash', 'modlens-deepseek-zgktz/deepseek-v4-flash'],
];
let bad = 0;
for (const [input, want] of cases) {
  const got = input.replace(TOKEN, 'deepseek-custom');
  const ok = got === want;
  if (!ok) bad++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${input}  →  ${got}${ok ? '' : '  (want ' + want + ')'}`);
}
console.log(bad === 0 ? 'ALL BOUNDARY CHECKS PASSED' : `${bad} FAILED`);
process.exit(bad === 0 ? 0 : 1);
