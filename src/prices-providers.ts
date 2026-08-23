/**
 * 合并的厂商模型价格表（bundled）。
 *
 * 数据来源：@deepseek-ai/dsh-usage-meter lib/types/prices/providers/ 下全部厂商文件
 * （anthropic / baichuan / baidu / cohere / deepseek / doubao / gemini / hunyuan /
 *   iflytek / minimax / mistral / moonshot / openai / qwen / skywork / stepfun /
 *   xai / xiaomi / zhipu，共 19 个文件）。
 * 所有数值逐字保留自源文件，未做任何四舍五入或修改。
 */

/** 单条模型价格行。单位：每百万 token 的价格（currency 指定币种）。 */
export interface PricingRow {
    inputPerM: number;
    outputPerM: number;
    cacheReadPerM?: number;
    cacheWritePerM?: number;
    combinedPerM?: number;
    discount?: number;
    peak?: { inputPerM: number; outputPerM: number; cacheReadPerM?: number } | null;
    offPeak?: { inputPerM: number; outputPerM: number; cacheReadPerM?: number } | null;
    peakOffPeakFrom?: number;
    /** Beijing weekdays (0=Sun..6=Sat) with peak/off-peak split; days not listed are flat. */
    peakDays?: number[];
    /** Peak-hour windows in Beijing hours [0,24). */
    peakWindows?: Array<{ start: number; end: number }>;
    /** Flat rate for days not in peakDays (weekend); falls back to offPeak. */
    weekend?: { inputPerM: number; outputPerM: number; cacheReadPerM?: number } | null;
    currency?: string;
    source?: 'bundled' | 'remote' | 'user';
}

/**
 * DeepSeek V4 峰/谷计价生效时间：2026-08-17 00:00 北京时间
 * (= 2026-08-16T16:00Z)。峰时（北京时间）09:00–12:00、14:00–18:00
 * = UTC 01:00–04:00 与 06:00–10:00。
 */
export const DEEPSEEK_PEAK_OFF_PEAK_FROM: number = 1786896000000; // Date.UTC(2026, 7, 16, 16, 0, 0)

export const BUNDLED_TABLE: Record<string, PricingRow> = {
    // ============ anthropic（USD）============
    // 旗舰（可用）
    'anthropic/claude-fable-5': { inputPerM: 10, outputPerM: 50, cacheReadPerM: 1, cacheWritePerM: 12.5, currency: 'USD', source: 'bundled' },
    'anthropic/claude-mythos-5': { inputPerM: 10, outputPerM: 50, cacheReadPerM: 1, cacheWritePerM: 12.5, currency: 'USD', source: 'bundled' },
    'anthropic/claude-opus-5': { inputPerM: 5, outputPerM: 25, cacheReadPerM: 0.5, cacheWritePerM: 6.25, currency: 'USD', source: 'bundled' },
    'anthropic/claude-opus-4-8': { inputPerM: 5, outputPerM: 25, cacheReadPerM: 0.5, cacheWritePerM: 6.25, currency: 'USD', source: 'bundled' },
    'anthropic/claude-opus-4-7': { inputPerM: 5, outputPerM: 25, cacheReadPerM: 0.5, cacheWritePerM: 6.25, currency: 'USD', source: 'bundled' },
    'anthropic/claude-opus-4-6': { inputPerM: 5, outputPerM: 25, cacheReadPerM: 0.5, cacheWritePerM: 6.25, currency: 'USD', source: 'bundled' },
    'anthropic/claude-opus-4-5': { inputPerM: 5, outputPerM: 25, cacheReadPerM: 0.5, cacheWritePerM: 6.25, currency: 'USD', source: 'bundled' },
    // 中端与轻量（可用）
    'anthropic/claude-sonnet-5': { inputPerM: 2, outputPerM: 10, cacheReadPerM: 0.2, cacheWritePerM: 2.5, currency: 'USD', source: 'bundled' },
    'anthropic/claude-sonnet-4-6': { inputPerM: 3, outputPerM: 15, cacheReadPerM: 0.3, cacheWritePerM: 3.75, currency: 'USD', source: 'bundled' },
    'anthropic/claude-sonnet-4-5': { inputPerM: 3, outputPerM: 15, cacheReadPerM: 0.3, cacheWritePerM: 3.75, currency: 'USD', source: 'bundled' },
    'anthropic/claude-haiku-4-5': { inputPerM: 1, outputPerM: 5, cacheReadPerM: 0.1, cacheWritePerM: 1.25, currency: 'USD', source: 'bundled' },

    // ============ baichuan（CNY）============
    'baichuan/baichuan4': { inputPerM: 100, outputPerM: 100, combinedPerM: 100, currency: 'CNY', source: 'bundled' },
    'baichuan/baichuan4-turbo': { inputPerM: 15, outputPerM: 15, combinedPerM: 15, currency: 'CNY', source: 'bundled' },
    'baichuan/baichuan4-air': { inputPerM: 0.98, outputPerM: 0.98, combinedPerM: 0.98, currency: 'CNY', source: 'bundled' },
    'baichuan/baichuan-m2': { inputPerM: 2, outputPerM: 20, currency: 'CNY', source: 'bundled' },
    'baichuan/baichuan-m3-plus': { inputPerM: 0, outputPerM: 0, combinedPerM: 0, currency: 'CNY', source: 'bundled' },

    // ============ baidu（CNY）============
    'baidu/ernie-5.0': { inputPerM: 6, outputPerM: 24, currency: 'CNY', source: 'bundled' },
    'baidu/ernie-5.1': { inputPerM: 4, outputPerM: 18, currency: 'CNY', source: 'bundled' },
    'baidu/ernie-x1.1': { inputPerM: 1, outputPerM: 4, currency: 'CNY', source: 'bundled' },
    'baidu/ernie-4.5': { inputPerM: 4, outputPerM: 16, currency: 'CNY', source: 'bundled' },
    'baidu/ernie-4.5-turbo': { inputPerM: 0.8, outputPerM: 3.2, currency: 'CNY', source: 'bundled' },
    'baidu/ernie-x1-turbo': { inputPerM: 1, outputPerM: 4, currency: 'CNY', source: 'bundled' },

    // ============ cohere（USD）============
    'cohere/command-a-plus': { inputPerM: 2.5, outputPerM: 10, currency: 'USD', source: 'bundled' },
    'cohere/command-a': { inputPerM: 2.5, outputPerM: 10, currency: 'USD', source: 'bundled' },
    'cohere/command-r-plus': { inputPerM: 2.5, outputPerM: 10, currency: 'USD', source: 'bundled' },
    'cohere/command-r': { inputPerM: 0.15, outputPerM: 0.6, currency: 'USD', source: 'bundled' },

    // ============ deepseek（CNY，含峰/谷计价）============
    'deepseek-official/deepseek-v4-flash': {
        inputPerM: 1,
        outputPerM: 2,
        cacheReadPerM: 0.02,
        peak: { inputPerM: 3, outputPerM: 9, cacheReadPerM: 0.1 },
        offPeak: { inputPerM: 1.5, outputPerM: 4.5, cacheReadPerM: 0.05 },
        peakOffPeakFrom: DEEPSEEK_PEAK_OFF_PEAK_FROM,
        peakDays: [1, 2, 3, 4, 5],
        peakWindows: [{ start: 540, end: 720 }, { start: 840, end: 1080 }],
        currency: 'CNY',
        source: 'bundled',
    },
    'deepseek-official/deepseek-v4-pro': {
        inputPerM: 3,
        outputPerM: 6,
        cacheReadPerM: 0.025,
        peak: { inputPerM: 9, outputPerM: 27, cacheReadPerM: 0.3 },
        offPeak: { inputPerM: 4.5, outputPerM: 13.5, cacheReadPerM: 0.15 },
        peakOffPeakFrom: DEEPSEEK_PEAK_OFF_PEAK_FROM,
        peakDays: [1, 2, 3, 4, 5],
        peakWindows: [{ start: 540, end: 720 }, { start: 840, end: 1080 }],
        currency: 'CNY',
        source: 'bundled',
    },
    // vision 变体（走 vision-toolkit 路由时上报的模型 ID；同 v4-flash 档计价）
    'deepseek-official/deepseek-v4-flash-vision-exp': {
        inputPerM: 1,
        outputPerM: 2,
        cacheReadPerM: 0.02,
        peak: { inputPerM: 3, outputPerM: 9, cacheReadPerM: 0.1 },
        offPeak: { inputPerM: 1.5, outputPerM: 4.5, cacheReadPerM: 0.05 },
        peakOffPeakFrom: DEEPSEEK_PEAK_OFF_PEAK_FROM,
        peakDays: [1, 2, 3, 4, 5],
        peakWindows: [{ start: 540, end: 720 }, { start: 840, end: 1080 }],
        currency: 'CNY',
        source: 'bundled',
    },
    // Legacy DeepSeek ids（V4 系列的别名）
    'deepseek-official/deepseek-chat': {
        inputPerM: 1,
        outputPerM: 2,
        cacheReadPerM: 0.02,
        peak: { inputPerM: 3, outputPerM: 9, cacheReadPerM: 0.1 },
        offPeak: { inputPerM: 1.5, outputPerM: 4.5, cacheReadPerM: 0.05 },
        peakOffPeakFrom: DEEPSEEK_PEAK_OFF_PEAK_FROM,
        peakDays: [1, 2, 3, 4, 5],
        peakWindows: [{ start: 540, end: 720 }, { start: 840, end: 1080 }],
        currency: 'CNY',
        source: 'bundled',
    },
    'deepseek-official/deepseek-reasoner': {
        inputPerM: 3,
        outputPerM: 6,
        cacheReadPerM: 0.025,
        peak: { inputPerM: 9, outputPerM: 27, cacheReadPerM: 0.3 },
        offPeak: { inputPerM: 4.5, outputPerM: 13.5, cacheReadPerM: 0.15 },
        peakOffPeakFrom: DEEPSEEK_PEAK_OFF_PEAK_FROM,
        peakDays: [1, 2, 3, 4, 5],
        peakWindows: [{ start: 540, end: 720 }, { start: 840, end: 1080 }],
        currency: 'CNY',
        source: 'bundled',
    },

    // ============ doubao（CNY）============
    'doubao/doubao-seed-2.1-pro': { inputPerM: 6, outputPerM: 30, cacheReadPerM: 1.2, currency: 'CNY', source: 'bundled' },
    'doubao/doubao-seed-2.1-turbo': { inputPerM: 3, outputPerM: 15, cacheReadPerM: 0.6, currency: 'CNY', source: 'bundled' },
    'doubao/doubao-seed-2-0-pro': { inputPerM: 3.2, outputPerM: 16, currency: 'CNY', source: 'bundled' },
    'doubao/doubao-seed-1.6': { inputPerM: 0.8, outputPerM: 2, cacheReadPerM: 0.16, currency: 'CNY', source: 'bundled' },
    'doubao/doubao-seed-1.6-thinking': { inputPerM: 0.8, outputPerM: 8, cacheReadPerM: 0.16, currency: 'CNY', source: 'bundled' },
    'doubao/doubao-seed-1.6-vision': { inputPerM: 0.8, outputPerM: 8, cacheReadPerM: 0.16, currency: 'CNY', source: 'bundled' },
    'doubao/doubao-seed-1.6-lite': { inputPerM: 0.3, outputPerM: 0.6, cacheReadPerM: 0.06, currency: 'CNY', source: 'bundled' },
    'doubao/doubao-seed-1.6-flash': { inputPerM: 0.15, outputPerM: 1.5, cacheReadPerM: 0.03, currency: 'CNY', source: 'bundled' },
    'doubao/doubao-1.5-pro-32k': { inputPerM: 0.8, outputPerM: 2, cacheReadPerM: 0.16, currency: 'CNY', source: 'bundled' },
    'doubao/doubao-1.5-lite-32k': { inputPerM: 0.3, outputPerM: 0.6, cacheReadPerM: 0.06, currency: 'CNY', source: 'bundled' },

    // ============ gemini（USD）============
    'gemini/gemini-3.7-flash': { inputPerM: 0.75, outputPerM: 3.75, cacheReadPerM: 0.075, currency: 'USD', source: 'bundled' },
    'gemini/gemini-3.6-flash': { inputPerM: 0.75, outputPerM: 3.75, cacheReadPerM: 0.075, currency: 'USD', source: 'bundled' },
    'gemini/gemini-3.5-flash': { inputPerM: 1.5, outputPerM: 9, cacheReadPerM: 0.15, currency: 'USD', source: 'bundled' },
    'gemini/gemini-3.5-flash-lite': { inputPerM: 0.3, outputPerM: 2.5, cacheReadPerM: 0.03, currency: 'USD', source: 'bundled' },
    'gemini/gemini-3.1-pro-preview': { inputPerM: 2, outputPerM: 12, cacheReadPerM: 0.2, currency: 'USD', source: 'bundled' },
    'gemini/gemini-3.1-flash-lite': { inputPerM: 0.25, outputPerM: 1.5, cacheReadPerM: 0.025, currency: 'USD', source: 'bundled' },
    'gemini/gemini-3-flash-preview': { inputPerM: 0.5, outputPerM: 3, cacheReadPerM: 0.05, currency: 'USD', source: 'bundled' },
    'gemini/gemini-2.5-pro': { inputPerM: 1.25, outputPerM: 10, cacheReadPerM: 0.13, currency: 'USD', source: 'bundled' },
    'gemini/gemini-2.5-flash': { inputPerM: 0.3, outputPerM: 2.5, cacheReadPerM: 0.03, currency: 'USD', source: 'bundled' },
    'gemini/gemini-2.5-flash-lite': { inputPerM: 0.1, outputPerM: 0.4, cacheReadPerM: 0.01, currency: 'USD', source: 'bundled' },

    // ============ hunyuan（CNY）============
    'hunyuan/hy3': { inputPerM: 1, outputPerM: 4, cacheReadPerM: 0.25, currency: 'CNY', source: 'bundled' },
    'hunyuan/hunyuan-a13b': { inputPerM: 0.5, outputPerM: 2, currency: 'CNY', source: 'bundled' },
    'hunyuan/hunyuan-role-latest': { inputPerM: 2.4, outputPerM: 9.6, currency: 'CNY', source: 'bundled' },
    'hunyuan/hunyuan-translation': { inputPerM: 1.2, outputPerM: 3.6, currency: 'CNY', source: 'bundled' },
    'hunyuan/hunyuan-translation-lite': { inputPerM: 1, outputPerM: 3, currency: 'CNY', source: 'bundled' },
    'hunyuan/hunyuan-turbos-vision': { inputPerM: 3, outputPerM: 9, currency: 'CNY', source: 'bundled' },
    'hunyuan/hunyuan-t1-vision': { inputPerM: 3, outputPerM: 9, currency: 'CNY', source: 'bundled' },
    'hunyuan/hy-vision-1.5': { inputPerM: 3, outputPerM: 9, currency: 'CNY', source: 'bundled' },
    'hunyuan/hunyuan-turbos-vision-video': { inputPerM: 3, outputPerM: 9, currency: 'CNY', source: 'bundled' },
    'hunyuan/hunyuan-embedding': { inputPerM: 0.7, outputPerM: 0.7, currency: 'CNY', source: 'bundled' },

    // ============ iflytek（CNY）============
    'iflytek/spark-x1.5': { inputPerM: 21, outputPerM: 21, combinedPerM: 21, currency: 'CNY', source: 'bundled' },
    'iflytek/spark-ultra': { inputPerM: 21, outputPerM: 21, combinedPerM: 21, currency: 'CNY', source: 'bundled' },
    'iflytek/spark-pro': { inputPerM: 21, outputPerM: 21, combinedPerM: 21, currency: 'CNY', source: 'bundled' },
    'iflytek/spark-lite': { inputPerM: 0, outputPerM: 0, combinedPerM: 0, currency: 'CNY', source: 'bundled' },

    // ============ minimax（CNY）============
    'minimax/MiniMax-M3': { inputPerM: 2.1, outputPerM: 8.4, cacheReadPerM: 0.42, currency: 'CNY', source: 'bundled' },
    'minimax/MiniMax-M2.7': { inputPerM: 2.1, outputPerM: 8.4, cacheReadPerM: 0.42, cacheWritePerM: 2.625, currency: 'CNY', source: 'bundled' },

    // ============ mistral（USD）============
    'mistral/mistral-large-latest': { inputPerM: 0.5, outputPerM: 1.5, cacheReadPerM: 0.05, currency: 'USD', source: 'bundled' },
    'mistral/mistral-medium-latest': { inputPerM: 1.5, outputPerM: 7.5, cacheReadPerM: 0.15, currency: 'USD', source: 'bundled' },
    'mistral/mistral-small-latest': { inputPerM: 0.15, outputPerM: 0.6, cacheReadPerM: 0.015, currency: 'USD', source: 'bundled' },
    'mistral/codestral-latest': { inputPerM: 0.3, outputPerM: 0.9, cacheReadPerM: 0.03, currency: 'USD', source: 'bundled' },
    'mistral/ministral-3-14b': { inputPerM: 0.2, outputPerM: 0.2, cacheReadPerM: 0.02, currency: 'USD', source: 'bundled' },
    'mistral/ministral-3-8b': { inputPerM: 0.15, outputPerM: 0.15, cacheReadPerM: 0.015, currency: 'USD', source: 'bundled' },
    'mistral/ministral-3-3b': { inputPerM: 0.1, outputPerM: 0.1, cacheReadPerM: 0.01, currency: 'USD', source: 'bundled' },

    // ============ moonshot（CNY）============
    'moonshot/kimi-k3': { inputPerM: 20, outputPerM: 100, cacheReadPerM: 2, currency: 'CNY', source: 'bundled' },
    'moonshot/kimi-k2.7-code-highspeed': { inputPerM: 13, outputPerM: 54, cacheReadPerM: 2.6, currency: 'CNY', source: 'bundled' },
    'moonshot/kimi-k2.7-code': { inputPerM: 6.5, outputPerM: 27, cacheReadPerM: 1.3, currency: 'CNY', source: 'bundled' },
    'moonshot/kimi-k2.6': { inputPerM: 6.5, outputPerM: 27, cacheReadPerM: 1.1, currency: 'CNY', source: 'bundled' },
    // ⚰️ 即将下线（2026-08-31），价格行保留
    'moonshot/kimi-k2.5': { inputPerM: 4, outputPerM: 21, cacheReadPerM: 0.7, currency: 'CNY', source: 'bundled' },
    'moonshot/moonshot-v1-8k': { inputPerM: 2, outputPerM: 10, currency: 'CNY', source: 'bundled' },
    'moonshot/moonshot-v1-32k': { inputPerM: 5, outputPerM: 20, currency: 'CNY', source: 'bundled' },
    'moonshot/moonshot-v1-128k': { inputPerM: 10, outputPerM: 30, currency: 'CNY', source: 'bundled' },

    // ============ openai（USD）============
    // 标准定价（官方，2026-08）
    'openai/gpt-5.5': { inputPerM: 5, outputPerM: 30, cacheReadPerM: 0.5, currency: 'USD', source: 'bundled' },
    'openai/gpt-5.5-pro': { inputPerM: 30, outputPerM: 180, currency: 'USD', source: 'bundled' },
    'openai/gpt-5.4': { inputPerM: 2.5, outputPerM: 15, cacheReadPerM: 0.25, currency: 'USD', source: 'bundled' },
    'openai/gpt-5.4-mini': { inputPerM: 0.75, outputPerM: 4.5, cacheReadPerM: 0.075, currency: 'USD', source: 'bundled' },
    'openai/gpt-5.4-nano': { inputPerM: 0.2, outputPerM: 1.25, cacheReadPerM: 0.02, currency: 'USD', source: 'bundled' },
    'openai/gpt-5.4-pro': { inputPerM: 30, outputPerM: 180, currency: 'USD', source: 'bundled' },
    'openai/gpt-5.3-codex': { inputPerM: 1.75, outputPerM: 14, currency: 'USD', source: 'bundled' },
    'openai/chat-latest': { inputPerM: 5, outputPerM: 30, cacheReadPerM: 0.5, currency: 'USD', source: 'bundled' },
    // 5.6 三档（LiteLLM/wavespeed 2026-07 快照，含缓存写）
    'openai/gpt-5.6-sol': { inputPerM: 5, outputPerM: 30, cacheReadPerM: 0.5, cacheWritePerM: 6.25, currency: 'USD', source: 'bundled' },
    'openai/gpt-5.6-terra': { inputPerM: 2, outputPerM: 12, cacheReadPerM: 0.2, cacheWritePerM: 2.5, currency: 'USD', source: 'bundled' },
    'openai/gpt-5.6-luna': { inputPerM: 0.2, outputPerM: 1.2, cacheReadPerM: 0.02, cacheWritePerM: 0.25, currency: 'USD', source: 'bundled' },
    // 5.6 专项变体（Daybreak 网络安全，daybreak-red-latest）
    'openai/gpt-5.6-cyber': { inputPerM: 12.5, outputPerM: 75, cacheReadPerM: 1.25, cacheWritePerM: 15.625, currency: 'USD', source: 'bundled' },
    // 历史/过渡行（⚰️ 部分已退役，价格行保留供核对）
    'openai/gpt-5': { inputPerM: 1.25, outputPerM: 10, cacheReadPerM: 0.125, currency: 'USD', source: 'bundled' },
    'openai/gpt-5.1': { inputPerM: 1.25, outputPerM: 10, cacheReadPerM: 0.125, currency: 'USD', source: 'bundled' },
    'openai/gpt-5.2': { inputPerM: 1.75, outputPerM: 14, cacheReadPerM: 0.175, currency: 'USD', source: 'bundled' },
    'openai/gpt-4o': { inputPerM: 2.5, outputPerM: 10, cacheReadPerM: 1.25, currency: 'USD', source: 'bundled' },
    'openai/gpt-4o-mini': { inputPerM: 0.15, outputPerM: 0.6, cacheReadPerM: 0.075, currency: 'USD', source: 'bundled' },
    'openai/gpt-4.1': { inputPerM: 2, outputPerM: 8, cacheReadPerM: 0.5, currency: 'USD', source: 'bundled' },
    'openai/gpt-4.1-mini': { inputPerM: 0.4, outputPerM: 1.6, cacheReadPerM: 0.1, currency: 'USD', source: 'bundled' },
    'openai/gpt-4.1-nano': { inputPerM: 0.1, outputPerM: 0.4, cacheReadPerM: 0.025, currency: 'USD', source: 'bundled' },
    'openai/o3': { inputPerM: 2, outputPerM: 8, cacheReadPerM: 0.5, currency: 'USD', source: 'bundled' },
    'openai/o3-mini': { inputPerM: 1.1, outputPerM: 4.4, cacheReadPerM: 0.55, currency: 'USD', source: 'bundled' },
    'openai/o4-mini': { inputPerM: 1.1, outputPerM: 4.4, cacheReadPerM: 0.275, currency: 'USD', source: 'bundled' },

    // ============ qwen（CNY）============
    'qwen/qwen3.8-max': { inputPerM: 12, outputPerM: 36, cacheReadPerM: 1.2, cacheWritePerM: 15, currency: 'CNY', source: 'bundled' },
    // 国际部署（新加坡等区域，同一模型 ID 的区域价）
    'qwen/qwen3.8-max-intl': { inputPerM: 14.988, outputPerM: 44.965, cacheReadPerM: 1.4988, cacheWritePerM: 18.735, currency: 'CNY', source: 'bundled' },
    'qwen/qwen3.7-max': { inputPerM: 12, outputPerM: 36, cacheReadPerM: 1.2, cacheWritePerM: 15, currency: 'CNY', source: 'bundled' },
    'qwen/qwen3-max': { inputPerM: 2.5, outputPerM: 10, cacheReadPerM: 0.25, cacheWritePerM: 3.125, currency: 'CNY', source: 'bundled' },
    'qwen/qwen-max': { inputPerM: 2.4, outputPerM: 9.6, cacheReadPerM: 0.24, cacheWritePerM: 3, currency: 'CNY', source: 'bundled' },
    'qwen/qwen-plus': { inputPerM: 0.8, outputPerM: 2, cacheReadPerM: 0.08, cacheWritePerM: 1, currency: 'CNY', source: 'bundled' },
    'qwen/qwen-flash': { inputPerM: 0.15, outputPerM: 1.5, cacheReadPerM: 0.015, cacheWritePerM: 0.1875, currency: 'CNY', source: 'bundled' },
    'qwen/qwen-turbo': { inputPerM: 0.3, outputPerM: 0.6, cacheReadPerM: 0.03, cacheWritePerM: 0.375, currency: 'CNY', source: 'bundled' },
    // 思考模式：思维链+回答均按输出价 ¥3.00/1M
    'qwen/qwen-turbo-thinking': { inputPerM: 0.3, outputPerM: 3, cacheReadPerM: 0.03, cacheWritePerM: 0.375, currency: 'CNY', source: 'bundled' },
    'qwen/qwen3-coder-plus': { inputPerM: 4, outputPerM: 16, cacheReadPerM: 0.4, cacheWritePerM: 5, currency: 'CNY', source: 'bundled' },
    'qwen/qwen3-coder-flash': { inputPerM: 1, outputPerM: 4, cacheReadPerM: 0.1, cacheWritePerM: 1.25, currency: 'CNY', source: 'bundled' },

    // ============ skywork（CNY）============
    'skywork/skyclaw-v1.0': { inputPerM: 0.5, outputPerM: 4, currency: 'CNY', source: 'bundled' },
    'skywork/skyclaw-v1.0-lite': { inputPerM: 0.3, outputPerM: 2, currency: 'CNY', source: 'bundled' },

    // ============ stepfun（CNY）============
    'stepfun/step-3.7-flash': { inputPerM: 1.35, outputPerM: 8.1, cacheReadPerM: 0.27, currency: 'CNY', source: 'bundled' },
    'stepfun/step-3.5-flash': { inputPerM: 0.7, outputPerM: 2.1, cacheReadPerM: 0.14, currency: 'CNY', source: 'bundled' },
    'stepfun/step-3.5-flash-2603': { inputPerM: 0.7, outputPerM: 2.1, cacheReadPerM: 0.14, currency: 'CNY', source: 'bundled' },
    'stepfun/step-1o-turbo-vision': { inputPerM: 2.5, outputPerM: 8, cacheReadPerM: 0.5, currency: 'CNY', source: 'bundled' },

    // ============ xai（USD）============
    'xai/grok-4.6': { inputPerM: 2, outputPerM: 6, currency: 'USD', source: 'bundled' },
    'xai/grok-4.5': { inputPerM: 2, outputPerM: 6, currency: 'USD', source: 'bundled' },

    // ============ xiaomi（CNY）============
    'xiaomi/mimo-v2.5-pro': { inputPerM: 3, outputPerM: 6, cacheReadPerM: 0.025, currency: 'CNY', source: 'bundled' },
    'xiaomi/mimo-v2.5': { inputPerM: 1, outputPerM: 2, cacheReadPerM: 0.02, currency: 'CNY', source: 'bundled' },
    'xiaomi/mimo-v2-omni': { inputPerM: 2.8, outputPerM: 14, cacheReadPerM: 0.56, currency: 'CNY', source: 'bundled' },
    'xiaomi/mimo-v2-flash': { inputPerM: 0.7, outputPerM: 2.1, cacheReadPerM: 0.07, currency: 'CNY', source: 'bundled' },

    // ============ zhipu（CNY）============
    'zhipu/glm-5.2': { inputPerM: 8, outputPerM: 28, cacheReadPerM: 2, currency: 'CNY', source: 'bundled' },
    'zhipu/glm-5.1': { inputPerM: 6, outputPerM: 24, cacheReadPerM: 1.3, currency: 'CNY', source: 'bundled' },
    'zhipu/glm-5': { inputPerM: 4, outputPerM: 18, cacheReadPerM: 1, currency: 'CNY', source: 'bundled' },
    'zhipu/glm-4.7': { inputPerM: 2, outputPerM: 8, cacheReadPerM: 0.4, currency: 'CNY', source: 'bundled' },
    'zhipu/glm-4.5-air': { inputPerM: 0.8, outputPerM: 2, cacheReadPerM: 0.16, currency: 'CNY', source: 'bundled' },
    'zhipu/glm-4.6v': { inputPerM: 1, outputPerM: 3, currency: 'CNY', source: 'bundled' },
    'zhipu/glm-4.6v-flash': { inputPerM: 0, outputPerM: 0, currency: 'CNY', source: 'bundled' },
    'zhipu/glm-4.7-flash': { inputPerM: 0, outputPerM: 0, currency: 'CNY', source: 'bundled' },
    'zhipu/glm-4.5-flash': { inputPerM: 0, outputPerM: 0, currency: 'CNY', source: 'bundled' },
};
