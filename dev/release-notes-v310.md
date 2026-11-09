# v3.1.0 — 一个包，两代宿主都能装

3.0.0 解决的是「DSH 0.2 上能跑」，但它没回答真正该回答的问题：**到底该装哪个包**。

结果是把一个硬依赖换成了另一个硬依赖：2.0.x 需要 `settings` 服务（DSH 0.2 删了），3.0.0 需要把 `webServer` 写进 `inject`（DSH 0.1 的组合里声不能满足，尽管那个服务本身在那一代是可读的）。无论哪一代，另一代都是二等公民。

3.1.0 只声明两代都一定提供的东西，其余全部按需解析。

## 后端改了什么

- **`inject` 只留 `['sessionProjections']`**。两代都提供它，读数通道架在它上面。
- **`webServer` 变成可选子 fiber**：`ctx.inject(['webServer'], cb)` 在服务出现时激活；组合里永远不提供就一直 pending，主 `apply` 不受影响。服务到位前注册的路由进 `pendingRoutes` 队列，adopt 后按序 flush。`adoptServer` 是幂等的，子 fiber 和 `readService` 兜底不会把同一批路由注册两遍。
- **完全没有 `webServer` 是受支持形态，不是错误**：插件照常记账、照常渲染，只是没有 HTTP 路由。旧的 "service is absent" 分支只在一个自称 server 的东西缺 `register` 时才告警。
- **设置本来就不碰宿主**（`src/settings-scope.ts` 自己管插件数据目录里的 JSON 文件），所以 0.1 有 `ctx.settings.register`、0.2 删了它，都跟这个插件无关。
- `types/cordis.d.ts` 补了 `inject` / `get`，让这个逃生口在 cordis 4.0.1（devDep）和 4.0.2（DSH 0.1 自带）上都能过类型检查。

## 证据，不是声明

- 新增 `desktop/scripts/test-host-matrix.mjs`：在**真实 cordis** 上把插件挂进三种宿主形态——服务先就位（DSH 0.1）、服务迟到（DSH 0.2）、服务永不提供。三种全过，队列每次都只 flush 一次。
- **DSH 0.1.5-rc.1 真机**（临时 profile `compat01`）：`/api/usage-meter/config`、`/active`、`/templates` 全部 200；web app 的 `__DSH_BOOT__` 里列着插件 client bundle，实际下发 321 076 字节。
- **DSH 0.2 桌面版真机**（装入打包后的 tgz 并重启）：`/api/usage-meter/config` 200（11 022 字节），输入框旁的胶囊正常显示钱包余额——说明子 fiber 的 flush 真的到达了真实服务器。

## 装哪个

| | 2.0.x | 3.0.0 | **3.1.0** |
| --- | --- | --- | --- |
| DSH 0.1（网页版 / web profile） | ✅ | ⚠️ 只靠探测 | ✅ |
| DSH 0.2（桌面版） | ❌ `1 entry did not activate` | ✅ | ✅ |
| `inject` | `['settings','sessionProjections']` | `['sessionProjections','webServer']` | `['sessionProjections']` |

从 3.1.0 起，**不用再按宿主挑版本**：`dsh-usage-meter-desktop` 一个包，两代宿主都能装。插件 id（`usage-meter-desktop`）、数据目录（`$DSH_HOME/usage-meter-desktop/`）、配置文件名（`usage-meter-desktop.json`）都没变，升级是原地替换，账本和定价不丢。

## 安装

```powershell
cd $env:DSH_HOME\profiles\desktop
# 把 dsh-usage-meter-desktop-3.1.0.tgz 放进这个目录，package.json 里：
#   "dependencies": { "dsh-usage-meter-desktop": "file:./dsh-usage-meter-desktop-3.1.0.tgz" }
# dsh.profile.bundles 里登记 dsh-usage-meter-desktop
pnpm install
# 重启 DSH
```

验证：胶囊出现即成功；日志里应有 `[usage-meter] HTTP routes registered (config/price/stats/models endpoints active).`，且**不再**出现 `webServer service is absent`。

完整改动清单与截图见 [`desktop/README.zh-CN.md`](desktop/README.zh-CN.md)。
