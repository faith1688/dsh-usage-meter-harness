/**
 * dsh-usage-meter — color theme system.
 *
 * Registered in the settings page's「主题设置」tab and applied to the popup
 * capsule + readout card. Each theme carries its own default palette (pill,
 * outer ring / 呼吸色, alert tiers, popup background/border/text); the user
 * may ALSO override the pill color, ring color, and alert color per theme.
 *
 * Each theme ships a pre-curated `customDefault` (11 fields: pillFlat/pillPeak
 * /ringFlat/ringPeak/ringOff/alertOk/alertNear/alertOver + 字体分类
 * textMain/textModel/textValue/textSub) so that — without any user edits —
 * every theme already has a coherent, visually-distinct capsule, alert and
 * text palette. Users can still override any field via the color pickers.
 *
 * Persistence: localStorage (key `um-theme`), NOT config.json — keeps the
 * plugin's UI preference out of the durable host-adjacent state, so a DSH
 * upgrade or plugin version change never loses/corrupts billing data and
 * never touches the user's runtime environment.
 *
 * Values live as CSS variables (`--um-*`) that the component root injects, so
 * the readout/settings components reference `var(--um-*)` globals and switch
 * themes by swapping those variables. Hardcoded colors are converged onto the
 * `t` theme map (see client.tsx) and these vars.
 *
 * @module dsh-usage-meter-harness/theme
 */
export type AlertTier = 'ok' | 'near' | 'over';
/** One theme's full color set (defaults; user overrides layered on top). */
export interface Theme {
    id: string;
    name: string;
    bg: string;
    bgSoft: string;
    border: string;
    brand: string;
    brand2: string;
    text: string;
    text2: string;
    text3: string;
    textMain: string;
    textModel: string;
    textValue: string;
    textSub: string;
    accent: string;
    card: string;
    error: string;
    ok: string;
    pill: {
        flat: string;
        peak: string;
        ringFlat: string;
        ringPeak: string;
        ringOff: string;
    };
    palette: string[];
    alert: {
        ok: string;
        near: string;
        over: string;
    };
    /** 预制的 7 个自定义色（胶囊非峰谷/峰谷 + 呼吸非峰谷/高峰/低谷 + 预警足/不足/透支），
     *  切到该主题时若 custom 为空即用这套作为 default；确保每个主题自带协调配色。 */
    customDefault: ThemeCustom;
}
/** Per-theme user overrides (the 11 user-editable fields: 胶囊×2 + 呼吸×3 +
 *  预警×3 + 字体分类×4). 空串 = 未自定义，回退到 theme.customDefault。 */
export interface ThemeCustom {
    pillFlat: string;
    pillPeak: string;
    ringFlat: string;
    ringPeak: string;
    ringOff: string;
    alertOk: string;
    alertNear: string;
    alertOver: string;
    textMain: string;
    textModel: string;
    textValue: string;
    textSub: string;
}
/** Empty custom (means: fall back to theme.customDefault). */
export declare const DEFAULT_CUSTOM: ThemeCustom;
/** 20 curated themes, ordered light → neutral → dark (v2.0.20: 全部浅色在前、深色在最后，
*  石板灰居中)。命名统一为「四字意境名 +（默认/浅色/中性/暗黑）」，名字与配色相关。
*  前 12 套为手调（5 浅色 + 2 浅色粉彩 + 1 中性 + 4 暗黑），后 8 套来自
*  palettes.json 提取配色（开发者本地开发产物，4 浅色 + 4 暗黑，2026-07 新增）。每套自带
*  手调 `customDefault`（胶囊 flat/peak + 呼吸 ring flat/peak/off + 预警 ok/near/over +
*  字体分类 main/model/value/sub），不用动取色器也能完整呈现主题视觉。 (v2.0.33: 林滩晓色置顶并设为默认主题)。 */
export declare const THEMES: Theme[];
/** Convert any color (#rgb/#rrggbb/rgb()/rgba()) into an rgba() with the given
 *  alpha. Used by the capsule renderer so user-picked hex colors still render
 *  as a VERY LIGHT wash (capsule fill must stay pale enough for the text to
 *  read regardless of how dark the picked base color is). */
export declare function withAlpha(color: string, alpha: number): string;
/** Resolve effective colors: custom overrides first, then theme.customDefault,
 *  then theme's own pill/alert defaults. This way every theme always renders
 *  with a non-empty, theme-specific palette even when the user hasn't touched
 *  any color picker. */
export declare function resolveTheme(theme: Theme, custom: ThemeCustom): Theme;
export declare function themeOf(id: string): Theme;
/** Persisted theme selection (id + per-theme custom overrides). Stored in localStorage. */
export interface ThemeState {
    id: string;
    custom: Record<string, ThemeCustom>;
}
export declare function defaultThemeState(): ThemeState;
export declare function getThemeState(): ThemeState;
export declare function setThemeState(state: ThemeState): void;
export declare const THEME_CHANGE = "um-theme-change";
