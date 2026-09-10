// Round-2 i18n (2.0.24):
//  A) add 70 missing EN_BY_ZH entries to src/i18n.ts (idempotent, CRLF-safe)
//  B) fix src/client.tsx: 7 broken template interpolations (missing $ before {L( —
//     would render literal "{L(...)}" text) + 14 new L() wraps for raw CJK.
// Every edit is validated (expected occurrence count); re-running is a no-op.
// Run: node i18n-add2.mjs
// Then verify: node tools/i18n-verify.mjs (0) && node tools/i18n-sweep.mjs (0) && node i18n-audit.mjs (0)
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = 'z:/deepseek/dsh-usage-meter';
const I18N = ROOT + '/src/i18n.ts';
const CLIENT = ROOT + '/src/client.tsx';

const PAIRS = [
  // theme names (20)
  ['靛蓝黎明（默认）', 'Indigo Dawn (default)'],
  ['碧海晴空（浅色）', 'Azure Sky (light)'],
  ['翡翠青绿（浅色）', 'Jade Green (light)'],
  ['玫瑰鲜红（浅色）', 'Rose Red (light)'],
  ['蜜桃浅粉（浅色）', 'Peach Pink (light)'],
  ['丁香薄雾（浅色）', 'Lilac Mist (light)'],
  ['琥珀落日（浅色）', 'Amber Sunset (light)'],
  ['粉彩紫霞（浅色）', 'Pastel Violet (light)'],
  ['夏日海滩（浅色）', 'Summer Beach (light)'],
  ['海洋清风（浅色）', 'Ocean Breeze (light)'],
  ['林滩晓色（浅色）', 'Forest Shore (light)'],
  ['石板灰调（中性）', 'Slate Grey (neutral)'],
  ['午夜深蓝（暗黑）', 'Midnight Blue (dark)'],
  ['深海幽蓝（暗黑）', 'Deep Ocean Blue (dark)'],
  ['森林夜色（暗黑）', 'Forest Night (dark)'],
  ['星夜紫岚（暗黑）', 'Starry Night (dark)'],
  ['科技未来（暗黑）', 'Tech Future (dark)'],
  ['热带森林（暗黑）', 'Tropical Forest (dark)'],
  ['经典红蓝（暗黑）', 'Classic Red-Blue (dark)'],
  ['紫夜曙光（暗黑）', 'Violet Dawn (dark)'],
  // custom color labels (15)
  ['预警颜色（余额足）', 'Alert color (balance ok)'],
  ['预警颜色（余额不足）', 'Alert color (balance low)'],
  ['预警颜色（透支）', 'Alert color (overdrawn)'],
  ['速度颜色（0-50 tokens/s）', 'Speed color (0-50 tokens/s)'],
  ['速度颜色（51-100 tokens/s）', 'Speed color (51-100 tokens/s)'],
  ['速度颜色（101+ tokens/s）', 'Speed color (101+ tokens/s)'],
  ['胶囊颜色（峰谷）', 'Capsule color (peak day)'],
  ['胶囊颜色（非峰谷）', 'Capsule color (non-peak day)'],
  ['呼吸颜色（高峰）', 'Breathing color (peak)'],
  ['呼吸颜色（低谷）', 'Breathing color (off-peak)'],
  ['呼吸颜色（非峰谷）', 'Breathing color (non-peak)'],
  ['字体颜色 · 主文字', 'Font color · main text'],
  ['字体颜色 · 模型名', 'Font color · model name'],
  ['字体颜色 · 数值/金额', 'Font color · value / amount'],
  ['字体颜色 · 次要说明', 'Font color · secondary text'],
  // font weights (7)
  ['细体', 'Thin'], ['常规', 'Regular'], ['中等', 'Medium'], ['半粗', 'Semi-bold'],
  ['粗体', 'Bold'], ['特粗', 'Extra bold'], ['黑体', 'Black'],
  // per-position font category rows (4)
  ['模型名（胶囊 / 标题）', 'Model name (capsule / title)'],
  ['数值 / 金额', 'Value / amount'],
  ['正文（说明、列表）', 'Body (descriptions, lists)'],
  ['次要说明（时间、来源）', 'Secondary text (time, source)'],
  // storage settings tabs (3)
  ['余额预警', 'Balance alerts'],
  ['主题设置', 'Theme settings'],
  ['模型后缀识别', 'Model suffix matching'],
  // price tags (2; internal tags, entries kept so the sweep stays clean)
  ['峰价', 'Peak price'],
  ['谷价', 'Off-peak price'],
  // dates / weekdays (9)
  ['--年--月--日', '--/--/--'],
  ['YYYY年M月D日', 'M/D/YYYY'],
  ['日', 'Sun'], ['一', 'Mon'], ['二', 'Tue'], ['三', 'Wed'], ['四', 'Thu'], ['五', 'Fri'], ['六', 'Sat'],
  // turn rows & misc (10)
  ['第 {n} 轮', 'Round {n}'],
  ['（✗ 本机未装，将回退）', '(✗ not installed on this machine; will fall back)'],
  ['（官网余额刷新有延迟）', '(official balance refresh may be delayed)'],
  ['入', 'in'],
  ['出', 'out'],
  ['如 0.5', 'e.g. 0.5'],
  ['如 100', 'e.g. 100'],
  ['如 20', 'e.g. 20'],
  ['如 ', 'e.g. '],
  ['需换算', 'conversion needed'],
];

// ---------------- A) i18n.ts ----------------
let raw = readFileSync(I18N, 'utf8');
if (!raw.includes('\r\n')) { console.error('FAIL: i18n.ts is not CRLF; refusing'); process.exit(1); }
const lines = raw.split('\r\n');
const lIdx = lines.findIndex((l) => /^export function L\(/.test(l));
if (lIdx < 0) { console.error('FAIL: L() function not found'); process.exit(1); }
let anchor = -1;
for (let i = lIdx - 1; i >= 0; i--) { if (lines[i].trim() === '};') { anchor = i; break; } }
if (anchor < 0) { console.error('FAIL: EN_BY_ZH closing }; not found'); process.exit(1); }
const openIdx = lines.findIndex((l) => l.includes('EN_BY_ZH'));
if (openIdx < 0) { console.error('FAIL: EN_BY_ZH declaration not found'); process.exit(1); }
for (const [zh, en] of PAIRS) {
  if (zh.includes("'") || en.includes("'")) { console.error(`FAIL: single quote in pair: ${zh} / ${en}`); process.exit(1); }
}
let inserted = 0, skipped = 0;
const newLines = [];
for (const [zh, en] of PAIRS) {
  const keyLine = `  '${zh}':`;
  if (lines.slice(openIdx, anchor).some((l) => l.startsWith(keyLine))) { skipped++; continue; }
  newLines.push(`  '${zh}': '${en}',`);
  inserted++;
}
if (newLines.length) lines.splice(anchor, 0, ...newLines);
writeFileSync(I18N, lines.join('\r\n'), 'utf8');
console.log(`A) i18n.ts: inserted ${inserted}, skipped (already present) ${skipped}`);

// ---------------- B) client.tsx ----------------
// [old, new, expectedOccurrences]
const REPL = [
  // B1: broken template interpolations — missing $ before {L( (7)
  [")}{L('天')}", ")}${L('天')}", 1],
  [")}{L('小时')}", ")}${L('小时')}", 1],
  [")}{L('分钟')}", ")}${L('分钟')}", 1],
  [")}{L('秒')}", ")}${L('秒')}", 1],
  ["))}{L('更新于')} ${fmtTime(accountBalance.updatedAt)}", "))}${L('更新于')} ${fmtTime(accountBalance.updatedAt)}", 1],
  ["`{L('", "`${L('", 2],
  // B2: new L() wraps for raw CJK (14)
  ["{ok ? '' : '（✗ 本机未装，将回退）'}", "{ok ? '' : L('（✗ 本机未装，将回退）')}", 1],
  ["if (!ms) return '--年--月--日';", "if (!ms) return L('--年--月--日');", 1],
  ['return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;',
   "return L('YYYY年M月D日').replace('YYYY', String(d.getFullYear())).replace('M', String(d.getMonth() + 1)).replace('D', String(d.getDate()));", 1],
  ['`${formatTokens(total - turn.outputTokens)} 入 / ${formatTokens(turn.outputTokens)} 出`',
   "`${formatTokens(total - turn.outputTokens)} ${L('入')} / ${formatTokens(turn.outputTokens)} ${L('出')}`", 1],
  ['` · 更新于 ${fmtTime(usage.rateUpdatedAt)}`', "` · ${L('更新于')} ${fmtTime(usage.rateUpdatedAt)}`", 1],
  ['{th.name}</option>', '{L(th.name)}</option>', 1],
  ['>第 {turn.turn} 轮 · {fmtTime(turn.startedAt)}', ">{L('第 {n} 轮').replace('{n}', String(turn.turn))} · {fmtTime(turn.startedAt)}", 1],
  ['placeholder="如 0.5"', "placeholder={L('如 0.5')}", 1],
  ['placeholder={`如 100${unitSym}`}', "placeholder={`${L('如 100')}${unitSym}`}", 1],
  ['placeholder={`如 20${unitSym}`}', "placeholder={`${L('如 20')}${unitSym}`}", 1],
  ['${cfgCurrency} 需换算）', "${cfgCurrency} ${L('需换算')}）", 1],
  ["placeholder={`如 ${bucketPricePerM(base, r.buckets[0] ?? 'input') ?? ''}`}",
   "placeholder={`${L('如 ')}${bucketPricePerM(base, r.buckets[0] ?? 'input') ?? ''}`}", 1],
  ['>{th.name}</span>', '>{L(th.name)}</span>', 1],
  ['color: t.text }}>{lbl}</span>', 'color: t.text }}>{L(lbl)}</span>', 1],
];

let c = readFileSync(CLIENT, 'utf8');
if (!c.includes('\r\n')) { console.error('FAIL: client.tsx is not CRLF; refusing'); process.exit(1); }
let applied = 0, already = 0;
for (const [oldS, newS, n] of REPL) {
  const cnt = c.split(oldS).length - 1;
  const newCnt = c.split(newS).length - 1;
  if (cnt === 0) {
    if (newCnt >= n) { already++; continue; }
    console.error('FAIL: pattern not found: ' + oldS); process.exit(1);
  }
  if (cnt !== n) { console.error(`FAIL: expected ${n} occurrence(s), found ${cnt}: ${oldS}`); process.exit(1); }
  c = c.split(oldS).join(newS);
  applied++;
}
writeFileSync(CLIENT, c, 'utf8');
console.log(`B) client.tsx: applied ${applied}, already applied ${already} (of ${REPL.length})`);
