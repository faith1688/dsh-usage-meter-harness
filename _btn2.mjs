import fs from 'node:fs';
let s = fs.readFileSync('src/client.tsx', 'utf8');
// 按钮容器居中（仅匹配后跟 saveModelPrice 的那个 gap:8 容器）
const reCont = /(<div style=\{\{ display: 'flex', alignItems: 'center', gap: 8 \}\}>)(\s*<button type="button"[^>]*onClick=\{\s*\(\)\s*=>\s*void saveModelPrice)/;
if (reCont.test(s)) {
  s = s.replace(reCont, "<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: '6px 0 2px' }}$2");
}
// 两个按钮尺寸
s = s.split("fontSize: 12, padding: '4px 12px', borderRadius: 6, border: `1px solid ${t.border}`, background: t.accent").join("fontSize: 13, padding: '6px 22px', borderRadius: 6, border: `1px solid ${t.border}`, background: t.accent");
s = s.split("fontSize: 12, padding: '4px 12px', borderRadius: 6, border: `1px solid ${t.border}`, background: 'transparent'").join("fontSize: 13, padding: '6px 22px', borderRadius: 6, border: `1px solid ${t.border}`, background: 'transparent'");
fs.writeFileSync('src/client.tsx', s);
console.log('btn edit ok');
