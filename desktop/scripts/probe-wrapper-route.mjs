// 真机数据验证：把「包装路由」按新标记表归一后，检查定价/余额来源/独立 Key/看板统计
// 是否都能命中底层模型。用法：
//   node scripts/probe-wrapper-route.mjs [--home C:\Users\x\.dsh]
// 只读，不写任何文件。
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { activePatterns, normalizeProviderId, normalizeBindingKey, normalizePriceKey, canonicalId } from '../lib/wrapper.js';

const homeIdx = process.argv.indexOf('--home');
const dshHome = homeIdx > 0 ? process.argv[homeIdx + 1] : join(homedir(), '.dsh');
const dataRoot = join(dshHome, 'usage-meter');
const cfgPath = join(dataRoot, 'config.json');
const statsPath = join(dataRoot, 'stats.json');
if (!existsSync(cfgPath)) { console.log(`no config.json at ${cfgPath}`); process.exit(1); }
const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
const stats = existsSync(statsPath) ? JSON.parse(readFileSync(statsPath, 'utf8')) : {};
const apikeys = existsSync(join(dataRoot, 'apikeys')) ? readdirSync(join(dataRoot, 'apikeys')) : [];

const pats = activePatterns(undefined);
console.log(`patterns: ${pats.join(' | ')}\n`);

// 本机实测的包装提供商 → 底层提供商（来自 /api/usage-meter/models）。
const ROUTES = [
  ['modlens-deepseek-zgktz', 'deepseek-v4.1-flash-expires-on-0910'],
  ['modlens-deepseek-zgktz', 'deepseek-v4-flash'],
  ['modlens-openrouter', 'glm-5.2:free'],
  ['modlens-zai-coding-cn', 'glm-5.3'],
  ['deepseek-modlens', 'deepseek-v4-pro'],
  ['deepseek-modlens', 'deepseek-v4-flash'],
  ['vision-toolkit-deepseek-official', 'deepseek-v4-flash'],
];

let bad = 0;
for (const [pv, md] of ROUTES) {
  const base = normalizeProviderId(pv, pats);
  const sourceKey = normalizeBindingKey(`m:${pv}/${md}`, pats);
  const priceKey = normalizePriceKey(`${pv}/${md}`, pats);
  const safe = `${canonicalId(base)}__${canonicalId(md)}`;
  const hasSource = Object.prototype.hasOwnProperty.call(cfg.balanceSources ?? {}, sourceKey);
  const hasPrice = Object.prototype.hasOwnProperty.call(cfg.priceOverrides ?? {}, priceKey);
  const hasKeyFile = apikeys.includes(`${safe}.enc`);
  const sharedKey = (cfg.providers ?? {})[base]?.sharedApiKey === true;
  const statsKey = `${canonicalId(base)}/${canonicalId(md)}`;
  const statsHit = Object.prototype.hasOwnProperty.call(stats, statsKey);
  console.log(`${pv} → ${base}  ·  ${md}`);
  console.log(`  balanceSources[${sourceKey}] = ${hasSource ? cfg.balanceSources[sourceKey] : '(无)'}`);
  console.log(`  priceOverrides[${priceKey}] = ${hasPrice ? '有' : '(无)'}`);
  console.log(`  apikeys/${safe}.enc = ${hasKeyFile ? '有' : '(无)'}   provider.sharedApiKey = ${sharedKey}`);
  console.log(`  stats[${statsKey}] = ${statsHit ? '有' : '(无)'}`);
  const providerCfg = (cfg.providers ?? {})[base];
  const ok = base !== pv && base !== null && (providerCfg !== undefined || hasSource || hasPrice || hasKeyFile || sharedKey);
  if (!ok) { bad++; console.log('  ⚠️ 归一后仍无任何配置可命中'); }
  console.log('');
}
console.log(bad === 0 ? 'probe-wrapper-route: 全部包装路由都能命中底层配置 ✅' : `probe-wrapper-route: ${bad} 条未命中 ❌`);
process.exit(bad === 0 ? 0 : 1);
