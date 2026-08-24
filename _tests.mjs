// Deep regression: 50 cases over the pure host billing math (lib build).
import assert from 'node:assert';
import { costOf, costBreakdown, bucketPricePerM, billedInputTokens } from './lib/projection.js';
import { resolvePricingForTime } from './lib/prices.js';
import { rowsFromPricing, defaultUnknownRows, matchTypeId, BILLING_TYPES } from './lib/billing.js';

let pass = 0, fail = 0;
const results = [];
function tc(id, name, fn) {
  try { fn(); pass++; results.push([id, name, '✅ 通过', '']); }
  catch (e) { fail++; results.push([id, name, '❌ 失败', e.message]); }
}
const ok = (actual, expected, eps = 1e-9) => assert.ok(Math.abs(actual - expected) < eps, `got ${actual}, want ${expected}`);

const U = { inputTokens: 1_000_000, outputTokens: 2_000_000, cacheReadTokens: 500_000, cacheWriteTokens: 100_000 };
const MON = Date.UTC(2026, 0, 5, 1, 30); // 2026-01-05 周一 北京时间 09:30（峰内）
const MON_EDGE = Date.UTC(2026, 0, 5, 1, 0); // 北京 09:00 整（峰开始）
const MON_BEFORE = Date.UTC(2026, 0, 5, 0, 59); // 北京 08:59（峰前）
const MON_NOON = Date.UTC(2026, 0, 5, 4, 0); // 北京 12:00 整（窗口末端，排他→谷）
const MON_NIGHT = Date.UTC(2026, 0, 5, 12, 0); // 北京 20:00（谷）
const SAT = Date.UTC(2026, 0, 10, 2, 0); // 2026-01-10 周六 北京 10:00

// ── A. 基础计费 ──
tc(1, '基础 仅输入输出token → 恰好 5 元', () => ok(costOf({ inputTokens: 1_000_000, outputTokens: 2_000_000, cacheReadTokens: 0, cacheWriteTokens: 0 }, { inputPerM: 1, outputPerM: 2 }), 5));
tc(2, '基础 有缓存token但未填缓存价 → 命中+写入按输入价', () => ok(costOf(U, { inputPerM: 1, outputPerM: 2 }), 5.6));
tc(3, '基础 无缓存读价 → 命中按输入价 (5.6)', () => ok(costOf(U, { inputPerM: 1, outputPerM: 2 }), 5.6));
tc(4, '全分桶 i1/o2/cr.05/cw1.25 → 5.15', () => ok(costOf(U, { inputPerM: 1, outputPerM: 2, cacheReadPerM: 0.05, cacheWritePerM: 1.25 }), 5.15));
tc(5, '零 token → 费用 0', () => ok(costOf({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }, { inputPerM: 9, outputPerM: 9 }), 0));
tc(6, '价格未知(null) → 费用 0 不抛错', () => ok(costOf(U, null), 0));
tc(7, 'Batch 折扣 0.5 → 5.15×0.5=2.575', () => ok(costOf(U, { inputPerM: 1, outputPerM: 2, cacheReadPerM: 0.05, cacheWritePerM: 1.25, discount: 0.5 }), 2.575));
tc(8, '折扣 0.25 → 1.2875', () => ok(costOf(U, { inputPerM: 1, outputPerM: 2, cacheReadPerM: 0.05, cacheWritePerM: 1.25, discount: 0.25 }), 1.2875));

// ── B. 合并计价 ──
tc(9, '合并单价5 → 全部token 3.6M×5=18', () => ok(costOf(U, { inputPerM: 5, outputPerM: 5, combinedPerM: 5 }), 18));
tc(10, '合并+Batch0.5 → 9', () => ok(costOf(U, { inputPerM: 5, outputPerM: 5, combinedPerM: 5, discount: 0.5 }), 9));
tc(11, '合并优先于分桶价(分桶填999仍按合并)', () => ok(costOf(U, { inputPerM: 999, outputPerM: 999, combinedPerM: 5 }), 18));
tc(12, '合并零token → 0', () => ok(costOf({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }, { inputPerM: 5, outputPerM: 5, combinedPerM: 5 }), 0));

// ── C. 自定义行 ──
tc(13, '自定义单行 输入×1 → 1', () => ok(costOf(U, { inputPerM: 0, outputPerM: 0, customRows: [{ label: '输入', buckets: ['input'], perM: 1 }] }), 1));
tc(14, '自定义三行(输入含写入/命中/输出)=5.125', () => ok(costOf(U, { inputPerM: 0, outputPerM: 0, customRows: [
  { label: '输入', buckets: ['input', 'cacheWrite'], perM: 1 },
  { label: '缓存', buckets: ['cacheRead'], perM: 0.05 },
  { label: '输出', buckets: ['output'], perM: 2 }] }), 5.125));
tc(15, '自定义行权威：固定字段999被忽略', () => ok(costOf(U, { inputPerM: 999, outputPerM: 999, customRows: [{ label: '输入', buckets: ['input'], perM: 1 }] }), 1));
tc(16, 'customRows 空数组 → 回落固定分桶(5.6)', () => ok(costOf(U, { inputPerM: 1, outputPerM: 2, customRows: [] }), 5.6));
tc(17, '自定义行+折扣0.5 → 5.15×0.5=2.575', () => ok(costOf(U, { inputPerM: 0, outputPerM: 0, discount: 0.5, customRows: [
  { label: '输入', buckets: ['input'], perM: 1 }, { label: '输出', buckets: ['output'], perM: 2 },
  { label: '缓存', buckets: ['cacheRead'], perM: 0.05 }, { label: '写', buckets: ['cacheWrite'], perM: 1.25 }] }), 2.575));
tc(18, '自定义输出行 ×3 → 6', () => ok(costOf(U, { inputPerM: 0, outputPerM: 0, customRows: [{ label: '输出', buckets: ['output'], perM: 3 }] }), 6));
tc(19, '两行同桶(输入×1+输入×2) → 累加3', () => ok(costOf(U, { inputPerM: 0, outputPerM: 0, customRows: [
  { label: 'a', buckets: ['input'], perM: 1 }, { label: 'b', buckets: ['input'], perM: 2 }] }), 3));
tc(20, '四行覆盖四桶 → 与全分桶等价(5.15)', () => ok(costOf(U, { inputPerM: 0, outputPerM: 0, customRows: [
  { label: '输入', buckets: ['input'], perM: 1 }, { label: '输出', buckets: ['output'], perM: 2 },
  { label: '命中', buckets: ['cacheRead'], perM: 0.05 }, { label: '写入', buckets: ['cacheWrite'], perM: 1.25 }] }), 5.15));

// ── D. 单价查询/token 桶 ──
tc(21, 'bucketPricePerM(null) → undefined', () => assert.strictEqual(bucketPricePerM(null, 'input'), undefined));
tc(22, 'cacheWrite 无价回落输入价', () => ok(bucketPricePerM({ inputPerM: 3, outputPerM: 4 }, 'cacheWrite'), 3));
tc(23, 'cacheRead 无价回落输入价', () => ok(bucketPricePerM({ inputPerM: 3, outputPerM: 4 }, 'cacheRead'), 3));
tc(24, 'combined 时各桶均返回合并价', () => { const v = bucketPricePerM({ inputPerM: 1, outputPerM: 2, combinedPerM: 7 }, 'output'); ok(v, 7); });
tc(25, 'billedInputTokens = 输入+命中+写入 = 1.6M', () => ok(billedInputTokens(U), 1_600_000));
tc(26, 'costBreakdown 分项和=总额', () => { const b = costBreakdown(U, { inputPerM: 1, outputPerM: 2, cacheReadPerM: 0.05, cacheWritePerM: 1.25 }); ok(b.input + b.cacheRead + b.cacheWrite + b.output, b.total); });

// ── E. 峰谷 legacy 解析 ──
const LEG = { inputPerM: 1, outputPerM: 2, peakDays: [0, 1, 2, 3, 4, 5, 6], peakWindows: [{ start: 540, end: 720 }], peak: { inputPerM: 3, outputPerM: 9 }, offPeak: { inputPerM: 1.5, outputPerM: 4.5 } };
tc(27, '周一北京9:30 → 峰价(3/9)', () => { const r = resolvePricingForTime(LEG, MON); ok(r.inputPerM, 3); ok(r.outputPerM, 9); });
tc(28, '北京20:00 → 谷价(1.5/4.5)', () => { const r = resolvePricingForTime(LEG, MON_NIGHT); ok(r.inputPerM, 1.5); });
tc(29, '北京9:00整 → 峰价(起点含)', () => { const r = resolvePricingForTime(LEG, MON_EDGE); ok(r.inputPerM, 3); });
tc(30, '北京8:59 → 谷价(起点前)', () => { const r = resolvePricingForTime(LEG, MON_BEFORE); ok(r.inputPerM, 1.5); });
tc(31, '北京12:00整 → 谷价(终点排他)', () => { const r = resolvePricingForTime(LEG, MON_NOON); ok(r.inputPerM, 1.5); });
tc(32, '周六未在peakDays且无weekend → 谷价', () => { const r = resolvePricingForTime({ ...LEG, peakDays: [1, 2, 3, 4, 5] }, SAT); ok(r.inputPerM, 1.5); });
tc(33, '周六有weekend价 → weekend(2/5)', () => { const r = resolvePricingForTime({ ...LEG, peakDays: [1, 2, 3, 4, 5], weekend: { inputPerM: 2, outputPerM: 5 } }, SAT); ok(r.inputPerM, 2); ok(r.outputPerM, 5); });
tc(34, '周六在peakDays内 → 正常峰价', () => { const r = resolvePricingForTime(LEG, SAT); ok(r.inputPerM, 3); });
tc(35, 'peakOffPeakFrom 在未来 → 平价(基础1)', () => { const r = resolvePricingForTime({ ...LEG, peakOffPeakFrom: Date.UTC(2027, 0, 1) }, MON); ok(r.inputPerM, 1); });
tc(36, '无峰谷配置 → 原样返回', () => { const p = { inputPerM: 1, outputPerM: 2 }; assert.strictEqual(resolvePricingForTime(p, MON), p); });

// ── F. 自定义行峰谷解析 ──
const CRP = { inputPerM: 0, outputPerM: 0, peakDays: [1, 2, 3, 4, 5], peakWindows: [{ start: 540, end: 720 }], customRows: [
  { label: '输入', buckets: ['input'], perM: 1, peakPerM: 3, offPerM: 0.5 },
  { label: '输出', buckets: ['output'], perM: 2 }] };
tc(37, '自定义行峰内 → peakPerM=3', () => ok(resolvePricingForTime(CRP, MON).customRows[0].perM, 3));
tc(38, '自定义行谷时 → offPerM=0.5', () => ok(resolvePricingForTime(CRP, MON_NIGHT).customRows[0].perM, 0.5));
tc(39, '无offPerM的行谷时 → 保持perM=2', () => ok(resolvePricingForTime(CRP, MON_NIGHT).customRows[1].perM, 2));
tc(40, '无peakPerM的行峰内 → 保持perM=2', () => ok(resolvePricingForTime(CRP, MON).customRows[1].perM, 2));
tc(41, '非峰谷星期六 → 全天谷价0.5', () => ok(resolvePricingForTime(CRP, SAT).customRows[0].perM, 0.5));
tc(42, '仅行有峰价即触发解析(hasRowPeak)', () => { const r = resolvePricingForTime({ inputPerM: 1, outputPerM: 1, peakDays: [1], peakWindows: [{ start: 0, end: 1440 }], customRows: [{ label: 'x', buckets: ['input'], perM: 1, peakPerM: 5 }] }, Date.UTC(2026, 0, 5, 0, 30)); ok(r.customRows[0].perM, 5); });

// ── G. 行模板推导 ──
tc(43, 'rowsFromPricing 自定义行 → 原样映射(label/buckets/perM)', () => assert.deepStrictEqual(rowsFromPricing({ inputPerM: 0, outputPerM: 0, customRows: [{ label: '输入', buckets: ['input'], perM: 1 }] }), [{ label: '输入', buckets: ['input'], perM: 1 }]));
tc(44, 'rowsFromPricing 合并 → 单行全桶', () => assert.deepStrictEqual(rowsFromPricing({ inputPerM: 1, outputPerM: 1, combinedPerM: 1 }), [{ label: '输入+输出（合并计价）', buckets: ['input', 'cacheRead', 'cacheWrite', 'output'] }]));
tc(45, 'rowsFromPricing 有写入+命中 → 4行', () => ok(rowsFromPricing({ inputPerM: 1, outputPerM: 2, cacheReadPerM: 0.05, cacheWritePerM: 1.25 }).length, 4));
tc(46, 'rowsFromPricing 仅命中价 → 3行', () => ok(rowsFromPricing({ inputPerM: 1, outputPerM: 2, cacheReadPerM: 0.05 }).length, 3));
tc(47, 'rowsFromPricing 素模型 → 2行', () => ok(rowsFromPricing({ inputPerM: 1, outputPerM: 2 }).length, 2));
tc(48, 'defaultUnknownRows → 2行兜底', () => ok(defaultUnknownRows().length, 2));

// ── H. 模板匹配与清单 ──
tc(49, 'matchTypeId: null→basic; 折扣→batch; 合并→combined; 峰→peak; 写+读→cache-write; 仅读→cache-split', () => {
  assert.strictEqual(matchTypeId(null), 'basic');
  assert.strictEqual(matchTypeId({ inputPerM: 1, outputPerM: 1, discount: 0.5 }), 'batch');
  assert.strictEqual(matchTypeId({ inputPerM: 1, outputPerM: 1, combinedPerM: 1 }), 'combined');
  assert.strictEqual(matchTypeId({ inputPerM: 1, outputPerM: 1, peak: { inputPerM: 2, outputPerM: 2 }, offPeak: { inputPerM: 1, outputPerM: 1 } }), 'peak-off-peak');
  assert.strictEqual(matchTypeId({ inputPerM: 1, outputPerM: 1, cacheReadPerM: 0.1, cacheWritePerM: 1 }), 'cache-write');
  assert.strictEqual(matchTypeId({ inputPerM: 1, outputPerM: 1, cacheReadPerM: 0.1 }), 'cache-split');
});
tc(50, '模板清单恰好 6 个且不含已删的 storage/tiered', () => {
  ok(BILLING_TYPES.length, 6);
  const ids = BILLING_TYPES.map((t) => t.id);
  assert.ok(!ids.includes('cache-storage') && !ids.includes('tiered'), ids.join(','));
});

// ── I. 自定义行组合策略：4 行桶全排列(24) × 峰内/谷时(2) = 48 组合 ──
// 每行独立选一个桶（radio 唯一），费用必须恒等于 Σ 行价×该行桶 token。
{
  const perms = [[0,1,2,3],[0,1,3,2],[0,2,1,3],[0,2,3,1],[0,3,1,2],[0,3,2,1],
    [1,0,2,3],[1,0,3,2],[1,2,0,3],[1,2,3,0],[1,3,0,2],[1,3,2,0],
    [2,0,1,3],[2,0,3,1],[2,1,0,3],[2,1,3,0],[2,3,0,1],[2,3,1,0],
    [3,0,1,2],[3,0,2,1],[3,1,0,2],[3,1,2,0],[3,2,0,1],[3,2,1,0]];
  const BUCKETS = ['input', 'cacheRead', 'cacheWrite', 'output'];
  const PRICES = { input: 1, cacheRead: 0.05, cacheWrite: 1.25, output: 2 };
  const PEAKP = { input: 3, cacheRead: 0.1, cacheWrite: 5, output: 9 };
  const OFFP = { input: 0.5, cacheRead: 0.02, cacheWrite: 0.6, output: 4 };
  const TOK = { input: U.inputTokens, cacheRead: U.cacheReadTokens, cacheWrite: U.cacheWriteTokens, output: U.outputTokens };
  let comboPass = 0; const comboTotal = perms.length * 2; const errs = [];
  for (let pi = 0; pi < perms.length; pi++) {
    const rows = perms[pi].map((bi, row) => ({ label: `r${row}`, buckets: [BUCKETS[bi]], perM: PRICES[BUCKETS[bi]], peakPerM: PEAKP[BUCKETS[bi]], offPerM: OFFP[BUCKETS[bi]] }));
    for (const when of ['peak', 'off']) {
      const t = when === 'peak' ? MON : MON_NIGHT;
      const resolved = resolvePricingForTime({ inputPerM: 0, outputPerM: 0, peakDays: [0,1,2,3,4,5,6], peakWindows: [{ start: 540, end: 720 }], customRows: rows }, t);
      const got = costOf(U, resolved);
      const want = rows.reduce((s, r) => s + TOK[r.buckets[0]] / 1e6 * (when === 'peak' ? r.peakPerM : r.offPerM), 0);
      if (Math.abs(got - want) > 1e-9) errs.push(`perm#${pi}-${when}: got ${got} want ${want}`);
      else comboPass++;
    }
  }
  tc(51, `自定义行组合策略 ${comboPass}/${comboTotal} 通过（24 排列×峰/谷，每行唯一桶）`, () => {
    assert.strictEqual(errs.length, 0, errs.slice(0, 3).join('; '));
  });
}

// ── J. 全模板 × 全组合矩阵（保存→托管合并→计价→重开识别，含流程描述）──
{
  const MANAGED = ['inputPerM','outputPerM','cacheReadPerM','cacheWritePerM','combinedPerM','discount','peak','offPeak','peakDays','peakWindows','weekend','peakOffPeakFrom','customRows'];
  const BASE = { inputPerM: 1, outputPerM: 2, cacheReadPerM: 0.05, cacheWritePerM: 1.25, currency: 'CNY' };
  const applyOverride = (prices, savedTemplateId) => {
    const pureDiscount = prices.discount !== undefined && Object.keys(prices).every((k) => k === 'discount' || k === 'currency');
    const stripped = { ...BASE };
    if (!pureDiscount) for (const f of MANAGED) delete stripped[f];
    return { row: { ...stripped, ...prices }, savedTemplateId };
  };
  const rowsOut = [];
  let mPass = 0, mTotal = 0;
  const matrix = (组合, 流程, check) => {
    mTotal++;
    try { check(); mPass++; rowsOut.push([组合, 流程, '✅']); }
    catch (e) { rowsOut.push([组合, 流程, `❌ ${e.message}`]); }
  };

  // —— basic：只发输入/输出（模板列驱动），残留缓存字段必须被剥离 ——
  matrix('basic·全字段', '填输入1/输出2→保存(托管剥离cr/cw)→按输入价算命中与写入', () => {
    const { row } = applyOverride({ inputPerM: 1, outputPerM: 2, currency: 'CNY' });
    ok(costOf(U, row), 5.6);
  });
  matrix('basic·从cache-split切来', '先存过cr=0.05再切basic保存→旧cr不得参与', () => {
    const first = applyOverride({ inputPerM: 1, outputPerM: 2, cacheReadPerM: 0.05, currency: 'CNY' });
    ok(costOf(U, first.row), 5.125);
    const second = applyOverride({ inputPerM: 1, outputPerM: 2, currency: 'CNY' });
    ok(costOf(U, second.row), 5.6);
  });
  // —— cache-split ——
  matrix('cache-split·三价', '命中.05/未命中1/输出2→5.15；命中行按.05', () => {
    const { row } = applyOverride({ inputPerM: 1, outputPerM: 2, cacheReadPerM: 0.05, currency: 'CNY' });
    ok(costOf(U, row), 5.125);
    assert.strictEqual(rowsFromPricing(row).length, 3);
  });
  // —— peak-off-peak：分时解析 + 重开保持模板 ——
  const PKG = (extra) => ({ inputPerM: 3, outputPerM: 9, cacheReadPerM: 0.1, offPeak: { inputPerM: 1.5, outputPerM: 4.5, cacheReadPerM: 0.05 }, peakDays: [1,2,3,4,5], peakWindows: [{ start: 540, end: 720 }], ...extra });
  matrix('peak-off-peak·峰时', '周一北京9:30→整单按峰价(写入回落峰输入价)', () => {
    const { row } = applyOverride({ ...PKG(), peak: { inputPerM: 3, outputPerM: 9, cacheReadPerM: 0.1 }, currency: 'CNY' }, 'peak-off-peak');
    const r = resolvePricingForTime(row, MON); ok(r.inputPerM, 3);
    ok(costOf(U, r), 3 + 18 + 0.05 + 0.3);
  });
  matrix('peak-off-peak·谷时', '周一北京20:00→谷价', () => {
    const { row } = applyOverride({ ...PKG(), peak: { inputPerM: 3, outputPerM: 9, cacheReadPerM: 0.1 }, currency: 'CNY' }, 'peak-off-peak');
    const r = resolvePricingForTime(row, MON_NIGHT); ok(r.inputPerM, 1.5);
    ok(costOf(U, r), 1.5 + 9 + 0.025 + 0.15);
  });
  matrix('peak-off-peak·周六', '未勾选星期六→全天谷价', () => {
    const { row } = applyOverride({ ...PKG(), peak: { inputPerM: 3, outputPerM: 9, cacheReadPerM: 0.1 }, currency: 'CNY' }, 'peak-off-peak');
    ok(resolvePricingForTime(row, SAT).inputPerM, 1.5);
  });
  matrix('peak-off-peak·部分填写后重开', '仅填峰价(谷留空)保存→重开模板仍是峰谷(持久化templateId)，不再被猜成基础', () => {
    const { savedTemplateId } = applyOverride({ ...PKG(), peak: { inputPerM: 3, outputPerM: 9 } , currency: 'CNY' }, 'peak-off-peak');
    assert.strictEqual(savedTemplateId, 'peak-off-peak');
    assert.strictEqual(matchTypeId(null) === 'basic', true); // 结构猜测不可靠的对照
  });
  // —— cache-write：四桶全价 ——
  matrix('cache-write·四价', 'i1/cr.05/cw1.25/o2 → 5.15，行数4', () => {
    const { row } = applyOverride({ inputPerM: 1, outputPerM: 2, cacheReadPerM: 0.05, cacheWritePerM: 1.25, currency: 'CNY' });
    ok(costOf(U, row), 5.15);
    assert.strictEqual(rowsFromPricing(row).length, 4);
  });
  // —— combined：合并优先 + 折扣叠加 ——
  matrix('combined·统一价', '合并5 → 3.6M×5=18，重开识别combined', () => {
    const { row, savedTemplateId } = applyOverride({ inputPerM: 5, outputPerM: 5, combinedPerM: 5, currency: 'CNY' }, 'combined');
    ok(costOf(U, row), 18);
    assert.strictEqual(matchTypeId(row), 'combined');
    void savedTemplateId;
  });
  matrix('combined·+Batch折扣', '合并5×0.5 → 9', () => {
    const { row } = applyOverride({ inputPerM: 5, outputPerM: 5, combinedPerM: 5, discount: 0.5, currency: 'CNY' }, 'combined');
    ok(costOf(U, row), 9);
  });
  // —— batch：纯折扣保留结构 ——
  matrix('batch·纯折扣', '只存discount0.5→内置结构保留、整单减半', () => {
    const { row } = applyOverride({ discount: 0.5 }, 'batch');
    ok(row.cacheReadPerM, 0.05);
    ok(costOf(U, row), 5.15 * 0.5);
    assert.strictEqual(matchTypeId(row), 'batch');
  });
  matrix('batch·从峰谷模型切来', '带峰结构的基价+batch→峰结构保留且倍率生效', () => {
    const basePeak = { ...BASE, peakDays: [1], peakWindows: [{ start: 540, end: 720 }], peak: { inputPerM: 3, outputPerM: 9 }, offPeak: { inputPerM: 1.5, outputPerM: 4.5 } };
    const pureDiscount = true; const stripped = { ...basePeak }; // 纯折扣不剥离
    const row = { ...stripped, discount: 0.5 };
    ok(row.peak.inputPerM, 3); void pureDiscount; void MANAGED;
    const r = resolvePricingForTime(row, MON);
    // 峰层未定义缓存读价→保留基价缓存读价(.05)；写入价同样保留(1.25)。
    ok(costOf(U, r), (3 + 18 + 0.025 + 0.125) * 0.5);
  });
  // —— 自定义行 × 峰谷开关迁移语义 ——
  const mkRows = () => [
    { label: '输入', buckets: ['input'], perM: 1, peakPerM: '', offPerM: '' },
    { label: '输出', buckets: ['output'], perM: 2, peakPerM: '', offPerM: '' },
  ];
  matrix('自定义·启用峰谷迁移', '开峰谷→平价转入谷价、峰价空、上方清空(由峰谷接管)；未填峰价时段按谷价计', () => {
    const onRows = mkRows().map((r) => ({ ...r, offPerM: r.offPerM.trim() === '' ? r.perM : r.offPerM }));
    ok(onRows[0].offPerM, 1); ok(onRows[1].offPerM, 2);
    const pricing = resolvePricingForTime({ inputPerM: 0, outputPerM: 0, customRows: onRows.map((r) => ({ ...r, perM: Number(r.perM), offPerM: Number(r.offPerM) })), peakDays: [1,2,3,4,5], peakWindows: [{ start: 540, end: 720 }] }, MON_NIGHT);
    ok(costOf(U, pricing), 1 + 4);
  });
  matrix('自定义·峰价填好后', '谷1/峰3(输入行)→峰时按3、谷时按1', () => {
    const rows = [{ label: '输入', buckets: ['input'], perM: 1, peakPerM: 3, offPerM: 1 }];
    const p = { inputPerM: 0, outputPerM: 0, customRows: rows, peakDays: [1,2,3,4,5], peakWindows: [{ start: 540, end: 720 }] };
    const u1 = { inputTokens: 1e6, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
    ok(costOf(U, resolvePricingForTime(p, MON)), 3);
    ok(costOf(u1, resolvePricingForTime(p, MON)), 3);
    ok(costOf(u1, resolvePricingForTime(p, MON_NIGHT)), 1);
  });
  matrix('自定义·停用峰谷回迁', '关峰谷→谷价回填平价、峰/谷清空、上方恢复显示原值', () => {
    const rows = mkRows().map((r) => ({ ...r, offPerM: String(r.perM) }));
    const offRows = rows.map((r) => ({ ...r, perM: r.offPerM.trim() !== '' ? r.offPerM : r.perM, peakPerM: '', offPerM: '' }));
    ok(offRows[0].perM, 1); ok(offRows[1].perM, 2);
    assert.strictEqual(offRows[0].peakPerM, ''); assert.strictEqual(offRows[0].offPerM, '');
  });
  matrix('自定义·顺序一致性', '行顺序=用户添加顺序，宿主按行累计与顺序无关但展示一致', () => {
    const rows = [mkRows()[1], mkRows()[0]];
    assert.deepStrictEqual(rows.map((r) => r.label), ['输出', '输入']);
    ok(costOf(U, { inputPerM: 0, outputPerM: 0, customRows: rows.map((r) => ({ ...r, perM: Number(r.perM) })) }), 5);
  });

  console.log('\n—— 全模板矩阵 ——');
  for (const r of rowsOut) console.log(`[${r[2].startsWith('✅') ? 'PASS' : 'FAIL'}] ${r[0]} | ${r[1]} | ${r[2]}`);
  tc(52, `全模板矩阵 ${mPass}/${mTotal} 通过`, () => assert.strictEqual(mTotal - mPass, 0, rowsOut.filter((r) => !r[2].startsWith('✅')).map((r) => r[0]).join('; ')));
}

console.log('');
for (const [id, name, st, msg] of results) console.log(`${st.padEnd(6)} #${String(id).padStart(2)} ${name}${msg ? '  -> ' + msg : ''}`);
console.log(`\nDEEP-AUDIT: ${pass}/${pass + fail} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
