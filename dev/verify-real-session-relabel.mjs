// 真实会话回放：把用户 80 轮的真实 v3 日志喂进 projection，验证
//   1) 切模型那一轮（第 80 轮）现在归到 deepseek-flash，而不再是上一轮的旧模型；
//   2) 有多少轮在旧实现下会被打上"上一轮的模型"（即本次修复影响的轮数）；
//   3) 真实数据里有多少轮是美元定价（旧实现恒记 CNY → 显示总额不换算）。
// 用法：node dev/verify-real-session-relabel.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-verify-'));
process.env.DSH_HOME = home;

const { apply, __testInternals: TI } = await import('../lib/index.js');
let proj = null;
const ctx = {
  effect: () => () => {},
  on: () => {},
  settings: { register(_ns, _schema, { base } = {}) { let cfg = { ...(base ?? {}) }; return { get: () => cfg, update: async () => {}, watch: () => ({ dispose() {} }) }; } },
  sessionProjections: { register(p) { proj = p; }, snapshot: () => ({ values: {} }) },
  webServer: { register() {} },
  llm: { listProviders: () => [], listModels: async () => [] },
};
apply(ctx, {});

// 用用户真实价目覆盖，保证币种/费用判断与线上一致。
const realCfg = JSON.parse(fs.readFileSync('C:/Users/faith/.dsh/usage-meter/config.json', 'utf8'));
for (const [k, v] of Object.entries(realCfg.priceOverrides ?? {})) TI.priceOverrides[k] = v;
TI.applyPriceOverrides();
for (const [p, c] of Object.entries(realCfg.providerConfigs ?? {})) TI.providerConfigsMap[p] = c;
if (realCfg.usdToCny !== undefined) TI.currentPrices.usdToCny = realCfg.usdToCny;

const side = path.join(os.tmpdir(), 'dsh-session-v3.jsonl');
const evs = [];
for (const l of fs.readFileSync(side, 'utf8').split('\n')) { if (!l.trim()) continue; try { evs.push(JSON.parse(l)); } catch { /* tail */ } }

// 旧实现等价物：旧代码的 state.provider/model 只被 request/header 更新（model/selection
// 被忽略），所以「旧实现建桶时打的值」= 最近一条 header 的模型（忽略 sparse 的 selection）。
let st = proj.init();
const oldLabel = new Map();
const relabels = [];
let legacy = { provider: null, model: null };
for (const e of evs) {
  if (e.type === 'turn/start') oldLabel.set(e.data.turn, `${legacy.provider}/${legacy.model}`);
  if (e.type === 'request/header') {
    const c = e.data?.header?.config;
    if (c?.provider != null || c?.model != null) legacy = { provider: c.provider ?? null, model: c.model ?? null };
  }
  st = proj.apply(st, e);
}
const v = proj.wire.view(st);
console.log(`事件 ${evs.length} 条 → 回合 ${v.turns.length} 个\n`);
console.log('轮次 | 新实现归因                        | 旧实现归因                        | 币种 | 费用');
for (const t of v.turns) {
  const old = oldLabel.get(t.turn) ?? '-';
  const now = `${t.provider}/${t.model}`;
  const cur = t.currency ?? '?';
  const changed = old !== now;
  if (changed) relabels.push(t.turn);
  if (t.turn >= v.turns.length - 6 || changed) {
    console.log(`${String(t.turn).padStart(4)} | ${now.padEnd(33)} | ${old.padEnd(33)} | ${cur}  | ${t.cost.toFixed(4)}${changed ? '  ← 修复' : ''}`);
  }
}
console.log(`\n归因被修正的轮次（旧实现打的是上一轮模型）：${relabels.length} 个 → ${relabels.join(', ')}`);
const t80 = v.turns.find((t) => t.turn === 80);
console.log(`第 80 轮：新实现 ${t80.provider}/${t80.model}｜旧实现 ${oldLabel.get(80)}`);
const usd = v.turns.filter((t) => t.currency === 'USD');
console.log(`美元定价的轮次：${usd.length} 个（旧实现全部记 CNY → 总额少换算一个汇率）`);
console.log(`本轮对话总额 estimatedCost = ${v.estimatedCost.toFixed(4)} ${v.currency}`);
const byCur = {};
for (const t of v.turns) byCur[t.currency] = (byCur[t.currency] ?? 0) + t.cost;
console.log('各币种原币金额合计:', JSON.stringify(Object.fromEntries(Object.entries(byCur).map(([k, x]) => [k, +x.toFixed(4)]))));
fs.rmSync(home, { recursive: true, force: true });
