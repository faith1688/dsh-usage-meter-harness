# v2.0.35 — 从 1.0.34 升级：全部新增功能一览

> npm 上的上一个发布版本是 **1.0.34**。本次发布 **2.0.35**，使用 1.0.34 的用户升级后会**一次性获得**下面全部更新（v1.0.35 → v2.0.35 一整条线）。
> 安装/升级命令见文末。

---

## 一、新增功能

### 主题与外观（2.0.x → 2.0.34）

- **20 个内置主题**：浅色系在前、深色系在后，默认 `forest-beach-dawn`（林滩晓色）。用量弹窗顶部 `⇄` 直接快切，设置页「主题设置」有完整配色预览。
- **每主题可自定义配色**：胶囊色、呼吸光晕色、预警三色（余额足 / 不足 / 透支）、速度三档色（0-50 / 51-100 / 101+ tokens/s）；改动即时保存到本机，切换主题不丢。
- **胶囊身份色 = 主题色**（2.0.30）：峰 / 谷 / 平时态跟随主题 brand 家族渲染，不再是写死的固定色。
- **峰谷胶囊 + 峰谷徽章**（2.0.29 / 2.0.31）：谷价浅绿、峰价浅红，计费中带柔和呼吸光晕，一眼看出当前是峰价还是谷价。
- **胶囊按余额三档着色**（2.0.32）：余额足 / 不足 / 透支三色，「余额足」的颜色可在设置页单独调。

### 用量与看板

- **用量展板**（1.0.36）：弹窗右上角 `▦` 打开，三种视图 —— 全部 / 按供应商 / 按模型；数据来自服务端跨会话累计的 `/api/usage-meter/stats`。
- **当前会话看板**（2.0.x）：弹窗默认展开「当前会话」—— 总计 + 分项金额 + 每轮费用明细；坐标标签用 `provider · model`，同名官方/自定义模型不会混淆。
- **余额预警阈值 + 呼吸色**（1.0.36）：全局「预算预警 %」与「余额预警下限」；模型与供应商可各自覆盖（其他设置 → 预警）。触发时输入框旁的胶囊呼吸变红。官方模型按实时余额金额比对，其他模型按预算百分比。

### 计费

- **一键同步官方价格**（2.0.x）：设置页一键抓取 DeepSeek 官网价格页，解析最新单价与峰谷时段并写入覆盖，随时保持官方价最新（需先填全局 API Key）。
- **计费模板导出 / 导入**（1.0.35）：导出到共享持久目录（默认 `$DSH_HOME/usage-meter/exports`），支持覆盖 / 重命名 / 复制 / 删除 —— 多机、多 profile 共用同一套计费模板。

### 设置与易用性

- **设置页选项卡化**（1.0.36）：余额预警 / 主题设置 / 模型后缀识别 / 工作目录设置分区，找设置不用长滚动。
- **视觉包装识别可配**（1.0.36）：逐行「标记 + 开关」配置模型名前缀 / 后缀，可增行、删行，每行独立生效。
- **中英双语三选项**（2.0.x）：跟随系统 / 中文 / English，选择自动记住，设置页与弹窗全部即时生效，英文界面完整（389 条英文词条）。1.0.34 只能「中文 / English」二选一，且不记住选择。
- **未保存 / 已保存 状态**（2.0.x）：模型卡编辑后显示「未保存」，保存后显示「已保存」——不再有含糊的「保存中」。
- **DS API Key 守卫**（2.0.x）：非官方模型绝不会回落使用 DeepSeek 官方全局 key，未设置时明确显示「未配置」。
- **「本对话费用」文案**（2.0.x）：会话级费用的措辞更明确。

---

## 二、计费准确性修复

- **回合归因**（2.0.14 + 2.0.35）：会话中途切换模型时，正在进行的回合不再沿用上一回合的模型标签。实测问题：切到 `deepseek-flash` 后正在跑的第 80 轮仍显示旧模型（`ngrok-ollama/Qwen3.8-27B`）。现在识别 DSH 官方 `model/selection` 事件，回合归属 = 本回合**第一个真正产生用量的请求**，定标后永不改写。
- **回合币种**（2.0.35）：此前 `currency` 参数从未真正生效，回合币种恒为 CNY —— 美元定价的回合总额少换算一个汇率。现在以本回合首个计费用量的定价币种定标。
- **退化峰谷窗口**（2.0.35）：手工或 API 写入的畸形窗口 `{start === end}` 是空集，此前判定恰好铺满全天 → 全天都按峰价计费。现已视作无窗口。
- **看板统计漏计**（2.0.35）：统计改用 `(turn, step)` 基线去重，修复三处漏计 —— 会话中途切模型后该会话看板样本全丢、新 step 首段用量被 clamp 成 0、相邻两步等值样本被误判为重复。
- **统一计费时钟**（2.0.35）：看板此前按 usage **到达**时刻定价，与钱包按 step **起始**时刻不一致 —— 11:59（峰）发起、12:01（谷）才收单的请求，两本账会对不上。现已统一为 step 起始时刻。
- **中文 token 速度**（2.0.24）：token 估算改为 CJK 感知（CJK 字符 = 1，其余 /4），此前中文速度约为真实值的 1/4。

---

## 三、升级方式（从 1.0.34 升上来必看）

从 1.0.34 升到 2.0.35 **必须显式带版本号**，否则 pnpm 可能因 profile 里的旧锁定直接跳过：

```bash
dsh plugin --profile web add @faith1688/dsh-usage-meter-harness@2.0.35
```

或从 profile 目录内（`~/.dsh/profiles/web`）：

```bash
pnpm update @faith1688/dsh-usage-meter-harness
```

若提示 `Already up to date` / `downloaded 0`（profile 里是 `file:` 或固定绑定），改用一键安装器强制改写绑定：

```bash
npx -y @faith1688/dsh-usage-meter-harness@latest
```

升级后**重启 `dsh web`**。注意：重启本身不会拉新版本，必须先把新版本装进 `node_modules`。

---
---

# English

**v2.0.35 — everything new since 1.0.34.** The previous npm release was **1.0.34**; this release is 2.0.35, so upgrading brings the entire line at once (v1.0.35 → v2.0.35).

## New features

**Themes & appearance**
- **20 built-in themes** (light first, dark after; default `forest-beach-dawn`) — quick switch via `⇄` at the top of the usage popup, full palette preview on the settings page.
- **Per-theme custom colors**: pill, breathing glow, alert tiers (balance ok / low / overdrawn) and speed tiers (0-50 / 51-100 / 101+ tokens/s); saved locally, survive theme switches.
- **Pill identity colour = theme colour** (2.0.30): peak / off-peak / flat states render from the theme brand family instead of hard-coded colours.
- **Peak/off-peak pill + badge** (2.0.29 / 2.0.31): light green off-peak, light red peak, with a soft breathing glow while billing.
- **Balance-tier pill colour** (2.0.32), with the "balance ok" colour configurable.

**Usage & dashboard**
- **Usage dashboard** (1.0.36): opens from `▦` in the popup; three views — all / by provider / by model — served from cross-session `/api/usage-meter/stats`.
- **Current-session board** (2.0.x): the popup opens straight into the current session — total + per-category cost + per-turn ledger, labelled `provider · model`.
- **Balance alert thresholds + breathing colour** (1.0.36): global budget-alert % and balance floor, overridable per model/provider; the pill breathes red when tripped.

**Billing**
- **One-click official price sync** (2.0.x): fetches the DeepSeek pricing page, parses the latest prices and peak windows and writes them as overrides.
- **Billing-config export / import** (1.0.35): exports to a shared persistent directory (`$DSH_HOME/usage-meter/exports` by default) with overwrite / rename / duplicate / delete.

**Settings & UX**
- **Tabbed settings page** (1.0.36): balance alerts / theme / model-suffix recognition / working directory.
- **Configurable vision-wrapper recognition** (1.0.36): per-line marker + toggle (model prefix / suffix), add or remove rows.
- **Three-way language switch** (2.0.x): follow system / 中文 / English, remembered, applied live everywhere; the English UI is complete (389 entries). 1.0.34 only offered 中文 / English and did not remember the choice.
- **Unsaved / Saved state** (2.0.x) on model cards; **DS API Key guard** (custom models never fall back to the official global key); clearer "this conversation" cost wording.

## Accuracy fixes
- **Turn attribution** (2.0.14 + 2.0.35): mid-session model switches no longer mislabel the running turn — attribution follows the first usage-producing request, recognising the official `model/selection` event.
- **Turn currency** (2.0.35): the `currency` argument never took effect, so turns were always CNY — USD-priced turns were short by one exchange rate. Now fixed at the turn's first billed usage.
- **Degenerate peak window** (2.0.35): `{start === end}` used to fill the whole day at peak price; now treated as no window.
- **Dashboard under-counting** (2.0.35): stats dedupe on a `(turn, step)` baseline, fixing three lost-usage paths.
- **One billing clock** (2.0.35): dashboard and wallet now both price from the step start time.
- **Chinese token speed** (2.0.24): CJK-aware token estimation (CJK = 1, others /4); Chinese throughput used to read ~1/4 of the real value.

## Upgrading from 1.0.34
```bash
dsh plugin --profile web add @faith1688/dsh-usage-meter-harness@2.0.35
```
If your profile pins the plugin via `file:` or an exact version, use the one-line installer instead: `npx -y @faith1688/dsh-usage-meter-harness@latest`. Then **restart `dsh web`** — a restart alone never fetches a new version.
