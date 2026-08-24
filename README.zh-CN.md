# dsh-usage-meter-harness

[English](README.md) | [简体中文](README.zh-CN.md)

DeepSeek Harness（DSH）的**实时用量 / 费用 / 余额计量插件**。
在聊天输入框旁直接看到 token 用量、消费金额和真实钱包余额——官方 DeepSeek
模型和你注册的任何自定义模型都支持。

![设置页截图](assets/screenshot.png)

## 安装

> 前置（方式一、二）：DSH CLI 本身基于 pnpm，每台机器装一次即可：
> `npm install -g pnpm`（或 `corepack enable`），用 `pnpm --version` 验证。

三选一。**方式一和方式二需要 pnpm**（DSH CLI 本身的一次性前置要求，任意插件都一样）：
`npm install -g pnpm` 或 `corepack enable`。

### 方式一 —— npm 源（需要 pnpm）

```bash
dsh plugin --profile web add --verbose @faith1688/dsh-usage-meter-harness
```

（`--verbose` 显示安装进度，可去掉。）

### 方式二 —— GitHub 源（需要 pnpm）

```bash
dsh plugin --profile web add --verbose github:faith1688/dsh-usage-meter-harness
```

（`--verbose` 显示安装进度。）

### 方式三 —— 一行命令安装，不需要 pnpm（推荐）

```bash
npx -y @faith1688/dsh-usage-meter-harness
```
一条命令：自动装进 DSH web profile 并注册 bundle（幂等）。

不想用 npx？仓库里也带了同样的脚本：

Windows（cmd）：

```bat
curl -fsSL https://raw.githubusercontent.com/faith1688/dsh-usage-meter-harness/main/scripts/install.cmd -o "%TEMP%\um-install.cmd" && "%TEMP%\um-install.cmd"
```

Linux / macOS：

```bash
curl -fsSL https://raw.githubusercontent.com/faith1688/dsh-usage-meter-harness/main/scripts/install.sh | sh
```

脚本会自动完成全部步骤：进入 DSH web profile → 安装包（可见进度）→ 注册
`dsh.profile.bundles`（幂等，升级后重跑安全）。

> 注意：方式三用的是原生 `npm`，**不做 pnpm 协调**。如果你的 profile 由 pnpm
> 管理（`dsh plugin` 的默认方式），推荐用方式一。

任选一种方式后：**重启 `dsh web`**。

## 更新

更新就是**重跑同一条安装命令**——所有方式都是幂等的：

- 官方（需要 pnpm）：`dsh plugin --profile web add @faith1688/dsh-usage-meter-harness`
  （也可以用 `dsh plugin --profile web update @faith1688/dsh-usage-meter-harness`；
  `add` 会解析最新版本并刷新依赖范围）。
- 不需要 pnpm：`npx -y @faith1688/dsh-usage-meter-harness`

执行后：**重启 `dsh web`**（或刷新浏览器页面）。

**为什么这样更新绝不会产生重复挂载记录、也绝不会动你的配置：**

- 挂载记录在**插件包内部**（`cordis.patch.yml`，`dsh.bundle` 机制）。每个版本
  自带完整的一条挂载记录；DSH 启动时从已安装的包里读取——装上新版本包，
  自动就带上新版本的正确记录。
- 安装器只改 profile 的 `package.json`（`dsh.profile.bundles`，自动去重）和
  `node_modules`。**从不写** profile 根目录的 `cordis.patch.yml`——你在里面
  自己加的内容（或其他插件的配置）原样保留。
- 重复挂载记录只可能发生在：你**手动**往 profile 根 `cordis.patch.yml` 里加了
  相同的 `id`——安装器永远不会这样做。

## 功能一览

### 对话用量卡（聊天输入框旁）

| 功能 | 说明 |
| --- | --- |
| 实时费用 | 会话累计费用，CNY / USD 可切换，每步实时更新 |
| Token 明细 | 输入(未命中) / 缓存命中 / 缓存写入 / 输出 分桶统计 |
| 本轮用量面板 | 逐轮小计，单价带峰/谷标记 |
| Token 速度 | 模型输出时实时 tokens/s；输出停止或工具执行时自动清零，不冻结旧值 |
| 缓存命中率 | 会话级缓存命中占比 |
| 账户余额 | DeepSeek 官方真实钱包余额；其他厂商按本地账本估算 |
| 预算与剩余 | 设置预算后显示已用 / 剩余 / 超支 |

### 计费引擎

| 功能 | 说明 |
| --- | --- |
| 6 种计费模板 | 基础 · 缓存命中/未命中 · 峰谷分时（DeepSeek 官方时段）· 缓存写入+命中 · 输入+输出合并 · Batch 半价 |
| 自定义单价项 | 最多 4 行自定义行；弹窗与你配置的内容逐格一致 |
| 峰谷分时计费 | 北京时间星期 + 时段窗口，支持跨零点时段；按每次请求的发起时刻计费 |
| 每模型独立计价 | 每个模型可单独设置币种（CNY/USD）、单价与余额 |
| 共享余额钱包 | 一个供应商下所有模型共用一个钱包，一个复选框开关 |
| 官方价预填 | DeepSeek 官方模型自动预填官方价与官方峰谷时段 |
| 内置价格表 | 内置 19 家厂商 137 个模型价格；可选 LiteLLM 形状的远端价格源 |
| 汇率自动刷新 | USD→CNY 自动获取，超过 24 小时自动更新 |
| 旧数据迁移 | 旧版手动初始余额/充值记录自动迁移为厂商钱包，余额不丢失 |

### 设置与体验

| 功能 | 说明 |
| --- | --- |
| 中英双语界面 | 设置页右上角一键切换 中文 / English，设置页与弹窗全部即时生效。只影响显示，绝不改动你保存的数据 |
| 使用中锁定 | 模型正在生成时锁定其编辑器，保证进行中的轮次价格一致 |
| 弹窗所见即所得 | 用量卡的行名与格子完全抄自你选择的模板 |
| 无侵入 | 标准 DSH cordis 插件；不改动其他插件，不动 DSH 核心文件 |

## 支持的模型

- **DeepSeek 官方模型**（`deepseek-chat`、`deepseek-reasoner` 等）：自动预填官方价，
  通过 API Key 显示真实钱包余额。
- **任意自定义模型**（DSH 注册的 OpenAI 兼容厂商、Ollama、OpenRouter 等）：
  自行填写单价与余额即可，其余功能完全一致。

## 截图

设置页：

![设置页](assets/screenshot.png)

用量弹窗：

![用量弹窗](assets/popup.png)

## 配置

所有配置都在 `usage-meter` 设置命名空间，可直接在插件界面里修改：

| 键 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `currency` | string | `CNY` | 显示币种 |
| `budget` | number | – | 会话预算；设置后显示「剩余」 |
| `priceSourceUrl` | string | – | LiteLLM 形状的价格 JSON 地址；可选 |
| `refreshIntervalMs` | number | 4h | 价格 / 余额 / 汇率刷新周期 |
| `deepseekApiKey` | secret | – | 仅用于查询 DeepSeek 余额（AES 加密存储；**不读取**环境变量 `DEEPSEEK_API_KEY`） |

## 兼容性

- 需要 Node.js ≥ 22。
- peer 版本跟随所支持的 DSH 版本（见 `package.json`）；DSH 升级不影响本插件，
  本插件也不会影响你的其他插件。

## License

MIT © [faith1688](https://github.com/faith1688)

## 隐私

- 插件**无任何遥测、无统计**。
- 网络请求仅两处可选：① 用你自己配置的 API Key 查询 **DeepSeek 官方余额接口**；
  ② 获取公开的 USD→CNY 汇率。除此之外没有任何数据离开你的机器。
- 源码 MIT 协议，GitHub 上完全可查。
