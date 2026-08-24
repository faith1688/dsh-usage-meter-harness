import fs from 'node:fs';
const p = JSON.parse(fs.readFileSync('package.json', 'utf8'));
// peerDependencies 清零：我们的包运行时不 import 任何 @deepseek-ai/*（注入由宿主提供），
// 声明 peer 会让 pnpm 尝试升级 profile 里共享包，可能破坏对方 DSH 环境。
// 清空后安装=纯复制，零解析、零升级，结构上不可能影响其他插件。
p.peerDependencies = {};
p.version = '1.0.3';
fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');
console.log('peers:', JSON.stringify(p.peerDependencies), '| version:', p.version);
