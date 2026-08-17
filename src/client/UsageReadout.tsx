/**
 * The session-scoped usage/cost readout rendered into
 * `conversation.composer.dock`. One-line summary + click-to-expand detail card.
 *
 * Pure reader: the host computed every number in each pricing row's native
 * currency (CNY for domestic models, USD for foreign ones). Display currency
 * conversion (CNY↔USD, live rate) happens here only.
 */
import { Fragment, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { costBreakdown } from '../projection.ts'
import type { CostBreakdown, ModelPricing, PeakOffPeakRates, UsageCostValue, UsageTurnCost } from '../projection.ts'

type DockProps = PropsRuntime<'conversation.composer.dock'>

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
}

// ── formatting ───────────────────────────────────────────────────────────────
function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

/** Convert an amount from its native currency into the display currency. */
function toDisplay(amount: number, native: string, display: string, usdToCny: number): number {
  if (native === display) return amount
  if (native === 'USD' && display === 'CNY') return amount * usdToCny
  if (native === 'CNY' && display === 'USD') return amount / usdToCny
  return amount
}

function fmtMoney(amount: number, native: string, usage: UsageCostValue): string {
  const v = toDisplay(amount, native, usage.currency, usage.usdToCny)
  const symbol = usage.currency === 'USD' ? '$' : '¥'
  const decimals = Math.abs(v) > 0 && Math.abs(v) < 0.01 ? 4 : 2
  return `${symbol} ${v.toFixed(decimals)}`
}

function fmtPrice(amountPerM: number, native: string, usage: UsageCostValue): string {
  const v = toDisplay(amountPerM, native, usage.currency, usage.usdToCny)
  const symbol = usage.currency === 'USD' ? '$' : '¥'
  return `${symbol} ${v.toFixed(v < 1 ? 3 : 2)}/M`
}

/**
 * Format an account balance in the DISPLAY currency: the internal value is
 * always kept in its official currency (CNY for DeepSeek); only the shown
 * number is converted through the rate — conversions never feed back into
 * any computation.
 */
function fmtBalance(balance: { currency: string; totalBalance: number }, usage: UsageCostValue): string {
  const v = toDisplay(balance.totalBalance, balance.currency, usage.currency, usage.usdToCny)
  const symbol = usage.currency === 'USD' ? '$' : '¥'
  return `${symbol} ${v.toFixed(2)}`
}

function fmtTime(ms: number): string {
  if (!ms) return '--:--:--'
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

/** Force a fresh USD→CNY rate from the server; null on failure (keep last). */
async function fetchFreshRate(): Promise<{ usdToCny: number; rateUpdatedAt: number } | null> {
  try {
    const res = await fetch('/api/usage-meter/refresh-rate', { method: 'POST' })
    if (!res.ok) return null
    const doc = await res.json()
    if (typeof doc?.usdToCny !== 'number') return null
    return { usdToCny: doc.usdToCny, rateUpdatedAt: doc.rateUpdatedAt ?? Date.now() }
  } catch {
    return null
  }
}

function fmtDate(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

function sameDay(a: number, b: number): boolean {
  const da = new Date(a)
  const db = new Date(b)
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate()
}

/**
 * Tokens summary for one turn row. A turn that just started (0 tokens, still
 * in progress) shows 「0 入 / 0 出」; only a zero-token turn that actually
 * ENDED aborted/interrupted shows 「对话被停止」.
 */
function turnTokensText(turn: UsageTurnCost): string {
  const total = turn.inputTokens + turn.cacheReadTokens + turn.cacheWriteTokens + turn.outputTokens
  const stopped = total === 0 && turn.endedAt > 0 && (turn.endReason === 'aborted' || turn.endReason === 'interrupted')
  return stopped
    ? '对话被停止'
    : `${formatTokens(total - turn.outputTokens)} 入 / ${formatTokens(turn.outputTokens)} 出`
}

// ── billing-bucket helpers (row template maps labels → buckets) ──────────────
type BucketKey = 'input' | 'cacheRead' | 'cacheWrite' | 'output'

function bucketTokens(usage: UsageCostValue, b: BucketKey): number {
  switch (b) {
    case 'input': return usage.inputTokens
    case 'cacheRead': return usage.cacheReadTokens
    case 'cacheWrite': return usage.cacheWriteTokens
    case 'output': return usage.outputTokens
  }
}

function bucketCost(bd: CostBreakdown, b: BucketKey): number {
  switch (b) {
    case 'input': return bd.input
    case 'cacheRead': return bd.cacheRead
    case 'cacheWrite': return bd.cacheWrite
    case 'output': return bd.output
  }
}

function bucketPricePerM(p: ModelPricing | null, b: BucketKey): number | undefined {
  if (p === null) return undefined
  // COMBINED billing (讯飞/百川): one rate for ALL tokens.
  if (p.combinedPerM !== undefined) return p.combinedPerM
  switch (b) {
    case 'input': return p.inputPerM
    case 'cacheRead': return p.cacheReadPerM ?? p.inputPerM
    case 'cacheWrite': return p.cacheWritePerM ?? p.inputPerM
    case 'output': return p.outputPerM
  }
}

/** The ModelPricing field a bucket's per-M price maps to (for the editor). */
function bucketPriceKey(b: BucketKey): 'inputPerM' | 'cacheReadPerM' | 'cacheWritePerM' | 'outputPerM' {
  switch (b) {
    case 'input': return 'inputPerM'
    case 'cacheRead': return 'cacheReadPerM'
    case 'cacheWrite': return 'cacheWritePerM'
    case 'output': return 'outputPerM'
  }
}

/** Which of the 7 billing types a pricing row structurally matches (for the dropdown auto-select). */
function matchTypeId(p: ModelPricing | null): string {
  if (p === null) return 'basic'
  if (p.discount !== undefined && p.discount < 1) return 'batch'
  if (p.combinedPerM !== undefined) return 'combined'
  if (p.peak !== undefined && p.offPeak !== undefined) return 'peak-off-peak'
  if (p.cacheWritePerM !== undefined && p.cacheReadPerM !== undefined) return 'cache-write'
  if (p.cacheReadPerM !== undefined) return 'cache-split'
  return 'basic'
}

/** The per-bucket peak/off-peak rate (fallback to input when cache-read rate absent). */
function peakPricePerM(p: PeakOffPeakRates | undefined, b: BucketKey): number | undefined {
  if (p === undefined) return undefined
  switch (b) {
    case 'input': return p.inputPerM
    case 'cacheRead': return p.cacheReadPerM ?? p.inputPerM
    case 'cacheWrite': return p.inputPerM
    case 'output': return p.outputPerM
  }
}

/** Peak/off-peak label for providers with time-of-day billing, or null. */
function peakLabel(p: ModelPricing | null): string | null {
  if (p === null || p.peak === undefined || p.offPeak === undefined) return null
  if (p.peakOffPeakFrom !== undefined && Date.now() < p.peakOffPeakFrom) return '峰谷价未生效'
  const h = new Date().getUTCHours()
  return (h >= 1 && h < 4) || (h >= 6 && h < 10) ? '高峰' : '低谷'
}

// ── shared style fragment ────────────────────────────────────────────────────
const row: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: '4px 0',
  lineHeight: '18px',
}

const dateSep: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  color: 'var(--dsw-alias-label-tertiary, #8b949e)',
  fontSize: 11,
  margin: '4px 0',
}

export function UsageReadout({ useProjection }: DockProps): ReactElement | null {
  const usage: UsageCostValue | undefined = useProjection('usageCost')
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  if (usage === undefined) return null

  const p = usage.pricing
  const native = p?.currency ?? 'CNY'
  const breakdown = costBreakdown(usage, p)
  const billedInput = usage.inputTokens + usage.cacheReadTokens + usage.cacheWriteTokens
  const hitRate =
    billedInput > 0 ? Math.round((usage.cacheReadTokens / billedInput) * 1000) / 10 : null
  const peak = peakLabel(p)
  const accountBalance = usage.accountBalance
  const isDeepSeek = usage.provider === 'deepseek-official' || usage.provider === 'deepseek'
  // Every provider shows the balance the same way (account mode): DeepSeek via
  // the API anchor, others via the manual anchor (initial + recharges, in the
  // selected currency) minus the spend — both served as `accountBalance`.
  const balanceKind: 'account' | 'none' = accountBalance !== null ? 'account' : 'none'
  const balanceNegative = balanceKind === 'account' && (accountBalance?.totalBalance ?? 0) < 0
  // A currency conversion applies when the display currency differs from the
  // official pricing currency — the rate + its fetch time are then always
  // shown next to the balance.
  const pricesConverted = native !== usage.currency
  const turns = [...usage.turns].reverse()

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'inline-flex' }}>
      {/* compact one-line summary */}
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
        <span
          style={{
            fontWeight: 600,
            color: t.text,
            maxWidth: 140,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {usage.model ?? '未选择模型'}
        </span>

        <span style={{ color: t.text3, whiteSpace: 'nowrap' }}>·</span>

        <span style={{ fontWeight: 700, color: p ? t.brand : t.text3, whiteSpace: 'nowrap' }}>
          本次 {p ? fmtMoney(usage.estimatedCost, native, usage) : '无价格'}
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
            {accountBalance === null
              ? '余额 获取中…'
              : `${balanceNegative ? '透支 ' : '余额 '}${fmtBalance(accountBalance, usage)}`}
          </span>
        )}

        <span style={{ color: t.text3, whiteSpace: 'nowrap' }}>{usage.requestCount} 次</span>

        <span
          style={{
            color: t.text3,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform .12s ease',
            fontSize: 9,
          }}
        >
          ▼
        </span>
      </button>

      {/* detail card */}
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
          {/* header */}
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

          {/* account balance + totals */}
          <div
            style={{
              ...row,
              borderBottom: `1px solid ${t.borderSoft}`,
              paddingTop: 8,
              paddingBottom: 8,
            }}
          >
            <span style={{ color: t.text2 }}>{balanceKind === 'account' ? '账户余额' : '余额'}</span>
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: 16,
                  color: balanceKind === 'none' ? t.text3 : balanceNegative ? t.error : t.ok,
                }}
              >
                {balanceKind === 'none'
                  ? isDeepSeek ? '获取中…' : '未配置'
                  : accountBalance !== null
                    ? fmtBalance(accountBalance, usage)
                    : '—'}
              </span>
              {accountBalance !== null && accountBalance.updatedAt > 0 && (
                <span
                  title={isDeepSeek ? '官网余额刷新可能有延迟，余额按「锚点 − 本地消费」实时计算' : '余额 = 账户余额 − 累计消费（全局账本）'}
                  style={{ color: t.text3, fontSize: 10, whiteSpace: 'nowrap' }}
                >
                  {accountBalance.source === 'computed' ? '计算' : '更新'}于 {fmtTime(accountBalance.updatedAt)}{isDeepSeek ? ' · 官网刷新有延迟' : ''}
                </span>
              )}
              {/* 显示币种 ≠ 官方定价币种 → 下一行恒显示汇率及其更新时间（所有厂商） */}
              {pricesConverted && balanceKind !== 'none' && (
                <span style={{ color: t.text3, fontSize: 10, whiteSpace: 'nowrap' }}>
                  汇率 1USD≈{usage.usdToCny.toFixed(4)}CNY{usage.rateUpdatedAt > 0 ? ` · 更新于 ${fmtTime(usage.rateUpdatedAt)}` : ''}
                </span>
              )}
            </span>
          </div>
          <div style={{ ...row, paddingTop: 6 }}>
            <span style={{ color: t.text2 }}>本次对话费用</span>
            <span style={{ fontWeight: 700, color: p ? t.brand : t.text3 }}>
              {p ? fmtMoney(usage.estimatedCost, native, usage) : '无价格数据'}
            </span>
          </div>

          {/* usage / unit-price / subtotal table (template per model) */}
          <div style={{ marginTop: 8 }}>
            <div style={{ ...row, paddingBottom: 2, color: t.text3, fontSize: 11 }}>
              <span style={{ flex: 1 }}>用量</span>
              <span style={{ width: 92, textAlign: 'right' }}>单价</span>
              <span style={{ width: 92, textAlign: 'right' }}>小计</span>
            </div>
            {usage.priceRows.map((r) => {
              const primary = r.buckets[0] ?? 'input'
              const tokens = r.buckets.reduce((s, b) => s + bucketTokens(usage, b), 0)
              const cost = r.buckets.reduce((s, b) => s + bucketCost(breakdown, b), 0)
              const price = bucketPricePerM(p, primary)
              return (
                <BucketRow
                  key={r.label + r.buckets.join(',')}
                  label={r.label}
                  tokens={tokens}
                  price={price}
                  cost={cost}
                  native={native}
                  usage={usage}
                  accent={primary === 'cacheRead' ? t.ok : undefined}
                />
              )
            })}
            {usage.reasoningTokens > 0 && (
              <div style={{ ...row, color: t.text3, fontSize: 11, paddingTop: 1 }}>
                <span>推理 {formatTokens(usage.reasoningTokens)}（已含在输出内）</span>
              </div>
            )}
            {p !== null && p.discount !== undefined && p.discount < 1 && (
              <div style={{ color: t.brand, fontSize: 10, paddingTop: 2 }}>
                Batch 半价：小计已按 ×{p.discount} 计算（单价列仍为标准价）
              </div>
            )}
          </div>

          {/* requests + cache hit */}
          <div style={{ ...row, color: t.text2, fontSize: 11, borderTop: `1px solid ${t.borderSoft}`, marginTop: 4, paddingTop: 6 }}>
            <span>请求 {usage.requestCount} 次成功 · {usage.stepCount} 次尝试</span>
            {hitRate !== null && <span style={{ color: t.text3 }}>缓存命中 {hitRate}%</span>}
          </div>

          {/* per-turn costs (all, scrollable, grouped by day) */}
          {turns.length > 0 && (
            <div style={{ borderTop: `1px solid ${t.borderSoft}`, marginTop: 6, paddingTop: 6 }}>
              <div style={{ color: t.text3, fontSize: 11, marginBottom: 2 }}>每轮费用（共 {turns.length} 轮）</div>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {turns.map((turn, i) => {
                  const prev = i > 0 ? turns[i - 1] : undefined
                  const newDay = prev === undefined || !sameDay(prev.startedAt, turn.startedAt)
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
                        <span style={{ color: t.text3 }}>
                          {turnTokensText(turn)}
                        </span>
                        <span style={{ fontWeight: 600, color: t.error }}>-{fmtMoney(turn.cost, turn.currency, usage)}</span>
                      </div>
                    </Fragment>
                  )
                })}
              </div>
            </div>
          )}

          {/* config (per-provider: remounts when the provider changes) */}
          <SettingsSection key={usage.provider ?? 'none'} usage={usage} />
        </div>
      )}
    </div>
  )
}

/**
 * Per-provider settings (collapsible):
 *  行1 币种 (all providers)
 *  行2 账户余额 + 充值 + 保存 (non-DeepSeek; 余额与顶部同一值，编辑=覆盖，充值正加负减)
 *  行3-5 模型单价编辑（标题 / 计费方式下拉 / 用量名称+单价 / 保存单价+重置）
 */
function SettingsSection({ usage }: { usage: UsageCostValue }): ReactElement {
  const isDeepSeek = usage.provider === 'deepseek-official' || usage.provider === 'deepseek'
  const [openSettings, setOpenSettings] = useState(false)
  // 顶部「币种」= 显示币种（余额、用量表、每轮费用的展示币种），默认 = 用户已保存的
  // 显示币种（厂商/全局）；与模型定价币种相互独立（currencyDirty 防止被自动同步覆盖）。
  const [cfgCurrency, setCfgCurrency] = useState(usage.currency)
  const [currencyDirty, setCurrencyDirty] = useState(false)
  // 模型单价编辑里的定价币种（随 PriceEditor 的币种下拉联动；仅决定单价如何计价，
  // 不影响上方余额/用量表的显示币种）。
  const [modelCurrency, setModelCurrency] = useState(usage.basePricing?.currency ?? 'CNY')
  const [modelCurrencyDirty, setModelCurrencyDirty] = useState(false)
  // 最新汇率展示：切换币种且目标≠模型定价币种时刷新并显示。
  const [rateInfo, setRateInfo] = useState<{ usdToCny: number; rateUpdatedAt: number }>({
    usdToCny: usage.usdToCny,
    rateUpdatedAt: usage.rateUpdatedAt,
  })
  const conversionActive = cfgCurrency !== modelCurrency
  const [cfgBalance, setCfgBalance] = useState('')
  // 用户正在编辑余额输入框时禁止被投影同步覆盖（修复「改完保存后变回原值」）。
  const [balanceDirty, setBalanceDirty] = useState(false)
  const [cfgRecharge, setCfgRecharge] = useState('')
  const [saved, setSaved] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const unitSym = cfgCurrency === 'USD' ? '$' : '¥'

  // 模型/厂商切换后，若用户未手动改显示币种，则跟随该模型的显示币种（用户已保存的偏好）。
  useEffect(() => {
    if (currencyDirty) return
    setCfgCurrency(usage.currency)
  }, [usage.model, usage.currency])
  useEffect(() => {
    if (modelCurrencyDirty) return
    setModelCurrency(usage.basePricing?.currency ?? 'CNY')
  }, [usage.model, usage.basePricing?.currency])

  // Live-sync the 账户余额 input with the top balance, converted to the
  // selected currency (unless the user is mid-edit).
  useEffect(() => {
    if (balanceDirty) return
    if (usage.accountBalance !== null) {
      const live = toDisplay(usage.accountBalance.totalBalance, usage.accountBalance.currency, cfgCurrency, usage.usdToCny)
      setCfgBalance(String(Number(live.toFixed(2))))
    }
  }, [usage.accountBalance?.totalBalance, usage.accountBalance?.currency, cfgCurrency, balanceDirty])

  // Switching currency converts the displayed balance AND its unit instantly.
  const onCurrencyChange = (next: string): void => {
    if (next === cfgCurrency) return
    const cur = Number(cfgBalance)
    if (!Number.isNaN(cur) && cfgBalance.trim() !== '') {
      setCfgBalance(String(Number(toDisplay(cur, cfgCurrency, next, usage.usdToCny).toFixed(2))))
    }
    setBalanceDirty(false)
    setCurrencyDirty(true)
    setCfgCurrency(next)
    // 目标币种 ≠ 模型定价币种 → 需要换算：立即刷新最新汇率并显示。
    if (next !== modelCurrency) {
      void fetchFreshRate().then((fresh) => {
        if (fresh !== null) setRateInfo(fresh)
      })
    }
  }

  // PriceEditor 的定价币种下拉：切换后若与显示币种不同（需要换算）→ 刷新汇率。
  const onPricingCurrencyChange = (next: string): void => {
    setModelCurrencyDirty(true)
    setModelCurrency(next)
    if (next !== cfgCurrency) {
      void fetchFreshRate().then((fresh) => {
        if (fresh !== null) setRateInfo(fresh)
      })
    }
  }

  const save = async () => {
    const patch: Record<string, unknown> = { provider: usage.provider, model: usage.model, currency: cfgCurrency }
    if (!isDeepSeek) {
      const bal = Number(cfgBalance)
      if (cfgBalance.trim() !== '' && !Number.isNaN(bal)) patch.balance = bal
      const rechargeNum = Number(cfgRecharge)
      if (cfgRecharge.trim() !== '' && !Number.isNaN(rechargeNum) && rechargeNum !== 0) {
        patch.recharge = rechargeNum
      }
      setCfgRecharge('')
    }
    try {
      const res = await fetch('/api/usage-meter/config', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      })
      setSaved(res.ok)
      if (res.ok) setBalanceDirty(false)
      setSaveMsg(res.ok ? '已保存，余额已更新' : '保存失败')
      window.setTimeout(() => { setSaved(false); setSaveMsg('') }, 2500)
    } catch (err) {
      console.warn('[usage-meter] save failed', err)
      setSaveMsg('保存失败')
    }
  }

  return (
    <div style={{ borderTop: `1px solid ${t.borderSoft}`, marginTop: 6, paddingTop: 6 }}>
      <button
        type="button"
        onClick={() => setOpenSettings((o) => !o)}
        aria-expanded={openSettings}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11,
          color: t.text2,
          background: 'transparent',
          border: 'none',
          padding: '2px 0',
          cursor: 'pointer',
        }}
      >
        <span>用户自定义设置</span>
        <span style={{ fontSize: 9, transform: openSettings ? 'rotate(180deg)' : 'none', transition: 'transform .12s ease' }}>
          ▼
        </span>
      </button>
      {openSettings && (
        <>
          <div style={{ color: t.text3, fontSize: 10, marginBottom: 4 }}>保存后余额立即生效；模板修改需刷新浏览器生效</div>
          {/* 行1：币种 */}
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
          {/* 行2：账户余额 + 充值 + 保存（非 DeepSeek） */}
          {!isDeepSeek && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <label style={{ fontSize: 11, color: t.text2 }}>账户余额（{unitSym}）</label>
              <input
                value={cfgBalance}
                onChange={(e) => { setCfgBalance(e.target.value); setBalanceDirty(true) }}
                placeholder={`如 100${unitSym}`}
                style={{ width: 84, fontSize: 12, padding: '2px 4px' }}
              />
              <label style={{ fontSize: 11, color: t.text2 }}>充值（{unitSym}，可负）</label>
              <input
                value={cfgRecharge}
                onChange={(e) => setCfgRecharge(e.target.value)}
                placeholder={`如 100${unitSym}`}
                style={{ width: 70, fontSize: 12, padding: '2px 4px' }}
              />
              <button type="button" onClick={save} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, border: `1px solid ${t.border}`, background: t.accent, color: t.text, cursor: 'pointer' }}>
                {saved ? '已保存' : '保存'}
              </button>
              {saveMsg !== '' && <span style={{ color: t.ok, fontSize: 10 }}>{saveMsg}</span>}
            </div>
          )}
          {/* 行3-5：模型单价编辑（含计费方式下拉） */}
          <PriceEditor
            key={`${usage.provider ?? ''}/${usage.model ?? ''}`}
            usage={usage}
            onPricingCurrencyChange={onPricingCurrencyChange}
            onResetCurrency={(c) => {
              setCfgCurrency(c)
              setCurrencyDirty(false)
              setModelCurrency(c)
              setModelCurrencyDirty(false)
            }}
          />
          {/* 汇率行：显示币种 ≠ 模型定价币种（需要换算）时展示最新汇率与更新时间 */}
          {conversionActive && (
            <div style={{ color: t.text3, fontSize: 10, marginTop: 2 }}>
              汇率：1 USD ≈ {rateInfo.usdToCny.toFixed(4)} CNY · 更新于 {fmtTime(rateInfo.rateUpdatedAt)}
              （{modelCurrency} → {cfgCurrency} 需换算）
            </div>
          )}
        </>
      )}
    </div>
  )
}

/**
 * Editable per-model 用量 template + unit prices. Defaults come from the
 * official bundled values (usage.basePricing / usage.priceRows). 保存 writes
 * the user's edits (persisted, used by the computation after a page
 * refresh). 重置价格：官方模型 → 恢复内置行结构+单价+计算方式+币种；
 * 自定义模型 → 恢复为该计费方式的默认结构+币种。Prices are per 1M tokens in
 * the model's native currency.
 */
function PriceEditor({ usage, onPricingCurrencyChange, onResetCurrency }: {
  usage: UsageCostValue
  onPricingCurrencyChange?: (currency: string) => void
  onResetCurrency?: (currency: string) => void
}): ReactElement {
  const model = usage.model
  const rows = usage.priceRows
  const base = usage.basePricing
  const isDeepSeek = usage.provider === 'deepseek-official' || usage.provider === 'deepseek'
  const peakMode = base?.peak !== undefined && base?.offPeak !== undefined
  const [labels, setLabels] = useState<string[]>(() => rows.map((r) => r.label))
  const [prices, setPrices] = useState<string[]>(() =>
    rows.map((r) => {
      const b = r.buckets[0] ?? 'input'
      const v = peakMode ? (peakPricePerM(base.peak, b) ?? bucketPricePerM(base, b)) : bucketPricePerM(base, b)
      return v === undefined ? '' : String(v)
    }),
  )
  // 该模型单价的定价币种（默认 = 模型定价币种；可单独改，保存时写入覆盖）。
  const [currency, setCurrency] = useState(base?.currency ?? 'CNY')
  // The editor's own row template (starts from the projection's rows; picking a
  // billing-method template REPLACES it — so row count follows the chosen type).
  const [rowsState, setRowsState] = useState<{ label: string; buckets: ('input' | 'cacheRead' | 'cacheWrite' | 'output')[] }[]>(() => rows)
  // Billing-method shape the editor is currently editing: combined (讯飞/百川
  // one-rate) vs split, plus the optional BATCH ×0.5 discount (类型七) and
  // 峰谷分时 peak/off-peak (类型八, 输入的单价即高峰价、闲时自动 ×0.5).
  const [billing, setBilling] = useState<{ combined: boolean; discount: number | undefined; peak: boolean }>({
    combined: base?.combinedPerM !== undefined,
    discount: base?.discount,
    peak: peakMode,
  })
  const [types, setTypes] = useState<{ id: string; label: string; mode: 'split' | 'combined' | 'keep'; peak?: boolean; discount?: number; note?: string; rows: { label: string; buckets: string[] }[] }[]>([])
  const [typeKey, setTypeKey] = useState('')
  const [typeNote, setTypeNote] = useState('')
  const [msg, setMsg] = useState('')
  const [justReset, setJustReset] = useState(false)
  const native = currency
  const sym = native === 'USD' ? '$' : '¥'

  // Load the 7 billing-method templates once (non-DeepSeek).
  useEffect(() => {
    if (isDeepSeek || types.length > 0) return
    fetch('/api/usage-meter/templates')
      .then((r) => (r.ok ? r.json() : null))
      .then((doc) => {
        if (doc?.types) setTypes(doc.types)
      })
      .catch(() => { /* types are optional */ })
  }, [isDeepSeek, types.length])

  // Auto-select the 计费方式 dropdown to the model's CURRENT billing type so
  // the user sees at a glance which type is used (only before the user picks).
  useEffect(() => {
    if (types.length === 0 || isDeepSeek) return
    const idx = types.findIndex((t) => t.id === matchTypeId(base))
    if (idx >= 0 && typeKey === '') {
      setTypeKey(String(idx))
      setTypeNote(types[idx]?.note ?? '')
    }
  }, [types, base, isDeepSeek, typeKey])

  if (!model || rowsState.length === 0) return <></>

  const applyTemplate = (key: string): void => {
    setTypeKey(key)
    if (key === '') { setTypeNote(''); return }
    const tpl = types[Number(key)]
    if (tpl === undefined) return
    setTypeNote(tpl.note ?? '')
    // 类型七 Batch 半价：保留当前行结构，仅叠加 ×0.5 折扣。
    if (tpl.mode === 'keep') {
      setBilling((b) => ({ combined: b.combined, discount: 0.5, peak: b.peak }))
      setMsg('已启用 Batch 半价（×0.5），可修改后保存')
      window.setTimeout(() => setMsg(''), 3000)
      return
    }
    // 类型八 峰谷分时：输入单价即高峰价，闲时自动 = 高峰 ×0.5。
    const prefill = (b: string): string => {
      const bkey = b as BucketKey
      const v = tpl.peak === true
        ? (peakPricePerM(base?.peak, bkey) ?? bucketPricePerM(base, bkey))
        : bucketPricePerM(base, bkey)
      return v === undefined ? '' : String(v)
    }
    setRowsState(tpl.rows as { label: string; buckets: ('input' | 'cacheRead' | 'cacheWrite' | 'output')[] }[])
    setLabels(tpl.rows.map((r) => r.label))
    setPrices(tpl.rows.map((r) => prefill(r.buckets[0] ?? 'input')))
    setBilling({ combined: tpl.mode === 'combined', discount: undefined, peak: tpl.peak === true })
    setMsg(`已载入「${tpl.label}」计费方式，可修改后保存`)
    window.setTimeout(() => setMsg(''), 3000)
  }

  // 定价币种下拉：切换到非模型原生币种时刷新最新汇率，并把已填单价换算到新币种。
  const onCurrencySelect = async (next: string): Promise<void> => {
    if (next === currency) return
    let rate = usage.usdToCny
    if (next !== (base?.currency ?? 'CNY')) {
      const fresh = await fetchFreshRate()
      if (fresh !== null) rate = fresh.usdToCny
    }
    setPrices((ps) =>
      ps.map((p) => {
        const n = Number(p)
        return p.trim() === '' || Number.isNaN(n) ? p : String(Number(toDisplay(n, currency, next, rate).toFixed(4)))
      }),
    )
    setCurrency(next)
    onPricingCurrencyChange?.(next)
  }

  const post = async (body: Record<string, unknown>): Promise<boolean> => {
    try {
      const res = await fetch('/api/usage-meter/config', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      return res.ok
    } catch {
      return false
    }
  }
  const flash = (text: string): void => {
    setMsg(text)
    window.setTimeout(() => setMsg(''), 3500)
  }

  const save = async () => {
    const pricePatch: Record<string, unknown> = {}
    rowsState.forEach((r, i) => {
      const raw = (prices[i] ?? '').trim()
      if (raw === '') return
      const v = Number(raw)
      if (!Number.isNaN(v) && v >= 0) pricePatch[bucketPriceKey(r.buckets[0] ?? 'input')] = v
    })
    // COMBINED billing (讯飞/百川): the single row's price IS combinedPerM; also
    // mirror it into input/output so unknown/custom models still resolve.
    if (billing.combined) {
      const combined = pricePatch.inputPerM
      if (typeof combined === 'number' && combined >= 0) {
        pricePatch.combinedPerM = combined
        pricePatch.inputPerM = combined
        pricePatch.outputPerM = combined
      }
    }
    // 类型七 BATCH 半价: carry the ×0.5 multiplier through the save.
    if (billing.discount !== undefined) pricePatch.discount = billing.discount
    // 类型八 峰谷分时: 输入的单价 = 高峰价；闲时单价自动 = 高峰 ×0.5。
    if (billing.peak) {
      const peak: Record<string, number> = {}
      const offPeak: Record<string, number> = {}
      rowsState.forEach((r, i) => {
        const raw = (prices[i] ?? '').trim()
        const v = Number(raw)
        if (raw === '' || Number.isNaN(v) || v < 0) return
        const key = bucketPriceKey(r.buckets[0] ?? 'input')
        peak[key] = v
        offPeak[key] = v * 0.5
      })
      if (Object.keys(peak).length > 0) {
        pricePatch.peak = peak
        pricePatch.offPeak = offPeak
      }
    }
    // 定价币种：随单价一起保存（该模型单价的计费币种）。
    pricePatch.currency = currency
    const ok = await post({
      provider: usage.provider,
      model,
      prices: pricePatch,
      rows: rowsState.map((r, i) => ({ label: (labels[i] ?? '').trim() || r.label, buckets: r.buckets })),
    })
    flash(ok ? '已保存，请刷新浏览器后生效' : '保存失败')
  }
  const reset = async () => {
    if (usage.officialPrice !== null) {
      // 官方厂商模型：清除覆盖 → 恢复内置行结构 + 单价 + 计算方式 + 币种。
      const op = usage.officialPrice
      const ok = await post({ provider: usage.provider, model, reset: true })
      if (ok) {
        const opPeak = op.pricing.peak !== undefined && op.pricing.offPeak !== undefined
        setRowsState(op.rows)
        setLabels(op.rows.map((r) => r.label))
        setPrices(
          op.rows.map((r) => {
            const b = r.buckets[0] ?? 'input'
            const v = opPeak ? (peakPricePerM(op.pricing.peak, b) ?? bucketPricePerM(op.pricing, b)) : bucketPricePerM(op.pricing, b)
            return v === undefined ? '' : String(v)
          }),
        )
        setBilling({
          combined: op.pricing.combinedPerM !== undefined,
          discount: op.pricing.discount,
          peak: opPeak,
        })
        setCurrency(op.pricing.currency ?? usage.currency)
        const tIdx = types.findIndex((t) => t.id === matchTypeId(op.pricing))
        if (tIdx >= 0) { setTypeKey(String(tIdx)); setTypeNote(types[tIdx]?.note ?? '') }
        onResetCurrency?.(op.pricing.currency ?? usage.currency)
        setJustReset(true)
        window.setTimeout(() => setJustReset(false), 1600)
        flash(ok ? '已重置为该模型官方价格，请刷新浏览器后生效' : '重置失败')
      }
      return
    }
    // 用户自定义模型：恢复为「该计费方式的默认结构 + 币种」（单价需用户重新填写后保存）。
    const tIdx = types.findIndex((t) => t.id === matchTypeId(base))
    if (tIdx >= 0) {
      applyTemplate(String(tIdx))
    }
    setCurrency(base?.currency ?? usage.currency)
    onResetCurrency?.(base?.currency ?? usage.currency)
    setJustReset(true)
    window.setTimeout(() => setJustReset(false), 1600)
    flash('已重置为该计费方式结构，请核对单价后点保存单价生效')
  }

  return (
    <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${t.borderSoft}` }}>
      <div style={{ color: t.text2, fontSize: 11, marginBottom: 2 }}>
        模型单价编辑（{model} · 单位：每百万tokens {sym}）
      </div>
      {/* 计费方式下拉：按 7 种计费类型选择（非厂商），选中后预填行结构+计算方式 */}
      {!isDeepSeek && (
        <div style={{ marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <label style={{ fontSize: 11, color: t.text2 }}>计费方式</label>
            <select value={typeKey} onChange={(e) => applyTemplate(e.target.value)} style={{ fontSize: 12, padding: '2px 4px', maxWidth: 320 }}>
              <option value="">（选择计费方式预填）</option>
              {types.map((tpl, i) => (
                <option key={tpl.id} value={String(i)}>{tpl.label}</option>
              ))}
            </select>
            <label style={{ fontSize: 11, color: t.text2 }}>币种</label>
            <select value={currency} onChange={(e) => void onCurrencySelect(e.target.value)} style={{ fontSize: 12, padding: '2px 4px' }}>
              <option value="CNY">CNY（人民币）</option>
              <option value="USD">USD（美元）</option>
            </select>
          </div>
          {typeNote !== '' && (
            <div style={{ color: t.text3, fontSize: 10, marginTop: 2 }}>{typeNote}</div>
          )}
        </div>
      )}
      <div style={{ ...row, paddingBottom: 2, color: t.text3, fontSize: 10 }}>
        <span style={{ flex: 1 }}>用量名称（可改）</span>
        <span style={{ width: 86, textAlign: 'right' }}>{billing.peak ? '高峰价（可改）' : '单价（可改）'}</span>
      </div>
      {billing.peak && (
        <div style={{ color: t.text3, fontSize: 10, marginBottom: 2 }}>闲时单价自动 = 高峰 ×0.5（高峰时段 9-12 / 14-18 北京时间）</div>
      )}
      {rowsState.map((r, i) => (
        <div key={r.buckets.join(',')} style={{ ...row, padding: '1px 0' }}>
          <input
            value={labels[i] ?? ''}
            onChange={(e) => setLabels((ls) => { const n = [...ls]; n[i] = e.target.value; return n })}
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 12,
              padding: '1px 4px',
              background: justReset ? 'rgba(22, 163, 74, 0.10)' : undefined,
              transition: 'background .2s ease',
            }}
          />
          <input
            value={prices[i] ?? ''}
            onChange={(e) => setPrices((ps) => { const n = [...ps]; n[i] = e.target.value; return n })}
            placeholder={`如 ${bucketPricePerM(base, r.buckets[0] ?? 'input') ?? ''}`}
            style={{
              width: 86,
              fontSize: 12,
              padding: '1px 4px',
              textAlign: 'right',
              background: justReset ? 'rgba(22, 163, 74, 0.10)' : undefined,
              transition: 'background .2s ease',
            }}
          />
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <button type="button" onClick={save} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, border: `1px solid ${t.border}`, background: t.accent, color: t.text, cursor: 'pointer' }}>
          保存单价
        </button>
        <button
          type="button"
          onClick={reset}
          style={{
            fontSize: 12,
            padding: '3px 10px',
            borderRadius: 6,
            border: `1px solid ${t.border}`,
            background: t.card,
            color: t.text,
            cursor: 'pointer',
            boxShadow: 'none',
          }}
        >
          重置价格
        </button>
        {billing.combined && <span style={{ color: t.text3, fontSize: 10 }}>合并计价</span>}
        {billing.discount !== undefined && billing.discount < 1 && (
          <span style={{ color: t.brand, fontSize: 10 }}>Batch 半价 ×{billing.discount}</span>
        )}
        {msg !== '' && <span style={{ color: t.ok, fontSize: 10 }}>{msg}</span>}
      </div>
    </div>
  )
}

function BucketRow(props: {
  label: string
  tokens: number
  price: number | undefined
  cost: number
  native: string
  usage: UsageCostValue
  accent?: string | undefined
}): ReactElement {
  return (
    <div style={row}>
      <span style={{ flex: 1, color: t.text2, minWidth: 0, whiteSpace: 'nowrap' }}>
        {props.label}
      </span>
      <span style={{ width: 92, textAlign: 'right', color: t.text3, whiteSpace: 'nowrap' }}>
        {formatTokens(props.tokens)}
      </span>
      <span style={{ width: 92, textAlign: 'right', color: props.price !== undefined ? t.text2 : t.text3, whiteSpace: 'nowrap' }}>
        {props.price !== undefined ? fmtPrice(props.price, props.native, props.usage) : '—'}
      </span>
      <span style={{ width: 92, textAlign: 'right', fontWeight: 600, color: props.accent ?? t.text, whiteSpace: 'nowrap' }}>
        {props.price !== undefined ? fmtMoney(props.cost, props.native, props.usage) : '—'}
      </span>
    </div>
  )
}
