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
3. `npm pack` —— 生成 `faith1688-dsh-usage-meter-harness-<v>.tgz`。
4. **本机（faith）验证**：覆盖 profile 的 lib 与 package.json
   （`C:\Users\faith\.dsh\profiles\web\node_modules\@faith1688\dsh-usage-meter-harness`），
   浏览器强刷 Ctrl+Shift+R 确认界面。
5. `git add` + `git commit` + `git tag v<版本>` + `git push origin main --tags`。
6. **发布 npm（必须显式 npmjs 源，本机默认 npmmirror 镜像不能发布）**：
   ```
   npm publish --access public --registry https://registry.npmjs.org/ --otp=<验证码>
   ```
7. `npm view @faith1688/dsh-usage-meter-harness version` 确认线上版本。

### 发布前自检清单

- [ ] `npm run bundle` 零报错
- [ ] 包内 `cordis.patch.yml` **恰好一条** insert（不空、不重复）
- [ ] 版本号已 bump，`npm pack` 能出包
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

1. 先查 profile 根是否有残留：
   `Get-Content "$env:USERPROFILE\.dsh\profiles\web\cordis.patch.yml"`，
   若含 `usage-meter` → 跑 `scripts/fix-duplicate.ps1` 删除（一次性）。
2. **显式带版本号更新**（`@latest` 可能被 pnpm 元数据缓存坑成"Already up to date"）：
   ```
   dsh plugin --profile web add @faith1688/dsh-usage-meter-harness@<新版本>
   ```
3. 重启 `dsh web`。**重启本身不会拉新版本**，必须先装进 node_modules。

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

---

## 5. 约定

- `src/index.ts`（宿主计费）与 `src/projection.ts`（费用计算）是**计费核心**，
  只允许改计费逻辑时碰；UI 改动一律在 `src/client.tsx`，不要顺手改宿主。
- 客户端 UI 的样式常量（设计 token：`LABEL_W=96`、`CTL_H=30`、`ctl()`、
  `btnPrimary/btnGhost/btnSmall`、`formLabel/sectTitle/hint`）集中在
  `UsageMeterSettingsSection` 函数体内，新 UI 统一复用，禁止散落内联魔法值。
- 测试套件已被用户要求删除，改 `src/` 后只能靠 `npm run bundle` 校验；
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
