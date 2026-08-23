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
    peak?: {
        inputPerM: number;
        outputPerM: number;
        cacheReadPerM?: number;
    } | null;
    offPeak?: {
        inputPerM: number;
        outputPerM: number;
        cacheReadPerM?: number;
    } | null;
    peakOffPeakFrom?: number;
    /** Beijing weekdays (0=Sun..6=Sat) with peak/off-peak split; days not listed are flat. */
    peakDays?: number[];
    /** Peak-hour windows in Beijing hours [0,24). */
    peakWindows?: Array<{
        start: number;
        end: number;
    }>;
    /** Flat rate for days not in peakDays (weekend); falls back to offPeak. */
    weekend?: {
        inputPerM: number;
        outputPerM: number;
        cacheReadPerM?: number;
    } | null;
    currency?: string;
    source?: 'bundled' | 'remote' | 'user';
}
/**
 * DeepSeek V4 峰/谷计价生效时间：2026-08-17 00:00 北京时间
 * (= 2026-08-16T16:00Z)。峰时（北京时间）09:00–12:00、14:00–18:00
 * = UTC 01:00–04:00 与 06:00–10:00。
 */
export declare const DEEPSEEK_PEAK_OFF_PEAK_FROM: number;
export declare const BUNDLED_TABLE: Record<string, PricingRow>;
