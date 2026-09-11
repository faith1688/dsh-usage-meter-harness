// dev/make-release-v2035.mjs — 创建 GitHub Release 并上传 npm pack 产物。
// token 从环境变量 GH_TOKEN 读取（由 git credential fill 注入），绝不打印。
// 用法：$env:GH_TOKEN=<token>; node dev/make-release-v2035.mjs
import { readFileSync } from 'node:fs';

const token = process.env.GH_TOKEN;
if (!token) throw new Error('GH_TOKEN not set');

const repo = 'faith1688/dsh-usage-meter-harness';
const tag = 'v2.0.35';
const assetPath = 'faith1688-dsh-usage-meter-harness-2.0.35.tgz';
const api = 'https://api.github.com';

const headers = {
  authorization: `Bearer ${token}`,
  accept: 'application/vnd.github+json',
  'user-agent': 'dsh-release-script',
  'x-github-api-version': '2022-11-28',
};

const notes = `## v2.0.35 — 计费准确性修复

**回合归因（turn attribution）**
- 会话中途切换模型时，正在进行的回合不再沿用上一回合的模型标签（此前切到 \`deepseek-flash\` 后正在跑的第 80 轮仍显示旧模型）。现在回合归属 = 本回合第一个真正产生用量的请求，识别 DSH 官方 \`model/selection\` 事件。
- 回合币种在首个计费用量到达时定标：美元定价的回合不再被按人民币累计显示（修复差一个汇率）。

**峰谷与看板**
- 畸形 override 中 \`start === end\` 的退化窗口 [x,x) 视为空集，不再被判定为全天峰价。
- 用量看板统计改用 \`(turn, step)\` 基线去重：修复会话中途切模型后看板样本全丢、新 step 首段用量漏计、相邻等值样本被误判重复这三处漏计。
- 看板与钱包/投影使用同一计费时钟（step 起始时刻），峰谷边界两侧两本账一致。

**验证**
- 新增回归 \`scripts/test-usage-accounting.mjs\`（8 组场景全 PASS），并在真实 v3 会话日志上回放验证。
- README 更新：20 个内置主题（默认 forest-beach-dawn）与回合归因精确性写入功能表。

## v2.0.35 — billing accuracy fixes

- Mid-session model switches no longer mislabel the running turn; attribution follows the first usage-producing request (recognising the official \`model/selection\` event).
- Turn currency is fixed at the turn's first billed usage — USD-priced turns convert correctly instead of showing as unconverted CNY.
- Degenerate peak window [x,x) (start === end) is treated as empty — no more all-day peak billing from malformed overrides.
- Dashboard stats dedupe on a \`(turn, step)\` baseline, fixing three under-counting paths; dashboard, wallet and projection bill on the same clock (step start time).
- New regression suite \`scripts/test-usage-accounting.mjs\` (all PASS), replayed against a real v3 session log.
- README: documents the 20 built-in themes (default forest-beach-dawn) and accurate turn attribution.`;

const j = async (r) => {
  const text = await r.text();
  try { return JSON.parse(text); } catch { return { raw: text.slice(0, 300) }; }
};

// 1. auth
const me = await fetch(`${api}/user`, { headers });
console.log(`auth: HTTP ${me.status} login=${(await j(me)).login ?? '?'}`);

// 2. tag exists?
const tagRes = await fetch(`${api}/repos/${repo}/git/ref/tags/${tag}`, { headers });
console.log(`tag ${tag}: HTTP ${tagRes.status}${tagRes.status === 404 ? ' (NOT PUSHED!)' : ''}`);

// 3. create release (or reuse if it already exists)
let rel = await fetch(`${api}/repos/${repo}/releases`, {
  method: 'POST',
  headers: { ...headers, 'content-type': 'application/json' },
  body: JSON.stringify({ tag_name: tag, name: tag, body: notes, draft: false, prerelease: false }),
});
let relJson = await j(rel);
if (rel.status === 422) {
  console.log('release already exists -> reusing');
  rel = await fetch(`${api}/repos/${repo}/releases/tags/${tag}`, { headers });
  relJson = await j(rel);
}
console.log(`release: HTTP ${rel.status} id=${relJson.id ?? '?'} url=${relJson.html_url ?? JSON.stringify(relJson).slice(0, 200)}`);
if (rel.status >= 300) process.exit(1);
const releaseId = relJson.id;

// 4. upload the tarball asset (skip if a same-named asset is already there)
const existing = await j(await fetch(`${api}/repos/${repo}/releases/${releaseId}/assets`, { headers }));
const name = assetPath.split('/').pop();
if (Array.isArray(existing) && existing.some((a) => a.name === name)) {
  console.log(`asset already uploaded: ${name} (${existing.find((a) => a.name === name).size} bytes)`);
} else {
  const buf = readFileSync(assetPath);
  const up = await fetch(
    `https://uploads.github.com/repos/${repo}/releases/${releaseId}/assets?name=${encodeURIComponent(name)}`,
    { method: 'POST', headers: { ...headers, 'content-type': 'application/octet-stream' }, body: buf },
  );
  const upJson = await j(up);
  console.log(`asset upload: HTTP ${up.status} name=${upJson.name ?? '?'} size=${upJson.size ?? '?'} state=${upJson.state ?? '?'}`);
  if (up.status >= 300) { console.log(JSON.stringify(upJson).slice(0, 400)); process.exit(1); }
}

// 5. final readback
const final = await j(await fetch(`${api}/repos/${repo}/releases/tags/${tag}`, { headers }));
console.log(`READBACK tag=${final.tag_name} draft=${final.draft} prerelease=${final.prerelease} assets=${(final.assets ?? []).map((a) => a.name).join(',')} html=${final.html_url}`);
