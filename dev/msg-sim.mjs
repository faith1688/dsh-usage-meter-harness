// 最小可运行检查：用截图场景模拟新四段消息拼接
const L = (s) => s; // zh 模式原样
const modelDir = [{ provider: 'deepseek-official', label: 'DeepSeek', models: [
  { model: 'deepseek-flash', label: 'DeepSeek-V4-Flash' },
  { model: 'deepseek-v4-pro', label: 'DeepSeek-V4-Pro' },
  { model: 'deepseek-v41-flash', label: 'DeepSeek-V41-Flash' },
  { model: 'deepseek-v4-flash-vision-exp', label: 'DeepSeek-V4-Flash-Vision-Exp' },
]}];
const doc = {
  pageModels: ['deepseek-flash', 'deepseek-v4-pro', 'deepseek-chat'],
  updated: [
    { pageModel: 'deepseek-flash', model: 'deepseek-flash', input: 1, output: 3 },
    { pageModel: 'deepseek-v4-pro', model: 'deepseek-v4-pro', input: 4.5, output: 18 },
  ],
  missing: [{ pageModel: 'deepseek-chat' }],
  retired: ['deepseek-v41-flash', 'deepseek-v4-flash-vision-exp'],
  warnings: [],
};
const n = doc.updated?.length ?? 0;
const localOfficial = modelDir.find((p) => p.provider === 'deepseek-official')?.models ?? [];
const labelOf = new Map(localOfficial.map((m) => [m.model, m.label]));
const syncedArr = (doc.updated ?? []).map((u) => labelOf.get(u.model) ?? u.model);
const unlistedArr = (doc.retired ?? []).map((r) => labelOf.get(r) ?? r);
const pageModels = doc.pageModels ?? [];
const warn = doc.warnings?.length ?? 0;
const lines = [];
if (localOfficial.length > 0) lines.push(`${L('官方模型 ')}${localOfficial.length}${L(' 个：')}${localOfficial.map((m) => m.label).join('、')}`);
if (pageModels.length > 0) lines.push(`${L('官网定价 ')}${pageModels.length}${L(' 个：')}${pageModels.join('、')}`);
if (syncedArr.length > 0) lines.push(`${L('已更新 ')}${n}${L(' 个：')}${syncedArr.join('、')}`);
if (unlistedArr.length > 0) lines.push(`${L('官网未定价 ')}${unlistedArr.length}${L(' 个：')}${unlistedArr.join('、')}`);
if (warn > 0) lines.push(`${warn}${L(' 条警告')}`);
const out = lines.join('\n');
console.log(out);
// 断言：四行、顺序正确、空段省略
const expect = [
  '官方模型 4 个：DeepSeek-V4-Flash、DeepSeek-V4-Pro、DeepSeek-V41-Flash、DeepSeek-V4-Flash-Vision-Exp',
  '官网定价 3 个：deepseek-flash、deepseek-v4-pro、deepseek-chat',
  '已更新 2 个：DeepSeek-V4-Flash、DeepSeek-V4-Pro',
  '官网未定价 2 个：DeepSeek-V41-Flash、DeepSeek-V4-Flash-Vision-Exp',
];
if (out !== expect.join('\n')) { console.error('MISMATCH'); process.exit(1); }
// 边界：全量同步（retired 为空）→ 第四行省略
doc2: {
  const d2 = { ...doc, retired: [] };
  const lines2 = [];
  if (localOfficial.length > 0) lines2.push(`${L('官方模型 ')}${localOfficial.length}${L(' 个：')}${localOfficial.map((m) => m.label).join('、')}`);
  if (pageModels.length > 0) lines2.push(`${L('官网定价 ')}${pageModels.length}${L(' 个：')}${pageModels.join('、')}`);
  if (syncedArr.length > 0) lines2.push(`${L('已更新 ')}${n}${L(' 个：')}${syncedArr.join('、')}`);
  if ((d2.retired ?? []).length > 0) lines2.push(`${L('官网未定价 ')}${(d2.retired ?? []).length}${L(' 个：')}${(d2.retired ?? []).join('、')}`);
  if (lines2.length !== 3) { console.error('EDGE FAIL: expect 3 lines, got', lines2.length); process.exit(1); }
}
console.log('ASSERT PASS');
