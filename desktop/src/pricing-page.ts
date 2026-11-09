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

export const DEEPSEEK_PRICING_PAGE_URL = 'https://api-docs.deepseek.com/zh-cn/quick_start/pricing';

export interface ModelPeakPrices {
  /** per-million-tokens CNY. Base (top-level) values are the 空闲时段 prices. */
  inputPerM: number;
  outputPerM: number;
  cacheReadPerM: number;
  peak: { inputPerM: number; outputPerM: number; cacheReadPerM: number };
  offPeak: { inputPerM: number; outputPerM: number; cacheReadPerM: number };
}

export interface ParsedPricingPage {
  pageModels: string[];
  prices: Record<string, ModelPeakPrices>;
  /** Peak window from footnote (3), or null when the sentence is missing/changed. */
  peak: { days: number[]; windows: Array<{ start: number; end: number }>; raw: string } | null;
  warnings: string[];
}

// ── HTML helpers ─────────────────────────────────────────────────────────────

const ENTITY_MAP: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ',
};

/** Strip tags, decode common entities, normalize whitespace. */
function cellText(raw: string): string {
  const noTags = raw.replace(/<[^>]*>/g, ' ');
  const decoded = noTags.replace(/&[a-zA-Z#0-9]+;/g, (m) => ENTITY_MAP[m] ?? ' ');
  return decoded.replace(/\s+/g, ' ').trim();
}

/** Expand the table into a grid (rows of cell texts). rowspan cells are carried
 *  down into every row they cover, so each grid row is a flat, position-stable
 *  list: [blockLabel, bucketLabel, periodLabel, ...modelCells]. */
function toGrid(tableHtml: string): string[][] {
  const rows = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  const carry: Record<number, { text: string; left: number }> = {};
  const grid: string[][] = [];
  for (const rowHtml of rows) {
    const tds = rowHtml.match(/<td[^>]*>[\s\S]*?<\/td>/gi) ?? [];
    const out: string[] = [];
    let ci = 0;
    for (;;) {
      const idx = out.length;
      const c = carry[idx];
      if (c !== undefined && c.left > 0) {
        out.push(c.text);
        c.left -= 1;
        if (c.left === 0) delete carry[idx];
      } else if (ci < tds.length) {
        const td = tds[ci];
        const text = cellText(td.replace(/^<td[^>]*>/i, '').replace(/<\/td>$/i, ''));
        const mCol = td.match(/colspan="(\d+)"/i);
        const mRow = td.match(/rowspan="(\d+)"/i);
        const spanC = mCol ? Math.max(1, parseInt(mCol[1], 10) || 1) : 1;
        const spanR = mRow ? Math.max(1, parseInt(mRow[1], 10) || 1) : 1;
        for (let k = 0; k < spanC; k++) {
          out.push(text);
          if (spanR > 1) carry[idx + k] = { text, left: spanR - 1 };
        }
        ci += 1;
      } else {
        break;
      }
      if (out.length > 256) break; // runaway guard
    }
    grid.push(out);
  }
  return grid;
}

// ── table semantics ──────────────────────────────────────────────────────────

function isPriceCell(text: string): boolean {
  return /元/.test(text);
}

function priceOf(text: string): number | null {
  const m = text.match(/([\d.]+)\s*元/);
  if (m === null) return null;
  const v = Number(m[1]);
  return Number.isFinite(v) && v > 0 ? v : null;
}

function classifyBucket(text: string): 'input' | 'cacheRead' | 'output' | null {
  if (!/tokens/i.test(text)) return null;
  if (/缓存命中/.test(text) && !/未命中/.test(text)) return 'cacheRead';
  if (/未命中/.test(text)) return 'input';
  if (/输出/.test(text)) return 'output';
  if (/输入/.test(text)) return 'input';
  return null;
}

function classifyPeriod(text: string): 'offPeak' | 'peak' | null {
  if (/空闲/.test(text)) return 'offPeak';
  if (/高峰/.test(text)) return 'peak';
  return null;
}

function stripSup(text: string): string {
  return text.replace(/\s*\(\d+\)\s*/g, '').replace(/\s+/g, ' ').trim();
}

export function parsePricingTable(tableHtml: string): {
  pageModels: string[];
  prices: Record<string, ModelPeakPrices>;
  warnings: string[];
} {
  const warnings: string[] = [];
  const grid = toGrid(tableHtml);
  if (grid.length < 2) {
    return { pageModels: [], prices: {}, warnings: ['no <tr> rows found — table structure unrecognized'] };
  }

  // Header row: [3 label columns, N model columns].
  const header = grid[0];
  const nModels = header.length - 3;
  if (nModels <= 0 || nModels > 32) {
    return { pageModels: [], prices: {}, warnings: [`unexpected header shape (${header.length} cols) — structure changed?`] };
  }
  const pageModels = header.slice(3).map(stripSup);
  const named = pageModels.filter((s) => s !== '');
  if (named.length !== nModels) warnings.push(`${nModels - named.length} empty model header cell(s)`);

  // Price block: first row whose first 3 columns mention 价格.
  const priceRowIdx = grid.findIndex((r) => r.slice(0, 3).some((c) => /价格/.test(c)));
  if (priceRowIdx < 0) {
    return { pageModels: named, prices: {}, warnings: ['价格 row not found in table'] };
  }

  const prices: Record<string, ModelPeakPrices> = {};
  let bucket: 'input' | 'cacheRead' | 'output' | null = null;

  for (let i = priceRowIdx; i < grid.length; i++) {
    const row = grid[i];
    const priceCells = row.filter((c) => isPriceCell(c));
    if (priceCells.length === 0) break; // left the price block (or label-only row)

    // Bucket: any cell in this row (including rowspan-carried ones) classifies it.
    const b = row.map(classifyBucket).find((x) => x !== null) ?? null;
    if (b !== null) bucket = b;
    if (bucket === null) {
      warnings.push(`price row ${i + 1}: no bucket label — skipped`);
      continue;
    }
    // Period: last non-price cell of the row.
    const nonPrice = row.filter((c) => !isPriceCell(c));
    const period = classifyPeriod(nonPrice[nonPrice.length - 1] ?? '');
    if (period === null) {
      warnings.push(`price row ${i + 1}: no period label — skipped`);
      continue;
    }
    if (priceCells.length !== nModels) {
      warnings.push(`price row ${i + 1} (${bucket}/${period}): ${priceCells.length} prices for ${nModels} models — skipped`);
      continue;
    }
    for (let c = 0; c < nModels; c++) {
      const name = pageModels[c];
      if (name === '') continue;
      const v = priceOf(priceCells[c]);
      if (v === null) {
        warnings.push(`price row ${i + 1}: unparseable value "${priceCells[c]}" for ${name}`);
        continue;
      }
      const rec = (prices[name] ??= {
        inputPerM: 0, outputPerM: 0, cacheReadPerM: 0,
        peak: { inputPerM: 0, outputPerM: 0, cacheReadPerM: 0 },
        offPeak: { inputPerM: 0, outputPerM: 0, cacheReadPerM: 0 },
      });
      const key = bucket === 'input' ? 'inputPerM' : bucket === 'cacheRead' ? 'cacheReadPerM' : 'outputPerM';
      (rec[period] as Record<string, number>)[key] = v;
      if (period === 'offPeak') (rec as unknown as Record<string, number>)[key] = v; // base = off-peak
    }
  }

  // Validate completeness: every model needs all 6 values or it is dropped.
  for (const name of named) {
    const rec = prices[name];
    if (rec === undefined) { warnings.push(`${name}: no price rows at all`); continue; }
    const missing: string[] = [];
    for (const period of ['peak', 'offPeak'] as const) {
      for (const key of ['inputPerM', 'outputPerM', 'cacheReadPerM'] as const) {
        if (!(rec[period][key] > 0)) missing.push(`${period}.${key}`);
      }
    }
    if (missing.length > 0) {
      warnings.push(`${name}: incomplete (${missing.join(', ')}) — dropped`);
      delete prices[name];
    }
  }

  return { pageModels: named, prices, warnings };
}

// ── peak window (footnote 3) ─────────────────────────────────────────────────

const CN_DAYS: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0 };

/** Parse "高峰时段为北京时间周一至周五 9:00 - 12:00、14:00 - 18:00（其余为空闲时段）".
 *  Returns null (caller keeps the existing local window) when the sentence or its
 *  day/window parts cannot be read — never guesses. */
export function extractPeakWindows(pageHtml: string): { days: number[]; windows: Array<{ start: number; end: number }>; raw: string } | null {
  const text = cellText(pageHtml);
  const m = text.match(/高峰时段为北京时间([^。]{0,120})/);
  if (m === null) return null;
  const seg = m[1];
  const raw = `高峰时段为北京时间${seg}`;

  // Days: 周X or 周X至周Y (repeatable, 、-separated).
  const days = new Set<number>();
  for (const dm of seg.matchAll(/周([一二三四五六日天])(?:至周([一二三四五六日天]))?/g)) {
    const a = CN_DAYS[dm[1]];
    if (a === undefined) continue;
    if (dm[2] !== undefined) {
      const b = CN_DAYS[dm[2]];
      if (b === undefined) continue;
      for (let d = a; d <= b; d++) days.add(d);
    } else {
      days.add(a);
    }
  }
  if (days.size === 0) return null;

  // Windows: "9:00 - 12:00" pairs, any dash variant.
  const windows: Array<{ start: number; end: number }> = [];
  for (const wm of seg.matchAll(/(\d{1,2}):(\d{2})\s*[-–—~～]\s*(\d{1,2}):(\d{2})/g)) {
    const start = parseInt(wm[1], 10) * 60 + parseInt(wm[2], 10);
    const end = parseInt(wm[3], 10) * 60 + parseInt(wm[4], 10);
    if (start >= 0 && start < 1440 && end > start && end <= 1440) windows.push({ start, end });
  }
  if (windows.length === 0) return null;

  return { days: [...days].sort((a, b) => a - b), windows, raw };
}

// ── fetch ────────────────────────────────────────────────────────────────────

export async function fetchPricingPage(url = DEEPSEEK_PRICING_PAGE_URL, timeoutMs = 25000): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': 'dsh-usage-meter/1.0 (pricing sync)' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/** 同步解析核心（模式1）：价格表 + 脚注(3)高峰时段。对预取的 HTML 工作，供端点与 LLM 兜底共用。 */
export function parsePricingPageHtml(html: string): ParsedPricingPage {
  const tableMatch = html.match(/<table[^>]*>[\s\S]*?<\/table>/i);
  if (tableMatch === null) {
    return { pageModels: [], prices: {}, peak: null, warnings: ['no <table> in page — layout changed?'] };
  }
  const parsed = parsePricingTable(tableMatch[0]);
  const peak = extractPeakWindows(html);
  if (peak === null) parsed.warnings.push('footnote (3) peak-window sentence not found — keep existing local window');
  return { ...parsed, peak };
}

/** Full pipeline: fetch page → parse table + peak window. */
export async function fetchParsedPricingPage(url?: string): Promise<ParsedPricingPage & { fetchedAt: number }> {
  const html = await fetchPricingPage(url);
  return { ...parsePricingPageHtml(html), fetchedAt: Date.now() };
}

// ── Mode 2: LLM fallback extraction ──────────────────────────────────────────
// 模式1（规则解析）一个模型都拿不到时，把原始 HTML 交给用户全局 Key 对应的
// DeepSeek LLM 提取结构化价目表。任何失败（网络/非200/非JSON/字段缺失）都返回
// null —— 调用方据此降级提示手动填写，绝不编造数字。

interface LLMPriceRow { name?: unknown; currency?: unknown; unit?: unknown; offPeak?: unknown; peak?: unknown; }
interface LLMPriceDoc { models?: unknown; peakHours?: unknown; }

function buildLLMPricingPrompt(url: string, html: string): string {
  return [
    `下面是 DeepSeek 官方定价页（URL: ${url}）的原始 HTML。请提取该页面中所有当前在售模型的定价信息。`,
    '',
    '只输出一个 JSON 对象，不要输出任何其他文字、解释或 markdown 代码块围栏。JSON 结构固定为：',
    '',
    '{',
    '  "models": [',
    '    {',
    '      "name": "页面显示的模型名（原样，如 deepseek-v4-pro）",',
    '      "currency": "页面显示的币种（如 CNY）",',
    '      "unit": "页面显示的计价单位（如 元/百万tokens）",',
    '      "offPeak": { "inputPerM": number, "outputPerM": number, "cacheReadPerM": number },',
    '      "peak": { "inputPerM": number, "outputPerM": number, "cacheReadPerM": number }',
    '    }',
    '  ],',
    '  "peakHours": {',
    '    "days": [1, 2, 3, 4, 5],',
    '    "windows": [ { "start": "09:00", "end": "12:00" } ],',
    '    "raw": "页面上高峰时段说明的原句"',
    '  }',
    '}',
    '',
    '字段规则：',
    '1. 所有数值必须是纯数字（不带单位、货币符号或千分位），页面读不出来的填 null。',
    '2. offPeak 是空闲时段（基础）单价；peak 是高峰时段单价；页面没有峰谷之分时 peak 填 null。',
    '3. cacheReadPerM 是缓存命中读取单价；页面没有缓存价时填 0。',
    '4. days 为高峰时段适用的星期，周一=1 … 周日=7；页面未说明时填 [1,2,3,4,5]。',
    '5. windows 的高峰时间用 24 小时制 "HH:MM"。',
    '6. 页面没有高峰时段时，peak 与 peakHours 都填 null。',
    '7. 只提取页面真实存在的模型与数字，禁止编造或推测；页面没有任何价格表时返回 {"models": [], "peakHours": null}。',
    '8. 只回复 JSON，不要回复其他任何内容。',
    '',
    '原始 HTML：',
    html,
  ].join('\n');
}

function llmMinutes(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1439) return Math.round(v);
  if (typeof v === 'string') {
    const m = v.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (m !== null) {
      const h = Number(m[1]);
      const mm = Number(m[2]);
      if (h <= 23 && mm <= 59) return h * 60 + mm;
    }
  }
  return null;
}

function llmNum(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
}

/** 解析并校验 LLM 回复 → ParsedPricingPage；结构不符/缺关键数字一律返回 null（或跳过该模型）。 */
export function parseLLMPricingReply(content: string): ParsedPricingPage | null {
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  let doc: unknown;
  try { doc = JSON.parse(content.slice(start, end + 1)); } catch { return null; }
  const obj = doc as LLMPriceDoc;
  if (Array.isArray(obj.models) === false) return null;
  const warnings: string[] = [];
  const prices: Record<string, ModelPeakPrices> = {};
  const pageModels: string[] = [];
  for (const raw of obj.models as LLMPriceRow[]) {
    const name = typeof raw.name === 'string' ? raw.name.trim() : '';
    if (name === '') continue;
    const off = (raw.offPeak ?? {}) as Record<string, unknown>;
    const pk = raw.peak === null || raw.peak === undefined ? null : (raw.peak as Record<string, unknown>);
    const offIn = llmNum(off.inputPerM);
    const offOut = llmNum(off.outputPerM);
    const pkIn = pk === null ? null : llmNum(pk.inputPerM);
    const pkOut = pk === null ? null : llmNum(pk.outputPerM);
    if (offIn === null || offOut === null) {
      warnings.push(`llm: model ${name} — missing parseable off-peak price, skipped`);
      continue;
    }
    const offCache = llmNum(off.cacheReadPerM) ?? 0;
    const hasPeak = pkIn !== null && pkOut !== null;
    if (hasPeak === false) warnings.push(`llm: model ${name} — no parseable peak price, kept flat price`);
    prices[name] = {
      inputPerM: offIn,
      outputPerM: offOut,
      cacheReadPerM: offCache,
      peak: hasPeak
        ? { inputPerM: pkIn as number, outputPerM: pkOut as number, cacheReadPerM: llmNum((pk as Record<string, unknown>).cacheReadPerM) ?? 0 }
        : { inputPerM: offIn, outputPerM: offOut, cacheReadPerM: offCache },
      offPeak: { inputPerM: offIn, outputPerM: offOut, cacheReadPerM: offCache },
    };
    pageModels.push(name);
  }
  let peak: ParsedPricingPage['peak'] = null;
  const ph = obj.peakHours === null || obj.peakHours === undefined ? null : (obj.peakHours as Record<string, unknown>);
  if (ph !== null) {
    const rawDays = Array.isArray(ph.days) ? ph.days : [];
    const days = (rawDays as unknown[]).filter((d): d is number => typeof d === 'number' && d >= 1 && d <= 7);
    const windows: Array<{ start: number; end: number }> = [];
    if (Array.isArray(ph.windows)) {
      for (const w of ph.windows as Array<Record<string, unknown>>) {
        const s = llmMinutes(w.start);
        const e = llmMinutes(w.end);
        if (s !== null && e !== null && e > s) windows.push({ start: s, end: e });
      }
    }
    if (windows.length > 0) {
      peak = { days: days.length > 0 ? days : [1, 2, 3, 4, 5], windows, raw: typeof ph.raw === 'string' ? ph.raw : '' };
    } else {
      warnings.push('llm: peak hours not parseable — keep existing local window');
    }
  }
  if (pageModels.length === 0) return null;
  return { pageModels, prices, peak, warnings };
}

/**
 * 模式2：用用户全局 API Key 调 deepseek-chat 从原始 HTML 提取结构化价目表。
 * @returns 解析成功的价目表；任何失败返回 null（静默，由调用方降级）。
 */
export async function extractPricesViaLLM(apiKey: string, url: string, html: string, timeoutMs = 60000): Promise<ParsedPricingPage | null> {
  if (apiKey === '' || html === '') return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: 'deepseek-chat',
        temperature: 0,
        max_tokens: 4000,
        messages: [
          { role: 'system', content: '你是精确的数据提取器。只输出 JSON，不输出任何其他文字。' },
          { role: 'user', content: buildLLMPricingPrompt(url, html) },
        ],
      }),
    });
    if (!res.ok) return null;
    const doc = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = doc.choices?.[0]?.message?.content ?? '';
    return parseLLMPricingReply(content);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
