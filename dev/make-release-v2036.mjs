// dev/make-release-v2036.mjs — 创建 v2.0.36 GitHub Release 并上传 npm pack 产物。
// token 从环境变量 GH_TOKEN 读取（由 git credential fill 注入），绝不打印。
// 发布说明正文来自 dev/release-notes-v2036.md（单一事实来源，便于 review/diff）。
// 用法：$env:GH_TOKEN=<token>; node dev/make-release-v2036.mjs
import { readFileSync } from 'node:fs';

const token = process.env.GH_TOKEN;
if (!token) throw new Error('GH_TOKEN not set');

const repo = 'faith1688/dsh-usage-meter-harness';
const tag = 'v2.0.36';
const assetPath = 'faith1688-dsh-usage-meter-harness-2.0.36.tgz';
const api = 'https://api.github.com';
const notes = readFileSync('dev/release-notes-v2036.md', 'utf8');
if (notes.trim() === '') throw new Error('release notes empty');

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
console.log(`READBACK tag=${final.tag_name} draft=${final.draft} prerelease=${final.prerelease} assets=${(final.assets ?? []).map((a) => a.name).join(',')} bodyLen=${(final.body ?? '').length} html=${final.html_url}`);
