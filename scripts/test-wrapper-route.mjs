// 端到端验证「包装路由归一」：用真实的 lib/index.js（apply + 内部钩子）跑一遍，
// 覆盖三件事——
//   1. 运行期：包装提供商/模型 → 余额来源/独立 Key 安全键都归一到底层；
//   2. 持久化回填：老 config.json / stats.json 里的包装键迁移到底层键；
//   3. 逐行开关：关掉某行的标记后该行不再匹配（设置页开关是真生效的）。
// 用法：node scripts/test-wrapper-route.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-wrap-'));
process.env.DSH_HOME = home;
const dataRoot = path.join(home, 'usage-meter');
fs.mkdirSync(path.join(dataRoot, 'apikeys'), { recursive: true });

// 老数据：键全部是「包装提供商」形态（modlens-* / *-modlens / vision-toolkit-*）。
fs.writeFileSync(path.join(dataRoot, 'config.json'), JSON.stringify({
  providers: { 'modlens-openrouter': { currency: 'CNY', sharedBalance: true }, deepseek: { currency: 'CNY', sharedApiKey: true } },
  priceOverrides: { 'modlens-deepseek/deepseek-v4-flash': { prices: { inputPerM: 1, outputPerM: 2 } } },
  balances: { 'p:modlens-openrouter': { balance: 10, currency: 'CNY' } },
  balanceSources: { 'm:modlens-deepseek-zgktz/deepseek-v4-flash': 'deepseek', 'm:deepseek-modlens/deepseek-v4-pro': 'deepseek' },
  modelApiKeyFlags: { 'm:modlens-deepseek-zgktz/deepseek-v4-flash': true },
  thresholds: { 'p:modlens-openrouter': { budgetAlertPct: 42 }, 'm:modlens-deepseek-zgktz/deepseek-v4-flash': { balanceAlertFloor: 7 } },
}, null, 2), 'utf8');
fs.writeFileSync(path.join(dataRoot, 'stats.json'), JSON.stringify({
  'modlensdeepseekzgktz/deepseekv4flash': { provider: 'modlens-deepseek-zgktz', model: 'deepseek-v4-flash', requestCount: 2, inputTokens: 100, outputTokens: 200, cacheReadTokens: 0, cacheWriteTokens: 0, reasoningTokens: 0, cost: 1.5, inputCost: 1, cacheReadCost: 0, cacheWriteCost: 0, outputCost: 0.5, currency: 'CNY', updatedAt: 1 },
  'deepseekzgktz/deepseekv4flash': { provider: 'deepseek-zgktz', model: 'deepseek-v4-flash', requestCount: 1, inputTokens: 10, outputTokens: 20, cacheReadTokens: 0, cacheWriteTokens: 0, reasoningTokens: 0, cost: 0.5, inputCost: 0.2, cacheReadCost: 0, cacheWriteCost: 0, outputCost: 0.3, currency: 'CNY', updatedAt: 2 },
}, null, 2), 'utf8');

const { apply, __testInternals: TI } = await import('../lib/index.js');

let failures = 0;
function eq(id, label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id} ${label}: got=${JSON.stringify(actual)} want=${JSON.stringify(expected)}`);
}

// 最小 ctx：只需要 settings / sessionProjections / webServer / llm / effect / on。
let proj = null;
const ctx = {
  effect: () => () => {},
  on: () => {},
  settings: {
    register(_ns, _schema, { base } = {}) {
      let cfg = { ...(base ?? {}) };
      const scope = { get: () => cfg, update: async (p) => { cfg = { ...cfg, ...p }; }, watch: () => ({ dispose() {} }) };
      return scope;
    },
  },
  sessionProjections: { register(p) { proj = p; }, snapshot: () => ({ values: {} }) },
  webServer: { register() {} },
  llm: { listProviders: () => [], listModels: async () => [] },
};
apply(ctx, {});

// ── 1. 运行期归一 ────────────────────────────────────────────────────────────
eq('1a', 'modlens- 前缀 → 底层 provider', TI.underlyingProvider('modlens-deepseek-zgktz'), 'deepseek-zgktz');
eq('1b', '-modlens 后缀 → 底层 provider', TI.underlyingProvider('deepseek-modlens'), 'deepseek');
eq('1c', 'vision-toolkit- 前缀 → 底层 provider', TI.underlyingProvider('vision-toolkit-deepseek-official'), 'deepseek-official');
eq('1d', '底层 provider 不受影响', TI.underlyingProvider('deepseek-zgktz'), 'deepseek-zgktz');
eq('1e', '包装路由余额来源命中底层', TI.balanceSourceOf('modlens-deepseek-zgktz', 'deepseek-v4-flash'), 'deepseek');
eq('1f', '包装路由独立 Key 安全键归一', TI.modelSafeKey('modlens-deepseek-zgktz', 'deepseek-v4-flash'), 'deepseekzgktz__deepseekv4flash');
eq('1g', '包装模型名后缀归一', TI.modelBinding('deepseek', 'deepseek-v4-pro (modlens vision)'), { real: 'deepseek', model: 'deepseek-v4-pro' });

// ── 2. 持久化回填 ────────────────────────────────────────────────────────────
eq('2a', 'providers 键回填', Object.keys(TI.providerConfigsMap).sort(), ['deepseek', 'openrouter']);
eq('2b', 'providers 值保留', TI.providerConfigsMap.openrouter, { currency: 'CNY', sharedBalance: true });
eq('2c', 'balanceSources 回填', TI.balanceSourcesMap['m:deepseek-zgktz/deepseek-v4-flash'], 'deepseek');
eq('2d', '账本键回填', TI.balancesMap['p:openrouter'], { balance: 10, currency: 'CNY' });
eq('2d2', 'modelApiKeyFlags 回填', TI.modelApiKeyFlagsMap['m:deepseek-zgktz/deepseek-v4-flash'], true);
eq('2e', 'thresholds 供应商级回填', TI.thresholdsMap['p:openrouter'], { budgetAlertPct: 42 });
eq('2f', 'thresholds 模型级回填', TI.thresholdsMap['m:deepseek-zgktz/deepseek-v4-flash'], { balanceAlertFloor: 7 });
eq('2g', 'priceOverrides 键回填', Object.keys(TI.priceOverrides), ['deepseek/deepseek-v4-flash']);
eq('2h', 'stats 合并到同一底层模型', TI.statsMap['deepseekzgktz/deepseekv4flash'].cost, 2);
eq('2i', 'stats 旧键已移除', TI.statsMap['modlensdeepseekzgktz/deepseekv4flash'], undefined);

// ── 3. 逐行开关真正生效 ──────────────────────────────────────────────────────
eq('3a', '默认行表含 6 个标记', TI.wrapperRowList({}).length, 6);
eq('3b', '默认开启 -modlens 时命中底层', TI.balanceSourceOf('deepseek-modlens', 'deepseek-v4-pro'), 'deepseek');
{
  // 用行表把 -modlens 关掉（其余保持开启）后重新 apply。
  const rows = TI.wrapperRowList({}).map((r) => ({ ...r, enabled: r.pattern !== '-modlens' }));
  const ctx2 = { ...ctx, settings: { register: () => { const cfg = { wrapperMarkers: rows }; return { get: () => cfg, update: async () => {}, watch: () => ({ dispose() {} }) }; } } };
  apply(ctx2, {});
  eq('3c', '关闭 -modlens：deepseek-modlens 不再归一', TI.underlyingProvider('deepseek-modlens'), 'deepseek-modlens');
  eq('3d', '关闭 -modlens：modlens- 前缀仍生效', TI.underlyingProvider('modlens-openrouter'), 'openrouter');
}

// ── 4. 投影 view 对外报「底层」路由（弹窗/看板/显示名据此聚合） ──────────────
{
  const st = proj.apply(proj.init(), { type: 'request/header', time: Date.now(), data: { header: { config: { provider: 'modlens-deepseek-zgktz', model: 'deepseek-v4-flash' } } } });
  const v = proj.wire.view(st);
  eq('4a', 'view.provider 归一', v.provider, 'deepseek-zgktz');
  eq('4b', 'view.model 归一', v.model, 'deepseek-v4-flash');
  const st2 = proj.apply(proj.init(), { type: 'request/header', time: Date.now(), data: { header: { config: { provider: 'deepseek', model: 'deepseek-v4-pro (modlens vision)' } } } });
  const v2 = proj.wire.view(st2);
  eq('4c', 'view.model 剥模型名后缀', v2.model, 'deepseek-v4-pro');
  eq('4d', 'view.provider 保持不变', v2.provider, 'deepseek');
}

console.log(failures === 0 ? '\ntest-wrapper-route: ALL PASSED' : `\ntest-wrapper-route: ${failures} FAILED`);
fs.rmSync(home, { recursive: true, force: true });
process.exit(failures === 0 ? 0 : 1);
