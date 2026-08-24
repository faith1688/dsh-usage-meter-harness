/**
 * dsh-usage-meter-harness — backend plugin.
 *
 * Provides:
 *   - the `usageCost` session projection: per-session requests/tokens/model/
 *     pricing/cost, per-turn ledger, live account balance and budget,
 *     event-folded and replay-aware, served to the browser with zero client math,
 *   - a `usage-meter` settings namespace (currency, budget, price source, API key),
 *   - a small HTTP channel (`/api/usage-meter/*`) so the client popup can edit
 *     per-provider currency / balance / recharges and per-model price overrides,
 *   - a persisted popup config (`$DSH_HOME/usage-meter.json`) that survives
 *     restarts (per-provider ledger, price overrides, balances).
 *
 * rc.7 compatibility (IMPORTANT): the harness read path refuses to interpret a
 * session log containing an unknown event type that is not marked `ignorable`,
 * and `Session.append()` cannot attach `ignorable`. This plugin therefore NEVER
 * appends custom events (no `usage/balance`, no `usage/balance-ledger`). All
 * live numbers travel through the projection `view` reading in-memory state;
 * the log stays pristine and restart-loading keeps working.
 *
 * @module dsh-usage-meter-harness
 */
import z from '@deepseek-ai/schemastery';
import { z as zod } from 'zod';
import { settingsNamespace } from '@deepseek-ai/dsh-settings';
import type { Context } from '@deepseek-ai/cordis';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { BUNDLED_TABLE } from './prices-providers.ts';
import {
  currentPrices,
  fetchRemotePrices,
  fetchUsdToCny,
  resolvePricingForTime,
  PriceTable,
} from './prices.ts';
import type { PriceKey } from './prices.ts';
import { fetchDeepSeekBalance, toSnapshot } from './balance.ts';
import type { BalanceSnapshot } from './balance.ts';
import { costBreakdown, costOf } from './projection.ts';
import type { BillingRow, ModelPricing, UsageCostValue } from './projection.ts';
import { BILLING_TYPES, defaultUnknownRows, rowsFromPricing } from './billing.ts';
import type { BillingType } from './billing.ts';

// ── configuration ────────────────────────────────────────────────────────────

const Config = z.object({
  /** Display / ledger currency (CNY default; USD via the popup). */
  currency: z.string().default('CNY'),
  /** URL serving a LiteLLM-shaped `model_prices_and_context_window.json`. */
  priceSourceUrl: z.string(),
  /** Refresh cadence for prices/balance/rate in ms (default 4h). */
  refreshIntervalMs: z.number().default(4 * 60 * 60 * 1000),
  /** DeepSeek API key, used ONLY to query `/user/balance` (kept secret). */
  deepseekApiKey: z.string().role('secret'),
  /** Initial balance for providers without a balance API (legacy, ≥0). */
  initialBalance: z.number(),
  /** Optional per-session budget; remaining = budget − estimated cost. */
  budget: z.number(),
});

/** Stable Cordis plugin name. */
export const name = 'usage-meter';

/** Required services: settings (config namespace), projection registry, webserver (config route). */
export const inject = ['settings', 'sessionProjections', 'webServer', 'llm'];

// Ambient runtime facts the (pure, module-level) projection `view` reads. The
// cfg-owned fields (priceSourceUrl / refreshIntervalMs / deepseekApiKey) are
// mirrored here so `savePersistedConfig()` can round-trip ALL global settings
// to the file regardless of which layer last set them.
const runtimeConfig: {
  currency: string;
  initialBalance: number | null;
  budget: number | null;
  priceSourceUrl?: string;
  refreshIntervalMs?: number;
  deepseekApiKey?: string;
  /** Encrypted-at-rest copy cache (avoids re-encrypting on every persist). */
  deepseekApiKeyEnc?: string;
} = {
  currency: 'CNY',
  initialBalance: null,
  budget: null,
};

/** Latest DeepSeek account-balance snapshot, surfaced through the projection. */
let currentBalance: BalanceSnapshot | null = null;

/**
 * True while the currently-active model needs a CNY↔USD conversion (its
 * official pricing currency differs from the configured display currency).
 * The exchange rate is only fetched/refreshed while this is true.
 */
let rateNeeded = false;
/** Epoch ms of the last successful exchange-rate fetch; 0 = never fetched yet. */
let lastRateFetchedAt = 0;

// ── config persistence ───────────────────────────────────────────────────────
function configPath(): string {
  return join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'usage-meter.json');
}

// ── secret at-rest encryption (AES-256-CBC, machine-derived key) ────────────
// The DeepSeek API key never touches the disk in plaintext: it is encrypted
// with a key derived from a per-install random salt stored NEXT TO the file
// (obfuscation-grade, instant — protects against casual file reading / sync
// leakage, not a targeted local attacker who can read this source).
const SECRET_SALT_PATH = () => join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'usage-meter.salt');
let cachedSecretKey: Buffer | null = null;
function secretKey(): Buffer {
  if (cachedSecretKey !== null) return cachedSecretKey;
  let salt: string;
  try {
    if (existsSync(SECRET_SALT_PATH())) salt = readFileSync(SECRET_SALT_PATH(), 'utf8');
    else { salt = randomBytes(16).toString('hex'); writeFileSync(SECRET_SALT_PATH(), salt, 'utf8'); }
  } catch { salt = 'dsh-usage-meter-fallback-salt'; }
  cachedSecretKey = createHash('sha256').update(`dsh-usage-meter:${salt}`).digest();
  return cachedSecretKey;
}
function encryptSecret(plain: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', secretKey(), iv);
  return `${iv.toString('base64')}:${Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]).toString('base64')}`;
}
function decryptSecret(stored: string): string | null {
  try {
    const [ivB64, dataB64] = stored.split(':');
    if (ivB64 === undefined || dataB64 === undefined) return null;
    const decipher = createDecipheriv('aes-256-cbc', secretKey(), Buffer.from(ivB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
  } catch { return null; }
}

/** Global settings backed into the extra-state file. The web composition may
 *  not mount a persistent settings-file provider, so the plugin keeps its own
 *  restart-surviving copy of every global scalar (API key encrypted). */
interface PersistedGlobals {
  currency?: string;
  budget?: number;
  initialBalance?: number;
  priceSourceUrl?: string;
  refreshIntervalMs?: number;
  deepseekApiKeyEnc?: string;
  /** Last known USD→CNY rate + when it was fetched — survives restarts so the
   *  7.2 placeholder is never used once a real rate has been seen. */
  usdToCny?: number;
  rateFetchedAt?: number;
}

/** Exchange rate older than this is refreshed on the next opportunity. */
const RATE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const providerConfigs: Record<string, { currency?: string; sharedBalance?: boolean }> = {};
const balances: Record<string, { balance: number; currency: string }> = {};
/** Per-session last usage sample (turn/step) — used to compute delta deductions. */
const lastUsageBySession = new WeakMap<object, { turn: number; step: number; input: number; output: number; cacheRead: number; cacheWrite: number; reasoning: number }>();
/** Per-session request (step) start time, mirroring the fold's `stepStart` for the live ledger path. */
const stepStartBySession = new WeakMap<object, { turn: number; step: number; at: number }>();

/** Binding key for a (provider, model) pair: shared-balance provider → vendor,
 *  official → vendor, custom → model. When the user turns on 「共享余额」 for a
 *  provider, ALL models under it bill one wallet (`p:<provider>`). */
function balanceKeyOf(provider: string | null, model: string | null): string | null {
  if (provider === null || model === null) return null;
  const real = underlyingProvider(provider) ?? provider;
  if (providerConfigs[real]?.sharedBalance === true) return `p:${real}`;
  if (BUNDLED_TABLE[`${real}/${model}`] !== undefined) return `p:${real}`;
  return `m:${real}/${model}`;
}

/** Read (or lazily create) the ledger entry for a key; DeepSeek returns null. */
function ledgerOf(
  key: string | null,
  defaultCurrency: string,
): { balance: number; currency: string } | null {
  if (key === null || key.startsWith('p:deepseek')) return null;
  let entry = balances[key];
  // Seed a brand-new non-DeepSeek binding's ledger with the user-configured
  // 「非DeepSeek初始余额」so a newly-added model starts from that amount
  // (not 0). The seed survives as long as the entry is never touched.
  if (entry === undefined) entry = balances[key] = { balance: runtimeConfig.initialBalance ?? 0, currency: defaultCurrency };
  return entry;
}

/**
 * Broadcast a ledger value to every live session.
 *
 * rc.7 compatibility: the harness read path refuses unknown event types that
 * are not marked ignorable, and `session.append` cannot attach `ignorable`.
 * Balance is kept in memory (`balances`) and read by the projection `view`,
 * so we no longer write `usage/balance-ledger` into the session log — every
 * live session re-emits the new value on its next fold, which is enough for
 * the popup and the readout to update immediately.
 */
function broadcastBalance(_key: string, _entry: { balance: number; currency: string }, _kind: string): void {
  void _key; void _entry; void _kind;
}

/** Live sessions seen by this plugin — kept for the (now in-memory-only) push path. */
const activeSessions = new Set<object>();

const priceOverrides: Record<string, { prices?: Partial<ModelPricing>; rows?: BillingRow[]; templateId?: string }> = {};

/** The billing fields a user override OWNS. When an override exists it must be
 *  the AUTHORITATIVE cost model: these fields are stripped from the bundled
 *  base before merging, so switching templates can never leave a stale field
 *  (e.g. an old cacheReadPerM) billing behind the user's chosen template. */
const OVERRIDE_MANAGED_FIELDS: ReadonlyArray<keyof ModelPricing> = [
  'inputPerM', 'outputPerM', 'cacheReadPerM', 'cacheWritePerM',
  'combinedPerM', 'discount', 'peak', 'offPeak', 'peakDays', 'peakWindows',
  'weekend', 'peakOffPeakFrom', 'customRows',
];

/** Re-apply every override onto the live price table (after load / edit / reset). */
function applyPriceOverrides(): void {
  for (const [key, override] of Object.entries(priceOverrides)) {
    if (override.prices === undefined) continue;
    const base = currentPrices.table.getRaw(key) ?? (BUNDLED_TABLE as Record<PriceKey, ModelPricing>)[key as PriceKey];
    if (base === undefined) {
      const p = override.prices;
      const hasCustom = Array.isArray(p.customRows) && p.customRows.length > 0;
      if ((typeof p.inputPerM !== 'number' || typeof p.outputPerM !== 'number') && !hasCustom) continue;
      const row: ModelPricing = {
        inputPerM: typeof p.inputPerM === 'number' ? p.inputPerM : 0,
        outputPerM: typeof p.outputPerM === 'number' ? p.outputPerM : 0,
        ...(p.cacheReadPerM !== undefined ? { cacheReadPerM: p.cacheReadPerM } : {}),
        ...(p.cacheWritePerM !== undefined ? { cacheWritePerM: p.cacheWritePerM } : {}),
        ...(p.combinedPerM !== undefined ? { combinedPerM: p.combinedPerM } : {}),
        ...(p.discount !== undefined ? { discount: p.discount } : {}),
        ...(p.peak !== undefined ? { peak: p.peak } : {}),
        ...(p.offPeak !== undefined ? { offPeak: p.offPeak } : {}),
        ...(p.peakDays !== undefined ? { peakDays: p.peakDays } : {}),
        ...(p.peakWindows !== undefined ? { peakWindows: p.peakWindows } : {}),
        ...(p.peakOffPeakFrom !== undefined ? { peakOffPeakFrom: p.peakOffPeakFrom } : {}),
        ...(p.weekend !== undefined ? { weekend: p.weekend } : {}),
        ...(p.currency !== undefined ? { currency: p.currency } : {}),
        ...(hasCustom ? { customRows: p.customRows! } : {}),
        source: 'user',
      };
      currentPrices.table.merge({ [key as PriceKey]: row });
      continue;
    }
    // Managed-fields replacement: the override fully owns billing semantics —
    // EXCEPT a PURE-DISCOUNT override (Batch 半价：只带 discount/currency，不带
    // 任何价格字段)，那种覆盖只改倍率、完整保留内置基价结构。
    const pureDiscount = Object.keys(override.prices).every((k) => k === 'discount' || k === 'currency')
      && override.prices.discount !== undefined;
    const stripped: Record<string, unknown> = { ...base };
    if (!pureDiscount) {
      for (const f of OVERRIDE_MANAGED_FIELDS) delete stripped[f as string];
    }
    const row: ModelPricing = {
      ...(stripped as unknown as ModelPricing),
      ...override.prices,
      currency: override.prices.currency ?? base.currency,
      source: 'user',
    };
    currentPrices.table.merge({ [key as PriceKey]: row });
  }
}

/** The 用量 template for one model: user override, else derived from its base pricing. */
function priceRowsOf(provider: string | null, model: string | null): BillingRow[] {
  if (provider === null || model === null) return [];
  const candidates = [provider, underlyingProvider(provider) ?? provider];
  for (const p of candidates) {
    const key = `${p}/${model}`;
    const overridden = priceOverrides[key]?.rows;
    if (overridden !== undefined && overridden.length > 0) return overridden;
    const base = currentPrices.table.getRaw(key);
    if (base !== undefined) return rowsFromPricing(base);
  }
  return defaultUnknownRows();
}

/** Shape of `$DSH_HOME/usage-meter.json` — EXTRA state ONLY (per-provider
 *  currency, per-model price overrides, per-binding ledger). */
interface ExtraStateDoc {
  providers?: Record<string, { currency?: string; sharedBalance?: boolean; initialBalance?: number; topUps?: Array<{ amount: number }> }>;
  priceOverrides?: Record<string, { prices?: Partial<ModelPricing>; rows?: BillingRow[] }>;
  balances?: Record<string, { balance: number; currency: string }>;
  globals?: PersistedGlobals;
}

/** Load the EXTRA state from `usage-meter.json` and seed the module maps.
 *  Global scalar settings (currency / budget / priceSourceUrl / refreshIntervalMs /
 *  deepseekApiKey) are deliberately NOT carried here: they belong to the
 *  `usage-meter` settings namespace, whose single canonical write path is
 *  `scope.update()` (→ settings.yaml). Keeping the API key out of this
 *  extra-state file removes a plaintext-secret leak, and removing the
 *  globals here fixes the two-writers-desync between the popup (file) and the
 *  settings namespace (settings.yaml). */
/** Globals restored from the file, applied onto the settings scope in `apply()`
 *  (fields the namespace itself already carries are NOT overwritten). */
let pendingGlobals: PersistedGlobals | null = null;

function loadPersistedConfig(): void {
  try {
    const p = configPath();
    if (!existsSync(p)) return;
    const doc = JSON.parse(readFileSync(p, 'utf8')) as ExtraStateDoc;
    if (doc.globals) pendingGlobals = doc.globals;
    // Restore the last known exchange rate immediately (before any fetch) so
    // conversions after a restart use the persisted rate, never the 7.2
    // placeholder.
    if (doc.globals && typeof doc.globals.usdToCny === 'number' && doc.globals.usdToCny > 0) {
      currentPrices.usdToCny = doc.globals.usdToCny;
      lastRateFetchedAt = typeof doc.globals.rateFetchedAt === 'number' ? doc.globals.rateFetchedAt : 0;
    }
    if (doc.providers) {
      for (const [provider, cfg] of Object.entries(doc.providers)) {
        const pc: { currency?: string; sharedBalance?: boolean } = {};
        if (cfg.currency !== undefined) pc.currency = cfg.currency;
        if (cfg.sharedBalance !== undefined) pc.sharedBalance = cfg.sharedBalance === true;
        providerConfigs[provider] = pc;
        // Migrate the legacy manual balance (initialBalance + topUps) into the
        // global ledger under the vendor binding key.
        const total = (cfg.initialBalance ?? 0) + (cfg.topUps ?? []).reduce((s, u) => s + u.amount, 0);
        if (provider !== '*' && provider !== 'deepseek-official' && (cfg.initialBalance !== undefined || (cfg.topUps?.length ?? 0) > 0)) {
          balances[`p:${provider}`] = { balance: total, currency: pc.currency ?? 'CNY' };
        }
      }
    }
    if (doc.priceOverrides) {
      Object.assign(priceOverrides, doc.priceOverrides);
      applyPriceOverrides();
    }
    if (doc.balances) Object.assign(balances, doc.balances);
  } catch {
    // ignore
  }
}

/** Persist the EXTRA state + a restart-surviving copy of the global scalars
 *  (API key encrypted). The settings namespace stays canonical in-process; this
 *  file guarantees the values survive a restart even when the host composition
 *  lacks a persistent settings-file provider. */
function savePersistedConfig(): void {
  try {
    const globals: PersistedGlobals = {};
    if (runtimeConfig.currency !== undefined && runtimeConfig.currency !== '') globals.currency = runtimeConfig.currency;
    if (runtimeConfig.budget !== null) globals.budget = runtimeConfig.budget;
    if (runtimeConfig.initialBalance !== null) globals.initialBalance = runtimeConfig.initialBalance;
    if (typeof runtimeConfig.priceSourceUrl === 'string' && runtimeConfig.priceSourceUrl !== '') globals.priceSourceUrl = runtimeConfig.priceSourceUrl;
    if (typeof runtimeConfig.refreshIntervalMs === 'number') globals.refreshIntervalMs = runtimeConfig.refreshIntervalMs;
    if (typeof runtimeConfig.deepseekApiKey === 'string' && runtimeConfig.deepseekApiKey !== '') {
      const enc = encryptSecret(runtimeConfig.deepseekApiKey);
      if (runtimeConfig.deepseekApiKeyEnc !== enc) runtimeConfig.deepseekApiKeyEnc = enc;
      globals.deepseekApiKeyEnc = enc;
    }
    if (currentPrices.usdToCny > 0) { globals.usdToCny = currentPrices.usdToCny; globals.rateFetchedAt = lastRateFetchedAt; }
    const payload: ExtraStateDoc = { providers: providerConfigs, priceOverrides, balances, globals };
    writeFileSync(configPath(), JSON.stringify(payload, null, 2), 'utf8');
  } catch (err) {
    console.warn('[usage-meter] failed to persist config:', err);
  }
}

/** Effective per-provider config; DeepSeek alias maps to canonical, then `*` defaults. */
function getProviderConfig(provider: string | null): { currency?: string } {
  if (provider !== null && providerConfigs[provider] !== undefined) return providerConfigs[provider];
  const real = underlyingProvider(provider);
  const key = real === 'deepseek' ? 'deepseek-official' : real;
  if (key !== null && providerConfigs[key] !== undefined) return providerConfigs[key];
  return providerConfigs['*'] ?? {};
}

/** Convert an amount between CNY and USD (display-time only; never feeds computations). */
function toCurrency(amount: number, from: string, to: string, usdToCny: number): number {
  if (from === to) return amount;
  if (from === 'USD' && to === 'CNY') return amount * usdToCny;
  if (from === 'CNY' && to === 'USD') return amount / usdToCny;
  return amount;
}

/** Total cost of the given turns, each converted from its native currency into `currency` (display-time only). */
function totalCostInCurrency(
  turns: Array<{ cost: number; currency: string }>,
  currency: string,
  usdToCny: number,
): number {
  return turns.reduce((sum, t) => sum + toCurrency(t.cost, t.currency, currency, usdToCny), 0);
}

// ── debounced persistence (usage hot path only) ───────────────────────────────
// The debounce timers + process-exit flush are fiber-scoped (created inside
// `apply`, torn down by `ctx.effect`) so a plugin reload never leaks a timer
// or leaves a stale `process.on('exit')` listener behind. These are immutable
// cadence constants; per-fiber state lives in `apply`.
const PERSIST_DEBOUNCE_MS = 400;
const PERSIST_MAX_WAIT_MS = 2000;

// ── helpers ──────────────────────────────────────────────────────────────────
const VISION_TOOLKIT_PREFIX = 'vision-toolkit-';

/** vision-toolkit 把任意上游 provider 包成 `vision-toolkit-<provider>`（如
 *  vision-toolkit-deepseek-official），真实 provider 是前缀后的部分；
 *  runapi-* 等转售网关不带该前缀，不会被误判。 */
function underlyingProvider(provider: string | null): string | null {
  if (provider === null) return null;
  let p = provider;
  while (p.startsWith(VISION_TOOLKIT_PREFIX)) p = p.slice(VISION_TOOLKIT_PREFIX.length);
  return p;
}

function isDeepSeekProvider(provider: string | null): boolean {
  const real = underlyingProvider(provider);
  if (real === null) return false;
  // Match the canonical names as well as any `deepseek-*` route (e.g. a model
  // id used as the provider, like `deepseek-v4-flash-vision-exp`) so the
  // official account balance is surfaced for every DeepSeek route.
  return real === 'deepseek' || real === 'deepseek-official' || real.startsWith('deepseek');
}

function bucketsOf(usage: { inputTokens: number; outputTokens: number; cacheReadTokens?: number; cacheWriteTokens?: number; reasoningTokens?: number } | undefined) {
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  return {
    input: num(usage?.inputTokens),
    output: num(usage?.outputTokens),
    cacheRead: num(usage?.cacheReadTokens),
    cacheWrite: num(usage?.cacheWriteTokens),
    reasoning: num(usage?.reasoningTokens),
  };
}

function usageEventOf(event: { type: string; data: Record<string, unknown> }): { turn: number; step: number; usage: { inputTokens: number; outputTokens: number; cacheReadTokens?: number; cacheWriteTokens?: number; reasoningTokens?: number } } | null {
  if (event.type === 'assistant/chunk' && (event.data.chunk as { type?: string })?.type === 'usage') {
    const chunk = event.data.chunk as { turn?: number; step?: number; usage?: { inputTokens: number; outputTokens: number; cacheReadTokens?: number; cacheWriteTokens?: number; reasoningTokens?: number } };
    return { turn: chunk.turn ?? 0, step: chunk.step ?? 0, usage: chunk.usage! };
  }
  if (event.type === 'assistant/message' && (event.data as { usage?: unknown }).usage !== undefined) {
    return {
      turn: event.data.turn as number,
      step: event.data.step as number,
      usage: (event.data as { usage: { inputTokens: number; outputTokens: number; cacheReadTokens?: number; cacheWriteTokens?: number; reasoningTokens?: number } }).usage,
    };
  }
  return null;
}

/**
 * Resolve the pricing for a route at a given time. The fold passes the
 * EVENT's own time so a replayed log reproduces the same per-turn costs
 * (peak/off-peak window chosen at the original event time, not at replay
 * time). The view passes no time, i.e. resolves at "now".
 */
function pricingFor(provider: string | null, model: string | null, at?: number): ModelPricing | null {
  if (provider === null || model === null) return null;
  const tableProvider = underlyingProvider(provider) ?? provider;
  const raw = currentPrices.table.get(tableProvider, model);
  if (raw === undefined) return null;
  const resolved = resolvePricingForTime(raw, at ?? Date.now());
  const updatedAt = currentPrices.updatedAt > 0 ? currentPrices.updatedAt : resolved.updatedAt;
  return { ...resolved, ...(updatedAt === undefined ? {} : { updatedAt }) };
}

// ── projection schema ────────────────────────────────────────────────────────
const peakRatesSchema = zod
  .object({ inputPerM: zod.number(), outputPerM: zod.number(), cacheReadPerM: zod.number().optional() })
  .strict();
const pricingSchema = zod
  .object({
    inputPerM: zod.number(),
    outputPerM: zod.number(),
    cacheReadPerM: zod.number().optional(),
    cacheWritePerM: zod.number().optional(),
    combinedPerM: zod.number().optional(),
    discount: zod.number().optional(),
    currency: zod.string().optional(),
    updatedAt: zod.number().optional(),
    source: zod.enum(['bundled', 'remote', 'user']).optional(),
    peak: peakRatesSchema.optional(),
    offPeak: peakRatesSchema.optional(),
    peakOffPeakFrom: zod.number().optional(),
    peakDays: zod.array(zod.number().int().min(0).max(6)).optional(),
    peakWindows: zod.array(zod.object({ start: zod.number(), end: zod.number() })).optional(),
    weekend: peakRatesSchema.optional(),
    customRows: zod.array(zod.object({
      label: zod.string(),
      buckets: zod.array(zod.enum(['input', 'cacheRead', 'cacheWrite', 'output'])),
      perM: zod.number(),
      peakPerM: zod.number().optional(),
      offPerM: zod.number().optional(),
    })).optional(),
  })
  .strict();
const turnCostSchema = zod
  .object({
    turn: zod.number().int().nonnegative(),
    cost: zod.number(),
    currency: zod.string(),
    model: zod.string().nullable(),
    startedAt: zod.number(),
    endedAt: zod.number(),
    endReason: zod.string().nullable(),
    inputTokens: zod.number().int().nonnegative(),
    outputTokens: zod.number().int().nonnegative(),
    cacheReadTokens: zod.number().int().nonnegative(),
    cacheWriteTokens: zod.number().int().nonnegative(),
    reasoningTokens: zod.number().int().nonnegative(),
  })
  .strict();
const accountBalanceSchema = zod
  .object({ currency: zod.string(), totalBalance: zod.number(), updatedAt: zod.number(), source: zod.enum(['api', 'computed']) })
  .strict();
const billingRowSchema = zod
  .object({ label: zod.string(), buckets: zod.array(zod.enum(['input', 'cacheRead', 'cacheWrite', 'output'])), perM: zod.number().optional() })
  .strict();
const usageCostSchema = zod
  .object({
    requestCount: zod.number().int().nonnegative(),
    stepCount: zod.number().int().nonnegative(),
    inputTokens: zod.number().int().nonnegative(),
    outputTokens: zod.number().int().nonnegative(),
    cacheReadTokens: zod.number().int().nonnegative(),
    cacheWriteTokens: zod.number().int().nonnegative(),
    reasoningTokens: zod.number().int().nonnegative(),
    realtimeOutputTokens: zod.number().int().nonnegative(),
    realtimeUpdatedAt: zod.number().int().nonnegative(),
    provider: zod.string().nullable(),
    model: zod.string().nullable(),
    pricing: pricingSchema.nullable(),
    basePricing: pricingSchema.nullable(),
    priceRows: zod.array(billingRowSchema),
    officialPrice: zod.object({ pricing: pricingSchema, rows: zod.array(billingRowSchema) }).nullable(),
    estimatedCost: zod.number(),
    currency: zod.string(),
    usdToCny: zod.number(),
    rateUpdatedAt: zod.number(),
    accountBalance: accountBalanceSchema.nullable(),
    balanceNeedsKey: zod.boolean(),
    turns: zod.array(turnCostSchema),
    budget: zod.number().nullable(),
    remainingBudget: zod.number().nullable(),
  })
  .strict();

// ── projection fold state ────────────────────────────────────────────────────
interface FoldTurn {
  turn: number;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  reasoning: number;
  cost: number;
  currency: string;
  model: string | null;
  startedAt: number;
  endedAt: number;
  endReason: string | null;
}

interface FoldState {
  requestCount: number;
  stepCount: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  reasoningTokens: number;
  realtimeOutputTokens: number;
  realtimeUpdatedAt: number;
  provider: string | null;
  model: string | null;
  stepStart: { turn: number; step: number; at: number } | null;
  lastCostAt: number;
  turns: FoldTurn[];
  last: { turn: number; step: number; input: number; output: number; cacheRead: number; cacheWrite: number; reasoning: number } | null;
}

function addToLastTurn(turns: FoldTurn[], delta: { input: number; output: number; cacheRead: number; cacheWrite: number; reasoning: number }, deltaCost: number, currency: string): FoldTurn[] {
  const last = turns[turns.length - 1];
  if (last === undefined) return turns;
  const next = [...turns];
  next[next.length - 1] = {
    ...last,
    cost: last.cost + deltaCost,
    currency,
    input: last.input + delta.input,
    output: last.output + delta.output,
    cacheRead: last.cacheRead + delta.cacheRead,
    cacheWrite: last.cacheWrite + delta.cacheWrite,
    reasoning: last.reasoning + delta.reasoning,
  };
  return next;
}

// ── projection ───────────────────────────────────────────────────────────────
/** Coerce to a finite number (NaN/Infinity would fail the strict view schema on reload). */
function safeNumber(n: unknown, fallback: number): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
}
/** A schema-safe fallback view: a session reload must never be taken down by a projection error. */
function emptyUsageCost(state: FoldState): UsageCostValue {
  const budget = runtimeConfig.budget;
  const safeBudget = budget === null ? null : safeNumber(budget, 0);
  const turns = state.turns.map((x) => ({
    turn: safeNumber(x.turn, 0),
    cost: safeNumber(x.cost, 0),
    currency: x.currency,
    model: x.model,
    startedAt: safeNumber(x.startedAt, 0),
    endedAt: safeNumber(x.endedAt, 0),
    endReason: x.endReason ?? null,
    inputTokens: safeNumber(x.input, 0),
    outputTokens: safeNumber(x.output, 0),
    cacheReadTokens: safeNumber(x.cacheRead, 0),
    cacheWriteTokens: safeNumber(x.cacheWrite, 0),
    reasoningTokens: safeNumber(x.reasoning, 0),
  }));
  return {
    requestCount: safeNumber(state.requestCount, 0),
    stepCount: safeNumber(state.stepCount, 0),
    inputTokens: safeNumber(state.inputTokens, 0),
    outputTokens: safeNumber(state.outputTokens, 0),
    cacheReadTokens: safeNumber(state.cacheReadTokens, 0),
    cacheWriteTokens: safeNumber(state.cacheWriteTokens, 0),
    reasoningTokens: safeNumber(state.reasoningTokens, 0),
    realtimeOutputTokens: safeNumber(state.realtimeOutputTokens, 0),
    realtimeUpdatedAt: safeNumber(state.realtimeUpdatedAt, 0),
    provider: state.provider,
    model: state.model,
    pricing: null,
    basePricing: null,
    priceRows: [],
    officialPrice: null,
    estimatedCost: 0,
    currency: getProviderConfig(state.provider).currency ?? runtimeConfig.currency,
    usdToCny: safeNumber(currentPrices.usdToCny, 7.2),
    rateUpdatedAt: safeNumber(lastRateFetchedAt, 0),
    accountBalance: null,
    balanceNeedsKey: false,
    turns,
    budget: safeBudget,
    remainingBudget: safeBudget === null ? null : safeBudget,
  };
}
// The persisted fold-state schema. `stateSchema` is REQUIRED by the framework:
// `restore()` calls `stateSchema.parse(row.val)` for usable rows, and without it
// the restore aborts (session can't reload). `.catch(0)` keeps a lingering
// non-finite number from ever failing the parse and taking the reload down.
const foldTurnSchema = zod.object({
  turn: zod.number().catch(0),
  input: zod.number().catch(0),
  output: zod.number().catch(0),
  cacheRead: zod.number().catch(0),
  cacheWrite: zod.number().catch(0),
  reasoning: zod.number().catch(0),
  cost: zod.number().catch(0),
  currency: zod.string().catch('CNY'),
  model: zod.string().nullable().catch(null),
  startedAt: zod.number().catch(0),
  endedAt: zod.number().catch(0),
  endReason: zod.string().nullable().catch(null),
});
const foldStateSchema = zod.object({
  requestCount: zod.number().int().nonnegative().catch(0),
  stepCount: zod.number().int().nonnegative().catch(0),
  inputTokens: zod.number().catch(0),
  outputTokens: zod.number().catch(0),
  cacheReadTokens: zod.number().catch(0),
  cacheWriteTokens: zod.number().catch(0),
  reasoningTokens: zod.number().catch(0),
  realtimeOutputTokens: zod.number().catch(0),
  realtimeUpdatedAt: zod.number().catch(0),
  provider: zod.string().nullable().catch(null),
  model: zod.string().nullable().catch(null),
  stepStart: zod.object({ turn: zod.number().catch(0), step: zod.number().catch(0), at: zod.number().catch(0) }).nullable().catch(null),
  lastCostAt: zod.number().catch(0),
  turns: zod.array(foldTurnSchema).catch([]),
  last: zod.object({ turn: zod.number().catch(0), step: zod.number().catch(0), input: zod.number().catch(0), output: zod.number().catch(0), cacheRead: zod.number().catch(0), cacheWrite: zod.number().catch(0), reasoning: zod.number().catch(0) }).nullable().catch(null),
});

const usageCostProjection = {
  key: 'usageCost',
  stateSchema: foldStateSchema,
  init(): FoldState {
    return {
      requestCount: 0,
      stepCount: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      reasoningTokens: 0,
      realtimeOutputTokens: 0,
      realtimeUpdatedAt: 0,
      provider: null,
      model: null,
      stepStart: null,
      lastCostAt: 0,
      turns: [],
      last: null,
    };
  },
  apply(state: FoldState, event: { type: string; data: Record<string, unknown>; time: number }): FoldState {
    try {
    let next = state;
    if (event.type === 'request/header') {
      const headerCfg = (event.data as { header?: { config?: { provider?: string | null; model?: string | null } } }).header?.config;
      const provider = headerCfg?.provider ?? null;
      const model = headerCfg?.model ?? null;
      if (provider === null && model === null) return next === state ? state : next;
      if (provider !== state.provider || model !== state.model) {
        next = { ...next, provider, model };
        // Reflect a mid-turn model switch on the still-open turn bucket.
        const open = next.turns[next.turns.length - 1];
        if (open !== undefined && open.endedAt === 0 && open.model !== model) {
          const turns = [...next.turns];
          turns[turns.length - 1] = { ...open, model };
          next = { ...next, turns };
        }
      }
    }
    // DeepSeek sends final usage only at [DONE]. Estimate streamed output from
    // text/reasoning deltas solely for the live token/s indicator; authoritative
    // accounting below still uses adapter-provided TokenUsage.
    if (event.type === 'assistant/chunk' && ((event.data.chunk as { type?: string })?.type === 'text-delta' || (event.data.chunk as { type?: string })?.type === 'reasoning-delta')) {
      const text = (event.data.chunk as { text: string }).text;
      if (text.length > 0) {
        next = {
          ...next,
          realtimeOutputTokens: next.realtimeOutputTokens + Math.max(1, Math.ceil(text.length / 4)),
          realtimeUpdatedAt: event.time,
        };
      }
    }
    if (event.type === 'turn/start') {
      const turn = event.data.turn as number;
      const last = next.turns[next.turns.length - 1];
      if (last === undefined || last.turn !== turn) {
        next = {
          ...next,
          turns: [...next.turns, {
            turn,
            input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0,
            cost: 0, currency: 'CNY', model: state.model,
            startedAt: event.time, endedAt: 0, endReason: null,
          }],
        };
      }
    }
    if (event.type === 'turn/end') {
      const last = next.turns[next.turns.length - 1];
      if (last !== undefined && last.turn === (event.data.turn as number) && last.endedAt === 0) {
        const turns = [...next.turns];
        turns[turns.length - 1] = { ...last, endedAt: event.time, endReason: String((event.data.reason as { kind?: string })?.kind ?? 'completed') };
        next = { ...next, turns };
      }
    }
    if (event.type === 'step/start') {
      next = {
        ...next,
        stepCount: state.stepCount + 1,
        stepStart: { turn: event.data.turn as number, step: event.data.step as number, at: event.time },
      };
    }
    if (event.type === 'assistant/message') next = { ...next, requestCount: state.requestCount + 1 };

    const ue = usageEventOf(event);
    if (ue !== null) {
      const prev = state.last !== null && state.last.turn === ue.turn && state.last.step === ue.step ? state.last : null;
      const b = bucketsOf(ue.usage);
      const samePrev =
        prev !== null &&
        prev.input === b.input && prev.output === b.output &&
        prev.cacheRead === b.cacheRead && prev.cacheWrite === b.cacheWrite && prev.reasoning === b.reasoning;
      if (!samePrev) {
        const delta = {
          input: b.input - (prev?.input ?? 0),
          output: b.output - (prev?.output ?? 0),
          cacheRead: b.cacheRead - (prev?.cacheRead ?? 0),
          cacheWrite: b.cacheWrite - (prev?.cacheWrite ?? 0),
          reasoning: b.reasoning - (prev?.reasoning ?? 0),
        };
        // DeepSeek bills an entire API request at the peak/off-peak rate active
        // when the request STARTED; `stepStart` was recorded from `step/start`,
        // falling back to the turn start so replay stays deterministic.
        const requestStart =
          state.stepStart !== null && state.stepStart.turn === ue.turn && state.stepStart.step === ue.step
            ? state.stepStart.at
            : (state.turns[state.turns.length - 1]?.startedAt ?? event.time);
        const pricing = pricingFor(state.provider, state.model, requestStart);
        const deltaCost = pricing === null
          ? 0
          : costOf({ inputTokens: delta.input, outputTokens: delta.output, cacheReadTokens: delta.cacheRead, cacheWriteTokens: delta.cacheWrite }, pricing);
        next = {
          ...next,
          inputTokens: state.inputTokens + delta.input,
          outputTokens: state.outputTokens + delta.output,
          cacheReadTokens: state.cacheReadTokens + delta.cacheRead,
          cacheWriteTokens: state.cacheWriteTokens + delta.cacheWrite,
          reasoningTokens: state.reasoningTokens + delta.reasoning,
          lastCostAt: event.time,
          turns: addToLastTurn(next.turns, delta, deltaCost, pricing?.currency ?? 'CNY'),
          last: { turn: ue.turn, step: ue.step, ...b },
        };
      }
    }
    return next === state ? state : next;
    } catch {
      return state;
    }
  },
  wire: {
    viewSchema: usageCostSchema,
    view(state: FoldState): UsageCostValue {
    try {
    const pricing = pricingFor(state.provider, state.model);
    const currency = getProviderConfig(state.provider).currency ?? runtimeConfig.currency;
    const usdToCny = safeNumber(currentPrices.usdToCny, 7.2);
    // Display-denominated total: every turn cost converted from its native
    // currency into the display currency.
    const estimatedCost = safeNumber(totalCostInCurrency(state.turns, currency, usdToCny), 0);
    const turns = state.turns.map((t) => ({
      turn: t.turn,
      cost: t.cost,
      currency: t.currency,
      model: t.model,
      startedAt: t.startedAt,
      endedAt: t.endedAt,
      endReason: t.endReason,
      inputTokens: t.input,
      outputTokens: t.output,
      cacheReadTokens: t.cacheRead,
      cacheWriteTokens: t.cacheWrite,
      reasoningTokens: t.reasoning,
    }));
    // Live balance (rc.7 safe — reads in-memory state, never a log event):
    //   DeepSeek:   the in-memory snapshot refreshed on every `turn/start`.
    //   others:     the GLOBAL ledger value for this binding key (already
    //               delta-decremented server-side; default 0, negative when
    //               spending without a funded balance).
    let accountBalance: UsageCostValue['accountBalance'] = null;
    if (isDeepSeekProvider(state.provider)) {
      if (currentBalance !== null) {
        accountBalance = {
          currency: currentBalance.currency,
          totalBalance: currentBalance.totalBalance,
          updatedAt: currentBalance.fetchedAt,
          source: 'api',
        };
      }
    } else {
      const key = balanceKeyOf(state.provider, state.model);
      const ledger = key !== null ? balances[key] : undefined;
      if (ledger !== undefined) {
        accountBalance = {
          currency: ledger.currency,
          totalBalance: ledger.balance,
          updatedAt: state.lastCostAt,
          source: state.lastCostAt > 0 ? 'computed' : 'api',
        };
      }
    }
    // The OFFICIAL bundled pricing + row template for the current model.
    const officialProvider = underlyingProvider(state.provider) ?? state.provider;
    const officialKey = officialProvider !== null && state.model !== null ? `${officialProvider}/${state.model}` : null;
    const officialRow = officialKey !== null ? (BUNDLED_TABLE as Record<PriceKey, ModelPricing>)[officialKey as PriceKey] : undefined;
    const officialPrice = officialRow === undefined ? null : { pricing: officialRow, rows: rowsFromPricing(officialRow) };
    const budget = runtimeConfig.budget;
    return {
      requestCount: state.requestCount,
      stepCount: state.stepCount,
      inputTokens: state.inputTokens,
      outputTokens: state.outputTokens,
      cacheReadTokens: state.cacheReadTokens,
      cacheWriteTokens: state.cacheWriteTokens,
      reasoningTokens: state.reasoningTokens,
      realtimeOutputTokens: state.realtimeOutputTokens,
      realtimeUpdatedAt: state.realtimeUpdatedAt,
      provider: state.provider,
      model: state.model,
      pricing,
      basePricing: currentPrices.table.get(underlyingProvider(state.provider) ?? state.provider ?? '', state.model ?? '') ?? null,
      priceRows: priceRowsOf(state.provider, state.model),
      officialPrice,
      estimatedCost,
      currency,
      usdToCny,
      rateUpdatedAt: lastRateFetchedAt,
      accountBalance,
      balanceNeedsKey: isDeepSeekProvider(state.provider) && currentBalance === null,
      turns,
      budget,
      remainingBudget: budget === null ? null : safeNumber(budget - estimatedCost, 0),
    };
    } catch {
      return emptyUsageCost(state);
    }
    },
  },
  stateVersion: 1,
};

// ── service ──────────────────────────────────────────────────────────────────
class UsageMeterCore {
  cfg: Record<string, unknown>;
  priceRefreshing: Promise<void> | null = null;
  balanceRefreshing: Promise<void> | null = null;
  rateRefreshing: Promise<void> | null = null;
  lastRateRefresh = 0;

  constructor(config: Record<string, unknown>) {
    this.cfg = config;
  }

  getConfig(): Record<string, unknown> {
    return this.cfg;
  }

  applyConfig(cfg: Record<string, unknown>): void {
    this.cfg = cfg;
    runtimeConfig.currency = (cfg.currency as string) ?? 'CNY';
    runtimeConfig.initialBalance = typeof cfg.initialBalance === 'number' && cfg.initialBalance > 0 ? cfg.initialBalance : null;
    runtimeConfig.budget = typeof cfg.budget === 'number' && cfg.budget > 0 ? cfg.budget : null;
    // Mirror cfg-owned globals into the runtimeConfig singleton so
    // savePersistedConfig() can round-trip ALL settings to the file, keeping
    // the mirror in sync no matter which layer (schema defaults → file →
    // settings.yaml user section) last set a value via applyConfig/
    // scope.watch.
    if (typeof cfg.priceSourceUrl === 'string') runtimeConfig.priceSourceUrl = cfg.priceSourceUrl;
    if (typeof cfg.refreshIntervalMs === 'number') runtimeConfig.refreshIntervalMs = cfg.refreshIntervalMs;
    else if (cfg.refreshIntervalMs === undefined) runtimeConfig.refreshIntervalMs = undefined;
    if (typeof cfg.deepseekApiKey === 'string') runtimeConfig.deepseekApiKey = cfg.deepseekApiKey;
  }

  getPrice(provider: string, model: string): ModelPricing | undefined {
    return currentPrices.table.get(provider, model);
  }

  estimateCost(
    usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number },
    provider: string,
    model: string,
  ): number {
    return costOf(usage, this.getPrice(provider, model) ?? null);
  }

  getBalance(): BalanceSnapshot | null {
    return currentBalance;
  }

  maybeRefresh(deepSeekWanted: boolean): void {
    const ms = (this.cfg.refreshIntervalMs as number | undefined) ?? 4 * 60 * 60 * 1000;
    const now = Date.now();
    if (rateNeeded && now - lastRateFetchedAt >= RATE_MAX_AGE_MS && now - this.lastRateRefresh >= 5 * 60 * 1000) {
      // 汇率独立于价格周期：超过 24 小时未更新就重新拉取（5 分钟最多尝试一次，
      // 避免源故障时反复打）。
      this.lastRateRefresh = now;
      void this.refreshRate();
    }
    if (now - currentPrices.updatedAt >= ms) void this.refreshPrices();
    // Refuse to touch DeepSeek's balance endpoint unless the active session is
    // actually a DeepSeek provider — the balance is only surfaced for DeepSeek
    // sessions, so fetching it for e.g. qwen/ollama is pure noise and (with a
    // non-DeepSeek key) just produces repeated HTTP 401 spam.
    if (deepSeekWanted && (currentBalance === null || now - currentBalance.fetchedAt >= ms)) void this.refreshBalance();
  }

  async refreshRate(): Promise<void> {
    if (this.rateRefreshing) return this.rateRefreshing;
    this.rateRefreshing = (async () => {
      try {
        currentPrices.usdToCny = await fetchUsdToCny();
        lastRateFetchedAt = Date.now();
        console.info(`[usage-meter] exchange rate updated: 1 USD = ${currentPrices.usdToCny} CNY`);
      } catch (err) {
        console.warn(`[usage-meter] exchange rate refresh failed (keeping last): ${String(err)}`);
      } finally {
        this.rateRefreshing = null;
      }
    })();
    return this.rateRefreshing;
  }

  async refreshPrices(): Promise<void> {
    const url = this.cfg.priceSourceUrl as string | undefined;
    if (!url) return;
    if (this.priceRefreshing) return this.priceRefreshing;
    this.priceRefreshing = (async () => {
      try {
        const rows = await fetchRemotePrices(url);
        currentPrices.table.merge(rows);
        currentPrices.updatedAt = Date.now();
        console.info(`[usage-meter] refreshed ${Object.keys(rows).length} price rows`);
      } catch (err) {
        console.warn(`[usage-meter] price refresh failed (keeping last table): ${String(err)}`);
      } finally {
        this.priceRefreshing = null;
      }
    })();
    return this.priceRefreshing;
  }

  async refreshBalance(): Promise<void> {
    const envKey = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.DEEPSEEK_API_KEY;
    const apiKey = (this.cfg.deepseekApiKey as string | undefined) ?? envKey;
    if (!apiKey) {
      currentBalance = null;
      return;
    }
    if (this.balanceRefreshing) return this.balanceRefreshing;
    this.balanceRefreshing = (async () => {
      try {
        currentBalance = toSnapshot(await fetchDeepSeekBalance(apiKey));
      } catch (err) {
        console.warn(`[usage-meter] balance refresh failed: ${String(err)}`);
      } finally {
        this.balanceRefreshing = null;
      }
    })();
    return this.balanceRefreshing;
  }
}

/** Plugin entry: provide the service, register settings + the projection. */
export function apply(ctx: Context, config: Record<string, unknown> = {}): void {
  // Seed the per-provider currency / price overrides / ledger maps from the
  // extra-state file. Global scalars are NOT read here — they resolve through
  // the `usage-meter` settings namespace below (single canonical write path).
  loadPersistedConfig();
  const meter = new UsageMeterCore(config);
  // Fiber-scoped debounced persistence + process-exit flush. Tearing these down
  // with `ctx.effect` keeps a plugin reload from leaking debounce timers or a
  // stale process listener.
  const persist = {
    debounce: null as ReturnType<typeof setTimeout> | null,
    maxWait: null as ReturnType<typeof setTimeout> | null,
    disposed: false,
    flush(): void {
      if (persist.disposed) return;
      if (persist.debounce === null && persist.maxWait === null) return;
      if (persist.debounce !== null) { clearTimeout(persist.debounce); persist.debounce = null; }
      if (persist.maxWait !== null) { clearTimeout(persist.maxWait); persist.maxWait = null; }
      savePersistedConfig();
    },
    schedule(): void {
      if (persist.disposed) return;
      if (persist.maxWait === null) persist.maxWait = setTimeout(() => persist.flush(), PERSIST_MAX_WAIT_MS);
      if (persist.debounce !== null) clearTimeout(persist.debounce);
      persist.debounce = setTimeout(() => persist.flush(), PERSIST_DEBOUNCE_MS);
    },
  };
  ctx.effect(() => {
    const onExit = () => persist.flush();
    process.on('beforeExit', onExit);
    process.on('exit', onExit);
    return () => {
      persist.disposed = true;
      process.off('beforeExit', onExit);
      process.off('exit', onExit);
      if (persist.debounce !== null) { clearTimeout(persist.debounce); persist.debounce = null; }
      if (persist.maxWait !== null) { clearTimeout(persist.maxWait); persist.maxWait = null; }
    };
  });
  // `base` = the composition entry config only. Global scalars resolve as
  // schema-defaults → composition `base` → settings.yaml `usage-meter` user
  // section; a user-written section always wins, and `scope.update` is the one
  // write path (the popup POST and the settings UI both go through it).
  const scope = ctx.settings.register(settingsNamespace('usage-meter'), Config, { base: config });
  meter.applyConfig(scope.get());
  // Restore globals persisted in the extra-state file when the settings
  // namespace itself lost them across a restart (web compositions without a
  // persistent settings-file provider). Namespace values always win.
  if (pendingGlobals !== null) {
    const cur = scope.get() as Record<string, unknown>;
    const restore: Record<string, unknown> = {};
    const g = pendingGlobals;
    if (g.initialBalance !== undefined && !(typeof cur.initialBalance === 'number' && cur.initialBalance > 0)) restore.initialBalance = g.initialBalance;
    if (g.budget !== undefined && !(typeof cur.budget === 'number' && cur.budget > 0)) restore.budget = g.budget;
    if (g.currency && cur.currency === undefined) restore.currency = g.currency;
    if (g.priceSourceUrl && (typeof cur.priceSourceUrl !== 'string' || cur.priceSourceUrl === '')) restore.priceSourceUrl = g.priceSourceUrl;
    if (typeof g.refreshIntervalMs === 'number' && typeof cur.refreshIntervalMs !== 'number') restore.refreshIntervalMs = g.refreshIntervalMs;
    if (g.deepseekApiKeyEnc !== undefined && (typeof cur.deepseekApiKey !== 'string' || cur.deepseekApiKey === '')) {
      const plain = decryptSecret(g.deepseekApiKeyEnc);
      if (plain !== null) restore.deepseekApiKey = plain;
      else console.warn('[usage-meter] stored DeepSeek API key could not be decrypted (salt changed?); please re-enter it');
    }
    pendingGlobals = null;
    // Startup rate freshness: a persisted rate older than 24h is refreshed once
    // right away so the UI never shows a stale quote all day.
    if (Date.now() - lastRateFetchedAt >= RATE_MAX_AGE_MS) void meter.refreshRate();
    if (Object.keys(restore).length > 0) {
      void scope.update(restore).then(() => meter.applyConfig(scope.get())).catch((err) => console.warn('[usage-meter] global restore failed:', err));
    }
  }
  // Watch the canonical namespace: mirror into runtimeConfig and keep the
  // extra-state file in sync so a settings-page edit survives a restart.
  scope.watch((next: unknown) => {
    meter.applyConfig(next as Record<string, unknown>);
    savePersistedConfig();
  });
  ctx.sessionProjections.register(usageCostProjection);

  // Billing-method templates for the popup dropdown.
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/usage-meter/templates',
    handler: async (_req: unknown, res: { writeHead: (s: number, h: Record<string, string>) => void; end: (s: string) => void }) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, types: BILLING_TYPES }));
    },
  });

  // Force a fresh USD→CNY rate on demand (popup currency switch).
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/usage-meter/refresh-rate',
    handler: async (_req: unknown, res: { writeHead: (s: number, h: Record<string, string>) => void; end: (s: string) => void }) => {
      await meter.refreshRate();
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, usdToCny: currentPrices.usdToCny, rateUpdatedAt: lastRateFetchedAt }));
    },
  });

  // Config channel: a small HTTP endpoint so the browser popup can save config.
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/usage-meter/config',
    handler: async (req: { method?: string; [Symbol.asyncIterator](): AsyncIterator<string> }, res: { writeHead: (s: number, h?: Record<string, string>) => void; end: (s?: string) => void }) => {
      if (req.method === 'GET') {
        const cfg = meter.getConfig();
        const safe = { ...cfg, deepseekApiKey: cfg.deepseekApiKey ? '***' : undefined };
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true, config: safe, providers: providerConfigs, priceOverrides, balances, rate: { usdToCny: currentPrices.usdToCny, rateUpdatedAt: lastRateFetchedAt } }));
        return;
      }
      if (req.method === 'POST') {
        let body = '';
        for await (const chunk of req) body += String(chunk);
        const patch = JSON.parse(body) as Record<string, unknown>;
        // GLOBAL scalar settings go through the canonical settings namespace
        // (single write path; persists to settings.yaml), so the popup and the
        // settings UI can never diverge. Provider/model overrides + the ledger
        // are EXTRA state and are persisted by savePersistedConfig() below.
        const globalPatch: Record<string, unknown> = {};
        if (patch.currency !== undefined && typeof patch.currency === 'string' && patch.currency !== '') globalPatch.currency = patch.currency;
        if (patch.initialBalance !== undefined && typeof patch.initialBalance === 'number' && Number.isFinite(patch.initialBalance)) globalPatch.initialBalance = patch.initialBalance;
        if (patch.budget !== undefined && typeof patch.budget === 'number' && Number.isFinite(patch.budget)) globalPatch.budget = patch.budget;
        if (patch.priceSourceUrl !== undefined) globalPatch.priceSourceUrl = patch.priceSourceUrl;
        if (patch.refreshIntervalMs !== undefined) globalPatch.refreshIntervalMs = patch.refreshIntervalMs;
        if (patch.deepseekApiKey !== undefined && patch.deepseekApiKey !== '***') globalPatch.deepseekApiKey = patch.deepseekApiKey;
        if (Object.keys(globalPatch).length > 0) {
          try {
            await scope.update(globalPatch);
          } catch (err) {
            res.writeHead(400, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: String(err) }));
            return;
          }
          // Mirror the resolved namespace value into the meter immediately; the
          // async scope.watch also fires and re-applies the same value.
          meter.applyConfig(scope.get());
        }
        let currencyChanged = false;
        let ledgerChanged = false;
        let ledgerKey: string | null = null;
        let ledgerEntry: { balance: number; currency: string } | null = null;
        if (patch.provider !== undefined && patch.provider !== null) {
          const pv = String(patch.provider);
          const pc = providerConfigs[pv] ?? (providerConfigs[pv] = {});
          // 设置页模型编辑器保存时同步的「显示币种」：驱动弹窗所有金额/单位联动。
          if (patch.displayCurrency !== undefined && typeof patch.displayCurrency === 'string' && ['CNY', 'USD'].includes(patch.displayCurrency)) {
            if (pc.currency !== patch.displayCurrency) { pc.currency = patch.displayCurrency; currencyChanged = true; }
          }
          // 共享余额开关：开启后该供应商所有模型共用一个钱包（p:<provider>）。
          if (patch.sharedBalance !== undefined && typeof patch.sharedBalance === 'boolean' && !isDeepSeekProvider(pv)) {
            pc.sharedBalance = patch.sharedBalance;
            // 开启共享时，把该供应商已有的独立模型钱包（m:<provider>/<model>）
            // 余额合并进共用钱包，避免切开关后用户看到「余额凭空消失」。
            if (patch.sharedBalance === true) {
              const targetKey = `p:${underlyingProvider(pv) ?? pv}`;
              const prefix = `${targetKey.slice(2)}/`;
              let merged = 0;
              for (const k of Object.keys(balances)) {
                if (!k.startsWith('m:') || !k.slice(2).startsWith(prefix)) continue;
                const src = balances[k];
                const dst = balances[targetKey] ?? (balances[targetKey] = { balance: 0, currency: src.currency });
                const amount = toCurrency(src.balance, src.currency, dst.currency, currentPrices.usdToCny);
                dst.balance += amount;
                merged += 1;
                delete balances[k];
              }
              if (merged > 0) ledgerChanged = true;
            }
          }
          if (patch.currency !== undefined && patch.currency !== pc.currency) {
            pc.currency = String(patch.currency);
            currencyChanged = true;
          }
          if (!isDeepSeekProvider(pv)) {
            ledgerKey = balanceKeyOf(pv, patch.model === null || patch.model === undefined ? null : String(patch.model));
            ledgerEntry = ledgerOf(ledgerKey, pc.currency ?? runtimeConfig.currency);
            if (ledgerKey !== null && ledgerEntry !== null) {
              if (patch.balance !== undefined && Number.isFinite(Number(patch.balance))) {
                // 设置页「保存单价」语义：显示值 + 其币种一起原样落盘，不换算。
                ledgerEntry.balance = Number(patch.balance);
                if (typeof patch.balanceCurrency === 'string' && ['CNY', 'USD'].includes(patch.balanceCurrency)) {
                  ledgerEntry.currency = patch.balanceCurrency;
                }
                ledgerChanged = true;
              }
              if (patch.recharge !== undefined && Number.isFinite(Number(patch.recharge)) && Number(patch.recharge) !== 0) {
                ledgerEntry.balance = ledgerEntry.balance + Number(patch.recharge);
                ledgerChanged = true;
              }
              if (patch.currency !== undefined && patch.currency !== ledgerEntry.currency) {
                if (patch.balance === undefined) {
                  if (lastRateFetchedAt === 0) await meter.refreshRate();
                  ledgerEntry.balance = toCurrency(ledgerEntry.balance, ledgerEntry.currency, String(patch.currency), currentPrices.usdToCny);
                }
                ledgerEntry.currency = String(patch.currency);
                ledgerChanged = true;
              }
            }
          }
          savePersistedConfig();
        }
        if (currencyChanged) {
          rateNeeded = true;
          void meter.refreshRate();
        }
        if (ledgerChanged && ledgerKey !== null && ledgerEntry !== null) broadcastBalance(ledgerKey, ledgerEntry, 'manual');
        if (patch.model !== undefined && patch.model !== null && patch.provider !== undefined && patch.provider !== null) {
          const key = `${patch.provider}/${patch.model}`;
          const override = patch;
          if (override.reset === true) {
            delete priceOverrides[key];
            if (BUNDLED_TABLE[key as PriceKey] !== undefined) currentPrices.table.merge({ [key as PriceKey]: BUNDLED_TABLE[key as PriceKey] as unknown as ModelPricing });
            else currentPrices.table.removeRaw(key);
          } else {
            const next = { ...(priceOverrides[key] ?? {}) } as { prices?: Partial<ModelPricing>; rows?: BillingRow[]; templateId?: string };
            if (override.prices !== undefined) next.prices = { ...(override.prices as Partial<ModelPricing>) };
            if (override.rows !== undefined) next.rows = [...(override.rows as BillingRow[])];
            if (typeof override.templateId === 'string') next.templateId = override.templateId;
            priceOverrides[key] = next;
            applyPriceOverrides();
          }
          savePersistedConfig();
        }
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
      }
      res.writeHead(405);
      res.end();
    },
  });

  // Model-directory channel: expose provider → models (from the DSH LLM runtime)
  // so the settings "供应商定价管理" block can build its provider/model UI.
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/usage-meter/models',
    handler: async (_req: unknown, res: { writeHead: (s: number, h?: Record<string, string>) => void; end: (s?: string) => void }) => {
      const send = (status: number, doc: unknown): void => {
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(doc as string | undefined));
      };
      try {
        const llm = ctx.llm as {
          listProviders: () => Array<{ id: string; name: string }>;
          listModels: (p: string) => Promise<Array<{ id: string; name: string }>>;
        };
        const providers: Array<{ provider: string; label: string; models: Array<{ model: string; label: string }> }> = [];
        for (const p of llm.listProviders()) {
          let models: Array<{ model: string; label: string }> = [];
          try {
            models = (await llm.listModels(p.id)).map((m) => ({ model: m.id, label: m.name }));
          } catch {
            models = [];
          }
          providers.push({ provider: p.id, label: p.name, models });
        }
        send(200, { providers });
      } catch (err) {
        send(500, { providers: [], error: String(err) });
      }
    },
  });

  console.log('[usage-meter] config route registered at /api/usage-meter/config');
  currentPrices.updatedAt = Date.now();
  ctx.effect(() => {
    const ms = (meter.getConfig().refreshIntervalMs as number | undefined) ?? 4 * 60 * 60 * 1000;
    const timer = setInterval(() => meter.maybeRefresh(false), ms);
    return () => clearInterval(timer);
  });

  ctx.on('session/event', (session: object, event: { type: string; data: Record<string, unknown>; time: number }) => {
    activeSessions.add(session);
    // Track whether the active model needs a currency conversion.
    let provider: string | null = null;
    let model: string | null = null;
    try {
      const v = (ctx.sessionProjections.snapshot(session) as { values: Record<string, UsageCostValue> }).values['usageCost'];
      provider = v?.provider ?? null;
      model = v?.model ?? null;
      const pc = v?.pricing?.currency;
      rateNeeded = pc !== undefined && pc !== null && pc !== v?.currency;
    } catch {
      // keep the last known need on snapshot failure
    }
    // rc.7 safe: refresh the in-memory DeepSeek balance on every turn start; the
    // projection `view` reads it directly — nothing is written to the log.
    if (event.type === 'turn/start' && isDeepSeekProvider(provider)) void meter.refreshBalance();
    if (event.type === 'step/start') {
      stepStartBySession.set(session, { turn: event.data.turn as number, step: event.data.step as number, at: event.time });
    }
    // GLOBAL LEDGER: every usage delta (non-DeepSeek) subtracts only the delta.
    if (!isDeepSeekProvider(provider)) {
      const ue = usageEventOf(event);
      if (ue !== null) {
        const b = bucketsOf(ue.usage);
        const prev = lastUsageBySession.get(session);
        const samePrev =
          prev !== undefined && prev.turn === ue.turn && prev.step === ue.step &&
          prev.input === b.input && prev.output === b.output &&
          prev.cacheRead === b.cacheRead && prev.cacheWrite === b.cacheWrite && prev.reasoning === b.reasoning;
        if (!samePrev) {
          const p = prev !== undefined && prev.turn === ue.turn && prev.step === ue.step ? prev : undefined;
          const delta = {
            input: b.input - (p?.input ?? 0),
            output: b.output - (p?.output ?? 0),
            cacheRead: b.cacheRead - (p?.cacheRead ?? 0),
            cacheWrite: b.cacheWrite - (p?.cacheWrite ?? 0),
            reasoning: b.reasoning - (p?.reasoning ?? 0),
          };
          lastUsageBySession.set(session, { turn: ue.turn, step: ue.step, ...b });
          const ss = stepStartBySession.get(session);
          const requestStart = ss !== undefined && ss.turn === ue.turn && ss.step === ue.step ? ss.at : event.time;
          const pricing = pricingFor(provider, model, requestStart);
          if (pricing !== null) {
            const key = balanceKeyOf(provider, model);
            const ledger = ledgerOf(key, getProviderConfig(provider).currency ?? runtimeConfig.currency);
            if (key !== null && ledger !== null) {
              const deltaCost = costOf({ inputTokens: delta.input, outputTokens: delta.output, cacheReadTokens: delta.cacheRead, cacheWriteTokens: delta.cacheWrite }, pricing);
              const costInLedger = toCurrency(deltaCost, pricing.currency ?? 'CNY', ledger.currency, currentPrices.usdToCny);
              ledger.balance = ledger.balance - costInLedger;
              persist.schedule();
              broadcastBalance(key, ledger, 'deduct');
            }
          }
        }
      }
    }
    meter.maybeRefresh(isDeepSeekProvider(provider));
  });

  void meter.maybeRefresh(false);
}

export { BILLING_TYPES, Config, costBreakdown, costOf, usageCostProjection };
