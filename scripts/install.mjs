#!/usr/bin/env node
// dsh-usage-meter-harness one-line installer (no pnpm, no GitHub needed).
// Run via: npx -y @faith1688/dsh-usage-meter-harness
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const NAME = '@faith1688/dsh-usage-meter-harness';
const profileDir = process.env.DSH_PROFILE_DIR || path.join(os.homedir(), '.dsh', 'profiles', 'web');
fs.mkdirSync(profileDir, { recursive: true });
const pkgPath = path.join(profileDir, 'package.json');
if (!fs.existsSync(pkgPath)) {
  fs.writeFileSync(pkgPath, JSON.stringify({ name: 'dsh-web-profile', private: true }, null, 2) + '\n');
}
process.chdir(profileDir);
console.log(`[1/3] Installing ${NAME} into DSH profile: ${profileDir}`);
execFileSync('npm', ['i', '--verbose', NAME], { stdio: 'inherit' });
console.log('[2/3] Registering bundle...');
const j = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
j.dsh = j.dsh || {};
j.dsh.profile = j.dsh.profile || {};
j.dsh.profile.bundles = j.dsh.profile.bundles || [];
if (!j.dsh.profile.bundles.includes(NAME)) j.dsh.profile.bundles.push(NAME);
fs.writeFileSync(pkgPath, JSON.stringify(j, null, 2) + '\n');
console.log('[3/3] Done. Restart "dsh web" to load the plugin.');
