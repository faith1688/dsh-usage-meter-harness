#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════
 *  patch-config.cjs —— 只插入/更新 usage-meter 插件配置块（不安装文件）
 * ══════════════════════════════════════════════════════════════════
 *  适用：你已经用 npm 装好了插件文件，只想把配置块写进 cordis.patch.yml。
 *  它不会覆盖你 cordis.patch.yml 里的任何其他内容：
 *    · 文件不存在 → 新建（含 profiles/web/ 目录）
 *    · 已有其他插件块 → 原样保留，只在末尾追加本插件的块
 *    · 已有 usage-meter 块（- insert: 包裹或直接 - id: 两种形式都认）→
 *      只更新该块的参数，绝不新增第二个 usage-meter 条目
 *    · 写入前自动备份为 cordis.patch.yml.bak
 *    · 自动清理新建 profile 常见的孤立 `[]` 占位行（否则 YAML 非法）
 *
 *  用法（任选其一）：
 *    node patch-config.cjs                      # 交互式：Key 可回车跳过
 *    node patch-config.cjs --key sk-xxx         # 直接给 DeepSeek Key（可选）
 *    node patch-config.cjs --config 文件路径     # 指定配置文件（默认自动找 web profile）
 *    node patch-config.cjs --name @faith1688/dsh-usage-meter-harness  # 覆盖包名
 *    node patch-config.cjs --currency USD --refresh 3600000 --price-url http://... --balance 10
 *    node patch-config.cjs --dry-run            # 只预览，不改文件
 *    node patch-config.cjs --remove             # 移除本插件块（也幂等）
 *
 *  说明：插件包名默认读取脚本同目录 package.json 的 name 字段（与安装的
 *  包保持一致）；也可用 --name 显式指定。
 */
'use strict'

const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const readline = require('node:readline')

// ── 参数 ──────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const argVal = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
const has = (name) => args.includes(name)

const DRY = has('--dry-run')
const REMOVE = has('--remove')
const apiKey = argVal('--key') ?? ''
const explicitConfig = argVal('--config')
const explicitName = argVal('--name')
const packageName = explicitName ?? readLocalName()
const log = (...a) => console.log(...a)
const ok = (m) => log(`  ✔ ${m}`)
const fail = (m) => { console.error(`\n✗ ${m}`); process.exit(1) }

function readLocalName() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'))
    if (pkg && pkg.name) return pkg.name
  } catch { /* 同级无 package.json 时走默认 */ }
  return '@deepseek-ai/dsh-usage-meter'
}

function yamlStr(v) {
  return typeof v === 'number' ? String(v) : `'${String(v ?? '').replace(/'/g, "''")}'`
}

// ── 定位配置文件 ──────────────────────────────────────────────────
function resolveDshHome() {
  if (process.env.DSH_HOME) return path.resolve(process.env.DSH_HOME)
  return path.join(os.homedir(), '.dsh')
}

function findProfileConfig() {
  if (explicitConfig) return path.resolve(explicitConfig)
  const profilesDir = path.join(resolveDshHome(), 'profiles')
  const found = []
  if (fs.existsSync(profilesDir)) {
    for (const dir of fs.readdirSync(profilesDir)) {
      const p = path.join(profilesDir, dir, 'cordis.patch.yml')
      if (fs.existsSync(p)) found.push(p)
    }
  }
  return found.find((p) => /[\\/]web[\\/]/.test(p)) ?? found[0]
    ?? path.join(profilesDir, 'web', 'cordis.patch.yml')
}

// ── 配置块构造 ────────────────────────────────────────────────────
function buildBlock() {
  const lines = [
    '',
    `# ── ${packageName}（由 patch-config.cjs 管理；改后重启 dsh web 生效）──`,
    '- insert:',
    '    - id: usage-meter',
    `      name: '${packageName}'`,
    '      config:',
    `        currency: ${yamlStr(argVal('--currency') ?? 'CNY')}`,
    `        refreshIntervalMs: ${yamlStr(Number(argVal('--refresh') ?? 14400000))}`,
    `        priceSourceUrl: ${yamlStr(argVal('--price-url') ?? '')}`,
    `        deepseekApiKey: ${yamlStr(apiKey)}`,
    `        initialBalance: ${yamlStr(Number(argVal('--balance') ?? 0))}`,
    '',
  ]
  return lines.join('\n')
}

// ── 幂等插入/更新（核心） ─────────────────────────────────────────
/**
 * 把本插件的块写入配置文本。规则：
 *  - 顶层条目 = 行首无缩进的 `- `（数组项）。`- insert:` 包裹的子项是
 *    缩进的 `    - id:`，不会被当成顶层条目。
 *  - 若某顶层条目（或其包裹的子项）含 `id: usage-meter`，整体替换该条目
 *    为新块 → 不产生第二个 usage-meter。
 *  - 否则在末尾追加新块，其余内容原样保留。
 */
function upsertBlock(text, block) {
  const lines = text.split('\n')
  const tops = [] // 每个顶层条目的起始行号（以 0 缩进 `- ` 开头）
  for (let i = 0; i < lines.length; i++) {
    if (/^-\s/.test(lines[i])) tops.push(i)
  }
  // 找含 id: usage-meter 的顶层条目区间（兼容 `- insert:` 包裹的缩进子项
  // `    - id: usage-meter` 与直接顶层 `- id: usage-meter` 两种形式）
  for (let t = 0; t < tops.length; t++) {
    const start = tops[t]
    const end = t + 1 < tops.length ? tops[t + 1] : lines.length
    const seg = lines.slice(start, end).join('\n')
    if (/^\s*-\s*id:\s*usage-meter\s*$/m.test(seg)) {
      // 删除该条目上方紧邻的脚本标记注释行（`# ── <包名>（由 patch-config.cjs 管理…`），
      // 用户自己的注释（不含包名标记）一律保留
      let cut = start
      while (cut > 0) {
        const up = lines[cut - 1].trim()
        if (up === '') { cut--; continue }
        if (up.startsWith('# ──') && up.includes(packageName) && up.includes('patch-config.cjs')) { cut--; continue }
        break
      }
      const head = lines.slice(0, cut).join('\n')
      const tail = lines.slice(end).join('\n')
      // 去掉尾巴最前面的空行，避免双空行
      return (head.replace(/\s+$/, '') + block + '\n' + tail.replace(/^\n+/, '')).replace(/\n{3,}/g, '\n\n')
    }
  }
  // 不存在 → 追加
  const base = text.replace(/\s+$/, '')
  return (base === '' ? '' : base + '\n') + block.replace(/^\n/, '')
}

/** 读取配置并清理空列表占位（新 profile 常含一行 `[]`，与 - insert: 混在一起是非法 YAML） */
function readConfig(cfgFile) {
  const raw = fs.existsSync(cfgFile) ? fs.readFileSync(cfgFile, 'utf8') : ''
  return raw.replace(/^\[\]\s*$/gm, '').replace(/\n{3,}/g, '\n\n')
}

// ── 主流程 ────────────────────────────────────────────────────────
;(() => {
  const cfgFile = findProfileConfig()
  const exists = fs.existsSync(cfgFile)
  log('╔══════════════════════════════════════════╗')
  log('║  usage-meter 配置块 插入/更新               ║')
  log('╚══════════════════════════════════════════╝')
  log(`  配置文件 : ${cfgFile}${exists ? '' : '（不存在，将新建）'}`)
  log(`  插件包名 : ${packageName}`)
  log(`  Key      : ${apiKey ? '已提供' : '未提供 → 插件将读取环境变量 DEEPSEEK_API_KEY'}`)
  if (DRY) log('  模式     : dry-run（只预览，不改动）')

  const text = readConfig(cfgFile)

  if (REMOVE) {
    const out = upsertBlock(text, '').replace(/\n{3,}/g, '\n\n')
    if (out === text) { ok('配置中本就没有 usage-meter 块'); return }
    if (DRY) { ok('（dry-run）将移除 usage-meter 配置块'); return }
    if (exists) fs.copyFileSync(cfgFile, cfgFile + '.bak')
    fs.writeFileSync(cfgFile, out)
    ok('已移除 usage-meter 配置块（原文件已备份 .bak）')
    return
  }

  const block = buildBlock()
  if (text.includes(`id: usage-meter`)) {
    const out = upsertBlock(text, block)
    if (DRY) { ok('（dry-run）将更新 usage-meter 配置块（不新增重复条目）'); return }
    if (exists) fs.copyFileSync(cfgFile, cfgFile + '.bak')
    fs.writeFileSync(cfgFile, out)
    ok('已更新 usage-meter 配置块（原块被替换，无重复条目）')
  } else {
    if (DRY) { ok('（dry-run）将追加如下配置块：'); console.log(block); return }
    fs.mkdirSync(path.dirname(cfgFile), { recursive: true })
    if (exists) fs.copyFileSync(cfgFile, cfgFile + '.bak')
    fs.writeFileSync(cfgFile, upsertBlock(text, block))
    ok('已写入 usage-meter 配置块（其余内容原样保留）')
  }
  log('')
  log('接下来：重启 dsh web（先 Ctrl+C 停掉旧的），浏览器强刷 Ctrl+Shift+R 即可。')
  log('以后改 Key / 币种：重新运行本脚本（会自动更新，不会重复），或直接编辑该配置块后重启。')
})()
