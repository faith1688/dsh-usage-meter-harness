import fs from 'node:fs';
let en = fs.readFileSync('README.md', 'utf8');
const old3 = en.slice(en.indexOf('### Method 3'), en.indexOf('After any method'));
const new3 = `### Method 3 — one-line installer script, no pnpm

Windows (cmd):

\`\`\`bat
curl -fsSL https://raw.githubusercontent.com/faith1688/dsh-usage-meter-harness/main/scripts/install.cmd -o "%TEMP%\\um-install.cmd" && "%TEMP%\\um-install.cmd"
\`\`\`

Linux / macOS:

\`\`\`bash
curl -fsSL https://raw.githubusercontent.com/faith1688/dsh-usage-meter-harness/main/scripts/install.sh | sh
\`\`\`

The script does everything for you: ` + "`cd`" + ` into the DSH web profile, installs the
package with visible progress, and registers the bundle in \`dsh.profile.bundles\`
(idempotent — safe to re-run after upgrades).`;
en = en.replace(old3, new3 + '\n\n');
fs.writeFileSync('README.md', en);

let zh = fs.readFileSync('README.zh-CN.md', 'utf8');
const zold = zh.slice(zh.indexOf('### 方式三'), zh.indexOf('任选一种方式后'));
const znew = `### 方式三 —— 一键安装脚本，不需要 pnpm

Windows（cmd）：

\`\`\`bat
curl -fsSL https://raw.githubusercontent.com/faith1688/dsh-usage-meter-harness/main/scripts/install.cmd -o "%TEMP%\\um-install.cmd" && "%TEMP%\\um-install.cmd"
\`\`\`

Linux / macOS：

\`\`\`bash
curl -fsSL https://raw.githubusercontent.com/faith1688/dsh-usage-meter-harness/main/scripts/install.sh | sh
\`\`\`

脚本会自动完成全部步骤：进入 DSH web profile → 安装包（可见进度）→ 注册
\`dsh.profile.bundles\`（幂等，升级后重跑安全）。`;
zh = zh.replace(zold, znew + '\n\n');
fs.writeFileSync('README.zh-CN.md', zh);
console.log('readme method3 one-liner ok');
