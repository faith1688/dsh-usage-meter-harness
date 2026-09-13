## v2.0.36 — 实时速度修复 + 失败提示可诊断

### 修复 1：「token 速度」恒显示 `0.0 tokens/s`（远程端 / 部分环境实测）

根因是**两处缺陷叠加**，不是速度算法算错：

- 速度原本有**两个采样源**：① 浏览器直播流 partial（逐字估算 token）、② 宿主投影 `realtimeOutputTokens` / `realtimeUpdatedAt`（宿主在每个流式文本片段上累加）。早期版本用的是 ②，某次改动**把 ② 删掉只留 ①**（当时那条注释称"运行时不 mid-turn 更新该投影"，与现实现不符）。
- 停滞守卫的判据是 `Date.now() - newestAt > 窗口 + 1.5s`。当采样数组**为空**时 `newestAt = 0`，该式**恒为真** → 每 500ms 清零并 `return`，紧随其后的「上一回合平均速度」兜底**永远执行不到**。

合起来：凡是读不到 ① 的环境（不同 DSH 运行时 / 远程端 / `useChat` 未注入），速度就恒为 `0.0`；而能读到 ① 的机器看不出问题。

**修法**：恢复 ② 为**第二采样源**（优先 ①，其次 ②；两源各自独立成窗 —— 字符估算与真实 token 量纲不同，混进同一窗口会算出假尖峰；样本时刻统一取**浏览器到达时刻**，避免远程端与宿主时钟不同源）；守卫补成 `live === null && newestAt > 0 && …`，**没有样本时绝不清零**，让回合平均兜底可达。

### 修复 2：「一键同步官方价格」失败只剩一句「同步失败」，看不出原因

- 失败提示现在**固定带上**「如果刚刚安装或更新过本插件，请先重启 `dsh web` 再试」，并附上**真实原因**（HTTP 状态码 / 服务端错误原文 / 异常文本）。
- 背景：插件装完或更新完但宿主进程尚未重启时，浏览器已经是新 UI（按钮在），老进程里却没有新接口 → 请求拿不到 JSON，而旧代码把原因整个丢掉了。

### 已知问题 / 注意事项（本次未改，或属环境行为，请务必先读）

1. **装完 / 更新完插件必须重启 `dsh web`** 才真正生效（客户端 bundle 与宿主进程分别加载）。现在这处失败提示会直接告诉你先重启。
2. **发布后 24 小时内，从插件市场点「更新」可能被拦下并自动回滚**（pnpm 11 的新版本冷静期 `minimumReleaseAge`：新发布的版本会被静默降级到上一个"够老"的版本，市场回读版本后发现不符即回滚）。三种解法：等 24 小时再点；或在 profile 的 `pnpm-workspace.yaml` 里给 `minimumReleaseAgeExclude` 加上**不带版本号**的 `@faith1688/dsh-usage-meter-harness`；或直接 `npx -y @faith1688/dsh-usage-meter-harness@latest` 后重启 `dsh web`。
3. **速度兜底的语义**：当 ① 与 ② 都拿不到（宿主投影的实时字段不推进）时，速度会退化为**上一回合的平均速度**，而不是 `0.0`；刚开新会话、连一个已结束回合都没有时仍显示 `0.0` —— 此时确实无数据可算。
4. 本次**只改客户端**（`lib/client.js`、`lib/i18n.js`），宿主侧零改动：因此不重启宿主、只刷新浏览器也能看到这两处变化。
5. 英文界面同样生效（新增两条中英对照文案）。

### 验证（本次发布前实跑）

- `npx tsc --noEmit` 零报错；`npm run bundle` 零报错。
- `node scripts/test-usage-accounting.mjs` **全 PASS**（1–8 段原有 + 新增第 9 段：驱动真实 `lib/index.js`，断言每个 `text-delta` / `reasoning-delta` 都推进投影的实时 token 与时间戳 —— 这正是第二采样源的数据来源）。
- 构建产物核查：`lib/client.js` 内 `srvSamplesRef`、`realtimeOutputTokens`、`realtimeUpdatedAt`、`newestAt > 0`、双源选择表达式 `tokenRateOf(c, now) ?? tokenRateOf(s, now)` 均在；新增文案中英逐字一致（`dev/i18n-audit.mjs` 无新增未翻译项）。
- 发布包：49 个文件，`lib/index.js` / `lib/client.js` / `cordis.patch.yml` / `package.json` / `screenshots.json` 齐全；内部开发手册 `DEVELOPMENT.md` 确认**不在包内**。
- 产物指纹：SHA256 `8937A3E978F3F840E4E526904B39C246D96CE57F95F054B6CD63B0A64A776CDE`，size `623272` bytes。

---

## v2.0.36 — English

### Fix 1: token rate stuck at `0.0 tokens/s` (reproduced on a remote host)

Two defects stacked — the rate maths was never wrong:

- The rate had **two sampling sources**: (1) the browser live-stream partial, (2) the host projection `realtimeOutputTokens` / `realtimeUpdatedAt`, accumulated by the host on every streamed text delta. An earlier change **deleted source 2** (its comment claimed the runner does not update that projection mid-turn — no longer true).
- The stall guard read `Date.now() - newestAt > window + 1.5s`. With an **empty** sample array `newestAt = 0`, so the test was **always true** → every 500ms it cleared the rate and returned, making the "last completed turn average" fallback **unreachable**.

Result: any environment that cannot read source 1 (different DSH runtime, remote host, `useChat` not injected) showed a permanent `0.0`, while machines that can read it looked fine.

**Fix**: source 2 is restored as a **second sampler** (source 1 preferred; the two buffers stay separate — character estimates vs. real tokens would produce false spikes if mixed in one window; samples are stamped with the **browser arrival time** so a remote host's clock skew cannot distort them). The guard became `live === null && newestAt > 0 && …` — **no samples must never clear the rate**, otherwise the fallback is unreachable.

### Fix 2: "Sync official prices" failure only said "Sync failed"

- A failed sync now always says **"if you just installed or updated this plugin, restart `dsh web` first and try again"** and appends the **real reason** (HTTP status, the server's error text, or the exception).
- Background: after installing/updating the plugin but before restarting, the browser already runs the new UI (the button exists) while the old host process lacks the new endpoint — the request returns non-JSON and the old code discarded the reason entirely.

### Known issues / caveats (read before updating)

1. **Restart `dsh web` after installing or updating the plugin** — client bundle and host process load separately. The sync failure message now says so.
2. **Within 24 hours of a release, the plugin marketplace's update may be blocked and rolled back** (pnpm 11 `minimumReleaseAge` cooldown: a fresh version is silently downgraded to the previous one, the marketplace sees a version mismatch and rolls back). Workarounds: wait 24h; or add the package name (no version) to `minimumReleaseAgeExclude` in your profile's `pnpm-workspace.yaml`; or run `npx -y @faith1688/dsh-usage-meter-harness@latest` and restart `dsh web`.
3. **Fallback semantics**: when neither source is available (the host projection's realtime fields never advance), the speed degrades to the **last completed turn's average** instead of `0.0`; on a brand-new session with no finished turn it still shows `0.0` — there genuinely is nothing to measure yet.
4. This release touches the **client only** (`lib/client.js`, `lib/i18n.js`) — zero host changes, so a browser refresh (no host restart) is enough to see these two changes.
5. Both Chinese and English UIs are covered.

### Verification (run before publishing)

- `npx tsc --noEmit` clean; `npm run bundle` clean.
- `node scripts/test-usage-accounting.mjs` **all PASS** (existing sections 1–8 plus a new section 9 driving the real `lib/index.js` and asserting that every `text-delta` / `reasoning-delta` advances the projection's realtime token count and timestamp — exactly the second sampler's data source).
- Built-artifact audit: `lib/client.js` contains `srvSamplesRef`, `realtimeOutputTokens`, `realtimeUpdatedAt`, `newestAt > 0` and the two-source expression `tokenRateOf(c, now) ?? tokenRateOf(s, now)`; new strings match between code and i18n dictionary (`dev/i18n-audit.mjs` reports no new untranslated key).
- Package: 49 files; `lib/index.js`, `lib/client.js`, `cordis.patch.yml`, `package.json`, `screenshots.json` all present; the internal manual `DEVELOPMENT.md` is confirmed **not shipped**.
- Artifact fingerprint: SHA256 `8937A3E978F3F840E4E526904B39C246D96CE57F95F054B6CD63B0A64A776CDE`, size `623272` bytes.
