// 包装标记逻辑单测：默认跑 lib/wrapper.js（bundle 产物），也可传入临时产物路径：
//   node scripts/test-wrapper.mjs [modulePath]
// 覆盖真实环境里的包装形态：modlens- 前缀 / -modlens 后缀 / vision-toolkit- 前缀，
// 以及「不能误伤」的底层名字（deepseek-official、deepseek-v4-flash-vision-exp…）。
import { pathToFileURL } from 'node:url';
const modPath = process.argv[2] ? pathToFileURL(process.argv[2]).href : new URL('../lib/wrapper.js', import.meta.url).href;
const {
  DEFAULT_WRAPPER_ROWS,
  wrapperRows,
  activePatterns,
  stripWrappers,
  stripAllWrappers,
  normalizeProviderId,
  normalizeBindingKey,
  normalizePriceKey,
} = await import(modPath);

let pass = 0;
let fail = 0;
function eq(label, got, want) {
  const ok = got === want;
  if (ok) pass++;
  else { fail++; console.log(`FAIL ${label}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`); }
}

const all = activePatterns(undefined);
eq('default rows count', DEFAULT_WRAPPER_ROWS.length, 6);

// ── 真实包装形态（本机实测：/api/usage-meter/models 的提供商 id） ──────────────
eq('modlens- prefix', normalizeProviderId('modlens-deepseek-zgktz', all), 'deepseek-zgktz');
eq('modlens- prefix openrouter', normalizeProviderId('modlens-openrouter', all), 'openrouter');
eq('modlens- prefix zai', normalizeProviderId('modlens-zai-coding-cn', all), 'zai-coding-cn');
eq('-modlens suffix', normalizeProviderId('deepseek-modlens', all), 'deepseek');
eq('vision-toolkit prefix', normalizeProviderId('vision-toolkit-deepseek-official', all), 'deepseek-official');
eq('model label suffix', stripAllWrappers('DeepSeek-V4-Flash (modlens vision)', all), 'DeepSeek-V4-Flash');
eq('model -vision suffix', stripAllWrappers('glm-4.6-vision', all), 'glm-4.6');
eq('double wrap', normalizeProviderId('vision-toolkit-modlens-deepseek-zgktz', all), 'deepseek-zgktz');

// ── 不能误伤 ─────────────────────────────────────────────────────────────────
eq('plain provider untouched', normalizeProviderId('deepseek-zgktz', all), 'deepseek-zgktz');
eq('official untouched', normalizeProviderId('deepseek-official', all), 'deepseek-official');
eq('custom deepseek untouched', normalizeProviderId('deepseek', all), 'deepseek');
eq('real vision-exp model untouched', stripAllWrappers('deepseek-v4-flash-vision-exp', all), 'deepseek-v4-flash-vision-exp');
eq('null provider', normalizeProviderId(null, all), null);
eq('marker-only name kept', normalizeProviderId('modlens-', all), 'modlens-');

// ── 逐行开关：关闭的行不再匹配 ────────────────────────────────────────────────
const rowsOff = wrapperRows(DEFAULT_WRAPPER_ROWS.map((r) => ({ ...r, enabled: r.pattern !== '-modlens' })));
const patsOff = activePatterns(rowsOff);
eq('disabled -modlens no longer matches', normalizeProviderId('deepseek-modlens', patsOff), 'deepseek-modlens');
eq('enabled modlens- still matches', normalizeProviderId('modlens-openrouter', patsOff), 'openrouter');

// ── 旧字符串设置：自动补齐包装提供商行 ────────────────────────────────────────
const legacy = activePatterns(' (modlens vision)\n (vision)\n-vision\nvision-toolkit-');
eq('legacy string upgraded: modlens- available', normalizeProviderId('modlens-deepseek-zgktz', legacy), 'deepseek-zgktz');
eq('legacy string upgraded: -modlens available', normalizeProviderId('deepseek-modlens', legacy), 'deepseek');

// ── 绑定键 / 价目表键归一 ─────────────────────────────────────────────────────
eq('binding m: key', normalizeBindingKey('m:modlens-deepseek-zgktz/deepseek-v4-flash', all), 'm:deepseek-zgktz/deepseek-v4-flash');
eq('binding p: key', normalizeBindingKey('p:modlens-openrouter', all), 'p:openrouter');
eq('binding already base', normalizeBindingKey('m:deepseek/deepseek-v4-flash', all), 'm:deepseek/deepseek-v4-flash');
eq('binding model suffix', normalizeBindingKey('m:deepseek/deepseek-v4-pro (modlens vision)', all), 'm:deepseek/deepseek-v4-pro');
eq('price key', normalizePriceKey('modlens-deepseek/deepseek-v4-flash', all), 'deepseek/deepseek-v4-flash');
eq('price key untouched', normalizePriceKey('deepseek-official/deepseek-v4-flash', all), 'deepseek-official/deepseek-v4-flash');

// ── stripWrappers 基础行为（保持 v2.0.11 语义） ───────────────────────────────
eq('strip empty patterns', stripWrappers('deepseek', []), 'deepseek');
eq('strip case-insensitive', stripWrappers('X-MODLENS', all), 'X');

console.log(`\ntest-wrapper: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
