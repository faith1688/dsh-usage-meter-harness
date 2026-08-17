/**
 * patch-config.cjs 行为测试（自包含，无外部依赖）
 * 覆盖：新建 / 保留其他插件 / 幂等（insert 与直接 id 两种形式）/
 *       [] 占位清理 / Key 可选 / 不覆盖用户内容 / --remove
 * 运行：node test-patch-config.mjs
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCRIPT = join(__dirname, 'patch-config.cjs')

let failures = 0
const A = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? '  [' + extra + ']' : ''}`)
  if (!cond) failures++
}

function run(args, env = {}) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', env: { ...process.env, ...env } })
  return { code: r.status, out: r.stdout + r.stderr }
}

function freshDir() {
  const d = mkdtempSync(join(tmpdir(), 'um-patch-'))
  mkdirSync(join(d, 'profiles', 'web'), { recursive: true })
  return { d, cfg: join(d, 'profiles', 'web', 'cordis.patch.yml') }
}

// 1. 文件不存在 → 新建，且含完整块 + 无 key 时留空
{
  const { d, cfg } = freshDir()
  const r = run(['--config', cfg, '--dsh-home', d])
  const t = readFileSync(cfg, 'utf8')
  A('1.1 新建文件 exit 0', r.code === 0, `code=${r.code}`)
  A('1.2 含 insert 与 id', /- insert:/.test(t) && /id: usage-meter/.test(t))
  A('1.3 deepseekApiKey 留空', /deepseekApiKey: ''/.test(t))
  A('1.4 name 用默认包名', /name: '@deepseek-ai\/dsh-usage-meter'/.test(t))
  rmSync(d, { recursive: true, force: true })
}

// 2. 已有其他插件 + 用户注释 → 原样保留，只追加本块
{
  const { d, cfg } = freshDir()
  const userCfg = [
    '# 用户的注释',
    '- insert:',
    '    - id: compaction-basic',
    '      disabled: false',
    '',
  ].join('\n')
  writeFileSync(cfg, userCfg)
  run(['--config', cfg, '--key', 'sk-test-1234567890abcdef'])
  const t = readFileSync(cfg, 'utf8')
  A('2.1 用户 compaction 块保留', t.includes('compaction-basic'))
  A('2.2 用户注释保留', t.includes('# 用户的注释'))
  A('2.3 本插件块追加', t.includes('usage-meter'))
  const count2 = (t.match(/^    - id: usage-meter$/gm) || []).length
  A('2.4 仅一个 usage-meter id 行', count2 === 1, `count=${count2}`)
  A('2.6 key 写入', t.includes("deepseekApiKey: 'sk-test-1234567890abcdef'"))
  A('2.7 备份生成', existsSync(cfg + '.bak'))
  rmSync(d, { recursive: true, force: true })
}

// 3. 幂等：已有本插件块（- insert: 形式）→ 更新不重复
{
  const { d, cfg } = freshDir()
  writeFileSync(cfg, [
    '- insert:',
    '    - id: usage-meter',
    "      name: '@deepseek-ai/dsh-usage-meter'",
    '      config:',
    "        currency: 'CNY'",
    '        deepseekApiKey: \'sk-old\'',
    '',
  ].join('\n'))
  run(['--config', cfg, '--key', 'sk-new'])
  const t = readFileSync(cfg, 'utf8')
  const count = (t.match(/^    - id: usage-meter$/gm) || []).length
  A('3.1 仍仅一个 usage-meter', count === 1, `count=${count}`)
  A('3.2 key 更新为新的', t.includes("deepseekApiKey: 'sk-new'"))
  A('3.3 旧 key 不存在', !t.includes('sk-old'))
  A('3.4 块为完整结构', t.includes('refreshIntervalMs'))
  rmSync(d, { recursive: true, force: true })
}

// 4. 幂等：已有直接 `- id: usage-meter` 形式（非 insert 包裹）→ 替换为 insert 形式，不重复
{
  const { d, cfg } = freshDir()
  writeFileSync(cfg, [
    '- id: usage-meter',
    "  name: '@deepseek-ai/dsh-usage-meter'",
    '  disabled: false',
    '',
  ].join('\n'))
  run(['--config', cfg])
  const t = readFileSync(cfg, 'utf8')
  const count = (t.match(/^    - id: usage-meter$/gm) || []).length
  A('4.1 直接形式被替换为 insert 形式', count === 1 && t.includes('- insert:'), `count=${count}`)
  A('4.2 无残留直接 id 行', !/^- id: usage-meter$/m.test(t))
  rmSync(d, { recursive: true, force: true })
}

// 5. 孤立 `[]` 占位 → 清理后合法
{
  const { d, cfg } = freshDir()
  writeFileSync(cfg, '[]\n')
  run(['--config', cfg])
  const t = readFileSync(cfg, 'utf8')
  A('5.1 [] 被移除', !t.includes('[') && !t.includes(']'))
  A('5.2 插件块写入', t.includes('usage-meter'))
  rmSync(d, { recursive: true, force: true })
}

// 6. 空内容文件 → 正常追加
{
  const { d, cfg } = freshDir()
  writeFileSync(cfg, '')
  run(['--config', cfg])
  const t = readFileSync(cfg, 'utf8')
  A('6.1 空文件可写', t.includes('usage-meter'))
  rmSync(d, { recursive: true, force: true })
}

// 7. --dry-run 不改文件
{
  const { d, cfg } = freshDir()
  const r = run(['--config', cfg, '--dry-run'])
  A('7.1 dry-run 不创建文件', !existsSync(cfg), 'file created?!')
  A('7.2 dry-run 输出预览', /dry-run/.test(r.out))
  rmSync(d, { recursive: true, force: true })
}

// 8. --remove 幂等移除
{
  const { d, cfg } = freshDir()
  writeFileSync(cfg, [
    '# keep me',
    '- insert:',
    '    - id: usage-meter',
    "      name: '@deepseek-ai/dsh-usage-meter'",
    '',
  ].join('\n'))
  run(['--config', cfg, '--remove'])
  const t = readFileSync(cfg, 'utf8')
  A('8.1 移除后无 usage-meter', !t.includes('usage-meter'))
  A('8.2 用户内容保留', t.includes('# keep me'))
  rmSync(d, { recursive: true, force: true })
}

console.log(failures === 0 ? '\nALL PATCH-CONFIG TESTS PASSED ✅' : `\n${failures} FAILURES ❌`)
process.exit(failures === 0 ? 0 : 1)
