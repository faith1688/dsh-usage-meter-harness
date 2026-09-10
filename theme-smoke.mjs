// 主题体系冒烟测试：20 套主题 × 字体四分类完整性 + resolveTheme 三层回退。
// 用法：npm run bundle && node theme-smoke.mjs
import assert from 'node:assert';
import { THEMES, DEFAULT_CUSTOM, themeOf, resolveTheme } from './lib/theme.js';
import { normalizeHex } from './lib/globals.js';

assert.strictEqual(THEMES.length, 20, `expected 20 themes, got ${THEMES.length}`);
const ids = new Set(THEMES.map((t) => t.id));
const new8 = ['pastel-purple-haze', 'summer-beach', 'ocean-breeze', 'forest-beach-dawn', 'tech-future', 'tropical-forest', 'classic-redblue', 'purple-night-dawn'];
for (const id of new8) assert.ok(ids.has(id), `missing new theme: ${id}`);

const HEX = /^#[0-9a-fA-F]{6}$/;
for (const th of THEMES) {
  for (const k of ['textMain', 'textModel', 'textValue', 'textSub']) {
    assert.ok(HEX.test(th[k]), `${th.id}.${k} bad: ${th[k]}`);
    assert.ok(HEX.test(th.customDefault[k]), `${th.id}.customDefault.${k} bad: ${th.customDefault[k]}`);
  }
  // 空自定义 → 取主题预制 customDefault
  const r = resolveTheme(themeOf(th.id), DEFAULT_CUSTOM);
  assert.strictEqual(r.textMain, th.customDefault.textMain, `${th.id} resolve textMain`);
  assert.strictEqual(r.textModel, th.customDefault.textModel, `${th.id} resolve textModel`);
  assert.strictEqual(r.textValue, th.customDefault.textValue, `${th.id} resolve textValue`);
  assert.strictEqual(r.textSub, th.customDefault.textSub, `${th.id} resolve textSub`);
  // 用户覆盖 → 三层回退第一层生效
  const r2 = resolveTheme(themeOf(th.id), { ...DEFAULT_CUSTOM, textValue: '#123456' });
  assert.strictEqual(r2.textValue, '#123456', `${th.id} override textValue`);
}

console.log(`OK: ${THEMES.length} themes × 4 text categories valid; resolve/override layers work.`);
console.log('--- 8 new themes (from palettes.json) ---');
for (const id of new8) {
  const th = themeOf(id);
  console.log(`${th.name} [${id}]: 主=${th.textMain} 模型=${th.textModel} 数值=${th.textValue} 说明=${th.textSub}`);
}

// ── normalizeHex（v2.0.18 实时十六进制输入） ─────────────────────────────────
assert.strictEqual(normalizeHex('#ff0000'), '#ff0000');
assert.strictEqual(normalizeHex('FF0000'), '#ff0000', '省略 # + 大写');
assert.strictEqual(normalizeHex('#F00'), '#ff0000', '3 位简写展开');
assert.strictEqual(normalizeHex('  #123456  '), '#123456', '首尾空白');
assert.strictEqual(normalizeHex('#12345'), null, '4-5 位视为未完成');
assert.strictEqual(normalizeHex('#1234567'), null, '超过 6 位');
assert.strictEqual(normalizeHex('#12'), null, '少于 3 位');
assert.strictEqual(normalizeHex('zzz'), null, '非 hex 字符');
assert.strictEqual(normalizeHex(''), null, '空串');
console.log('OK: normalizeHex cases pass.');
