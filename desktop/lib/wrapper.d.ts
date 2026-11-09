/**
 * 视觉包装（vision wrapper）识别。
 *
 * DSH 的视觉插件（modlens 等）会为每个上游提供商**再注册一个包装提供商**：
 *   - 提供商 id：前缀 `modlens-`（如 `modlens-deepseek-zgktz`）
 *                 或后缀 `-modlens`（如 `deepseek-modlens`）
 *                 或 `vision-toolkit-` 前缀（如 `vision-toolkit-deepseek-official`）
 *   - 显示名：底层名 + ` (modlens vision)`（`DeepSeek-V4-Flash (modlens vision)`）
 *   - 模型 id：**不变**（仍是 `deepseek-v4-flash`）
 *
 * 因为包装发生在 **提供商 id** 上（不是模型名），只剥模型名后缀无法把包装路由
 * 映射回底层模型 → 定价/余额/独立 Key/看板统计全部落空（表现为「余额未配置」）。
 * 所以这里把「包装标记」做成一张**逐行可开关**的表，同时对 provider 与 model
 * 两侧做前缀/后缀剥离。
 *
 * 本模块不依赖任何宿主 API，可被 `scripts/test-wrapper.mjs` 直接单测。
 */
export interface WrapperRow {
    /** 前缀或后缀标记，例如 `modlens-`、`-modlens`、` (vision)`。 */
    pattern: string;
    /** 关闭 = 该行不参与匹配（用户可单独停用某个标记）。 */
    enabled: boolean;
}
/** 内置默认标记（全部开启）。老用户的正文字符串设置会在读取时自动补齐这些行。 */
export declare const DEFAULT_WRAPPER_ROWS: ReadonlyArray<WrapperRow>;
/** v2.0.11 及更早版本写入的默认值（换行分隔的纯文本，用于一次性迁移）。 */
export declare const LEGACY_DEFAULT_MARKERS = " (modlens vision)\n (vision)\n-vision\nvision-toolkit-";
/** 把配置里的 `wrapperMarkers`（行数组 / 旧字符串 / 缺省）规范成行表。 */
export declare function wrapperRows(raw: unknown): WrapperRow[];
/** 生效的标记串（仅开启且非空的行）。 */
export declare function activePatterns(raw: unknown): string[];
/** 剥离已知包装标记（前缀或后缀，大小写不敏感）；返回剥后名字。 */
export declare function stripWrappers(name: string, patterns: readonly string[]): string;
/** 反复剥离直到稳定（如 `vision-toolkit-modlens-x` 这类多重包装）。
 *  名字恰好等于某个标记时保留原名，绝不返回空串。 */
export declare function stripAllWrappers(name: string, patterns: readonly string[]): string;
/** 大小写 + 分隔符无关的规范键（DeepSeek V4 Flash ≡ deepseek-v4-flash ≡ DeepSeekV4Flash）。 */
export declare function canonicalId(s: string): string;
/** 提供商 id 归一：剥掉包装标记。 */
export declare function normalizeProviderId(provider: string | null, patterns: readonly string[]): string | null;
/** 绑定键归一：`p:<provider>` / `m:<provider>/<model>` → 剥包装后的同型键。 */
export declare function normalizeBindingKey(key: string, patterns: readonly string[]): string;
/** 价目表键归一：`<provider>/<model>`（无前缀）→ 剥包装后的同型键。 */
export declare function normalizePriceKey(key: string, patterns: readonly string[]): string;
