/**
 * DeepSeek account-balance fetch.
 *
 * The ONLY mainstream provider with a simple public balance endpoint is
 * DeepSeek official: `GET https://api.deepseek.com/user/balance` (bearer
 * token). Most other providers expose no public balance API (OpenAI removed
 * its billing endpoint; Anthropic requires an admin key), so "remaining
 * balance" is only available for DeepSeek official — every other route can
 * only show a LOCAL estimate (spend vs a user-configured budget), which the
 * projection already provides.
 *
 * The fetch MUST run server-side: the browser cannot hold the API key or
 * reach the endpoint (CORS + credential safety). This module is host-only.
 *
 * @module @deepseek-ai/dsh-usage-meter/balance
 */

/** One currency row from DeepSeek's `/user/balance` (snake_case wire fields). */
export interface DeepSeekBalanceInfo {
  currency: string
  /** Total balance (granted + topped-up). */
  total_balance: string
  /** Granted balance portion. */
  granted_balance: string
  /** Topped-up balance portion. */
  topped_up_balance: string
}

export interface DeepSeekBalance {
  is_available: boolean
  balance_infos: DeepSeekBalanceInfo[]
}

/** Snapshot the service caches and (optionally) exposes to the client. */
export interface BalanceSnapshot {
  provider: 'deepseek-official'
  fetchedAt: number
  currency: string
  totalBalance: number
  grantedBalance: number
  toppedUpBalance: number
}

/**
 * Query DeepSeek's balance endpoint.
 * @param apiKey - the user's DeepSeek API key (never logged, never stored by this module).
 * @param signal - caller cancellation.
 * @returns the raw balance document.
 */
export async function fetchDeepSeekBalance(apiKey: string, signal?: AbortSignal): Promise<DeepSeekBalance> {
  const res = signal === undefined
    ? await fetch('https://api.deepseek.com/user/balance', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
      })
    : await fetch('https://api.deepseek.com/user/balance', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
        signal,
      })
  if (res.status === 401 || res.status === 403) {
    throw new Error(`DeepSeek balance: HTTP ${res.status} (check the API key)`)
  }
  if (!res.ok) throw new Error(`DeepSeek balance: HTTP ${res.status}`)
  return (await res.json()) as DeepSeekBalance
}

/** Reduce DeepSeek's raw rows into a single preferred snapshot. */
export function toSnapshot(raw: DeepSeekBalance): BalanceSnapshot | null {
  if (!raw.is_available || !raw.balance_infos?.length) return null
  const row = raw.balance_infos[0]
  if (row === undefined) return null
  return {
    provider: 'deepseek-official',
    fetchedAt: Date.now(),
    currency: row.currency,
    totalBalance: Number(row.total_balance) || 0,
    grantedBalance: Number(row.granted_balance) || 0,
    toppedUpBalance: Number(row.topped_up_balance) || 0,
  }
}
