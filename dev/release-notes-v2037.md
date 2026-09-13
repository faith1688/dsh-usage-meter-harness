## v2.0.37 — 实时速度改成「该是 0 就是 0」（修正 v2.0.36 引入的回退 bug）

> **v2.0.36 未发布到 npm，已被本版取代。** 它修好了「远程端速度恒 0.0」，但引入了下面这个新问题：请直接使用 **2.0.37**。

### 修复：流式结束后，速度停在最后一个值不动

**现象**（用户实测）：一次 API 返回结束、开始执行本地工具（此时没有 token 流）时，速度**停在流式时最后一个数值不动**，直到下一次 API 请求才开始刷新。

**根因**：`tokenRateOf` 会**就地淘汰窗口外样本**（`while (now - samples[0].at > RATE_WINDOW_MS) samples.shift()`）——流式停止满 3 秒后采样缓冲被清空；而 v2.0.36 为修复「空数组把兜底挡死」加的 `newestAt > 0` 闸门此时**不触发**，于是执行到 `setRate((prev) => live ?? prev ?? completedTurnRate(...))`，**旧值被永久保留**。（典型的拆东墙补西墙：两次都栽在同一个采样函数上。）

**修法**：**删掉全部回退与守卫**，只剩一句 `setRate(liveOutputRate(客户端源, 宿主源, Date.now()))`，语义明确为：

- 有实时样本 → 显示真实速率（**客户端直播流优先，宿主投影兜底**）；
- 没有实时样本（工具执行 / 思考间隙 / 回合结束 / 尚未开始）→ **显示 0**；
- **任何情况下都不沿用旧值，也不用「上一回合平均速度」顶替** —— 这两类"假数据"正是问题的来源。

### 结构改动（为了能直接测）

- 速率取值逻辑从 `client.tsx` 移到**可被脚本 import 的纯函数**：`src/globals.ts` 的 `liveOutputRate` / `tokenRateOf`（顺带删除已无用的 `completedTurnRate`）。
- 新增回归 `scripts/test-live-rate.mjs`：**14 条断言全 PASS**，专门覆盖「滑窗被清空 → 必须 null，不得沿用旧值」「两源皆空 → null」「客户端源优先 / 宿主源兜底」「增量回退 / 用时过短 / 增量为 0 → null」。

### 已知语义与边界（请知悉）

1. 速率窗口为 **3 秒**：流式停止后，数字最长约 3 秒内保持最后一次的窗口均值，随后归 0 —— 这是窗口平均的自然结果，不是「卡住」。
2. 刚开新会话、还没开始输出时显示 `0.0`：此时确实没有数据可算。
3. 本次**只改客户端**（`lib/client.js`、`lib/globals.js`、`lib/i18n.js`）：**刷新浏览器即生效，不需要重启 `dsh web`**。
4. 与 v2.0.36 相同的两条注意事项仍然有效：装完/更新完插件必须**重启 `dsh web`**；发布后 **24 小时内**从插件市场更新可能被 pnpm 冷静期拦下并自动回滚（等 24h / 把包名加入 `minimumReleaseAgeExclude` / 用 `npx -y @faith1688/dsh-usage-meter-harness@latest`）。

### 验证（发布前实跑）

- `npx tsc --noEmit` 零报错；`npm run bundle` 零报错。
- `node scripts/test-live-rate.mjs` → **ALL PASSED（14/14）**。
- `node scripts/test-usage-accounting.mjs` → **ALL PASSED**（含第 9 段：宿主每个 `text-delta`/`reasoning-delta` 都推进投影的实时 token 与时间戳）。
- 构建产物核查：`lib/client.js` 内 `liveOutputRate(` 存在；`newestAt`、`completedTurnRate`、`previous =>` 全部消失。

---

## v2.0.37 — English

**Fixes a regression introduced by v2.0.36** (which was never published to npm — use 2.0.37).

**Symptom**: after an API response finished and a local tool started running, the displayed token rate **froze at the last streaming value** until the next API request.

**Cause**: `tokenRateOf` evicts out-of-window samples in place (`while (now - samples[0].at > RATE_WINDOW_MS) samples.shift()`), so the buffer empties ~3s after streaming stops. The `newestAt > 0` guard added in v2.0.36 then does not fire, and execution falls through to `setRate((prev) => live ?? prev ?? completedTurnRate(...))`, **keeping the stale value forever**.

**Fix**: all fallbacks and guards are deleted — a single `setRate(liveOutputRate(clientSamples, serverSamples, Date.now()))`. Semantics: real samples → real rate (browser live stream first, host projection as fallback); no samples → **0**. **The stale value is never reused and the "last completed turn average" is never substituted** — those two fake sources caused both reported bugs.

**Testability**: the rate logic moved to importable pure functions (`liveOutputRate` / `tokenRateOf` in `src/globals.ts`); new regression `scripts/test-live-rate.mjs` (14 assertions, all PASS) covers "emptied window must return null, never the stale value", "both sources empty → null", source priority, and the degenerate cases (negative delta, too-short elapsed, zero delta). Unused `completedTurnRate` removed.

**Notes**: the window is 3 seconds, so after streaming stops the number settles to 0 within ~3s. Client-only change — a browser refresh is enough. Restart `dsh web` after installing/updating; within 24h of release the marketplace update may be blocked by the pnpm release-age cooldown.
