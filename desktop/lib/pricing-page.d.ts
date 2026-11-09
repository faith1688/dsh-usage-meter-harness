/**
 * DeepSeek official pricing-page parser (server-side).
 *
 * Parses the raw HTML table from https://api-docs.deepseek.com/zh-cn/quick_start/pricing
 * into per-model peak/off-peak prices, plus the peak-hours window from footnote (3).
 *
 * Robustness rules (the page structure is NOT under our control):
 *  - model column count N is detected from the header row (N = header cells - 3),
 *    never hardcoded; adding/removing models changes nothing in this parser.
 *  - price buckets and periods are identified by their TEXT (缓存命中/缓存未命中/输出,
 *    空闲时段/高峰时段), never by column position, so rowspans/reordering still parse.
 *  - anything that cannot be classified produces a warning and that row/model is
 *    dropped — this module never invents a number.
 */
export declare const DEEPSEEK_PRICING_PAGE_URL = "https://api-docs.deepseek.com/zh-cn/quick_start/pricing";
export interface ModelPeakPrices {
    /** per-million-tokens CNY. Base (top-level) values are the 空闲时段 prices. */
    inputPerM: number;
    outputPerM: number;
    cacheReadPerM: number;
    peak: {
        inputPerM: number;
        outputPerM: number;
        cacheReadPerM: number;
    };
    offPeak: {
        inputPerM: number;
        outputPerM: number;
        cacheReadPerM: number;
    };
}
export interface ParsedPricingPage {
    pageModels: string[];
    prices: Record<string, ModelPeakPrices>;
    /** Peak window from footnote (3), or null when the sentence is missing/changed. */
    peak: {
        days: number[];
        windows: Array<{
            start: number;
            end: number;
        }>;
        raw: string;
    } | null;
    warnings: string[];
}
export declare function parsePricingTable(tableHtml: string): {
    pageModels: string[];
    prices: Record<string, ModelPeakPrices>;
    warnings: string[];
};
/** Parse "高峰时段为北京时间周一至周五 9:00 - 12:00、14:00 - 18:00（其余为空闲时段）".
 *  Returns null (caller keeps the existing local window) when the sentence or its
 *  day/window parts cannot be read — never guesses. */
export declare function extractPeakWindows(pageHtml: string): {
    days: number[];
    windows: Array<{
        start: number;
        end: number;
    }>;
    raw: string;
} | null;
export declare function fetchPricingPage(url?: string, timeoutMs?: number): Promise<string>;
/** 同步解析核心（模式1）：价格表 + 脚注(3)高峰时段。对预取的 HTML 工作，供端点与 LLM 兜底共用。 */
export declare function parsePricingPageHtml(html: string): ParsedPricingPage;
/** Full pipeline: fetch page → parse table + peak window. */
export declare function fetchParsedPricingPage(url?: string): Promise<ParsedPricingPage & {
    fetchedAt: number;
}>;
/** 解析并校验 LLM 回复 → ParsedPricingPage；结构不符/缺关键数字一律返回 null（或跳过该模型）。 */
export declare function parseLLMPricingReply(content: string): ParsedPricingPage | null;
/**
 * 模式2：用用户全局 API Key 调 deepseek-chat 从原始 HTML 提取结构化价目表。
 * @returns 解析成功的价目表；任何失败返回 null（静默，由调用方降级）。
 */
export declare function extractPricesViaLLM(apiKey: string, url: string, html: string, timeoutMs?: number): Promise<ParsedPricingPage | null>;
