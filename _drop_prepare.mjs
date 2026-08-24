import fs from 'node:fs';
const p = JSON.parse(fs.readFileSync('package.json', 'utf8'));
// 删除 prepare：git-hosted 安装不再触发构建（lib/ 已提交），
// 与零依赖配合 → 纯复制安装，任何来源都不需要 pnpm。
delete p.scripts.prepare;
p.version = '1.0.2';
fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');
console.log('scripts:', JSON.stringify(p.scripts), '| version:', p.version);
