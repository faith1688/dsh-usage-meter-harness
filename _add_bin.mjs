import fs from 'node:fs';
const p = JSON.parse(fs.readFileSync('package.json', 'utf8'));
p.bin = { 'dsh-usage-meter-install': 'scripts/install.mjs' };
if (!p.files.includes('scripts')) p.files.push('scripts');
p.version = '1.0.4';
fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');
console.log('bin:', JSON.stringify(p.bin), '| files:', JSON.stringify(p.files), '| version:', p.version);
