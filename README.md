# dsh-usage-meter

**Real-time DeepSeek API usage & cost meter — tokens, spend and your real balance, right in the chat composer.**

> 🇬🇧 English · [🇨🇳 简体中文](README.zh-CN.md) · npm package: [`@faith1688/dsh-usage-meter-harness`](https://www.npmjs.com/package/@faith1688/dsh-usage-meter-harness)

---

## ✨ What it does

Built **for DeepSeek** first: it reads your **real account balance** from DeepSeek's official `/user/balance` API (not an estimate), understands DeepSeek's **peak/off-peak (峰谷) time-of-day pricing**, and shows the **cost of every turn** live — without leaving the conversation. Other vendors are covered as **reference billing** (136 bundled models, global balance ledger).

![demo](docs/screenshot-main.png)

## 🎯 Highlights

| | |
|---|---|
| 🎯 **Real DeepSeek balance** | Official API anchor − live spend. No guesses. |
| ⏱️ **Per-turn cost** | Every turn: tokens → cost, with start/end time and the model actually used. |
| 📐 **Precise metering** | Costs from exact token usage × official unit prices — **metering error < ¥0.02**. |
| 🌗 **Peak/off-peak aware** | DeepSeek 峰谷 pricing (Beijing 09–12 / 14–18 peak, off-peak ×0.5) applied by wall-clock; **the whole request is billed at the rate active when it STARTED** (a 17:58 request that ends 18:08 stays peak; a 07:59 one stays off-peak past 08:00). |
| 🧮 **8 billing templates** | Basic · cache hit/miss · cache write+hit · context storage · tiered · combined · batch ×0.5 · peak/off-peak. |
| ✏️ **Editable pricing** | Per-model unit prices, billing template & pricing currency — persisted. |
| 💱 **Dual currency** | Pricing currency vs display currency, live USD↔CNY rate. |
| 🌍 **136 models bundled** | DeepSeek, OpenAI, Anthropic, Gemini, Qwen, Kimi, GLM, Doubao… (2026-08 snapshot). |
| ♻️ **Replay-safe** | Costs recompute identically from session events after restart. |
| 🔇 **Near-zero plugin API usage** | The plugin itself consumes almost no API — it only reads DeepSeek's balance endpoint (no token billing), it never calls models. |

> ⚠️ Focus note: designed for **DeepSeek API metering** — a DeepSeek API key is needed for the **real balance** (any key of the same account works); without it, DeepSeek metering is unavailable but other vendors' reference billing still works. Other vendors' prices are bundled **for reference** and change often — verify against official pages.

## 🚀 Install (2 ways — pick one)

### ⚡ Way 1: One-click script (recommended)

```bash
git clone https://github.com/faith1688/dsh-usage-meter-harness.git && cd dsh-usage-meter-harness
node install.cjs --key sk-yourDeepSeekKey     # key is OPTIONAL — see below
```

The script auto-locates your DSH dir, installs the plugin (no build) and enables it in `cordis.patch.yml` (backs up first, idempotent). Then restart `dsh web` and hard-refresh.

### 📦 Way 2: npm (Windows one-line, no username to fill in)

> The command uses `$HOME` to locate your user directory automatically — you don't need to change anything (`@faith1688/` is the author's npm username — don't change it).

```powershell
npm install @faith1688/dsh-usage-meter-harness --prefix $env:TEMP\um-install --registry=https://registry.npmjs.org; Copy-Item -Recurse -Force "$env:TEMP\um-install\node_modules\@faith1688\dsh-usage-meter-harness" "$HOME\.dsh\profiles\node_modules\@faith1688\dsh-usage-meter-harness"; dir "$HOME\.dsh\profiles\node_modules\@faith1688\dsh-usage-meter-harness"
```

then enable it — either paste the block from [docs/installation.md](docs/installation.md) into `cordis.patch.yml`, or let the script do it safely:

```powershell
node "$HOME\.dsh\profiles\node_modules\@faith1688\dsh-usage-meter-harness\patch-config.cjs" --key sk-yourDeepSeekKey
```

(`patch-config.cjs` only inserts/updates the `usage-meter` block — it never overwrites your other config, is idempotent (no duplicate `insert` entries) and backs up `cordis.patch.yml.bak` first. The `--key` is optional.)

> **DeepSeek API key**: optional for install — but **without it, DeepSeek metering (real balance) will not work**; **any key of the same DeepSeek account works**; other vendors' billing needs no key. Without a key, the plugin uses env `DEEPSEEK_API_KEY`. **The plugin itself consumes almost zero API.**

Full install guide: [docs/installation.md](docs/installation.md) · [docs/installation.zh-CN.md](docs/installation.zh-CN.md)

## 📖 Usage in 10 seconds

- One-line meter: `model · this-session cost · balance · requests` → click for the detail card (usage table, cache hit-rate, per-turn costs, peak/off-peak label).
- 「用户自定义设置」: display currency, non-DeepSeek balance/recharge, **billing template (8 types)**, pricing currency, unit prices — save / reset.
- Full guide: [docs/usage.md](docs/usage.md) · [docs/usage.zh-CN.md](docs/usage.zh-CN.md)

## 🧪 Tests

```bash
node test-usage-meter.mjs        # billing math (incl. official worked examples)
node test-cross-time.mjs         # peak/off-peak cross-time rule (request start time)
node test-unknown-override.mjs   # unknown-model override (self-contained)
powershell -File test-ledger-flow.ps1   # ledger integration (needs a running server)
```

## 🗂️ Docs

| Doc | 中文 |
|---|---|
| [docs/installation.md](docs/installation.md) — install & npm | [docs/installation.zh-CN.md](docs/installation.zh-CN.md) |
| [docs/usage.md](docs/usage.md) — full usage | [docs/usage.zh-CN.md](docs/usage.zh-CN.md) |
| [docs/screenshots.md](docs/screenshots.md) — README screenshots | 截图清单 |
| [PRICING.md](PRICING.md) — pricing data & billing methods | 计费方式对照 |
| [docs/AI大模型API定价汇总_2026年8月.md](docs/AI大模型API定价汇总_2026年8月.md) — pricing data source | 定价数据来源 |

## 📦 Repo layout

```
dsh-usage-meter/
├── install.cjs            # ★ one-click installer (only needs your DeepSeek key, optional)
├── patch-config.cjs       # ★ insert/update only the usage-meter config block (idempotent, backs up)
├── lib/                   # ★ prebuilt plugin (no build needed)
├── src/                   # complete source (backend + prices/19 providers + client UI)
├── test-*.mjs / .ps1      # tests
├── docs/                  # install / usage / screenshots / pricing data source
└── package.json / tsconfig.json / tsdown.config.ts / LICENSE (MIT)
```

## 📄 License

MIT
