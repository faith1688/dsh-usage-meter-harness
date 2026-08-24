import fs from 'node:fs';
const p = 'src/client.tsx';
const lines = fs.readFileSync(p, 'utf8').split('\n');
const BT = String.fromCharCode(96);
const divider = (ind) => ind + '<div style={{ borderTop: ' + BT + '1px solid ${t.borderSoft}' + BT + ", margin: '12px 0 10px' }} />";
const anchors = ['R5 自定义单价项：templateId', '峰谷定价可见时（官方'];
const insertPos = [];
for (let i = 0; i < lines.length; i++) {
  for (const a of anchors) {
    if (lines[i].includes(a)) {
      const ind = lines[i].match(/^\s*/)[0];
      insertPos.push({ at: i, ind });
    }
  }
}
insertPos.sort((x, y) => y.at - x.at);
let out = lines.slice();
for (const e of insertPos) {
  out.splice(e.at, 0, divider(e.ind));
}
fs.writeFileSync(p, out.join('\n'));
console.log('dividers inserted at', insertPos.map((e) => e.at + 1));
console.log('sample:', divider('  '));
