/**
 * 模型名相关度打分（纯函数，无 Node 依赖——客户端 bundle 也会 import 本文件）。
 *
 * 场景：用户想给「当前正在用的模型」找一份其它插件里的等价定价，但两边命名规范
 * 往往不同（`deepV4.1flash` vs `deepv4-flash` vs `DeepSeek-V4.1-Flash`）。
 * 所以不能要求名字完全相同，只能按相似度排序，把最像的排前面。
 *
 * 打分由三部分加权，都是 0..1，最后合成 0..1：
 *   · 前缀比 0.45 —— 模型族几乎都是前缀相同的（`deepv4` 是 `deepv41flash` 的前缀）；
 *   · 二元组 Dice 0.35 —— 抓「同族不同版本」的中段差异；
 *   · 词元 Jaccard 0.20 —— 抓分词后重合（`deepseek-v4-flash` → deepseek / v4 / flash）。
 * 归一化：小写、去分隔符、去掉常见的厂商/包装词（optional 前缀如 `deepseek-`、`-exp`）。
 */
/**
 * 两个模型名的相关度，0..1。完全相同（归一化后）给 1。
 * `relevanceScore('deepV4.1flash', 'deepv4-pro')` → 高；与 `gpt-6-astra` → 接近 0。
 */
export declare function relevanceScore(target: string, candidate: string): number;
/** 按与 `target` 的相关度从高到低排序；同分按名字稳定排序。 */
export declare function rankByRelevance<T>(target: string, items: T[], nameOf: (item: T) => string): Array<{
    item: T;
    score: number;
}>;
