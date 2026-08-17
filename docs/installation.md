# Installation Guide (English)

> This plugin is a **DeepSeek Harness (dsh) plugin** that shows live usage → cost → balance in the conversation composer. Installing takes 2–3 steps; pick either method below.

---

## Before you start (30-second read)

| Question | Answer |
|---|---|
| Prerequisites | A working **DeepSeek Harness (dsh)** install (you can chat normally) |
| Node.js? | Yes (you already have it — dsh requires it) |
| DeepSeek API key needed? | **No — the key is optional.** It is only needed to show your **real DeepSeek balance** (see below) |
| Will it touch my existing config? | The script **backs up** `cordis.patch.yml` (`.bak`) before changing it |

### About the DeepSeek API key (important)

- **The key is optional**: install works without it; usage and cost for every model still display (reference pricing from the bundled table).
- **Only the real DeepSeek balance** needs the key — DeepSeek's balance comes from the official API and requires your DeepSeek key.
- **Any key of the same DeepSeek account works** (all keys of one account are equivalent for balance lookups).
- Without a key, the plugin falls back to the `DEEPSEEK_API_KEY` environment variable.
- Billing for **other vendors/models needs no key at all** (pure bundled reference pricing).

---

## Method 1: One-click install script (recommended, simplest)

> **You only do one thing**: run a command. Paths and install locations are handled automatically.

### Step 1: Get the plugin files

- Download this repo from GitHub (Clone or Download ZIP) and unzip it into a `dsh-usage-meter-harness` folder;
- Open a terminal and enter the folder:
  ```bash
  cd dsh-usage-meter-harness
  ```

### Step 2: Run the installer

```bash
node install.cjs --key sk-yourDeepSeekKey
```

- `--key` takes your DeepSeek API key (create one at [platform.deepseek.com](https://platform.deepseek.com)).
- **No key? Just run `node install.cjs`** (press Enter to skip the prompt) — installs fine; only the DeepSeek balance shows "获取中…".

### Step 3: Done

The script automatically:
1. Locates your DSH data dir (`~/.dsh`, on Windows `$HOME\.dsh`)
2. Finds (or creates) the config file `profiles/web/cordis.patch.yml`
3. Copies the plugin into DSH's `node_modules` (no build needed)
4. Writes/updates the plugin enable block

After you see "安装完成 ✅":
```bash
dsh web          # restart DSH (Ctrl+C the old one first)
```
Hard-refresh the browser (Ctrl+Shift+R), open any conversation → the meter appears above the input. Done 🎉

### Optional flags

```bash
node install.cjs --dry-run           # preview only, changes nothing
node install.cjs --currency USD      # display currency (CNY/USD, default CNY)
node install.cjs --npm               # install from npm instead (Method 2)
node install.cjs --uninstall         # uninstall (removes config + files)
node install.cjs --key newKey        # re-run to UPDATE config (change key etc., no duplicates)
```

---

## Method 2: Install from npm

> Package name: **`@faith1688/dsh-usage-meter-harness`** (published)
>
> ⚠️ Note: the npm method is **not a single command** — step 1 installs the files; you still need to paste the enable block (step 2) and restart (step 3). For a one-command install use Method 1 (`node install.cjs --npm` does both steps automatically).
>
> 🔑 **DeepSeek API key**: optional for install — but **without it, DeepSeek metering (real balance) will not work**; any key of the same DeepSeek account works, otherwise the plugin falls back to `DEEPSEEK_API_KEY`. Other vendors' reference billing needs no key. **The plugin itself consumes almost zero API usage** (it only reads the balance endpoint, which bills no tokens, and never calls models).

### Step 1: Install the npm package

**Windows (PowerShell) — one-line install** (installs into a temp folder first, then copies into the profile: reliable on any machine; the command uses `$HOME`, so **no username to fill in** — `@faith1688/` is the package author's npm username, **don't change it**):

```powershell
npm install @faith1688/dsh-usage-meter-harness --prefix $env:TEMP\um-install --registry=https://registry.npmjs.org; Copy-Item -Recurse -Force "$env:TEMP\um-install\node_modules\@faith1688\dsh-usage-meter-harness" "$HOME\.dsh\profiles\node_modules\@faith1688\dsh-usage-meter-harness"; dir "$HOME\.dsh\profiles\node_modules\@faith1688\dsh-usage-meter-harness"
```

The final `dir` shows `lib\` and `package.json` = installed.

**macOS / Linux**:

```bash
npm install @faith1688/dsh-usage-meter-harness --prefix "$TMPDIR/um-install"; cp -r "$TMPDIR/um-install/node_modules/@faith1688/dsh-usage-meter-harness" "$HOME/.dsh/profiles/node_modules/@faith1688/dsh-usage-meter-harness"
```

### Step 2: Enable the plugin

Open the config file (Windows: `$HOME\.dsh\profiles\web\cordis.patch.yml`) and **paste at the end** (replace `sk-xxx` with your key; leave `''` if you have none):

```yaml
- insert:
    - id: usage-meter
      name: '@faith1688/dsh-usage-meter-harness'
      config:
        currency: 'CNY'               # display currency: CNY / USD
        refreshIntervalMs: 14400000   # refresh interval (ms), default 4 h, usually unchanged
        priceSourceUrl: ''            # remote price source URL; empty = bundled
        deepseekApiKey: 'sk-xxx'      # optional; empty = use env DEEPSEEK_API_KEY
        initialBalance: 0             # manual starting balance (CNY); leave 0
```

### Step 3: Restart & verify

```bash
dsh web
```
Hard-refresh (Ctrl+Shift+R) → open a conversation → the meter appears.

> 💡 One-command version: download the GitHub repo and run `node install.cjs --npm` — the script does steps 1 & 2 automatically (Windows paths handled).

---

## Verify it works

1. Server log shows `[usage-meter] config route registered...`;
2. The composer dock shows: `model · 本次 ¥xx · 余额 ¥xx · N 次`;
3. 「用户自定义设置」reveals the billing-method dropdown (8 types) and price editor.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| Meter doesn't appear | ① restart `dsh web` ② hard-refresh Ctrl+Shift+R ③ check the server log for `[usage-meter]` errors |
| Balance stuck on "获取中…" | No DeepSeek key: re-run `node install.cjs --key sk-xxx`, or set `DEEPSEEK_API_KEY` |
| Config changes don't apply | Every change needs **restart dsh web + hard-refresh** |
| Uninstall | `node install.cjs --uninstall`, then restart dsh web |
| npm says `Sign up to CNPM` / publish rejected | Your registry is a mirror (npmmirror) — add `--registry=https://registry.npmjs.org` |
| npm crashes (Node `Fatal error` / V8) during install | Node 24.x TLS bug with mirror registries — add `--registry=https://registry.npmjs.org`, or upgrade Node to 22 LTS |

---

## Changing config later (entry points)

Every change needs: **restart dsh web + hard-refresh**.

| What | Where |
|---|---|
| **DeepSeek API key** | ① re-run `node install.cjs --key newKey` (recommended) ② edit `deepseekApiKey` in `cordis.patch.yml` ③ set env `DEEPSEEK_API_KEY` |
| Display currency / refresh interval | `currency` / `refreshIntervalMs` in `cordis.patch.yml`, or `node install.cjs --currency USD --refresh 14400000` |
| Per-model prices / billing method / pricing currency | conversation page →「用户自定义设置」→ model price editor (saved to `~/.dsh/usage-meter.json`) |
| Non-DeepSeek balance / recharge | conversation page →「用户自定义设置」→ 账户余额 / 充值 |
| Remote price source | `priceSourceUrl` in `cordis.patch.yml` (LiteLLM-shaped JSON) |

Config file: `~/.dsh/profiles/<profile>/cordis.patch.yml` (Windows: `$HOME\.dsh\profiles\web\cordis.patch.yml`)

---

## Building from source (developers, optional)

The repo ships a prebuilt `lib/` — no build needed for normal use. Only after editing source:

```bash
# requires the deepseek-harness monorepo workspace
# place this repo at packages/client/usage-meter, then:
pnpm install
pnpm --filter @deepseek-ai/dsh-usage-meter bundle   # outputs lib/index.js + lib/client.js
```
