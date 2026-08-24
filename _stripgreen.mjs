import fs from 'node:fs';
let s = fs.readFileSync('src/client.tsx', 'utf8');
const NL = '\\r?\\n';
const re = (p) => new RegExp(p, 'g');
let removed = 0;

// 1) apiKeyTip 绿块
const a = `\\s*<div style=\\{\\{ fontSize: 11, color: t\\.ok, lineHeight: 1\\.5 \\}\\}>${NL}\\s*\\{tt\\('apiKeyTip'\\)\\}${NL}\\s*</div>`;
if (re(a).test(s)) { s = s.replace(re(a), ''); removed++; }

// 2) prefillOfficial 绿块
const b = `${NL}\\s*\\{e\\.prefillOfficial && \\(\\s*<div style=\\{\\{ color: t\\.ok, fontSize: 11, lineHeight: 1\\.4 \\}\\}>\\{tt\\('prefillOfficial'\\)\\}</div>\\s*\\)\\}`;
if (re(b).test(s)) { s = s.replace(re(b), ''); removed++; }

// 3) sharedBalNote 绿块
const c = `${NL}\\s*\\{e\\.usesSharedBalance === true && \\(\\s*<div style=\\{\\{ color: t\\.ok, fontSize: 11, lineHeight: 1\\.4 \\}\\}>\\{tt\\('sharedBalNote'\\)\\}</div>\\s*\\)\\}`;
if (re(c).test(s)) { s = s.replace(re(c), ''); removed++; }

// 4) balanceTip 绿 span
const d = `<span style=\\{\\{ fontSize: 10, color: t\\.ok \\}\\}>\\{tt\\('balanceTip'\\)\\}</span>` + NL;
if (re(d).test(s)) { s = s.replace(re(d), ''); removed++; }

// 5) templateTip 绿 span
const e = `<span style=\\{\\{ fontSize: 10, color: t\\.ok \\}\\}>\\{tt\\('templateTip'\\)\\}</span>` + NL;
if (re(e).test(s)) { s = s.replace(re(e), ''); removed++; }

// 6) 保存反馈绿色 → 灰（t.text2）
s = s.replace(/color: t\.ok, fontSize: 10/g, 'color: t.text2, fontSize: 10');

fs.writeFileSync('src/client.tsx', s);
console.log('green hints removed:', removed);
