import fs from 'node:fs';
let s = fs.readFileSync('src/client.tsx', 'utf8');
// 通用表单：舒适间距、统一字号
s = s.replace("const field: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '6px 0' };", "const field: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '8px 0' };");
s = s.replace("const label: CSSProperties = { fontSize: 13, color: t.text2, minWidth: 120 };", "const label: CSSProperties = { fontSize: 13, color: t.text2, minWidth: 132 };");
s = s.replace("const input: CSSProperties = { flex: 1, maxWidth: 320, padding: '4px 8px', border: `1px solid ${t.border}`, borderRadius: 6, fontSize: 13, background: t.card, color: t.text };", "const input: CSSProperties = { flex: 1, maxWidth: 320, padding: '6px 8px', border: `1px solid ${t.border}`, borderRadius: 6, fontSize: 13, background: t.card, color: t.text };");
s = s.replace("const select: CSSProperties = { padding: '4px 8px', border: `1px solid ${t.border}`, borderRadius: 6, fontSize: 13, background: t.card, color: t.text };", "const select: CSSProperties = { padding: '6px 8px', border: `1px solid ${t.border}`, borderRadius: 6, fontSize: 13, background: t.card, color: t.text };");
// 模型编辑器网格：行间距 6→10、列距 10→12、网格标签字号 11→13
s = s.replace("rowGap: 6, alignItems: 'center' }", "rowGap: 10, alignItems: 'center' }");
s = s.replace("columnGap: 10, rowGap:", "columnGap: 12, rowGap:");
s = s.replaceAll("fontSize: 11, color: t.text2, textAlign: 'right' as const", "fontSize: 13, color: t.text2, textAlign: 'right' as const");
fs.writeFileSync('src/client.tsx', s);
console.log('typography applied');
