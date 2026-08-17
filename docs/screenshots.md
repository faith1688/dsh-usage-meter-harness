# 截图建议（Screenshot Guide）

> 用于 README 首页与文档。截图应清晰展示插件核心价值：**真实 DeepSeek 余额、实时每轮费用、峰谷识别、8 种计费方式**。
> These filenames below are what the README/demo links expect (`docs/screenshot-*.png`).

## 推荐截图清单（6 张）

| 文件名 | 内容 | 拍摄要点 |
|---|---|---|
| `screenshot-main.png` | **首页主图**：对话中输入框上方的计量器 | 同时可见：模型名、本次费用、**DeepSeek 真实余额**（绿色）、请求数；点击展开的详情卡（用量表 + 每轮费用） |
| `screenshot-balance.png` | **DeepSeek 余额细节** | 悬停余额胶囊，显示「更新于/计算于 HH:MM:SS」「官网刷新有延迟」；或详情卡里的余额区块 |
| `screenshot-peak.png` | **峰谷识别** | 用量表上方显示「高峰」或「低谷」标签；或设置面板中「峰谷分时定价」模板（表头「高峰价」+ 闲时 ×0.5 提示） |
| `screenshot-templates.png` | **8 种计费方式下拉** | 设置面板 → 模型单价编辑 → 计费方式下拉展开，8 个选项可见（含 ⚠️ 注明） |
| `screenshot-editor.png` | **单价编辑 + 定价币种** | 设置面板完整可见：计费方式下拉、币种下拉（定价币种）、用量名称/单价输入、保存单价/重置价格按钮 |
| `screenshot-rate.png` | **汇率行 + 双币种** | 显示币种 ≠ 定价币种时，设置面板下方的「汇率：1 USD ≈ x CNY · 更新于 …」行 |

## 拍摄建议

1. **用 DeepSeek 模型**演示（突出「为 DeepSeek 设计」）：`deepseek-v4-flash` / `deepseek-v4-pro`。
2. **先把余额充到有意义的数字**，或使用真实余额展示。
3. **缩放**：浏览器建议 1280×800 以上；截图区域裁剪到插件部分即可。
4. **浅色/深色各一张**更好（README 支持两套主题，CSS 变量自动适配）。
5. 文件名放入 `docs/` 目录；README 里的 `![demo](docs/screenshot-main.png)` 会自动生效。

## 备选

- 一张**透视图**：同一对话中切换多个模型，显示不同计费方式（缓存写+命中 vs 合并计价 vs 峰谷）下的用量表差异。
- 一张**透支余额**截图（红色「透支」），展示账本可负的特性。
