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
import { tt, setLang, getLang, L, type Lang } from './i18n.ts';
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
      { name: 'settings.section', id: 'usage-meter', order: 20, label: () => L('用量计量') },
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
    ? L('对话被停止')
    : `${formatTokens(total - turn.outputTokens)} 入 / ${formatTokens(turn.outputTokens)} 出`;
}

function bucketTokens(u: Pick<UsageCostValue, 'inputTokens' | 'cacheReadTokens' | 'cacheWriteTokens' | 'outputTokens'>, b: BillingRow['buckets'][number]): number {
  switch (b) {
    case 'input': return u.inputTokens;
    case 'cacheRead': return u.cacheReadTokens;
    case 'cacheWrite': return u.cacheWriteTokens;
    case 'output': return u.outputTokens;
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
  if (p.peakOffPeakFrom !== undefined && Date.now() < p.peakOffPeakFrom) return L('峰谷价未生效');
  const h = new Date().getUTCHours();
  return (h >= 1 && h < 4) || (h >= 6 && h < 10) ? L('高峰') : L('低谷');
}

// ── readout ──────────────────────────────────────────────────────────────────
export function UsageReadout({ useProjection }: DockProps): ReactElement | null {
  const usage: UsageCostValue | undefined = useProjection('usageCost');
const [, setLangTick] = useState(0);
useEffect(() => { const h = () => setLangTick((v) => v + 1); window.addEventListener('um-lang-change', h); return () => window.removeEventListener('um-lang-change', h); }, []);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [rate, setRate] = useState<number | null>(null);
  const rateSamplesRef = useRef<Array<{ at: number; total: number }>>([]);
  const usageRef = useRef<UsageCostValue | undefined>(undefined);
  // 用量展板（阶段D）：弹窗右上角小图标打开；三种视图来自 /api/usage-meter/stats。
  const [showDash, setShowDash] = useState(false);
  const [dashStats, setDashStats] = useState<Array<{ provider: string; model: string; requestCount: number; inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number; reasoningTokens: number; cost: number; currency: string }>>([]);
  const [dashView, setDashView] = useState<'all' | 'provider' | 'model'>('all');
  const [dashProv, setDashProv] = useState('');
  const [dashModel, setDashModel] = useState('');

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
      const samples = rateSamplesRef.current;
      const live = tokenRateOf(samples, Date.now());
      // 停滞检测：最新样本已滑出窗口（>窗口+1.5s 没有新 token 样本）说明
      // 输出已停止/工具执行中——清零速度显示，而不是把旧值永远冻结在原地。
      const newestAt = samples.length > 0 ? samples[samples.length - 1].at : 0;
      if (live === null && Date.now() - newestAt > RATE_WINDOW_MS + 1500) {
        setRate(null);
        return;
      }
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
  // 预警（阶段C）：预算用到百分比 ≥ 阈值，或实时余额低于阈值下限 → 读数胶囊呼吸色。
  const alertBudget = usage.budget !== null && usage.budget > 0 && usage.alertBudgetPct > 0 && usage.remainingBudget !== null && ((usage.budget - usage.remainingBudget) / usage.budget) * 100 >= usage.alertBudgetPct;
  const alertBalance = usage.accountBalance !== null && usage.alertBalanceFloor > 0 && usage.accountBalance.totalBalance < usage.alertBalanceFloor;
  const breathing = alertBudget || alertBalance;

  const fmtCost = (v: number): string => (Number.isFinite(v) ? `¥${v.toFixed(3)}` : '—');
  const loadDash = async (): Promise<void> => {
    try {
      const res = await fetch('/api/usage-meter/stats');
      if (!res.ok) return;
      const doc = (await res.json()) as { stats?: Array<{ provider: string; model: string; requestCount: number; inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number; reasoningTokens: number; cost: number; currency: string }> };
      setDashStats(doc.stats ?? []);
    } catch { /* ignore */ }
  };
  const provList = Array.from(new Set(dashStats.map((s) => s.provider)));
  const modelList = dashProv !== '' ? dashStats.filter((s) => s.provider === dashProv) : dashStats;
  const totalCost = dashStats.reduce((a, s) => a + s.cost, 0);

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <style>{`@keyframes um-breath { 0%,100% { box-shadow: 0 0 4px rgba(240,68,68,0.25), 0 0 0 0 rgba(240,68,68,0.2); border-color: rgba(240,68,68,0.5); } 50% { box-shadow: 0 0 14px rgba(240,68,68,0.75), 0 0 0 4px rgba(240,68,68,0.08); border-color: rgba(240,68,68,0.95); } }`}</style>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title={L('用量 / 费用详情')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          maxWidth: '100%',
          padding: '2px 8px',
          border: breathing ? '1px solid rgba(240,68,68,0.5)' : `1px solid ${open ? 'rgba(77,107,254,0.55)' : 'rgba(77,107,254,0.30)'}`,
          borderRadius: 999,
          background: breathing ? 'linear-gradient(90deg, rgba(240,68,68,0.16), rgba(240,68,68,0.06))' : open ? 'linear-gradient(90deg, rgba(77,107,254,0.16), rgba(124,92,255,0.08))' : 'linear-gradient(90deg, rgba(77,107,254,0.10), rgba(124,92,255,0.04))',
          color: t.text2,
          fontSize: 11,
          lineHeight: '16px',
          fontVariantNumeric: 'tabular-nums',
          cursor: 'pointer',
          transition: 'background .12s ease, border-color .12s ease',
          ...(breathing ? { animation: 'um-breath 1.6s ease-in-out infinite' } : {}),
        }}
      >
        <span style={{ fontWeight: 700, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: 'linear-gradient(90deg, #4d6bfe, #7c5cff)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {usage.model ?? L('未选择模型')}
        </span>
        <span style={{ color: t.text3, whiteSpace: 'nowrap' }}>·</span>
        <span style={{ fontWeight: 700, color: p ? t.brand : t.text3, whiteSpace: 'nowrap' }}>
          {p ? fmtMoney(usage.estimatedCost, usage.currency, usage) : L('无价格')}
        </span>
        {(balanceKind !== 'none' || (isDeepSeek && accountBalance === null)) && (
          <span
            title={
              accountBalance !== null
                ? `${(accountBalance.source === 'computed' ? L('计算') : L('更新'))}{L('更新于')} ${fmtTime(accountBalance.updatedAt)}${isDeepSeek ? '（官网余额刷新有延迟）' : ''}${pricesConverted ? ` · ${L('汇率 1USD≈')}${usage.usdToCny.toFixed(4)}CNY${usage.rateUpdatedAt > 0 ? ` · 更新于 ${fmtTime(usage.rateUpdatedAt)}` : ''}` : ''}`
                : L('等待余额配置…')
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
            {accountBalance === null ? (usage.balanceNeedsKey ? L('余额 未配置Key') : L('余额 获取中…')) : `${balanceNegative ? L('透支 ') : L('剩余 ')}${fmtBalance(accountBalance, usage)}`}
          </span>
        )}
        <span style={{ color: t.text3, whiteSpace: 'nowrap' }}>{usage.requestCount} 次</span>
        {rate !== null && (() => {
          const tier = rate >= 100 ? 'hi' : rate >= 50 ? 'mid' : 'low';
          const sp = tier === 'hi'
            ? { display: 'inline-block', overflow: 'hidden', background: 'linear-gradient(90deg, #4d6bfe, #8b5cf6, #f59e0b)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }
            : tier === 'mid'
              ? { display: 'inline-block', overflow: 'hidden', background: 'linear-gradient(90deg, #4d6bfe, #8b5cf6)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }
              : { display: 'inline-block', overflow: 'hidden', background: 'linear-gradient(90deg, #fbbf24, #f59e0b)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' };
          return <span key={tier} style={{ whiteSpace: 'nowrap', fontWeight: 700, ...sp }}>· {tt('speed')} {rate.toFixed(1)} tokens/s</span>;
        })()}
        <span style={{ color: t.text3, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .12s ease', fontSize: 9 }}>▼</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            // 以触发条为锚水平居中（而非左对齐向右展开），视觉上与下方文字整体对齐。
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 40,
            width: 620,
            maxWidth: 'calc(100vw - 32px)',
            background: 'linear-gradient(180deg, #e2ebff 0%, #f6f8ff 45%, #ffffff 100%)',
            border: '1px solid rgba(77,107,254,0.35)',
            borderRadius: 12,
            boxShadow: '0 12px 32px rgba(31, 35, 40, 0.18), 0 0 26px rgba(77,107,254,0.16)',
            padding: '12px 14px',
            fontSize: 12,
            color: t.text,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 13, background: 'linear-gradient(90deg, #4d6bfe, #7c5cff)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{usage.model ?? L('未选择模型')}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: t.text3, fontSize: 11 }}>{usage.provider ?? ''}</span>
              <button type="button" onClick={() => { setShowDash((o) => !o); if (!showDash) void loadDash(); }}
                title={L('用量展板')}
                style={{ fontSize: 13, lineHeight: 1, padding: '2px 6px', borderRadius: 6, border: '1px solid rgba(77,107,254,0.35)', background: showDash ? 'linear-gradient(90deg, #4d6bfe, #7c5cff)' : 'rgba(77,107,254,0.08)', color: showDash ? '#fff' : t.brand, cursor: 'pointer' }}>
                ▦
              </button>
            </span>
          </div>
          {showDash && (
            <div style={{ marginTop: 10, borderTop: '1px solid rgba(77,107,254,0.25)', paddingTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {([['all', '全部'], ['provider', '按提供商'], ['model', '按模型']] as Array<[string, string]>).map(([id, label]) => (
                    <button key={id} type="button" onClick={() => { setDashView(id as 'all' | 'provider' | 'model'); if (id === 'provider') setDashProv(provList[0] ?? ''); if (id === 'model') { setDashProv(provList[0] ?? ''); setDashModel(modelList[0]?.model ?? ''); } }}
                      style={{ padding: '4px 10px', fontSize: 11, borderRadius: 6, border: 'none', borderBottom: dashView === id ? '2px solid #7c5cff' : '2px solid transparent', background: dashView === id ? 'rgba(124,92,255,0.10)' : 'transparent', color: dashView === id ? t.brand : t.text3, fontWeight: 600, cursor: 'pointer' }}>{L(label)}</button>
                  ))}
                </div>
                {totalCost > 0 && <span style={{ fontSize: 12, fontWeight: 700, background: 'linear-gradient(90deg, #4d6bfe, #f59e0b)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{L('累计')} {fmtCost(totalCost)}</span>}
              </div>
              {dashStats.length === 0 ? (
                <div style={{ color: t.text3, fontSize: 11, marginTop: 10 }}>{L('暂无用量数据，先发几条消息再来看。')}</div>
              ) : dashView === 'all' ? (
                <div style={{ marginTop: 8 }}>
                  {dashStats.map((s) => {
                    const share = totalCost > 0 ? (s.cost / totalCost) * 100 : 0;
                    return (
                      <div key={`${s.provider}/${s.model}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                        <span style={{ fontSize: 11, color: t.text, minWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.model}</span>
                        <div style={{ flex: 1, height: 10, borderRadius: 999, background: t.borderSoft, overflow: 'hidden' }}>
                          <div style={{ width: `${share}%`, height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, #4d6bfe, #7c5cff, #f59e0b)', transition: 'width .3s ease' }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: t.brand, whiteSpace: 'nowrap' }}>{fmtCost(s.cost)}</span>
                        <span style={{ fontSize: 10, color: t.text3, whiteSpace: 'nowrap' }}>{share.toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
              ) : dashView === 'provider' ? (
                <div style={{ marginTop: 8 }}>
                  {provList.map((p) => {
                    const items = dashStats.filter((s) => s.provider === p);
                    const c = items.reduce((a, s) => a + s.cost, 0);
                    const share = totalCost > 0 ? (c / totalCost) * 100 : 0;
                    return (
                      <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                        <span style={{ fontSize: 11, color: t.text, minWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p}</span>
                        <div style={{ flex: 1, height: 10, borderRadius: 999, background: t.borderSoft, overflow: 'hidden' }}>
                          <div style={{ width: `${share}%`, height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, #7c5cff, #4d6bfe)', transition: 'width .3s ease' }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: t.brand, whiteSpace: 'nowrap' }}>{fmtCost(c)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    <select value={dashProv} onChange={(ev) => { setDashProv(ev.target.value); setDashModel(modelList[0]?.model ?? ''); }} style={{ padding: '4px 8px', border: '1px solid rgba(77,107,254,0.35)', borderRadius: 6, fontSize: 11, background: t.card, color: t.text }}>
                      {provList.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select value={dashModel} onChange={(ev) => setDashModel(ev.target.value)} style={{ padding: '4px 8px', border: '1px solid rgba(77,107,254,0.35)', borderRadius: 6, fontSize: 11, background: t.card, color: t.text }}>
                      {modelList.map((s) => <option key={`${s.provider}/${s.model}`} value={s.model}>{s.model}</option>)}
                    </select>
                  </div>
                  {(() => {
                    const m = dashStats.find((s) => s.provider === dashProv && s.model === dashModel);
                    if (m === undefined) return <div style={{ color: t.text3, fontSize: 11 }}>{L('该模型暂无用量')}</div>;
                    const buckets = [
                      ['输入', m.inputTokens], ['缓存读', m.cacheReadTokens], ['缓存写', m.cacheWriteTokens], ['输出', m.outputTokens], ['推理', m.reasoningTokens],
                    ] as Array<[string, number]>;
                    const tot = m.inputTokens + m.cacheReadTokens + m.cacheWriteTokens + m.outputTokens + m.reasoningTokens;
                    const colors = ['#4d6bfe', '#7c5cff', '#f59e0b', '#22c55e', '#ef4444'];
                    return (
                      <div>
                        <div style={{ display: 'flex', height: 14, borderRadius: 999, overflow: 'hidden', background: t.borderSoft }}>
                          {buckets.map(([label, n], i) => tot > 0 && n > 0 ? <div key={label} title={`${label}: ${n}`} style={{ width: `${(n / tot) * 100}%`, background: colors[i % colors.length] }} /> : null)}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
                          {buckets.map(([label, n], i) => tot > 0 && n > 0 ? <span key={label} style={{ fontSize: 10, color: t.text3 }}>{label} {n}</span> : null)}
                        </div>
                        <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: t.brand }}>{L('费用')} {fmtCost(m.cost)} · {L('请求')} {m.requestCount}</div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
          <div style={{ color: t.text3, fontSize: 11, marginTop: 2 }}>
            {L('价格来源')} {p?.source === 'remote' ? tt('sourceRemote') : p?.source === 'user' ? tt('sourceUser') : tt('sourceBuiltin')} · {L('更新于')}{' '}
            {p?.updatedAt ? new Date(p.updatedAt).toLocaleString() : '—'}
            {peak !== null ? ` · ${peak}` : ''}
            {pricesConverted ? ` · ${L('汇率 1USD=')}${usage.usdToCny.toFixed(4)}CNY` : ''}
          </div>

          <div style={{ ...row, borderBottom: '1px solid rgba(77,107,254,0.12)', paddingTop: 8, paddingBottom: 8 }}>
            <span style={{ color: t.text2 }}>{balanceKind === 'account' ? L('账户余额') : L('余额')}</span>
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
              <span style={{ fontWeight: 800, fontSize: 16, color: balanceKind === 'none' ? t.text3 : balanceNegative ? t.error : t.ok }}>
                {balanceKind === 'none'
                  ? isDeepSeek ? (usage.balanceNeedsKey ? L('未配置Key') : L('获取中…')) : L('未配置')
                  : accountBalance !== null ? fmtBalance(accountBalance, usage) : '—'}
              </span>
              {accountBalance !== null && accountBalance.updatedAt > 0 && (
                <span title={isDeepSeek ? L('官网余额刷新可能有延迟，余额按「锚点 − 本地消费」实时计算') : L('余额 = 账户余额 − 累计消费（全局账本）')} style={{ color: t.text3, fontSize: 10, whiteSpace: 'nowrap' }}>
                  {(accountBalance.source === 'computed' ? L('计算') : L('更新'))}{L('更新于')} {fmtTime(accountBalance.updatedAt)}
                  {isDeepSeek ? L(' · 官网刷新有延迟') : ''}
                </span>
              )}
              {pricesConverted && balanceKind !== 'none' && (
                <span style={{ color: t.text3, fontSize: 10, whiteSpace: 'nowrap' }}>
{L('汇率 1USD≈')}{usage.usdToCny.toFixed(4)}CNY{usage.rateUpdatedAt > 0 ? ` · ${L('更新于')} ${fmtTime(usage.rateUpdatedAt)}` : ''}
                </span>
              )}
            </span>
          </div>

          <div style={{ ...row, paddingTop: 6 }}>
            <span style={{ color: t.text2 }}>{tt('sessionCost')}</span>
            <span style={{ fontWeight: 700, color: p ? t.brand : t.text3, whiteSpace: 'nowrap' }}>{p ? fmtMoney(usage.estimatedCost, usage.currency, usage) : tt('noPriceData')}</span>
          </div>

          {/* 明细表即本轮口径（见下方 priceRows 区），不再单列「本轮」行。 */}

          {/* budget (src 保留功能) */}
          {usage.budget !== null && (
            <div style={{ borderTop: '1px solid rgba(77,107,254,0.12)', marginTop: 4, paddingTop: 8 }}>
              <div style={{ ...row, paddingTop: 0 }}>
                <span style={{ color: t.text2 }}>{L('预算')} {fmtMoney(usage.budget, usage.currency, usage)}</span>
                <span style={{ color: t.text3 }}>{L('已用')} {fmtMoney(usage.estimatedCost, usage.currency, usage)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 6, borderRadius: 999, background: t.borderSoft, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.round((budgetRatio ?? 0) * 100)}%`, height: '100%', borderRadius: 999, background: overBudget ? t.error : t.brand, transition: 'width .2s ease' }} />
                </div>
                <span style={{ fontWeight: 700, color: overBudget ? t.error : t.text, whiteSpace: 'nowrap' }}>
                  {overBudget ? L('超支 ') : L('剩余 ')}{fmtMoney(Math.abs(remaining ?? 0), usage.currency, usage)}
                </span>
              </div>
            </div>
          )}

          <div style={{ marginTop: 8 }}>
            <div style={{ ...row, paddingBottom: 2, color: t.text3, fontSize: 11 }}>
              <span style={{ flex: 1 }}>{tt('turnUsage')}</span>
              <span style={{ width: 92, textAlign: 'right', color: usage.peakState === 'peak' ? t.error : usage.peakState === 'off' ? t.ok : undefined }}>
                {tt('unitCol')}{usage.peakState === 'peak' ? tt('peakTag') : usage.peakState === 'off' ? tt('offTag') : ''}
              </span>
              <span style={{ width: 92, textAlign: 'right' }}>{tt('turnSubtotal')}</span>
            </div>
            {(() => {
              // 明细表口径 = 当前轮（lastTurn）：从轮开始零起算。旧宿主无
              // lastTurn 时回退到会话累计值。小计逐行按「本轮用量×单价×折扣」
              // 直接计算——不能读 costBreakdown 的桶（customRows 模式下宿主把
              // 全部金额塞进 input 桶，其余行小计恒为 0，即用户看到的零）。
              const lt = usage.lastTurn;
              const tu = lt != null
                ? { inputTokens: lt.inputTokens, cacheReadTokens: lt.cacheReadTokens, cacheWriteTokens: lt.cacheWriteTokens, outputTokens: lt.outputTokens }
                : usage;
              const disc = p !== null && p.discount !== undefined && p.discount < 1 ? p.discount : 1;
              return usage.priceRows.map((r) => {
                const primary = r.buckets[0] ?? 'input';
                const tokens = r.buckets.reduce((s, b) => s + bucketTokens(tu, b), 0);
                const price = r.perM ?? bucketPricePerM(p, primary);
                const cost = price !== undefined ? tokens * (price / 1_000_000) * disc : 0;
                return <BucketRow key={r.label + r.buckets.join(',')} label={L(r.label)} tokens={tokens} price={price} cost={cost} native={native} usage={usage} accent={primary === 'cacheRead' ? t.ok : undefined} />;
              });
            })()}
            {(usage.lastTurn != null ? usage.lastTurn.reasoningTokens : usage.reasoningTokens) > 0 && (
              <div style={{ ...row, color: t.text3, fontSize: 11, paddingTop: 1 }}>
                <span> {tt('reasoningIncluded')} {formatTokens(usage.lastTurn != null ? usage.lastTurn.reasoningTokens : usage.reasoningTokens)}{tt('includedInOut')}</span>
              </div>
            )}
            {p !== null && p.discount !== undefined && p.discount < 1 && (
              <div style={{ color: t.brand, fontSize: 10, paddingTop: 2 }}>{tt('batchHalfNote')}</div>
            )}
          </div>

          <div style={{ ...row, color: t.text2, fontSize: 11, borderTop: '1px solid rgba(77,107,254,0.12)', marginTop: 4, paddingTop: 6 }}>
            <span>{L('请求')} {usage.requestCount} {tt('reqOk')} {usage.stepCount} {tt('reqTry')}</span>
            {hitRate !== null && <span style={{ color: t.text3 }}>{tt('cacheHitPct')} {hitRate}%</span>}
          </div>

          {turns.length > 0 && (
            <div style={{ borderTop: '1px solid rgba(77,107,254,0.12)', marginTop: 6, paddingTop: 6 }}>
              <div style={{ color: t.text3, fontSize: 11, marginBottom: 2 }}>{tt('perTurnCosts')}{turns.length}{tt('turnsTotal')}</div>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {turns.map((turn, i) => {
                  const prev = i > 0 ? turns[i - 1] : undefined;
                  const newDay = prev === undefined || !sameDay(prev.startedAt, turn.startedAt);
                  return (
                    <Fragment key={turn.turn}>
                      {newDay && (
                        <div style={dateSep}>
                          <span style={{ flex: 1, height: 1, background: 'rgba(77,107,254,0.12)' }} />
                          <span>{fmtDate(turn.startedAt)}</span>
                          <span style={{ flex: 1, height: 1, background: 'rgba(77,107,254,0.12)' }} />
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
type PriceOverrideEntry = { prices?: Record<string, unknown>; rows?: unknown; templateId?: string };
/** Per-model editable price draft (input/cacheHit/output). */
type ModelSaveState = { ok: boolean; msg: string };

function draftKeyOf(provider: string, model: string): string {
  return `${provider}/${model}`;
}

/** 从导出文件名提取重命名版本号：`dsh-billing-x-y (1).json` → `1`；无 → null。 */
function versionSuffixOf(name: string): string | null {
  const m = /#(\d+)\b/.exec(name);
  return m !== null ? m[1] : null;
}

/** 导出列表用的短时间格式（月-日 时:分）。 */
function fmtListTime(ms: number): string {
  if (ms <= 0) return '';
  const d = new Date(ms);
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
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
  input: L('输入(未命中)'), cache: L('缓存命中'), cacheWrite: L('缓存写入'), output: L('输出'),
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

/** Direction-aware CNY↔USD conversion (single source of truth for the client;
 *  mirrors the host's `toDisplay`). */
function convertAmount(amount: number, from: string, to: string, usdToCny: number): number {
  if (from === to) return amount;
  if (from === 'USD' && to === 'CNY') return amount * usdToCny;
  if (from === 'CNY' && to === 'USD') return usdToCny > 0 ? amount / usdToCny : amount;
  return amount;
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
  /** True when this model bills the provider shared wallet. */
  usesSharedBalance?: boolean;
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
  // 模板选择持久化：优先用上次保存时显式选择的模板，绝不让 matchTypeId 的
  // 结构猜测改写用户的选择（此前峰谷模板保存后被重置的根因）。
  const savedTpl = typeof ov[key]?.templateId === 'string' ? (ov[key].templateId as string) : undefined;
  // 自定义行模式的峰谷价存在各行的 peakPerM/offPerM 上（宿主 resolvePricingForTime
  // 的 hasRowPeak 同款判定）。只看 pricing.peak/offPeak 会在保存后重播种时把
  // 「启用峰谷计费」错误地重置为关。
  const hasRowPeak = (rawCustom ?? []).some((r) => r?.peakPerM !== undefined || r?.offPerM !== undefined);
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
    peakOn: pe !== undefined && (pe.peak !== undefined || pe.offPeak !== undefined || hasRowPeak),
    days: Array.isArray(pe?.peakDays) ? (pe!.peakDays as number[]) : OFFICIAL_DAYS,
    windows: windowsToPeriods(Array.isArray(pe?.peakWindows) ? (pe!.peakWindows as Array<{ start: number; end: number }>) : OFFICIAL_WINDOWS),
    // 模板选择持久化：优先用上次保存时显式选择的模板（savedTpl 见上方声明），
    // 绝不让 matchTypeId 的结构猜测改写用户的选择。
    templateId: isCustom ? '' : (savedTpl !== undefined && savedTpl !== '' ? savedTpl : (pe !== undefined ? matchTypeId(pe as unknown as Parameters<typeof matchTypeId>[0]) : '')),
    customRows,
    baseCustomRows: customRows,
    combined: pe?.combinedPerM !== undefined,
    discount: typeof pe?.discount === 'number' && (pe!.discount as number) < 1 ? String(pe!.discount as number) : '',
    // whether this is a fresh official model shown with known defaults (→ show
    // a friendly "已按官方价预填，可修改后保存" hint) vs a non-official model
    // with no saved price (→ prompt the user to fill it in).
    prefillOfficial: official !== undefined && !savedOverride,
    noSavedPrice: !savedOverride && official === undefined && !hasBal(bals[`p:${provider}`]),
    usesSharedBalance: hasBal(bals[`p:${provider}`]),
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
  const [apiKey, setApiKey] = useState('');
  const [keySaved, setKeySaved] = useState(false);
  // 当前汇率 + 获取时间（来自宿主；设置页展示用）。
  const [pageRate, setPageRate] = useState<{ usdToCny: number; updatedAt: number }>({ usdToCny: 0, updatedAt: 0 });

  // 供应商 → 模型 分组定价管理
  const [modelDir, setModelDir] = useState<ModelDirEntry[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [selProvider, setSelProvider] = useState('');
  const [overrides, setOverrides] = useState<Record<string, PriceOverrideEntry>>({});
  const [balances, setBalances] = useState<BalancesDoc>({});
  const [edits, setEdits] = useState<Record<string, ModelEditorState>>({});
  // 用户手动改过「用户余额」的草稿 key 集合：R2 轮询不得覆盖这些输入（用户
  // 期望输入即改、点保存才落盘；轮询覆盖会在几秒内把输入刷回服务端旧值）。
  const balanceDirtyRef = useRef<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [saveStates, setSaveStates] = useState<Record<string, ModelSaveState>>({});
  const [savingAll, setSavingAll] = useState(false);
  const [lang, setLangState] = useState<Lang>(getLang());
  const bump = () => setForce((v) => v + 1);
  const [, setForce] = useState(0);
  useEffect(() => { const h = () => setForce((v) => v + 1); window.addEventListener('um-lang-change', h); return () => window.removeEventListener('um-lang-change', h); }, []);
  // 共享余额：provider id → 该供应商下所有模型是否共用一个余额钱包（默认关）。
  const [sharedBalances, setSharedBalances] = useState<Record<string, boolean>>({});
  const [templates, setTemplates] = useState<Array<{ id: string; label: string; rows: BillingRow[]; mode: string; peak?: boolean; note?: string }>>([]);
  // 当前正在使用（轮次进行中）的模型 key：设置页据此锁定该模型的编辑。
  const [activeKey, setActiveKey] = useState('');
  const activeKeyRef = useRef('');
  // 计费配置导出/导入：导入目标（哪张卡发起的导入）+ 隐藏文件选择框。
  const importTargetRef = useRef<{ provider: string; model: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 计费配置目录：导入面板打开的模型卡 + 目录内配置列表 + 实际目录 + 可编辑路径。
  const [importPickerKey, setImportPickerKey] = useState('');
  const [dirConfigs, setDirConfigs] = useState<Array<{ name: string; provider: string; model: string; mtime: number }>>([]);
  const [configDir, setConfigDir] = useState('');
  const [configDirInput, setConfigDirInput] = useState('');
  const [wrapperMarkersInput, setWrapperMarkersInput] = useState('');
  const [wmMsg, setWmMsg] = useState('');
  const [dirMsg, setDirMsg] = useState('');
  const [openStorage, setOpenStorage] = useState(false);
  const [storageTab, setStorageTab] = useState<'dir' | 'vision' | 'alert'>('dir');
  const [thrPct, setThrPct] = useState('');
  const [thrFloor, setThrFloor] = useState('');
  const [thrMsg, setThrMsg] = useState('');
  const [dirDelMsg, setDirDelMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  // 导出冲突内联选择：目录里已存在同名配置时，在该模型卡上展开「覆盖 / 重命名」。
  const [exportConflict, setExportConflict] = useState<{ provider: string; model: string; identical: boolean } | null>(null);
  const [renameMode, setRenameMode] = useState(false);
  const [renameName, setRenameName] = useState('');

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
        if (!res.ok) { setLoadError(L('加载失败 (') + `${res.status})`); return; }
        const doc = (await res.json()) as {
          config?: Record<string, unknown>;
          providers?: Record<string, { currency?: string; sharedBalance?: boolean }>;
          priceOverrides?: Record<string, PriceOverrideEntry>;
          balances?: BalancesDoc;
          rate?: { usdToCny?: number; rateUpdatedAt?: number };
        };
        if (doc.rate && typeof doc.rate.usdToCny === 'number') {
          setPageRate({ usdToCny: doc.rate.usdToCny, updatedAt: typeof doc.rate.rateUpdatedAt === 'number' ? doc.rate.rateUpdatedAt : 0 });
        }
        if (cancelled) return;
        const c = doc.config ?? {};
        const get = (v: unknown) => (v === null || v === undefined ? '' : String(v));
        setKeySaved(c.deepseekApiKey === '***');
        setConfigDirInput(typeof (c as Record<string, unknown>).billingConfigDir === 'string' && String((c as Record<string, unknown>).billingConfigDir) !== '' ? String((c as Record<string, unknown>).billingConfigDir) : '');
        setWrapperMarkersInput(typeof (c as Record<string, unknown>).wrapperMarkers === 'string' ? String((c as Record<string, unknown>).wrapperMarkers) : '');
        const _cap = (c as Record<string, unknown>).budgetAlertPct;
        setThrPct(typeof _cap === 'number' && _cap > 0 ? String(_cap) : '');
        const _caf = (c as Record<string, unknown>).balanceAlertFloor;
        setThrFloor(typeof _caf === 'number' && _caf > 0 ? String(_caf) : '');
        setOverrides(doc.priceOverrides ?? {});
        setBalances(doc.balances ?? {});
        const sb: Record<string, boolean> = {};
        for (const [pv, pc] of Object.entries(doc.providers ?? {})) if (pc.sharedBalance === true) sb[pv] = true;
        setSharedBalances(sb);
      } catch (err) {
        if (!cancelled) { console.warn('[usage-meter] load config failed', err); setLoadError(L('加载失败')); }
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
              // 显示层换算：服务端钱包值(其自带币种) → 编辑器当前币种。方向感知；
              // 同币种原样。切回锚定币种时编辑器会直接还原 base 原值，不经过这里。
              const walletCur = typeof b.currency === 'string' && b.currency !== '' ? b.currency : 'CNY';
              const converted = cur !== undefined && cur.currency !== walletCur
                ? convertAmount(b.balance, walletCur, cur.currency, rateRef.current)
                : b.balance;
              if (cur !== undefined && !balanceDirtyRef.current.has(k)) next[k] = { ...cur, balance: String(Math.round(converted * 1e6) / 1e6) };
            }
          }
          return next;
        });
      } catch { /* ignore transient network errors */ }
    };
    const id = setInterval(() => void poll(), 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // 草稿初值：从已存的 override + 余额账本预填（目录/override/余额变化时重置）。
  // 关键：只重置「底层数据真的变了」的键——保存模型 A 会更新 overrides/balances
  // 并触发本副作用，绝不能把用户在模型 B 里未保存的草稿一并冲掉。
  const draftSigsRef = useRef<Record<string, string>>({});
  useEffect(() => {
    const sigOf = (k: string): string => {
      const o = overrides[k];
      const bm = balances[`m:${k}`];
      const pv = k.split('/')[0];
      const bp = balances[`p:${pv}`];
      return JSON.stringify([o?.prices ?? null, o?.rows ?? null, o?.templateId ?? null, bm ?? bp ?? null]);
    };
    setEdits((prev) => {
      const d: Record<string, ModelEditorState> = {};
      const sigs: Record<string, string> = {};
      for (const p of modelDir) {
        for (const m of p.models) {
          const k = draftKeyOf(p.provider, m.model);
          sigs[k] = sigOf(k);
          // 底层数据没变 + 已有用户草稿 → 原样保留（含未保存修改）
          d[k] = prev[k] !== undefined && draftSigsRef.current[k] === sigs[k] ? prev[k] : seedEntry(k, overrides, balances);
        }
      }
      draftSigsRef.current = sigs;
      return d;
    });
  }, [modelDir, overrides, balances]);

  // 使用中模型轮询：3s 一次。锁定的模型在设置页不可编辑（单价/余额/模板全部）。
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch('/api/usage-meter/active');
        if (!res.ok) return;
        const doc = (await res.json()) as { active?: { provider: string; model: string } | null };
        if (cancelled) return;
        const a = doc.active ?? null;
        const key = a !== null ? `${a.provider}/${a.model}` : '';
        activeKeyRef.current = key;
        setActiveKey(key);
      } catch { /* ignore */ }
    };
    void poll();
    const id = setInterval(() => void poll(), 3000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

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
      // keep 模式（Batch 半价）本意是只改折扣倍率——但设置页对 keep 模板仍
      // 渲染「基础单价」编辑格（columnsForTemplate 兜底列）。用户填了就必须
      // 原样发送，否则既丢用户输入，宿主又会因覆盖缺价格字段而把内置基价
      // 剥离成 0（表现为保存后输入框全部清空）。
      const cols = columnsForTemplate(e.templateId, templates);
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
        .map((r) => (e.peakOn && num(r.perM) === undefined ? { ...r, perM: r.offPerM.trim() !== '' ? r.offPerM : r.peakPerM } : r))
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
    const body: Record<string, unknown> = { provider, model, prices, displayCurrency: e.currency, templateId: e.templateId };
    // 保存语义：当前显示的一切原样落盘——余额数值 + 它的币种一起写，宿主按
    // 该币种建账（不做任何二次换算）。
    if (!isDeepseekRoute(provider)) {
      const bal = num(e.balance);
      if (bal !== undefined) { body.balance = bal; body.balanceCurrency = e.currency === '' ? 'CNY' : e.currency; }
    }
    // 模板 → 弹窗行（WYSIWYG，全模板统一）：行名与覆盖范围直接抄模板定义
    // （如合并模板的一行「输入+输出（合并计价）」），单价取设置页对应格。
    // 模板自身没有行定义时（Batch keep），按格子列生成。
    if (e.templateId !== '') {
      const pkF = { input: ['inputPeak', 'inputOff'], cache: ['cachePeak', 'cacheOff'], cacheWrite: ['cachePeak', 'cacheOff'], output: ['outPeak', 'outOff'] } as const;
      const fieldOfBucket = { input: 'input', cacheRead: 'cache', cacheWrite: 'cacheWrite', output: 'output' } as const;
      const tplDef2 = templates.find((tp) => tp.id === e.templateId);
      const rowDefs = tplDef2 !== undefined && Array.isArray(tplDef2.rows) && tplDef2.rows.length > 0
        ? tplDef2.rows.map((tr) => ({ label: tr.label, buckets: tr.buckets ?? [], f: fieldOfBucket[tr.buckets?.[0] ?? 'input'] }))
        : columnsForTemplate(e.templateId, templates).map((f) => ({ label: FIELD_LABEL[f], buckets: [({ input: 'input', cache: 'cacheRead', cacheWrite: 'cacheWrite', output: 'output' } as const)[f]] as BillingRow['buckets'], f }));
      const dispRows = rowDefs
        .map((rd) => {
          const row: BillingRow = { label: rd.label, buckets: rd.buckets };
          if (!e.peakOn) {
            row.perM = num(e[rd.f]);
          } else {
            row.perM = num(e[rd.f]);
            row.peakPerM = num(e[pkF[rd.f][0]]);
            row.offPerM = num(e[pkF[rd.f][1]]);
          }
          return row;
        })
        .filter((r) => r.perM !== undefined || r.peakPerM !== undefined || r.offPerM !== undefined);
      if (dispRows.length > 0) body.rows = dispRows;
    }
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
    const scale = (v: string): string => {
      const n = Number(v);
      if (v.trim() === '' || Number.isNaN(n)) return '';
      // 方向感知换算：baseCurrency→newCur。CNY→USD 必须 ÷rate（此前恒 ×rate
      // 导致人民币定价模型切 USD 后数值放大 7 倍的 bug）。
      const converted = newCur === cur.baseCurrency ? n : convertAmount(n, cur.baseCurrency, newCur, rate);
      return String(Math.round(converted * 1e6) / 1e6);
    };
    setEdits((s) => {
      const base = s[key];
      if (base === undefined) return s;
      const next: ModelEditorState = { ...base, currency: newCur };
      for (const f of NUM_PRICE_FIELDS) next[f] = scale(base.base[f] ?? '');
      next.customRows = base.baseCustomRows.map((r) => ({ ...r, perM: scale(r.perM), peakPerM: scale(r.peakPerM), offPerM: scale(r.offPerM) }));
      // 余额：锚定 base 快照。切回定价币种 → 直接还原原值（不再乘除汇率）；
      // 切走 → 从原值按方向换算一次。
      if (newCur === base.baseCurrency) next.balance = base.base['balance'] ?? '';
      else {
        const origin = Number(base.base['balance'] ?? '');
        if (base.base['balance'] !== undefined && base.base['balance'] !== '' && !Number.isNaN(origin)) {
          next.balance = String(Math.round(convertAmount(origin, base.baseCurrency, newCur, rateRef.current) * 1e6) / 1e6);
        }
      }
      return { ...s, [key]: next };
    });
  };

  // Edits to a numeric cell. When the model is currently shown in its PRICING
  // currency, also keep the base snapshot in sync so a later currency switch
  // (away and back to base) preserves the edit instead of reverting to the old
  // seeded value.
  const editNum = (key: string, fld: string, val: string): void => {
    // 用户手动编辑余额 → 标记 dirty，R2 轮询跳过该字段，避免输入被刷回旧值。
    if (fld === 'balance') balanceDirtyRef.current.add(key);
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
  // Bucket picks are unique across rows: picking an already-used bucket SWAPS
  // it with the other row (each row keeps its own radio group — groups are
  // named per-row, so row 2's pick never clears row 1's).
  const editCustomRow = (key: string, ri: number, updater: (r: CustomRow) => CustomRow): void => {
    setEdits((s) => {
      const cur = s[key];
      if (cur === undefined) return s;
      const inBase = cur.currency === cur.baseCurrency;
      let rows = cur.customRows.map((x, i) => (i === ri ? updater(x) : x));
      const picked = rows[ri]?.bucket;
      if (picked !== undefined) {
        const owner = rows.findIndex((x, i) => i !== ri && x.bucket === picked);
        if (owner >= 0) {
          const prev = cur.customRows[ri].bucket;
          rows = rows.map((x, i) => (i === owner ? { ...x, bucket: prev } : x));
        }
      }
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
      // 保存成功 = 用户输入已落盘 → 解除 dirty，此后轮询可安全刷新为服务端值。
      balanceDirtyRef.current.delete(k);
      if (body.balance !== undefined) {
        setBalances((b) => ({ ...b, [`m:${provider}/${model}`]: { balance: Number(body.balance), currency: typeof body.balanceCurrency === 'string' ? body.balanceCurrency : 'CNY' } }));
      }
      // 本地覆盖缓存要存全量（prices + rows + templateId）：只存 prices 会让
      // 随后的草稿重播种丢掉模板选择与弹窗行快照。
      setOverrides((o) => ({ ...o, [k]: {
        prices: body.prices as Record<string, unknown>,
        ...(Array.isArray(body.rows) ? { rows: body.rows as BillingRow[] } : {}),
        ...(typeof body.templateId === 'string' ? { templateId: body.templateId } : {}),
      } }));
      // 保存 = 应用：把当前显示值锚定为新的 base 快照（币种一并切换），此后
      // 的切换/还原都以此为准；弹窗经 displayCurrency 同步为同一币种。
      setEdits((s) => {
        const cur = s[k];
        if (cur === undefined) return s;
        const base = { ...cur.base };
        for (const f of NUM_PRICE_FIELDS) base[f] = cur[f];
        return { ...s, [k]: { ...cur, baseCurrency: cur.currency, base, baseCustomRows: cur.customRows } };
      });
    }
    return res.ok;
  };

  const saveModelPrice = async (provider: string, model: string) => {
    const k = draftKeyOf(provider, model);
    if (k === activeKeyRef.current) {
      // 使用中锁定：模型正在跑，禁止落盘任何价格/余额变更
      setSaveStates((s) => ({ ...s, [k]: { ok: false, msg: tt('lockedSaveMsg') } }));
      window.setTimeout(() => setSaveStates((s) => { const n = { ...s }; delete n[k]; return n; }), 3500);
      return;
    }
    const body = buildModelBody(provider, model);
    if (body === null) return;
    setSaveStates((s) => ({ ...s, [k]: { ok: false, msg: tt('savingUnit') } }));
    let ok = false;
    try {
      ok = await persistModel(provider, model, body);
    } catch (err) {
      console.warn('[usage-meter] save model price failed', err);
    }
    setSaveStates((s) => ({ ...s, [k]: { ok, msg: ok ? tt('savedUnit') : tt('saveFailedUnit') } }));
    window.setTimeout(() => setSaveStates((s) => {
      const n = { ...s };
      delete n[k];
      return n;
    }), 2500);
  };

  const resetModelPrice = (provider: string, model: string) => {
    const k = draftKeyOf(provider, model);
    if (k === activeKeyRef.current) {
      // 使用中锁定：模型正在跑，重置与保存一样禁止
      setSaveStates((s) => ({ ...s, [k]: { ok: false, msg: tt('lockedSaveMsg') } }));
      window.setTimeout(() => setSaveStates((s) => { const n = { ...s }; delete n[k]; return n; }), 3500);
      return;
    }
    // 重置 = 丢弃未保存修改，回退到「该模型上次已保存的价格」；DeepSeek 官方模型
    // 且从未改过 → 回退到官方价（seedEntry 里已含官方预填）。
    setEdits((s) => ({ ...s, [k]: seedEntry(k, overrides, balances) }));
    const official = isDeepseekRoute(provider);
    setSaveStates((s) => ({ ...s, [k]: { ok: true, msg: official ? tt('resetToOfficial') : tt('resetToSaved') } }));
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
      setSaveStates((s) => ({ ...s, [k]: { ok, msg: ok ? tt('savedUnit') : tt('saveFailedUnit') } }));
    }));
    setSavingAll(false);
  };

  // ── 计费配置导出/导入（把某模型的计费模板快速复用到另一模型）────────────
  // 导出：把该模型当前编辑态经 buildModelBody 生成的 POST body 中的计费配置
  // （prices/rows/templateId/displayCurrency，不含用户余额）序列化为自描述 JSON
  // 下载。导入：把这份 JSON 应用到目标模型——POST 走 /api/usage-meter/config，
  // 复用 persistModel；导入成功后 overrides 变化触发草稿重播种，目标模型编辑器
  // 自动刷新为导入的模板/价格（含峰谷）。
  // 工具栏本地反馈（导出/导入成功与否，显示在「导出计费配置」按钮旁的空白处）。
  const [barMsg, setBarMsg] = useState<Record<string, { ok: boolean; msg: string } | undefined>>({});
  const barStatus = (k: string, ok: boolean, msg: string): void => {
    setBarMsg((s) => ({ ...s, [k]: { ok, msg } }));
    window.setTimeout(() => setBarMsg((s) => { const n = { ...s }; delete n[k]; return n; }), 3500);
  };

  const exportModelConfig = async (provider: string, model: string): Promise<void> => {
    const k = draftKeyOf(provider, model);
    const probe = await runExport(provider, model, {});
    if (!probe.ok) { barStatus(k, false, L('导出失败')); return; }
    if (probe.created === true) { barStatus(k, true, L('已导出到计费配置目录')); return; }
    // 目录里已存在同名配置：不弹系统窗、不显示裸"失败"——展开内联「覆盖 / 重命名」选择条。
    setExportConflict({ provider, model, identical: probe.identical === true });
    setRenameMode(false);
    const ts = ((): string => { const d = new Date(); const p = (n: number): string => String(n).padStart(2, '0'); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`; })();
    setRenameName(`dsh-billing-${provider.replace(/[^\w.-]+/g, '_')}-${model.replace(/[^\w.-]+/g, '_')} #1-${ts}.json`);
  };

  /** 组装某模型的导出文档（模板 + 价格 + 行 + 币种；不含余额）。 */
  const exportBodyFor = (provider: string, model: string): Record<string, unknown> | null => {
    const body = buildModelBody(provider, model);
    if (body === null) return null;
    return {
      templateId: body.templateId,
      displayCurrency: body.displayCurrency,
      prices: body.prices ?? {},
      ...(Array.isArray(body.rows) ? { rows: body.rows } : {}),
    };
  };

  const runExport = async (provider: string, model: string, extra: { fileName?: string; force?: boolean }): Promise<{ ok: boolean; created?: boolean; exists?: boolean; identical?: boolean }> => {
    const doc = exportBodyFor(provider, model);
    if (doc === null) return { ok: false };
    try {
      const res = await fetch('/api/usage-meter/export-config', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider, model, ...doc, ...extra }),
      });
      if (!res.ok) return { ok: false };
      return (await res.json().catch(() => ({}))) as { ok: boolean; created?: boolean; exists?: boolean; identical?: boolean };
    } catch (err) {
      console.warn('[usage-meter] export failed', err);
      return { ok: false };
    }
  };

  const closeExportConflict = (): void => { setExportConflict(null); setRenameMode(false); };

  /** 「覆盖现有模板」：强制写回同名文件。 */
  const confirmOverwriteExport = async (): Promise<void> => {
    const c = exportConflict;
    if (c === null) return;
    const r = await runExport(c.provider, c.model, { force: true });
    barStatus(draftKeyOf(c.provider, c.model), r.ok === true, r.ok === true ? L('已覆盖') : L('导出失败'));
    closeExportConflict();
  };

  /** 「重命名保存」：按输入的新文件名保存；名字已存在则提示并保持面板。 */
  const confirmRenameExport = async (): Promise<void> => {
    const c = exportConflict;
    if (c === null) return;
    const fname = renameName.trim().endsWith('.json') ? renameName.trim() : `${renameName.trim()}.json`;
    const r = await runExport(c.provider, c.model, { fileName: fname });
    const k = draftKeyOf(c.provider, c.model);
    if (r.ok === true && r.created === true) { barStatus(k, true, L('已导出到计费配置目录')); closeExportConflict(); return; }
    if (r.exists === true) { barStatus(k, false, L('该文件名已存在，请换名重试')); return; }
    barStatus(k, r.ok === true, r.ok === true ? L('已导出到计费配置目录') : L('导出失败'));
    closeExportConflict();
  };

  /** 触发导入：打开目录导入面板（列目录里的计费配置 + 手动选文件）。模型中则拒绝。 */
  const triggerImport = async (provider: string, model: string): Promise<void> => {
    const k = draftKeyOf(provider, model);
    if (k === activeKeyRef.current) {
      setSaveStates((s) => ({ ...s, [k]: { ok: false, msg: tt('lockedSaveMsg') } }));
      window.setTimeout(() => setSaveStates((s) => { const n = { ...s }; delete n[k]; return n; }), 3500);
      return;
    }
    try {
      const res = await fetch('/api/usage-meter/list-configs');
      if (res.ok) {
        const d = (await res.json()) as { dir?: string; files?: Array<{ name: string; provider: string; model: string; mtime: number }> };
        setDirConfigs(d.files ?? []);
        setConfigDir(typeof d.dir === 'string' ? d.dir : '');
      }
    } catch { /* keep last list */ }
    setImportPickerKey((prev) => (prev === k ? '' : k));
  };

  /** 从目录导入：服务端读取指定配置文件并应用到目标模型，随后刷新客户端。 */
  const importFromDir = async (targetProvider: string, targetModel: string, fileName: string): Promise<void> => {
    const k = draftKeyOf(targetProvider, targetModel);
    setSaveStates((s) => ({ ...s, [k]: { ok: false, msg: tt('savingUnit') } }));
    let ok = false;
    try {
      const res = await fetch('/api/usage-meter/import-config', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider: targetProvider, model: targetModel, fileName }),
      });
      ok = res.ok;
      if (res.ok) await reloadConfig();
    } catch (err) {
      console.warn('[usage-meter] import-from-dir failed', err);
    }
    barStatus(k, ok, ok ? L('已导入计费配置') : L('导入失败'));
    setImportPickerKey('');
  };

  /** 重新拉取配置，让 overrides/balances 变化触发草稿重播种（目录导入后刷新编辑器）。 */
  const reloadConfig = async (): Promise<void> => {
    try {
      const res = await fetch('/api/usage-meter/config');
      if (!res.ok) return;
      const doc = (await res.json()) as { providers?: Record<string, { currency?: string; sharedBalance?: boolean }>; priceOverrides?: Record<string, PriceOverrideEntry>; balances?: BalancesDoc };
      setOverrides(doc.priceOverrides ?? {});
      setBalances(doc.balances ?? {});
      const sb: Record<string, boolean> = {};
      for (const [pv, pc] of Object.entries(doc.providers ?? {})) if (pc.sharedBalance === true) sb[pv] = true;
      setSharedBalances(sb);
    } catch { /* ignore */ }
  };

  /** 保存「计费配置目录」设置（空 = 恢复默认 DSH_HOME/usage-meter），经 config POST 落盘。 */
  const saveBillingConfigDir = async (): Promise<void> => {
    setDirMsg('');
    try {
      const res = await fetch('/api/usage-meter/config', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ billingConfigDir: configDirInput.trim() }),
      });
      if (res.ok) {
        const lr = await fetch('/api/usage-meter/list-configs');
        if (lr.ok) { const d = (await lr.json()) as { dir?: string }; setConfigDir(typeof d.dir === 'string' ? d.dir : ''); }
        setDirMsg(L('目录已保存'));
      } else {
        setDirMsg(L('保存失败'));
      }
    } catch (err) {
      console.warn('[usage-meter] save billingConfigDir failed', err);
      setDirMsg(L('保存失败'));
    }
    window.setTimeout(() => setDirMsg(''), 3000);
  };

  /** 一键删除目录里某条已导出的计费配置。 */
  /** 保存「视觉包装识别标记」（每行一个；留空 = 关闭识别），经 config POST 落盘。 */
  const saveWrapperMarkers = async (): Promise<void> => {
    setWmMsg('');
    try {
      const res = await fetch('/api/usage-meter/config', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ wrapperMarkers: wrapperMarkersInput.trim() }),
      });
      setWmMsg(res.ok ? L('已保存识别标记') : L('保存失败'));
    } catch (err) {
      console.warn('[usage-meter] save wrapperMarkers failed', err);
      setWmMsg(L('保存失败'));
    }
    window.setTimeout(() => setWmMsg(''), 3000);
  };

  /** 保存全局预警阈值（预算% / 余额下限），经 config POST 落盘。 */
  const saveGlobalThreshold = async (): Promise<void> => {
    setThrMsg('');
    const pct = Number(thrPct);
    const floor = Number(thrFloor);
    const body: Record<string, unknown> = {};
    if (!Number.isNaN(pct) && pct >= 0) body.budgetAlertPct = pct;
    if (!Number.isNaN(floor) && floor >= 0) body.balanceAlertFloor = floor;
    try {
      const res = await fetch('/api/usage-meter/config', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      setThrMsg(res.ok ? L('已保存全局阈值') : L('保存失败'));
    } catch (err) {
      console.warn('[usage-meter] save global threshold failed', err);
      setThrMsg(L('保存失败'));
    }
    window.setTimeout(() => setThrMsg(''), 3000);
  };

  const deleteConfig = async (fileName: string): Promise<void> => {
    if (!window.confirm(L('确定删除该计费配置？'))) return;
    let ok = false;
    try {
      const res = await fetch('/api/usage-meter/delete-config', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fileName }),
      });
      ok = res.ok;
    } catch (err) {
      console.warn('[usage-meter] delete config failed', err);
    }
    if (ok) {
      setDirConfigs((s) => s.filter((c) => c.name !== fileName));
      setDirDelMsg({ ok: true, msg: L('已删除') });
    } else {
      setDirDelMsg({ ok: false, msg: L('删除失败') });
    }
    window.setTimeout(() => setDirDelMsg(null), 3500);
  };

  /** 处理导入文件：校验导出 JSON，把它作为目标模型的计费配置落盘。 */
  const handleImportFile = async (ev: { target: { files: FileList | null; value: string } }): Promise<void> => {
    const t = importTargetRef.current;
    importTargetRef.current = null;
    const file = ev.target.files?.[0];
    ev.target.value = ''; // 允许再次选同一文件
    if (t === null || file === undefined) return;
    const k = draftKeyOf(t.provider, t.model);
    let doc: { __dshUsageMeter?: unknown; prices?: unknown; templateId?: unknown; displayCurrency?: unknown; rows?: unknown };
    try {
      doc = JSON.parse(await file.text()) as typeof doc;
    } catch {
      setSaveStates((s) => ({ ...s, [k]: { ok: false, msg: L('导入失败') } }));
      window.setTimeout(() => setSaveStates((s) => { const n = { ...s }; delete n[k]; return n; }), 2500);
      return;
    }
    if (doc === null || typeof doc !== 'object' || doc.__dshUsageMeter !== 1 || typeof doc.prices !== 'object' || doc.prices === null) {
      setSaveStates((s) => ({ ...s, [k]: { ok: false, msg: L('导入文件无效') } }));
      window.setTimeout(() => setSaveStates((s) => { const n = { ...s }; delete n[k]; return n; }), 2500);
      return;
    }
    const body: Record<string, unknown> = {
      provider: t.provider,
      model: t.model,
      prices: doc.prices as Record<string, unknown>,
      displayCurrency: typeof doc.displayCurrency === 'string' && doc.displayCurrency !== '' ? doc.displayCurrency : 'CNY',
      templateId: typeof doc.templateId === 'string' ? doc.templateId : '',
    };
    if (Array.isArray(doc.rows)) body.rows = doc.rows;
    let ok = false;
    try {
      ok = await persistModel(t.provider, t.model, body);
    } catch (err) {
      console.warn('[usage-meter] import billing config failed', err);
    }
    barStatus(k, ok, ok ? L('已导入计费配置') : L('导入失败'));
  };

  const field: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '8px 0' };
  const label: CSSProperties = { width: 132, minWidth: 132, fontSize: 13, color: t.brand, whiteSpace: 'nowrap' };
  const input: CSSProperties = { flex: 1, maxWidth: 320, padding: '6px 8px', border: '1px solid rgba(77,107,254,0.35)', borderRadius: 6, fontSize: 13, background: t.card, color: t.text };
  const select: CSSProperties = { padding: '6px 8px', border: '1px solid rgba(77,107,254,0.35)', borderRadius: 6, fontSize: 13, background: t.card, color: t.text };

  // ── 模型编辑器统一设计规范 ──────────────────────────────────────────
  // 所有模板卡片共用同一套字号阶梯、控件高度、圆角与间距，杜绝"拼凑感"。
  // 参考 DSH 官方设置页的控件规范：标签固定宽右对齐、输入框统一高度、
  // 主/次/小按钮三档统一样式。
  const LABEL_W = 96;              // 表单标签固定宽度（右对齐 → 各输入框左缘对齐成一条竖线）
  const CTL_H = 30;                // 输入框 / 下拉框统一高度
  const ctl = (extra?: CSSProperties): CSSProperties => ({
    height: CTL_H, boxSizing: 'border-box', padding: '0 8px',
    border: '1px solid rgba(77,107,254,0.35)', borderRadius: 6,
    fontSize: 13, background: t.card, color: t.text,
    ...extra,
  });
  const formLabel: CSSProperties = { width: LABEL_W, minWidth: LABEL_W, fontSize: 13, color: t.brand, textAlign: 'right', whiteSpace: 'nowrap' };
  const sectTitle: CSSProperties = { fontSize: 12, fontWeight: 600, color: t.brand, margin: '0 0 6px' };
  const hint: CSSProperties = { fontSize: 11, color: t.text3, lineHeight: 1.5 };
  const btnPrimary: CSSProperties = { height: 30, padding: '0 20px', borderRadius: 6, border: 'none', background: 'linear-gradient(90deg, #4d6bfe 0%, #7c5cff 100%)', color: '#ffffff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(31,35,40,0.15), 0 0 12px rgba(77,107,254,0.35)' };
  const btnGhost: CSSProperties = { height: 30, padding: '0 20px', borderRadius: 6, border: '1px solid rgba(77,107,254,0.35)', background: 'transparent', color: t.text2, fontSize: 13, cursor: 'pointer' };
  const btnSmall: CSSProperties = { height: 26, padding: '0 12px', borderRadius: 6, border: '1px solid rgba(77,107,254,0.35)', background: 'transparent', color: t.text2, fontSize: 12, cursor: 'pointer' };

  const msToReadable = (ms: string): string => {
    const n = Number(ms);
    if (Number.isNaN(n) || n <= 0) return ms;
    return n >= 86400000 ? `${Math.round(n / 86400000)}{L('天')}` : n >= 3600000 ? `${Math.round(n / 3600000)}{L('小时')}` : n >= 60000 ? `${Math.round(n / 60000)}{L('分钟')}` : `${Math.round(n / 1000)}{L('秒')}`;
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
      if (apiKey.trim() !== '' && apiKey !== '***') patch.deepseekApiKey = apiKey.trim();
      patch.provider = '*';
      const res = await fetch('/api/usage-meter/config', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch) });
      if (res.ok) {
        setSaveOk(true); setSaveMsg(L('已保存'));
        // API key 只在保存后"消失"（置为已保存芯片 / 清空输入，只作掩码显示）。
        if (apiKey.trim() !== '' && apiKey !== '***') { setKeySaved(true); setApiKey(''); }
      } else { setSaveOk(false); setSaveMsg(L('保存失败 (') + `${res.status})`); }
    } catch (err) {
      console.warn('[usage-meter] save config failed', err);
      setSaveOk(false); setSaveMsg(L('保存失败'));
    }
    setSaving(false);
    window.setTimeout(() => { setSaveMsg(''); setSaveOk(false); }, 2500);
  };

  return (
    <div style={{ padding: '16px 24px 24px', fontSize: 13, color: t.text }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: 0.8, color: t.brand, background: 'linear-gradient(90deg, #4d6bfe 0%, #7c5cff 55%, #38bdf8 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>dsh-usage-meter-harness</h2>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: t.text3 }}>Language</span>
          <select value={lang} onChange={(ev) => { const v = ev.target.value as Lang; setLangState(v); setLang(v); bump(); }}
            style={{ padding: '2px 6px', border: '1px solid rgba(77,107,254,0.35)', borderRadius: 5, background: t.card, color: t.text, fontSize: 12 }}>
            <option value="zh">{L('中文')}</option>
            <option value="en">English</option>
          </select>
        </label>
      </div>
      <p style={{ color: t.text3, fontSize: 12, margin: '0 0 12px' }}>
        {tt('subtitle')}
      </p>
      {loadError !== '' && (
        <div style={{ marginBottom: 12, padding: '8px 10px', border: `1px solid ${t.error}`, borderRadius: 6, color: t.error, fontSize: 12 }}>{loadError}</div>
      )}
      {loading ? (
        <div style={{ color: t.text3, fontSize: 13 }}>{L('加载全局配置…')}</div>
      ) : (
        <div>
          <div style={field}>
            <label style={label} htmlFor="um-key">{tt('apiKey')}</label>
            <div style={{ flex: 1, display: 'flex', gap: 8, maxWidth: 360, alignItems: 'center' }}>
              {keySaved ? (
                <span style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(22, 163, 74, 0.10)', color: t.ok, fontSize: 12, whiteSpace: 'nowrap' }}>{tt('keySavedChip')}</span>
              ) : (
                <span style={{ color: t.text3, fontSize: 12, whiteSpace: 'nowrap' }}>{tt('keyNotSet')}</span>
              )}
              <input
                id="um-key"
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); }}
                placeholder={keySaved ? tt('keyPlaceholderSaved') : tt('keyPlaceholderNew')}
                autoComplete="off"
                style={{ ...input, maxWidth: 200 }}
              />
            </div>
          </div>
          <div style={field}>
            <label style={label} htmlFor="um-rate">{tt('rate')}</label>
            <div style={{ flex: 1, display: 'flex', gap: 8, maxWidth: 360, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: t.text }}>{pageRate.usdToCny > 0 ? pageRate.usdToCny.toFixed(4) : tt('notFetched')} CNY</span>
              {pageRate.updatedAt > 0 && (
                <span style={{ fontSize: 11, color: Date.now() - pageRate.updatedAt > 24 * 3600 * 1000 ? t.error : t.text3, whiteSpace: 'nowrap' }}>
                  {tt('fetchedAt')} {fmtTime(pageRate.updatedAt)}{Date.now() - pageRate.updatedAt > 24 * 3600 * 1000 ? tt('staleOver24h') : ''}
                </span>
              )}
              <button type="button" onClick={() => void (async () => {
                try {
                  const r = await fetch('/api/usage-meter/refresh-rate', { method: 'POST' });
                  if (r.ok) { const d = await r.json() as { usdToCny?: number; rateUpdatedAt?: number }; setPageRate({ usdToCny: typeof d.usdToCny === 'number' ? d.usdToCny : pageRate.usdToCny, updatedAt: typeof d.rateUpdatedAt === 'number' ? d.rateUpdatedAt : Date.now() }); }
                } catch { /* ignore */ }
              })()} style={{ fontSize: 12, padding: '5px 14px', borderRadius: 6, border: '1px solid rgba(77,107,254,0.45)', background: 'rgba(77,107,254,0.08)', color: t.brand, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>{L('刷新汇率')}</button>
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" onClick={save} disabled={saving} style={{ fontSize: 13, padding: '6px 18px', borderRadius: 6, border: 'none', background: saving ? 'rgba(139,148,158,0.45)' : 'linear-gradient(90deg, #4d6bfe, #7c5cff)', color: '#ffffff', fontWeight: 600, cursor: saving ? 'default' : 'pointer' }}>
              {saving ? tt('savingUnit') : tt('save')}
            </button>            {saveMsg !== '' && (
              <span style={{ fontSize: 12, color: saveOk ? t.ok : t.error }}>
                {saveMsg}{saveOk && apiKey.trim() !== '' ? L(' · 已更新 API Key') : ''}
              </span>
            )}
          </div>

          {/* ── 供应商 → 模型 分组定价管理（可折叠）────────────────────── */}
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${t.borderSoft}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2, background: 'linear-gradient(90deg, #4d6bfe, #7c5cff)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{L('用量计量 · 模型配置')}</div>
                <div style={{ color: t.text3, fontSize: 11, marginBottom: 0 }}>
                  {L('按供应商 → 模型为每个模型单独设置币种、用户余额、单价（含峰谷价对）、生效星期与高峰时段。')}
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
                    style={{ fontSize: 12, padding: '5px 14px', borderRadius: 6, border: 'none', background: savingAll ? 'rgba(139,148,158,0.45)' : 'linear-gradient(90deg, #4d6bfe, #7c5cff)', color: '#ffffff', fontWeight: 600, cursor: savingAll ? 'default' : 'pointer', whiteSpace: 'nowrap' }}
                  >
                    {savingAll ? 'saving' : L('一键保存全部')}
                  </button>
                );
              })()}
            </div>
            {modelsLoading ? (
              <div style={{ color: t.text3, fontSize: 12, marginTop: 8 }}>{L('加载模型目录…')}</div>
            ) : modelDir.length === 0 ? (
              <div style={{ color: t.text3, fontSize: 12, marginTop: 8 }}>
                {L('未从模型目录获取到模型。请确认当前组合已注册 LLM 适配（ctx.llm）。')}
              </div>
            ) : (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <label style={{ fontSize: 12, color: t.brand }} htmlFor="um-provider">{L('供应商')}</label>
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
                      <span style={{ fontSize: 11, color: t.brand }}>{L('共享余额（该供应商所有模型共用一个余额）')}</span>
                    </label>
                  )}
                </div>
                {(() => {
                  const active = modelDir.find((p) => p.provider === selProvider);
                  if (active === undefined) return <div style={{ color: t.text3, fontSize: 12 }}>{L('请选择供应商')}</div>;
                  if (active.models.length === 0) return <div style={{ color: t.text3, fontSize: 12 }}>{L('该供应商下暂无模型')}</div>;
                  const deep = isDeepseekRoute(active.provider);
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {active.models.map((m) => {
                        const k = draftKeyOf(active.provider, m.model);
                        const e = edits[k];
                        if (e === undefined) return null;
                        const isOpen = expanded[k] === true;
                        const st = saveStates[k];
                        // 使用中模型：编辑整体锁定（运行中的那个模型，所有字段禁改）。
                        const locked = k === activeKey;
                        // 共享余额运行锁：该供应商已开启共享余额，且组内任一模型正在
                        // 运行（activeKey 命中本供应商）→ 组内所有模型的「用户余额/
                        // 充值」都禁改（它们写入同一个 p:<provider> 钱包，改 B 会联带
                        // 改动正在运行的 A）。其余参数（单价/币种/模板/峰谷）照常可编辑，
                        // 后端 shareGroupLocked 只拦余额字段。
                        const sharedBalanceLocked =
                          sharedBalances[selProvider] === true &&
                          activeKey !== '' &&
                          activeKey.split('/')[0] === selProvider;
                        const cell: CSSProperties = { width: '100%', minWidth: 80, boxSizing: 'border-box', textAlign: 'right' as const, height: CTL_H, padding: '0 8px', border: '1px solid rgba(77,107,254,0.35)', borderRadius: 6, fontSize: 13, background: t.card, color: t.text };
                        return (
                          <div key={m.model} style={{ border: '1px solid rgba(77,107,254,0.35)', borderRadius: 8, overflow: 'hidden', boxShadow: '0 0 0 1px rgba(77,107,254,0.06), 0 2px 12px rgba(31,35,40,0.08), 0 0 20px rgba(77,107,254,0.12)', background: 'linear-gradient(180deg, rgba(77,107,254,0.08), rgba(124,92,255,0.02))' }}>
                            {/* 折叠头部 */}
                            <button
                              type="button"
                              onClick={() => {
                                // 折叠该模型卡时，一并收起它打开的导入列表 / 导出冲突选择条。
                                if (isOpen) {
                                  if (importPickerKey === k) setImportPickerKey('');
                                  if (exportConflict !== null && exportConflict.provider === active.provider && exportConflict.model === m.model) closeExportConflict();
                                }
                                setExpanded((s) => ({ ...s, [k]: !isOpen }));
                              }}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left' as const, padding: '8px 12px', fontSize: 13, fontWeight: 600, border: 'none', background: isOpen ? 'linear-gradient(90deg, rgba(77,107,254,0.22), rgba(124,92,255,0.08))' : 'rgba(77,107,254,0.05)', color: t.text, cursor: 'pointer', borderBottom: isOpen ? '1px solid rgba(77,107,254,0.15)' : 'none' }}
                            >
                              <span style={{ fontSize: 10, color: t.brand }}>{isOpen ? '▼' : '▶'}</span>
                              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: t.brand, fontWeight: 600 }}>{m.label}</span>
                              {e.peakOn && <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'rgba(77,107,254,0.12)', color: t.brand, whiteSpace: 'nowrap' }}>{tt('peakBadge')}</span>}
                              {locked && <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'rgba(220,38,38,0.12)', color: t.error, whiteSpace: 'nowrap' }}>{tt('lockedBadge')}</span>}
                              <span style={{ fontSize: 10, color: t.brand, fontWeight: 600 }}>{e.currency}</span>
                            </button>
                            {/* 展开体 */}
                            {isOpen && (
                              <>
                              <fieldset disabled={locked} style={{ border: 'none', margin: 0, padding: 0, minWidth: 0 }}>
                              <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 10, opacity: locked ? 0.75 : undefined, background: 'linear-gradient(180deg, rgba(77,107,254,0.06), rgba(124,92,255,0.015))' }}>
                                {locked && (
                                  <div style={{ color: t.error, fontSize: 11, lineHeight: 1.4 }}>{tt('lockedHint')}</div>
                                )}
                                {e.noSavedPrice && (
                                  <div style={{ color: t.error, fontSize: 11, lineHeight: 1.4 }}>{tt('noSavedPrice')}</div>
                                )}
                                {/* 计费配置导出/导入：把本模型的计费模板复用到另一模型。 */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                  {barMsg[k] !== undefined && (
                                    <span style={{ marginRight: 'auto', fontSize: 11, fontWeight: 600, color: barMsg[k]!.ok ? t.ok : t.error, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{barMsg[k]!.msg}</span>
                                  )}
                                  <button type="button" onClick={() => void exportModelConfig(active.provider, m.model)} disabled={locked}
                                    style={{ ...btnSmall, opacity: locked ? 0.5 : 1, cursor: locked ? 'not-allowed' : 'pointer' }}>
                                    {L('导出计费配置')}
                                  </button>
                                  <button type="button" onClick={() => void triggerImport(active.provider, m.model)} disabled={locked}
                                    style={{ ...btnSmall, opacity: locked ? 0.5 : 1, cursor: locked ? 'not-allowed' : 'pointer' }}>
                                    {L('导入计费配置')}
                                  </button>
                                </div>
                                {exportConflict !== null && exportConflict.provider === active.provider && exportConflict.model === m.model && (
                                  <div style={{ border: '1px solid rgba(240, 68, 68, 0.4)', borderRadius: 8, padding: 8, marginBottom: 8, background: 'rgba(240, 68, 68, 0.05)' }}>
                                    <div style={{ fontSize: 11, color: t.error, marginBottom: 6, fontWeight: 600 }}>
                                      {L('已存在同名配置')}（{exportConflict.identical ? L('内容相同') : L('内容不同')}）— {L('请选择：')}
                                    </div>
                                    {!renameMode ? (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                        <button type="button" onClick={() => void confirmOverwriteExport()}
                                          style={{ ...btnSmall, background: 'linear-gradient(90deg, #4d6bfe, #7c5cff)', color: '#ffffff', border: 'none', fontWeight: 600 }}>{L('覆盖现有模板')}</button>
                                        <button type="button" onClick={() => setRenameMode(true)} style={{ ...btnSmall }}>{L('重命名保存')}</button>
                                        <button type="button" onClick={closeExportConflict} title={L('取消')} style={{ ...btnSmall, color: t.text3 }}>✕</button>
                                      </div>
                                    ) : (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                        <input value={renameName} onChange={(ev) => setRenameName(ev.target.value)} autoFocus
                                          style={{ flex: 1, minWidth: 200, padding: '6px 8px', border: '1px solid rgba(77,107,254,0.35)', borderRadius: 6, fontSize: 12, background: t.card, color: t.text, boxSizing: 'border-box' }} />
                                        <button type="button" onClick={() => void confirmRenameExport()}
                                          style={{ ...btnSmall, background: 'linear-gradient(90deg, #4d6bfe, #7c5cff)', color: '#ffffff', border: 'none', fontWeight: 600 }}>{L('确认保存')}</button>
                                        <button type="button" onClick={closeExportConflict} title={L('取消')} style={{ ...btnSmall, color: t.text3 }}>✕</button>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {importPickerKey === k && (
                                  <div style={{ border: '1px solid rgba(77,107,254,0.35)', borderRadius: 8, padding: 8, marginBottom: 8, background: 'rgba(77,107,254,0.05)' }}>
                                    <div style={{ fontSize: 11, color: t.brand, marginBottom: 6 }}>
                                      {L('从计费配置目录导入到本模型：')}{configDir !== '' ? configDir : L('（默认目录）')}
                                    </div>
                                    {overrides[draftKeyOf(active.provider, m.model)] !== undefined && (
                                      <div style={{ fontSize: 11, color: t.error, marginBottom: 6, fontWeight: 600 }}>{L('该模型已有计费配置，导入将覆盖现有模板。')}</div>
                                    )}
                                    {dirDelMsg !== null && <div style={{ fontSize: 11, color: dirDelMsg.ok ? t.ok : t.error, marginBottom: 6 }}>{dirDelMsg.msg}</div>}
                                    {dirConfigs.length === 0 && <div style={{ fontSize: 11, color: t.text3, marginBottom: 6 }}>{L('目录为空，请先去其他模型点「导出计费配置」')}</div>}
                                    {dirConfigs.map((c) => (
                                      <div key={c.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '4px 0' }}>
                                        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
    {c.provider}/{c.model}
    {versionSuffixOf(c.name) !== null && (
      <span style={{ fontSize: 10, padding: '0 5px', borderRadius: 4, background: 'rgba(124,92,255,0.14)', color: '#7c5cff', fontWeight: 600 }}>#{versionSuffixOf(c.name)}</span>
    )}
  </span>
  <span style={{ fontSize: 10, color: t.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
    {fmtListTime(c.mtime)}
  </span>
</span>
                                        <span style={{ display: 'flex', gap: 6 }}>
                                          <button type="button" onClick={() => void importFromDir(active.provider, m.model, c.name)} style={{ ...btnSmall }}>{L('导入')}</button>
                                          <button type="button" onClick={() => void deleteConfig(c.name)} style={{ ...btnSmall, color: t.error }}>{L('删除')}</button>
                                        </span>
                                      </div>
                                    ))}
                                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <button type="button" onClick={() => { importTargetRef.current = { provider: active.provider, model: m.model }; fileInputRef.current?.click(); setImportPickerKey(''); }} style={{ ...btnSmall }}>{L('手动选文件…')}</button>
                                      <span style={{ fontSize: 11, color: t.text3 }}>{L('（跨机器导入用）')}</span>
                                    </div>
                                  </div>
                                )}
                                <div style={{ display: 'grid', gridTemplateColumns: '96px 1fr', columnGap: 12, rowGap: 10, alignItems: 'center' }}>
                                                                  <span style={formLabel}>{tt('currency')}</span>
                                                                  <select id={`um-cur-${k}`} value={e.currency} onChange={(ev) => void switchCurrency(k, ev.target.value)}
                                                                    style={ctl({ width: '100%' })}>
                                                                    <option value="CNY">CNY (¥)</option>
                                                                    <option value="USD">USD ($)</option>
                                                                  </select>
                                                                  {!deep && (
                                                                    <>
                                                                      <span style={formLabel}>{tt('balance')}</span>
                                                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                        <input id={`um-bal-${k}`} value={e.balance}
                                                                          disabled={locked || sharedBalanceLocked}
                                                                          title={sharedBalanceLocked ? tt('sharedBalanceLockHint') : undefined}
                                                                          onChange={(ev) => editNum(k, 'balance', ev.target.value)}
                                                                          placeholder="如 100"
                                                                          style={ctl({ width: '100%' })} />
                                                                                                                                              </div>
                                                                      {sharedBalanceLocked && (
                                                                        <div style={{ color: t.error, fontSize: 11, lineHeight: 1.4 }}>{tt('sharedBalanceLockHint')}</div>
                                                                      )}
                                                                    </>
                                                                  )}
                                                                  {templates.length > 0 && (
                                                                    <>
                                                                      <span style={formLabel}>{tt('billingTemplate')}</span>
                                                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                                                                          style={ctl({ width: '100%' })}>
                                                                          <option value="">{L('（自定义）')}</option>
                                                                          {templates.map((tp) => <option key={tp.id} value={tp.id}>{L(tp.label)}</option>)}
                                                                        </select>
                                                                                                                                              </div>
                                                                    </>
                                                                  )}
                                                                  {e.combined && <div style={{ fontSize: 11, color: t.text2, gridColumn: '1 / -1' }}>{tt('discountNote')}</div>}
                                                                  {e.discount !== '' && (
                                                                    <>
                                                                      <span style={formLabel}>{tt('batchDiscount')}</span>
                                                                      <input id={`um-disc-${k}`} value={e.discount}
                                                                        onChange={(ev) => setEdits((s) => ({ ...s, [k]: { ...e, discount: ev.target.value } }))}
                                                                        placeholder="如 0.5" style={ctl({ maxWidth: 90, justifySelf: 'start' })} />
                                                                    </>
                                                                  )}
                                                                </div>
                                <div style={{ borderTop: `1px solid ${t.borderSoft}`, margin: '12px 0 10px' }} />
                                {/* R5 自定义单价项：templateId==='' 时用可增删的行；命名模板用下方固定格+峰谷。 */}
                                {e.templateId === '' && (
                                  <div>
                                    <div style={sectTitle}>{L('自定义单价项（每行 = 单价 × 该行 token 数；峰谷价在下方「启用峰谷计费」里统一填）')}</div>
                                    {e.customRows.map((r, ri) => {
                                      const usedElsewhere = new Set<CustomBucket>(e.customRows.map((x) => x.bucket));
                                      usedElsewhere.delete(r.bucket);
                                      return (
                                        <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' as const }}>
                                          {CUSTOM_BUCKETS.map((b) => {
                                            const disabled = usedElsewhere.has(b);
                                            return (
                                              <label key={b} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, cursor: disabled ? 'not-allowed' as const : 'pointer' as const, fontSize: 11, color: disabled ? t.text3 : t.text }}>
                                                <input type="radio" name={`um-cb-${k}-${ri}`} checked={r.bucket === b}
                                                  disabled={disabled}
                                                  onChange={() => editCustomRow(k, ri, (x) => ({ ...x, bucket: b }))}
                                                  style={{ accentColor: t.accent }} />
                                                {L(CUSTOM_BUCKET_LABEL[b])}
                                              </label>
                                            );
                                          })}
                                          <span style={{ fontSize: 11, color: t.brand, minWidth: 56, fontWeight: 600 }}>＝ {L(CUSTOM_BUCKET_LABEL[r.bucket])}</span>
                                          {e.peakOn ? (
                                            <span style={{ fontSize: 11, color: t.text3, minWidth: 80, textAlign: 'right' as const }}>{L('峰谷接管 →')}</span>
                                          ) : (
                                            <input value={r.perM} placeholder={tt('yuanPerM')}
                                              onChange={(ev) => editCustomRow(k, ri, (x) => ({ ...x, perM: ev.target.value }))}
                                              style={ctl({ maxWidth: 80 })} />
                                          )}
                                          <button type="button"
                                            onClick={() => delCustomRow(k, ri)}
                                            style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, border: `1px solid ${t.borderSoft}`, background: 'transparent', color: t.text2, cursor: 'pointer' }}>{tt('del')}</button>
                                        </div>
                                      );
                                    })}
                                    {e.customRows.length < CUSTOM_BUCKETS.length && (
                                      <button type="button"
                                        onClick={() => addCustomRow(k)}
                                        style={{ fontSize: 11, padding: '2px 10px', borderRadius: 6, border: '1px solid rgba(77,107,254,0.35)', background: t.accent, color: t.text, cursor: 'pointer' }}>{tt('customAddRow')}</button>
                                    )}
                                  </div>
                                )}
                                {/* 峰谷定价可见时（官方 DeepSeek / 峰谷模板 / 手动开启），
                                    基础单价格整体不渲染——两套价格只能出现一套 */}
                                {e.templateId !== '' && !(deep || e.templateId === 'peak-off-peak' || e.peakOn) && (
                                <div>
                                  <div style={sectTitle}>{tt('basePrice')}</div>
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    {columnsForTemplate(e.templateId, templates).map((f) => (
                                      <label key={f} style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, gap: 2, minWidth: 0 }}>
                                        <span style={{ fontSize: 11, color: t.text3 }}>{FIELD_LABEL[f]}</span>
                                        <input id={`um-${f}-${k}`} value={e[f]}
                                          onChange={(ev) => editNum(k, f, ev.target.value)}
                                          placeholder={tt('yuanPerM')} style={cell} />
                                      </label>
                                    ))}
                                  </div>
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
                                            onChange={(ev) => {
                                              const on = ev.target.checked;
                                              setEdits((s) => {
                                                const cur = s[k];
                                                if (cur === undefined) return s;
                                                if (cur.templateId !== '') return { ...s, [k]: { ...cur, peakOn: on } };
                                                // 自定义模板迁移：启用 → 各行平价转入谷价（峰价留空待填），
                                                // 上方单价由谷价接管；停用 → 谷价回填为平价，清空峰/谷。
                                                const rows = on
                                                  ? cur.customRows.map((r) => ({ ...r, offPerM: r.offPerM.trim() === '' ? r.perM : r.offPerM }))
                                                  : cur.customRows.map((r) => ({ ...r, perM: r.offPerM.trim() !== '' ? r.offPerM : (r.perM.trim() !== '' ? r.perM : r.peakPerM), peakPerM: '', offPerM: '' }));
                                                const inBase = cur.currency === cur.baseCurrency;
                                                return { ...s, [k]: { ...cur, peakOn: on, customRows: rows, baseCustomRows: inBase ? rows : cur.baseCustomRows } };
                                              });
                                            }}
                                            style={{ accentColor: t.accent }} />
                                          <span style={{ fontSize: 12, color: t.text2 }}>{tt('peakToggle')}</span>
                                        </label>
                                        <span style={hint}>峰: 高; 谷: 低; {tt('uncheckIsOff')}</span>
                                      </>
                                    )}
                                  </div>
                                  {e.peakOn && (
                                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6, padding: '6px 8px', background: 'rgba(77,107,254,0.07)', borderRadius: 4 }}>
                                      {e.templateId === '' ? (
                                        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
                                          {e.customRows.map((r, ri) => (
                                            <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                              <span style={{ fontSize: 11, color: t.text2, width: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{CUSTOM_BUCKET_LABEL[r.bucket]}</span>
                                              <span style={{ fontSize: 11, color: t.text3 }}>{tt('peakPrice')}</span>
                                              <input value={r.peakPerM} placeholder={tt('yuanPerM')}
                                                onChange={(ev) => editCustomRow(k, ri, (x) => ({ ...x, peakPerM: ev.target.value }))}
                                                style={ctl({ maxWidth: 90 })} />
                                              <span style={{ fontSize: 11, color: t.text3 }}>{tt('offPrice')}</span>
                                              <input value={r.offPerM} placeholder={tt('yuanPerM')}
                                                onChange={(ev) => editCustomRow(k, ri, (x) => ({ ...x, offPerM: ev.target.value }))}
                                                style={ctl({ maxWidth: 90 })} />
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                      <div style={{ display: 'flex', gap: 8 }}>
                                        {([[L('输入(未命中)'), 'inputPeak', 'inputOff'], [L('缓存命中'), 'cachePeak', 'cacheOff'], [L('输出'), 'outPeak', 'outOff']] as const).map(([lab, pk, off]) => (
                                          <div key={pk} style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, gap: 2, minWidth: 0 }}>
                                            <span style={{ fontSize: 11, color: t.text3 }}>{lab}</span>
                                            {([[pk, '峰价'], [off, '谷价']] as const).map(([fld, tag]) => (
                                              <label key={fld} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <span style={{ fontSize: 11, color: t.text3, whiteSpace: 'nowrap' as const }}>{tt(tag === '峰价' ? 'peakPrice' : 'offPrice')}</span>
                                                <input id={`um-${fld}-${k}`} value={e[fld]}
                                                  onChange={(ev) => editNum(k, fld, ev.target.value)}
                                                  placeholder={tt('yuanPerM')} style={{ ...cell, flex: 1, minWidth: 0 }} />
                                              </label>
                                            ))}
                                          </div>
                                        ))}
                                      </div>
                                      )}
                                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, alignItems: 'center' }}>
                                        <span style={{ fontSize: 11, color: t.text2, whiteSpace: 'nowrap' }}>{tt('peakDaysLabel')}</span>
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
                                        <div style={{ fontSize: 11, color: t.text2, marginBottom: 3 }}>{tt('peakHoursLabel')}</div>
                                        {e.windows.map((p, pi) => (
                                          <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, flexWrap: 'wrap' as const }}>
                                            <span style={{ fontSize: 11, color: t.text3 }}>{pi + 1}.</span>
                                            <span style={{ fontSize: 11, color: t.text3 }}>{tt('start')}</span>
                                            {([['sh', 23], ['sm', 59]] as const).map(([f, max]) => (
                                              <select key={f} value={p[f]} aria-label={`${f}-${pi}`}
                                                onChange={(ev) => setEdits((s) => ({ ...s, [k]: { ...e, windows: e.windows.map((x, xi) => (xi === pi ? { ...x, [f]: ev.target.value } : x)) } }))}
                                                style={ctl({ height: 26, padding: '0 4px', fontSize: 12, borderRadius: 5 })}>
                                                {Array.from({ length: max + 1 }, (_, v) => padPick(f, String(v))).map((v) => (
                                                  <option key={v} value={v}>{v}</option>
                                                ))}
                                              </select>
                                            ))}
                                            <span style={{ fontSize: 11, color: t.text3 }}>{tt('hourUnit')}</span>
                                            <span style={{ fontSize: 11, color: t.text3 }}>{tt('end')}</span>
                                            {([['eh', 23], ['em', 59]] as const).map(([f, max]) => (
                                              <select key={f} value={p[f]} aria-label={`${f}-${pi}`}
                                                onChange={(ev) => setEdits((s) => ({ ...s, [k]: { ...e, windows: e.windows.map((x, xi) => (xi === pi ? { ...x, [f]: ev.target.value } : x)) } }))}
                                                style={ctl({ height: 26, padding: '0 4px', fontSize: 12, borderRadius: 5 })}>
                                                {Array.from({ length: max + 1 }, (_, v) => padPick(f, String(v))).map((v) => (
                                                  <option key={v} value={v}>{v}</option>
                                                ))}
                                              </select>
                                            ))}
                                            <button type="button"
                                              onClick={() => setEdits((s) => ({ ...s, [k]: { ...e, windows: e.windows.filter((_, xi) => xi !== pi) } }))}
                                              disabled={e.windows.length <= 1}
                                              style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, border: `1px solid ${t.borderSoft}`, background: 'transparent', color: t.text2, cursor: 'pointer' }}>{tt('del')}</button>
                                          </div>
                                        ))}
                                        <button type="button"
                                          onClick={() => setEdits((s) => ({ ...s, [k]: { ...e, windows: [...e.windows, { sh: '9', sm: '00', eh: '12', em: '00' }] } }))}
                                          style={{ fontSize: 11, padding: '2px 10px', borderRadius: 6, border: '1px solid rgba(77,107,254,0.35)', background: t.accent, color: t.text, cursor: 'pointer' }}>{tt('addPeriod')}</button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                {/* 操作按钮在锁定区外：点保存时给出红色提示而非无响应 */}
                                </div>
                              </fieldset>
                              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: '2px 0 12px' }}>
                                <button type="button" onClick={() => void saveModelPrice(active.provider, m.model)} disabled={locked}
                                  style={{ ...btnPrimary, opacity: locked ? 0.5 : 1, cursor: locked ? 'not-allowed' : 'pointer' }}>
                                  {tt('saveUnit')}
                                </button>
                                <button type="button" onClick={() => void resetModelPrice(active.provider, m.model)} disabled={locked}
                                  style={{ ...btnGhost, opacity: locked ? 0.5 : 1, cursor: locked ? 'not-allowed' : 'pointer' }}>
                                  {tt('resetPrice')}
                                </button>
                                {st !== undefined && <span style={{ fontSize: 11, color: st.ok ? t.ok : t.error, whiteSpace: 'nowrap' }}>{st.msg}</span>}
                              </div>
                            </>
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

          <div style={{ display: 'flex', alignItems: 'center', marginTop: 12 }}>
            <button type="button" onClick={() => setOpenStorage((o) => !o)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(77,107,254,0.35)', background: 'rgba(77,107,254,0.06)', color: t.brand, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: 9, transform: openStorage ? 'rotate(90deg)' : 'none', transition: 'transform .12s ease' }}>▶</span>
              {L('其他设置')}
            </button>
          </div>
          {openStorage && (
            <div style={{ marginTop: 8 }}>
              {/* 选项卡：目录导出 / 视觉识别（参考 dsh-ears 分功能区的成熟写法） */}
              <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid rgba(77,107,254,0.2)', marginBottom: 10 }}>
                {([['dir', '目录导出'], ['vision', '视觉识别'], ['alert', '预警']] as Array<[string, string]>).map(([id, label]) => (
                  <button key={id} type="button" onClick={() => setStorageTab(id as 'dir' | 'vision' | 'alert')}
                    style={{ padding: '5px 12px', fontSize: 12, borderRadius: '6px 6px 0 0', border: 'none', borderBottom: storageTab === id ? '2px solid #7c5cff' : '2px solid transparent', background: storageTab === id ? 'rgba(124,92,255,0.10)' : 'transparent', color: storageTab === id ? t.brand : t.text3, fontWeight: 600, cursor: 'pointer' }}>
                    {L(label)}
                  </button>
                ))}
              </div>
              {storageTab === 'dir' && (
                <div>
                  <div style={{ fontSize: 11, color: t.text3, marginBottom: 2 }}>{L('说明：仅当你手动点「导出计费配置」时，配置才会写入下面这个目录；模型本身不会自动保存到这里。导入时也从这里读取。')}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: t.brand, whiteSpace: 'nowrap' }}>{L('计费配置导出目录')}</span>
                    <input value={configDirInput} onChange={(ev) => setConfigDirInput(ev.target.value)} placeholder={L('默认 $DSH_HOME/usage-meter（留空用默认）')} style={{ flex: 1, minWidth: 180, padding: '6px 8px', border: '1px solid rgba(77,107,254,0.35)', borderRadius: 6, fontSize: 12, background: t.card, color: t.text, boxSizing: 'border-box' }} />
                    <button type="button" onClick={() => void saveBillingConfigDir()} style={{ ...btnSmall }}>{L('保存目录')}</button>
                    {dirMsg !== '' && <span style={{ fontSize: 11, color: t.ok }}>{dirMsg}</span>}
                  </div>
                  <div style={{ color: t.text3, fontSize: 11, marginTop: 2 }}>{L('导出/导入共用此目录；留空则用默认目录（在 DSH_HOME 下，不随 dsh 升级丢失）。')}</div>
                </div>
              )}
              {storageTab === 'vision' && (
                <div style={{ border: '1px solid rgba(124,92,255,0.25)', borderRadius: 8, padding: '8px 10px', background: 'rgba(124,92,255,0.04)' }}>
                  <div style={{ fontSize: 12, color: t.brand, fontWeight: 600, marginBottom: 4 }}>{L('视觉包装识别（模型名前缀/后缀）')}</div>
                  <div style={{ color: t.text3, fontSize: 11, marginBottom: 6, lineHeight: 1.5 }}>
                    {L('视觉插件会给模型名加包装标记（如 DeepSeek-V4-Flash (modlens vision)）。命中时按去掉包装后的底层模型计费与聚合，价格/用量与底层模型共用。每行一个标记；留空 = 关闭识别。')}
                  </div>
                  <textarea value={wrapperMarkersInput} onChange={(ev) => setWrapperMarkersInput(ev.target.value)} rows={3}
                    placeholder={' (modlens vision)\n (vision)\n-vision\nvision-toolkit-'}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px', border: '1px solid rgba(77,107,254,0.35)', borderRadius: 6, fontSize: 12, background: t.card, color: t.text, fontFamily: 'inherit', resize: 'vertical' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <button type="button" onClick={() => void saveWrapperMarkers()}
                      style={{ ...btnSmall, background: 'linear-gradient(90deg, #4d6bfe, #7c5cff)', color: '#ffffff', border: 'none', fontWeight: 600 }}>{L('保存识别标记')}</button>
                    {wmMsg !== '' && <span style={{ fontSize: 11, color: t.ok }}>{wmMsg}</span>}
                  </div>
                </div>
              )}
              {storageTab === 'alert' && (
                <div>
                  <div style={{ fontSize: 11, color: t.text3, marginBottom: 6, lineHeight: 1.5 }}>
                    {L('设置预警阈值：预算用到指定百分比、或实时余额低于下限时，输入框旁的量用药丸会呼吸变红提醒。模型/供应商可各自覆盖全局。')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: t.brand, whiteSpace: 'nowrap' }}>{L('全局预算预警%')}</span>
                    <input value={thrPct} onChange={(ev) => setThrPct(ev.target.value)} placeholder={L('如 80（0=关闭）')} style={ctl({ width: 90 })} />
                    <span style={{ fontSize: 12, color: t.brand, whiteSpace: 'nowrap' }}>{L('余额预警下限')}</span>
                    <input value={thrFloor} onChange={(ev) => setThrFloor(ev.target.value)} placeholder={L('如 20（0=关闭）')} style={ctl({ width: 90 })} />
                    <button type="button" onClick={() => void saveGlobalThreshold()}
                      style={{ ...btnSmall, background: 'linear-gradient(90deg, #4d6bfe, #7c5cff)', color: '#ffffff', border: 'none', fontWeight: 600 }}>{L('保存全局阈值')}</button>
                    {thrMsg !== '' && <span style={{ fontSize: 11, color: t.ok }}>{thrMsg}</span>}
                  </div>
                  <div style={{ color: t.text3, fontSize: 11, lineHeight: 1.5 }}>
                    {L('按模型/供应商单独设置阈值：在模型卡「供应商」下拉选好模型后，点开「其他设置 → 预警」可给当前模型设独立阈值（默认遵循全局）。')}
                  </div>
                </div>
              )}
            </div>
          )}
          <p style={{ color: t.text3, fontSize: 11, marginTop: 12, marginBottom: 0 }}>
            {L('会话级单价、计费方式与峰谷价在「对话 · 用量卡片 → 用户自定义设置」中编辑。')}
          </p>
          <input ref={fileInputRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={(ev) => void handleImportFile(ev)} />
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
      setSaveMsg(res.ok ? L('已保存，余额已更新') : L('保存失败'));
      window.setTimeout(() => { setSaved(false); setSaveMsg(''); }, 2500);
    } catch (err) {
      console.warn('[usage-meter] save failed', err);
      setSaveMsg(L('保存失败'));
    }
  };

  return (
    <div style={{ borderTop: '1px solid rgba(77,107,254,0.12)', marginTop: 6, paddingTop: 6 }}>
      <button
        type="button"
        onClick={() => setOpenSettings((o) => !o)}
        aria-expanded={openSettings}
        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: t.text2, background: 'transparent', border: 'none', padding: '2px 0', cursor: 'pointer' }}
      >
        <span>{L('用户自定义设置')}</span>
        <span style={{ fontSize: 9, transform: openSettings ? 'rotate(180deg)' : 'none', transition: 'transform .12s ease' }}>▼</span>
      </button>

      {openSettings && (
        <div>
          <div style={{ color: t.text3, fontSize: 10, marginBottom: 4 }}>{L('保存后余额立即生效；模板修改需刷新浏览器生效')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <label style={{ fontSize: 11, color: t.text2 }}>{L('币种')}</label>
            <select value={cfgCurrency} onChange={(e) => onCurrencyChange(e.target.value)} style={{ fontSize: 12, padding: '2px 4px' }}>
              <option value="CNY">{L('CNY（人民币）')}</option>
              <option value="USD">{L('USD（美元）')}</option>
            </select>
            {isDeepSeek && (
              <button type="button" onClick={save} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(77,107,254,0.35)', background: t.accent, color: t.text, cursor: 'pointer' }}>
                {saved ? L('已保存') : tt('save')}
              </button>
            )}
            {isDeepSeek && saveMsg !== '' && <span style={{ color: t.text2, fontSize: 10 }}>{saveMsg}</span>}
          </div>

          {!isDeepSeek && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <label style={{ fontSize: 11, color: t.text2 }}>{L('账户余额（')}{unitSym}）</label>
              <input value={cfgBalance} onChange={(e) => { setCfgBalance(e.target.value); setBalanceDirty(true); }} placeholder={`如 100${unitSym}`} style={{ width: 84, fontSize: 12, padding: '2px 4px' }} />
              <label style={{ fontSize: 11, color: t.text2 }}>{L('充值（')}{unitSym}{L('，可负）')}</label>
              <input value={cfgRecharge} onChange={(e) => setCfgRecharge(e.target.value)} placeholder={`如 20${unitSym}`} style={{ width: 84, fontSize: 12, padding: '2px 4px' }} />
              <button type="button" onClick={save} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(77,107,254,0.35)', background: t.accent, color: t.text, cursor: 'pointer' }}>
                {saved ? L('已保存') : tt('save')}
              </button>
              {saveMsg !== '' && <span style={{ color: t.text2, fontSize: 10 }}>{saveMsg}</span>}
            </div>
          )}

          <PriceEditor
            usage={usage}
            onPricingCurrencyChange={onPricingCurrencyChange}
            onResetCurrency={(c) => { setCfgCurrency(c); setCurrencyDirty(false); setModelCurrency(c); setModelCurrencyDirty(false); }}
          />
          {usage.rateUpdatedAt > 0 && (
            <div style={{ color: t.text3, fontSize: 10, marginTop: 2 }}>
              {conversionActive
                ? `{L('汇率：1 USD ≈ ')}${rateInfo.usdToCny.toFixed(4)} CNY · ${L('更新于')} ${fmtTime(rateInfo.rateUpdatedAt)}（${modelCurrency} → ${cfgCurrency} 需换算）`
                : `{L('汇率：1 USD ≈ ')}${rateInfo.usdToCny.toFixed(4)} CNY · ${L('更新于')} ${fmtTime(rateInfo.rateUpdatedAt)}`}
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
      setMsg(L('已启用 Batch 半价（×0.5），可修改后保存'));
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
    setMsg(`${L('已载入「')}${tpl.label}${L('计费方式，可修改后保存')}`);
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
    flash(ok ? L('已保存，请刷新浏览器后生效') : L('保存失败'));
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
        flash(ok ? L('已重置为该模型官方价格，请刷新浏览器后生效') : L('重置失败'));
      }
      return;
    }
    const tIdx = types.findIndex((tp) => tp.id === matchTypeId(base));
    if (tIdx >= 0) applyTemplate(String(tIdx));
    setCurrency(base?.currency ?? usage.currency);
    onResetCurrency?.(base?.currency ?? usage.currency);
    setJustReset(true);
    window.setTimeout(() => setJustReset(false), 1600);
    flash(L('已重置为该计费方式结构，请核对单价后点保存单价生效'));
  };

  return (
    <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${t.borderSoft}` }}>
      <div style={{ color: t.text2, fontSize: 11, marginBottom: 2 }}>{L('模型单价编辑（')}{model} · {L('单位：每百万tokens')} {sym}）</div>

      {!isDeepSeek && (
        <div style={{ marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <label style={{ fontSize: 11, color: t.text2 }}>{tt('billingTemplate')}</label>
            <select value={typeKey} onChange={(e) => applyTemplate(e.target.value)} style={{ fontSize: 12, padding: '2px 4px', maxWidth: 320 }}>
              <option value="">{L('选择计费方式预填）')}</option>
              {types.map((tpl, i) => <option key={tpl.id} value={String(i)}>{tpl.label}</option>)}
            </select>
            <label style={{ fontSize: 11, color: t.text2 }}>{L('币种')}</label>
            <select value={currency} onChange={(e) => void onCurrencySelect(e.target.value)} style={{ fontSize: 12, padding: '2px 4px' }}>
              <option value="CNY">{L('CNY（人民币）')}</option>
              <option value="USD">{L('USD（美元）')}</option>
            </select>
          </div>
          {typeNote !== '' && <div style={{ color: t.text3, fontSize: 10, marginTop: 2 }}>{L(typeNote)}</div>}
        </div>
      )}

      <div style={{ ...row, paddingBottom: 2, color: t.text3, fontSize: 10 }}>
        <span style={{ flex: 1 }}>{L('用量名称（可改）')}</span>
        <span style={{ width: 86, textAlign: 'right' }}>{billing.peak ? L('高峰价（可改）') : L('单价（可改）')}</span>
        {billing.peak && <span style={{ width: 86, textAlign: 'right' }}>{L('谷价（可改）')}</span>}
      </div>
      {billing.peak && <div style={{ color: t.text3, fontSize: 10, marginBottom: 2 }}>{L('谷价留空 = 高峰×0.5；高峰时段默认周一到五 9-12 / 14-18（北京时间），可在下方修改')}；周六周日全天按谷价</div>}

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
              placeholder={tt('offPrice')}
              style={{ width: 86, fontSize: 12, padding: '1px 4px', textAlign: 'right', background: 'rgba(37, 99, 235, 0.06)' }}
            />
          )}
        </div>
      ))}

      {billing.peak && (
        <div style={{ marginTop: 4, paddingTop: 4, borderTop: `1px solid ${t.borderSoft}`, fontSize: 11, color: t.text2 }}>
          <div style={{ marginBottom: 2 }}>{L('分峰谷的星期（不勾 = 全天按谷价；周六周日默认不勾）')}</div>
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
          <div style={{ marginBottom: 2 }}>{L('高峰时段（北京时间）')}</div>
          {windows.map((p, pi) => (
            <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
              <span style={{ fontSize: 10, color: t.text3 }}>{pi + 1}. 起</span>
              {([['sh', 23], ['sm', 59]] as const).map(([f, max]) => (
                <select key={f} value={p[f]} onChange={(ev) => setWindows((ws) => ws.map((x, xi) => (xi === pi ? { ...x, [f]: ev.target.value } : x)))}
                  style={{ fontSize: 12, padding: '1px 3px' }}>
                  {Array.from({ length: max + 1 }, (_, v) => padPick(f, String(v))).map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              ))}
              <span style={{ fontSize: 11, color: t.text3 }}>{tt('end')}</span>
              {([['eh', 23], ['em', 59]] as const).map(([f, max]) => (
                <select key={f} value={p[f]} onChange={(ev) => setWindows((ws) => ws.map((x, xi) => (xi === pi ? { ...x, [f]: ev.target.value } : x)))}
                  style={{ fontSize: 12, padding: '1px 3px' }}>
                  {Array.from({ length: max + 1 }, (_, v) => padPick(f, String(v))).map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              ))}
              <button type="button" onClick={() => setWindows((ws) => ws.filter((_, xi) => xi !== pi))} disabled={windows.length <= 1}
                style={{ fontSize: 11, padding: '1px 6px', borderRadius: 5, border: '1px solid rgba(77,107,254,0.35)', background: t.card, color: t.text2, cursor: 'pointer' }}>{tt('del')}</button>
            </div>
          ))}
          <button type="button" onClick={() => setWindows((ws) => [...ws, { sh: '9', sm: '00', eh: '12', em: '00' }])}
            style={{ fontSize: 11, padding: '1px 8px', borderRadius: 5, border: '1px solid rgba(77,107,254,0.35)', background: t.card, color: t.text, cursor: 'pointer', marginBottom: 4 }}>{tt('addPeriod')}</button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <button type="button" onClick={save} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(77,107,254,0.35)', background: t.accent, color: t.text, cursor: 'pointer' }}>{tt('saveUnit')}</button>
        <button type="button" onClick={reset} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(77,107,254,0.35)', background: t.card, color: t.text, cursor: 'pointer', boxShadow: 'none' }}>{tt('resetPrice')}</button>
        {billing.combined && <span style={{ color: t.text3, fontSize: 10 }}>{L('合并计价')}</span>}
        {billing.discount !== undefined && billing.discount < 1 && <span style={{ color: t.brand, fontSize: 10 }}>{L('Batch 半价')} ×{billing.discount}</span>}
        {msg !== '' && <span style={{ color: t.text2, fontSize: 10 }}>{msg}</span>}
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
      <span style={{ width: 104, textAlign: 'right', color: t.text3, whiteSpace: 'nowrap' }}>{formatTokens(props.tokens)}</span>
      <span style={{ width: 104, textAlign: 'right', color: props.price !== undefined ? t.text2 : t.text3, whiteSpace: 'nowrap' }}>
        {props.price !== undefined ? fmtPrice(props.price, props.native, props.usage) : '—'}
      </span>
      <span style={{ width: 104, textAlign: 'right', fontWeight: 600, color: props.accent ?? t.text, whiteSpace: 'nowrap' }}>
        {props.price !== undefined ? fmtMoney(props.cost, props.native, props.usage) : '—'}
      </span>
    </div>
  );
}










