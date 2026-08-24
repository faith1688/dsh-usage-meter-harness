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
      { name: 'settings.section', id: 'usage-meter', order: 20, label: () => '用量计量' },
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
            {accountBalance === null ? (usage.balanceNeedsKey ? '余额 未配置Key' : '余额 获取中…') : `${balanceNegative ? '透支 ' : '余额 '}${fmtBalance(accountBalance, usage)}`}
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
                  ? isDeepSeek ? (usage.balanceNeedsKey ? '未配置Key' : '获取中…') : '未配置'
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
              const price = r.perM ?? bucketPricePerM(p, primary);
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

          {/* 单价/模板编辑已迁移到「设置 → 用量计量 → 供应商定价管理」，弹窗只做显示。 */}
        </div>
      )}
    </div>
  );
}

// ── settings panel page (full page in the left sidebar) ──────────────────────

/** One provider entry from `GET /api/usage-meter/models`. */
type ModelDirEntry = { provider: string; label: string; models: Array<{ model: string; label: string }> };
/** Shape of one saved price override returned by `GET /api/usage-meter/config`. */
type PriceOverrideEntry = { prices?: Record<string, unknown>; rows?: unknown };
/** Per-model editable price draft (input/cacheHit/output). */
type ModelSaveState = { ok: boolean; msg: string };

function draftKeyOf(provider: string, model: string): string {
  return `${provider}/${model}`;
}

function isDeepseekRoute(provider: string): boolean {
  return provider === 'deepseek' || provider === 'deepseek-official';
}

const DAY_LABELS: Array<[number, string]> = [[0, '日'], [1, '一'], [2, '二'], [3, '三'], [4, '四'], [5, '五'], [6, '六']];

/** Numeric cells re-scaled on a currency switch (all price buckets + the
 *  user balance; the batch `discount` is a multiplier, never converted). */
const NUM_PRICE_FIELDS = ['input', 'cache', 'cacheWrite', 'output', 'inputPeak', 'inputOff', 'cachePeak', 'cacheOff', 'outPeak', 'outOff', 'balance'] as const;

/** Plain column labels for the template-driven unit-price grid. */
const FIELD_LABEL: Record<'input' | 'cache' | 'cacheWrite' | 'output', string> = {
  input: '输入(未命中)', cache: '缓存命中', cacheWrite: '缓存写入', output: '输出',
};

/** Custom-row bucket types (radio single-select, one row per bucket, max 4). */
type CustomBucket = 'input' | 'cacheRead' | 'cacheWrite' | 'output';
const CUSTOM_BUCKETS: readonly CustomBucket[] = ['input', 'cacheRead', 'cacheWrite', 'output'];
const CUSTOM_BUCKET_LABEL: Record<CustomBucket, string> = { input: '输入', cacheRead: '缓存命中', cacheWrite: '缓存写入', output: '输出' };
interface CustomRow { bucket: CustomBucket; perM: string; peakPerM: string; offPerM: string; }

/** Which price columns a template's row structure needs — the template drives
 *  the editor table. 自定义(templateId==='') → all four (the custom editor is
 *  used instead); unknown/empty → legacy 3 columns. A row billing [input, cacheWrite]
 *  is priced at input (cache-write falls back to input), so input wins the mapping. */
function columnsForTemplate(
  templateId: string,
  templates: Array<{ id: string; rows?: Array<{ buckets?: Array<'input' | 'cacheRead' | 'cacheWrite' | 'output'> }> }>,
): Array<'input' | 'cache' | 'cacheWrite' | 'output'> {
  if (templateId === '') return ['input', 'cache', 'cacheWrite', 'output'];
  const tpl = templates.find((t) => t.id === templateId);
  if (!tpl || !tpl.rows || tpl.rows.length === 0) return ['input', 'cache', 'output'];
  const seen: Array<'input' | 'cache' | 'cacheWrite' | 'output'> = [];
  for (const row of tpl.rows) {
    const b = row.buckets ?? [];
    let f: 'input' | 'cache' | 'cacheWrite' | 'output' | undefined;
    if (b.includes('input')) f = 'input';
    else if (b.includes('cacheRead')) f = 'cache';
    else if (b.includes('cacheWrite')) f = 'cacheWrite';
    else if (b.includes('output')) f = 'output';
    if (f !== undefined && !seen.includes(f)) seen.push(f);
  }
  return seen.length > 0 ? seen : ['input', 'cache', 'output'];
}

/** One peak period as four constrained picks: 时(0-23) 分(0-59) — no free text,
 *  so the user can never enter an unparseable string. */
interface PeakPeriod { sh: string; sm: string; eh: string; em: string; }

/** Pad a minute pick to two digits (时 keeps 1-2 digits as typed). */
function padPick(field: string, value: string): string {
  return field === 'sm' || field === 'em' ? value.padStart(2, '0') : value;
}

/** "9:00-12:00"-style minutes → editable periods. */
function windowsToPeriods(wins: Array<{ start: number; end: number }>): PeakPeriod[] {
  return wins.map((w) => ({
    sh: String(Math.floor(w.start / 60)),
    sm: String(w.start % 60).padStart(2, '0'),
    eh: String(Math.floor(w.end / 60)),
    em: String(w.end % 60).padStart(2, '0'),
  }));
}

/** Editable periods → Beijing-minute windows (invalid/inverted rows dropped). */
function periodsToWindows(ps: PeakPeriod[]): Array<{ start: number; end: number }> {
  const out: Array<{ start: number; end: number }> = [];
  for (const p of ps) {
    const sh = Number(p.sh), sm = Number(p.sm), eh = Number(p.eh), em = Number(p.em);
    if (![sh, sm, eh, em].every((v) => Number.isInteger(v) && v >= 0)) continue;
    if (sh > 23 || eh > 23 || sm > 59 || em > 59) continue;
    const start = sh * 60 + sm, end = eh * 60 + em;
    if (end > start) out.push({ start, end });
  }
  return out;
}

type BalancesDoc = Record<string, { balance?: number; currency?: string }>;

/** One model's full editable state: flat price row, 峰/谷 grid, 币种, 用户余额,
 *  and 峰谷开关 + 生效星期 + 高峰时段文本. */
type ModelEditorState = {
  input: string; cache: string; cacheWrite: string; output: string;
  inputPeak: string; inputOff: string;
  cachePeak: string; cacheOff: string;
  outPeak: string; outOff: string;
  currency: string;
  /** The model's PRICING currency — the natural denomination of the stored
   *  numeric values. Switching `currency` away from it ×rate; back to it → keep
   *  original (no conversion). */
  baseCurrency: string;
  /** Canonical numeric values in `baseCurrency` (input/cache/output/peak/off/balance),
   *  used to recompute the cells on a currency switch. */
  base: Record<string, string>;
  balance: string;
  peakOn: boolean;
  days: number[];
  /** Structured peak periods (时/分 picks); converted to Beijing-minute windows on save. */
  windows: PeakPeriod[];
  /** Billing-template-driven modes. */
  templateId: string;
  combined: boolean;
  discount: string;
  /** Custom unit-price rows (R5). Each row = ONE token bucket (radio-selected),
   *  its display name derived from that bucket, plus a flat per-1M price (and
   *  峰/谷价 filled in the shared peak section). At most one row per bucket, so
   *  max 4 rows. Only used when `templateId === ''`（自定义）; the rows are the
   *  authoritative cost model for the model (host sums `perM` × bucket tokens). */
  customRows: CustomRow[];
  /** Canonical custom rows in `baseCurrency` (mirrors `base`), so a currency
   *  switch away and back restores the original custom-row prices (not just the
   *  fixed cells). */
  baseCustomRows: CustomRow[];
  /** True when this is a DeepSeek official model shown pre-filled with known defaults. */
  prefillOfficial?: boolean;
  /** True when this model has no saved price and is not a DeepSeek official model. */
  noSavedPrice?: boolean;
};

/** Known DeepSeek OFFICIAL prices (CNY / 1M tokens), used to pre-fill a fresh
 *  official model the user has not overridden yet. weekday peak = Mon-Fri
 *  9:00-12:00 & 14:00-18:00 Beijing; weekend bills at offPeak (flat). */
type OfficialRow = {
  inputPerM: number; cacheReadPerM: number; outputPerM: number;
  peak: { inputPerM: number; cacheReadPerM: number; outputPerM: number };
  offPeak: { inputPerM: number; cacheReadPerM: number; outputPerM: number };
};
const OFFICIAL: Record<string, OfficialRow> = {
  'deepseek-v4-flash': { inputPerM: 1, cacheReadPerM: 0.02, outputPerM: 2, peak: { inputPerM: 3, cacheReadPerM: 0.1, outputPerM: 9 }, offPeak: { inputPerM: 1.5, cacheReadPerM: 0.05, outputPerM: 4.5 } },
  'deepseek-v4-flash-vision-exp': { inputPerM: 1, cacheReadPerM: 0.02, outputPerM: 2, peak: { inputPerM: 3, cacheReadPerM: 0.1, outputPerM: 9 }, offPeak: { inputPerM: 1.5, cacheReadPerM: 0.05, outputPerM: 4.5 } },
  'deepseek-v4-pro': { inputPerM: 3, cacheReadPerM: 0.025, outputPerM: 6, peak: { inputPerM: 9, cacheReadPerM: 0.3, outputPerM: 27 }, offPeak: { inputPerM: 4.5, cacheReadPerM: 0.15, outputPerM: 13.5 } },
  'deepseek-chat': { inputPerM: 1, cacheReadPerM: 0.02, outputPerM: 2, peak: { inputPerM: 3, cacheReadPerM: 0.1, outputPerM: 9 }, offPeak: { inputPerM: 1.5, cacheReadPerM: 0.05, outputPerM: 4.5 } },
  'deepseek-reasoner': { inputPerM: 3, cacheReadPerM: 0.1, outputPerM: 6, peak: { inputPerM: 9, cacheReadPerM: 0.3, outputPerM: 27 }, offPeak: { inputPerM: 4.5, cacheReadPerM: 0.15, outputPerM: 13.5 } },
};
const OFFICIAL_DAYS = [1, 2, 3, 4, 5];
const OFFICIAL_WINDOWS: Array<{ start: number; end: number }> = [{ start: 540, end: 720 }, { start: 840, end: 1080 }];

/** Seed one model's editor state from the stored override (flat or peak-tiered),
 *  the balance ledger (model entry → provider entry), and stored days/windows —
 *  defaulting to workdays + 9-12 · 14-18 like the rest of the meter. When a
 *  DeepSeek OFFICIAL model has no saved override, pre-fill the KNOWN official
 *  prices & peak schedule so the user is not facing empty fields. */
function seedEntry(key: string, ov: Record<string, PriceOverrideEntry>, bals: BalancesDoc): ModelEditorState {
  const provider = key.split('/')[0];
  const model = key.slice(provider.length + 1);
  const official = isDeepseekRoute(provider) ? OFFICIAL[model] : undefined;
  const savedPe = ov[key]?.prices as Record<string, unknown> | undefined;
  const pe = savedPe ?? ((official ?? undefined) as Record<string, unknown> | undefined);
  const n = (v: unknown): string => (typeof v === 'number' && Number.isFinite(v) ? String(v) : '');
  const tier = (v: unknown): { ip: string; cp: string; op: string } => {
    if (v === null || typeof v !== 'object') return { ip: '', cp: '', op: '' };
    const o = v as Record<string, unknown>;
    return { ip: n(o.inputPerM), cp: n(o.cacheReadPerM), op: n(o.outputPerM) };
  };
  const flatInput = n(pe?.inputPerM);
  const flatCache = n(pe?.cacheReadPerM);
  const flatCacheWrite = n(pe?.cacheWritePerM);
  const flatOutput = n(pe?.outputPerM);
  const peak = tier(pe?.peak);
  const off = tier(pe?.offPeak);
  const hasBal = (v: { balance?: number; currency?: string } | undefined) => v !== undefined && typeof v.balance === 'number';
  const bal = hasBal(bals[`m:${provider}/${model}`]) ? bals[`m:${provider}/${model}`] : hasBal(bals[`p:${provider}`]) ? bals[`p:${provider}`] : undefined;
  const savedOverride = ov[key]?.prices !== undefined;
  // R5: read back user-defined custom unit-price rows (if the model uses them).
  const rawCustom = Array.isArray((pe as Record<string, unknown> | undefined)?.customRows)
    ? ((pe as { customRows?: Array<{ label?: unknown; buckets?: unknown; perM?: unknown; peakPerM?: unknown; offPerM?: unknown }> }).customRows ?? [])
    : undefined;
  const isCustom = rawCustom !== undefined && rawCustom.length > 0;
  const customRows = (rawCustom ?? []).map((r) => ({
    bucket: (Array.isArray(r?.buckets) && (r.buckets[0] === 'cacheRead' || r.buckets[0] === 'cacheWrite' || r.buckets[0] === 'output')) ? r.buckets[0] : 'input',
    perM: typeof r?.perM === 'number' ? n(r.perM) : '',
    peakPerM: typeof r?.peakPerM === 'number' ? n(r.peakPerM) : '',
    offPerM: typeof r?.offPerM === 'number' ? n(r.offPerM) : '',
  }));
  return {
    input: flatInput, cache: flatCache, cacheWrite: flatCacheWrite, output: flatOutput,
    inputPeak: peak.ip || flatInput, inputOff: off.ip || flatInput,
    cachePeak: peak.cp || flatCache, cacheOff: off.cp || flatCache,
    outPeak: peak.op || flatOutput, outOff: off.op || flatOutput,
    currency: typeof pe?.currency === 'string' && pe.currency !== '' ? (pe!.currency as string) : 'CNY',
    baseCurrency: typeof pe?.currency === 'string' && pe.currency !== '' ? (pe!.currency as string) : 'CNY',
    balance: bal !== undefined && typeof bal.balance === 'number' ? String(bal.balance) : '',
    base: {
      input: flatInput, cache: flatCache, cacheWrite: flatCacheWrite, output: flatOutput,
      inputPeak: peak.ip || flatInput, inputOff: off.ip || flatInput,
      cachePeak: peak.cp || flatCache, cacheOff: off.cp || flatCache,
      outPeak: peak.op || flatOutput, outOff: off.op || flatOutput,
      balance: bal !== undefined && typeof bal.balance === 'number' ? String(bal.balance) : '',
    },
    peakOn: pe !== undefined && (pe.peak !== undefined || pe.offPeak !== undefined),
    days: Array.isArray(pe?.peakDays) ? (pe!.peakDays as number[]) : OFFICIAL_DAYS,
    windows: windowsToPeriods(Array.isArray(pe?.peakWindows) ? (pe!.peakWindows as Array<{ start: number; end: number }>) : OFFICIAL_WINDOWS),
    templateId: isCustom ? '' : (pe !== undefined ? matchTypeId(pe as unknown as Parameters<typeof matchTypeId>[0]) : ''),
    customRows,
    baseCustomRows: customRows,
    combined: pe?.combinedPerM !== undefined,
    discount: typeof pe?.discount === 'number' && (pe!.discount as number) < 1 ? String(pe!.discount as number) : '',
    // whether this is a fresh official model shown with known defaults (→ show
    // a friendly "已按官方价预填，可修改后保存" hint) vs a non-official model
    // with no saved price (→ prompt the user to fill it in).
    prefillOfficial: official !== undefined && !savedOverride,
    noSavedPrice: !savedOverride && official === undefined,
  };
}

function UsageMeterSettingsSection(_props: { close: () => void }): ReactElement {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveOk, setSaveOk] = useState(false);

  // Latest USD→CNY rate seen by a currency switch; the balance poll uses it to
  // re-convert the ledger value into the editor's current display currency, so a
  // switch to USD does NOT revert to the raw CNY number a few seconds later.
  const rateRef = useRef(7.2);
  const [initialBalance, setInitialBalance] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [keySaved, setKeySaved] = useState(false);

  // 供应商 → 模型 分组定价管理
  const [modelDir, setModelDir] = useState<ModelDirEntry[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [selProvider, setSelProvider] = useState('');
  const [overrides, setOverrides] = useState<Record<string, PriceOverrideEntry>>({});
  const [balances, setBalances] = useState<BalancesDoc>({});
  const [edits, setEdits] = useState<Record<string, ModelEditorState>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [saveStates, setSaveStates] = useState<Record<string, ModelSaveState>>({});
  const [savingAll, setSavingAll] = useState(false);
  // 共享余额：provider id → 该供应商下所有模型是否共用一个余额钱包（默认关）。
  const [sharedBalances, setSharedBalances] = useState<Record<string, boolean>>({});
  const [templates, setTemplates] = useState<Array<{ id: string; label: string; rows: BillingRow[]; mode: string; peak?: boolean; note?: string }>>([]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/usage-meter/templates');
        if (!res.ok) return;
        const doc = (await res.json()) as { types?: Array<{ id: string; label: string; rows: BillingRow[]; mode: string; peak?: boolean; note?: string }> };
        if (doc.types) setTemplates(doc.types);
      } catch { /* templates optional */ }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/usage-meter/config');
        if (!res.ok) { setLoadError(`加载失败 (${res.status})`); return; }
        const doc = (await res.json()) as {
          config?: Record<string, unknown>;
          providers?: Record<string, { currency?: string; sharedBalance?: boolean }>;
          priceOverrides?: Record<string, PriceOverrideEntry>;
          balances?: BalancesDoc;
        };
        if (cancelled) return;
        const c = doc.config ?? {};
        const get = (v: unknown) => (v === null || v === undefined ? '' : String(v));
        setInitialBalance(get(c.initialBalance));
        setKeySaved(c.deepseekApiKey === '***');
        setOverrides(doc.priceOverrides ?? {});
        setBalances(doc.balances ?? {});
        const sb: Record<string, boolean> = {};
        for (const [pv, pc] of Object.entries(doc.providers ?? {})) if (pc.sharedBalance === true) sb[pv] = true;
        setSharedBalances(sb);
      } catch (err) {
        if (!cancelled) { console.warn('[usage-meter] load config failed', err); setLoadError('加载失败'); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 分组定价管理：从 DSH 模型目录拉取 provider → models
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/usage-meter/models');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const doc = (await res.json()) as { providers?: ModelDirEntry[] };
        if (cancelled) return;
        const providers = doc.providers ?? [];
        setModelDir(providers);
        const first = providers[0];
        if (first !== undefined) setSelProvider(first.provider);
      } catch (err) {
        if (!cancelled) { console.warn('[usage-meter] load models failed', err); setModelDir([]); }
      } finally {
        if (!cancelled) setModelsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // R2: live-refresh each model's 用户余额 so the settings page mirrors the
  // popup's real-time token deduction — without clobbering unsaved price edits
  // (only the `balance` field is patched, never the price/pref cells).
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch('/api/usage-meter/config');
        if (!res.ok) return;
        const doc = (await res.json()) as { balances?: BalancesDoc };
        const bals = doc.balances ?? {};
        if (cancelled) return;
        setEdits((prev) => {
          const next = { ...prev };
          for (const k of Object.keys(next)) {
            const provider = k.split('/')[0];
            const b = bals[`m:${k}`] ?? bals[`p:${provider}`];
            if (b !== undefined && typeof b.balance === 'number') {
              const cur = next[k];
              // Re-convert the ledger value into the editor's CURRENT display
              // currency, relative to the ledger's OWN currency (a 5s re-poll
              // must not revert a USD-switched balance, nor double-convert a
              // ledger that is already in the display currency).
              const factor = cur !== undefined && typeof b.currency === 'string' && b.currency !== cur.currency ? rateRef.current : 1;
              next[k] = { ...cur, balance: String(Math.round(b.balance * factor * 1e6) / 1e6) };
            }
          }
          return next;
        });
      } catch { /* ignore transient network errors */ }
    };
    const id = setInterval(() => void poll(), 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // 草稿初值：从已存的 override + 余额账本预填（目录/override/余额变化时重置）
  useEffect(() => {
    const d: Record<string, ModelEditorState> = {};
    for (const p of modelDir) {
      for (const m of p.models) {
        d[draftKeyOf(p.provider, m.model)] = seedEntry(draftKeyOf(p.provider, m.model), overrides, balances);
      }
    }
    setEdits(d);
  }, [modelDir, overrides, balances]);

  // 由某模型当前编辑态构建 POST body：基础价 +（峰谷开启时）峰/谷价对 +
  // 生效星期 + 高峰时段（北京分钟）+ 单价币种；非 DeepSeek 附带用户余额。
  const buildModelBody = (provider: string, model: string): Record<string, unknown> | null => {
    const e = edits[draftKeyOf(provider, model)];
    if (e === undefined) return null;
    const num = (s: string): number | undefined => {
      const t = s.trim();
      if (t === '') return undefined;
      const n = Number(t);
      return Number.isFinite(n) && n >= 0 ? n : undefined;
    };
    const prices: Record<string, unknown> = {};
    // 模板权威计费（底线）：只发送所选模板实际需要的字段。宿主对 override 做
    // 「托管字段整体替换」，未发送的字段会从内置基价中剥离，因此残留的旧字段
    // （如从缓存模板切到基础模板后的 cacheReadPerM）绝不会继续参与计价。
    const input = num(e.input);
    const output = num(e.output);
    const cache = num(e.cache);
    const cacheWrite = num(e.cacheWrite);
    if (e.templateId === '') {
      // 自定义：customRows 是唯一权威成本模型，不发固定分桶字段。
    } else {
      const tplDef = templates.find((tp) => tp.id === e.templateId);
      // keep 模式（Batch 半价）只改折扣倍率，绝不触碰价格字段——否则托管字段
      // 替换会把内置基价的缓存价结构剥掉。
      const cols = tplDef?.mode === 'keep' ? [] : columnsForTemplate(e.templateId, templates);
      if (cols.includes('input') && input !== undefined) prices.inputPerM = input;
      if (cols.includes('output') && output !== undefined) prices.outputPerM = output;
      if (cols.includes('cache') && cache !== undefined) prices.cacheReadPerM = cache;
      if (cols.includes('cacheWrite') && cacheWrite !== undefined) prices.cacheWritePerM = cacheWrite;
    }
    if (e.peakOn) {
      const days = e.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).sort((a, b) => a - b);
      if (days.length > 0) prices.peakDays = days;
      const wins = periodsToWindows(e.windows);
      if (wins.length > 0) prices.peakWindows = wins;
      // 峰/谷价对只属于命名模板的固定格；自定义模型的峰/谷价在各行 customRows
      // 的 peakPerM/offPerM 里。禁止为自定义模型生成空 peak/offPeak 对象——
      // 否则 resolvePricingForTime 会把 hasLegacyPeak 误判为真，把 inputPerM
      // 覆盖成 undefined。
      if (e.templateId !== '') {
        const tier = (ip: string, cp: string, op: string): Record<string, unknown> => {
          const o: Record<string, unknown> = {};
          const a = num(ip);
          if (a !== undefined) o.inputPerM = a;
          const b = num(cp);
          if (b !== undefined) o.cacheReadPerM = b;
          const c = num(op);
          if (c !== undefined) o.outputPerM = c;
          return o;
        };
        const peak = tier(e.inputPeak, e.cachePeak, e.outPeak);
        const off = tier(e.inputOff, e.cacheOff, e.outOff);
        if (Object.keys(peak).length > 0) prices.peak = peak;
        if (Object.keys(off).length > 0) prices.offPeak = off;
      }
    }
    if (e.combined) {
      const c = num(e.input);
      if (c !== undefined) { prices.combinedPerM = c; prices.inputPerM = c; prices.outputPerM = c; }
    }
    // R5 自定义单价项：发送用户定义的行（宿主按行累计计价）。
    if (e.templateId === '' && e.customRows.length > 0) {
      const rows = e.customRows
        .filter((r) => num(r.perM) !== undefined)
        .map((r) => ({
          label: CUSTOM_BUCKET_LABEL[r.bucket],
          buckets: [r.bucket],
          perM: num(r.perM)!,
          ...(num(r.peakPerM) !== undefined ? { peakPerM: num(r.peakPerM)! } : {}),
          ...(num(r.offPerM) !== undefined ? { offPerM: num(r.offPerM)! } : {}),
        }));
      if (rows.length > 0) prices.customRows = rows;
    }
    const disc = num(e.discount);
    if (disc !== undefined && disc > 0 && disc < 1) prices.discount = disc;
    // 币种必须显式随价格保存：切到 CNY 后省略字段会让宿主回落基价币种
    // （可能是 USD），已换算成 CNY 的数值就会被按 USD 解释、费用放大汇率倍。
    if (e.currency !== '') prices.currency = e.currency;
    const body: Record<string, unknown> = { provider, model, prices };
    const bal = num(e.balance);
    if (!isDeepseekRoute(provider) && bal !== undefined) body.balance = bal;
    return body;
  };

  // R3: switching a model's 币种 rescales the balance + ALL unit-price cells
  // (peak & off-peak) by the live rate, relative to the model's PRICING
  // currency. Switch to baseCurrency → restore original (no conversion);
  // switch away → ×rate on every number. The batch `discount` is untouched
  // (it is a multiplier, not a money amount).
  const switchCurrency = async (key: string, newCur: string) => {
    const cur = edits[key];
    if (cur === undefined || cur.currency === newCur) return;
    let rate = 1;
    if (newCur !== cur.baseCurrency) {
      try {
        const r = await fetch('/api/usage-meter/refresh-rate', { method: 'POST' });
        if (r.ok) { const d = (await r.json()) as { usdToCny?: number }; rate = typeof d.usdToCny === 'number' && d.usdToCny > 0 ? d.usdToCny : 1; rateRef.current = rate; }
      } catch { rate = 1; }
    }
    const factor = newCur !== cur.baseCurrency ? rate : 1;
    const scale = (v: string): string => {
      const n = Number(v);
      return v.trim() === '' || Number.isNaN(n) ? '' : String(Math.round(n * factor * 1e6) / 1e6);
    };
    setEdits((s) => {
      const base = s[key];
      if (base === undefined) return s;
      const next: ModelEditorState = { ...base, currency: newCur };
      for (const f of NUM_PRICE_FIELDS) next[f] = scale(base.base[f] ?? '');
      next.customRows = base.baseCustomRows.map((r) => ({ ...r, perM: scale(r.perM), peakPerM: scale(r.peakPerM), offPerM: scale(r.offPerM) }));
      return { ...s, [key]: next };
    });
  };

  // Edits to a numeric cell. When the model is currently shown in its PRICING
  // currency, also keep the base snapshot in sync so a later currency switch
  // (away and back to base) preserves the edit instead of reverting to the old
  // seeded value.
  const editNum = (key: string, fld: string, val: string): void => {
    setEdits((s) => {
      const cur = s[key];
      if (cur === undefined) return s;
      return cur.currency === cur.baseCurrency
        ? { ...s, [key]: { ...cur, [fld]: val, base: { ...cur.base, [fld]: val } } }
        : { ...s, [key]: { ...cur, [fld]: val } };
    });
  };

  // Custom-row edits: keep the canonical base-currency snapshot in sync when the
  // model is currently shown in its PRICING currency, so a currency switch away
  // and back to base restores the user's values (not just the fixed cells).
  const editCustomRow = (key: string, ri: number, updater: (r: CustomRow) => CustomRow): void => {
    setEdits((s) => {
      const cur = s[key];
      if (cur === undefined) return s;
      const inBase = cur.currency === cur.baseCurrency;
      const rows = cur.customRows.map((x, i) => (i === ri ? updater(x) : x));
      return { ...s, [key]: { ...cur, customRows: rows, baseCustomRows: inBase ? rows : cur.baseCustomRows } };
    });
  };
  const addCustomRow = (key: string): void => {
    setEdits((s) => {
      const cur = s[key];
      if (cur === undefined) return s;
      // 最多 4 行（每个 bucket 至多一行），已满则不加。
      if (cur.customRows.length >= CUSTOM_BUCKETS.length) return s;
      const used = new Set<CustomBucket>(cur.customRows.map((r) => r.bucket));
      const bucket = CUSTOM_BUCKETS.find((b) => !used.has(b)) ?? 'input';
      const inBase = cur.currency === cur.baseCurrency;
      const row: CustomRow = { bucket, perM: '', peakPerM: '', offPerM: '' };
      return { ...s, [key]: { ...cur, customRows: [...cur.customRows, row], baseCustomRows: inBase ? [...cur.baseCustomRows, row] : cur.baseCustomRows } };
    });
  };
  const delCustomRow = (key: string, ri: number): void => {
    setEdits((s) => {
      const cur = s[key];
      if (cur === undefined) return s;
      const inBase = cur.currency === cur.baseCurrency;
      return { ...s, [key]: { ...cur, customRows: cur.customRows.filter((_, i) => i !== ri), baseCustomRows: inBase ? cur.baseCustomRows.filter((_, i) => i !== ri) : cur.baseCustomRows } };
    });
  };

  // 共享余额开关：乐观更新 + POST 持久化（宿主把该供应商的账本键统一切到
  // p:<provider>，所有模型扣同一个钱包）。
  const toggleSharedBalance = async (provider: string, on: boolean): Promise<void> => {
    setSharedBalances((s) => ({ ...s, [provider]: on }));
    try {
      const res = await fetch('/api/usage-meter/config', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider, sharedBalance: on }),
      });
      if (!res.ok) setSharedBalances((s) => ({ ...s, [provider]: !on }));
    } catch {
      setSharedBalances((s) => ({ ...s, [provider]: !on }));
    }
  };

  const persistModel = async (provider: string, model: string, body: Record<string, unknown>): Promise<boolean> => {
    const k = draftKeyOf(provider, model);
    const res = await fetch('/api/usage-meter/config', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      if (body.balance !== undefined) {
        setBalances((b) => ({ ...b, [`m:${provider}/${model}`]: { balance: Number(body.balance) } }));
      }
      setOverrides((o) => ({ ...o, [k]: { prices: body.prices as Record<string, unknown> } }));
    }
    return res.ok;
  };

  const saveModelPrice = async (provider: string, model: string) => {
    const k = draftKeyOf(provider, model);
    const body = buildModelBody(provider, model);
    if (body === null) return;
    setSaveStates((s) => ({ ...s, [k]: { ok: false, msg: '保存中…' } }));
    let ok = false;
    try {
      ok = await persistModel(provider, model, body);
    } catch (err) {
      console.warn('[usage-meter] save model price failed', err);
    }
    setSaveStates((s) => ({ ...s, [k]: { ok, msg: ok ? '已保存' : '保存失败' } }));
    window.setTimeout(() => setSaveStates((s) => {
      const n = { ...s };
      delete n[k];
      return n;
    }), 2500);
  };

  const resetModelPrice = (provider: string, model: string) => {
    const k = draftKeyOf(provider, model);
    // 重置 = 丢弃未保存修改，回退到「该模型上次已保存的价格」；DeepSeek 官方模型
    // 且从未改过 → 回退到官方价（seedEntry 里已含官方预填）。
    setEdits((s) => ({ ...s, [k]: seedEntry(k, overrides, balances) }));
    const official = isDeepseekRoute(provider);
    setSaveStates((s) => ({ ...s, [k]: { ok: true, msg: official ? '已重置为官方价' : '已重置为该模型已保存的价格' } }));
    window.setTimeout(() => setSaveStates((s) => {
      const n = { ...s };
      delete n[k];
      return n;
    }), 2500);
  };

  // 一键保存当前供应商下的全部模型
  const saveAllModels = async () => {
    const prov = modelDir.find((p) => p.provider === selProvider);
    if (prov === undefined) return;
    setSavingAll(true);
    await Promise.all(prov.models.map(async (m) => {
      const k = draftKeyOf(prov.provider, m.model);
      const body = buildModelBody(prov.provider, m.model);
      if (body === null) return;
      let ok = false;
      try {
        ok = await persistModel(prov.provider, m.model, body);
      } catch (err) {
        console.warn('[usage-meter] save all: failed', err);
      }
      setSaveStates((s) => ({ ...s, [k]: { ok, msg: ok ? '已保存' : '保存失败' } }));
    }));
    setSavingAll(false);
  };

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
        setSaveOk(true); setSaveMsg('已保存');
        // API key 只在保存后“消失”（置为已保存芯片 / 清空输入，只作掩码显示）；
        // 非 DeepSeek 初始余额则保留输入框，作为后续新增模型的默认起始余额。
        if (apiKey.trim() !== '' && apiKey !== '***') { setKeySaved(true); setApiKey(''); }
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

          {/* ── 供应商 → 模型 分组定价管理（可折叠）────────────────────── */}
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${t.borderSoft}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>用量计量 · 模型配置</div>
                <div style={{ color: t.text3, fontSize: 11, marginBottom: 0 }}>
                  按供应商 → 模型为每个模型单独设置币种、用户余额、单价（含峰谷价对）、生效星期与高峰时段。
                </div>
              </div>
              {(() => {
                const prov = modelDir.find((p) => p.provider === selProvider);
                if (prov === undefined || prov.models.length === 0) return null;
                return (
                  <button
                    type="button"
                    onClick={() => void saveAllModels()}
                    disabled={savingAll}
                    style={{ fontSize: 12, padding: '5px 14px', borderRadius: 6, border: `1px solid ${t.border}`, background: savingAll ? 'rgba(139,148,158,0.10)' : t.accent, color: savingAll ? t.text3 : t.text, cursor: savingAll ? 'default' : 'pointer', whiteSpace: 'nowrap' }}
                  >
                    {savingAll ? '保存中…' : '一键保存全部'}
                  </button>
                );
              })()}
            </div>
            {modelsLoading ? (
              <div style={{ color: t.text3, fontSize: 12, marginTop: 8 }}>加载模型目录…</div>
            ) : modelDir.length === 0 ? (
              <div style={{ color: t.text3, fontSize: 12, marginTop: 8 }}>
                未从模型目录获取到模型。请确认当前组合已注册 LLM 适配（`ctx.llm`）。
              </div>
            ) : (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <label style={{ fontSize: 12, color: t.text2 }} htmlFor="um-provider">供应商</label>
                  <select
                    id="um-provider"
                    value={selProvider}
                    onChange={(e) => setSelProvider(e.target.value)}
                    style={select}
                  >
                    {modelDir.map((p) => (
                      <option key={p.provider} value={p.provider}>{p.label}</option>
                    ))}
                  </select>
                  {!isDeepseekRoute(selProvider) && selProvider !== '' && (
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer', marginLeft: 8 }}>
                      <input type="checkbox" checked={sharedBalances[selProvider] === true}
                        onChange={(ev) => void toggleSharedBalance(selProvider, ev.target.checked)}
                        style={{ accentColor: t.accent }} />
                      <span style={{ fontSize: 11, color: t.text2 }}>共享余额（该供应商所有模型共用一个余额）</span>
                    </label>
                  )}
                </div>
                {(() => {
                  const active = modelDir.find((p) => p.provider === selProvider);
                  if (active === undefined) return <div style={{ color: t.text3, fontSize: 12 }}>请选择供应商</div>;
                  if (active.models.length === 0) return <div style={{ color: t.text3, fontSize: 12 }}>该供应商下暂无模型</div>;
                  const deep = isDeepseekRoute(active.provider);
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {active.models.map((m) => {
                        const k = draftKeyOf(active.provider, m.model);
                        const e = edits[k];
                        if (e === undefined) return null;
                        const isOpen = expanded[k] === true;
                        const st = saveStates[k];
                        const cell: CSSProperties = { width: '100%', minWidth: 80, maxWidth: 150, boxSizing: 'border-box', textAlign: 'right' as const, fontSize: 12, padding: '5px 8px', border: `1px solid ${t.border}`, borderRadius: 5, background: t.card, color: t.text };
                        return (
                          <div key={m.model} style={{ border: `1px solid ${t.border}`, borderRadius: 6, overflow: 'hidden' }}>
                            {/* 折叠头部 */}
                            <button
                              type="button"
                              onClick={() => setExpanded((s) => ({ ...s, [k]: !isOpen }))}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left' as const, padding: '8px 12px', fontSize: 13, fontWeight: 600, border: 'none', background: isOpen ? t.card : 'transparent', color: t.text, cursor: 'pointer' }}
                            >
                              <span style={{ fontSize: 10, color: t.text3 }}>{isOpen ? '▼' : '▶'}</span>
                              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.label}</span>
                              {e.peakOn && <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'rgba(139,148,158,0.12)', color: t.text2, whiteSpace: 'nowrap' }}>峰谷</span>}
                              <span style={{ fontSize: 10, color: t.text3 }}>{e.currency}</span>
                            </button>
                            {/* 展开体 */}
                            {isOpen && (
                              <div style={{ padding: '4px 12px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {e.prefillOfficial && (
                                  <div style={{ color: t.ok, fontSize: 11, lineHeight: 1.4 }}>已按 DeepSeek 官方价预填：周一至五 9:00–12:00、14:00–18:00 为峰价，周六/周日按谷价；可修改后保存。</div>
                                )}
                                {e.noSavedPrice && (
                                  <div style={{ color: t.error, fontSize: 11, lineHeight: 1.4 }}>该模型尚未配置价格与余额：请在下方填写单价/余额后点「保存单价」，否则该模型用量金额可能按 0 计。</div>
                                )}
                                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' as const }}>
                                  <label style={field} htmlFor={`um-cur-${k}`}>
                                    <span style={{ fontSize: 12, color: t.text2 }}>币种</span>
                                    <select id={`um-cur-${k}`} value={e.currency} onChange={(ev) => void switchCurrency(k, ev.target.value)}
                                      style={{ ...select, maxWidth: 100, fontSize: 12, padding: '3px 6px' }}>
                                      <option value="CNY">CNY (¥)</option>
                                      <option value="USD">USD ($)</option>
                                    </select>
                                  </label>
                                  {!deep && (
                                    <label style={field} htmlFor={`um-bal-${k}`}>
                                      <span style={{ fontSize: 12, color: t.text2 }}>用户余额</span>
                                      <input id={`um-bal-${k}`} value={e.balance}
                                        onChange={(ev) => editNum(k, 'balance', ev.target.value)}
                                        placeholder="如 100"
                                        style={{ ...input, maxWidth: 140, fontSize: 12, padding: '3px 6px' }} />
                                    </label>
                                  )}
                                </div>
                                {templates.length > 0 && (
                                  <label style={field} htmlFor={`um-tpl-${k}`}>
                                    <span style={{ fontSize: 12, color: t.text2 }}>计费模板</span>
                                    <select id={`um-tpl-${k}`} value={e.templateId}
                                      onChange={(ev) => {
                                        const tpl = templates.find((tp) => tp.id === ev.target.value);
                                        const v = ev.target.value;
                                        setEdits((s) => ({ ...s, [k]: { ...e,
                                          templateId: v,
                                          combined: tpl?.mode === 'combined',
                                          discount: tpl?.mode === 'keep' ? '0.5' : '',
                                          peakOn: tpl?.peak === true,
                                          // 自定义：给一组默认单价项（输入/输出），用户可增删。
                                          // 选命名模板：清空 customRows（宿主以模板/固定格计价）。
                                          customRows: v === ''
                                            ? (e.customRows.length > 0 ? e.customRows : [{ bucket: 'input', perM: '', peakPerM: '', offPerM: '' }, { bucket: 'output', perM: '', peakPerM: '', offPerM: '' }])
                                            : [],
                                        } }));
                                      }}
                                      style={{ ...select, maxWidth: 240, fontSize: 12, padding: '3px 6px' }}>
                                      <option value="">（自定义）</option>
                                      {templates.map((tp) => <option key={tp.id} value={tp.id}>{tp.label}</option>)}
                                    </select>
                                  </label>
                                )}
                                {e.combined && <div style={{ fontSize: 11, color: t.text2 }}>合并计价：输入单价即对全部 token 统一计费（缓存/输出合并）。</div>}
                                {e.discount !== '' && (
                                  <label style={field} htmlFor={`um-disc-${k}`}>
                                    <span style={{ fontSize: 12, color: t.text2 }}>Batch 折扣</span>
                                    <input id={`um-disc-${k}`} value={e.discount}
                                      onChange={(ev) => setEdits((s) => ({ ...s, [k]: { ...e, discount: ev.target.value } }))}
                                      placeholder="如 0.5" style={{ ...input, maxWidth: 90, fontSize: 12, padding: '3px 6px' }} />
                                  </label>
                                )}
                                {/* R5 自定义单价项：templateId==='' 时用可增删的行；命名模板用下方固定格+峰谷。 */}
                                {e.templateId === '' && (
                                  <div>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: t.text2, marginBottom: 4 }}>自定义单价项（每行 = 单价 × 该行 token 数；峰/谷价在下方「启用峰谷计费」里统一填）</div>
                                    {e.customRows.map((r, ri) => {
                                      const usedElsewhere = new Set<CustomBucket>(e.customRows.map((x) => x.bucket));
                                      usedElsewhere.delete(r.bucket);
                                      return (
                                        <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' as const }}>
                                          {CUSTOM_BUCKETS.map((b) => {
                                            const disabled = usedElsewhere.has(b);
                                            return (
                                              <label key={b} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, cursor: disabled ? 'not-allowed' as const : 'pointer' as const, fontSize: 11, color: disabled ? t.text3 : t.text }}>
                                                <input type="radio" name={`um-cb-${k}`} checked={r.bucket === b}
                                                  disabled={disabled}
                                                  onChange={() => editCustomRow(k, ri, (x) => ({ ...x, bucket: b }))}
                                                  style={{ accentColor: t.accent }} />
                                                {CUSTOM_BUCKET_LABEL[b]}
                                              </label>
                                            );
                                          })}
                                          <span style={{ fontSize: 11, color: t.text2, minWidth: 56 }}>＝ {CUSTOM_BUCKET_LABEL[r.bucket]}</span>
                                          <input value={r.perM} placeholder="元/M"
                                            onChange={(ev) => editCustomRow(k, ri, (x) => ({ ...x, perM: ev.target.value }))}
                                            style={{ ...input, maxWidth: 80, fontSize: 12, padding: '3px 6px' }} />
                                          <button type="button"
                                            onClick={() => delCustomRow(k, ri)}
                                            style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, border: `1px solid ${t.borderSoft}`, background: 'transparent', color: t.text2, cursor: 'pointer' }}>删</button>
                                        </div>
                                      );
                                    })}
                                    {e.customRows.length < CUSTOM_BUCKETS.length && (
                                      <button type="button"
                                        onClick={() => addCustomRow(k)}
                                        style={{ fontSize: 11, padding: '2px 10px', borderRadius: 6, border: `1px solid ${t.border}`, background: t.accent, color: t.text, cursor: 'pointer' }}>+ 添加单价项（最多 4 项）</button>
                                    )}
                                  </div>
                                )}
                                {e.templateId !== '' && (
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: t.text2, marginBottom: 4 }}>基础单价（元/M 或 $/M）</div>
                                  {(() => {
                                    const gridFields = columnsForTemplate(e.templateId, templates);
                                    return (
                                      <div style={{ display: 'grid', gridTemplateColumns: `auto ${gridFields.map(() => '1fr').join(' ')}`, gap: '2px 8px', alignItems: 'center' }}>
                                        <span style={{ fontSize: 10, color: t.text3 }} />
                                        {gridFields.map((f) => <span key={f} style={{ fontSize: 10, color: t.text3, textAlign: 'right' as const }}>{FIELD_LABEL[f]}</span>)}
                                        <span style={{ fontSize: 11, color: t.text2 }}>单价</span>
                                        {gridFields.map((f) => (
                                          <input key={f} id={`um-${f}-${k}`} value={e[f]}
                                            onChange={(ev) => editNum(k, f, ev.target.value)}
                                            placeholder="元/M" style={cell} />
                                        ))}
                                      </div>
                                    );
                                  })()}
                                </div>
                                )}
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                    {/* 峰谷计费只在需要时出现：官方 DeepSeek 恒有；选中峰谷模板时出现；自定义
                                        （未选模板）也允许用户自行开启；已开启则保持显示。 */}
                                    {(deep || e.templateId === 'peak-off-peak' || e.templateId === '' || e.peakOn) && (
                                      <>
                                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer' as const }}>
                                          <input type="checkbox" checked={e.peakOn}
                                            onChange={(ev) => setEdits((s) => ({ ...s, [k]: { ...e, peakOn: ev.target.checked } }))}
                                            style={{ accentColor: t.accent }} />
                                          <span style={{ fontSize: 12, color: t.text2 }}>启用峰谷计费</span>
                                        </label>
                                        <span style={{ fontSize: 10, color: t.text3 }}>峰: 高; 谷: 低; 未勾选星期 = 谷价</span>
                                      </>
                                    )}
                                  </div>
                                  {e.peakOn && (
                                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6, padding: '6px 8px', background: 'rgba(139,148,158,0.06)', borderRadius: 4 }}>
                                      {e.templateId === '' ? (
                                        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
                                          {e.customRows.map((r, ri) => (
                                            <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                              <span style={{ fontSize: 11, color: t.text2, width: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{CUSTOM_BUCKET_LABEL[r.bucket]}</span>
                                              <span style={{ fontSize: 10, color: t.text3 }}>峰价</span>
                                              <input value={r.peakPerM} placeholder="元/M"
                                                onChange={(ev) => editCustomRow(k, ri, (x) => ({ ...x, peakPerM: ev.target.value }))}
                                                style={{ ...input, maxWidth: 90, fontSize: 12, padding: '3px 6px' }} />
                                              <span style={{ fontSize: 10, color: t.text3 }}>谷价</span>
                                              <input value={r.offPerM} placeholder="元/M"
                                                onChange={(ev) => editCustomRow(k, ri, (x) => ({ ...x, offPerM: ev.target.value }))}
                                                style={{ ...input, maxWidth: 90, fontSize: 12, padding: '3px 6px' }} />
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr', gap: '2px 8px', alignItems: 'center' }}>
                                        <span style={{ fontSize: 10, color: t.text3 }} />
                                        <span style={{ fontSize: 10, color: t.text3, textAlign: 'right' as const }}>输入(未命中)</span>
                                        <span style={{ fontSize: 10, color: t.text3, textAlign: 'right' as const }}>缓存命中</span>
                                        <span style={{ fontSize: 10, color: t.text3, textAlign: 'right' as const }}>输出</span>
                                        <span style={{ fontSize: 11, color: t.text2 }}>峰价</span>
                                        {(['inputPeak', 'cachePeak', 'outPeak'] as const).map((fld) => {
                                          const key = `um-${fld}-${k}`;
                                          return <input key={key} id={key} value={e[fld]}
                                            onChange={(ev) => editNum(k, fld, ev.target.value)}
                                            placeholder="元/M" style={cell} />;
                                        })}
                                        <span style={{ fontSize: 11, color: t.text2 }}>谷价</span>
                                        {(['inputOff', 'cacheOff', 'outOff'] as const).map((fld) => {
                                          const key = `um-${fld}-${k}`;
                                          return <input key={key} id={key} value={e[fld]}
                                            onChange={(ev) => editNum(k, fld, ev.target.value)}
                                            placeholder="元/M" style={cell} />;
                                        })}
                                      </div>
                                      )}
                                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, alignItems: 'center' }}>
                                        <span style={{ fontSize: 11, color: t.text2, whiteSpace: 'nowrap' }}>峰谷星期:</span>
                                        {DAY_LABELS.map(([d, lbl]) => (
                                          <label key={d} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, cursor: 'pointer' as const }}>
                                            <input type="checkbox" checked={e.days.includes(d)}
                                              onChange={(ev) => setEdits((s) => {
                                                const prev = e.days;
                                                const next = ev.target.checked ? [...prev, d].sort((a, b) => a - b) : prev.filter((x) => x !== d);
                                                return { ...s, [k]: { ...e, days: next } };
                                              })}
                                              style={{ accentColor: t.accent }} />
                                            <span style={{ fontSize: 11, color: t.text }}>{lbl}</span>
                                          </label>
                                        ))}
                                      </div>
                                      <div>
                                        <div style={{ fontSize: 11, color: t.text2, marginBottom: 3 }}>高峰时段（北京时间）:</div>
                                        {e.windows.map((p, pi) => (
                                          <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, flexWrap: 'wrap' as const }}>
                                            <span style={{ fontSize: 11, color: t.text3 }}>{pi + 1}.</span>
                                            <span style={{ fontSize: 10, color: t.text3 }}>起</span>
                                            {([['sh', 23], ['sm', 59]] as const).map(([f, max]) => (
                                              <select key={f} value={p[f]} aria-label={`${f}-${pi}`}
                                                onChange={(ev) => setEdits((s) => ({ ...s, [k]: { ...e, windows: e.windows.map((x, xi) => (xi === pi ? { ...x, [f]: ev.target.value } : x)) } }))}
                                                style={{ padding: '2px 4px', border: `1px solid ${t.border}`, borderRadius: 5, background: t.card, color: t.text, fontSize: 12 }}>
                                                {Array.from({ length: max + 1 }, (_, v) => padPick(f, String(v))).map((v) => (
                                                  <option key={v} value={v}>{v}</option>
                                                ))}
                                              </select>
                                            ))}
                                            <span style={{ fontSize: 10, color: t.text3 }}>时</span>
                                            <span style={{ fontSize: 10, color: t.text3 }}>止</span>
                                            {([['eh', 23], ['em', 59]] as const).map(([f, max]) => (
                                              <select key={f} value={p[f]} aria-label={`${f}-${pi}`}
                                                onChange={(ev) => setEdits((s) => ({ ...s, [k]: { ...e, windows: e.windows.map((x, xi) => (xi === pi ? { ...x, [f]: ev.target.value } : x)) } }))}
                                                style={{ padding: '2px 4px', border: `1px solid ${t.border}`, borderRadius: 5, background: t.card, color: t.text, fontSize: 12 }}>
                                                {Array.from({ length: max + 1 }, (_, v) => padPick(f, String(v))).map((v) => (
                                                  <option key={v} value={v}>{v}</option>
                                                ))}
                                              </select>
                                            ))}
                                            <button type="button"
                                              onClick={() => setEdits((s) => ({ ...s, [k]: { ...e, windows: e.windows.filter((_, xi) => xi !== pi) } }))}
                                              disabled={e.windows.length <= 1}
                                              style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, border: `1px solid ${t.borderSoft}`, background: 'transparent', color: t.text2, cursor: 'pointer' }}>删</button>
                                          </div>
                                        ))}
                                        <button type="button"
                                          onClick={() => setEdits((s) => ({ ...s, [k]: { ...e, windows: [...e.windows, { sh: '9', sm: '00', eh: '12', em: '00' }] } }))}
                                          style={{ fontSize: 11, padding: '2px 10px', borderRadius: 6, border: `1px solid ${t.border}`, background: t.accent, color: t.text, cursor: 'pointer' }}>+ 添加时段</button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <button type="button" onClick={() => void saveModelPrice(active.provider, m.model)}
                                    style={{ fontSize: 12, padding: '4px 12px', borderRadius: 6, border: `1px solid ${t.border}`, background: t.accent, color: t.text, cursor: 'pointer' }}>
                                    保存单价
                                  </button>
                                  <button type="button" onClick={() => void resetModelPrice(active.provider, m.model)}
                                    style={{ fontSize: 12, padding: '4px 12px', borderRadius: 6, border: `1px solid ${t.border}`, background: 'transparent', color: t.text2, cursor: 'pointer' }}>
                                    重置价格
                                  </button>
                                  {st !== undefined && <span style={{ fontSize: 11, color: st.ok ? t.ok : t.error, whiteSpace: 'nowrap' }}>{st.msg}</span>}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
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
  const [windows, setWindows] = useState<PeakPeriod[]>(() => windowsToPeriods(base?.peakWindows ?? [{ start: 540, end: 720 }, { start: 840, end: 1080 }]));
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
        pricePatch.peakWindows = periodsToWindows(windows) as unknown as number;
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
          <div style={{ marginBottom: 2 }}>高峰时段（北京时间）</div>
          {windows.map((p, pi) => (
            <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
              <span style={{ fontSize: 10, color: t.text3 }}>{pi + 1}. 起</span>
              {([['sh', 23], ['sm', 59]] as const).map(([f, max]) => (
                <select key={f} value={p[f]} onChange={(ev) => setWindows((ws) => ws.map((x, xi) => (xi === pi ? { ...x, [f]: ev.target.value } : x)))}
                  style={{ fontSize: 12, padding: '1px 3px' }}>
                  {Array.from({ length: max + 1 }, (_, v) => padPick(f, String(v))).map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              ))}
              <span style={{ fontSize: 10, color: t.text3 }}>止</span>
              {([['eh', 23], ['em', 59]] as const).map(([f, max]) => (
                <select key={f} value={p[f]} onChange={(ev) => setWindows((ws) => ws.map((x, xi) => (xi === pi ? { ...x, [f]: ev.target.value } : x)))}
                  style={{ fontSize: 12, padding: '1px 3px' }}>
                  {Array.from({ length: max + 1 }, (_, v) => padPick(f, String(v))).map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              ))}
              <button type="button" onClick={() => setWindows((ws) => ws.filter((_, xi) => xi !== pi))} disabled={windows.length <= 1}
                style={{ fontSize: 11, padding: '1px 6px', borderRadius: 5, border: `1px solid ${t.border}`, background: t.card, color: t.text2, cursor: 'pointer' }}>删</button>
            </div>
          ))}
          <button type="button" onClick={() => setWindows((ws) => [...ws, { sh: '9', sm: '00', eh: '12', em: '00' }])}
            style={{ fontSize: 11, padding: '1px 8px', borderRadius: 5, border: `1px solid ${t.border}`, background: t.card, color: t.text, cursor: 'pointer', marginBottom: 4 }}>+ 添加时段</button>
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
