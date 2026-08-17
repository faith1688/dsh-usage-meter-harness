#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════
 *  @faith1688/dsh-usage-meter-harness  一键安装 / 配置脚本
 * ══════════════════════════════════════════════════════════════════
 *  你只需要做一件事：运行它。唯一可选参数是 DeepSeek API Key。
 *
 *  用法（在仓库根目录运行）：
 *    node install.cjs                            交互式：提示输入 DeepSeek Key（可回车跳过）
 *    node install.cjs --key sk-你的DeepSeekKey    直接提供 Key（非交互）
 *    node install.cjs --npm                      改为从 npm 安装（需先发布）
 *    node install.cjs --uninstall                卸载：移除配置和已安装文件
 *    node install.cjs --dry-run                  只预览，不改动任何文件
 *
 *  脚本自动完成（无需你操心路径）：
 *    1. 自动定位 DSH 目录（$DSH_HOME 环境变量 → 用户主目录 .dsh）
 *    2. 自动找到/创建 profile 配置文件 cordis.patch.yml
 *    3. 把插件（lib/ + package.json）安装进 DSH 的 node_modules
 *    4. 在配置里写入/更新插件启用块（重复运行 = 更新参数，不会堆积）
 *    5. 修改前自动备份 cordis.patch.yml
 *    6. 打印下一步
 *
 *  DeepSeek API Key 说明：
 *    - 可选项！不给 Key 也能完成安装，其他厂商/模型的参考计费照常工作。
 *    - 只有「查看 DeepSeek 真实余额」需要 Key（同一 DeepSeek 账户下任意 Key 都行）。
 *    - 不给 Key 时插件会自动改用环境变量 DEEPSEEK_API_KEY。
 */
'use strict'

const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { execSync } = require('node:child_process')
const readline = require('node:readline')

// ── 参数 ──────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const argVal = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
const has = (name) => args.includes(name)

const DRY = has('--dry-run')
const UNINSTALL = has('--uninstall')
const NPM = has('--npm')
let apiKey = argVal('--key') ?? ''
const PACKAGE_LOCAL = '@deepseek-ai/dsh-usage-meter'   // GitHub 本地安装的包名（内部名）
const PACKAGE_NPM = '@faith1688/dsh-usage-meter-harness'          // npm 发布后的包名
const packageName = NPM ? PACKAGE_NPM : PACKAGE_LOCAL

// ── 工具 ──────────────────────────────────────────────────────────
const log = (...a) => console.log(...a)
const ok = (m) => log(`  ✔ ${m}`)
const fail = (m) => { console.error(`\n✗ ${m}`); process.exit(1) }

function resolveDshHome() {
  if (argVal('--dsh-home')) return path.resolve(argVal('--dsh-home'))
  if (process.env.DSH_HOME) return path.resolve(process.env.DSH_HOME)
  return path.join(os.homedir(), '.dsh')
}
function findProfileConfig(dshHome) {
  const profilesDir = path.join(dshHome, 'profiles')
  const found = []
  if (fs.existsSync(profilesDir)) {
    for (const dir of fs.readdirSync(profilesDir)) {
      const p = path.join(profilesDir, dir, 'cordis.patch.yml')
      if (fs.existsSync(p)) found.push(p)
    }
  }
  // 优先 web profile，否则第一个，否则新建 profiles/web/
  const prefer = found.find((p) => /[\\/]web[\\/]/.test(p)) ?? found[0]
  return prefer ?? path.join(profilesDir, 'web', 'cordis.patch.yml')
}
const yamlStr = (v) => (typeof v === 'number' ? String(v) : `'${String(v ?? '').replace(/'/g, "''")}'`)

function buildBlock() {
  return [
    '',
    '# ── @faith1688/dsh-usage-meter-harness（由 install.cjs 管理；改后重启 dsh web 生效）──',
    '- insert:',
    `    - id: usage-meter`,
    `      name: '${packageName}'`,
    '      config:',
    `        currency: ${yamlStr(argVal('--currency') ?? 'CNY')}`,
    `        refreshIntervalMs: ${yamlStr(Number(argVal('--refresh') ?? 14400000))}`,
    `        priceSourceUrl: ${yamlStr(argVal('--price-url') ?? '')}`,
    `        deepseekApiKey: ${yamlStr(apiKey)}`,
    `        initialBalance: ${yamlStr(Number(argVal('--balance') ?? 0))}`,
    '',
  ].join('\n')
}

/** 写入或更新插件配置块（幂等：已存在则整体替换该块；含其上方注释行） */
function upsertBlock(text, block) {
  const marker = `name: '${packageName}'`
  const idx = text.indexOf(marker)
  if (idx < 0) return text + block
  // 块起点：优先取本脚本写的注释行，否则取最近的 '- insert:'
  let start = text.lastIndexOf('\n# ── @faith1688/dsh-usage-meter-harness', idx)
  if (start < 0) start = text.lastIndexOf('\n- insert:', idx)
  if (start < 0) start = 0
  const nextInsert = text.indexOf('\n- insert:', idx + marker.length)
  const end = nextInsert < 0 ? text.length : nextInsert
  return text.slice(0, start) + block + text.slice(end)
}

async function askKey() {
  if (apiKey) return
  if (!process.stdin.isTTY) return
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const answer = await new Promise((res) => {
    rl.question(`\n【${packageName}】DeepSeek API Key（可留空回车跳过；仅查看 DeepSeek 真实余额需要，同账户下任意 Key 都行）:\n> `, res)
  })
  rl.close()
  apiKey = answer.trim()
}

// ── 1) 安装插件文件 ───────────────────────────────────────────────
function installFiles(dshHome) {
  const profilesNm = path.join(dshHome, 'profiles', 'node_modules')
  const pluginDir = path.join(profilesNm, ...packageName.split('/'))
  log(`\n[1/2] 安装插件文件 → ${pluginDir}`)

  if (UNINSTALL) {
    if (!DRY) {
      fs.rmSync(pluginDir, { recursive: true, force: true })
      ok('已删除插件文件')
    } else ok('（dry-run）将删除 ' + pluginDir)
    return
  }

  if (NPM) {
    const REG = '--registry=https://registry.npmjs.org' // 官方源：镜像(如 npmmirror)可能触发 Node 24 TLS 崩溃/禁止发布
    if (DRY) { ok(`（dry-run）将执行 npm install ${PACKAGE_NPM} --prefix ${profilesNm} ${REG}`); return pluginDir }
    fs.mkdirSync(profilesNm, { recursive: true })
    if (fs.existsSync(pluginDir)) {
      ok('npm 包已存在，跳过安装')
    } else {
      execSync(`npm install ${PACKAGE_NPM} --prefix "${profilesNm}" ${REG}`, { stdio: 'inherit', cwd: profilesNm })
      ok('npm 安装完成')
    }
    return pluginDir
  }

  // 本地安装：从脚本同级的 lib/ 复制（GitHub 仓库自带预构建 lib/，无需构建）
  const srcLib = path.join(__dirname, 'lib')
  if (!fs.existsSync(path.join(srcLib, 'index.js'))) {
    fail(`找不到 ${srcLib}/index.js —— 请确认 install.cjs 与 lib/ 同目录（GitHub 仓库自带），或用 --npm 安装。`)
  }
  if (DRY) { ok(`（dry-run）将复制 lib/ 与 package.json → ${pluginDir}`); return pluginDir }
  fs.mkdirSync(pluginDir, { recursive: true })
  fs.cpSync(srcLib, path.join(pluginDir, 'lib'), { recursive: true })
  const pkg = path.join(__dirname, 'package.json')
  if (fs.existsSync(pkg)) fs.copyFileSync(pkg, path.join(pluginDir, 'package.json'))
  ok('已安装（lib/ + package.json）')
  return pluginDir
}

// ── 2) 写入/更新配置 ──────────────────────────────────────────────
/** 读取配置并清理空列表占位（新 profile 常含一行 `[]`，与 - insert: 混在一起是非法 YAML） */
function readConfig(cfgFile) {
  const raw = fs.existsSync(cfgFile) ? fs.readFileSync(cfgFile, 'utf8') : ''
  return raw.replace(/^\[\]\s*$/gm, '').replace(/\n{3,}/g, '\n\n')
}

function patchConfig(dshHome) {
  const cfgFile = findProfileConfig(dshHome)
  log(`\n[2/2] 配置插件 → ${cfgFile}`)
  if (UNINSTALL) {
    if (DRY) { ok('（dry-run）将移除插件配置块'); return }
    const text = readConfig(cfgFile)
    const marker = `name: '${packageName}'`
    if (text.includes(marker)) {
      const newText = upsertBlock(text, '')
      fs.writeFileSync(cfgFile, newText)
      ok('已移除插件配置块')
    } else ok('配置中本就没有该插件')
    return
  }
  if (DRY) { ok('（dry-run）将写入如下配置块：'); console.log(buildBlock()); return }

  fs.mkdirSync(path.dirname(cfgFile), { recursive: true })
  const text = readConfig(cfgFile)
  const block = buildBlock()
  if (text.includes(`name: '${packageName}'`)) {
    fs.writeFileSync(cfgFile, upsertBlock(text, block))
    ok('已更新插件配置（原块被替换，无重复）')
  } else {
    const bak = cfgFile + '.bak'
    if (fs.existsSync(cfgFile)) { fs.copyFileSync(cfgFile, bak); ok(`已备份原配置 → ${path.basename(bak)}`) }
    fs.writeFileSync(cfgFile, (text.endsWith('\n') ? text : text + '\n') + block)
    ok('已写入插件配置')
  }
}

// ── 主流程 ────────────────────────────────────────────────────────
;(async () => {
  const dshHome = resolveDshHome()
  const cfgFile = findProfileConfig(dshHome)
  log('╔══════════════════════════════════════════╗')
  log('║  @faith1688/dsh-usage-meter-harness  安装 / 配置     ║')
  log('╚══════════════════════════════════════════╝')
  log(`  DSH 目录 : ${dshHome}`)
  log(`  配置文件 : ${cfgFile}`)
  log(`  安装来源 : ${NPM ? `npm（${PACKAGE_NPM}）` : '仓库自带 lib/（无需构建）'}`)
  log(`  包名     : ${packageName}`)
  if (DRY) log('  模式     : dry-run（只预览，不改动）')

  if (!UNINSTALL) await askKey()

  installFiles(dshHome)
  patchConfig(dshHome)

  if (UNINSTALL) {
    log('\n已完成卸载。重启 dsh web 后生效。')
    return
  }
  log('\n╔══════════════════════════════════════════╗')
  log('║  安装完成 ✅                               ║')
  log('╚══════════════════════════════════════════╝')
  log(`  DeepSeek Key : ${apiKey ? '已写入配置' : '未提供 → 插件将读取环境变量 DEEPSEEK_API_KEY'}`)
  log('')
  log('接下来：')
  log('  1. 重启 DSH：  dsh web')
  log('  2. 浏览器强刷（Ctrl+Shift+R），打开任意对话即可看到计量器')
  log('')
  log('以后想改配置（换 Key / 改币种等）：')
  log(`  ① 重新运行本脚本（会更新配置，不重复）`)
  log(`     例如： node install.cjs --key 新Key --currency USD`)
  log(`  ② 或直接编辑 ${cfgFile} 里的 usage-meter 配置块后重启`)
})()
