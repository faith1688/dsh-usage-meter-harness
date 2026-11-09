// dev/make-release-v300.mjs — 创建 v3.0.0 GitHub Release 并上传桌面版 tgz。
// token 从环境变量 GH_TOKEN 读取（由 git credential fill 注入），绝不打印。
// 发布说明正文来自 dev/release-notes-v300.md（单一事实来源，便于 review/diff）。
// 用法：$env:GH_TOKEN=<token>; node dev/make-release-v300.mjs
import { readFileSync, statSync } from 'node:fs';

const token = process.env.GH_TOKEN;
if (!token) throw new Error('GH_TOKEN not set');

const repo = 'faith1688/dsh-usage-meter-harness';
const tag = 'v3.0.0';
const assetPath = 'dev/dsh-usage-meter-desktop-3.0.0.tgz';
const api = 'https://api.github.com';

const notes = readFileSync('dev/release-notes-v300.md', 'utf8');
if (notes.trim() === '') throw new Error('release notes empty');
if (statSync(assetPath).size === 0) throw new Error('asset empty');

const headers = {
  authorization: `Bearer ${token}`,
  accept: 'application/vnd.github+json',
  'user-agent': 'dsh-release-script',
  'x-github-api-version': '2022-11-28',
};

const j = async (r) => {
  const text = await r.text();
  try { return JSON.parse(text); } catch { return { raw: text.slice(0, 300) }; }
};

// 1. auth
const me = await fetch(`${api}/user`, { headers });
const meJ = await j(me);
console.log(`auth: HTTP ${me.status} login=${meJ.login ?? '?'}`);
if (me.status !== 200) throw new Error(`auth failed: ${JSON.stringify(meJ).slice(0, 300)}`);

// 2. tag exists?
const tagRes = await fetch(`${api}/repos/${repo}/git/ref/tags/${tag}`, { headers });
console.log(`tag ${tag}: HTTP ${tagRes.status}${tagRes.status === 404 ? ' (NOT PUSHED!)' : ''}`);
if (tagRes.status !== 200) throw new Error(`tag ${tag} not on remote`);

// 3. create release (or reuse if it already exists)
let rel = await fetch(`${api}/repos/${repo}/releases`, {
  method: 'POST',
  headers: { ...headers, 'content-type': 'application/json' },
  body: JSON.stringify({
    tag_name: tag,
    name: `v3.0.0 — 桌面版（DSH 0.2 desktop build）`,
    body: notes,
    draft: false,
    prerelease: false,
  }),
});
let relJ = await j(rel);
if (rel.status === 422) {
  console.log('release exists, fetching…');
  rel = await fetch(`${api}/repos/${repo}/releases/tags/${tag}`, { headers });
  relJ = await j(rel);
}
console.log(`release: HTTP ${rel.status} id=${relJ.id} url=${relJ.html_url ?? '?'}`);
if (!relJ.id) throw new Error(`release create failed: ${JSON.stringify(relJ).slice(0, 400)}`);

// 4. upload asset (skip if same name already uploaded)
const cur = await fetch(`${api}/repos/${repo}/releases/${relJ.id}/assets`, { headers });
const assets = await j(cur);
const existing = Array.isArray(assets) ? assets.find((a) => a.name === 'dsh-usage-meter-desktop-3.0.0.tgz') : null;
if (existing) {
  console.log(`asset exists: ${existing.name} ${existing.size} bytes, deleting to re-upload…`);
  const del = await fetch(`${api}/repos/${repo}/releases/assets/${existing.id}`, { method: 'DELETE', headers });
  console.log(`delete asset: HTTP ${del.status}`);
}

const buf = readFileSync(assetPath);
const name = 'dsh-usage-meter-desktop-3.0.0.tgz';
const up = await fetch(
  `https://uploads.github.com/repos/${repo}/releases/${relJ.id}/assets?name=${encodeURIComponent(name)}`,
  {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/octet-stream', 'content-length': String(buf.length) },
    body: buf,
  },
);
const upJ = await j(up);
console.log(`upload: HTTP ${up.status} name=${upJ.name ?? '?'} size=${upJ.size ?? '?'}`);
if (up.status >= 300) throw new Error(`upload failed: ${JSON.stringify(upJ).slice(0, 400)}`);

console.log(`\nDONE  ${relJ.html_url}`);
