import fs from 'node:fs';
let en = fs.readFileSync('README.md', 'utf8');
const installEn = `## Install

Pick one of the three methods. **Methods 1 and 2 need pnpm** (a one-time machine
setup used by the DSH CLI itself): \`npm install -g pnpm\` or \`corepack enable\`.

### Method 1 — npm registry via DSH CLI (needs pnpm)

\`\`\`bash
dsh plugin --profile web add @faith1688/dsh-usage-meter-harness
\`\`\`

### Method 2 — GitHub via DSH CLI (needs pnpm)

\`\`\`bash
dsh plugin --profile web add github:faith1688/dsh-usage-meter-harness
\`\`\`

### Method 3 — plain npm, no pnpm

Install directly into the DSH web profile, then register the bundle:

\`\`\`bash
cd %USERPROFILE%\\.dsh\\profiles\\web
npm i @faith1688/dsh-usage-meter-harness
\`\`\`

Open \`package.json\` in that same folder and add the plugin to the
\`dsh.profile.bundles\` array:

\`\`\`json
"dsh": { "profile": { "bundles": [ /* ...existing... */, "@faith1688/dsh-usage-meter-harness" ] } }
\`\`\`

> Important: \`npm i\` must run inside the DSH profile folder — installing it in
> your home directory puts the package in the wrong place and DSH will not load it.

After any method: **restart \`dsh web\`**.`;
const anchorEn = en.indexOf('## Install');
const endEn = en.indexOf('## Features');
en = en.slice(0, anchorEn) + installEn + '\n\n' + en.slice(endEn);
fs.writeFileSync('README.md', en);

let zh = fs.readFileSync('README.zh-CN.md', 'utf8');
const installZh = `## 安装

三选一。**方式一和方式二需要 pnpm**（DSH CLI 本身的一次性前置要求，任意插件都一样）：
\`npm install -g pnpm\` 或 \`corepack enable\`。

### 方式一 —— npm 源（需要 pnpm）

\`\`\`bash
dsh plugin --profile web add @faith1688/dsh-usage-meter-harness
\`\`\`

### 方式二 —— GitHub 源（需要 pnpm）

\`\`\`bash
dsh plugin --profile web add github:faith1688/dsh-usage-meter-harness
\`\`\`

### 方式三 —— 纯 npm，不需要 pnpm

直接装进 DSH web profile，再手动注册 bundle：

\`\`\`bash
cd %USERPROFILE%\\.dsh\\profiles\\web
npm i @faith1688/dsh-usage-meter-harness
\`\`\`

打开同一目录下的 \`package.json\`，把插件加进 \`dsh.profile.bundles\` 数组：

\`\`\`json
"dsh": { "profile": { "bundles": [ /* ...原有... */, "@faith1688/dsh-usage-meter-harness" ] } }
\`\`\`

> 注意：\`npm i\` 必须在 DSH 的 profile 目录里执行——装在家目录会把包装到错误位置，
> DSH 不会加载它。

任选一种方式后：**重启 \`dsh web\`**。`;
const anchorZh = zh.indexOf('## 安装');
const endZh = zh.indexOf('## 功能一览');
zh = zh.slice(0, anchorZh) + installZh + '\n\n' + zh.slice(endZh);
fs.writeFileSync('README.zh-CN.md', zh);
console.log('readme updated');
