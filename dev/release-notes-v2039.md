## v2.0.39 — 紧急修复：v2.0.38 会让插件在启动时崩溃（Failed to load plugins）

> **v2.0.38 是坏的，请勿使用，直接装 2.0.39。** 2.0.38 已在 npm 上被标记为弃用（deprecated）。

### 现象（真机实测）

另一台电脑装完 2.0.38、重启 `dsh` 后，界面直接报：

```
HARNESS
Failed to load plugins
@faith1688/dsh-usage-meter-harness
failed to apply loader entry 68ef7fc2 (@faith1688/dsh-usage-meter-harness):
cannot get property "locale" without inject
```

### 根因：类型转换不是探测

v2.0.38 为了让插件在任何组合下都能挂上，把客户端的 `locale` 从 `inject` 里删掉了（cordis 没有"可选依赖"：声明了却没人提供，`apply` 就永远不执行）。但代码里**仍然直接读** `ctx.locale`，只是外面套了一层 TypeScript 的类型转换：

```ts
const svc = (ctx as unknown as { locale?: … }).locale;   // ← 编译期没事，运行时会抛
```

`ctx` 在运行时是**代理**：读一个「已提供但没 inject」的服务名，它会直接抛错。类型转换只能骗过编译器，骗不过宿主。于是插件加载失败——**比它想修的问题更糟**。

**修法**：所有可选服务一律走真正的探测（与服务端 `webServer`/`llm` 同一套）：

```ts
function readOptionalService(ctx, name) {
  // 优先用反射助手 ctx.get(name)；没有它时退化到带 try/catch 的属性读
}
```

### 新增两道回归防线（这次的教训是"验证没覆盖到就一定会漏"）

1. **`scripts/test-inject-contract.mjs`** —— 用 TypeScript AST 解析 `lib/*.js`：凡是 `ctx.<已知服务名>` 的属性访问，必须在同文件的 `inject` 里；否则 FAIL。**已用它跑过坏的 2.0.38 产物，确认能报出 `ctx.locale`**（先证明检查有效，再看它变绿）。
2. **`scripts/test-client-apply.mjs`** —— 用一个**复刻 cordis 行为**的代理 ctx，真的跑一遍 `client.tsx` 的 `apply`：读未 inject 的服务会抛错，`ctx.get()` 不抛。内含**元测试**先证明这个替身真的会抛，再断言真实 `apply` 跑通、两个席位都注册、`locale` 只走探测路径。

### 验证（发布前实跑）

- `tsc --noEmit`、`npm run bundle` 零报错。
- `scripts/test-inject-contract.mjs` → ALL PASSED（对坏产物先 FAIL 过，证明有效）。
- `scripts/test-client-apply.mjs` → ALL PASSED（含两条元测试）。
- 既有回归：`test-live-rate` / `test-usage-accounting` / `test-shared-balance-lock` / `sim-live-balance` 全 PASS。
- 旧版 DSH 0.1.2 真机：web 组合 5 个端点全 200；headless 组合只出现降级说明、不谎报。

### 注意事项

1. 装完/更新完必须**重启 `dsh web`**。
2. 发布后 24 小时内，从插件市场更新可能被 pnpm 冷静期拦下并自动回滚——等 24h，或把包名加入 `minimumReleaseAgeExclude`，或用 `npx -y @faith1688/dsh-usage-meter-harness@latest`。

---

## v2.0.39 — English

**Hotfix: v2.0.38 broke plugin startup (`Failed to load plugins`). Do not use 2.0.38 — install 2.0.39.** 2.0.38 is marked deprecated on npm.

**Symptom**: after installing 2.0.38 and restarting `dsh`, the harness failed with `failed to apply loader entry … cannot get property "locale" without inject`.

**Cause**: v2.0.38 removed `locale` from the client `inject` list (cordis has no optional inject: a declared service nobody provides parks `apply` forever) but kept reading `ctx.locale` directly, hidden behind a TypeScript cast. At runtime `ctx` is a proxy that throws when you read a provided-but-not-injected service; a cast fools the compiler, not the host. The plugin failed to load — worse than the problem it set out to fix.

**Fix**: every optional service now goes through a real probe (same helper shape the host side uses for `webServer`/`llm`): prefer the `ctx.get(name)` reflection helper, fall back to a guarded property read.

**Two new regression guards** (the lesson: a gap in verification will be found in production):
1. `scripts/test-inject-contract.mjs` — AST-based check over `lib/*.js`: any `ctx.<known service>` property read must be present in that file's `inject` array. Verified to FAIL against the broken 2.0.38 artifact before going green on the fix.
2. `scripts/test-client-apply.mjs` — runs the real `client.tsx` `apply` against a proxy ctx that reproduces cordis semantics (reading a non-injected service throws; `ctx.get()` does not), with meta-tests proving the double actually throws.

**Verification**: tsc/bundle clean; both new checks pass (contract check demonstrably fails on the broken build); existing regressions (`test-live-rate`, `test-usage-accounting`, `test-shared-balance-lock`, `sim-live-balance`) all pass; DSH 0.1.2 real host: web composition returns 200 on all five endpoints, headless degrades with an explicit notice and no false "registered".

**Notes**: restart `dsh web` after installing. Within 24h of release the marketplace update may be blocked by the pnpm release-age cooldown.
