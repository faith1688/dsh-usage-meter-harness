// 回归：实时输出速率的取值语义（纯函数 liveOutputRate / tokenRateOf，来自 lib/globals.js）。
// 覆盖两个都真实发生在用户机器上的踩坑：
//   A. 一次 API 返回结束、开始跑本地工具时，速度**停在最后一个值不动** —— 窗口淘汰把样本
//      清空之后，旧实现回退到「上一次的数值」，于是永远停住；
//   B. 读不到客户端直播流的环境（远程端）速度**恒显示 0.0** —— 兜底被空数组判定挡死。
// 正确语义只有两种：有实时数据 → 真实速率；没有 → null（界面渲染成 0），绝不沿用旧值。
// 用法：node scripts/test-live-rate.mjs
import { liveOutputRate, tokenRateOf, RATE_WINDOW_MS } from '../lib/globals.js';

let failures = 0;
function eq(id, label, actual, expected, eps = 1e-9) {
  const ok = typeof actual === 'number' && typeof expected === 'number' && Number.isFinite(eps)
    ? Math.abs(actual - expected) <= eps
    : JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id} ${label}: got=${JSON.stringify(actual)} want=${JSON.stringify(expected)}`);
}

const now = 1_000_000;
const s = (at, total) => ({ at, total });

// ── 1. 流式中：窗口内「末 − 首」增量 ÷ 用时 ─────────────────────────────────
eq('1a', '3 个样本、2 秒涨 200 token → 100 tok/s',
  tokenRateOf([s(now - 2000, 0), s(now - 1000, 100), s(now, 200)], now), 100);

// ── 2. 踩坑 A：流式结束后必须归零（不能沿用上一个值） ────────────────────────
{
  const c = [s(now - 2000, 0), s(now - 1000, 100), s(now, 200)];
  eq('2a', '窗口内先能算出速率', tokenRateOf(c, now) !== null, true);
  eq('2b', '流式结束超过窗口 → null（界面显示 0，绝不保留旧值）',
    liveOutputRate(c, [], now + RATE_WINDOW_MS + 1000), null);
  eq('2c', '窗口外样本确实被淘汰（滑窗语义，调用方复用同一数组）', c.length, 0);
}

// ── 3. 踩坑 B：两源都没有实时数据 → null（而不是残留一个数字） ───────────────
eq('3a', '两源皆空 → null', liveOutputRate([], [], now), null);
eq('3b', '只有 1 条样本 → null（不足两条算不出速率）', liveOutputRate([s(now, 100)], [], now), null);
eq('3c', '样本全部过期（陈旧数组）→ null',
  liveOutputRate([s(now - 60_000, 0), s(now - 59_000, 900)], [], now), null);

// ── 4. 第二采样源（宿主投影）在客户端源缺数据时接手 ─────────────────────────
eq('4a', '客户端源为空 → 用宿主投影源',
  liveOutputRate([], [s(now - 1000, 0), s(now, 300)], now), 300);
eq('4b', '客户端源只有 1 条（还没成窗）→ 用宿主源',
  liveOutputRate([s(now, 10)], [s(now - 1000, 0), s(now, 200)], now), 200);

// ── 5. 两源都有数据 → 客户端直播流优先（更灵敏） ─────────────────────────────
eq('5a', '两源都有 → 取客户端源',
  liveOutputRate([s(now - 1000, 0), s(now, 500)], [s(now - 1000, 0), s(now, 50)], now), 500);

// ── 6. 不该显示速度的边界：回退/同刻/过短/增量为 0 ───────────────────────────
eq('6a', '增量回退（换回合重算）→ null，不显示负速度',
  tokenRateOf([s(now - 1000, 500), s(now, 100)], now), null);
eq('6b', '同一时刻两条样本（用时 0）→ null', tokenRateOf([s(now, 100), s(now, 200)], now), null);
eq('6c', '用时 0.2s（低于 0.3s 阈值）→ null', tokenRateOf([s(now - 200, 100), s(now, 200)], now), null);
eq('6d', '模型停住（增量为 0）→ null，不拿旧增量装作还有速度',
  tokenRateOf([s(now - 1000, 100), s(now, 100)], now), null);

console.log(failures === 0 ? '\ntest-live-rate: ALL PASSED' : `\ntest-live-rate: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
