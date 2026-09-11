// 端到端回归：用量**看板统计**与**峰谷定价**的账目正确性（驱动真实的 lib/index.js）。
// 覆盖 5 类曾存在的漏计/错计：
//   1. 新 step 首条样本小于上一步末条样本 → 增量被 clamp 成 0，该段用量永久漏计；
//   2. 会话中途切模型 → 看板该会话此后全部样本被丢（早退且基线永不更新）；
//   3. 相邻两步 usage 恰好全等 → 后者被误判为重复样本；
//   4. 看板用 usage 事件时刻定峰谷价（钱包用 step 起始时刻）→ 跨界请求两本账不一致；
//   5. 退化窗口 start===end → 全天按峰价（resolvePricingForTime / peakActiveBJ）。
// 用法：node scripts/test-usage-accounting.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-usage-'));
process.env.DSH_HOME = home;
const dataRoot = path.join(home, 'usage-meter');
fs.mkdirSync(path.join(dataRoot, 'apikeys'), { recursive: true });

// 测试用价目表：alpha/beta 平价，peaky 走峰谷（峰 = 谷的 10 倍，便于区分）。
fs.writeFileSync(path.join(dataRoot, 'config.json'), JSON.stringify({
  priceOverrides: {
    'acme/alpha': { prices: { inputPerM: 1, outputPerM: 10, currency: 'CNY' } },
    'acme/beta': { prices: { inputPerM: 2, outputPerM: 20, currency: 'CNY' } },
    'acme/peaky': {
      prices: {
        inputPerM: 1, outputPerM: 10, currency: 'CNY',
        peak: { inputPerM: 10, outputPerM: 100 },
        offPeak: { inputPerM: 1, outputPerM: 10 },
        peakDays: [0, 1, 2, 3, 4, 5, 6],
        peakWindows: [{ start: 540, end: 720 }], // 北京 9:00-12:00
      },
    },
    'acme/usd': { prices: { inputPerM: 1, outputPerM: 10, currency: 'USD' } },
  },
}, null, 2), 'utf8');

const { apply, __testInternals: TI } = await import('../lib/index.js');
const { resolvePricingForTime } = await import('../lib/prices.js');

let failures = 0;
function eq(id, label, actual, expected, eps = 0) {
  const ok = typeof actual === 'number' && typeof expected === 'number' && eps > 0
    ? Math.abs(actual - expected) <= eps
    : JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id} ${label}: got=${JSON.stringify(actual)} want=${JSON.stringify(expected)}`);
}

// 最小 ctx：捕获 session/event 处理器（顺序 = 注册顺序 = 生产顺序），
// sessionProjections.snapshot 返回一个可变的「当前 view」。
const handlers = [];
let proj = null;
const view = { provider: 'acme', model: 'alpha' };
const ctx = {
  effect: () => () => {},
  on: (name, fn) => { if (name === 'session/event') handlers.push(fn); },
  settings: {
    register(_ns, _schema, { base } = {}) {
      let cfg = { ...(base ?? {}) };
      const scope = { get: () => cfg, update: async (p) => { cfg = { ...cfg, ...p }; }, watch: () => ({ dispose() {} }) };
      return scope;
    },
  },
  sessionProjections: { register(p) { proj = p; }, snapshot: () => ({ values: { usageCost: { provider: view.provider, model: view.model } } }) },
  webServer: { register() {} },
  llm: { listProviders: () => [], listModels: async () => [] },
};
apply(ctx, {});
eq('0a', '注册到 2 个 session/event 处理器（看板 + 钱包）', handlers.length, 2);

const emit = (session, event) => { for (const h of handlers) h(session, event); };
const chunk = (time, turn, step, inputTokens, outputTokens) => ({ type: 'assistant/chunk', time, data: { turn, step, chunk: { type: 'usage', usage: { inputTokens, outputTokens } } } });
const bucket = (p, m) => Object.values(TI.statsMap).find((s) => s.provider === p && s.model === m);
/** [input, output] 或 null（桶不存在时不抛异常，便于对旧实现取证）。 */
const tok = (p, m) => { const b = bucket(p, m); return b === undefined ? null : [b.inputTokens, b.outputTokens]; };

// ── 1. 分步增量：新 step 的首条样本必须整条计入 ──────────────────────────────
{
  const s = {};
  const t = Date.UTC(2026, 0, 5, 1, 0, 0);
  emit(s, { type: 'step/start', time: t, data: { turn: 1, step: 1 } });
  emit(s, chunk(t, 1, 1, 1000, 100));
  emit(s, chunk(t, 1, 1, 1000, 100)); // 同步重复样本 → 去重
  eq('1a', 'step1 计入 1000/100（重复样本去重）', tok('acme', 'alpha'), [1000, 100]);

  emit(s, { type: 'step/start', time: t + 1000, data: { turn: 1, step: 2 } });
  emit(s, chunk(t + 1000, 1, 2, 50, 5)); // 新 step 首条样本 < 上一步末条样本
  eq('1b', 'step2 首条样本整条计入（旧实现丢 50/5）', tok('acme', 'alpha'), [1050, 105]);
  emit(s, chunk(t + 1000, 1, 2, 80, 8)); // 同一步内增长 → 只加增量 30/3
  eq('1c', 'step2 同一步增长只加增量', tok('acme', 'alpha'), [1080, 108]);
}

// ── 2. 会话中途切模型：切后用量必须继续累计（旧实现该会话永久停摆） ──────────
{
  const s = {};
  const t = Date.UTC(2026, 0, 6, 1, 0, 0);
  view.provider = 'acme'; view.model = 'alpha';
  emit(s, { type: 'step/start', time: t, data: { turn: 1, step: 1 } });
  emit(s, chunk(t, 1, 1, 100, 10));               // 同一会话先按 alpha 记一笔
  view.model = 'beta';                            // ← 中途切模型
  emit(s, { type: 'step/start', time: t + 1000, data: { turn: 1, step: 2 } });
  emit(s, chunk(t + 1000, 1, 2, 200, 20));
  eq('2a', '切换后的模型首条样本计入（旧实现整段丢失）', tok('acme', 'beta'), [200, 20]);
  emit(s, chunk(t + 1000, 1, 2, 300, 30)); // 同一步继续增长
  eq('2b', '切换后同一步增长继续累计', tok('acme', 'beta'), [300, 30]);
  emit(s, { type: 'step/start', time: t + 2000, data: { turn: 1, step: 3 } });
  emit(s, chunk(t + 2000, 1, 3, 5, 1));    // 再新一步，仍归 beta
  eq('2c', '切换后的后续步骤持续累计（旧实现永久停摆）', tok('acme', 'beta'), [305, 31]);
}

// ── 3. 相邻两步 usage 恰好全等：都要计入 ────────────────────────────────────
{
  const s = {};
  view.provider = 'acme'; view.model = 'alpha';
  const t = Date.UTC(2026, 0, 7, 1, 0, 0);
  const before = bucket('acme', 'alpha').inputTokens;
  for (const step of [1, 2]) {
    emit(s, { type: 'step/start', time: t + step * 1000, data: { turn: 9, step } });
    emit(s, chunk(t + step * 1000, 9, step, 7, 7));
  }
  eq('3a', '两步全等样本各计一次（旧实现丢第二步）', bucket('acme', 'alpha').inputTokens - before, 14);
}

// ── 4. 峰谷定价：看板与钱包都用 step 起始时刻（跨边界请求） ────────────────────
{
  const s = {};
  view.provider = 'acme'; view.model = 'peaky';
  const stepStart = Date.UTC(2026, 0, 5, 2, 0, 0);   // 北京周一 10:00（峰）
  const usageAt = Date.UTC(2026, 0, 5, 4, 30, 0);    // 北京周一 12:30（谷）
  emit(s, { type: 'step/start', time: stepStart, data: { turn: 3, step: 1 } });
  emit(s, chunk(usageAt, 3, 1, 1_000_000, 0));       // 1M 输入：峰价 10 元 / 谷价 1 元
  eq('4a', '看板按 step 起始时刻取峰价（旧实现取事件时刻 = 1）', bucket('acme', 'peaky').cost, 10, 1e-9);

  // 同一条请求走 projection 折叠（钱包侧账本）→ 两本账必须一致
  let st = proj.init();
  st = proj.apply(st, { type: 'request/header', time: stepStart, data: { header: { config: { provider: 'acme', model: 'peaky' } } } });
  st = proj.apply(st, { type: 'turn/start', time: stepStart, data: { turn: 3 } });
  st = proj.apply(st, { type: 'step/start', time: stepStart, data: { turn: 3, step: 1 } });
  st = proj.apply(st, chunk(usageAt, 3, 1, 1_000_000, 0));
  const v = proj.wire.view(st);
  const turnCost = v.turns[v.turns.length - 1].cost;
  eq('4b', '钱包回合费用同为峰价', turnCost, 10, 1e-9);
  eq('4c', '两本账一致', turnCost, bucket('acme', 'peaky').cost, 1e-9);
  eq('4d', '回合徽章标峰', v.turns[v.turns.length - 1].peak, true);
}

// ── 5. 退化峰谷窗口（start===end）不得铺满全天；正常/环绕窗口不受影响 ─────────
{
  const base = {
    inputPerM: 1, outputPerM: 10,
    peak: { inputPerM: 10, outputPerM: 100 },
    offPeak: { inputPerM: 1, outputPerM: 10 },
    peakDays: [0, 1, 2, 3, 4, 5, 6],
  };
  const bj10 = Date.UTC(2026, 0, 5, 2, 0, 0);   // 北京 10:00
  const bj23 = Date.UTC(2026, 0, 5, 15, 0, 0);  // 北京 23:00
  const bj00 = Date.UTC(2026, 0, 5, 17, 0, 0);  // 北京次日 01:00

  const degenerate = { ...base, peakWindows: [{ start: 540, end: 540 }] };
  eq('5a', '退化窗口 [540,540) → 谷价（旧实现全天峰价）', resolvePricingForTime(degenerate, bj10).inputPerM, 1);

  const normal = { ...base, peakWindows: [{ start: 540, end: 720 }] };
  eq('5b', '正常窗口内 → 峰价', resolvePricingForTime(normal, bj10).inputPerM, 10);
  eq('5c', '正常窗口外 → 谷价', resolvePricingForTime(normal, bj23).inputPerM, 1);

  const wrap = { ...base, peakWindows: [{ start: 1320, end: 120 }] }; // 22:00-02:00
  eq('5d', '环绕窗口前半段 → 峰价', resolvePricingForTime(wrap, bj23).inputPerM, 10);
  eq('5e', '环绕窗口后半段 → 峰价', resolvePricingForTime(wrap, bj00).inputPerM, 10);
}

// ── 6. 桶币种不被后续 pricing 重新打标 ──────────────────────────────────────
{
  const s = {};
  view.provider = 'acme'; view.model = 'alpha';
  const t = Date.UTC(2026, 0, 8, 1, 0, 0);
  emit(s, { type: 'step/start', time: t, data: { turn: 11, step: 1 } });
  emit(s, chunk(t, 11, 1, 10, 1));
  eq('6a', '首条样本币种 = CNY', bucket('acme', 'alpha').currency, 'CNY');
  TI.priceOverrides['acme/alpha'].prices.currency = 'USD';
  TI.applyPriceOverrides();
  emit(s, { type: 'step/start', time: t + 1000, data: { turn: 11, step: 2 } });
  emit(s, chunk(t + 1000, 11, 2, 10, 2)); // 与上一步不同 → 旧实现会走到覆盖币种那行
  eq('6b', '后续样本不改写已累计桶的币种（旧实现变 USD）', bucket('acme', 'alpha').currency, 'CNY');
}

// ── 7. 回合归因模型：turn/start 先于本回合 header 到达 ──────────────────────
// 真实日志顺序（实测同一毫秒内亦然）：model/selection → turn/start → step/start → header。
// 旧实现忽略 model/selection，turn/start 时 state 仍是「上一回合的模型」→ 刚切完模型的
// 那一轮整轮显示旧模型（用户实测：切到 deepseek-flash 后第 80 轮仍显示 Qwen3.8-27B）。
{
  const t0 = Date.UTC(2026, 0, 9, 1, 0, 0);
  const hdr = (cfg, time) => ({ type: 'request/header', time, data: { header: { config: cfg } } });
  const use = (turn, time, inputTokens, outputTokens) => ({ type: 'assistant/message', time, data: { turn, step: 1, usage: { inputTokens, outputTokens } } });
  const A = { provider: 'acme', model: 'alpha' };
  const B = { provider: 'acme', model: 'beta' };
  const G = { provider: 'acme', model: 'gamma' };
  let st = proj.init();
  st = proj.apply(st, { type: 'turn/start', time: t0, data: { turn: 1 } });
  st = proj.apply(st, hdr(A, t0 + 10));
  st = proj.apply(st, use(1, t0 + 20, 100, 10));
  let v = proj.wire.view(st);
  eq('7a', '回合1 归因 alpha', v.turns[0].model, 'alpha');

  st = proj.apply(st, { type: 'model/selection', time: t0 + 30, data: B }); // ← 用户切模型
  st = proj.apply(st, { type: 'turn/start', time: t0 + 40, data: { turn: 2 } });
  st = proj.apply(st, hdr(B, t0 + 50));
  st = proj.apply(st, use(2, t0 + 60, 200, 20));
  v = proj.wire.view(st);
  eq('7b', '切模型后新回合归因 beta（旧实现沿用 alpha）', v.turns[1].model, 'beta');
  eq('7c', '上一回合标签不受影响', v.turns[0].model, 'alpha');

  // 只有 header（无 model/selection）的切换：本回合第一个请求仍未定标 → 必须认它
  st = proj.apply(st, { type: 'turn/start', time: t0 + 70, data: { turn: 3 } });
  st = proj.apply(st, hdr(G, t0 + 80));
  st = proj.apply(st, use(3, t0 + 90, 300, 30));
  v = proj.wire.view(st);
  eq('7d', '仅 header 的切换也归到本回合首个请求（旧实现沿用 beta）', v.turns[2].model, 'gamma');

  // 中途切模型（本回合已有用量）→ 归因不回写（v2.0.14 语义必须保住）
  st = proj.apply(st, { type: 'turn/start', time: t0 + 100, data: { turn: 4 } });
  st = proj.apply(st, hdr(G, t0 + 110));
  st = proj.apply(st, use(4, t0 + 120, 400, 40));
  st = proj.apply(st, hdr({ provider: 'acme', model: 'delta' }, t0 + 130));
  st = proj.apply(st, use(4, t0 + 140, 500, 50));
  v = proj.wire.view(st);
  eq('7e', '回合中途切模型不回写归因（v2.0.14）', v.turns[3].model, 'gamma');
  eq('7f', '中途切模型后后续用量仍计入原回合（同 step 为增量 500）', v.turns[3].inputTokens, 500);
}

// ── 8. 回合币种 = 首个计费用量的定价币种（旧实现恒 CNY，美元回合不换算） ─────
{
  const t0 = Date.UTC(2026, 0, 10, 1, 0, 0);
  TI.providerConfigsMap['acme'] = { currency: 'CNY' }; // 显示币种 = CNY
  TI.currentPrices.usdToCny = 7.2;
  let st = proj.init();
  st = proj.apply(st, { type: 'turn/start', time: t0, data: { turn: 1 } });
  st = proj.apply(st, { type: 'request/header', time: t0 + 10, data: { header: { config: { provider: 'acme', model: 'usd' } } } });
  st = proj.apply(st, { type: 'assistant/message', time: t0 + 20, data: { turn: 1, step: 1, usage: { inputTokens: 1_000_000, outputTokens: 0 } } });
  const v = proj.wire.view(st);
  eq('8a', '美元定价回合币种 = USD（旧实现 CNY）', v.turns[0].currency, 'USD');
  eq('8b', '回合费用按定价币种计（1 USD）', v.turns[0].cost, 1, 1e-9);
  eq('8c', '会话总额换算到显示币种 CNY（1×7.2）', v.estimatedCost, 7.2, 1e-9);
}

console.log(failures === 0 ? '\ntest-usage-accounting: ALL PASSED' : `\ntest-usage-accounting: ${failures} FAILED`);fs.rmSync(home, { recursive: true, force: true });
process.exit(failures === 0 ? 0 : 1);
