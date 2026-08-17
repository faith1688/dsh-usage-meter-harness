# dsh-usage-meter

**专为 DeepSeek API 打造的实时用量 / 费用 / 余额计量插件 —— 在聊天输入框旁直接看到 tokens、花费与真实余额。**

> 🇨🇳 简体中文 · [🇬🇧 English](README.md) · npm 包名：[`@faith1688/dsh-usage-meter-harness`](https://www.npmjs.com/package/@faith1688/dsh-usage-meter-harness)

---

## ✨ 它能做什么

**为 DeepSeek 而生**：通过 DeepSeek 官方 `/user/balance` API 读取你的**真实账户余额**（不是估算），自动识别 DeepSeek 的**峰谷分时定价**（高峰 9-12 / 14-18，闲时 ×0.5），并**实时显示每一轮的费用**——全程不用离开对话页面。其他厂商作为**参考计费**支持（内置 136 个模型 + 全局余额账本）。

![demo](docs/screenshot-main.png)

## 🎯 插件特色

| | |
|---|---|
| 🎯 **真实 DeepSeek 余额** | 官方 API 锚点 − 实时消费，绝不估算。 |
| ⏱️ **每轮费用** | 每一轮 tokens → 费用，含起止时间与当轮实际使用的模型。 |
| 📐 **计量精确** | 按精确 token 用量 × 官方单价计算，**计量误差 < ¥0.02**。 |
| 🌗 **峰谷自动识别** | DeepSeek 峰谷分时定价（北京时间 9-12 / 14-18 高峰，闲时 ×0.5）自动生效；**整个请求按发起时刻的时段计费**（17:58 发起、18:08 结束仍算高峰；7:59 发起跨过 8:00 仍算闲时）。 |
| 🧮 **8 种计费方式模板** | 基础 · 缓存命中/未命中 · 缓存写+命中 · 上下文存储 · 分档 · 合并计价 · Batch×0.5 · 峰谷分时。 |
| ✏️ **可编辑定价** | 每模型单价、计费方式、定价币种均可改并持久化，无需改代码。 |
| 💱 **双币种体系** | 定价币种与显示币种分离，实时 USD↔CNY 汇率。 |
| 🌍 **内置 136 模型** | DeepSeek、OpenAI、Anthropic、Gemini、Qwen、Kimi、GLM、豆包等（2026-08 快照）。 |
| ♻️ **重放安全** | 重启后按会话事件重算，每轮费用完全一致。 |
| 🔇 **插件自身 API 用量≈0** | 插件本身几乎不消耗 API——只读 DeepSeek 余额接口（不产生 token 计费），从不调用模型。 |

> ⚠️ 定位说明：主要为 **DeepSeek API 计量**设计——查看 **DeepSeek 真实余额**需要 DeepSeek API Key（同一账户下任意 Key 都行）；**不填 Key 则 DeepSeek 计量不可用**，但其他厂商的参考计费不受影响。其他厂商价格仅作**参考**，变动频繁，请以官方定价页为准。

## 🚀 安装（二选一）

### ⚡ 方式一：一键脚本（推荐）

```bash
git clone https://github.com/faith1688/dsh-usage-meter-harness.git && cd dsh-usage-meter-harness
node install.cjs --key sk-你的DeepSeekKey     # Key 是【可选的】——见下方说明
```

脚本自动定位 DSH 目录、安装插件（无需构建）、并在 `cordis.patch.yml` 中启用（先备份、可重复运行）。然后重启 `dsh web` 并强刷浏览器。

### 📦 方式二：npm（Windows 一句话，无需填用户名）

> 命令用 `$HOME` 自动定位你的用户目录，**你不需要改任何内容**（`@faith1688/` 是包作者的 npm 用户名，**不要改**）。

```powershell
npm install @faith1688/dsh-usage-meter-harness --prefix $env:TEMP\um-install --registry=https://registry.npmjs.org; Copy-Item -Recurse -Force "$env:TEMP\um-install\node_modules\@faith1688\dsh-usage-meter-harness" "$HOME\.dsh\profiles\node_modules\@faith1688\dsh-usage-meter-harness"; dir "$HOME\.dsh\profiles\node_modules\@faith1688\dsh-usage-meter-harness"
```

然后在 `cordis.patch.yml` 末尾粘贴启用配置块（见 [docs/installation.zh-CN.md](docs/installation.zh-CN.md)），或让脚本安全地替你插入：

```powershell
node "$HOME\.dsh\profiles\node_modules\@faith1688\dsh-usage-meter-harness\patch-config.cjs" --key sk-你的DeepSeekKey
```

（`patch-config.cjs` 只插入/更新 usage-meter 配置块——**不会覆盖你配置里的任何其他内容**、幂等（不会产生重复的 `insert` 条目）、写入前自动备份 `cordis.patch.yml.bak`。`--key` 可省略。）

> **DeepSeek API Key 说明**：安装时不填也能装——但**不填的话 DeepSeek 的计量（真实余额）无法使用**；**同一 DeepSeek 账户下任意 Key 都行**；其他厂商的计费不需要任何 Key。不填时插件自动读取环境变量 `DEEPSEEK_API_KEY`。**插件自身 API 用量≈0**。

完整安装教程：[docs/installation.zh-CN.md](docs/installation.zh-CN.md) · [docs/installation.md](docs/installation.md)

## 📖 10 秒上手

- 一行计量器：`模型 · 本次费用 · 余额 · 请求数` → 点开详情卡（用量表、缓存命中率、每轮费用、高峰/低谷标签）。
- 「用户自定义设置」：显示币种、非 DeepSeek 余额/充值、**计费方式（8 种）**、定价币种、单价——保存/重置。
- 完整使用指南：[docs/usage.zh-CN.md](docs/usage.zh-CN.md) · [docs/usage.md](docs/usage.md)

## 🧪 测试

```bash
node test-usage-meter.mjs        # 计费数学（含官方计费示例）
node test-cross-time.mjs         # 峰谷跨时段规则（按请求发起时间计费）
node test-unknown-override.mjs   # 未知模型价格覆盖（自包含）
powershell -File test-ledger-flow.ps1   # 账本集成（需运行中的服务器）
```

## 🗂️ 文档

| 文档 | English |
|---|---|
| [docs/installation.zh-CN.md](docs/installation.zh-CN.md) — 安装（脚本/npm） | [docs/installation.md](docs/installation.md) |
| [docs/usage.zh-CN.md](docs/usage.zh-CN.md) — 完整使用 | [docs/usage.md](docs/usage.md) |
| [docs/screenshots.md](docs/screenshots.md) — README 截图清单 | 截图清单 |
| [PRICING.md](PRICING.md) — 计费方式与数据来源 | 计费方式对照 |
| [docs/AI大模型API定价汇总_2026年8月.md](docs/AI大模型API定价汇总_2026年8月.md) — 定价数据来源 | 定价数据来源 |

## 📦 仓库结构

```
dsh-usage-meter/
├── install.cjs            # ★ 一键安装脚本（只需要你的 DeepSeek Key，可省略）
├── patch-config.cjs       # ★ 只插入/更新 usage-meter 配置块（幂等、自动备份、不覆盖其他配置）
├── lib/                   # ★ 预构建插件（无需构建）
├── src/                   # 完整源码（后端 + prices/19 厂商 + 前端 UI）
├── test-*.mjs / .ps1      # 测试
├── docs/                  # 安装 / 使用 / 截图 / 定价数据源
└── package.json / tsconfig.json / tsdown.config.ts / LICENSE (MIT)
```

## 📄 License

MIT
