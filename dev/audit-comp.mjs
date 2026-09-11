import { readFileSync } from 'node:fs';
const c = readFileSync('z:/deepseek/dsh-usage-meter/src/client.tsx', 'utf8');
const lines = c.split('\n');
// 找三大组件定义行 + 关键标记行
const markers = {
  'function UsageMeterSettingsSection': [],
  'function SettingsSection': [],
  'function PriceEditor': [],
  'function BucketRow': [],
};
for (const k of Object.keys(markers)) {
  lines.forEach((l, i) => { if (l.includes(k)) markers[k].push(i + 1); });
}
for (const [k, v] of Object.entries(markers)) console.log(`${k} → lines ${v.join(',')}`);
// 关键标记
const keys = ['用量计量</h2>', 'langSel', 'setManualLang', 'um-lang-sel', '本对话费用', 'sessionCost', 'syncPrices', 'language', '跟随系统'];
for (const k of keys) {
  const hits = [];
  lines.forEach((l, i) => { if (l.includes(k)) hits.push(i + 1); });
  console.log(`"${k}" → lines ${hits.join(',') || '(none)'}`);
}
// 谁引用了 SettingsSection / PriceEditor（排除定义本身）
console.log('\n=== references to SettingsSection / PriceEditor ===');
lines.forEach((l, i) => {
  if (/(^|[^A-Za-z])SettingsSection([^A-Za-z]|$)/.test(l) && !l.includes('function SettingsSection') && !l.includes('UsageMeterSettingsSection')) console.log(`SettingsSection: ${i + 1}: ${l.trim().slice(0, 110)}`);
  if (/(^|[^A-Za-z])PriceEditor([^A-Za-z]|$)/.test(l) && !l.includes('function PriceEditor')) console.log(`PriceEditor: ${i + 1}: ${l.trim().slice(0, 110)}`);
});
// 主导出 / 注入点
console.log('\n=== export/inject markers ===');
lines.forEach((l, i) => { if (/^export/.test(l) || /registerClientPlugin|clientPlugin|inject/.test(l) && l.trim().startsWith('export')) console.log(`${i + 1}: ${l.trim().slice(0, 130)}`); });
