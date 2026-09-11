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
/** Empty custom (means: fall back to theme.customDefault). */
export const DEFAULT_CUSTOM = {
    pillFlat: '',
    pillPeak: '',
    ringFlat: '',
    ringPeak: '',
    ringOff: '',
    alertOk: '',
    alertNear: '',
    alertOver: '',
    textMain: '',
    textModel: '',
    textValue: '',
    textSub: '',
};
/** 20 curated themes, ordered light → neutral → dark (v2.0.20: 全部浅色在前、深色在最后，
*  石板灰居中)。命名统一为「四字意境名 +（默认/浅色/中性/暗黑）」，名字与配色相关。
*  前 12 套为手调（5 浅色 + 2 浅色粉彩 + 1 中性 + 4 暗黑），后 8 套来自
*  palettes.json 提取配色（开发者本地开发产物，4 浅色 + 4 暗黑，2026-07 新增）。每套自带
*  手调 `customDefault`（胶囊 flat/peak + 呼吸 ring flat/peak/off + 预警 ok/near/over +
*  字体分类 main/model/value/sub），不用动取色器也能完整呈现主题视觉。 (v2.0.33: 林滩晓色置顶并设为默认主题)。 */
export const THEMES = [
    // ── 1) 林滩晓色（默认，浅色）
    {
        id: 'forest-beach-dawn', name: '林滩晓色（默认，浅色）',
        bg: 'linear-gradient(180deg, #e0f4fb 0%, #eef7fb 45%, #f7fafc 100%)',
        bgSoft: '#eef7fb', border: 'rgba(56,127,182,0.35)',
        brand: '#387fb6', brand2: '#b33647',
        text: '#1f3a52', text2: '#4d6579', text3: '#8b9aa8',
        textMain: '#1f3a52', textModel: '#387fb6', textValue: '#b33647', textSub: '#8b9aa8',
        accent: 'rgba(56,127,182,0.10)', card: '#ffffff', error: '#b33647', ok: '#639a72',
        pill: { flat: 'rgba(201,205,208,0.35)', peak: 'rgba(179,54,71,0.25)', ringFlat: 'rgba(56,127,182,0.55)', ringPeak: 'rgba(179,54,71,0.65)', ringOff: 'rgba(215,235,206,0.60)' },
        palette: ['#387fb6', '#b33647', '#db7268', '#d7ebce', '#f8efb5', '#d9d5b6', '#c9cdd0', '#e0f4fb'],
        alert: { ok: '#639a72', near: '#db7268', over: '#b33647' },
        customDefault: { pillFlat: '#387fb6', pillPeak: '#7fb069', ringFlat: '#387fb6', ringPeak: '#7fb069', ringOff: '#c9cdd0', alertOk: '#639a72', alertNear: '#db7268', alertOver: '#b33647', textMain: '#1f3a52', textModel: '#387fb6', textValue: '#b33647', textSub: '#8b9aa8' },
    },
    // ── 2) 靛蓝黎明（浅色）
    {
        id: 'indigo', name: '靛蓝黎明（浅色）',
        bg: 'linear-gradient(180deg, #e2ebff 0%, #f6f8ff 45%, #ffffff 100%)',
        bgSoft: '#f6f8ff', border: 'rgba(77,107,254,0.35)',
        brand: '#4d6bfe', brand2: '#7c5cff',
        text: '#1f2328', text2: '#59636e', text3: '#8b949e',
        textMain: '#1f2328', textModel: '#4d6bfe', textValue: '#4d6bfe', textSub: '#8b949e',
        accent: 'rgba(77,107,254,0.10)', card: '#ffffff', error: '#d1242f', ok: '#16a34a',
        pill: { flat: 'rgba(77,107,254,0.18)', peak: 'rgba(244,63,94,0.22)', ringFlat: 'rgba(77,107,254,0.5)', ringPeak: 'rgba(244,63,94,0.65)', ringOff: 'rgba(22,163,74,0.60)' },
        palette: ['#4d6bfe', '#7c5cff', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#f97316', '#8b5cf6', '#14b8a6'],
        alert: { ok: '#16a34a', near: '#f59e0b', over: '#d1242f' },
        customDefault: { pillFlat: '#4d6bfe', pillPeak: '#4d6bfe', ringFlat: '#4d6bfe', ringPeak: '#4d6bfe', ringOff: '#7c8cf8', alertOk: '#16a34a', alertNear: '#f59e0b', alertOver: '#d1242f', textMain: '#1f2328', textModel: '#4d6bfe', textValue: '#4d6bfe', textSub: '#8b949e' },
    },
    // ── 3) 碧海晴空（浅色）
    {
        id: 'cyan', name: '碧海晴空（浅色）',
        bg: 'linear-gradient(180deg, #dcf6f9 0%, #f2fbfc 45%, #ffffff 100%)',
        bgSoft: '#f2fbfc', border: 'rgba(16,138,172,0.35)',
        brand: '#0e8ba8', brand2: '#0ea5b7',
        text: '#10232a', text2: '#455a63', text3: '#7c9199',
        textMain: '#10232a', textModel: '#0e8ba8', textValue: '#0e8ba8', textSub: '#7c9199',
        accent: 'rgba(14,139,168,0.10)', card: '#ffffff', error: '#d1242f', ok: '#0f766e',
        pill: { flat: 'rgba(14,139,168,0.20)', peak: 'rgba(236,72,153,0.22)', ringFlat: 'rgba(14,139,168,0.55)', ringPeak: 'rgba(236,72,153,0.65)', ringOff: 'rgba(20,184,166,0.60)' },
        palette: ['#0e8ba8', '#0ea5b7', '#14b8a6', '#f59e0b', '#ec4899', '#22d3ee', '#06b6d4', '#f97316', '#6366f1', '#34d399'],
        alert: { ok: '#0f766e', near: '#f59e0b', over: '#d1242f' },
        customDefault: { pillFlat: '#0e8ba8', pillPeak: '#0e8ba8', ringFlat: '#0e8ba8', ringPeak: '#0e8ba8', ringOff: '#22b8cf', alertOk: '#0f766e', alertNear: '#f59e0b', alertOver: '#d1242f', textMain: '#10232a', textModel: '#0e8ba8', textValue: '#0e8ba8', textSub: '#7c9199' },
    },
    // ── 4) 翡翠青绿（浅色）
    {
        id: 'emerald', name: '翡翠青绿（浅色）',
        bg: 'linear-gradient(180deg, #d9f2e4 0%, #f0faf4 45%, #ffffff 100%)',
        bgSoft: '#f0faf4', border: 'rgba(16,149,104,0.35)',
        brand: '#0a9d63', brand2: '#10b981',
        text: '#10241c', text2: '#40584e', text3: '#759387',
        textMain: '#10241c', textModel: '#0a9d63', textValue: '#0a9d63', textSub: '#759387',
        accent: 'rgba(10,157,99,0.10)', card: '#ffffff', error: '#d1242f', ok: '#0f766e',
        pill: { flat: 'rgba(10,157,99,0.20)', peak: 'rgba(217,70,239,0.22)', ringFlat: 'rgba(10,157,99,0.55)', ringPeak: 'rgba(217,70,239,0.60)', ringOff: 'rgba(20,184,166,0.60)' },
        palette: ['#0a9d63', '#10b981', '#f59e0b', '#22c55e', '#ef4444', '#06b6d4', '#ec4899', '#f97316', '#8b5cf6', '#14b8a6'],
        alert: { ok: '#0f766e', near: '#f59e0b', over: '#d1242f' },
        customDefault: { pillFlat: '#0a9d63', pillPeak: '#0a9d63', ringFlat: '#0a9d63', ringPeak: '#0a9d63', ringOff: '#16c878', alertOk: '#0f766e', alertNear: '#f59e0b', alertOver: '#d1242f', textMain: '#10241c', textModel: '#0a9d63', textValue: '#0a9d63', textSub: '#759387' },
    },
    // ── 5) 玫瑰鲜红（浅色）
    {
        id: 'rose', name: '玫瑰鲜红（浅色）',
        bg: 'linear-gradient(180deg, #fbe4e6 0%, #fdf2f3 45%, #ffffff 100%)',
        bgSoft: '#fdf2f3', border: 'rgba(209,60,84,0.35)',
        brand: '#c94056', brand2: '#e4576b',
        text: '#2a1418', text2: '#5c4044', text3: '#8f777b',
        textMain: '#2a1418', textModel: '#c94056', textValue: '#c94056', textSub: '#8f777b',
        accent: 'rgba(201,64,86,0.10)', card: '#ffffff', error: '#b71c2f', ok: '#0f766e',
        pill: { flat: 'rgba(201,64,86,0.22)', peak: 'rgba(124,58,237,0.22)', ringFlat: 'rgba(201,64,86,0.55)', ringPeak: 'rgba(124,58,237,0.60)', ringOff: 'rgba(236,72,153,0.60)' },
        palette: ['#c94056', '#e4576b', '#f59e0b', '#16a34a', '#ef4444', '#06b6d4', '#7c3aed', '#f97316', '#8b5cf6', '#14b8a6'],
        alert: { ok: '#16a34a', near: '#f59e0b', over: '#b71c2f' },
        customDefault: { pillFlat: '#c94056', pillPeak: '#c94056', ringFlat: '#c94056', ringPeak: '#c94056', ringOff: '#e8798a', alertOk: '#16a34a', alertNear: '#f59e0b', alertOver: '#b71c2f', textMain: '#2a1418', textModel: '#c94056', textValue: '#c94056', textSub: '#8f777b' },
    },
    // ── 6) 蜜桃浅粉（浅色）
    {
        id: 'peach', name: '蜜桃浅粉（浅色）',
        bg: 'linear-gradient(180deg, #fff1f0 0%, #fff7f5 45%, #ffffff 100%)',
        bgSoft: '#fff7f5', border: 'rgba(255,138,128,0.35)',
        brand: '#ff6b6b', brand2: '#ff8e72',
        text: '#2a1a18', text2: '#5c4240', text3: '#8a7775',
        textMain: '#2a1a18', textModel: '#ff6b6b', textValue: '#ff6b6b', textSub: '#8a7775',
        accent: 'rgba(255,107,107,0.10)', card: '#ffffff', error: '#d1242f', ok: '#16a34a',
        pill: { flat: 'rgba(255,107,107,0.18)', peak: 'rgba(217,70,239,0.22)', ringFlat: 'rgba(255,107,107,0.55)', ringPeak: 'rgba(217,70,239,0.65)', ringOff: 'rgba(251,146,60,0.60)' },
        palette: ['#ff6b6b', '#ff8e72', '#fbbf24', '#34d399', '#ef4444', '#06b6d4', '#ec4899', '#f97316', '#a78bfa', '#14b8a6'],
        alert: { ok: '#16a34a', near: '#f59e0b', over: '#d1242f' },
        customDefault: { pillFlat: '#ff6b6b', pillPeak: '#ff6b6b', ringFlat: '#ff6b6b', ringPeak: '#ff6b6b', ringOff: '#ffa94d', alertOk: '#16a34a', alertNear: '#f59e0b', alertOver: '#d1242f', textMain: '#2a1a18', textModel: '#ff6b6b', textValue: '#ff6b6b', textSub: '#8a7775' },
    },
    // ── 7) 丁香薄雾（浅色）
    {
        id: 'lavender', name: '丁香薄雾（浅色）',
        bg: 'linear-gradient(180deg, #efe9fd 0%, #f8f5ff 45%, #ffffff 100%)',
        bgSoft: '#f8f5ff', border: 'rgba(146,116,225,0.35)',
        brand: '#8b6ce7', brand2: '#a78bfa',
        text: '#221a33', text2: '#4f4468', text3: '#837a9b',
        textMain: '#221a33', textModel: '#8b6ce7', textValue: '#8b6ce7', textSub: '#837a9b',
        accent: 'rgba(139,108,231,0.10)', card: '#ffffff', error: '#d1242f', ok: '#16a34a',
        pill: { flat: 'rgba(139,108,231,0.18)', peak: 'rgba(236,72,153,0.22)', ringFlat: 'rgba(139,108,231,0.55)', ringPeak: 'rgba(236,72,153,0.65)', ringOff: 'rgba(96,165,250,0.60)' },
        palette: ['#8b6ce7', '#a78bfa', '#fbbf24', '#34d399', '#f87171', '#22d3ee', '#f472b6', '#fb923c', '#60a5fa', '#2dd4bf'],
        alert: { ok: '#16a34a', near: '#f59e0b', over: '#d1242f' },
        customDefault: { pillFlat: '#8b6ce7', pillPeak: '#8b6ce7', ringFlat: '#8b6ce7', ringPeak: '#8b6ce7', ringOff: '#a78bfa', alertOk: '#16a34a', alertNear: '#f59e0b', alertOver: '#d1242f', textMain: '#221a33', textModel: '#8b6ce7', textValue: '#8b6ce7', textSub: '#837a9b' },
    },
    // ── 8) 琥珀落日（浅色）
    {
        id: 'amber', name: '琥珀落日（浅色）',
        bg: 'linear-gradient(180deg, #fbead7 0%, #fdf6ec 45%, #ffffff 100%)',
        bgSoft: '#fdf6ec', border: 'rgba(190,132,52,0.35)',
        brand: '#b07817', brand2: '#d99c20',
        text: '#2a2113', text2: '#5f5340', text3: '#92876f',
        textMain: '#2a2113', textModel: '#b07817', textValue: '#b07817', textSub: '#92876f',
        accent: 'rgba(176,120,23,0.10)', card: '#ffffff', error: '#b71c2f', ok: '#0f766e',
        pill: { flat: 'rgba(190,132,52,0.22)', peak: 'rgba(217,70,239,0.22)', ringFlat: 'rgba(190,132,52,0.55)', ringPeak: 'rgba(217,70,239,0.60)', ringOff: 'rgba(176,120,23,0.65)' },
        palette: ['#b07817', '#d99c20', '#f59e0b', '#16a34a', '#ef4444', '#06b6d4', '#ec4899', '#dc2626', '#8b5cf6', '#14b8a6'],
        alert: { ok: '#0f766e', near: '#b45309', over: '#b71c2f' },
        customDefault: { pillFlat: '#b07817', pillPeak: '#b07817', ringFlat: '#b07817', ringPeak: '#b07817', ringOff: '#d99a2b', alertOk: '#0f766e', alertNear: '#b45309', alertOver: '#b71c2f', textMain: '#2a2113', textModel: '#b07817', textValue: '#b07817', textSub: '#92876f' },
    },
    // ── 9) 粉彩紫霞（浅色）
    {
        id: 'pastel-purple-haze', name: '粉彩紫霞（浅色）',
        bg: 'linear-gradient(180deg, #f7dfd7 0%, #f9e8e3 45%, #fdf6f4 100%)',
        bgSoft: '#f9e8e3', border: 'rgba(235,104,123,0.35)',
        brand: '#eb687b', brand2: '#f1837b',
        text: '#4a4458', text2: '#7a7488', text3: '#9d97ae',
        textMain: '#4a4458', textModel: '#eb687b', textValue: '#c5304a', textSub: '#9d97ae',
        accent: 'rgba(235,104,123,0.10)', card: '#ffffff', error: '#c5304a', ok: '#6b5f7a',
        pill: { flat: 'rgba(182,179,214,0.28)', peak: 'rgba(235,104,123,0.22)', ringFlat: 'rgba(182,179,214,0.60)', ringPeak: 'rgba(235,104,123,0.65)', ringOff: 'rgba(246,179,160,0.60)' },
        palette: ['#eb687b', '#f1837b', '#f6b3a0', '#b6b3d6', '#d0cce5', '#f7dfd7', '#d5d3df', '#d6d1d1'],
        alert: { ok: '#6b5f7a', near: '#f6b3a0', over: '#c5304a' },
        customDefault: { pillFlat: '#eb687b', pillPeak: '#c5304a', ringFlat: '#eb687b', ringPeak: '#c5304a', ringOff: '#f1837b', alertOk: '#6b5f7a', alertNear: '#f6b3a0', alertOver: '#c5304a', textMain: '#4a4458', textModel: '#eb687b', textValue: '#c5304a', textSub: '#9d97ae' },
    },
    // ── 10) 夏日海滩（浅色）
    {
        id: 'summer-beach', name: '夏日海滩（浅色）',
        bg: 'linear-gradient(180deg, #ffcd92 0%, #fff0d9 45%, #fffaf3 100%)',
        bgSoft: '#fff0d9', border: 'rgba(59,156,200,0.35)',
        brand: '#3b9cc8', brand2: '#65bddf',
        text: '#27404a', text2: '#55707b', text3: '#86a2ad',
        textMain: '#27404a', textModel: '#3b9cc8', textValue: '#d94f55', textSub: '#86a2ad',
        accent: 'rgba(59,156,200,0.10)', card: '#ffffff', error: '#d94f55', ok: '#4d9b6e',
        pill: { flat: 'rgba(101,189,223,0.28)', peak: 'rgba(253,117,122,0.22)', ringFlat: 'rgba(59,156,200,0.55)', ringPeak: 'rgba(253,117,122,0.65)', ringOff: 'rgba(176,215,170,0.60)' },
        palette: ['#3b9cc8', '#65bddf', '#fd757a', '#fa805e', '#fba270', '#ffcd92', '#b0d7aa', '#fce198'],
        alert: { ok: '#4d9b6e', near: '#fba270', over: '#fd757a' },
        customDefault: { pillFlat: '#3b9cc8', pillPeak: '#3b9cc8', ringFlat: '#3b9cc8', ringPeak: '#3b9cc8', ringOff: '#65bddf', alertOk: '#4d9b6e', alertNear: '#fba270', alertOver: '#fd757a', textMain: '#27404a', textModel: '#3b9cc8', textValue: '#d94f55', textSub: '#86a2ad' },
    },
    // ── 11) 海洋清风（浅色）
    {
        id: 'ocean-breeze', name: '海洋清风（浅色）',
        bg: 'linear-gradient(180deg, #bfdfd2 0%, #e4f2ec 45%, #f7fbf8 100%)',
        bgSoft: '#e4f2ec', border: 'rgba(64,152,172,0.35)',
        brand: '#4098ac', brand2: '#7cc0ce',
        text: '#21444a', text2: '#4f6f75', text3: '#84a0a6',
        textMain: '#21444a', textModel: '#4098ac', textValue: '#c9552e', textSub: '#84a0a6',
        accent: 'rgba(64,152,172,0.10)', card: '#ffffff', error: '#c9552e', ok: '#53999d',
        pill: { flat: 'rgba(124,192,206,0.30)', peak: 'rgba(236,142,90,0.22)', ringFlat: 'rgba(64,152,172,0.55)', ringPeak: 'rgba(236,142,90,0.65)', ringOff: 'rgba(220,201,146,0.60)' },
        palette: ['#4098ac', '#7cc0ce', '#53999d', '#ec8e5a', '#ec9e59', '#ecb66b', '#dcc992', '#bfdfd2'],
        alert: { ok: '#53999d', near: '#ecb66b', over: '#ec8e5a' },
        customDefault: { pillFlat: '#4098ac', pillPeak: '#4098ac', ringFlat: '#4098ac', ringPeak: '#4098ac', ringOff: '#7cc0ce', alertOk: '#53999d', alertNear: '#ecb66b', alertOver: '#ec8e5a', textMain: '#21444a', textModel: '#4098ac', textValue: '#c9552e', textSub: '#84a0a6' },
    },
    // ── 12) 石板灰调（中性）
    {
        id: 'slate', name: '石板灰调（中性）',
        bg: 'linear-gradient(180deg, #e7e9ed 0%, #f6f7f9 45%, #ffffff 100%)',
        bgSoft: '#f6f7f9', border: 'rgba(100,116,139,0.35)',
        brand: '#5b6b7f', brand2: '#8294ab',
        text: '#1c2127', text2: '#5a636e', text3: '#8a929c',
        textMain: '#1c2127', textModel: '#5b6b7f', textValue: '#5b6b7f', textSub: '#8a929c',
        accent: 'rgba(91,107,127,0.10)', card: '#ffffff', error: '#b91c1c', ok: '#15803d',
        pill: { flat: 'rgba(100,116,139,0.20)', peak: 'rgba(220,38,38,0.22)', ringFlat: 'rgba(100,116,139,0.55)', ringPeak: 'rgba(220,38,38,0.60)', ringOff: 'rgba(100,116,139,0.65)' },
        palette: ['#5b6b7f', '#8294ab', '#f59e0b', '#16a34a', '#ef4444', '#06b6d4', '#ec4899', '#dc2626', '#8b5cf6', '#14b8a6'],
        alert: { ok: '#15803d', near: '#f59e0b', over: '#b91c1c' },
        customDefault: { pillFlat: '#5b6b7f', pillPeak: '#5b6b7f', ringFlat: '#5b6b7f', ringPeak: '#5b6b7f', ringOff: '#94a3b8', alertOk: '#15803d', alertNear: '#f59e0b', alertOver: '#b91c1c', textMain: '#1c2127', textModel: '#5b6b7f', textValue: '#5b6b7f', textSub: '#8a929c' },
    },
    // ── 13) 午夜深蓝（暗黑）
    {
        id: 'midnight', name: '午夜深蓝（暗黑）',
        bg: 'linear-gradient(180deg, #141a2b 0%, #1b2236 45%, #232a42 100%)',
        bgSoft: '#1b2236', border: 'rgba(129,140,248,0.35)',
        brand: '#7c8cf8', brand2: '#a78bfa',
        text: '#e8ecf6', text2: '#aab3cf', text3: '#7c86a6',
        textMain: '#e8ecf6', textModel: '#7c8cf8', textValue: '#7c8cf8', textSub: '#7c86a6',
        accent: 'rgba(124,140,248,0.12)', card: '#232a42', error: '#f87171', ok: '#34d399',
        pill: { flat: 'rgba(124,140,248,0.20)', peak: 'rgba(244,114,182,0.22)', ringFlat: 'rgba(124,140,248,0.55)', ringPeak: 'rgba(244,114,182,0.65)', ringOff: 'rgba(52,211,153,0.60)' },
        palette: ['#7c8cf8', '#a78bfa', '#fbbf24', '#34d399', '#f87171', '#22d3ee', '#f472b6', '#fb923c', '#c4b5fd', '#2dd4bf'],
        alert: { ok: '#34d399', near: '#fbbf24', over: '#f87171' },
        customDefault: { pillFlat: '#7c8cf8', pillPeak: '#7c8cf8', ringFlat: '#7c8cf8', ringPeak: '#7c8cf8', ringOff: '#a5b4fc', alertOk: '#34d399', alertNear: '#fbbf24', alertOver: '#f87171', textMain: '#e8ecf6', textModel: '#7c8cf8', textValue: '#7c8cf8', textSub: '#7c86a6' },
    },
    // ── 14) 深海幽蓝（暗黑）
    {
        id: 'ocean', name: '深海幽蓝（暗黑）',
        bg: 'linear-gradient(180deg, #0e1a26 0%, #14252f 45%, #1c2f3a 100%)',
        bgSoft: '#14252f', border: 'rgba(56,189,248,0.35)',
        brand: '#38bdf8', brand2: '#22d3ee',
        text: '#e2f1f8', text2: '#9fc3d3', text3: '#6f93a4',
        textMain: '#e2f1f8', textModel: '#38bdf8', textValue: '#38bdf8', textSub: '#6f93a4',
        accent: 'rgba(56,189,248,0.12)', card: '#1c2f3a', error: '#fb7185', ok: '#2dd4bf',
        pill: { flat: 'rgba(56,189,248,0.22)', peak: 'rgba(244,114,182,0.24)', ringFlat: 'rgba(56,189,248,0.55)', ringPeak: 'rgba(244,114,182,0.65)', ringOff: 'rgba(45,212,191,0.60)' },
        palette: ['#38bdf8', '#22d3ee', '#fbbf24', '#2dd4bf', '#fb7185', '#60a5fa', '#f472b6', '#fb923c', '#a78bfa', '#34d399'],
        alert: { ok: '#2dd4bf', near: '#fbbf24', over: '#fb7185' },
        customDefault: { pillFlat: '#38bdf8', pillPeak: '#38bdf8', ringFlat: '#38bdf8', ringPeak: '#38bdf8', ringOff: '#7dd3fc', alertOk: '#2dd4bf', alertNear: '#fbbf24', alertOver: '#fb7185', textMain: '#e2f1f8', textModel: '#38bdf8', textValue: '#38bdf8', textSub: '#6f93a4' },
    },
    // ── 15) 森林夜色（暗黑）
    {
        id: 'forest', name: '森林夜色（暗黑）',
        bg: 'linear-gradient(180deg, #0f1f16 0%, #16291e 45%, #1f3527 100%)',
        bgSoft: '#16291e', border: 'rgba(52,211,153,0.35)',
        brand: '#34d399', brand2: '#6ee7b7',
        text: '#e3f4ec', text2: '#9fc9b2', text3: '#6e9480',
        textMain: '#e3f4ec', textModel: '#34d399', textValue: '#34d399', textSub: '#6e9480',
        accent: 'rgba(52,211,153,0.12)', card: '#1f3527', error: '#fb7185', ok: '#4ade80',
        pill: { flat: 'rgba(52,211,153,0.22)', peak: 'rgba(244,114,182,0.24)', ringFlat: 'rgba(52,211,153,0.55)', ringPeak: 'rgba(244,114,182,0.65)', ringOff: 'rgba(74,222,128,0.60)' },
        palette: ['#34d399', '#6ee7b7', '#fbbf24', '#4ade80', '#fb7185', '#22d3ee', '#f472b6', '#fb923c', '#86efac', '#2dd4bf'],
        alert: { ok: '#4ade80', near: '#fbbf24', over: '#fb7185' },
        customDefault: { pillFlat: '#34d399', pillPeak: '#34d399', ringFlat: '#34d399', ringPeak: '#34d399', ringOff: '#6ee7b7', alertOk: '#4ade80', alertNear: '#fbbf24', alertOver: '#fb7185', textMain: '#e3f4ec', textModel: '#34d399', textValue: '#34d399', textSub: '#6e9480' },
    },
    // ── 16) 星夜紫岚（暗黑）
    {
        id: 'grape', name: '星夜紫岚（暗黑）',
        bg: 'linear-gradient(180deg, #1c1530 0%, #241a3c 45%, #2d2249 100%)',
        bgSoft: '#241a3c', border: 'rgba(196,181,253,0.35)',
        brand: '#a78bfa', brand2: '#c4b5fd',
        text: '#eee9fb', text2: '#b6aad6', text3: '#8a7cb2',
        textMain: '#eee9fb', textModel: '#a78bfa', textValue: '#a78bfa', textSub: '#8a7cb2',
        accent: 'rgba(167,139,250,0.14)', card: '#2d2249', error: '#f87171', ok: '#34d399',
        pill: { flat: 'rgba(167,139,250,0.22)', peak: 'rgba(244,114,182,0.24)', ringFlat: 'rgba(167,139,250,0.55)', ringPeak: 'rgba(244,114,182,0.65)', ringOff: 'rgba(52,211,153,0.60)' },
        palette: ['#a78bfa', '#c4b5fd', '#fbbf24', '#34d399', '#f87171', '#22d3ee', '#f472b6', '#fb923c', '#818cf8', '#2dd4bf'],
        alert: { ok: '#34d399', near: '#fbbf24', over: '#f87171' },
        customDefault: { pillFlat: '#a78bfa', pillPeak: '#a78bfa', ringFlat: '#a78bfa', ringPeak: '#a78bfa', ringOff: '#c4b5fd', alertOk: '#34d399', alertNear: '#fbbf24', alertOver: '#f87171', textMain: '#eee9fb', textModel: '#a78bfa', textValue: '#a78bfa', textSub: '#8a7cb2' },
    },
    // ══ 以下 8 套主题来自 palettes.json 提取配色（开发者本地开发产物，8 组，2026-07 新增）。
    //    身份色（胶囊/呼吸/品牌/字体分类）= 每组配色的原色；中性色 = 同色系深浅变体。
    // ── 17) 科技未来（暗黑）
    {
        id: 'tech-future', name: '科技未来（暗黑）',
        bg: 'linear-gradient(180deg, #25012e 0%, #2c0a3d 45%, #1e1236 100%)',
        bgSoft: '#2c0a3d', border: 'rgba(48,160,131,0.40)',
        brand: '#30a083', brand2: '#51be64',
        text: '#d9f2e4', text2: '#9fc4b4', text3: '#7fa398',
        textMain: '#d9f2e4', textModel: '#51be64', textValue: '#f8e520', textSub: '#7fa398',
        accent: 'rgba(48,160,131,0.14)', card: '#33114a', error: '#f8e520', ok: '#51be64',
        pill: { flat: 'rgba(43,125,143,0.30)', peak: 'rgba(248,229,32,0.22)', ringFlat: 'rgba(48,160,131,0.60)', ringPeak: 'rgba(248,229,32,0.70)', ringOff: 'rgba(81,190,100,0.60)' },
        palette: ['#30a083', '#51be64', '#9ed73f', '#f8e520', '#2b7d8f', '#365d8d', '#3f387e', '#430258'],
        alert: { ok: '#51be64', near: '#9ed73f', over: '#f8e520' },
        customDefault: { pillFlat: '#30a083', pillPeak: '#f8e520', ringFlat: '#30a083', ringPeak: '#f8e520', ringOff: '#51be64', alertOk: '#51be64', alertNear: '#9ed73f', alertOver: '#f8e520', textMain: '#d9f2e4', textModel: '#51be64', textValue: '#f8e520', textSub: '#7fa398' },
    },
    // ── 18) 热带森林（暗黑）
    {
        id: 'tropical-forest', name: '热带森林（暗黑）',
        bg: 'linear-gradient(180deg, #16303a 0%, #1d3d45 45%, #24464b 100%)',
        bgSoft: '#1d3d45', border: 'rgba(96,170,132,0.40)',
        brand: '#248d82', brand2: '#60aa84',
        text: '#e0efe6', text2: '#a3c2b3', text3: '#7f9c93',
        textMain: '#e0efe6', textModel: '#60aa84', textValue: '#f1a464', textSub: '#7f9c93',
        accent: 'rgba(36,141,130,0.14)', card: '#24464b', error: '#e56d4e', ok: '#60aa84',
        pill: { flat: 'rgba(96,170,132,0.25)', peak: 'rgba(229,109,78,0.25)', ringFlat: 'rgba(36,141,130,0.60)', ringPeak: 'rgba(229,109,78,0.65)', ringOff: 'rgba(180,184,127,0.60)' },
        palette: ['#248d82', '#60aa84', '#e56d4e', '#f1a464', '#eabc6b', '#b4b87f', '#407a7f', '#264a56'],
        alert: { ok: '#60aa84', near: '#eabc6b', over: '#e56d4e' },
        customDefault: { pillFlat: '#60aa84', pillPeak: '#e56d4e', ringFlat: '#248d82', ringPeak: '#e56d4e', ringOff: '#4a9e8c', alertOk: '#60aa84', alertNear: '#eabc6b', alertOver: '#e56d4e', textMain: '#e0efe6', textModel: '#60aa84', textValue: '#f1a464', textSub: '#7f9c93' },
    },
    // ── 19) 经典红蓝（暗黑）
    {
        id: 'classic-redblue', name: '经典红蓝（暗黑）',
        bg: 'linear-gradient(180deg, #152e38 0%, #1a3a48 45%, #1f4353 100%)',
        bgSoft: '#1a3a48', border: 'rgba(81,149,194,0.40)',
        brand: '#5195c2', brand2: '#2d5a74',
        text: '#e6eef4', text2: '#a9bfcf', text3: '#7f95a3',
        textMain: '#e6eef4', textModel: '#5195c2', textValue: '#eab3a4', textSub: '#7f95a3',
        accent: 'rgba(81,149,194,0.14)', card: '#1f4353', error: '#c3333b', ok: '#b6b6b2',
        pill: { flat: 'rgba(45,90,116,0.35)', peak: 'rgba(195,51,59,0.30)', ringFlat: 'rgba(81,149,194,0.60)', ringPeak: 'rgba(195,51,59,0.70)', ringOff: 'rgba(234,179,164,0.55)' },
        palette: ['#5195c2', '#2d5a74', '#c3333b', '#a00514', '#7c0302', '#eab3a4', '#b6b6b2', '#224e5d'],
        alert: { ok: '#b6b6b2', near: '#eab3a4', over: '#c3333b' },
        customDefault: { pillFlat: '#5195c2', pillPeak: '#c3333b', ringFlat: '#5195c2', ringPeak: '#c3333b', ringOff: '#6fb3d6', alertOk: '#b6b6b2', alertNear: '#eab3a4', alertOver: '#c3333b', textMain: '#e6eef4', textModel: '#5195c2', textValue: '#eab3a4', textSub: '#7f95a3' },
    },
    // ── 20) 紫夜曙光（暗黑）
    {
        id: 'purple-night-dawn', name: '紫夜曙光（暗黑）',
        bg: 'linear-gradient(180deg, #0d0238 0%, #1a0554 45%, #26086b 100%)',
        bgSoft: '#1a0554', border: 'rgba(252,180,51,0.35)',
        brand: '#f08946', brand2: '#c5437a',
        text: '#efe6f7', text2: '#bda8d4', text3: '#907aa8',
        textMain: '#efe6f7', textModel: '#f08946', textValue: '#fcb433', textSub: '#907aa8',
        accent: 'rgba(252,180,51,0.12)', card: '#26086b', error: '#dd6462', ok: '#fcb433',
        pill: { flat: 'rgba(163,31,151,0.30)', peak: 'rgba(240,137,70,0.25)', ringFlat: 'rgba(163,31,151,0.60)', ringPeak: 'rgba(240,137,70,0.70)', ringOff: 'rgba(252,180,51,0.55)' },
        palette: ['#f08946', '#fcb433', '#c5437a', '#dd6462', '#a31f97', '#7907a8', '#4b03a1', '#170489'],
        alert: { ok: '#fcb433', near: '#f08946', over: '#dd6462' },
        customDefault: { pillFlat: '#8a5cf5', pillPeak: '#f08946', ringFlat: '#8a5cf5', ringPeak: '#f08946', ringOff: '#fcb433', alertOk: '#fcb433', alertNear: '#f08946', alertOver: '#dd6462', textMain: '#efe6f7', textModel: '#f08946', textValue: '#fcb433', textSub: '#907aa8' },
    },
];
/** Convert any color (#rgb/#rrggbb/rgb()/rgba()) into an rgba() with the given
 *  alpha. Used by the capsule renderer so user-picked hex colors still render
 *  as a VERY LIGHT wash (capsule fill must stay pale enough for the text to
 *  read regardless of how dark the picked base color is). */
export function withAlpha(color, alpha) {
    const c = (color ?? '').trim();
    const a = Math.max(0, Math.min(1, alpha));
    const hex = /^#([0-9a-f]{6})$/i.exec(c);
    if (hex !== null) {
        const n = parseInt(hex[1], 16);
        return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
    }
    const short = /^#([0-9a-f]{3})$/i.exec(c);
    if (short !== null) {
        const r = parseInt(short[1][0] + short[1][0], 16);
        const g = parseInt(short[1][1] + short[1][1], 16);
        const b = parseInt(short[1][2] + short[1][2], 16);
        return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    const rgba = /^rgba?\(([^)]+)\)$/i.exec(c);
    if (rgba !== null) {
        const parts = rgba[1].split(',').map((s) => s.trim());
        if (parts.length >= 3)
            return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${a})`;
    }
    return c;
}
/** Resolve effective colors: custom overrides first, then theme.customDefault,
 *  then theme's own pill/alert defaults. This way every theme always renders
 *  with a non-empty, theme-specific palette even when the user hasn't touched
 *  any color picker. */
export function resolveTheme(theme, custom) {
    const fallback = theme.customDefault;
    const pick = (val, defaultVal, ultimateFallback) => val && val.trim() !== '' ? val : defaultVal && defaultVal.trim() !== '' ? defaultVal : ultimateFallback;
    return {
        ...theme,
        pill: {
            flat: pick(custom.pillFlat, fallback.pillFlat, theme.pill.flat),
            peak: pick(custom.pillPeak, fallback.pillPeak, theme.pill.peak),
            ringFlat: pick(custom.ringFlat, fallback.ringFlat, theme.pill.ringFlat),
            ringPeak: pick(custom.ringPeak, fallback.ringPeak, theme.pill.ringPeak),
            ringOff: pick(custom.ringOff, fallback.ringOff, theme.pill.ringOff),
        },
        alert: {
            ok: pick(custom.alertOk, fallback.alertOk, theme.alert.ok),
            near: pick(custom.alertNear, fallback.alertNear, theme.alert.near),
            over: pick(custom.alertOver, fallback.alertOver, theme.alert.over),
        },
        // 字体四分类：用户自定义 → 主题预制 → 主题基础文字色
        textMain: pick(custom.textMain, fallback.textMain, theme.textMain),
        textModel: pick(custom.textModel, fallback.textModel, theme.textModel),
        textValue: pick(custom.textValue, fallback.textValue, theme.textValue),
        textSub: pick(custom.textSub, fallback.textSub, theme.textSub),
    };
}
export function themeOf(id) {
    const found = THEMES.find((t) => t.id === id);
    return found ?? THEMES[0];
}
// ── persistence (localStorage, never config.json) ────────────────────────────
const THEME_KEY = 'um-theme'; // stores { id, custom: { [themeId]: ThemeCustom } }
const THEME_CHANGE_EVENT = 'um-theme-change';
export function defaultThemeState() {
    return { id: THEMES[0].id, custom: {} };
}
export function getThemeState() {
    try {
        const raw = localStorage.getItem(THEME_KEY);
        if (raw === null)
            return defaultThemeState();
        const d = JSON.parse(raw);
        return { id: themeOf(d?.id).id, custom: d?.custom && typeof d.custom === 'object' ? d.custom : {} };
    }
    catch {
        return defaultThemeState();
    }
}
export function setThemeState(state) {
    try {
        localStorage.setItem(THEME_KEY, JSON.stringify(state));
    }
    catch { /* ignore */ }
    // Broadcast so other components (popup, other settings panels) refresh
    // immediately, without waiting for a manual page reload.
    try {
        window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT));
    }
    catch { /* ignore */ }
}
export const THEME_CHANGE = THEME_CHANGE_EVENT;
