import fs from 'node:fs';
const p = JSON.parse(fs.readFileSync('package.json', 'utf8'));
// 运行时依赖清零：zod / schemastery 由 DSH 宿主提供（peer），本地构建测试用 devDeps
p.dependencies = {};
p.version = '1.0.1';
if (!p.peerDependencies) p.peerDependencies = {};
p.peerDependencies['@deepseek-ai/schemastery'] = '^3.18.1';
p.peerDependencies['zod'] = '^4.4.3';
if (!p.devDependencies) p.devDependencies = {};
p.devDependencies['@deepseek-ai/schemastery'] = '^3.18.1';
p.devDependencies['zod'] = '^4.4.3';
fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');
console.log('deps:', JSON.stringify(p.dependencies), '| version:', p.version);
