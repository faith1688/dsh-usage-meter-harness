# dsh-usage-meter-harness — 厂商计费方式对照（2026-08-16，来源：AI大模型API定价汇总_2026年8月.md）

## 计费方式（模板 = 行结构 + 单价，计算必须与模板匹配）

| 公式类型 | 说明 | 适用厂商 | 插件建模 |
|---|---|---|---|
| 类型一 基础（无缓存） | `T_in×P_in + T_out×P_out` | xAI Grok、Cohere、腾讯混元、百度文心、昆仑万维、百川 M2 | split，2 行（输入/输出） |
| 类型二 缓存命中/未命中 | `T_hit×P_hit + T_miss×P_in + T_out×P_out` | DeepSeek、Kimi、智谱、阶跃、小米、豆包 | split，3 行（命中/未命中/输出） |
| 类型三 缓存写+命中 | `T_in×P_in + T_write×P_write + T_hit×P_hit + T_out×P_out` | Anthropic（写 1.25×/2×，命中 0.1×）、Qwen（写 1.25×，命中 0.1×）、MiniMax（读/写分开）、Mistral（命中 0.1×） | split，4 行（命中/未命中/缓存写/输出） |
| 类型四 上下文缓存存储 | `T_in×P_in + T_cached×P_cached + 存储费 + T_out×P_out` | Gemini | split，3 行；**存储费无法获取存储量暂不计量**（缓存读价已计） |
| 类型五 上下文阶梯 | 按输入总量分档取单价 | 豆包 1.6、Qwen3-max/coder、ernie-5.0、GLM-4.7/Air、Gemini Pro、MiMo（已取消分档） | **取基础档**（每模型一行，注明档位） |
| 类型六 输入输出合并 | `(T_in+T_out)×合并单价` | **讯飞星火（元/万tokens）、百川 Baichuan4 系** | **combinedPerM**，1 行「输入+输出（合并计价）」 |
| 类型七 Batch 半价 | 标准×0.5 | OpenAI/Anthropic/Gemini/Mistral/Qwen | **discount=0.5**（倍数，作用在整单费用上）；厂商模板下拉为这 5 家各增一条「Batch 半价（×0.5）」模板 |
| 类型八 峰谷分时 | 高峰按高峰单价、闲时=高峰×0.5 | **DeepSeek V4**（2026-08-17 起，高峰=北京 9-12/14-18） | **peak/offPeak**（`resolvePricingForTime` 按北京时间判定）；编辑器输入高峰价，闲时自动 ×0.5；**整个请求按发起时刻的时段整体计费**（跨时段不切换：17:58 发起到 18:08 结束仍按高峰，7:59 发起跨过 8:00 仍按闲时） |

## 共享计算函数

- `costBreakdown`/`costOf`（projection.ts）：split 模式按 4 桶×单价；**combined 模式（`combinedPerM`）按全 token 数×合并单价**，费用挂 input 桶供单行模板展示；**`discount`（默认 1）对整单结果乘倍，类型七 Batch 半价 = 0.5**。
- 行模板 `rowsFromPricing`：combined → 1 行；有 cacheWrite → 4 行；有 cacheRead → 3 行；否则 2 行。**换模板即换计费方式，计算随模板匹配。**
- 计费方式下拉（`/api/usage-meter/templates` 返回 `types`）：**8 种计费类型**（非厂商），选中即切换行结构+计算方式（split/combined/discount/peak）。类型四（Gemini 存储费）与类型五（阶梯更高档）在模板内注明「无法计量/取基础档」。类型七 Batch 半价 = `discount=0.5`；类型八 峰谷分时 = 输入的单价即高峰价、闲时自动 ×0.5。
- 单价编辑区另有**币种下拉**（该模型单价的**定价币种**，默认 = 模型原生币种；保存时随 `prices.currency` 写入覆盖）。切换到非模型原生币种时换算已填单价、并刷新最新汇率。
- **定价币种 ≠ 显示币种**：定价币种只决定单价如何计价（费用按定价币种计算）；上方余额、用量表、每轮费用的**显示币种由顶部「币种」下拉（用户选择）决定**，二者相互独立。
- 汇率：`POST /api/usage-meter/refresh-rate` 强制拉取最新 USD→CNY；显示币种 ≠ 模型定价币种时在设置面板显示「汇率 + 更新时间」。

## 厂商 × 计费方式 × 币种

| 厂商 | 计费类型 | 模板行数 | 币种 | 说明 |
|---|---|---|---|---|
| OpenAI | 二+七 | 3 | USD | 5.5/5.4 系标准价；长上下文×2/×1.5；5.6 系含缓存写 |
| Anthropic | 三+七 | 4 | USD | 写 1.25×（5m），命中 0.1× |
| Gemini | 四+五 | 3 | USD | 存储费暂不计量；Pro 取 ≤200K 档 |
| xAI Grok | 一 | 2 | USD | 仅 4.5/4.6 |
| Mistral | 三 | 3 | USD | 命中 0.1× |
| Cohere | 一 | 2 | USD | 新增 |
| DeepSeek | 二 | 3 | CNY | V4 平峰 + 峰谷（2026-08-17 生效） |
| 智谱 GLM | 二+五 | 3 | **CNY（原 USD 已改）** | 国内官方价；5.x 为第三方转述 |
| Kimi | 二 | 3 | CNY | k2.7-code 系新增；k2 系已下线、k2.5/v1 8-31 下线 |
| Qwen | 三+五 | 4 | CNY | 显式缓存写 1.25×、命中 0.1×；阶梯取基础档 |
| 腾讯混元 | 一 | 2 | CNY | hy3 保留 + 官方页模型 |
| 豆包 | 二+五 | 3 | CNY | 2.1 系缓存价；1.6/1.5 基础档 |
| MiniMax | 三 | 4 | **CNY（原 USD 已改）** | M3/M2.7 国内五折价；M2 系 Legacy 移除 |
| 阶跃 | 二 | 3 | CNY | ✓ 不变 |
| 讯飞 | **六（合并）** | **1** | CNY | 现行价未核实（官网为图片），暂用 2024 公告 ¥21/1M 合并 |
| 百度 ERNIE | 一+五 | 2 | **CNY（原 USD 已改）** | 5.0 ≤32K 档、5.1/x1.1 新增 |
| 小米 MiMo | 二 | 3 | CNY | 调价后不分档；v2-flash 价未核实（旧价）；v2-omni 新增 |
| 百川 | **六（合并）** | **1** | CNY | 新增：Baichuan4 系合并计价，M2 分开 |
| 昆仑万维 | 一 | 2 | CNY | 新增：SkyClaw 系 |

## 已移除/标注退役（2026-08-16 文件核实）

- 移除：gemini-2.0-flash/lite（关停）、grok-3/3-mini/4/4-fast（官方页消失）、kimi-k2 系（下线）、GLM-4.6 文本（撤下）、MiniMax M2/M2.1/M2.5（Legacy）、spark-max（下线）、doubao-1.5-pro 旧价、旧 USD 版 zhipu/minimax/baidu。
- 标注退役（价格行保留）：OpenAI o3/o3-mini/gpt-4.1-nano（10-12 月退役）、kimi-k2.5/v1（8-31）、GLM-4.5-flash（即将下线）。
- 未收录：零一万物（平台 9-03 关停）、商汤（公测免费）、华为盘古（无按量 API）。
