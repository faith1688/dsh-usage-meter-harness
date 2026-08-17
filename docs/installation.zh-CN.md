# 安装说明（中文）

> 本插件是一个 **DeepSeek Harness (dsh) 插件**，作用是：在对话页实时显示「用量 → 费用 → 余额」。
> 安装只需要 2~3 步，下面两种方式任选其一。

---

## 安装前须知（30 秒看懂）

| 问题 | 答案 |
|---|---|
| 需要先装什么？ | 已经装好 **DeepSeek Harness (dsh)** 并跑起来过（能正常对话即可） |
| 需要 Node.js 吗？ | 需要（装 dsh 时就有了） |
| 需要 DeepSeek API Key 吗？ | **不需要也能安装**。只有「查看 DeepSeek 真实余额」才需要 Key（见下文说明） |
| 会动我现有配置吗？ | 脚本会在修改 `cordis.patch.yml` **之前自动备份**（`.bak` 文件） |

### DeepSeek API Key 说明（重要，读一下）

- **Key 是可选的**：不给 Key 也能完成安装，插件照常显示所有模型的用量和费用（按内置价参考计费）。
- **只有看 DeepSeek 真实余额**需要 Key：DeepSeek 的余额来自官方接口，必须用你的 DeepSeek API Key。
- **只要是同一 DeepSeek 账户下的任意 Key 都行**（一个账户的所有 Key 等价，都能查余额）。
- 不给 Key 时，插件会自动尝试读取环境变量 `DEEPSEEK_API_KEY`。
- 其他厂商/模型的计费**不需要任何 Key**（纯内置价格表参考）。

---

## 方法一：一键安装脚本（推荐，最简单）

> 你**只需要做一件事**：运行一条命令。文件路径、安装位置全部自动处理。

### 第 1 步：拿到插件文件

- 从 GitHub 下载本仓库（Clone 或 Download ZIP），解压后得到一个 `dsh-usage-meter-harness` 文件夹；
- 用终端（命令行）进入这个文件夹：
  ```bash
  cd dsh-usage-meter-harness
  ```

### 第 2 步：运行安装命令

```bash
node install.cjs --key sk-你的DeepSeekKey
```

- `--key` 后面是你的 DeepSeek API Key（在 [platform.deepseek.com](https://platform.deepseek.com) 创建）。
- **不想填 Key？直接运行 `node install.cjs`**（回车跳过输入）——也能安装，只是 DeepSeek 余额显示「获取中…」，其他功能正常。

### 第 3 步：完成

脚本会自动：
1. 找到你的 DSH 数据目录（`~/.dsh`，Windows 是 `$HOME\.dsh`，即你的用户目录下）
2. 找到（或创建）配置文件 `profiles/web/cordis.patch.yml`
3. 把插件复制进 DSH 的 `node_modules`（无需构建）
4. 在配置里写入/更新插件启用信息

看到「安装完成 ✅」后：
```bash
dsh web          # 重启 DSH（先 Ctrl+C 停掉旧的）
```
浏览器强刷（Ctrl+Shift+R），打开任意对话 → 输入框上方出现计量器，即成功 🎉

### 常用参数（都是可选的）

```bash
node install.cjs --dry-run           # 先预览，不改任何文件
node install.cjs --currency USD      # 显示币种（CNY/USD，默认 CNY）
node install.cjs --npm               # 改为从 npm 安装（见方法二）
node install.cjs --uninstall         # 卸载（移除配置和插件文件）
node install.cjs --key 新Key         # 以后再跑一遍 = 更新配置（换 Key / 改参数，不会重复写入）
```

---

## 方法二：从 npm 安装

> 包名：**`@faith1688/dsh-usage-meter-harness`**（已在 npm 发布）
>
> ⚠️ **先说清楚**：npm 方法**不是一条命令**——下面第 1 步装文件，还需要「粘贴启用配置 + 重启」两步。想一条命令全搞定，请用**方法一**（`node install.cjs --npm` 会自动完成本方法的两步）。
>
> 🔑 **DeepSeek API Key**：安装时可不填——但**不填的话 DeepSeek 的计量（真实余额）无法使用**；同一账户下任意 Key 都行，不填则自动读环境变量 `DEEPSEEK_API_KEY`。其他厂商参考计费不需要 Key。**插件自身 API 用量几乎为 0**（只读余额接口，不消耗 tokens，从不调用模型）。

### 第 1 步：安装 npm 包（Windows 用一句话安装）

**Windows（PowerShell）——一句话安装（无需填用户名）**（先装进临时目录再复制到 profile，任何机器都稳定；命令用 `$HOME` 自动定位你的用户目录，**你不需要改任何内容**——`@faith1688/` 是包作者的 npm 用户名，**安装时不要改**）：

```powershell
npm install @faith1688/dsh-usage-meter-harness --prefix $env:TEMP\um-install --registry=https://registry.npmjs.org; Copy-Item -Recurse -Force "$env:TEMP\um-install\node_modules\@faith1688\dsh-usage-meter-harness" "$HOME\.dsh\profiles\node_modules\@faith1688\dsh-usage-meter-harness"; dir "$HOME\.dsh\profiles\node_modules\@faith1688\dsh-usage-meter-harness"
```

最后 `dir` 能看到 `lib\` 和 `package.json` 即安装成功。

**macOS / Linux**：

```bash
npm install @faith1688/dsh-usage-meter-harness --prefix "$TMPDIR/um-install"; cp -r "$TMPDIR/um-install/node_modules/@faith1688/dsh-usage-meter-harness" "$HOME/.dsh/profiles/node_modules/@faith1688/dsh-usage-meter-harness"
```

### 第 2 步：启用插件

打开配置文件（Windows：`$HOME\.dsh\profiles\web\cordis.patch.yml`，即你的用户目录下），在**文件末尾**粘贴以下内容（把 `sk-xxx` 换成你的 Key；不填 Key 就留空 `''`）：

```yaml
- insert:
    - id: usage-meter
      name: '@faith1688/dsh-usage-meter-harness'
      config:
        currency: 'CNY'               # 显示币种：CNY 人民币 / USD 美元
        refreshIntervalMs: 14400000   # 刷新间隔（毫秒），默认 4 小时，一般不用改
        priceSourceUrl: ''            # 远端价格源 URL；留空用内置价
        deepseekApiKey: 'sk-xxx'      # 可选；留空则用环境变量 DEEPSEEK_API_KEY
        initialBalance: 0             # 手动初始余额（元）；一般留 0
```

### 第 3 步：重启并验证

```bash
dsh web
```
浏览器强刷（Ctrl+Shift+R）→ 打开任意对话 → 看到计量器即成功。

> 💡 **一条命令版本**：下载 GitHub 仓库后运行 `node install.cjs --npm`，脚本自动完成第 1、2 步（也自动处理 Windows 路径）。

---

## 验证是否安装成功

1. 服务端日志出现 `[usage-meter] config route registered...`；
2. 对话页输入框上方出现：`模型名 · 本次 ¥xx · 余额 ¥xx · N 次`；
3. 点开「用户自定义设置」能看到计费方式下拉（8 种）与单价编辑。

---

## 常见问题

| 问题 | 解决 |
|---|---|
| 计量器没出现 | ① 确认 `dsh web` 重启过 ② 浏览器强刷 Ctrl+Shift+R ③ 看服务端日志有没有 `[usage-meter]` 报错 |
| 余额一直「获取中…」 | 没配 DeepSeek Key：重跑 `node install.cjs --key sk-xxx`，或设置环境变量 `DEEPSEEK_API_KEY` |
| 改完配置不生效 | 所有配置改动都要**重启 dsh web + 强刷浏览器**才生效 |
| 想卸载 | `node install.cjs --uninstall`，再重启 dsh web |
| npm 安装报 `Sign up to CNPM` / 发布被拒 | 你的 npm 源是镜像（npmmirror），加 `--registry=https://registry.npmjs.org` |
| npm 安装时 Node 崩溃（`Fatal error` / V8） | Node 24.x 与镜像源的 TLS bug：加 `--registry=https://registry.npmjs.org`，或升级 Node 到 22 LTS |

---

## 后续修改配置（入口汇总）

改任何配置后都需：**重启 dsh web + 强刷浏览器**。

| 想改什么 | 在哪改 |
|---|---|
| **DeepSeek API Key** | ① 重跑 `node install.cjs --key 新Key`（推荐）② 编辑 `cordis.patch.yml` 里的 `deepseekApiKey` ③ 设置环境变量 `DEEPSEEK_API_KEY` |
| 显示币种 / 刷新间隔 | `cordis.patch.yml` 里的 `currency` / `refreshIntervalMs`，或 `node install.cjs --currency USD --refresh 14400000` |
| 模型单价 / 计费方式 / 定价币种 | 对话页 →「用户自定义设置」→ 模型单价编辑（保存后写入 `~/.dsh/usage-meter.json`） |
| 非 DeepSeek 余额 / 充值 | 对话页 →「用户自定义设置」→ 账户余额 / 充值 |
| 远端价格源 | `cordis.patch.yml` 里的 `priceSourceUrl`（LiteLLM 格式 JSON） |

配置文件位置：`~/.dsh/profiles/<profile>/cordis.patch.yml`（Windows：`$HOME\.dsh\profiles\web\cordis.patch.yml`）

---

## 从源码构建（开发者，可选）

仓库自带预构建 `lib/`，正常使用**无需构建**。只有改源码后才需要：

```bash
# 需要 deepseek-harness monorepo 工作区
# 把本仓库放到 harness 的 packages/client/usage-meter，然后：
pnpm install
pnpm --filter @deepseek-ai/dsh-usage-meter bundle   # 产出 lib/index.js + lib/client.js
```
