# dsh-usage-meter-harness 开发与发布手册（内部文档，不随 npm 包发布）

> 本文件只存在于 GitHub 仓库，**不会**进入 npm 包（`package.json` 的 `files` 只含
> `lib` / `cordis.patch.yml` / `assets` / `scripts`）。写在这里的踩坑与流程规范，
> 是给维护者（faith1688）自己看的操作手册。

---

## 1. 挂载机制（最重要，改错 = 插件不挂载或启动崩溃）

- DSH 挂载插件靠**插件包内自带**的 `cordis.patch.yml`（`package.json` 里
  `dsh.bundle.patch` 指向它）。DSH 启动时把每个 bundle 的 patch 合并进组合，
  包内的 `insert` 就是挂载记录。
- **包内 `cordis.patch.yml` 必须恰好保留一条 `insert`**：
  - 清空它（1.0.7 干过）→ 插件**不挂载**，接口 404、设置页无入口、无任何报错。
  - 加第二条 → 自身就 duplicate，启动崩溃。
- **绝不往 profile 根目录的 `cordis.patch.yml` 写 insert**。那会与包内那一条
  重复 → `duplicate loader entry id: usage-meter`，`dsh web` 直接抛错起不来。
- 挂载成功判据：`dsh web` 启动日志出现
  `[usage-meter] config route registered`；或浏览器访问
  `/api/usage-meter/config` 返回 200。

### 为什么老用户会撞 duplicate（历史包袱）

- 1.0.7 ~ 1.0.9 时代包内 patch 被清空过，挂载只能靠**手动往 profile 根
  `cordis.patch.yml` 写 insert**。老用户（那个时期装的）profile 根里就留着一条。
- 升级到 1.0.10+（包内恢复 insert）后：包内一条 + profile 根一条 = 重复。
- **修复是一次性的**：用 `scripts/fix-duplicate.ps1` 删掉 profile 根那条即可，
  之后所有后续版本更新都不会再重复（profile 根已干净）。

---

## 2. 发布流程（每次改 `src/` 后走一遍）

1. `npm run bundle` —— tsc + esbuild，**必须零报错**。
2. `package.json` 里 bump 版本号（semver，+1 patch/minor）。
3. **同步更新本手册 `DEVELOPMENT.md` 第 3 节**：把"老用户升级"示例命令里的
   版本号改成这次发布的新版本（如 `...@1.0.32`），并更新踩坑表相关行——确保
   维护者下次照抄的是正确版本。
4. `npm pack` —— 生成 `faith1688-dsh-usage-meter-harness-<v>.tgz`。
5. **本机（faith）验证**：覆盖 profile 的 lib 与 package.json
   （`C:\Users\faith\.dsh\profiles\web\node_modules\@faith1688\dsh-usage-meter-harness`），
   浏览器强刷 Ctrl+Shift+R 确认界面。
6. `git add` + `git commit` + `git tag v<版本>` + `git push origin main --tags`。
7. **发布 npm（必须显式 npmjs 源，本机默认 npmmirror 镜像不能发布）**：
   ```
   npm publish --access public --registry https://registry.npmjs.org/ --otp=<验证码>
   ```
8. `npm view @faith1688/dsh-usage-meter-harness version` 确认线上版本。

### 发布前自检清单

- [ ] `npm run bundle` 零报错
- [ ] 包内 `cordis.patch.yml` **恰好一条** insert（不空、不重复）
- [ ] 版本号已 bump，`npm pack` 能出包
- [ ] `DEVELOPMENT.md` 第 3 节升级示例命令已改成**本次发布的确切版本号**（不是旧号、不是 `@latest`）
- [ ] **版本号同步**：`package.json` 的 `version` 与 `DEVELOPMENT.md` 第 3 节示例里的 `@<版本>` 一致（改过模型/脚本/共享逻辑后必查）
- [ ] 共享余额运行锁回归：`node scripts/test-shared-balance-lock.mjs` 全 PASS（6+ 场景：A 运行改 B 拒 / A 运行改 A 拒 / 停止后放行 / 全模型运行拒 / 多组并行各自锁 / 跨供应商不串扰）
- [ ] 核心 sim 回归：`node scripts/sim-live-balance.mjs` 全 PASS（DeepSeek 实时余额锚定/估计不被共享锁破坏）
- [ ] 本机强刷后 UI 与功能符合预期（含峰谷模板、共享余额、速度三档渐变）
- [ ] `files` 仍是 `lib/cordis.patch.yml/assets/scripts`（本开发文档不进包）

---

## 3. 用户安装与更新指引（README 已对外，这里是内部口径）

### 新用户（从没装过）

```
dsh plugin --profile web add @faith1688/dsh-usage-meter-harness@latest
```
或 `npx -y @faith1688/dsh-usage-meter-harness@latest`。包内 insert 即挂载，无残留。

### 老用户升级（已有旧版）

> **铁律：升级/更新包必须用【带具体版本号】的命令**，例如
> `@1.0.31`、`@1.0.32`、`@1.0.33`。**不要用 `@latest`**——pnpm 元数据缓存常把它判定为
> "Already up to date"，导致更新静默失效、UI 依旧旧版（见第 4 节踩坑表）。
> 本手册第 3 节的版本示例在每次发新包后同步更新为最新号。

1. 先查 profile 根是否有残留：
   `Get-Content "$env:USERPROFILE\.dsh\profiles\web\cordis.patch.yml"`，
   若含 `usage-meter` → 跑 `scripts/fix-duplicate.ps1` 删除（一次性）。
2. **显式带版本号更新**（命令里 `@<版本>` 一律填**本次发布的确切版本号**）：
   ```
   dsh plugin --profile web add @faith1688/dsh-usage-meter-harness@2.0.16
   ```
   （历史示例：升到 1.0.31 用 `...@1.0.31`；升到 1.0.32 用 `...@1.0.32`；升到
   1.0.33 用 `...@1.0.33`；升到 2.0.13 用 `...@2.0.13`；升到 2.0.14 用 `...@2.0.14`；升到 2.0.15 用 `...@2.0.15`；升到 2.0.16 用 `...@2.0.16`。
   发布下一个版本时，把这里改成那次的新号，别留着旧号误导后续升级。）
3. 重启 `dsh web`。**重启本身不会拉新版本**，必须先装进 node_modules。

> **若 `add @2.0.16` 也被判 Already up to date**（说明 profile 里有 `file:` 或
> `^` 之外的固定绑定）：改用一键安装器 `npx -y @faith1688/dsh-usage-meter-harness@latest`，
> 它会强制把绑定改写为 `^<最新>` 并升级（v1.0.32 起支持，实测 `file:`→`^` 一键完成）。

---

## 4. 踩坑清单（全部实测过的真实事故）

| 现象 | 根因 | 修复 |
| --- | --- | --- |
| `duplicate loader entry id: usage-meter` | profile 根 cordis.patch.yml 残留旧 insert + 包内一条 | `scripts/fix-duplicate.ps1` 删 profile 根那条 |
| `[ENOENT] ...\profiles\web\faith1688-dsh-usage-meter-harness-0.2.1.tgz` | profile 依赖滞留 `file:Z:/...` 引用，pnpm 在 Windows 把 `file:Z:/` 解析成相对路径 | spec 改 `file:///Z:/...` 或 registry 版本，`pnpm install` |
| `add @latest` 显示 Already up to date，UI 没更新 | pnpm 元数据缓存停留在旧版 | 用**精确版本号** `add <pkg>@x.y.z` |
| 更新后 UI 还是旧的 | 只重启了 dsh web，没装新版；或浏览器缓存 | 先 `add <pkg>@版本` 再重启，浏览器 Ctrl+Shift+R |
| 渐变字变成"颜色块"（无文字） | `background-clip:text` 带 `0%/100%` 位置参数时失效；动态改背景色时浏览器不重新裁剪会卡死 | 渐变**不带位置参数**；档位切换用 React `key` 强制重建 span（v1.0.28） |
| 插件装了但接口 404、无日志 | 包内 cordis.patch.yml insert 被清空（1.0.7 事故） | 恢复恰好一条 insert |
| 会话打不开：`history unavailable ... too_small turns[N].inputTokens`（v1.0.29 及之前） | usageCost 投影的 delta = 新采样 − 上次采样，LLM 重试/供应商口径变小 → 负数被累进 turn 桶并随投影持久化；wire schema `nonnegative` 解析即抛，整份历史拒载（会话日志本身无负值） | **写入侧**防负（delta 为负时按覆盖处理或钳 0）；**读取侧** view()/emptyUsageCost() 全字段 `Math.max(0,·)` 钳制兜底（v1.0.30）。排查用 `Z:\deepseek\scripts\decode-session.mjs` 多帧解 zstd 核日志 |
| 共享余额下改模型 B 余额，连带改了正在运行的模型 A | 共享余额把组内所有模型写入同一个 `p:<provider>` 钱包；后端 config POST 只按 `balanceKeyOf(pv, model)` 写，不校验该组是否正在运行；前端只锁「当前模型」不锁同组其它模型 | 后端守卫 `sharedGroupLocked`（v1.0.33）：同组任一模型运行时拒改余额/充值并返回 `409 shared-balance-running/shard-balance-running` 及原因；前端 `sharedBalanceLocked` 锁定同组所有模型的余额输入框并提示。回归测 `scripts/test-shared-balance-lock.mjs` |
| 视觉模型 DeepSeek V4 Flash Vision Exp 识别不了 | 模型已适配（`prices-providers.ts` + `client.tsx` OFFICIAL 表），但用户相册仍跑旧版（`file:`/固定绑定未升级，`@latest` 被 pnpm 跳过） | 用**确切版本号** `add ...@1.0.33`，或 `npx -y @faith1688/dsh-usage-meter-harness@latest`；已加 vision-exp 峰谷定价与 UI 预填 |
| 用 modlens 包装模型时「余额 未配置」/ 统计与定价不聚合 | **包装发生在 provider id 上，不是模型名**：modlens 会再注册 `modlens-<provider>`、`<provider>-modlens`、`vision-toolkit-<provider>`（模型 id 不变，只有显示名多 ` (modlens vision)`）。旧版 `underlyingProvider` 只剥 `vision-toolkit-`，于是 `modlens-deepseek-zgktz` ≠ `deepseek-zgktz` → 定价/余额来源/独立 Key/看板统计全部落空 | v2.0.13：标记表 `src/wrapper.ts`（默认 `modlens-` / `-modlens` / `vision-toolkit-` / `(modlens vision)` / ` (vision)` / `-vision`，**逐行可开关**）同时剥 provider 与 model 两侧；`underlyingProvider` 全量归一；已持久化的包装键在启动时回填到底层键；设置页「视觉识别」改逐行 +/- 编辑。回归测 `scripts/test-wrapper.mjs`（逻辑）+ `scripts/test-wrapper-route.mjs`（真实 apply 端到端）+ `scripts/probe-wrapper-route.mjs`（真机数据） |
| 改完 `src/` 跑 `sim-live-balance.mjs` 有 7 个 baidu FAIL | 手动余额绑定键改为「按模型建账」后（`manualLedgerKeyOf` → `m:<provider>/<model>`），旧脚本仍 seed/断言 `p:baidu` | 脚本已同步为 `m:baidu/ernie-4.5`（v2.0.13 全绿） |
| 回合快结束时切换模型，整轮费用全记到切换后的模型名下 | fold 的 `request/header` 处理器会把「模型变了」同步改写**尚未关闭的 turn 桶**的 model/provider（v2.0.13 及之前），于是旧模型干完的活全被算到新模型头上 | v2.0.14：turn 归因固定为「实际发起本回合第一个请求的模型」——header 只在 turn 桶**尚无模型**时回填（首回合 turn/start 时尚无模型的场景），一旦回填永不改写；逐条 usage 计费仍用 `state.provider/model`，实测每个 step 恰好一个 `request/header` 且 usage 总在下一个 step 的 header 之前到达，故 usage 时刻的 state 就是产生该 usage 的请求模型，逐请求计费天然正确。弹窗/胶囊标题显示的「当前模型」保持跟随最新 header 不变（用户确认这是正确行为）。排查工具 `scripts/probe-header-events.mjs`（多帧解 zstd 核真机日志） |
| 高速档胶囊渐变后半段太深太丑 | v2.0.12 用 `darkenHex(x, 0.7)` 压暗档2/档1 段，压暗方向错了——用户要的是变浅变淡 | v2.0.14：`globals.ts` 新增 `lightenHex(color, factor)`（向白调亮：`c' = c + (255 - c) * factor`），档3 前段保持所选色原样，档2/档1 段 `lightenHex(x, 0.4)` 变浅；渐变端点仍不写位置参数（见上行踩坑） |
| 模型卡「重置价格」旁出现「保存中…」文字（用户要求去掉） | `importFromDir` 导入期间把 `saveStates[k]` 置为 `savingUnit`，状态槽无条件渲染 `st.msg` | v2.0.14：状态槽渲染时过滤 `st.msg === tt('savingUnit')`——只保留结果性消息（已保存/保存失败/已重置…/使用中锁定…），进行中提示不再显示；底部全局「保存」按钮自身的 `saving ? '保存中…' : '保存'` 标签不受影响 |
| 想把用户已调好的速度三档颜色固化为插件内置默认色 | 用户调好的颜色只存在浏览器 localStorage（`um-global-colors`），宿主侧读不到；`DEFAULT_GLOBAL_COLORS` 硬编码在 `src/globals.ts` | 让用户截「插件配色」选项卡，`scripts/_extract-swatch-colors.mjs`（pngjs 逐像素聚类；纯色块 avg==center 即精确值）提取 hex 后写进 `DEFAULT_GLOBAL_COLORS`。v2.0.15 默认速度色 = 琥珀 `#e5ad1f` / 绿 `#0ac749` / 紫 `#6d3be3`（用户调色板固化）。注意只改**新环境/重置**的落点：已保存过颜色的浏览器仍用 localStorage 值，点「重置全局色」才切到新默认 |
| 回合跨币种时金额显示币种被末次 usage 覆盖；重启后逐轮分项费用丢失；`deepseek-*` 自定义供应商共享钱包建不出 | ① `addToLastTurn` 无条件用最后一个 usage 的 `currency` 覆盖（多币种 cost 之和按错币种换算）；② 持久化 schema `foldTurnSchema` 漏声明 4 个分项费用字段，zod object 剥离未声明字段 → 重启恢复静默归零；③ `ledgerOf` 用 `key.startsWith('p:deepseek')` 排除官方渠道，误伤 `deepseek-zgktz` 等自定义供应商 | v2.0.16：① 保留回合首个计费用法的币种（与「回合归因 = 首请求模型」语义一致）；② `foldTurnSchema` 补 `inputCost/cacheReadCost/cacheWriteCost/outputCost`（`.catch(0)`）；③ 改精确排除 `p:deepseek-official`（`isDeepSeekProvider` 同款语义）。同批：峰谷弹窗标注与计费共用 `peakActiveBJ` 判定（跨零点环绕窗口不再显示/计费不一致）；新账本以 `initialBalance` 为种子（兑现旧注释）；删 key/换 key/切来源 3 处 `delete modelBalances` 同步清 `pendingModelSpent`（防旧 key 缓冲费用误冲抵新 key、防泄漏）；`refreshIntervalMs` 使用处 `Math.max(1000, ·)`（schema 不动，避免拒载旧配置） |
| 小额显示成 `¥ 0.0000`；速度档位边界与文档 0–50/51–100/101+ 不符；零费用轮次显示孤立 `-` | ① `fmtMoney` 4 位小数把非零小额舍成 0.0000；② `r >= 50 / r >= 100` 把恰好 50.0/100.0 归入高一档；③ 逐轮金额前缀 `-` 硬编码 | v2.0.16：① 舍成 0 时补 6 位小数；② 改严格 `>`；③ cost 为 0 不显示符号；另 `fmtDate` 对 0 值兜底 `--年--月--日`（不再显示 1970年1月1日） |

---

## 5. 约定

- `src/index.ts`（宿主计费）与 `src/projection.ts`（费用计算）是**计费核心**，
  只允许改计费逻辑时碰；UI 改动一律在 `src/client.tsx`，不要顺手改宿主。
- 客户端 UI 的样式常量（设计 token：`LABEL_W=96`、`CTL_H=30`、`ctl()`、
  `btnPrimary/btnGhost/btnSmall`、`formLabel/sectTitle/hint`）集中在
  `UsageMeterSettingsSection` 函数体内，新 UI 统一复用，禁止散落内联魔法值。
- 测试套件已被用户要求删除，改 `src/` 后靠 `npm run bundle` + **回归脚本**校验：
  `scripts/sim-live-balance.mjs`（DeepSeek 实时余额锚定/估计）、
  `scripts/test-shared-balance-lock.mjs`（共享余额运行锁 6+ 场景）、
  `scripts/test-wrapper.mjs` + `scripts/test-wrapper-route.mjs`（视觉包装归一）；
  发布前务必在本机（faith）profile 实际覆盖 + 强刷验证。
- 临时开发脚本（`_*.mjs`）用完即删，不要提交进仓库（历史上有 14 个被误提交过）。
- **截图声明**（awesome-dsh-plugin 新规，2026-08-26）：仓库根的 `screenshots.json`
  是市场截图的唯一声明处，格式为**相对路径数组**（相对本文件，指向仓库内图片）：
  ```json
  ["assets/screenshot.png", "assets/popup.png"]
  ```
  换/加截图 = 把图放进 `assets/` + 编辑这个 json + push。**不要再去改
  awesome-dsh-plugin 列表仓库的 `data/screenshots.json`**（108 个 PR 抢的共用
  文件，必然撞冲突；旧条目仍会被读取，但新投稿一律走自家仓库声明）。
  该文件已加入 `package.json` 的 `files`，随 npm 包一起发布。
