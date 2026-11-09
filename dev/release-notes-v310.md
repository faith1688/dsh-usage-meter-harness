# v3.1.0

## 有什么变化

- **一个包，两代宿主都能装**：DSH 0.1（网页版 / web profile）和 DSH 0.2（桌面版）用同一个 `dsh-usage-meter-desktop`，不用再按宿主挑版本。
- **升级是原地替换**：插件 id、数据目录、配置文件名都没变，账本、定价、设置全部保留。
- **跑在没有 HTTP 服务的组合里也不报错**：读数、记账、界面照常，只是没有那几个接口。

## 装哪个

| 你的 DSH | 装什么 |
| --- | --- |
| 0.1（网页版 / `dsh web` profile） | **3.1.0**（2.0.x 也能用，是旧线） |
| 0.2（桌面版） | **3.1.0**（2.0.x 装不上，会报 `1 entry did not activate`） |

## 安装

```powershell
cd $env:DSH_HOME\profiles\desktop
# 把 dsh-usage-meter-desktop-3.1.0.tgz 放进这个目录，package.json 里：
#   "dependencies": { "dsh-usage-meter-desktop": "file:./dsh-usage-meter-desktop-3.1.0.tgz" }
# dsh.profile.bundles 里登记 dsh-usage-meter-desktop
pnpm install
# 重启 DSH
```

装好之后输入框旁边会出现胶囊，显示 token 用量、消费金额和钱包余额。

## 从 3.0.0 升级

把 tgz 换成 3.1.0、`package.json` 里的版本号改成 3.1.0、`pnpm install`、重启。数据目录 `$DSH_HOME/usage-meter-desktop/` 不动。

完整说明见 [`desktop/README.zh-CN.md`](desktop/README.zh-CN.md)。
