## v3.0.0 —— 桌面版来了（DSH 0.2 desktop build），和 2.0.x 是两套独立构建

一句话：**2.0.x 是网页版（web profile）构建，3.0.0 是桌面版（DSH 0.2 desktop）构建。**
本仓库现在同时发布两个包，两者可以同时装、互不干扰。

| | 2.0.x（网页版） | 3.0.0（桌面版，本次发布） |
| --- | --- | --- |
| npm 包名 | `@faith1688/dsh-usage-meter-harness` | `dsh-usage-meter-desktop` |
| 插件 id | `usage-meter` | `usage-meter-desktop` |
| 数据目录 | `$DSH_HOME/usage-meter/` | `$DSH_HOME/usage-meter-desktop/` |
| 配置文件名 | `usage-meter.json` | `usage-meter-desktop.json` |
| 适用宿主 | DSH 0.1 / web profile | **DSH 0.2 桌面版**（也兼容 web） |

**怎么选**：你现在跑的是 DSH 桌面版（0.2），就装 3.0.0；还在用 0.1 网页版，就继续 2.0.39。
数据目录和配置文件名**刻意错开**，两个一起装也不会互相覆盖账本和定价。

> 注意：2.0.x 在 DSH 0.2 上**根本起不来**（调 `ctx.settings.register` 直接
> `1 entry did not activate`）。桌面版用户请直接用 3.0.0。

---

## 一、适配 DSH 0.2（不改就跑不起来）

- DSH 0.2 删掉了 `ctx.settings.register`，换成只负责界面渲染的 `SettingsForms`。
  旧代码一调就 `TypeError: ctx.settings.register is not a function`，整个插件激活失败。
  3.0.0 自带一套文件型 settings scope（`src/settings-scope.ts`），语义与 0.1 一致：
  schema 默认值 ← 组合 base ← 用户落盘值。
- DSH 0.2 不再解析「没 inject 的服务」。旧版用 `ctx.get('webServer')` 探活，在 0.2 上
  永远读成 absent ⇒ 所有 `/api/usage-meter/*` 路由静默消失、前端拿不到数据。
  3.0.0 把 `webServer` 改成必需 inject。

## 二、新增：从本机其它计费插件导入定价

模型编辑区右上角，除「导出计费配置 / 导入计费配置」外多了第三个按钮
**「导入其它插件计费配置」**：

- 自动扫描本机已装的计费插件（当前支持 `dsh-cost-meter`），列出它认得的所有模型定价；
- 按模型名相似度排序（前缀比 0.45 + 二元组 Dice 0.35 + 词元 Jaccard 0.20），最像的排最前；
- 点「用这条」直接写进**这张卡对应的模型**（不是来源里的 provider），来源币种自动按
  当前汇率换算成目标模型币种。

设置页里原来那两个「按模型导入定价 / 其它插件定价」的整块 UI 已删除，功能全部收进
模型卡片里的这个按钮 —— 导入目标跟着卡片走，不会再导错模型。

## 三、峰谷时段随单价一起导入（关键正确性修复）

只导单价不导时段 = 分时计价永远错：来源插件把高峰定在别的钟点，我们照旧用自己的窗口，
同一份单价会在错误的时间段被套用。3.0.0 把 `peakWindows` / `peakDays` 一并带过去，并把
cost-meter 存的 **UTC 小时**换算成北京时间分钟数（`+8`，跨零点夹到 24:00）。

## 四、不再硬造峰谷

现象：Kimi-K3 的峰价/谷价三项完全一样（20/20、2/2、100/100），界面却挂着「含峰谷」徽章、
峰谷开关还是打开的。

两个根因：

1. 来源插件 cost-meter 的 `config.peakWindows` 是**整份配置级**的 —— 只要有一个模型配了
   峰谷，这个字段就有值。旧代码把它套给了所有行，没配峰谷的模型也跟着「含峰谷」。
2. 旧代码只看 `peak` 字段存不存在，不看数值。峰谷三项相等时它照样被当成峰谷。

修法：**按行判定**，三项全等 ⇒ 该行 `peak = null`、窗口也置空；服务端写入时同样判定，
`peak` 与谷价三项相等就不写 `peak/offPeak/peakWindows/peakDays`，该模型就是平坦定价。
读配置时还会把历史脏数据统一规整（`normalizePeakFields`），你之前导入过的假峰谷会自动
变回平坦定价。

实测（本机 832 条候选）：修前 832 条全部「含峰谷」；修后**只剩 9 条**，全部是 DeepSeek
官方系列（`deepseek-flash` / `deepseek-v4-flash` / `deepseek-v4-pro` / `deepseek-v4.1-flash`
及其 opencode-go 渠道），Kimi、Qwen、Gemini 等全部变平坦。

## 五、改价即时生效

之前点「用这条」后必须收起胶囊再展开才能看到新单价。两个根因：

1. override 里另存着一份旧「明细行表」，改价只更新 prices，行表纹丝不动；
2. 宿主投影只在 session 事件到来时重算，改价不产生事件。

修法：只改单价时作废旧行表 + 新增 `GET /api/usage-meter/pricing` 直读生效价，前端用它
覆盖投影（打开胶囊时、每次改价成功后各读一次）。

## 六、设置页重构 + 胶囊改价抽屉加导出

- 设置页拆成「全局配置」「模型定价」两张卡；原来平铺的 API Key / 汇率 / 官方价格收进
  第一张卡；模型卡头部显示供应商数与模型数。
- 胶囊里的改价抽屉新增**「导出当前定价」**：把当前模型的单价 + 峰谷时段导出成计费配置
  文件，落到 `$DSH_HOME/usage-meter-desktop/exports/`。
- 「已取用」标记改成按 **目标模型 + 来源行** 记：在 A 模型用了某条来源定价，打开 B 模型
  不会再误显示「已取用」。

---

## 安装（桌面版）

1. 下载本 release 附带的 `dsh-usage-meter-desktop-3.0.0.tgz`，放进
   `$DSH_HOME/profiles/desktop/`（Windows 一般是 `C:\Users\<你>\.dsh\profiles\desktop\`）。
2. 在该目录的 `package.json` 里把依赖写成：
   ```json
   "dsh-usage-meter-desktop": "file:./dsh-usage-meter-desktop-3.0.0.tgz"
   ```
3. 在 `dsh.profile.bundles` 里登记 `dsh-usage-meter-desktop`，然后 `pnpm install`，重启 DSH。

验证：胶囊（用量胶囊）出现在输入框下方即为成功；没出现就看日志里有没有
`1 entry did not activate`。

数据目录 `$DSH_HOME/usage-meter-desktop/` 在升级时不会被清空，账本和定价都保留。

## 网页版（2.0.x）

仓库根目录仍是网页版构建（`@faith1688/dsh-usage-meter-harness` 2.0.39），安装方式不变，
详见根 README。本 release 的 tag 打在含 `desktop/` 子目录的提交上，网页版源码没有改动。
