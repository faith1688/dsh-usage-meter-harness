// i18n 对应性审计：client.tsx 用到的每个键 vs i18n.ts 三个字典
import { readFileSync } from 'node:fs';
const c = readFileSync('z:/deepseek/dsh-usage-meter/src/client.tsx', 'utf8');
const i = readFileSync('z:/deepseek/dsh-usage-meter/src/i18n.ts', 'utf8');

// 提取 client.tsx 中 L('...') 与 tt('...') 的字面量
const usedL = new Map();
const usedTt = new Map();
for (const m of c.matchAll(/L\('((?:[^'"\\]|\\.)*)'\)/g)) {
  const k = m[1].replace(/\\'/g, "'");
  if (!usedL.has(k)) usedL.set(k, 0);
  usedL.set(k, usedL.get(k) + 1);
}
for (const m of c.matchAll(/tt\('((?:[^'\\]|\\.)*)'\)/g)) {
  const k = m[1].replace(/\\'/g, "'");
  if (!usedTt.has(k)) usedTt.set(k, 0);
  usedTt.set(k, usedTt.get(k) + 1);
}

// 提取 i18n.ts 的字典块
function block(src, startMarker) {
  const s = src.indexOf(startMarker);
  if (s < 0) throw new Error('marker not found: ' + startMarker);
  const e = src.indexOf('\n};', s);
  return src.slice(s, e);
}
function dictKeys(blk, named) {
  const keys = new Map();
  const re = named ? /(?:^|\n)\s{2}([A-Za-z_$][\w$]*):\s*['"]((?:[^'"\\]|\\.)*)['"]/g : /(?:^|\n)\s{2}'((?:[^'"\\]|\\.)*)':\s*['"]((?:[^'"\\]|\\.)*)['"]/g;
  for (const m of blk.matchAll(re)) keys.set(m[1], m[2]);
  return keys;
}
const zhDict = dictKeys(block(i, 'const zh = {'), true);
const enDict = dictKeys(block(i, 'const en: Partial<typeof zh> = {'), true);
const enByZh = dictKeys(block(i, 'const EN_BY_ZH: Record<string, string> = {'), false);

let bad = 0;
const report = (title, items) => {
  if (items.length === 0) return;
  bad += items.length;
  console.log(`\n### ${title} (${items.length})`);
  for (const x of items) console.log('  ' + x);
};

// 1) L() 用的中文键缺英文
report('L() 缺英文（EN_BY_ZH 无此键）', [...usedL.keys()].filter((k) => !enByZh.has(k)).map((k) => JSON.stringify(k)));
// 2) tt() 键缺 zh（回退都会坏）
report('tt() 键在 zh 字典缺失', [...usedTt.keys()].filter((k) => !zhDict.has(k)));
// 3) tt() 键缺 en
report('tt() 键在 en 字典缺失', [...usedTt.keys()].filter((k) => zhDict.has(k) && !enDict.has(k)));
// 4) en 字典孤儿（zh 无此键）
report('en 字典孤儿键', [...enDict.keys()].filter((k) => !zhDict.has(k)));
// 5) EN_BY_ZH 孤儿（client 未使用）——仅统计
const orphanL = [...enByZh.keys()].filter((k) => !usedL.has(k));
console.log(`\nEN_BY_ZH 孤儿键（未被使用，无害）: ${orphanL.length}`);
// 6) 语义体检：英文值 == 中文值（未翻译）或空
report('EN_BY_ZH 未翻译（en==zh）或空值', [...enByZh.entries()].filter(([zh, en]) => en === zh || en.trim() === '').map(([zh]) => JSON.stringify(zh)));
report('tt() zh 值无中文（需人工核对）', [...zhDict.entries()].filter(([k, zhV]) => !/[一-鿿]/.test(zhV)).map(([k, v]) => `${k} = ${JSON.stringify(v)}`));
console.log(`\n统计: 使用 L 键 ${usedL.size} | 使用 tt 键 ${usedTt.size} | zh 字典 ${zhDict.size} | en 字典 ${enDict.size} | EN_BY_ZH ${enByZh.size}`);
console.log(bad === 0 ? 'ALL PAIRED' : `NEEDS FIX: ${bad}`);
