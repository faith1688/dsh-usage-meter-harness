// dev/update-release-notes.mjs — 用 dev/release-notes-v2035.md 覆盖 GitHub Release 说明正文。
// token 从 GH_TOKEN 读，绝不打印。
import { readFileSync } from 'node:fs';

const token = process.env.GH_TOKEN;
if (!token) throw new Error('GH_TOKEN not set');
const repo = 'faith1688/dsh-usage-meter-harness';
const tag = 'v2.0.35';
const body = readFileSync('dev/release-notes-v2035.md', 'utf8');

const headers = {
  authorization: `Bearer ${token}`,
  accept: 'application/vnd.github+json',
  'user-agent': 'dsh-release-script',
  'x-github-api-version': '2022-11-28',
};

const get = async (url) => {
  const r = await fetch(url, { headers });
  return [r.status, await r.json()];
};

const [gs, rel] = await get(`https://api.github.com/repos/${repo}/releases/tags/${tag}`);
if (gs !== 200) throw new Error(`release lookup failed: ${gs}`);
console.log(`release id=${rel.id} current body len=${rel.body?.length ?? 0}`);

const pr = await fetch(`https://api.github.com/repos/${repo}/releases/${rel.id}`, {
  method: 'PATCH',
  headers: { ...headers, 'content-type': 'application/json' },
  body: JSON.stringify({ body }),
});
const out = await pr.json();
console.log(`PATCH HTTP ${pr.status} new body len=${out.body?.length ?? 0}`);

const [cs, check] = await get(`https://api.github.com/repos/${repo}/releases/tags/${tag}`);
const c = check.body ?? '';
console.log(`readback HTTP ${cs} len=${c.length}`);
for (const needle of ['1.0.34', 'v2.0.35 — 从 1.0.34 升级', '20 个内置主题', 'English', '回合归因', 'npm 上的上一个发布版本']) {
  console.log(`  contains ${JSON.stringify(needle)}: ${c.includes(needle)}`);
}
console.log(`head: ${JSON.stringify(c.slice(0, 80))}`);
console.log(`tail: ${JSON.stringify(c.slice(-60))}`);
