import { readFileSync } from 'node:fs';
const c = readFileSync('z:/deepseek/dsh-usage-meter/lib/client.js', 'utf8');
// esbuild 把非 ASCII 转成 \uXXXX：解码后搜
const decoded = c.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
const checks = [
  ['语言切换 select (跟随系统)', '跟随系统'],
  ['本对话费用 (zh)', '本对话费用'],
  ['Conversation cost (en)', 'Conversation cost'],
  ['manual override API', 'setManualLang'],
  ['localStorage key', 'um-lang-sel'],
  ['tt(language) 标签', "tt('language')"],
  ['旧文案应消失', '本次对话费用'],
];
let fail = 0;
for (const [name, s] of checks) {
  const found = decoded.includes(s) || c.includes(s);
  const expect = name !== '旧文案应消失';
  const ok = found === expect;
  if (!ok) fail++;
  console.log(`${ok ? '✅' : '❌'} ${name}: ${found ? 'found' : 'absent'} (expected ${expect ? 'found' : 'absent'})`);
}
console.log(fail === 0 ? 'BUNDLE MARKERS OK' : `BUNDLE MARKERS FAIL: ${fail}`);
