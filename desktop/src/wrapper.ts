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
export const DEFAULT_WRAPPER_ROWS: ReadonlyArray<WrapperRow> = [
  { pattern: 'modlens-', enabled: true },
  { pattern: '-modlens', enabled: true },
  { pattern: 'vision-toolkit-', enabled: true },
  { pattern: '(modlens vision)', enabled: true },
  { pattern: ' (vision)', enabled: true },
  { pattern: '-vision', enabled: true },
];

/** v2.0.11 及更早版本写入的默认值（换行分隔的纯文本，用于一次性迁移）。 */
export const LEGACY_DEFAULT_MARKERS = ' (modlens vision)\n (vision)\n-vision\nvision-toolkit-';

/** 把配置里的 `wrapperMarkers`（行数组 / 旧字符串 / 缺省）规范成行表。 */
export function wrapperRows(raw: unknown): WrapperRow[] {
  if (Array.isArray(raw)) {
    const rows: WrapperRow[] = [];
    for (const item of raw) {
      if (item === null || typeof item !== 'object') continue;
      const o = item as { pattern?: unknown; enabled?: unknown };
      const pattern = typeof o.pattern === 'string' ? o.pattern : '';
      rows.push({ pattern, enabled: o.enabled !== false });
    }
    return rows;
  }
  if (typeof raw === 'string') {
    // 旧格式：换行/逗号分隔，全部视为开启；同时补齐「包装提供商」相关的新默认行，
    // 否则老配置升级后 `modlens-` / `-modlens` 永远匹配不上（余额一直「未配置」）。
    // 空串 = 用户明确关闭全部识别，不做补齐。
    const rows: WrapperRow[] = raw
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter((s) => s !== '')
      .map((pattern) => ({ pattern, enabled: true }));
    if (rows.length === 0) return [];
    for (const d of DEFAULT_WRAPPER_ROWS) {
      if (!rows.some((r) => r.pattern === d.pattern)) rows.push({ ...d });
    }
    return rows;
  }
  return DEFAULT_WRAPPER_ROWS.map((r) => ({ ...r }));
}

/** 生效的标记串（仅开启且非空的行）。 */
export function activePatterns(raw: unknown): string[] {
  return wrapperRows(raw)
    .filter((r) => r.enabled && r.pattern.trim() !== '')
    .map((r) => r.pattern);
}

/** 剥离已知包装标记（前缀或后缀，大小写不敏感）；返回剥后名字。 */
export function stripWrappers(name: string, patterns: readonly string[]): string {
  let out = name.trim();
  for (const m of patterns) {
    if (m === '') continue;
    const lo = out.toLowerCase();
    const lm = m.toLowerCase();
    if (lo.startsWith(lm)) out = out.slice(m.length).trim();
    else if (lo.endsWith(lm)) out = out.slice(0, Math.max(0, out.length - m.length)).trim();
  }
  return out;
}

/** 反复剥离直到稳定（如 `vision-toolkit-modlens-x` 这类多重包装）。
 *  名字恰好等于某个标记时保留原名，绝不返回空串。 */
export function stripAllWrappers(name: string, patterns: readonly string[]): string {
  let out = name.trim();
  for (let i = 0; i < 4; i++) {
    const next = stripWrappers(out, patterns);
    if (next === '' || next === out) break;
    out = next;
  }
  return out;
}

/** 大小写 + 分隔符无关的规范键（DeepSeek V4 Flash ≡ deepseek-v4-flash ≡ DeepSeekV4Flash）。 */
export function canonicalId(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/** 提供商 id 归一：剥掉包装标记。 */
export function normalizeProviderId(provider: string | null, patterns: readonly string[]): string | null {
  if (provider === null) return null;
  const stripped = stripAllWrappers(provider, patterns);
  return stripped === '' ? provider : stripped;
}

/** 绑定键归一：`p:<provider>` / `m:<provider>/<model>` → 剥包装后的同型键。 */
export function normalizeBindingKey(key: string, patterns: readonly string[]): string {
  if (key.startsWith('p:')) {
    const base = normalizeProviderId(key.slice(2), patterns) ?? key.slice(2);
    return `p:${base}`;
  }
  if (key.startsWith('m:')) {
    const rest = key.slice(2);
    const slash = rest.indexOf('/');
    if (slash < 0) return key;
    const pv = normalizeProviderId(rest.slice(0, slash), patterns) ?? rest.slice(0, slash);
    const md = stripAllWrappers(rest.slice(slash + 1), patterns);
    return `m:${pv}/${md === '' ? rest.slice(slash + 1) : md}`;
  }
  return key;
}

/** 价目表键归一：`<provider>/<model>`（无前缀）→ 剥包装后的同型键。 */
export function normalizePriceKey(key: string, patterns: readonly string[]): string {
  const slash = key.indexOf('/');
  if (slash < 0) return key;
  const pv = normalizeProviderId(key.slice(0, slash), patterns) ?? key.slice(0, slash);
  const md = stripAllWrappers(key.slice(slash + 1), patterns);
  return `${pv}/${md === '' ? key.slice(slash + 1) : md}`;
}
