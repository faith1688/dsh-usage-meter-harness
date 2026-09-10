// Probe: which ACCOUNT does each key belong to? (global key vs per-model keys)
// Prints only balances, never the keys.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createDecipheriv, createHash } from 'node:crypto';

const DSH_HOME = process.env.DSH_HOME ?? join(process.env.USERPROFILE ?? '.', '.dsh');
const dataRoot = join(DSH_HOME, 'usage-meter');
const salt = readFileSync(join(dataRoot, 'salt'), 'utf8');
const key = createHash('sha256').update(`dsh-usage-meter:${salt}`).digest();
const dec = (f) => {
  try {
    const [iv, dat] = readFileSync(join(dataRoot, f), 'utf8').split(':');
    const d = createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'base64'));
    return Buffer.concat([d.update(Buffer.from(dat, 'base64')), d.final()]).toString('utf8');
  } catch { return null; }
};

const cfg = JSON.parse(readFileSync(join(dataRoot, 'config.json'), 'utf8'));
const globalKey = (() => {
  const enc = cfg?.globals?.deepseekApiKeyEnc;
  if (typeof enc !== 'string' || !enc.includes(':')) return null;
  const [iv, dat] = enc.split(':');
  try {
    const d = createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'base64'));
    return Buffer.concat([d.update(Buffer.from(dat, 'base64')), d.final()]).toString('utf8');
  } catch { return null; }
})();

async function balanceOf(name, apiKey) {
  if (apiKey === null) { console.log(`[${name}] decrypt-fail`); return; }
  try {
    const r = await fetch('https://api.deepseek.com/user/balance', { method: 'GET', headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' } });
    const b = await r.json().catch(() => ({}));
    const row = b?.balance_infos?.[0];
    console.log(`[${name}] HTTP ${r.status} total=${row?.total_balance ?? '-'} ${row?.currency ?? ''}`);
  } catch (e) { console.log(`[${name}] fetch-error ${String(e).split('\n')[0]}`); }
}

await balanceOf('GLOBAL key (官方模型专用)', globalKey);
await balanceOf('custom deepseek/deepseek-v4-flash key', dec('apikeys/deepseek__deepseekv4flash.enc'));
await balanceOf('custom deepseek/deepseek-v4-pro key', dec('apikeys/deepseek__deepseekv4pro.enc'));
await balanceOf('official deepseek-official/v4-flash key', dec('apikeys/deepseekofficial__deepseekv4flash.enc'));
