import fs from 'node:fs';
let s = fs.readFileSync('src/client.tsx', 'utf8');
// 底部按钮：改为居中
const old = `<div style=\\{\\{ display: 'flex', alignItems: 'center', gap: 8 \\}\\}>\\s*<button type="button" onClick=\\(\\) => void saveModelPrice`;
const re = new RegExp(old, 'g');
if (re.test(s)) {
  s = s.replace(re, `<div style=\\{\\{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: '6px 0 2px' \\}\\}>\\n  <button type="button" onClick=\\(\\) => void saveModelPrice`);
}
// 扩大按钮尺寸
s = s.split("{fontSize: 12, padding: '4px 12px', borderRadius: 6, border: `1px solid ${t.border}`, background: t.accent, color: t.text, cursor: 'pointer' }}>{tt('saveUnit')}").join("{fontSize: 13, padding: '6px 20px', borderRadius: 6, border: `1px solid ${t.border}`, background: t.accent, color: t.text, cursor: 'pointer' }}>{tt('saveUnit')}");
s = s.split("{fontSize: 12, padding: '4px 12px', borderRadius: 6, border: `1px solid ${t.border}`, background: 'transparent', color: t.text2, cursor: 'pointer' }}>{tt('resetPrice')}").join("{fontSize: 13, padding: '6px 20px', borderRadius: 6, border: `1px solid ${t.border}`, background: 'transparent', color: t.text2, cursor: 'pointer' }}>{tt('resetPrice')}");
fs.writeFileSync('src/client.tsx', s);
console.log('buttons centered');
