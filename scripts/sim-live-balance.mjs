// Simulates the real DSH host around lib/index.js and drives the REAL plugin
// code end-to-end to verify the live-balance fix:
//   DeepSeek path:  in-turn usage deltas accrue into `spentSinceAnchor`; the
//                   projection reports anchor MINUS estimate; next turn/start
//                   re-anchors from the /user/balance API truth; a failed
//                   refresh KEEPS anchor + estimate (anti-freeze).
//   Other providers: byte-comparable legacy ledger path (`balances` map) —
//                   must not touch spentSinceAnchor.
// No plugin source is copied: everything goes through apply(ctx, config) with
// a mocked ctx surface and mocked global.fetch.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Fresh DSH_HOME BEFORE importing the plugin module so loadPersistedConfig()
// finds no extra-state file.
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-sim-'));
process.env.DSH_HOME = home;

const { apply, __testInternals } = await import('../lib/index.js');

const TI = __testInternals;
let failures = 0;
const rows = [];

function check(id, label, actual, expected, tol = 0) {
  const ok =
    typeof expected === 'number'
      ? Math.abs(actual - expected) <= tol
      : Object.is(actual, expected);
  if (!ok) failures++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${id} ${label}: got=${JSON.stringify(actual)} want=${JSON.stringify(expected)}${tol ? ` (+/-${tol})` : ''}`,
  );
  return ok;
}

// ── mock ctx ─────────────────────────────────────────────────────────────────
const effects = [];
const states = new Map(); // session object -> folded FoldState
const handlers = {};
let proj = null;
let scopeRef = null;

const ctx = {
  effect(fn) {
    const dispose = fn();
    effects.push(dispose);
    return dispose;
  },
  settings: {
    register(_ns, _schema, { base } = {}) {
      let cfg = { ...base };
      const watchers = [];
      const scope = {
        get: () => cfg,
        update: async (patch) => {
          cfg = { ...cfg, ...patch };
          for (const w of watchers) w(cfg);
        },
        watch: (fn) => {
          watchers.push(fn);
          return { dispose() {} };
        },
      };
      scopeRef = scope;
      return scope;
    },
  },
  sessionProjections: {
    register(p) {
      proj = p;
    },
    snapshot(session) {
      const st = states.get(session) ?? FOLD.init();
      return { values: { [proj.key]: FOLD.view(st) } };
    },
  },
  webServer: { register() {} },
  llm: {
    listProviders: async () => [],
    listModels: async () => [],
  },
  on(type, handler) {
    handlers[type] = handler;
  },
};

apply(ctx, {});
if (!handlers['session/event']) throw new Error('plugin did not register event handler');
// Real projection shape: { key, stateSchema, init(), apply(state,event), wire.view(state), stateVersion }
if (!proj || typeof proj.wire?.view !== 'function') throw new Error('projection has no wire.view');
const FOLD = { init: proj.init.bind(proj), apply: proj.apply.bind(proj), view: proj.wire.view.bind(proj) };

function advance(session, type, data, time) {
  const cur = states.get(session) ?? FOLD.init();
  const next = FOLD.apply(cur, { type, data, time });
  if (next === 'cur') states.set(session, cur);
  else states.set(session, next);
  handlers['session/event'](session, { type, data, time });
}

// surface handler failures instead of the plugin's silent catch
const origAdvance = advance;
advance = function (session, type, data, time) {
  try {
    origAdvance(session, type, data, time);
  } catch (e) {
    console.error(`HANDLER ERROR on ${type}:`, e?.stack ?? String(e));
    throw e;
  }
};

async function flush() {
  // Balance refresh is a pure promise chain (mocked fetch) — drain microtasks
  // plus a couple of macrotask turns until any in-flight refresh settles.
  for (let i = 0; i < 12 && TI.currentBalance === null; i++) await Promise.resolve();
  for (let i = 0; i < 6; i++) {
    await new Promise((r) => setImmediate(r));
    await Promise.resolve();
  }
}

// ── global fetch mock ────────────────────────────────────────────────────────
let balMode = 'none'; // 'none' | 'ok' | 'fail500' | 'reject'
let balBody = null;
const balCalls = [];
globalThis.fetch = async (url) => {
  const u = String(url);
  if (u.includes('api.deepseek.com/user/balance')) {
    balCalls.push(u);
    if (balMode === 'ok') {
      return new Response(JSON.stringify(balBody), { status: 200 });
    }
    if (balMode === 'fail500') return new Response(null, { status: 500 });
    if (balMode === 'reject') throw new Error('mock: connection refused');
    throw new Error('mock: balance fetch not expected (mode=none)');
  }
  if (u.includes('open.er-api.com')) {
    return new Response(JSON.stringify({ rates: { CNY: 7.2 } }), { status: 200 });
  }
  throw new Error('mock: unexpected fetch ' + u);
};
const balResponse = (total) => ({
  is_available: true,
  balance_infos: [
    { currency: 'CNY', total_balance: total, granted_balance: '0', topped_up_balance: total },
  ],
});

// Event times are pinned before the bundled peak/off-peak switch
// (1786896000000 = 2026-08-16T16:00Z) so deepseek-v4-flash resolves to the
// FLAT base price (input 1 CNY/M, output 2 CNY/M) regardless of wall clock.
const T = Date.UTC(2026, 5, 15, 8, 0, 0);
let tick = 0;
const at = () => T + ++tick * 1000;

function requestHeader(session, provider, model) {
  advance(session, 'request/header', { header: { config: { provider, model } } }, at());
}
function turnStart(session, turn) {
  advance(session, 'turn/start', { turn }, at());
}
function stepStart(session, turn, step) {
  advance(session, 'step/start', { turn, step }, at());
}
function usageChunk(session, turn, step, inputTokens, outputTokens) {
  // Real host shape (dsh-agent-loop): turn/step are OUTER, the chunk carries
  // only the model payload. The plugin's old `chunk.turn ?? 0` read the wrong
  // layer and keyed every usage chunk as (0,0) — this shape reproduces that
  // exactly, so the regression below guards against it coming back.
  advance(
    session,
    'assistant/chunk',
    { turn, step, chunk: { type: 'usage', usage: { inputTokens, outputTokens } } },
    at(),
  );
}
function usageMessage(session, turn, step, inputTokens, outputTokens) {
  // Final assistant/message: turn/step outer, usage outer (dsh-agent-loop
  // appends `{ turn, step, message, usage }`).
  advance(
    session,
    'assistant/message',
    { turn, step, message: {}, usage: { inputTokens, outputTokens } },
    at(),
  );
}
const viewOf = (session) => FOLD.view(states.get(session)).accountBalance;

const s1 = { name: 'deepseek-session' };
const s2 = { name: 'baidu-session' };
const s3 = { name: 'issue1-session' };

// ══ Phase 1: no API key — reset-to-zero path, zero network calls ═════════════
await scopeRef.update({ deepseekApiKey: '' }); // explicit empty key (production write path)

requestHeader(s1, 'deepseek-official', 'deepseek-v4-flash');
turnStart(s1, 0);
await flush();
{
  const v = viewOf(s1);
  check('1a', 'no-key currentBalance===null', TI.currentBalance === null, true);
  check('1b', 'no-key spentSinceAnchor===0', TI.spentSinceAnchor, 0);
  check('1c', 'no-key no balance HTTP call', balCalls.length, 0);
  check('1d', 'no-key view accountBalance===null', v, null);
}

// ══ Phase 2: keyed + turn/start → initial successful re-anchor ═══════════════
await scopeRef.update({ deepseekApiKey: 'sk-test' }); // watch → applyConfig mirrors key
balMode = 'ok';
balBody = balResponse('100');
requestHeader(s1, 'deepseek-official', 'deepseek-v4-flash');
turnStart(s1, 1);
await flush();
{
  const b = TI.currentBalance;
  const v = viewOf(s1);
  check('2a', 'anchor fetched totalBalance===100', b?.totalBalance, 100);
  check('2b', 'anchor currency CNY', b?.currency, 'CNY');
  check('2c', 'spentSinceAnchor reset to 0', TI.spentSinceAnchor, 0);
  check('2d', 'view source api', v?.source, 'api');
  check('2e', 'view totalBalance 100', v?.totalBalance, 100);
  check('2f', 'view updatedAt=anchor.fetchedAt', v?.updatedAt, b?.fetchedAt);
}

// ══ Phase 3: first in-turn usage sample (Δ = 0.005 CNY) ══════════════════════
stepStart(s1, 1, 0);
usageChunk(s1, 1, 0, 1000, 2000); // 1000/1M*1 + 2000/1M*2 = 0.005 CNY
{
  const v = viewOf(s1);
  check('3a', 'spentSinceAnchor≈0.005', TI.spentSinceAnchor, 0.005, 1e-9);
  check('3b', 'view source computed', v?.source, 'computed');
  check('3c', 'view totalBalance≈99.995', v?.totalBalance, 99.995, 1e-9);
  check('3d', 'lastLiveAt set (>0)', TI.lastLiveAt > 0, true);
}
const lastLiveAfter3 = TI.lastLiveAt;

// ══ Phase 4: identical duplicate sample → dedup, NO double deduction ═════════
usageChunk(s1, 1, 0, 1000, 2000);
{
  const v = viewOf(s1);
  check('4a', 'dup: spentSinceAnchor unchanged', TI.spentSinceAnchor, 0.005, 1e-9);
  check('4b', 'dup: view still ≈99.995 computed', v?.totalBalance, 99.995, 1e-9);
  check('4c', 'dup: lastLiveAt untouched', TI.lastLiveAt === lastLiveAfter3, true);
}

// ══ Phase 5: second sample (cumulative 1100/2200 → Δ 0.0005 CNY) ═════════════
usageChunk(s1, 1, 0, 1100, 2200);
{
  const v = viewOf(s1);
  check('5a', 'spentSinceAnchor≈0.0055', TI.spentSinceAnchor, 0.0055, 1e-9);
  check('5b', 'view totalBalance≈99.9945', v?.totalBalance, 99.9945, 1e-9);
  check('5c', 'view source computed', v?.source, 'computed');
}

// ══ Phase 6: API failure on next turn/start → estimate RETAINED ══════════════
const warnLog = [];
const origWarn = console.warn;
console.warn = (...args) => {
  warnLog.push(args.join(' '));
  origWarn(...args);
};
balMode = 'fail500';
turnStart(s1, 2);
await flush();
console.warn = origWarn;
{
  const v = viewOf(s1);
  check('6a', 'fail: stale anchor kept (totalBalance 100)', TI.currentBalance?.totalBalance, 100);
  check('6b', 'fail: estimate kept (~0.0055)', TI.spentSinceAnchor, 0.0055, 1e-9);
  check('6c', 'fail: view ≈99.9945 computed', v?.totalBalance, 99.9945, 1e-9);
  check('6d', 'warn logged', warnLog.some((s) => s.includes('balance refresh failed')), true);
}

// ══ Phase 7: API success on later turn/start → hard re-anchor from truth ═════
balMode = 'ok';
balBody = balResponse('50');
turnStart(s1, 3);
await flush();
{
  const v = viewOf(s1);
  check('7a', 're-anchor totalBalance===50', TI.currentBalance?.totalBalance, 50);
  check('7b', 'estimate cleared exactly 0', TI.spentSinceAnchor, 0);
  check('7c', 'view source api', v?.source, 'api');
  check('7d', 'view totalBalance===50', v?.totalBalance, 50);
}

// ══ Phase 8: non-DeepSeek provider — legacy ledger path, independent state ═══
TI.balancesMap['p:baidu'] = { balance: 100, currency: 'CNY' }; // funded seed
requestHeader(s2, 'baidu', 'ernie-4.5'); // bundled CNY row 4/16 per M
turnStart(s2, 0);
stepStart(s2, 0, 0);
usageChunk(s2, 0, 0, 1000, 2000); // 1000/1M*4 + 2000/1M*16 = 0.036 CNY
{
  const ledger = TI.balancesMap['p:baidu'];
  const v = viewOf(s2);
  check('8a', 'DeepSeek estimate untouched (still 0)', TI.spentSinceAnchor, 0);
  check('8b', 'ledger decremented ≈99.964', ledger?.balance, 99.964, 1e-9);
  check('8c', 'ledger currency CNY', ledger?.currency, 'CNY');
  check('8d', 'view(s2) source computed', v?.source, 'computed');
  check('8e', 'view(s2) totalBalance≈99.964', v?.totalBalance, 99.964, 1e-9);
  check('8f', 'no per-model ledger key created', 'm:baidu/ernie-4.5' in TI.balancesMap, false);
}

// ══ Phase 9: issue #1 — chunk + message for the SAME request must settle once ═
// A real DSH request emits BOTH a streamed `assistant/chunk` (type=usage) and a
// final `assistant/message` carrying the SAME usage. The pre-fix code read the
// chunk's turn/step from the WRONG layer → (0,0), so the two events failed to
// dedup and the request was billed ~2× (issue #1). After the fix they share the
// real (turn,step) and the second event is a no-op. Uses a FRESH session (s3) so
// the per-session dedup baseline starts empty.
TI.balancesMap['p:baidu'] = { balance: 100, currency: 'CNY' }; // fresh funded seed
requestHeader(s3, 'baidu', 'ernie-4.5');
turnStart(s3, 1);
stepStart(s3, 1, 0);
usageChunk(s3, 1, 0, 1000, 2000);    // Δ = 0.036 CNY
usageMessage(s3, 1, 0, 1000, 2000);  // same request, same usage → must dedup
{
  const ledger = TI.balancesMap['p:baidu'];
  check('9a', 'issue#1: chunk+message billed once (≈99.964)', ledger?.balance, 99.964, 1e-9);
}

// ══ Phase 10: all-zero init sample must not bill NOR clobber the baseline ════
stepStart(s3, 2, 0);
usageChunk(s3, 2, 0, 0, 0);          // zero sample — not billable
{
  const ledger = TI.balancesMap['p:baidu'];
  check('10a', 'zero sample: ledger unchanged (99.964)', ledger?.balance, 99.964, 1e-9);
}
usageChunk(s3, 2, 0, 1000, 2000);    // real sample right after — must count full
{
  const ledger = TI.balancesMap['p:baidu'];
  check('10b', 'zero sample: real sample still counts full (≈99.928)', ledger?.balance, 99.928, 1e-9);
}

// ══ Phase 11: smaller later sample (retry/correction) must not go negative ═══
stepStart(s3, 3, 0);
usageChunk(s3, 3, 0, 1000, 2000);    // Δ = 0.036 → 99.892
usageChunk(s3, 3, 0, 500, 1000);     // smaller → delta clamped to 0, no refund
{
  const ledger = TI.balancesMap['p:baidu'];
  check('11a', 'smaller sample: no negative delta (still ≈99.892)', ledger?.balance, 99.892, 1e-9);
}

// ── teardown ────────────────────────────────────────────────────────────────
for (const d of effects.reverse()) {
  try {
    d?.();
  } catch {}
}

// summary table
rows.push(
  ['phase', 'spentSinceAnchor (after)', 'view.totalBalance (after)', 'source'],
  ['1 no-key', String(TI.spentSinceAnchor), 'n/a (null)', '-'],
  ['2 anchor=100', '0', '100', 'api'],
  ['3 Δusage#1', '~0.005', '~99.995', 'computed'],
  ['4 dup sample', '~0.005', '~99.995', 'computed'],
  ['5 Δusage#2', '~0.0055', '~99.9945', 'computed'],
  ['6 API fail', '~0.0055 (kept)', '~99.9945', 'computed'],
  ['7 API ok 50', '0 (cleared)', '50', 'api'],
  ['8 baidu path', '0 (independent)', '~99.964 (ledger)', 'computed'],
);
console.log('\n' + rows.map((r) => r.join(' | ')).join('\n'));
console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
fs.rmSync(home, { recursive: true, force: true });
process.exitCode = failures === 0 ? 0 : 1;
