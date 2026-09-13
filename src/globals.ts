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

/** All three alert tiers + all three rate tiers in one struct (easier to
 *  persist, extend, and reset). */
export interface GlobalColors {
  alertOk: string;     // 余额足
  alertNear: string;   // 余额不足
  alertOver: string;   // 透支
  balanceOk: string;   // 胶囊余额金额（余额足）
  speedLow: string;     // 0–50 tokens/s
  speedMid: string;     // 51–100 tokens/s
  speedHi: string;      // 101+ tokens/s
}

/** Curated defaults — picked to read clearly against every theme.
 *  v2.0.15: 速度三档默认值升级为用户调好的色板（低=琥珀 / 中=绿 / 高=紫），
 *  从设置页截图逐像素提取；预警三色沿用原有 绿/琥珀/玫红 层次。 */
export const DEFAULT_GLOBAL_COLORS: GlobalColors = {
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

export function getGlobalColors(): GlobalColors {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return { ...DEFAULT_GLOBAL_COLORS };
    const d = JSON.parse(raw) as Partial<GlobalColors>;
    return { ...DEFAULT_GLOBAL_COLORS, ...(d ?? {}) };
  } catch {
    return { ...DEFAULT_GLOBAL_COLORS };
  }
}

export function setGlobalColors(g: GlobalColors): void {
  try { localStorage.setItem(KEY, JSON.stringify(g)); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent(CHANGE)); } catch { /* ignore */ }
}

export const GLOBAL_COLORS_CHANGE = CHANGE;

/** A 3-stop gradient string used to render a tier label "炫彩" while the
 *  underlying color is the user-tuned base. The two brand endpoints come
 *  from the active theme so the tier still "belongs" to the theme. */
export function tierGradient(base: string, brand: string, brand2: string): string {
  return `linear-gradient(90deg, ${brand}, ${base}, ${brand2})`;
}

/** 把颜色按亮度乘以 `factor`（0–1）压暗：`#rrggbb` / `#rgb` 直接缩放 RGB，
 *  其他写法（rgb()/变量/命名色）原样返回——调用方只在内置色板上用。 */
export function darkenHex(color: string, factor: number): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (m === null) return color;
  const hex = m[1];
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const num = parseInt(full, 16);
  const scale = (v: number): number => Math.max(0, Math.min(255, Math.round(v * factor)));
  const r = scale((num >> 16) & 0xff);
  const g = scale((num >> 8) & 0xff);
  const b = scale(num & 0xff);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** 把颜色向白色方向调亮 `factor`（0–1）：`c' = c + (255 - c) * factor`，
 *  效果是变浅变淡（亮度调高），与 darkenHex 相反。
 *  `#rrggbb` / `#rgb` 直接处理，其他写法（rgb()/变量/命名色）原样返回。 */
export function lightenHex(color: string, factor: number): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (m === null) return color;
  const hex = m[1];
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const num = parseInt(full, 16);
  const mix = (v: number): number => Math.max(0, Math.min(255, Math.round(v + (255 - v) * factor)));
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

export type FontMode = 'plugin' | 'host' | 'custom';

/** 方案三（v2.0.21，v2.0.22 加粗细）：用户自定义字体。global=全局字体（从系统
 *  字体库点选）；四个文字大类可各自单独细化（空串=跟随全局）；weight* 为粗细
 *  （空串=默认），位置粗细优先于全局粗细。 */
export interface FontCustom {
  global: string;
  /** 模型名（胶囊 / 弹窗标题） */
  model: string;
  /** 数值金额（成本 / 余额） */
  value: string;
  /** 正文（说明、列表等） */
  body: string;
  /** 次要说明（时间 / 来源小字） */
  sub: string;
  /** v2.0.22 全局粗细（300-900，空串=默认） */
  weightGlobal: string;
  /** v2.0.22 各位置粗细（空串=跟随全局粗细） */
  weightModel: string;
  weightValue: string;
  weightBody: string;
  weightSub: string;
}

export const FONT_CUSTOM_DEFAULT: FontCustom = {
  global: '', model: '', value: '', body: '', sub: '',
  weightGlobal: '', weightModel: '', weightValue: '', weightBody: '', weightSub: '',
};

const FONT_KEY = 'um-font-mode';
const FONT_CUSTOM_KEY = 'um-font-custom';
const FONT_CHANGE = 'um-font-change';

export function getFontMode(): FontMode {
  try { const v = localStorage.getItem(FONT_KEY); return v === 'host' ? 'host' : v === 'custom' ? 'custom' : 'plugin'; } catch { return 'plugin'; }
}

export function setFontMode(m: FontMode): void {
  try { localStorage.setItem(FONT_KEY, m); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent(FONT_CHANGE)); } catch { /* ignore */ }
}

export function getFontCustom(): FontCustom {
  try {
    const raw = localStorage.getItem(FONT_CUSTOM_KEY);
    if (!raw) return { ...FONT_CUSTOM_DEFAULT };
    const p = JSON.parse(raw) as Partial<FontCustom>;
    // 兼容旧版（2.0.21 及更早）存储：缺少的粗细字段一律回退默认。
    const s = (v: unknown): string => (typeof v === 'string' ? v : '');
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
  } catch { return { ...FONT_CUSTOM_DEFAULT }; }
}

export function setFontCustom(c: FontCustom): void {
  try { localStorage.setItem(FONT_CUSTOM_KEY, JSON.stringify(c)); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent(FONT_CHANGE)); } catch { /* ignore */ }
}

export function fontStackOf(mode: FontMode, custom?: FontCustom): string {
  if (mode === 'custom') return (custom?.global || '').trim() || PLUGIN_FONT_STACK;
  return mode === 'host' ? HOST_FONT_STACK : PLUGIN_FONT_STACK;
}

/** 指定文字大类的实际字体（v2.0.21 逐位置可选）：custom 模式下位置覆盖 >
 *  全局自定义 > 基础栈；其余模式恒为基础栈。 */
export function fontStackForCategory(mode: FontMode, custom: FontCustom, cat: 'model' | 'value' | 'body' | 'sub'): string {
  if (mode === 'custom') {
    const pos = (custom[cat] || '').trim();
    if (pos) return pos;
    const g = (custom.global || '').trim();
    if (g) return g;
  }
  return fontStackOf(mode);
}

/** v2.0.22 粗细选项（值, 中文标签）：空串=默认（不加粗/不指定，用组件自身字重）。 */
export const FONT_WEIGHT_OPTIONS: Array<[string, string]> = [
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
export function fontWeightForCategory(mode: FontMode, custom: FontCustom, cat: 'model' | 'value' | 'body' | 'sub'): string {
  if (mode !== 'custom') return '';
  const w = (
    cat === 'model' ? custom.weightModel
    : cat === 'value' ? custom.weightValue
    : cat === 'body' ? custom.weightBody
    : custom.weightSub
  ) || '';
  const t = w.trim();
  if (t) return t;
  return (custom.weightGlobal || '').trim();
}

/** 常见系统字体（Windows / macOS / 中文常用），供设置页下拉列举。
 *  是否真正可用由 document.fonts.check 实时判定。 */
export const COMMON_SYSTEM_FONTS: string[] = [
  'Segoe UI', 'Microsoft YaHei', 'Microsoft YaHei UI', 'DengXian', 'SimSun', 'SimHei', 'KaiTi', 'FangSong', 'Noto Sans SC', 'Source Han Sans SC',
  'PingFang SC', 'Hiragino Sans GB', 'STSong', 'STHeiti', 'Arial', 'Helvetica Neue', 'Verdana', 'Tahoma', 'Calibri', 'Cambria',
  'Georgia', 'Times New Roman', 'Trebuchet MS', 'Consolas', 'Courier New', 'Monaco', 'Menlo', 'SF Mono', 'Meiryo', 'Yu Gothic',
];

/** 判定某字体（或字体栈的第一个名字）在当前系统是否可用（Canvas FontFaceSet）。 */
export function isFontAvailable(stack: string): boolean {
  try {
    const first = (stack || '').trim().split(',')[0].trim();
    const name = first.replace(/^"(.*)"$/, '$1');
    if (!name) return false;
    return (document as any).fonts?.check?.(`12px "${name}"`) === true;
  } catch { return false; }
}

// ── hex 输入归一化（v2.0.18 实时十六进制输入） ──────────────────────────────
/** 归一化手输的十六进制颜色：允许省略 '#'、允许 3 位简写（自动展开成 6 位）、
 *  忽略首尾空白、统一小写。仅 3 位或 6 位算"合法"，返回规范小写 `#rrggbb`；
 *  1/2/4/5 位视为"还没输完"（返回 null），含非 hex 字符或超长也返回 null。 */
export function normalizeHex(raw: string): string | null {
  let s = raw.trim().toLowerCase();
  if (s.startsWith('#')) s = s.slice(1);
  if (/^[0-9a-f]{6}$/.test(s)) return `#${s}`;
  if (/^[0-9a-f]{3}$/.test(s)) return `#${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`;
  return null;
}

export const FONT_MODE_CHANGE = FONT_CHANGE;

// ── Token 估算（同构：client 采样 + server 实时投影共用） ────────────────────
/** CJK 感知的字符→token 估算：CJK 字符（含全角标点）每个记 1 token，
 *  其余字符沿用「4 字符 ≈ 1 token」启发式（英文 ≈ 4 chars/token）。
 *  旧的 `text.length / 4` 对纯中文只计实际 token 的约 1/4，导致实时速度
 *  （client 采样）与实时输出 token（server 投影）系统性偏低。 */
export function estTokens(text: string): number {
  let cjk = 0;
  let other = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0) as number;
    if ((cp >= 0x3000 && cp <= 0x9fff) || (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0xff01 && cp <= 0xff60)) cjk += 1;
    else other += 1;
  }
  return Math.ceil(cjk + other / 4);
}

// ── 实时输出速率（纯函数：客户端胶囊 + 回归脚本共用，便于直接验证） ──────────
export type RateSample = { at: number; total: number };

/** 速率窗口：只统计最近这段时间内的样本。 */
export const RATE_WINDOW_MS = 3000;

/** 单源速率：窗口内「末样本 − 首样本」的 token 增量 ÷ 用时。
 *  **会就地淘汰窗口外样本**（调用方把同一个数组当滑动窗口用）。
 *  样本不足 2 条、用时过短（<0.3s）或增量非正（换回合/回退）→ null。 */
export function tokenRateOf(samples: RateSample[], now: number): number | null {
  while (samples.length > 0 && now - samples[0].at > RATE_WINDOW_MS) samples.shift();
  if (samples.length < 2) return null;
  const first = samples[0];
  const last = samples[samples.length - 1];
  const elapsed = (last.at - first.at) / 1000;
  const tokens = last.total - first.total;
  return elapsed >= 0.3 && tokens > 0 ? tokens / elapsed : null;
}

/** 实时输出速率：① 客户端直播流优先，② 宿主投影兜底；两源都没有实时数据 → null，
 *  含义就是「此刻没有在输出」，界面据此显示 0。
 *
 *  **绝不回退到"上一次的数值"**：窗口外的样本会被淘汰清空，任何"没有新数据就沿用旧值"
 *  的写法都会让数字停住不动。用户实测过两次：一次是流式结束后数字永远停在最后那个值
 *  （跑本地工具时也不归零），一次是干脆恒显示 0.0。正确语义只有两种——
 *  有实时数据就显示真实速率，没有就显示 0。 */
export function liveOutputRate(client: RateSample[], server: RateSample[], now: number): number | null {
  return tokenRateOf(client, now) ?? tokenRateOf(server, now);
}
