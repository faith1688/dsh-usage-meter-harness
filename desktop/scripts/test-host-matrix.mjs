/**
 * Host-matrix test: the SAME build must mount on both DSH generations.
 *
 * Runs the real cordis (the same framework both hosts ship) against three
 * compositions that differ exactly where 0.1 and 0.2 differ:
 *
 *   A. 0.1-shaped: `webServer` already provided, plugin does NOT inject it.
 *   B. 0.2-shaped: `webServer` provided later (after the plugin mounted).
 *   C. minimal:    `webServer` never provided at all.
 *
 * In every case `apply` must run (the plugin must not park on a missing
 * optional service), and in A/B every route must end up registered. C must
 * degrade without throwing.
 *
 * Usage: node scripts/test-host-matrix.mjs
 */
import { Context } from '@deepseek-ai/cordis';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const plugin = await import('../lib/index.js');

let failures = 0;
const check = (label, ok, detail = '') => {
  if (ok) console.log(`  PASS  ${label}`);
  else {
    failures++;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
};

/** Count routes a fake webServer received. */
function makeServer() {
  const routes = [];
  return {
    routes,
    register(route) {
      routes.push(route);
    },
  };
}

/** Root context + the one service both generations always provide. */
function makeHost() {
  const root = new Context();
  const projections = { registered: 0, register() { this.registered++; }, snapshot: () => ({ values: {} }) };
  root.provide('sessionProjections', projections);
  return { root, projections };
}

const DATA_DIR = mkdtempSync(join(tmpdir(), 'usage-meter-host-'));

/** Load the plugin and report whether `apply` ran. */
async function mount(root, config) {
  const fiber = root.plugin(plugin, config);
  // The plugin is synchronous; give cordis one tick to settle the fiber.
  await Promise.resolve();
  return fiber;
}

// ---------------------------------------------------------------- scenario A
{
  console.log('A. 0.1-shaped host (webServer provided before the plugin loads)');
  const { root, projections } = makeHost();
  const server = makeServer();
  root.provide('webServer', server);
  await mount(root, { dataDir: DATA_DIR, currency: 'CNY' });
  check('apply ran (projection registered)', projections.registered === 1, `registered=${projections.registered}`);
  check('HTTP routes registered', server.routes.length > 0, `routes=${server.routes.length}`);
  check('route paths are /api/usage-meter/*', server.routes.every((r) => String(r?.path ?? '').startsWith('/api/usage-meter/')));
  await root.dispose?.();
}

// ---------------------------------------------------------------- scenario B
{
  console.log('B. 0.2-shaped host (webServer arrives after mount)');
  const { root, projections } = makeHost();
  await mount(root, { dataDir: DATA_DIR, currency: 'CNY' });
  check('apply ran without webServer', projections.registered === 1, `registered=${projections.registered}`);
  const server = makeServer();
  root.provide('webServer', server);
  await new Promise((r) => setTimeout(r, 20));
  check('queued routes flushed once the service appeared', server.routes.length > 0, `routes=${server.routes.length}`);
  await root.dispose?.();
}

// ---------------------------------------------------------------- scenario C
{
  console.log('C. minimal host (webServer never provided)');
  const { root, projections } = makeHost();
  let threw = null;
  try {
    await mount(root, { dataDir: DATA_DIR, currency: 'CNY' });
    await new Promise((r) => setTimeout(r, 20));
  } catch (err) {
    threw = err;
  }
  check('apply ran and stayed up', threw === null, String(threw));
  check('projection still registered (readout works without HTTP)', projections.registered === 1, `registered=${projections.registered}`);
  await root.dispose?.();
}

rmSync(DATA_DIR, { recursive: true, force: true });
console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
