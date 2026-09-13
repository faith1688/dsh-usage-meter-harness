// dev/mark-v2036-superseded.mjs — 在 v2.0.36 的 Release 说明顶部插入"已被取代"警告。
// 背景：v2.0.36 修好了"远程端速度恒 0.0"，但引入"流式结束后速度停在最后一个值"的回退 bug，
// 且从未发布到 npm；v2.0.37 取代它。为避免有人误装 2.0.36，给它的说明加醒目提示。
// 幂等：已含提示则不重复插入。用法：$env:GH_TOKEN=<token>; node dev/mark-v2036-superseded.mjs
const token = process.env.GH_TOKEN;
if (!token) throw new Error('GH_TOKEN not set');

const repo = 'faith1688/dsh-usage-meter-harness';
const api = 'https://api.github.com';
const marker = '已被 v2.0.37 取代';
const warning = `> ⚠️ **本版从未发布到 npm，${marker}。**
> 它修好了「远程端速度恒 0.0」，但引入了「流式结束后速度停在最后一个值不动」的回退 bug（详见 v2.0.37）。请直接使用 **v2.0.37**。

`;

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

const rel = await j(await fetch(`${api}/repos/${repo}/releases/tags/v2.0.36`, { headers }));
if (rel.id === undefined) { console.log('v2.0.36 release not found:', JSON.stringify(rel).slice(0, 200)); process.exit(1); }
const body = rel.body ?? '';
if (body.includes(marker)) {
  console.log('already marked -> nothing to do');
} else {
  const patched = await j(await fetch(`${api}/repos/${repo}/releases/${rel.id}`, {
    method: 'PATCH',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ body: warning + body }),
  }));
  console.log(`patch: HTTP status via id=${patched.id ?? '?'} bodyLen=${(patched.body ?? '').length}`);
}

const final = await j(await fetch(`${api}/repos/${repo}/releases/tags/v2.0.36`, { headers }));
console.log(`READBACK v2.0.36 bodyLen=${(final.body ?? '').length} marked=${(final.body ?? '').includes(marker)} head="${(final.body ?? '').slice(0, 60).replace(/\n/g, ' ')}"`);
