# @faith1688/dsh-usage-meter-harness

为 DeepSeek Harness 打造的**实时用量 / 费用 / 余额计量插件**：在聊天输入框旁直接看到当前会话正在使用的模型、单价、token 用量、已消费金额、账户余额与剩余预算，并支持逐轮费用明细与可视化价格/余额编辑。

![插件界面截图](assets/screenshot.png)

## ✨ 功能

- **实时用量**：实时显示当前模型、API 请求次数、输入/输出/缓存/推理 token 用量。
- **实时费用**：按 token 分桶计价（输入 / 缓存读 / 缓存写 / 输出），逐轮成本分别记录并换算到显示币种汇总。
- **完整价格体系**：内置 19 家厂商 136 个模型的价格表，支持可配置的远端价格源（LiteLLM JSON）与手动单价覆盖。
- **DeepSeek 峰谷分时价**：按请求发起时间自动选用高峰/闲时价，日志重放费用一致。
- **8 种计费模板**：基础、缓存命中/未命中、峰谷分时、缓存写入+命中、上下文缓存存储、长度分档、输入+输出合并、Batch 半价。
- **账户余额**：DeepSeek 官方真实余额（自动刷新）；非 DeepSeek 厂商用本地账本（初始余额 + 充值 − 累计消费）。
- **剩余预算**：`预算 − 已消费`，对所有厂商一致。
- **每轮费用明细**：逐 turn 的成本、起止时间、结束原因、模型、入出 token。
- **币种换算**：默认 CNY，支持 USD，实时汇率仅在做换算时拉取。
- **编辑面板**：在读数卡内一键改币种、设置非 DeepSeek 余额/充值、覆盖模型单价与计费方式、一键重置回官方价。

## 🚀 安装

只需一条命令：

```bash
dsh plugin --profile web add @faith1688/dsh-usage-meter-harness
```

然后**重启 `dsh web`**。重启后，在任一会话输入框下方的读数带即可看到用量 / 费用 / 余额读数，点击展开详情卡。

> 本插件以宿主插件形式挂载、跨会话常驻；前端读数自动加载，无需任何额外配置。

## ⚙️ 配置

配置项位于 `settings` 命名空间 `usage-meter`（可在读数卡的编辑面板内直接修改）：

| 键 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `currency` | string | `CNY` | 显示币种 |
| `budget` | number | 无 | 会话预算；设置后显示「剩余」 |
| `priceSourceUrl` | string | 无 | LiteLLM 形状的价格 JSON 地址；不填只用内置表 |
| `refreshIntervalMs` | number | 4h | 价格 / 余额 / 汇率刷新周期 |
| `deepseekApiKey` | string(secret) | 无 | 仅用于查询 DeepSeek 余额；也可用 `DEEPSEEK_API_KEY` 环境变量 |
| `initialBalance` | number | 无 | 非 DeepSeek 厂商的初始余额 |

价格源推荐配 LiteLLM 原始文件，价格更及时：

```
https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json
```

## 📄 License

MIT
