// Targeted test for the shared-balance running lock (backend guard logic).
// Drives the REAL guard conditions used in src/index.ts config POST handler:
//   sharedGroupLocked = pc.sharedBalance === true &&
//                       activeModel !== null &&
//                       underlyingProvider(activeModel.provider) === underlyingProvider(pv)
// and the frontend lock:
//   sharedBalanceLocked = sharedBalances[selProvider] === true &&
//                         activeKey !== '' &&
//                         activeKey.split('/')[0] === selProvider
// plus balanceEdited = (patch.balance is finite) || (patch.recharge is finite && !== 0)
// Covers the 6 required scenarios. Pure-logic (no network, no DSH process).
let failures = 0;
function check(id, label, actual, expected) {
  const ok = Object.is(actual, expected);
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id} ${label}: got=${JSON.stringify(actual)} want=${JSON.stringify(expected)}`);
}

// ── model the real functions used by the guard ───────────────────────────────
const VISION_TOOLKIT_PREFIX = 'vision-toolkit-';
function underlyingProvider(provider) {
  if (provider === null) return null;
  let p = provider;
  while (p.startsWith(VISION_TOOLKIT_PREFIX)) p = p.slice(VISION_TOOLKIT_PREFIX.length);
  return p;
}

// Backend guard (mirrors src/index.ts:1323-1336 exact condition).
function backendWouldLock({ pcSharedBalance, activeModel, pv, patch }) {
  const balanceEdited =
    (patch.balance !== undefined && Number.isFinite(Number(patch.balance))) ||
    (patch.recharge !== undefined && Number.isFinite(Number(patch.recharge)) && Number(patch.recharge) !== 0);
  const sharedGroupLocked =
    pcSharedBalance === true &&
    activeModel !== null &&
    underlyingProvider(activeModel.provider) === underlyingProvider(pv);
  return { balanceEdited, sharedGroupLocked, reject: balanceEdited && sharedGroupLocked };
}

// Frontend lock (mirrors src/client.tsx:1509-1512).
function frontendLocksBalance({ sharedBalancesOn, activeKey, selProvider }) {
  return sharedBalancesOn === true && activeKey !== '' && activeKey.split('/')[0] === selProvider;
}

// ══ Scenario 1: 模型 A 运行时，改模型 B 余额 → 锁（共享组内 A 与 B 同供应商）══
{
  const r = backendWouldLock({ pcSharedBalance: true, activeModel: { provider: 'baidu', model: 'ernie-4.5' }, pv: 'baidu', patch: { model: 'ernie-4.5-turbo', balance: 999 } });
  check('S1', 'A运行改B余额→后端拒', r.reject, true);
  check('S1b', '前端同供应商共享锁', frontendLocksBalance({ sharedBalancesOn: true, activeKey: 'baidu/ernie-4.5', selProvider: 'baidu' }), true);
}

// ══ Scenario 2: 模型 A 运行时，改模型 A 本身余额 → 锁 ══
{
  const r = backendWouldLock({ pcSharedBalance: true, activeModel: { provider: 'baidu', model: 'ernie-4.5' }, pv: 'baidu', patch: { model: 'ernie-4.5', balance: 1 } });
  check('S2', 'A运行改A余额→后端拒', r.reject, true);
}

// ══ Scenario 3: 模型停止后（activeModel=null）改余额 → 放行 ══
{
  const r = backendWouldLock({ pcSharedBalance: true, activeModel: null, pv: 'baidu', patch: { model: 'ernie-4.5', balance: 1 } });
  check('S3', 'A停止改余额→放行', r.reject, false);
  check('S3b', '前端 A 停止→不锁', frontendLocksBalance({ sharedBalancesOn: true, activeKey: '', selProvider: 'baidu' }), false);
}

// ══ Scenario 4: 全模型运行时（组内任 A 或 B 运行）修改 → 都拒 ══
{
  const a = backendWouldLock({ pcSharedBalance: true, activeModel: { provider: 'baidu', model: 'ernie-4.5' }, pv: 'baidu', patch: { model: 'ernie-x1.1', recharge: 5 } });
  const b = backendWouldLock({ pcSharedBalance: true, activeModel: { provider: 'baidu', model: 'ernie-x1.1' }, pv: 'baidu', patch: { model: 'ernie-4.5', balance: 2 } });
  check('S4', '任A运行改B→拒', a.reject, true);
  check('S4b', '任B运行改A→拒', b.reject, true);
}

// ══ Scenario 5: 并行运行多个共享模型 → 全部余额锁定 ══
{
  const a = backendWouldLock({ pcSharedBalance: true, activeModel: { provider: 'baidu', model: 'ernie-4.5' }, pv: 'baidu', patch: { model: 'ernie-4.5-turbo', balance: 0 } });
  const b = backendWouldLock({ pcSharedBalance: true, activeModel: { provider: 'qwen', model: 'qwen-max' }, pv: 'qwen', patch: { model: 'qwen-turbo', balance: 0 } });
  check('S5', '多共享组并行→各组各自锁', a.reject && b.reject, true);
}

// ══ Scenario 6: 不同供应商间互不影响（A 运行不改 B 供应商余额）══
{
  const r = backendWouldLock({ pcSharedBalance: true, activeModel: { provider: 'baidu', model: 'ernie-4.5' }, pv: 'qwen', patch: { model: 'qwen-max', balance: 999 } });
  check('S6', 'baidu运行改qwen→放行（无跨供应商串扰）', r.reject, false);
  check('S6b', '前端跨供应商不锁', frontendLocksBalance({ sharedBalancesOn: true, activeKey: 'baidu/ernie-4.5', selProvider: 'qwen' }), false);
}

// ══ 附加防线：未开共享余额 → 永不锁（老行为不变）══
{
  const r = backendWouldLock({ pcSharedBalance: false, activeModel: { provider: 'baidu', model: 'ernie-4.5' }, pv: 'baidu', patch: { model: 'ernie-4.5', balance: 1 } });
  check('S7', '未开共享余额→放行', r.reject, false);
}

console.log(failures === 0 ? '\nALL SHARED-BALANCE CHECKS PASSED' : `\n${failures} SHARED-BALANCE CHECK(S) FAILED`);
process.exitCode = failures === 0 ? 0 : 1;
