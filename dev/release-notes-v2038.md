## v2.0.38 — 跨 DSH 版本兼容加固：任何版本、任何组合下都能挂上；缺件会说清楚，不再谎报

> **这一版从根上治「别人一装就不一样」。**
> npm 上当前的 `latest` 仍是 **2.0.36**（速度会停住的那版）。本版一次带上两件事：
> ① v2.0.37 的「该是 0 就是 0」速度修复；② 本版的跨版本兼容加固。**直接升级到 2.0.38 即可。**

### 修了三个真问题（每个都在真机上复现过）

**1. 插件会在某些 DSH 版本/组合里「静默消失」**

cordis 没有「可选依赖」这回事：插件上工前点名的服务（`inject`），只要某个环境不提供，插件的启动函数**永远不会执行**——表现是**界面上什么都没有，而且不报错**，你根本不知道发生了什么。

本插件原来点名要 `webServer`、`llm`（服务端）和 `locale`（客户端）。命令行模式（headless）没有 `webServer`；缺 `locale` 的组合也一样 → 插件直接不工作。

**改法**：只保留「缺了就真的干不了」的两项；`webServer` / `llm` / `locale` 全部改成**先探测再用**——有就用，没有就跳过，并**打一条明确的降级说明**（例如「本组合没有网页服务 → 网页设置页打不开，但计时、账目、胶囊照常」）。

**2. 客户端清单里写着两个「已经下架」的包名**

`@deepseek-ai/dsh-client-runtime`（npm 上止于 0.1.1-rc.2）、`@deepseek-ai/dsh-client-ui-slots`（0.1.2 起已不在浏览器的模块清单里）。新版 DSH 里这两个包不存在，插件却仍在点名。

**改法**：清单只保留三个版本都在的 `@deepseek-ai/dsh-client-ui-conversation` + `@deepseek-ai/dsh-client-locale`。

**3. 日志会「谎报成功」**

原来不管注册有没有真的成功，都会打印一行 `config route registered`。在没有 `webServer` 的环境里实测：同一次启动**同时**出现「webServer 缺失」和「已注册」两条——这正是「机制没接线却报成功」。

**改法**：只有真的注册成功才打印。

### 稳定性：界面不会再被带崩

宿主没有提供 `useProjection`（投影数据接口）时，读取会抛错并**带崩输入框下沿的整条显示带**。现在缺失时显示空数字，不崩。

### 跨版本实测矩阵（0.1.0-rc.8 / 0.1.2-rc.1 / 0.1.5-rc.1 逐版实测，不是推测）

| 契约 | 0.1.0 | 0.1.2 | 0.1.5 |
| --- | --- | --- | --- |
| 服务名 `settings` / `llm` / `sessionProjections` / `webServer` | ✅ 同名 | ✅ 同名 | ✅ 同名 |
| 事件 `session/event` | ✅ | ✅ | ✅ |
| 席位 `conversation.composer.dock` / `settings.section` | ✅ | ✅ | ✅ |
| 客户端清单 `dsh.client.platform === 'web'`、`dsh.bundle.patch` | ✅ | ✅ | ✅ |
| `@deepseek-ai/dsh-client-runtime` | ✅ 在清单里 | ❌ 已下架 | ❌ 已下架 |
| `@deepseek-ai/dsh-client-ui-slots` | ❌ 不在清单里 | ❌ 不在清单里 | ❌ 不在清单里 |

### 发布前实跑验证

- `tsc --noEmit` 与 `npm run bundle` 零报错。
- 旧版 **0.1.2 + web**：`/api/usage-meter/{active,templates,config,stats,models}` **5 个端点全 200**，日志为「HTTP routes registered」。
- 旧版 **0.1.2 + headless（无 webServer）**：只出现**降级说明**，**不再出现** registered —— 降级路径真的降级，而不是静默死掉。
- 首页启动清单里本插件的依赖声明已不含那两个下架包名。
- 装进 profile 的产物与仓库构建逐字节一致（sha256 核对，排除缓存导致的假验证）。

### 注意事项

1. 装完/更新完插件必须**重启 `dsh web`**（宿主进程只认启动时加载的代码）。
2. 发布后 **24 小时内**，从 DSH 插件市场点「更新」可能被 pnpm 的冷静期拦下并自动回滚——等 24h 再点一次，或把包名加入 `minimumReleaseAgeExclude`，或用 `npx -y @faith1688/dsh-usage-meter-harness@latest`。这是市场的自我保护，不是发布失败。

---

## v2.0.38 — English

**Cross-version hardening: the plugin now mounts on any DSH version or composition, reports missing capabilities out loud, and never claims a registration it did not make.**

> npm `latest` is still **2.0.36** (the version whose token rate freezes). This release carries both the v2.0.37 "zero means zero" rate fix and the compatibility hardening below — upgrade straight to **2.0.38**.

### Three real defects, each reproduced on a real host

1. **The plugin could silently vanish on some versions/compositions.** cordis has no optional inject: if a service named in `inject` is never provided, the plugin's start function **never runs** — nothing on screen, no error. This plugin required `webServer`, `llm` (host side) and `locale` (client side). Headless compositions have no `webServer`, so the plugin simply did not work. **Fix**: keep only the services without which the meter is meaningless; `webServer` / `llm` / `locale` are now probed (`ctx.get`) and degrade with an explicit one-line notice.
2. **The client manifest named two packages that no longer exist**: `@deepseek-ai/dsh-client-runtime` (last published 0.1.1-rc.2) and `@deepseek-ai/dsh-client-ui-slots` (gone from the browser module roster since 0.1.2). **Fix**: the manifest now lists only the two that exist in all three versions.
3. **The log lied.** `config route registered` was printed unconditionally — in a composition without `webServer`, a single startup printed both "webServer absent" and "registered". **Fix**: it is printed only when registration actually happened.

**Stability**: when the host provides no `useProjection`, reading it threw and took down the whole dock band. It now renders empty numbers instead of crashing.

**Verification (run before release)**: tsc/bundle clean; DSH 0.1.2 + web → all five `/api/usage-meter/*` endpoints return 200; DSH 0.1.2 + headless (no webServer) → only the degraded-mode notice, no false "registered"; the boot manifest no longer lists the two retired client packages; the artifact installed into a profile was byte-identical to the repo build (sha256).

**Notes**: restart `dsh web` after installing/updating. Within 24h of release the marketplace update may be blocked by the pnpm release-age cooldown — retry after 24h, allowlist the package name, or use `npx -y @faith1688/dsh-usage-meter-harness@latest`.
