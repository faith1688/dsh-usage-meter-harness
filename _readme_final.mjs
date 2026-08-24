import fs from 'node:fs';
let en = fs.readFileSync('README.md', 'utf8');
en = en.replace(
  '## Install\n\nPick one of the three methods.',
  '## Install\n\n> Prerequisite (methods 1 & 2): the DSH CLI itself runs on pnpm — install it once per machine:\n> `npm install -g pnpm` (or `corepack enable`), then verify with `pnpm --version`.\n\nPick one of the three methods.'
);
en = en.replace('### Method 1 — npm registry via DSH CLI (needs pnpm)\n\n```bash\ndsh plugin --profile web add @faith1688/dsh-usage-meter-harness\n```',
  '### Method 1 — npm registry via DSH CLI (needs pnpm)\n\n```bash\ndsh plugin --profile web add --verbose @faith1688/dsh-usage-meter-harness\n```\n\n(`--verbose` shows the install progress; drop it if you prefer a quiet install.)');
en = en.replace('### Method 2 — GitHub via DSH CLI (needs pnpm)\n\n```bash\ndsh plugin --profile web add github:faith1688/dsh-usage-meter-harness\n```',
  '### Method 2 — GitHub via DSH CLI (needs pnpm)\n\n```bash\ndsh plugin --profile web add --verbose github:faith1688/dsh-usage-meter-harness\n```\n\n(`--verbose` shows the install progress.)');
en = en.replace('### Method 3 — plain npm, no pnpm',
  '### Method 3 — plain npm, no pnpm (verbose by default)');
en += '\n## Privacy\n\n- The plugin makes **no telemetry and no analytics calls**.\n- Network requests are limited to two optional ones: querying the **official\n  DeepSeek balance API** with the API key you configure yourself, and fetching a\n  public USD→CNY exchange rate. Nothing else leaves your machine.\n- The source is MIT-licensed and fully readable on GitHub.\n';
fs.writeFileSync('README.md', en);

let zh = fs.readFileSync('README.zh-CN.md', 'utf8');
zh = zh.replace('## 安装\n\n三选一。',
  '## 安装\n\n> 前置（方式一、二）：DSH CLI 本身基于 pnpm，每台机器装一次即可：\n> `npm install -g pnpm`（或 `corepack enable`），用 `pnpm --version` 验证。\n\n三选一。');
zh = zh.replace('```bash\ndsh plugin --profile web add @faith1688/dsh-usage-meter-harness\n```\n\n### 方式二',
  '```bash\ndsh plugin --profile web add --verbose @faith1688/dsh-usage-meter-harness\n```\n\n（`--verbose` 显示安装进度，可去掉。）\n\n### 方式二');
zh = zh.replace('```bash\ndsh plugin --profile web add github:faith1688/dsh-usage-meter-harness\n```',
  '```bash\ndsh plugin --profile web add --verbose github:faith1688/dsh-usage-meter-harness\n```\n\n（`--verbose` 显示安装进度。）');
zh = zh.replace('### 方式三 —— 纯 npm，不需要 pnpm',
  '### 方式三 —— 纯 npm，不需要 pnpm（npm 默认显示进度）');
zh += '\n## 隐私\n\n- 插件**无任何遥测、无统计**。\n- 网络请求仅两处可选：① 用你自己配置的 API Key 查询 **DeepSeek 官方余额接口**；\n  ② 获取公开的 USD→CNY 汇率。除此之外没有任何数据离开你的机器。\n- 源码 MIT 协议，GitHub 上完全可查。\n';
fs.writeFileSync('README.zh-CN.md', zh);
console.log('readme ok');
