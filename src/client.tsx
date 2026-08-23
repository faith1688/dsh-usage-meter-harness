/**
 * dsh-usage-meter-harness — client plugin.
 *
 * Registers one additive, session-scoped readout into the conversation's
 * `conversation.composer.dock` seat (the "ambient readout" band under the
 * composer card). The band is narrow, so the component renders a ONE-LINE
 * summary (model · cost · live balance · requests · speed) and expands a
 * detail card on click: account balance, budget, per-bucket tokens/unit
 * price/subtotal, request counts, per-turn cost ledger, and a "用户自定义设置"
 * panel to edit display currency, fund a non-DeepSeek balance (or recharge),
 * and override per-model unit prices / billing method.
 *
 * Pure reader: the host computed every number into the `usageCost`
 * projection (each in its native currency). Display-currency conversion
 * (CNY↔USD, live rate) happens here only.
 *
 * @module dsh-usage-meter-harness/client
 */
import { Fragment, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'; // SlotMap merge for the dock seat

/**
 * Slot contract for the sidebar settings page. The canonical declaration lives
 * in `@deepseek-ai/dsh-client-ui-settings` (the shell's settings base package),
 * which this plugin program does not import; the SlotMap merge below is
 * structurally identical to that declaration (list/root, owner `close`), and
 * declaration merging is additive — the shell's real declaration wins at
 * runtime composition.
 */
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'settings.section': {
      kind: 'list';
      scope: 'root';
      owner: { close: () => void };
    };
  }
}
import { costBreakdown } from './projection.ts';
import type { BillingRow, ModelPricing, UsageCostValue } from './projection.ts';
import { matchTypeId } from './billing.ts';

/** Services this client plugin requires on `ctx`. */
export const inject = ['slots'];

type DockProps = PropsRuntime<'conversation.composer.dock'>;

export function apply(ctx: ClientContext): void {
  // Wrap in slots.inject so registration waits for the dock seat's declaration
  // regardless of plugin load order.
  ctx.slots.inject('conversation.composer.dock', () =>
    ctx.slots.register(
      { name: 'conversation.composer.dock', id: 'usage-meter.readout', order: 20 },
      UsageReadout,
    ),
  );
  // Settings panel: register a full-page section in the left sidebar nav.
  // slots.inject gates the registration on the shell declaring the slot, so a
  // composition without the settings UI simply never runs this effect.
  ctx.slots.inject('settings.section', () =>
    ctx.slots.register(
      { name: 'settings.section', id: 'usage-meter', order: 20, label: () => 'dsh-usage-meter' },
      UsageMeterSettingsSection,
    ),
  );
}

// ── theme tokens (with light fallbacks) ──────────────────────────────────────
const t = {
  text: 'var(--dsw-alias-label-primary, #1f2328)',
  text2: 'var(--dsw-alias-label-secondary, #59636e)',
  text3: 'var(--dsw-alias-label-tertiary, #8b949e)',
  brand: 'var(--dsw-alias-brand-primary, #4d6bfe)',
  error: 'var(--dsw-alias-label-error, #d1242f)',
  ok: 'var(--dsw-alias-label-success, #16a34a)',
  border: 'var(--dsw-alias-border-l2, rgba(31, 35, 40, 0.12))',
  borderSoft: 'var(--dsw-alias-border-l1, rgba(31, 35, 40, 0.06))',
  card: 'var(--dsw-alias-bg-layer-3, #ffffff)',
  accent: 'var(--dsw-alias-brand-subtle, rgba(77, 107, 254, 0.1))',
};

const row: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: '4px 0',
  lineHeight: '18px',
};
const dateSep: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  color: t.text3,
  fontSize: 11,
  margin: '4px 0',
};

// ── live token-rate sampling ─────────────────────────────────────────────────
const RATE_TICK_MS = 500;
const RATE_WINDOW_MS = 3000;

function tokenRateOf(samples: Array<{ at: number; total: number }>, now: number): number | null {
  while (samples.length > 0 && now - samples[0].at > RATE_WINDOW_MS) samples.shift();
  if (samples.length < 2) return null;
  const first = samples[0];
  const last = samples[samples.length - 1];
  const elapsed = (last.at - first.at) / 1000;
  const tokens = last.total - first.total;
  return elapsed >= 0.3 && tokens > 0 ? tokens / elapsed : null;
}

function completedTurnRate(turns: UsageCostValue['turns']): number | null {
  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i];
    const durationMs = turn.endedAt - turn.startedAt;
    if (turn.endedAt > 0 && turn.outputTokens > 0 && durationMs >= 300) return turn.outputTokens / (durationMs / 1000);
  }
  return null;
}

// ── formatting ───────────────────────────────────────────────────────────────
function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** Convert an amount from its native currency into the display currency. */
function toDisplay(amount: number, native: string, display: string, usdToCny: number): number {
  if (native === display) return amount;
  if (native === 'USD' && display === 'CNY') return amount * usdToCny;
  if (native === 'CNY' && display === 'USD') return amount / usdToCny;
  return amount;
}

function fmtMoney(amount: number, native: string, usage: UsageCostValue): string {
  const v = toDisplay(amount, native, usage.currency, usage.usdToCny);
  const symbol = usage.currency === 'USD' ? '$' : '¥';
  const decimals = Math.abs(v) > 0 && Math.abs(v) < 0.01 ? 4 : 2;
  return `${symbol} ${v.toFixed(decimals)}`;
}

function fmtPrice(amountPerM: number, native: string, usage: UsageCostValue): string {
  const v = toDisplay(amountPerM, native, usage.currency, usage.usdToCny);
  const symbol = usage.currency === 'USD' ? '$' : '¥';
  return `${symbol} ${v.toFixed(v < 1 ? 3 : 2)}/M`;
}

function fmtBalance(balance: { totalBalance: number; currency: string }, usage: UsageCostValue): string {
  const v = toDisplay(balance.totalBalance, balance.currency, usage.currency, usage.usdToCny);
  const symbol = usage.currency === 'USD' ? '$' : '¥';
  return `${symbol} ${v.toFixed(2)}`;
}

function fmtTime(ms: number): string {
  if (!ms) return '--:--:--';
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function sameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

/** Force a fresh USD→CNY rate from the server; null on failure (keep last). */
async function fetchFreshRate(): Promise<{ usdToCny: number; rateUpdatedAt: number } | null> {
  try {
    const res = await fetch('/api/usage-meter/refresh-rate', { method: 'POST' });
    if (!res.ok) return null;
    const doc = (await res.json()) as { usdToCny?: unknown; rateUpdatedAt?: unknown };
    if (typeof doc?.usdToCny !== 'number') return null;
    return { usdToCny: doc.usdToCny, rateUpdatedAt: (doc.rateUpdatedAt as number) ?? Date.now() };
  } catch {
    return null;
  }
}

function turnTokensText(turn: UsageCostValue['turns'][number]): string {
  const total = turn.inputTokens + turn.cacheReadTokens + turn.cacheWriteTokens + turn.outputTokens;
  const stopped = total === 0 && turn.endedAt > 0 && (turn.endReason === 'aborted' || turn.endReason === 'interrupted');
  return stopped
    ? '对话被停止'
    : `${formatTokens(total - turn.outputTokens)} 入 / ${formatTokens(turn.outputTokens)} 出`;
}

function bucketTokens(usage: UsageCostValue, b: BillingRow['buckets'][number]): number {
  switch (b) {
    case 'input': return usage.inputTokens;
    case 'cacheRead': return usage.cacheReadTokens;
    case 'cacheWrite': return usage.cacheWriteTokens;
    case 'output': return usage.outputTokens;
  }
}

function bucketCost(bd: { input: number; cacheRead: number; cacheWrite: number; output: number }, b: BillingRow['buckets'][number]): number {
  switch (b) {
    case 'input': return bd.input;
    case 'cacheRead': return bd.cacheRead;
    case 'cacheWrite': return bd.cacheWrite;
    case 'output': return bd.output;
  }
}

function bucketPricePerM(p: ModelPricing | null, b: BillingRow['buckets'][number]): number | undefined {
  if (p === null) return undefined;
  if (p.combinedPerM !== undefined) return p.combinedPerM;
  switch (b) {
    case 'input': return p.inputPerM;
    case 'cacheRead': return p.cacheReadPerM ?? p.inputPerM;
    case 'cacheWrite': return p.cacheWritePerM ?? p.inputPerM;
    case 'output': return p.outputPerM;
  }
}

function bucketPriceKey(b: BillingRow['buckets'][number]): 'inputPerM' | 'cacheReadPerM' | 'cacheWritePerM' | 'outputPerM' {
  switch (b) {
    case 'input': return 'inputPerM';
    case 'cacheRead': return 'cacheReadPerM';
    case 'cacheWrite': return 'cacheWritePerM';
    case 'output': return 'outputPerM';
  }
}

function peakPricePerM(peak: ModelPricing['peak'], b: BillingRow['buckets'][number]): number | undefined {
  if (peak === undefined) return undefined;
  switch (b) {
    case 'input': return peak.inputPerM;
    case 'cacheRead': return peak.cacheReadPerM ?? peak.inputPerM;
    case 'cacheWrite': return peak.inputPerM;
    case 'output': return peak.outputPerM;
  }
}

function peakLabel(p: ModelPricing | null): string | null {
  if (p === null || p.peak === undefined || p.offPeak === undefined) return null;
  if (p.peakOffPeakFrom !== undefined && Date.now() < p.peakOffPeakFrom) return '峰谷价未生效';
  const h = new Date().getUTCHours();
  return (h >= 1 && h < 4) || (h >= 6 && h < 10) ? '高峰' : '低谷';
}

// ── readout ──────────────────────────────────────────────────────────────────
export function UsageReadout({ useProjection }: DockProps): ReactElement | null {
  const usage: UsageCostValue | undefined = useProjection('usageCost');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [rate, setRate] = useState<number | null>(null);
  const rateSamplesRef = useRef<Array<{ at: number; total: number }>>([]);
  const usageRef = useRef<UsageCostValue | undefined>(undefined);

  useEffect(() => {
    usageRef.current = usage;
    if (usage === undefined) {
      rateSamplesRef.current = [];
      return;
    }
    const samples = rateSamplesRef.current;
    const last = samples[samples.length - 1];
    // A replay/session reset can move the cumulative estimate backwards.
    if (last !== undefined && usage.realtimeOutputTokens < last.total) samples.length = 0;
    if (usage.realtimeUpdatedAt > 0) {
      const current = samples[samples.length - 1];
      if (current?.at !== usage.realtimeUpdatedAt || current.total !== usage.realtimeOutputTokens) {
        samples.push({ at: usage.realtimeUpdatedAt, total: usage.realtimeOutputTokens });
      }
    }
  }, [usage]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    const id = setInterval(() => {
      const u = usageRef.current;
      if (u === undefined) return;
      const live = tokenRateOf(rateSamplesRef.current, Date.now());
      setRate((previous) => live ?? previous ?? completedTurnRate(u.turns));
    }, RATE_TICK_MS);
    return () => clearInterval(id);
  }, []);

  if (usage === undefined) return null;
  const p = usage.pricing;
  const native = p?.currency ?? 'CNY';
  const breakdown = costBreakdown(usage, p);
  const billedInput = usage.inputTokens + usage.cacheReadTokens + usage.cacheWriteTokens;
  const hitRate = billedInput > 0 ? Math.round((usage.cacheReadTokens / billedInput) * 1000) / 10 : null;
  const peak = peakLabel(p);
  const accountBalance = usage.accountBalance;
  const isDeepSeek = usage.provider === 'deepseek-official' || usage.provider === 'deepseek';
  const balanceKind = accountBalance !== null ? 'account' : 'none';
  const balanceNegative = balanceKind === 'account' && (accountBalance?.totalBalance ?? 0) < 0;
  const pricesConverted = native !== usage.currency;
  const turns = [...usage.turns].reverse();
  const remaining = usage.remainingBudget;
  const overBudget = remaining !== null && remaining < 0;
  const budgetRatio =
    usage.budget !== null && usage.budget > 0 ? Math.max(0, Math.min(1, (remaining ?? 0) / usage.budget)) : null;

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title="用量 / 费用详情"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          maxWidth: '100%',
          padding: '2px 8px',
          border: `1px solid ${open ? t.border : 'transparent'}`,
          borderRadius: 999,
          background: open ? t.accent : 'transparent',
          color: t.text2,
          fontSize: 11,
          lineHeight: '16px',
          fontVariantNumeric: 'tabular-nums',
          cursor: 'pointer',
          transition: 'background .12s ease, border-color .12s ease',
        }}
      >
        <span style={{ fontWeight: 600, color: t.text, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {usage.model ?? '未选择模型'}
        </span>
        <span style={{ color: t.text3, whiteSpace: 'nowrap' }}>·</span>
        <span style={{ fontWeight: 700, color: p ? t.brand : t.text3, whiteSpace: 'nowrap' }}>
          {p ? fmtMoney(usage.estimatedCost, usage.currency, usage) : '无价格'}
        </span>
        {(balanceKind !== 'none' || (isDeepSeek && accountBalance === null)) && (
          <span
            title={
              accountBalance !== null
                ? `${accountBalance.source === 'computed' ? '计算' : '更新'}于 ${fmtTime(accountBalance.updatedAt)}${isDeepSeek ? '（官网余额刷新有延迟）' : ''}${pricesConverted ? ` · 汇率 1USD≈${usage.usdToCny.toFixed(4)}CNY${usage.rateUpdatedAt > 0 ? ` · 更新于 ${fmtTime(usage.rateUpdatedAt)}` : ''}` : ''}`
                : '等待余额配置…'
            }
            style={{
              fontWeight: 600,
              color: accountBalance === null ? t.text3 : balanceNegative ? t.error : t.ok,
              background: accountBalance === null ? 'rgba(139, 148, 158, 0.10)' : balanceNegative ? 'rgba(209, 36, 47, 0.10)' : 'rgba(22, 163, 74, 0.10)',
              borderRadius: 999,
              padding: '0 6px',
              whiteSpace: 'nowrap',
            }}
          >
            {accountBalance === null ? '余额 获取中…' : `${balanceNegative ? '透支 ' : '余额 '}${fmtBalance(accountBalance, usage)}`}
          </span>
        )}
        <span style={{ color: t.text3, whiteSpace: 'nowrap' }}>{usage.requestCount} 次</span>
        {rate !== null && <span style={{ color: t.text3, whiteSpace: 'nowrap' }}>· 速度 {rate.toFixed(1)} tokens/s</span>}
        <span style={{ color: t.text3, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .12s ease', fontSize: 9 }}>▼</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: 0,
            zIndex: 40,
            width: 480,
            maxWidth: 'calc(100vw - 32px)',
            background: t.card,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            boxShadow: '0 12px 32px rgba(31, 35, 40, 0.18)',
            padding: '12px 14px',
            fontSize: 12,
            color: t.text,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{usage.model ?? '未选择模型'}</span>
            <span style={{ color: t.text3, fontSize: 11 }}>{usage.provider ?? ''}</span>
          </div>
          <div style={{ color: t.text3, fontSize: 11, marginTop: 2 }}>
            价格来源 {p?.source === 'remote' ? '远端' : '内置'} · 更新于{' '}
            {p?.updatedAt ? new Date(p.updatedAt).toLocaleString() : '—'}
            {peak !== null ? ` · ${peak}` : ''}
            {pricesConverted ? ` · 汇率 1USD=${usage.usdToCny.toFixed(4)}CNY` : ''}
          </div>

          <div style={{ ...row, borderBottom: `1px solid ${t.borderSoft}`, paddingTop: 8, paddingBottom: 8 }}>
            <span style={{ color: t.text2 }}>{balanceKind === 'account' ? '账户余额' : '余额'}</span>
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
              <span style={{ fontWeight: 800, fontSize: 16, color: balanceKind === 'none' ? t.text3 : balanceNegative ? t.error : t.ok }}>
                {balanceKind === 'none'
                  ? isDeepSeek ? '获取中…' : '未配置'
                  : accountBalance !== null ? fmtBalance(accountBalance, usage) : '—'}
              </span>
              {accountBalance !== null && accountBalance.updatedAt > 0 && (
                <span title={isDeepSeek ? '官网余额刷新可能有延迟，余额按「锚点 − 本地消费」实时计算' : '余额 = 账户余额 − 累计消费（全局账本）'} style={{ color: t.text3, fontSize: 10, whiteSpace: 'nowrap' }}>
                  {accountBalance.source === 'computed' ? '计算' : '更新'}于 {fmtTime(accountBalance.updatedAt)}
                  {isDeepSeek ? ' · 官网刷新有延迟' : ''}
                </span>
              )}
              {pricesConverted && balanceKind !== 'none' && (
                <span style={{ color: t.text3, fontSize: 10, whiteSpace: 'nowrap' }}>
                  汇率 1USD≈{usage.usdToCny.toFixed(4)}CNY{usage.rateUpdatedAt > 0 ? ` · 更新于 ${fmtTime(usage.rateUpdatedAt)}` : ''}
                </span>
              )}
            </span>
          </div>

          <div style={{ ...row, paddingTop: 6 }}>
            <span style={{ color: t.text2 }}>本次对话费用</span>
            <span style={{ fontWeight: 700, color: p ? t.brand : t.text3 }}>{p ? fmtMoney(usage.estimatedCost, usage.currency, usage) : '无价格数据'}</span>
          </div>

          {/* budget (src 保留功能) */}
          {usage.budget !== null && (
            <div style={{ borderTop: `1px solid ${t.borderSoft}`, marginTop: 4, paddingTop: 8 }}>
              <div style={{ ...row, paddingTop: 0 }}>
                <span style={{ color: t.text2 }}>预算 {fmtMoney(usage.budget, usage.currency, usage)}</span>
                <span style={{ color: t.text3 }}>已用 {fmtMoney(usage.estimatedCost, usage.currency, usage)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 6, borderRadius: 999, background: t.borderSoft, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.round((budgetRatio ?? 0) * 100)}%`, height: '100%', borderRadius: 999, background: overBudget ? t.error : t.brand, transition: 'width .2s ease' }} />
                </div>
                <span style={{ fontWeight: 700, color: overBudget ? t.error : t.text, whiteSpace: 'nowrap' }}>
                  {overBudget ? '超支 ' : '剩余 '}{fmtMoney(Math.abs(remaining ?? 0), usage.currency, usage)}
                </span>
              </div>
            </div>
          )}

          <div style={{ marginTop: 8 }}>
            <div style={{ ...row, paddingBottom: 2, color: t.text3, fontSize: 11 }}>
              <span style={{ flex: 1 }}>用量</span>
              <span style={{ width: 92, textAlign: 'right' }}>单价</span>
              <span style={{ width: 92, textAlign: 'right' }}>小计</span>
            </div>
            {usage.priceRows.map((r) => {
              const primary = r.buckets[0] ?? 'input';
              const tokens = r.buckets.reduce((s, b) => s + bucketTokens(usage, b), 0);
              const cost = r.buckets.reduce((s, b) => s + bucketCost(breakdown, b), 0);
              const price = bucketPricePerM(p, primary);
              return <BucketRow key={r.label + r.buckets.join(',')} label={r.label} tokens={tokens} price={price} cost={cost} native={native} usage={usage} accent={primary === 'cacheRead' ? t.ok : undefined} />;
            })}
            {usage.reasoningTokens > 0 && (
              <div style={{ ...row, color: t.text3, fontSize: 11, paddingTop: 1 }}>
                <span>推理 {formatTokens(usage.reasoningTokens)}（已含在输出内）</span>
              </div>
            )}
            {p !== null && p.discount !== undefined && p.discount < 1 && (
              <div style={{ color: t.brand, fontSize: 10, paddingTop: 2 }}>Batch 半价：小计已按 ×{p.discount} 计算（单价列仍为标准价）</div>
            )}
          </div>

          <div style={{ ...row, color: t.text2, fontSize: 11, borderTop: `1px solid ${t.borderSoft}`, marginTop: 4, paddingTop: 6 }}>
            <span>请求 {usage.requestCount} 次成功 · {usage.stepCount} 次尝试</span>
            {hitRate !== null && <span style={{ color: t.text3 }}>缓存命中 {hitRate}%</span>}
          </div>

          {turns.length > 0 && (
            <div style={{ borderTop: `1px solid ${t.borderSoft}`, marginTop: 6, paddingTop: 6 }}>
              <div style={{ color: t.text3, fontSize: 11, marginBottom: 2 }}>每轮费用（共 {turns.length} 轮）</div>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {turns.map((turn, i) => {
                  const prev = i > 0 ? turns[i - 1] : undefined;
                  const newDay = prev === undefined || !sameDay(prev.startedAt, turn.startedAt);
                  return (
                    <Fragment key={turn.turn}>
                      {newDay && (
                        <div style={dateSep}>
                          <span style={{ flex: 1, height: 1, background: t.borderSoft }} />
                          <span>{fmtDate(turn.startedAt)}</span>
                          <span style={{ flex: 1, height: 1, background: t.borderSoft }} />
                        </div>
                      )}
                      <div style={{ ...row, padding: '2px 0' }}>
                        <span style={{ color: t.text2, whiteSpace: 'nowrap' }}>
                          第 {turn.turn} 轮 · {fmtTime(turn.startedAt)}
                          {turn.endedAt > 0 ? `–${fmtTime(turn.endedAt)}` : ''}
                          {turn.model ? ` · ${turn.model}` : ''}
                        </span>
                        <span style={{ color: t.text3 }}>{turnTokensText(turn)}</span>
                        <span style={{ fontWeight: 600, color: t.error }}>-{fmtMoney(turn.cost, turn.currency, usage)}</span>
                      </div>
                    </Fragment>
                  );
                })}
              </div>
            </div>
          )}

          <SettingsSection usage={usage} />
        </div>
      )}
    </div>
  );
}

// ── settings panel page (full page in the left sidebar) ──────────────────────
function UsageMeterSettingsSection(_props: { close: () => void }): ReactElement {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveOk, setSaveOk] = useState(false);

  const [initialBalance, setInitialBalance] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [keySaved, setKeySaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/usage-meter/config');
        if (!res.ok) { setLoadError(`加载失败 (${res.status})`); return; }
        const doc = (await res.json()) as {
          config?: Record<string, unknown>;
          providers?: Record<string, { currency?: string }>;
        };
        if (cancelled) return;
        const c = doc.config ?? {};
        const get = (v: unknown) => (v === null || v === undefined ? '' : String(v));
        setInitialBalance(get(c.initialBalance));
        setKeySaved(c.deepseekApiKey === '***');
      } catch (err) {
        if (!cancelled) { console.warn('[usage-meter] load config failed', err); setLoadError('加载失败'); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const field: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '6px 0' };
  const label: CSSProperties = { fontSize: 13, color: t.text2, minWidth: 120 };
  const input: CSSProperties = { flex: 1, maxWidth: 320, padding: '4px 8px', border: `1px solid ${t.border}`, borderRadius: 6, fontSize: 13, background: t.card, color: t.text };
  const select: CSSProperties = { padding: '4px 8px', border: `1px solid ${t.border}`, borderRadius: 6, fontSize: 13, background: t.card, color: t.text };

  const msToReadable = (ms: string): string => {
    const n = Number(ms);
    if (Number.isNaN(n) || n <= 0) return ms;
    return n >= 86400000 ? `${Math.round(n / 86400000)} 天` : n >= 3600000 ? `${Math.round(n / 3600000)} 小时` : n >= 60000 ? `${Math.round(n / 60000)} 分钟` : `${Math.round(n / 1000)} 秒`;
  };
  const readableToMs = (s: string): number => {
    const m = /^\s*(\d+)\s*(秒|分钟|小时|天)\s*$/.exec(s);
    if (m) { const k = Number(m[1]); const [unit] = m.slice(2); const mult = unit === '秒' ? 1000 : unit === '分钟' ? 60000 : unit === '小时' ? 3600000 : 86400000; return k * mult; }
    const n = Number(s);
    return Number.isNaN(n) ? 0 : n;
  };

  const save = async () => {
    setSaving(true);
    try {
      const patch: Record<string, unknown> = {};
      if (initialBalance.trim() !== '') { const n = Number(initialBalance); if (!Number.isNaN(n) && n >= 0) patch.initialBalance = n; }
      if (apiKey.trim() !== '' && apiKey !== '***') patch.deepseekApiKey = apiKey.trim();
      patch.provider = '*';
      const res = await fetch('/api/usage-meter/config', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch) });
      if (res.ok) {
        setSaveOk(true); setSaveMsg('已保存'); setKeySaved(apiKey.trim() !== '' ? true : keySaved);
      } else { setSaveOk(false); setSaveMsg(`保存失败 (${res.status})`); }
    } catch (err) {
      console.warn('[usage-meter] save config failed', err);
      setSaveOk(false); setSaveMsg('保存失败');
    }
    setSaving(false);
    window.setTimeout(() => { setSaveMsg(''); setSaveOk(false); }, 2500);
  };

  return (
    <div style={{ padding: '16px 24px 24px', fontSize: 13, color: t.text }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>dsh-usage-meter</h2>
      <p style={{ color: t.text3, fontSize: 12, margin: '0 0 12px' }}>
        DeepSeek 用量计量 · 全局设置。单价与峰谷计费请在「会话 · 用量卡片 → 用户自定义设置」中编辑。
      </p>
      {loadError !== '' && (
        <div style={{ marginBottom: 12, padding: '8px 10px', border: `1px solid ${t.error}`, borderRadius: 6, color: t.error, fontSize: 12 }}>{loadError}</div>
      )}
      {loading ? (
        <div style={{ color: t.text3, fontSize: 13 }}>加载全局配置…</div>
      ) : (
        <div>
          <div style={field}>
            <label style={label} htmlFor="um-init">非 DeepSeek 初始余额</label>
            <input id="um-init" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} placeholder="如 100（CNY）" style={input} />
          </div>
          <div style={field}>
            <label style={label} htmlFor="um-key">DeepSeek API Key</label>
            <div style={{ flex: 1, display: 'flex', gap: 8, maxWidth: 320, alignItems: 'center' }}>
              {keySaved ? (
                <span style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(22, 163, 74, 0.10)', color: t.ok, fontSize: 12, whiteSpace: 'nowrap' }}>已保存</span>
              ) : (
                <span style={{ color: t.text3, fontSize: 12, whiteSpace: 'nowrap' }}>未配置</span>
              )}
              <input
                id="um-key"
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); }}
                placeholder={keySaved ? '留空保留当前 Key；填写以覆盖' : '如 sk-…'}
                autoComplete="off"
                style={{ ...input, maxWidth: 200 }}
              />
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" onClick={save} disabled={saving} style={{ fontSize: 13, padding: '6px 18px', borderRadius: 6, border: `1px solid ${t.border}`, background: saving ? 'rgba(139, 148, 158, 0.10)' : t.accent, color: saving ? t.text3 : t.text, cursor: saving ? 'default' : 'pointer' }}>
              {saving ? '保存中…' : '保存'}
            </button>
            {saveMsg !== '' && (
              <span style={{ fontSize: 12, color: saveOk ? t.ok : t.error }}>
                {saveMsg}{saveOk && apiKey.trim() !== '' ? ' · 已更新 API Key' : ''}
              </span>
            )}
          </div>
          <p style={{ color: t.text3, fontSize: 11, marginTop: 12, marginBottom: 0 }}>
            会话级单价、计费方式与峰谷价在「对话 · 用量卡片 → 用户自定义设置」中编辑。
          </p>
        </div>
      )}
    </div>
  );
}

// ── per-provider settings (collapsible) ──────────────────────────────────────
function SettingsSection({ usage }: { usage: UsageCostValue }): ReactElement {
  const isDeepSeek = usage.provider === 'deepseek-official' || usage.provider === 'deepseek';
  const [openSettings, setOpenSettings] = useState(false);
  const [cfgCurrency, setCfgCurrency] = useState(usage.currency);
  const [currencyDirty, setCurrencyDirty] = useState(false);
  const [modelCurrency, setModelCurrency] = useState(usage.basePricing?.currency ?? 'CNY');
  const [modelCurrencyDirty, setModelCurrencyDirty] = useState(false);
  const [rateInfo, setRateInfo] = useState({ usdToCny: usage.usdToCny, rateUpdatedAt: usage.rateUpdatedAt });
  const conversionActive = cfgCurrency !== modelCurrency;
  const [cfgBalance, setCfgBalance] = useState('');
  const [balanceDirty, setBalanceDirty] = useState(false);
  const [cfgRecharge, setCfgRecharge] = useState('');
  const [saved, setSaved] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const unitSym = cfgCurrency === 'USD' ? '$' : '¥';

  useEffect(() => {
    if (currencyDirty) return;
    setCfgCurrency(usage.currency);
  }, [usage.model, usage.currency]);

  useEffect(() => {
    if (modelCurrencyDirty) return;
    setModelCurrency(usage.basePricing?.currency ?? 'CNY');
  }, [usage.model, usage.basePricing?.currency]);

  useEffect(() => {
    if (balanceDirty) return;
    if (usage.accountBalance !== null) {
      const live = toDisplay(usage.accountBalance.totalBalance, usage.accountBalance.currency, cfgCurrency, usage.usdToCny);
      setCfgBalance(String(Number(live.toFixed(2))));
    }
  }, [usage.accountBalance?.totalBalance, usage.accountBalance?.currency, cfgCurrency, balanceDirty]);

  const onCurrencyChange = (next: string) => {
    if (next === cfgCurrency) return;
    const cur = Number(cfgBalance);
    if (!Number.isNaN(cur) && cfgBalance.trim() !== '') {
      setCfgBalance(String(Number(toDisplay(cur, cfgCurrency, next, usage.usdToCny).toFixed(2))));
    }
    setBalanceDirty(false);
    setCurrencyDirty(true);
    setCfgCurrency(next);
    if (next !== modelCurrency) {
      void fetchFreshRate().then((fresh) => { if (fresh !== null) setRateInfo(fresh); });
    }
  };

  const onPricingCurrencyChange = (next: string) => {
    setModelCurrencyDirty(true);
    setModelCurrency(next);
    if (next !== cfgCurrency) {
      void fetchFreshRate().then((fresh) => { if (fresh !== null) setRateInfo(fresh); });
    }
  };

  const save = async () => {
    const patch: Record<string, unknown> = { provider: usage.provider, model: usage.model, currency: cfgCurrency };
    if (!isDeepSeek) {
      const bal = Number(cfgBalance);
      if (cfgBalance.trim() !== '' && !Number.isNaN(bal)) patch.balance = bal;
      const rechargeNum = Number(cfgRecharge);
      if (cfgRecharge.trim() !== '' && !Number.isNaN(rechargeNum) && rechargeNum !== 0) patch.recharge = rechargeNum;
      setCfgRecharge('');
    }
    try {
      const res = await fetch('/api/usage-meter/config', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      });
      setSaved(res.ok);
      if (res.ok) setBalanceDirty(false);
      setSaveMsg(res.ok ? '已保存，余额已更新' : '保存失败');
      window.setTimeout(() => { setSaved(false); setSaveMsg(''); }, 2500);
    } catch (err) {
      console.warn('[usage-meter] save failed', err);
      setSaveMsg('保存失败');
    }
  };

  return (
    <div style={{ borderTop: `1px solid ${t.borderSoft}`, marginTop: 6, paddingTop: 6 }}>
      <button
        type="button"
        onClick={() => setOpenSettings((o) => !o)}
        aria-expanded={openSettings}
        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: t.text2, background: 'transparent', border: 'none', padding: '2px 0', cursor: 'pointer' }}
      >
        <span>用户自定义设置</span>
        <span style={{ fontSize: 9, transform: openSettings ? 'rotate(180deg)' : 'none', transition: 'transform .12s ease' }}>▼</span>
      </button>

      {openSettings && (
        <div>
          <div style={{ color: t.text3, fontSize: 10, marginBottom: 4 }}>保存后余额立即生效；模板修改需刷新浏览器生效</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <label style={{ fontSize: 11, color: t.text2 }}>币种</label>
            <select value={cfgCurrency} onChange={(e) => onCurrencyChange(e.target.value)} style={{ fontSize: 12, padding: '2px 4px' }}>
              <option value="CNY">CNY（人民币）</option>
              <option value="USD">USD（美元）</option>
            </select>
            {isDeepSeek && (
              <button type="button" onClick={save} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, border: `1px solid ${t.border}`, background: t.accent, color: t.text, cursor: 'pointer' }}>
                {saved ? '已保存' : '保存'}
              </button>
            )}
            {isDeepSeek && saveMsg !== '' && <span style={{ color: t.ok, fontSize: 10 }}>{saveMsg}</span>}
          </div>

          {!isDeepSeek && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <label style={{ fontSize: 11, color: t.text2 }}>账户余额（{unitSym}）</label>
              <input value={cfgBalance} onChange={(e) => { setCfgBalance(e.target.value); setBalanceDirty(true); }} placeholder={`如 100${unitSym}`} style={{ width: 84, fontSize: 12, padding: '2px 4px' }} />
              <label style={{ fontSize: 11, color: t.text2 }}>充值（{unitSym}，可负）</label>
              <input value={cfgRecharge} onChange={(e) => setCfgRecharge(e.target.value)} placeholder={`如 20${unitSym}`} style={{ width: 84, fontSize: 12, padding: '2px 4px' }} />
              <button type="button" onClick={save} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, border: `1px solid ${t.border}`, background: t.accent, color: t.text, cursor: 'pointer' }}>
                {saved ? '已保存' : '保存'}
              </button>
              {saveMsg !== '' && <span style={{ color: t.ok, fontSize: 10 }}>{saveMsg}</span>}
            </div>
          )}

          <PriceEditor
            usage={usage}
            onPricingCurrencyChange={onPricingCurrencyChange}
            onResetCurrency={(c) => { setCfgCurrency(c); setCurrencyDirty(false); setModelCurrency(c); setModelCurrencyDirty(false); }}
          />
          {conversionActive && (
            <div style={{ color: t.text3, fontSize: 10, marginTop: 2 }}>
              汇率：1 USD ≈ {rateInfo.usdToCny.toFixed(4)} CNY · 更新于 {fmtTime(rateInfo.rateUpdatedAt)}（{modelCurrency} → {cfgCurrency} 需换算）
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── editable per-model price editor ──────────────────────────────────────────
function PriceEditor({
  usage,
  onPricingCurrencyChange,
  onResetCurrency,
}: {
  usage: UsageCostValue;
  onPricingCurrencyChange: (c: string) => void;
  onResetCurrency: (c: string) => void;
}): ReactElement {
  const model = usage.model;
  const rows = usage.priceRows;
  const base = usage.basePricing;
  const isDeepSeek = usage.provider === 'deepseek-official' || usage.provider === 'deepseek';
  const peakMode = base?.peak !== undefined && base?.offPeak !== undefined;
  const [labels, setLabels] = useState<string[]>(() => rows.map((r) => r.label));
  const [prices, setPrices] = useState<string[]>(() =>
    rows.map((r) => {
      const b = r.buckets[0] ?? 'input';
      const v = peakMode ? (peakPricePerM(base!.peak, b) ?? bucketPricePerM(base, b)) : bucketPricePerM(base, b);
      return v === undefined ? '' : String(v);
    }),
  );
  const [currency, setCurrency] = useState(base?.currency ?? 'CNY');
  const [rowsState, setRowsState] = useState<BillingRow[]>(() => rows);
  const [billing, setBilling] = useState({
    combined: base?.combinedPerM !== undefined,
    discount: base?.discount,
    peak: peakMode,
  });
  const [types, setTypes] = useState<Array<{ id: string; label: string; rows: BillingRow[]; mode: string; peak?: boolean; note?: string }>>([]);
  const [typeKey, setTypeKey] = useState('');
  const [typeNote, setTypeNote] = useState('');
  const [msg, setMsg] = useState('');
  const [justReset, setJustReset] = useState(false);
  // Editable off-peak (谷价) per bucket; empty = derive from peak×0.5 on save.
  const [offPeakPrices, setOffPeakPrices] = useState<string[]>(() =>
    peakMode
      ? rows.map((r) => {
          const b = r.buckets[0] ?? 'input';
          const v = peakPricePerM(base!.offPeak, b) ?? bucketPricePerM(base, b);
          return v === undefined ? '' : String(v);
        })
      : [],
  );
  // Peak/off-peak schedule: which Beijing weekdays split + the peak-hour windows (minutes).
  const [peakDays, setPeakDays] = useState<number[]>(() => base?.peakDays ?? [1, 2, 3, 4, 5]);
  const [peakWindows, setPeakWindows] = useState<Array<{ start: number; end: number }>>(() => base?.peakWindows ?? [{ start: 540, end: 720 }, { start: 840, end: 1080 }]);
  const [windowText, setWindowText] = useState(() => (base?.peakWindows ?? [{ start: 540, end: 720 }, { start: 840, end: 1080 }]).map((w) => `${Math.floor(w.start / 60)}:${String(w.start % 60).padStart(2, '0')}-${Math.floor(w.end / 60)}:${String(w.end % 60).padStart(2, '0')}`).join(', '));
  const sym = currency === 'USD' ? '$' : '¥';

  useEffect(() => {
    if (isDeepSeek || types.length > 0) return;
    fetch('/api/usage-meter/templates')
      .then((r) => (r.ok ? r.json() : null))
      .then((doc) => { if ((doc as { types?: unknown } | null)?.types) setTypes((doc as { types: Array<{ id: string; label: string; rows: BillingRow[]; mode: string; peak?: boolean; note?: string }> }).types); })
      .catch(() => {});
  }, [isDeepSeek, types.length]);

  useEffect(() => {
    if (types.length === 0 || isDeepSeek) return;
    const idx = types.findIndex((tp) => tp.id === matchTypeId(base));
    if (idx >= 0 && typeKey === '') {
      setTypeKey(String(idx));
      setTypeNote(types[idx]?.note ?? '');
    }
  }, [types, base, isDeepSeek, typeKey]);

  if (!model || rowsState.length === 0) return <></>;

  const applyTemplate = (key: string) => {
    setTypeKey(key);
    if (key === '') { setTypeNote(''); return; }
    const tpl = types[Number(key)];
    if (tpl === undefined) return;
    setTypeNote(tpl.note ?? '');
    if (tpl.mode === 'keep') {
      setBilling((b) => ({ combined: b.combined, discount: 0.5, peak: b.peak }));
      setMsg('已启用 Batch 半价（×0.5），可修改后保存');
      window.setTimeout(() => setMsg(''), 3000);
      return;
    }
    const prefill = (b: BillingRow['buckets'][number]) => {
      const v = tpl.peak === true ? (peakPricePerM(base?.peak, b) ?? bucketPricePerM(base, b)) : bucketPricePerM(base, b);
      return v === undefined ? '' : String(v);
    };
    setRowsState(tpl.rows);
    setLabels(tpl.rows.map((r) => r.label));
    setPrices(tpl.rows.map((r) => prefill(r.buckets[0] ?? 'input')));
    setBilling({ combined: tpl.mode === 'combined', discount: undefined, peak: tpl.peak === true });
    setMsg(`已载入「${tpl.label}」计费方式，可修改后保存`);
    window.setTimeout(() => setMsg(''), 3000);
  };

  const onCurrencySelect = async (next: string) => {
    if (next === currency) return;
    let rate = usage.usdToCny;
    if (next !== (base?.currency ?? 'CNY')) {
      const fresh = await fetchFreshRate();
      if (fresh !== null) rate = fresh.usdToCny;
    }
    setPrices((ps) => ps.map((p) => {
      const n = Number(p);
      return p.trim() === '' || Number.isNaN(n) ? p : String(Number(toDisplay(n, currency, next, rate).toFixed(4)));
    }));
    setCurrency(next);
    onPricingCurrencyChange?.(next);
  };

  const post = async (body: unknown): Promise<boolean> => {
    try {
      const res = await fetch('/api/usage-meter/config', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      return res.ok;
    } catch { return false; }
  };

  const flash = (text: string) => { setMsg(text); window.setTimeout(() => setMsg(''), 3500); };

  const save = async () => {
    const pricePatch: Record<string, number> = {};
    rowsState.forEach((r, i) => {
      const raw = (prices[i] ?? '').trim();
      if (raw === '') return;
      const v = Number(raw);
      if (!Number.isNaN(v) && v >= 0) pricePatch[bucketPriceKey(r.buckets[0] ?? 'input')] = v;
    });
    if (billing.combined) {
      const combined = pricePatch.inputPerM;
      if (typeof combined === 'number' && combined >= 0) {
        pricePatch.combinedPerM = combined;
        pricePatch.inputPerM = combined;
        pricePatch.outputPerM = combined;
      }
    }
    if (billing.discount !== undefined) pricePatch.discount = billing.discount;
    if (billing.peak) {
      const peak: Record<string, number> = {};
      const offPeak: Record<string, number> = {};
      rowsState.forEach((r, i) => {
        const key = bucketPriceKey(r.buckets[0] ?? 'input');
        const pvRaw = (prices[i] ?? '').trim();
        const pv = Number(pvRaw);
        if (pvRaw !== '' && !Number.isNaN(pv) && pv >= 0) peak[key] = pv;
        const offRaw = ((offPeakPrices[i] ?? '') as string).trim();
        const ov = Number(offRaw);
        if (offRaw === '') { if (!Number.isNaN(pv) && pv >= 0) offPeak[key] = pv * 0.5; }
        else if (!Number.isNaN(ov) && ov >= 0) offPeak[key] = ov;
      });
      if (Object.keys(peak).length > 0) {
        pricePatch.peak = peak as unknown as number;
        pricePatch.offPeak = offPeak as unknown as number;
        pricePatch.peakDays = [...peakDays] as unknown as number;
        pricePatch.peakWindows = windowText.split(',').map((s) => {
          const m = /^\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\s*$/.exec(s);
          return m ? { start: Number(m[1]) * 60 + Number(m[2]), end: Number(m[3]) * 60 + Number(m[4]) } : null;
        }).filter((x): x is { start: number; end: number } => x !== null) as unknown as number;
      }
    }
    pricePatch.currency = currency as unknown as number;
    const ok = await post({
      provider: usage.provider,
      model,
      prices: pricePatch,
      rows: rowsState.map((r, i) => ({ label: (labels[i] ?? '').trim() || r.label, buckets: r.buckets })),
    });
    flash(ok ? '已保存，请刷新浏览器后生效' : '保存失败');
  };

  const reset = async () => {
    if (usage.officialPrice !== null) {
      const op = usage.officialPrice;
      const ok = await post({ provider: usage.provider, model, reset: true });
      if (ok) {
        const opPeak = op.pricing.peak !== undefined && op.pricing.offPeak !== undefined;
        setRowsState(op.rows);
        setLabels(op.rows.map((r) => r.label));
        setPrices(op.rows.map((r) => {
          const b = r.buckets[0] ?? 'input';
          const v = opPeak ? (peakPricePerM(op.pricing.peak, b) ?? bucketPricePerM(op.pricing, b)) : bucketPricePerM(op.pricing, b);
          return v === undefined ? '' : String(v);
        }));
        setBilling({ combined: op.pricing.combinedPerM !== undefined, discount: op.pricing.discount, peak: opPeak });
        setCurrency(op.pricing.currency ?? usage.currency);
        const tIdx = types.findIndex((tp) => tp.id === matchTypeId(op.pricing));
        if (tIdx >= 0) { setTypeKey(String(tIdx)); setTypeNote(types[tIdx]?.note ?? ''); }
        onResetCurrency?.(op.pricing.currency ?? usage.currency);
        setJustReset(true);
        window.setTimeout(() => setJustReset(false), 1600);
        flash(ok ? '已重置为该模型官方价格，请刷新浏览器后生效' : '重置失败');
      }
      return;
    }
    const tIdx = types.findIndex((tp) => tp.id === matchTypeId(base));
    if (tIdx >= 0) applyTemplate(String(tIdx));
    setCurrency(base?.currency ?? usage.currency);
    onResetCurrency?.(base?.currency ?? usage.currency);
    setJustReset(true);
    window.setTimeout(() => setJustReset(false), 1600);
    flash('已重置为该计费方式结构，请核对单价后点保存单价生效');
  };

  return (
    <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${t.borderSoft}` }}>
      <div style={{ color: t.text2, fontSize: 11, marginBottom: 2 }}>模型单价编辑（{model} · 单位：每百万tokens {sym}）</div>

      {!isDeepSeek && (
        <div style={{ marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <label style={{ fontSize: 11, color: t.text2 }}>计费方式</label>
            <select value={typeKey} onChange={(e) => applyTemplate(e.target.value)} style={{ fontSize: 12, padding: '2px 4px', maxWidth: 320 }}>
              <option value="">（选择计费方式预填）</option>
              {types.map((tpl, i) => <option key={tpl.id} value={String(i)}>{tpl.label}</option>)}
            </select>
            <label style={{ fontSize: 11, color: t.text2 }}>币种</label>
            <select value={currency} onChange={(e) => void onCurrencySelect(e.target.value)} style={{ fontSize: 12, padding: '2px 4px' }}>
              <option value="CNY">CNY（人民币）</option>
              <option value="USD">USD（美元）</option>
            </select>
          </div>
          {typeNote !== '' && <div style={{ color: t.text3, fontSize: 10, marginTop: 2 }}>{typeNote}</div>}
        </div>
      )}

      <div style={{ ...row, paddingBottom: 2, color: t.text3, fontSize: 10 }}>
        <span style={{ flex: 1 }}>用量名称（可改）</span>
        <span style={{ width: 86, textAlign: 'right' }}>{billing.peak ? '高峰价（可改）' : '单价（可改）'}</span>
        {billing.peak && <span style={{ width: 86, textAlign: 'right' }}>谷价（可改）</span>}
      </div>
      {billing.peak && <div style={{ color: t.text3, fontSize: 10, marginBottom: 2 }}>谷价留空 = 高峰×0.5；高峰时段默认周一到周五 9-12 / 14-18（北京时间），可在下方修改；周六周日全天按谷价</div>}

      {rowsState.map((r, i) => (
        <div key={r.buckets.join(',')} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <input
            value={labels[i] ?? ''}
            onChange={(e) => setLabels((ls) => { const n = [...ls]; n[i] = e.target.value; return n; })}
            style={{ flex: 1, minWidth: 0, fontSize: 12, padding: '1px 4px', background: justReset ? 'rgba(22, 163, 74, 0.10)' : undefined, transition: 'background .2s ease' }}
          />
          <input
            value={prices[i] ?? ''}
            onChange={(e) => setPrices((ps) => { const n = [...ps]; n[i] = e.target.value; return n; })}
            placeholder={`如 ${bucketPricePerM(base, r.buckets[0] ?? 'input') ?? ''}`}
            style={{ width: 86, fontSize: 12, padding: '1px 4px', textAlign: 'right', background: justReset ? 'rgba(22, 163, 74, 0.10)' : undefined, transition: 'background .2s ease' }}
          />
          {billing.peak && (
            <input
              value={offPeakPrices[i] ?? ''}
              onChange={(e) => setOffPeakPrices((os) => { const n = [...os]; n[i] = e.target.value; return n; })}
              placeholder="谷价"
              style={{ width: 86, fontSize: 12, padding: '1px 4px', textAlign: 'right', background: 'rgba(37, 99, 235, 0.06)' }}
            />
          )}
        </div>
      ))}

      {billing.peak && (
        <div style={{ marginTop: 4, paddingTop: 4, borderTop: `1px solid ${t.borderSoft}`, fontSize: 11, color: t.text2 }}>
          <div style={{ marginBottom: 2 }}>分峰谷的星期（不勾 = 全天按谷价；周六周日默认不勾）</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            {['日', '一', '二', '三', '四', '五', '六'].map((w, d) => (
              <label key={d} style={{ fontSize: 11 }}>
                <input
                  type="checkbox"
                  checked={peakDays.includes(d)}
                  onChange={(e) => setPeakDays((ds) => (e.target.checked ? [...ds, d] : ds.filter((x) => x !== d)))}
                /> {w}
              </label>
            ))}
          </div>
          <div style={{ marginBottom: 2 }}>高峰时段（北京时间，格式如 9:00-12:00, 14:00-18:00）</div>
          <input
            value={windowText}
            onChange={(e) => setWindowText(e.target.value)}
            placeholder="如 9:00-12:00, 14:00-18:00"
            style={{ width: 220, fontSize: 12, padding: '1px 4px' }}
          />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <button type="button" onClick={save} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, border: `1px solid ${t.border}`, background: t.accent, color: t.text, cursor: 'pointer' }}>保存单价</button>
        <button type="button" onClick={reset} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, border: `1px solid ${t.border}`, background: t.card, color: t.text, cursor: 'pointer', boxShadow: 'none' }}>重置价格</button>
        {billing.combined && <span style={{ color: t.text3, fontSize: 10 }}>合并计价</span>}
        {billing.discount !== undefined && billing.discount < 1 && <span style={{ color: t.brand, fontSize: 10 }}>Batch 半价 ×{billing.discount}</span>}
        {msg !== '' && <span style={{ color: t.ok, fontSize: 10 }}>{msg}</span>}
      </div>
    </div>
  );
}

function BucketRow(props: {
  label: string;
  tokens: number;
  price: number | undefined;
  cost: number;
  native: string;
  usage: UsageCostValue;
  accent?: string;
}): ReactElement {
  return (
    <div style={row}>
      <span style={{ flex: 1, color: t.text2, minWidth: 0, whiteSpace: 'nowrap' }}>{props.label}</span>
      <span style={{ width: 92, textAlign: 'right', color: t.text3, whiteSpace: 'nowrap' }}>{formatTokens(props.tokens)}</span>
      <span style={{ width: 92, textAlign: 'right', color: props.price !== undefined ? t.text2 : t.text3, whiteSpace: 'nowrap' }}>
        {props.price !== undefined ? fmtPrice(props.price, props.native, props.usage) : '—'}
      </span>
      <span style={{ width: 92, textAlign: 'right', fontWeight: 600, color: props.accent ?? t.text, whiteSpace: 'nowrap' }}>
        {props.price !== undefined ? fmtMoney(props.cost, props.native, props.usage) : '—'}
      </span>
    </div>
  );
}
