// v2.0.33 fresh-machine audit: extract tgz into clean temp dir, verify it is
// self-contained and version-independent. No network, no DSH needed.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const tgz = 'z:/deepseek/dsh-usage-meter/faith1688-dsh-usage-meter-harness-2.0.33.tgz';
if (!fs.existsSync(tgz)) { console.error('ABORT tgz missing'); process.exit(1); }

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-um-audit-'));
execFileSync('tar', ['-xzf', tgz, '-C', tmp], { stdio: 'inherit' });
const root = path.join(tmp, 'package');
console.log('extracted to ' + root);

// 1) file inventory
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else files.push(p.slice(root.length + 1).replace(/\\/g, '/'));
  }
})(root);
console.log('\n[1] tgz file inventory (' + files.length + ' files):');
for (const f of files.sort()) console.log('  ' + f);

const mustHave = ['package.json', 'lib/index.js', 'lib/client.js', 'lib/theme.js', 'lib/i18n.js', 'lib/globals.js'];
for (const m of mustHave) if (!files.includes(m)) { console.error('ABORT missing ' + m); process.exit(1); }
console.log('all must-have files present');

// 2) stale tgz / dev files inside the tgz?
const bad = files.filter((f) => /\.(tgz|ts)$/.test(f) || f.startsWith('dev/') || f.startsWith('src/') || f.includes('node_modules'));
console.log('\n[2] stale/dev files inside tgz: ' + (bad.length ? bad.join(', ') : 'NONE (clean)'));

// 3) package.json facts
const pj = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
console.log('\n[3] package.json:');
console.log('  name=' + pj.name + ' version=' + pj.version);
console.log('  main=' + pj.main + ' files=' + JSON.stringify(pj.files || null));
console.log('  dependencies=' + JSON.stringify(pj.dependencies || null));
console.log('  peerDependencies=' + JSON.stringify(pj.peerDependencies || null));
console.log('  engines=' + JSON.stringify(pj.engines || null));
if (pj.version !== '2.0.33') { console.error('ABORT version mismatch'); process.exit(1); }
if (pj.dependencies && Object.keys(pj.dependencies).length) console.error('  !! has runtime deps (check resolvability)');
if (pj.peerDependencies && JSON.stringify(pj.peerDependencies).includes('deepseek')) console.error('  !! peerDep on DSH = version-locked');

// 4) node --check every js
console.log('\n[4] node --check:');
let ok = 0;
for (const f of files.filter((f) => f.endsWith('.js'))) {
  execFileSync(process.execPath, ['--check', path.join(root, f)]);
  ok++;
}
console.log('  ' + ok + ' js files pass syntax check');

// 5) absolute paths / machine-specific strings inside tgz
console.log('\n[5] machine-specific strings:');
let hits = 0;
for (const f of files) {
  const c = fs.readFileSync(path.join(root, f), 'utf8');
  const pats = [
    [/C:[\\/]+Users[\\/]+faith/i, 'C:/Users/faith'],
    [/Z:[\\/]+deepseek/i, 'Z:/deepseek'],
    [/file:Z:/i, 'file:Z: ref'],
    [/[\/]Users[\/]/, '/Users/'],
    [/127\.0\.0\.1:3080/, 'localhost:3080 literal'],
  ];
  for (const [re, tag] of pats) {
    const m = c.match(re);
    if (m) { console.error('  !! ' + f + ' contains ' + tag + ': ' + m[0]); hits++; }
  }
}
console.log(hits ? '  ' + hits + ' hits (ABORT)' : '  NONE (clean)');
if (hits) process.exit(1);

// 6) external imports in server entry (must be node builtins or @deepseek-ai/dsh only)
console.log('\n[6] index.js imports:');
const idx = fs.readFileSync(path.join(root, 'lib/index.js'), 'utf8');
const imps = new Set();
for (const m of idx.matchAll(/(?:require\(|from\s+|import\()(['"])([^'"]+)\1/g)) imps.add(m[2]);
for (const i of [...imps].sort()) console.log('  ' + i);

console.log('\nDONE fresh-machine audit');
fs.rmSync(tmp, { recursive: true, force: true });
