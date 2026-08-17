# Usage Guide (English)

> Not installed yet? See [Installation](installation.md). For changing config later (API key etc.), see section 6 at the bottom.

## 1. The readout (composer dock)

Open any conversation — a one-line meter appears above the input:

```
gpt-5.6-sol · 本次 $12.34 · 余额 $99.65 · 12 次  ▼
```

- **Model**: the model actually used by the current session.
- **本次 (this session)**: cumulative cost (shows "无价格 / no price" when pricing is unknown).
- **Balance**: DeepSeek = real balance (official API anchor − live spend); others = global ledger value. Negative shows 透支 (overdraft) in red. Hover for "updated/computed at" timestamps and the exchange rate.
- **Requests**: successful completion count.

Click to expand the **detail card**:

| Area | Shows |
|---|---|
| Usage table | Rows per the model's billing method: label / tokens / unit price / subtotal |
| Cache hit-rate | share of cache-read tokens |
| Peak/off-peak | DeepSeek 峰谷 auto-applied: **each request is billed at the rate active when it STARTED** (a 17:58 request ending 18:08 stays peak; a 07:59 one stays off-peak past 08:00). The card's top label follows the current time (with "峰谷价未生效" before it starts). |
| Reasoning tokens | already inside output, flagged separately |
| Per-turn costs | turn number, start/end time, the model that served it, amount; grouped by day; 0-token aborted turns show 对话被停止 |

## 2. Settings panel (用户自定义设置)

Click "用户自定义设置 ▼" to expand everything editable.

### Row 1: 币种 (the **display** currency)
Determines what currency the **balance, usage table and per-turn costs are shown in** (CNY/USD). Switching converts the shown values instantly and fetches a fresh exchange rate. Save to persist.

> Different from the currency inside the price editor — that one is the **pricing currency** (row 3).

### Row 2: 账户余额 / 充值 (non-DeepSeek only)
- **账户余额**: editing overwrites the ledger balance for that vendor/model.
- **充值**: positive adds, negative subtracts; takes effect immediately and broadcasts to all sessions.
- DeepSeek doesn't show this (its balance comes from the official API).

### Row 3: 模型单价编辑 (per-model price editor)

```
模型单价编辑 (model · unit: per 1M tokens ¥/$)
计费方式 [ dropdown: 8 billing methods ]
币种     [ dropdown: CNY/USD ]        ← this model's "pricing currency"
用量名称 (editable)        单价 (editable)
输入（缓存命中）            0.5
输入（缓存未命中）          5
...
[保存单价 Save]  [重置价格 Reset]
```

#### Billing methods (8; switching one swaps row structure **and** calculation)

| # | Method | Rows | Note |
|---|---|---|---|
| 1 | Basic (input+output) | 2 | no cache |
| 2 | Cache hit/miss | 3 | hit ≈ 0.1× input |
| 3 | Cache write+hit | 4 | write ≈ 1.25×, hit ≈ 0.1× |
| 4 | Context cache storage ⚠️ | 3 | storage fee not auto-metered; cache-read billed |
| 5 | Context length tiered ⚠️ | 2 | base tier only (≤200K / ≤32K) |
| 6 | Combined (input+output) | 1 | iFlytek / Baichuan one-rate |
| 7 | Batch half price (×0.5) | keep | whole cost ×0.5 (manual; plugin can't detect batch calls) |
| 8 | Peak/off-peak ⚠️ DeepSeek | 3 | entered price = peak; off-peak auto ×0.5 |

- The dropdown **auto-selects** the model's current billing method when opened.
- Methods 4/5 carry a ⚠️ in the option and an explanation below.

#### 币种 (the **pricing** currency)
The currency the model's **unit prices are denominated in** (default = the model's native currency, e.g. DeepSeek=CNY, OpenAI=USD). Switching away from the native currency fetches a fresh rate and converts the entered prices.

> **Key concept**: the pricing currency decides *how costs are billed*; the display currency decides *what you see*. Costs are computed in the pricing currency and shown in the display currency — fully independent.

#### 保存单价 / 重置价格
- **保存单价**: persists rows, prices, billing method and pricing currency to `usage-meter.json` (refresh to recompute).
- **重置价格**: official models → restore bundled rows/prices/method/currency; custom models → restore the billing method's default structure + currency.

### Exchange-rate line

Whenever the display currency ≠ the model's pricing currency (a conversion is needed), the panel shows:

```
汇率：1 USD ≈ 7.2543 CNY · 更新于 19:47:29（USD → CNY 需换算）
```

Switching currency fetches the latest rate immediately; afterwards it refreshes every 4 h at turn start.

## 3. Balance mechanics

| Provider | Balance source |
|---|---|
| DeepSeek | official `/user/balance` anchor − spend since anchor (live, one subtraction, never double-deducted) |
| Others | **global ledger** keyed by binding: official models share `p:<vendor>`; custom models own `m:<provider>/<model>`. Each usage delta deducts only the delta's cost; the file is authoritative; broadcast to all sessions. Default 0, can go negative (overdraft, red). |

## 4. Price overrides & persistence

Everything persists to `~/.dsh/usage-meter.json`:

```jsonc
{
  "providers": { "*": { "currency": "CNY" }, "openai": { "currency": "USD" } },
  "priceOverrides": {
    "my-gateway/my-model": { "prices": { "inputPerM": 3, "outputPerM": 15 }, "rows": [...] }
  },
  "balances": { "p:openai": { "balance": 100, "currency": "USD" } }
}
```

- Unknown/custom models can apply any billing-method template directly (the override IS the pricing).
- To clean up, delete the `priceOverrides` key or click 重置价格.

## 5. Other vendors (reference billing)

- The bundled 136-model price table (2026-08-16 snapshot) is **for reference**; prices change often — verify against official pricing pages.
- Unverified prices (iFlytek current rates, mimo-v2-flash post-adjustment, etc.) are annotated with ❓/⚠️ in the source.
- Remote price source: set `priceSourceUrl` to a LiteLLM-shaped `model_prices_and_context_window.json`.

## 6. Changing config later (entry points)

Every change needs: **restart dsh web + hard-refresh**.

| What | Where |
|---|---|
| **DeepSeek API key** | ① re-run `node install.cjs --key newKey` (recommended, auto-updates) ② edit `deepseekApiKey` in `cordis.patch.yml` ③ env `DEEPSEEK_API_KEY` |
| Display currency / refresh interval | `currency` / `refreshIntervalMs` in `cordis.patch.yml`, or `node install.cjs --currency USD --refresh 14400000` |
| Per-model prices / billing method / pricing currency | the settings panel in section 3 (saved to `~/.dsh/usage-meter.json`) |
| Non-DeepSeek balance / recharge | settings panel → 账户余额 / 充值 |
| Remote price source | `priceSourceUrl` in `cordis.patch.yml` |

Config file: `~/.dsh/profiles/<profile>/cordis.patch.yml` (Windows: `$HOME\.dsh\profiles\web\cordis.patch.yml`)
