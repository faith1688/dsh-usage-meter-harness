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
/** 归一化：小写 + 只留字母数字。`DeepSeek-V4.1-Flash` → `deepseekv41flash`。 */
function squash(s) {
    return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}
/**
 * 常见厂商/包装词。同一个模型的两种写法常常只在这里不同：
 * `deepV4.1flash` 与 `deepseek-v4-flash` 的差别全在 `deep`/`deepseek` 前缀上。
 * 剥掉之后 `v41flash` vs `v4flash` 才能真正对上，否则前缀打分会被这些词吃掉。
 */
const VENDOR_WORDS = [
    'deepseek', 'deep', 'openai', 'anthropic', 'google', 'gemini', 'claude', 'gpt',
    'moonshot', 'kimi', 'minimax', 'qwen', 'alibaba', 'tencent', 'hunyuan', 'zhipu',
    'mistral', 'meta', 'llama', 'xai', 'grok', 'stepfun', 'step', 'nvidia', 'xiaomi',
];
/** 反复剥掉开头的厂商词：`deepseekv41flash` → `v41flash`；`deepseekdeepv4` → `v4`。 */
function stripVendor(s) {
    let cur = s;
    for (let guard = 0; guard < 4; guard++) {
        const hit = VENDOR_WORDS.find((w) => cur.startsWith(w) && cur.length > w.length);
        if (hit === undefined)
            break;
        cur = cur.slice(hit.length);
    }
    return cur;
}
/** 分词：按非字母数字、以及字母/数字交界切分。`deepv41flash` → [deep,v,41,flash]。 */
function tokenize(s) {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/([a-z])([0-9])/g, '$1 $2')
        .replace(/([0-9])([a-z])/g, '$1 $2')
        .split(/\s+/)
        .filter((x) => x !== '');
}
/** 公共前缀长度。 */
function commonPrefix(a, b) {
    const n = Math.min(a.length, b.length);
    let i = 0;
    while (i < n && a[i] === b[i])
        i++;
    return i;
}
/** 二元组集合的 Dice 系数（2|A∩B| / (|A|+|B|)）。 */
function dice(a, b) {
    if (a === b)
        return 1;
    if (a.length < 2 || b.length < 2)
        return a === b ? 1 : 0;
    const grams = new Map();
    for (let i = 0; i < a.length - 1; i++) {
        const g = a.slice(i, i + 2);
        grams.set(g, (grams.get(g) ?? 0) + 1);
    }
    let hit = 0;
    for (let i = 0; i < b.length - 1; i++) {
        const g = b.slice(i, i + 2);
        const c = grams.get(g) ?? 0;
        if (c > 0) {
            grams.set(g, c - 1);
            hit++;
        }
    }
    return (2 * hit) / (a.length - 1 + (b.length - 1));
}
/** 词元集合的 Jaccard 系数。 */
function jaccard(a, b) {
    if (a.length === 0 || b.length === 0)
        return 0;
    const sa = new Set(a);
    const sb = new Set(b);
    let inter = 0;
    for (const x of sa)
        if (sb.has(x))
            inter++;
    const union = sa.size + sb.size - inter;
    return union === 0 ? 0 : inter / union;
}
/**
 * 两个模型名的相关度，0..1。完全相同（归一化后）给 1。
 * `relevanceScore('deepV4.1flash', 'deepv4-pro')` → 高；与 `gpt-6-astra` → 接近 0。
 */
export function relevanceScore(target, candidate) {
    const rawA = squash(target);
    const rawB = squash(candidate);
    if (rawA === '' || rawB === '')
        return 0;
    if (rawA === rawB)
        return 1;
    // 剥掉厂商词后再比——`deepV4.1flash` 与 `deepseek-v4-flash` 只在这里才对得上。
    const a = stripVendor(rawA);
    const b = stripVendor(rawB);
    if (a === '' || b === '')
        return 0;
    if (a === b)
        return 1;
    const prefix = commonPrefix(a, b) / Math.max(a.length, b.length);
    const diceScore = dice(a, b);
    const tokScore = jaccard(tokenize(target).filter((x) => !VENDOR_WORDS.includes(x)), tokenize(candidate).filter((x) => !VENDOR_WORDS.includes(x)));
    // 短名互相包含时给补偿：`v4` 与 `v41flash` 的 Dice 天然偏低，但族关系明确。
    const contains = a.includes(b) || b.includes(a) ? Math.min(a.length, b.length) / Math.max(a.length, b.length) : 0;
    const base = prefix * 0.45 + diceScore * 0.35 + tokScore * 0.2;
    return Math.min(1, base * 0.75 + contains * 0.25 * 0.75 + (contains > 0 ? 0.15 : 0));
}
/** 按与 `target` 的相关度从高到低排序；同分按名字稳定排序。 */
export function rankByRelevance(target, items, nameOf) {
    return items
        .map((item) => ({ item, score: relevanceScore(target, nameOf(item)) }))
        .sort((x, y) => (y.score - x.score) || nameOf(x.item).localeCompare(nameOf(y.item)));
}
