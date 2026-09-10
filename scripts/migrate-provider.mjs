/**
 * One-shot migration: rename DSH provider `deepseek` → `deepseek-custom`.
 *
 * WHY: DSH normalizes provider ids to UPPERCASE credential names
 * (`DEEPSEEK_API_KEY`), so a custom provider named `deepseek` collides with
 * the official `deepseek-official`/`DeepSeek` credential slot — keys overwrite
 * each other and custom models end up using the official key.
 *
 * WHAT IT DOES (idempotent; safe to re-run):
 *   1. Refuses to run while `dsh web` is still running (config would be rewritten).
 *   2. Backs up every touched file to usage-meter/backup-provider-rename-<ts>/.
 *   3. settings.yaml: provider key `deepseek:` → `deepseek-custom:`, its
 *      `apiKeyEnv: DEEPSEEK_API_KEY` → `DEEPSEEK_CUSTOM_API_KEY`, and the two
 *      auxiliary references (dsh-auxiliary.compact / dsh-ears.polishing).
 *   4. .credentials.yaml: adds `DEEPSEEK_CUSTOM_API_KEY` = the key the user had
 *      stored for the custom provider (decrypted from the plugin's own
 *      apikeys/deepseek__deepseekv4flash.enc — plaintext is never printed).
 *   5. usage-meter/config.json: rewrites every `deepseek` token in keys and
 *      values (`deepseek/...`, `m:deepseek/...`, `p:deepseek`, providers key…)
 *      to `deepseek-custom`. `deepseek-official` and DEEPSEEK_API_KEY are protected.
 *   6. usage-meter/stats.json: same token rewrite (stats keys carry the provider id).
 *   7. usage-meter/apikeys/: renames `deepseek__*.enc` → `deepseekcustom__*.enc`.
 *
 * Run AFTER closing DSH:  node Z:\deepseek\dsh-usage-meter\scripts\migrate-provider.mjs
 */
import { readFileSync, writeFileSync, existsSync, renameSync, mkdirSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { createDecipheriv, createHash } from 'node:crypto';
import { execSync } from 'node:child_process';

const HOME = process.env.USERPROFILE ?? process.env.HOME;
const DSH_HOME = join(HOME, '.dsh');
const dataRoot = join(DSH_HOME, 'usage-meter');
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupDir = join(dataRoot, `backup-provider-rename-${stamp}`);

// ── 1) refuse to run while DSH is up ─────────────────────────────────────────
let dshUp = false;
try {
  const out = execSync('wmic process where "name=\'node.exe\'" get commandline', { encoding: 'utf8' });
  dshUp = /dsh[\\/]lib[\\/]bin\.js/i.test(out);
} catch { /* if wmic fails, assume not running */ }
if (dshUp) {
  console.error('[ABORT] DSH 仍在运行——请先完全退出 DSH（结束 node …\\dsh\\lib\\bin.js web 进程）再运行本脚本。');
  process.exit(1);
}

mkdirSync(backupDir, { recursive: true });
let changed = 0;
const bak = (p) => { if (existsSync(p)) writeFileSync(join(backupDir, basename(p)), readFileSync(p)); };

/** Replace `deepseek` tokens (not `deepseek-official`, not `deepseekv4…`,
 *  not `deepseek.com` API domain) in every string of a JSON tree — keys and values. */
const TOKEN = /deepseek(?![-_a-z0-9])(?!\.com)/gi;
function deepReplace(node) {
  if (typeof node === 'string') return node.replace(TOKEN, 'deepseek-custom');
  if (Array.isArray(node)) return node.map(deepReplace);
  if (node !== null && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k.replace(TOKEN, 'deepseek-custom')] = deepReplace(v);
    return out;
  }
  return node;
}

// ── 3) settings.yaml ──────────────────────────────────────────────────────────
const settingsPath = join(DSH_HOME, 'settings.yaml');
if (existsSync(settingsPath)) {
  bak(settingsPath);
  let s = readFileSync(settingsPath, 'utf8');
  const before = s;
  s = s.replace(/^(\s*)deepseek:\s*$/m, '$1deepseek-custom:');
  s = s.replace(/provider:\s*["']?deepseek["']?\s*$/gm, 'provider: deepseek-custom');
  s = s.replace(/apiKeyEnv:\s*DEEPSEEK_API_KEY\s*$/m, 'apiKeyEnv: DEEPSEEK_CUSTOM_API_KEY');
  if (s !== before) { writeFileSync(settingsPath, s); changed++; console.log('[OK] settings.yaml 已更新（提供方改名 + apiKeyEnv + 辅助引用）'); }
  else console.log('[SKIP] settings.yaml 无需改动（可能已迁移）');
} else console.log('[SKIP] settings.yaml 不存在');

// ── 4) .credentials.yaml：补 DEEPSEEK_CUSTOM_API_KEY ─────────────────────────
const credPath = join(DSH_HOME, '.credentials.yaml');
const encPath = join(dataRoot, 'apikeys', 'deepseek__deepseekv4flash.enc');
let customKey = null;
if (existsSync(encPath)) {
  const salt = readFileSync(join(dataRoot, 'salt'), 'utf8');
  const key = createHash('sha256').update(`dsh-usage-meter:${salt}`).digest();
  try {
    const [iv, dat] = readFileSync(encPath, 'utf8').split(':');
    const d = createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'base64'));
    customKey = Buffer.concat([d.update(Buffer.from(dat, 'base64')), d.final()]).toString('utf8');
  } catch { customKey = null; }
}
if (existsSync(credPath)) {
  bak(credPath);
  let c = readFileSync(credPath, 'utf8');
  if (/DEEPSEEK_CUSTOM_API_KEY/.test(c)) {
    console.log('[SKIP] .credentials.yaml 已含 DEEPSEEK_CUSTOM_API_KEY');
  } else if (customKey !== null) {
    c = c.replace(/^(refs:\s*)$/m, `refs:\n  DEEPSEEK_CUSTOM_API_KEY: ${customKey}`);
    writeFileSync(credPath, c);
    changed++;
    console.log('[OK] .credentials.yaml 已加入 DEEPSEEK_CUSTOM_API_KEY（取自你给自定义提供方填的 key，明文未打印）');
  } else {
    console.log('[WARN] 无法解密插件侧 key，.credentials.yaml 未改动——请手动在 refs 下加一行：DEEPSEEK_CUSTOM_API_KEY: sk-你的key');
  }
} else console.log('[SKIP] .credentials.yaml 不存在');

// ── 5) usage-meter/config.json ───────────────────────────────────────────────
const cfgPath = join(dataRoot, 'config.json');
if (existsSync(cfgPath)) {
  bak(cfgPath);
  const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
  writeFileSync(cfgPath, JSON.stringify(deepReplace(cfg), null, 2));
  changed++;
  console.log('[OK] usage-meter/config.json 键与值已迁移（providers/priceOverrides/balances/balanceSources/modelApiKeyFlags/thresholds）');
} else console.log('[SKIP] config.json 不存在');

// ── 6) usage-meter/stats.json ────────────────────────────────────────────────
const statsPath = join(dataRoot, 'stats.json');
if (existsSync(statsPath)) {
  bak(statsPath);
  const stats = JSON.parse(readFileSync(statsPath, 'utf8'));
  writeFileSync(statsPath, JSON.stringify(deepReplace(stats), null, 2));
  changed++;
  console.log('[OK] usage-meter/stats.json 键与 provider 值已迁移');
} else console.log('[SKIP] stats.json 不存在');

// ── 7) apikeys/*.enc 改名 ─────────────────────────────────────────────────────
const akDir = join(dataRoot, 'apikeys');
if (existsSync(akDir)) {
  for (const f of readdirSync(akDir)) {
    if (f.startsWith('deepseek__') && f.endsWith('.enc')) {
      const from = join(akDir, f);
      const to = join(akDir, f.replace(/^deepseek__/, 'deepseekcustom__'));
      bak(from);
      if (!existsSync(to)) { renameSync(from, to); changed++; console.log(`[OK] apikeys/${f} → ${f.replace(/^deepseek__/, 'deepseekcustom__')}`); }
      else console.log(`[SKIP] 目标已存在：${f.replace(/^deepseek__/, 'deepseekcustom__')}`);
    }
  }
} else console.log('[SKIP] apikeys 目录不存在');

console.log(`\n完成：${changed} 处改动。备份目录：${backupDir}`);
console.log('下一步：启动 DSH（dsh web），然后：');
console.log('  1) 设置 → 模型：确认 deepseek-custom 提供方存在且 key 与官方 DeepSeek 各自独立；');
console.log('  2) 用量计量 → 模型配置：供应商下拉里选 deepseek-custom，检查统计/定价/余额都在；');
console.log('  3) 用自定义模型发一条消息，确认余额正常显示且计费账户正确。');
