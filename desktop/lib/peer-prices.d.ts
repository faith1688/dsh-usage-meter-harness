/** 一条可导入的定价（已归一到 usage-meter 口径）。 */
export type PeerPriceRow = {
    /** 来源插件 id，如 `dsh-cost-meter`。 */
    plugin: string;
    /** 来源插件的人类可读名。 */
    pluginLabel: string;
    /** 渠道 id（与 usage-meter 的 provider 同义）。`*` 表示该插件只有全局价、没绑定渠道。 */
    provider: string;
    /** 模型 id（官方调用名）。 */
    model: string;
    inputPerM: number;
    outputPerM: number;
    cacheReadPerM: number;
    /** 峰时价；无峰谷区分时为 null。 */
    peak: {
        inputPerM: number;
        outputPerM: number;
        cacheReadPerM: number;
    } | null;
    offPeak: {
        inputPerM: number;
        outputPerM: number;
        cacheReadPerM: number;
    } | null;
    currency: string;
    /** 来源细节，界面上作提示（如 `自定义` / `厂商价` / `价格表`）。 */
    origin: string;
    /** 峰时窗口，已换算成**北京时间的分钟数**（与 usage-meter 同口径）。null = 来源没给。 */
    peakWindows: Array<{
        start: number;
        end: number;
    }> | null;
    /** 峰谷生效星期（1=周一）。null = 来源没给，沿用本机现有值。 */
    peakDays: number[] | null;
    /** 来源文件 mtime（epoch ms），便于判断新旧。 */
    updatedAt: number;
};
type PriceTriple = {
    inputPerM: number;
    outputPerM: number;
    cacheReadPerM: number;
};
/** 币种判定回调：来源插件自己没存币种（或存错）时的外部依据。
 *  `triple` 是该行的三项单价，允许按「同价即同币」判定。 */
export type CurrencyHint = (provider: string, model: string, triple: PriceTriple) => string | null;
/** 内置价格表里同名 **或同价** → 用它的币种。
 *
 *  cost-meter 的 `prices.currency` 只是个**全局**标注，它的厂商价格表里
 *  openai / anthropic 那一批存的是**美元原值**（与官方 USD 报价逐位相同），
 *  却被这个全局标注统成 CNY。直接照抄会让 ¥ 与 $ 差 7 倍。
 *
 *  判据两条，按可靠度排序：
 *    ① 同名（`provider/model` 或裸模型名）→ 用内置表那条的币种，最准；
 *    ② 同价（输入/输出/缓存读三项全等）→ 用命中那条的币种；
 *  都对不上就不猜（返回 null，沿用来源自己的标注）。
 */
export declare function makeBundledHint(table: Record<string, {
    inputPerM: number;
    outputPerM: number;
    cacheReadPerM?: number;
    currency?: string;
}>): CurrencyHint;
/**
 * 扫描本机所有已支持的计费插件，返回去重后的定价行。
 * 同一 (plugin, provider, model) 只保留第一条——`custom` 在前，所以自定义价压过价格表。
 *
 * `hint` 用来纠正来源插件自己标错的币种（见 `makeBundledHint`）。
 */
export declare function scanPeerPrices(dshHome: string, hint?: CurrencyHint): {
    rows: PeerPriceRow[];
    scanned: string[];
};
export {};
