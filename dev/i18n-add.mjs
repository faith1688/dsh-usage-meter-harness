// One-shot: add missing EN_BY_ZH entries to src/i18n.ts (idempotent — skips keys already present).
// Run: node i18n-add.mjs   then verify: node i18n-audit.mjs (must report 0 missing)
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'z:/deepseek/dsh-usage-meter';
const FILE = join(ROOT, 'src/i18n.ts');

const PAIRS = [
  ['跟随全局', 'Follow global'],
  ['内置字体栈', 'Built-in font stack'],
  ['默认', 'Default'],
  ['已保存到本机', 'Saved to this device'],
  ['保存配色', 'Save colors'],
  ['当前', 'Current'],
  ['从系统字体库选择字体', 'Pick a font from the system font library'],
  ['本机检测到该字体', 'Font detected on this machine'],
  ['本机未检测到该字体，将回退到系统默认', 'Font not detected on this machine; will fall back to the system default'],
  ['✓ 可用', '✓ Available'],
  ['✗ 未装', '✗ Not installed'],
  ['字体粗细', 'Font weight'],
  ['已细化', 'Refined'],
  ['主题快切', 'Theme quick switch'],
  ['主题快切（详细配色在设置页）', 'Theme quick switch (detailed colors on the settings page)'],
  ['该供应商所有模型共用同一个手动填入的用户余额', 'All models of this provider share the same manually entered user balance'],
  ['共享余额', 'Shared balance'],
  ['所有模型共用一个用户余额', 'All models share one user balance'],
  ['组内选择 DeepSeek 官方余额来源的模型共用同一把已填的 API Key；某模型自己填了 Key 则优先用自己的', 'Models in this group using the DeepSeek official balance share the same filled-in API key; a model with its own key uses its own first'],
  ['共享 API Key', 'Shared API key'],
  ['组内 DeepSeek 模型共用同一把已填 Key', 'DeepSeek models in this group share the same filled-in key'],
  ['全局共享色（独立于主题，所有主题共用一套）', 'Global shared colors (independent of theme; one set shared by all themes)'],
  ['预警颜色按余额三档显示（足/不足/透支）；速度颜色按三档显示（0-50 / 51-100 / 101+ tokens/s）。你选的是「基础色」，实际渲染时会与当前主题的品牌色混成炫彩渐变，切换主题炫彩随之变化，基础色保持不变。', 'Alert colors show in three balance tiers (ok / low / overdrawn); speed colors show in three tiers (0-50 / 51-100 / 101+ tokens/s). You pick the "base color"; when rendered it blends with the current theme brand color into a vivid gradient — the gradient follows theme switches while the base color stays put.'],
  ['已重置为默认色', 'Reset to default colors'],
  ['重置全局色', 'Reset global colors'],
  ['字体', 'Font'],
  ['三种模式：插件固定字体（跨平台一致）/ 跟随宿主主题字体 / 自定义（从系统字体库点选全局字体 + 模型名/数值/正文/次要说明逐位置细化 + 逐位置字体粗细 + 本机可用性检测）。字体缺失时自动逐级回退，任何电脑都不会显示异常。', 'Three modes: plugin-fixed font (consistent across platforms) / follow the host theme font / custom (pick a global font from the system font library + per-position refinement for model name / value / body / secondary text + per-position font weight + availability check on this machine). Missing fonts fall back step by step, so no machine shows broken text.'],
  ['插件固定字体（默认）', 'Plugin-fixed font (default)'],
  ['跟随宿主主题字体', 'Follow host theme font'],
  ['自定义字体', 'Custom font'],
  ['全局字体', 'Global font'],
  ['默认（内置字体栈）', 'Default (built-in font stack)'],
  ['重置为默认', 'Reset to default'],
  ['清除该位置的字体与粗细，回到全局设置', 'Clear this position font and weight, back to global settings'],
  ['重置为全局字体', 'Reset to global font'],
  ['预览正文', 'Preview body'],
  ['模型名', 'Model name'],
  ['次要说明 · 刚刚', 'Secondary text · just now'],
  ['主题', 'Theme'],
  ['选择配色主题（弹窗右上角胶囊 + 用量弹窗配色），浅色系在前、深色系在后。每个主题下可自定义胶囊颜色与呼吸颜色，改动即时保存到本机。', 'Pick a color theme (capsule at the popup top-right + the usage popup colors); light themes first, dark themes last. Each theme can customize capsule and breathing colors; changes save to this device immediately.'],
  ['自定义当前主题的颜色（每套主题已预制胶囊/呼吸/告警/字体分类色，未改则用预制值；支持点选色板或手输 #rrggbb）', 'Customize the colors of the current theme (each theme ships preset capsule / breathing / alert / font-category colors; unedited ones use the presets; pick from the swatch palette or type #rrggbb)'],
  ['已重置为预制配色', 'Reset to the preset palette'],
  ['重置该主题为预制配色', 'Reset this theme to its preset palette'],
  ['提示：配色保存在浏览器本地（localStorage），不会写入计费数据文件，DHS 升级也不会丢失。', 'Note: colors are stored in this browser (localStorage), never written to the billing data file, and survive DSH upgrades.'],
  ['设置预警：DeepSeek 官方用「实时余额金额」比对；其他模型用「预算百分比」。', 'Set alerts: DeepSeek official compares against the live balance amount; other models use the budget percentage.'],
];

const raw = readFileSync(FILE, 'utf8');
if (!raw.includes('\r\n')) { console.error('FAIL: file is not CRLF; refusing to write'); process.exit(1); }
const lines = raw.split('\r\n');

// Anchor: the `};` line closing EN_BY_ZH = last `};` before `export function L`
const lIdx = lines.findIndex((l) => /^export function L\(/.test(l));
if (lIdx < 0) { console.error('FAIL: L() function not found'); process.exit(1); }
let anchor = -1;
for (let i = lIdx - 1; i >= 0; i--) { if (lines[i].trim() === '};') { anchor = i; break; } }
if (anchor < 0) { console.error('FAIL: EN_BY_ZH closing }; not found'); process.exit(1); }

// Validate pairs: no single quotes (file uses single-quoted TS strings)
for (const [zh, en] of PAIRS) {
  if (zh.includes("'") || en.includes("'")) { console.error(`FAIL: single quote in pair: ${zh} / ${en}`); process.exit(1); }
}

let inserted = 0, skipped = 0;
const newLines = [];
for (const [zh, en] of PAIRS) {
  const keyLine = `  '${zh}':`;
  const exists = lines.slice(191, anchor).some((l) => l.startsWith(keyLine));
  if (exists) { skipped++; continue; }
  newLines.push(`  '${zh}': '${en}',`);
  inserted++;
}

if (newLines.length) lines.splice(anchor, 0, ...newLines);
writeFileSync(FILE, lines.join('\r\n'), 'utf8');
console.log(`inserted: ${inserted}, skipped (already present): ${skipped}`);
