/**
 * dsh-usage-meter — GLOBAL shared colors (independent of theme).
 *
 * Two color families the user customizes once and that every theme shares:
 *  1) Alert tier (余额足 / 不足 / 透支) — applied wherever the user sees a
 *     balance-tier label (capsule balance chip, settings page, etc).
 *  2) Token-rate tier (slow 0–50 / mid 51–100 / fast 101+ tokens/s) — applied
 *     to the speed number in the capsule and the popup.
 *  3) Balance amount (余额足) — the capsule's balance amount text + chip tint
 *     (v2.0.32: theme alert.ok read too dark; dedicated base, brighter default).
 *
 * Renders stay "炫彩" even though the storage values are plain hex — at display
 * time each tier is interpolated with the *active theme* brand endpoints to
 * produce a 3-stop gradient (`brand → base → brand2`). This way switching
 * themes updates the gradient mood, while the user-tuned base color anchors
 * the per-tier identity.
 *
 * Persistence: localStorage (key `um-global-colors`), never config.json —
 * the plugin's UI preference stays out of the durable host-adjacent state
 * (DSH upgrades and plugin version iteration never lose or corrupt it).
 *
 * @module dsh-usage-meter-harness/globals
 */
/** Curated defaults — picked to read clearly against every theme.
 *  v2.0.15: 速度三档默认值升级为用户调好的色板（低=琥珀 / 中=绿 / 高=紫），
 *  从设置页截图逐像素提取；预警三色沿用原有 绿/琥珀/玫红 层次。 */
export const DEFAULT_GLOBAL_COLORS = {
    alertOk: '#16a34a',
    alertNear: '#f59e0b',
    alertOver: '#d1242f',
    balanceOk: '#22c55e',
    speedLow: '#e5ad1f',
    speedMid: '#0ac749',
    speedHi: '#6d3be3',
};
const KEY = 'um-global-colors';
const CHANGE = 'um-global-colors-change';
export function getGlobalColors() {
    try {
        const raw = localStorage.getItem(KEY);
        if (raw === null)
            return { ...DEFAULT_GLOBAL_COLORS };
        const d = JSON.parse(raw);
        return { ...DEFAULT_GLOBAL_COLORS, ...(d ?? {}) };
    }
    catch {
        return { ...DEFAULT_GLOBAL_COLORS };
    }
}
export function setGlobalColors(g) {
    try {
        localStorage.setItem(KEY, JSON.stringify(g));
    }
    catch { /* ignore */ }
    try {
        window.dispatchEvent(new CustomEvent(CHANGE));
    }
    catch { /* ignore */ }
}
export const GLOBAL_COLORS_CHANGE = CHANGE;
/** A 3-stop gradient string used to render a tier label "炫彩" while the
 *  underlying color is the user-tuned base. The two brand endpoints come
 *  from the active theme so the tier still "belongs" to the theme. */
export function tierGradient(base, brand, brand2) {
    return `linear-gradient(90deg, ${brand}, ${base}, ${brand2})`;
}
/** 把颜色按亮度乘以 `factor`（0–1）压暗：`#rrggbb` / `#rgb` 直接缩放 RGB，
 *  其他写法（rgb()/变量/命名色）原样返回——调用方只在内置色板上用。 */
export function darkenHex(color, factor) {
    const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
    if (m === null)
        return color;
    const hex = m[1];
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
    const num = parseInt(full, 16);
    const scale = (v) => Math.max(0, Math.min(255, Math.round(v * factor)));
    const r = scale((num >> 16) & 0xff);
    const g = scale((num >> 8) & 0xff);
    const b = scale(num & 0xff);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
/** 把颜色向白色方向调亮 `factor`（0–1）：`c' = c + (255 - c) * factor`，
 *  效果是变浅变淡（亮度调高），与 darkenHex 相反。
 *  `#rrggbb` / `#rgb` 直接处理，其他写法（rgb()/变量/命名色）原样返回。 */
export function lightenHex(color, factor) {
    const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
    if (m === null)
        return color;
    const hex = m[1];
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
    const num = parseInt(full, 16);
    const mix = (v) => Math.max(0, Math.min(255, Math.round(v + (255 - v) * factor)));
    const r = mix((num >> 16) & 0xff);
    const g = mix((num >> 8) & 0xff);
    const b = mix(num & 0xff);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
// ── font mode (two schemes, portable) ────────────────────────────────────────
/** 方案一（默认）：插件固定字体。每个 OS 都有命中候选，栈尾 system-ui 兜底，
 *  任何电脑都不会字体报错：Win=Segoe UI+微软雅黑，macOS=苹方，Linux=思源黑体/Noto。 */
export const PLUGIN_FONT_STACK = '"Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", "Source Han Sans SC", "WenQuanYi Micro Hei", system-ui, -apple-system, sans-serif';
/** 方案二：跟随宿主主题字体（DSH 的 --dsw-font-family，未定义时用宿主同款默认栈）。 */
export const HOST_FONT_STACK = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif)';
export const FONT_CUSTOM_DEFAULT = {
    global: '', model: '', value: '', body: '', sub: '',
    weightGlobal: '', weightModel: '', weightValue: '', weightBody: '', weightSub: '',
};
const FONT_KEY = 'um-font-mode';
const FONT_CUSTOM_KEY = 'um-font-custom';
const FONT_CHANGE = 'um-font-change';
export function getFontMode() {
    try {
        const v = localStorage.getItem(FONT_KEY);
        return v === 'host' ? 'host' : v === 'custom' ? 'custom' : 'plugin';
    }
    catch {
        return 'plugin';
    }
}
export function setFontMode(m) {
    try {
        localStorage.setItem(FONT_KEY, m);
    }
    catch { /* ignore */ }
    try {
        window.dispatchEvent(new CustomEvent(FONT_CHANGE));
    }
    catch { /* ignore */ }
}
export function getFontCustom() {
    try {
        const raw = localStorage.getItem(FONT_CUSTOM_KEY);
        if (!raw)
            return { ...FONT_CUSTOM_DEFAULT };
        const p = JSON.parse(raw);
        // 兼容旧版（2.0.21 及更早）存储：缺少的粗细字段一律回退默认。
        const s = (v) => (typeof v === 'string' ? v : '');
        return {
            global: s(p.global),
            model: s(p.model),
            value: s(p.value),
            body: s(p.body),
            sub: s(p.sub),
            weightGlobal: s(p.weightGlobal),
            weightModel: s(p.weightModel),
            weightValue: s(p.weightValue),
            weightBody: s(p.weightBody),
            weightSub: s(p.weightSub),
        };
    }
    catch {
        return { ...FONT_CUSTOM_DEFAULT };
    }
}
export function setFontCustom(c) {
    try {
        localStorage.setItem(FONT_CUSTOM_KEY, JSON.stringify(c));
    }
    catch { /* ignore */ }
    try {
        window.dispatchEvent(new CustomEvent(FONT_CHANGE));
    }
    catch { /* ignore */ }
}
export function fontStackOf(mode, custom) {
    if (mode === 'custom')
        return (custom?.global || '').trim() || PLUGIN_FONT_STACK;
    return mode === 'host' ? HOST_FONT_STACK : PLUGIN_FONT_STACK;
}
/** 指定文字大类的实际字体（v2.0.21 逐位置可选）：custom 模式下位置覆盖 >
 *  全局自定义 > 基础栈；其余模式恒为基础栈。 */
export function fontStackForCategory(mode, custom, cat) {
    if (mode === 'custom') {
        const pos = (custom[cat] || '').trim();
        if (pos)
            return pos;
        const g = (custom.global || '').trim();
        if (g)
            return g;
    }
    return fontStackOf(mode);
}
/** v2.0.22 粗细选项（值, 中文标签）：空串=默认（不加粗/不指定，用组件自身字重）。 */
export const FONT_WEIGHT_OPTIONS = [
    ['', '默认'],
    ['300', '细体'],
    ['400', '常规'],
    ['500', '中等'],
    ['600', '半粗'],
    ['700', '粗体'],
    ['800', '特粗'],
    ['900', '黑体'],
];
/** v2.0.22 指定文字大类的实际粗细：custom 模式下位置粗细 > 全局粗细；
 *  返回空串表示未指定（渲染侧保留组件默认字重）。 */
export function fontWeightForCategory(mode, custom, cat) {
    if (mode !== 'custom')
        return '';
    const w = (cat === 'model' ? custom.weightModel
        : cat === 'value' ? custom.weightValue
            : cat === 'body' ? custom.weightBody
                : custom.weightSub) || '';
    const t = w.trim();
    if (t)
        return t;
    return (custom.weightGlobal || '').trim();
}
/** 常见系统字体（Windows / macOS / 中文常用），供设置页下拉列举。
 *  是否真正可用由 document.fonts.check 实时判定。 */
export const COMMON_SYSTEM_FONTS = [
    'Segoe UI', 'Microsoft YaHei', 'Microsoft YaHei UI', 'DengXian', 'SimSun', 'SimHei', 'KaiTi', 'FangSong', 'Noto Sans SC', 'Source Han Sans SC',
    'PingFang SC', 'Hiragino Sans GB', 'STSong', 'STHeiti', 'Arial', 'Helvetica Neue', 'Verdana', 'Tahoma', 'Calibri', 'Cambria',
    'Georgia', 'Times New Roman', 'Trebuchet MS', 'Consolas', 'Courier New', 'Monaco', 'Menlo', 'SF Mono', 'Meiryo', 'Yu Gothic',
];
/** 判定某字体（或字体栈的第一个名字）在当前系统是否可用（Canvas FontFaceSet）。 */
export function isFontAvailable(stack) {
    try {
        const first = (stack || '').trim().split(',')[0].trim();
        const name = first.replace(/^"(.*)"$/, '$1');
        if (!name)
            return false;
        return document.fonts?.check?.(`12px "${name}"`) === true;
    }
    catch {
        return false;
    }
}
// ── hex 输入归一化（v2.0.18 实时十六进制输入） ──────────────────────────────
/** 归一化手输的十六进制颜色：允许省略 '#'、允许 3 位简写（自动展开成 6 位）、
 *  忽略首尾空白、统一小写。仅 3 位或 6 位算"合法"，返回规范小写 `#rrggbb`；
 *  1/2/4/5 位视为"还没输完"（返回 null），含非 hex 字符或超长也返回 null。 */
export function normalizeHex(raw) {
    let s = raw.trim().toLowerCase();
    if (s.startsWith('#'))
        s = s.slice(1);
    if (/^[0-9a-f]{6}$/.test(s))
        return `#${s}`;
    if (/^[0-9a-f]{3}$/.test(s))
        return `#${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`;
    return null;
}
export const FONT_MODE_CHANGE = FONT_CHANGE;
// ── Token 估算（同构：client 采样 + server 实时投影共用） ────────────────────
/** CJK 感知的字符→token 估算：CJK 字符（含全角标点）每个记 1 token，
 *  其余字符沿用「4 字符 ≈ 1 token」启发式（英文 ≈ 4 chars/token）。
 *  旧的 `text.length / 4` 对纯中文只计实际 token 的约 1/4，导致实时速度
 *  （client 采样）与实时输出 token（server 投影）系统性偏低。 */
export function estTokens(text) {
    let cjk = 0;
    let other = 0;
    for (const ch of text) {
        const cp = ch.codePointAt(0);
        if ((cp >= 0x3000 && cp <= 0x9fff) || (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0xff01 && cp <= 0xff60))
            cjk += 1;
        else
            other += 1;
    }
    return Math.ceil(cjk + other / 4);
}
