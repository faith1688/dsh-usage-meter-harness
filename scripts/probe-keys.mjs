// Probe: can the CURRENT salt decrypt the stored per-model apikey .enc files?
// Prints only OK/FAIL + file times, never plaintext.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createDecipheriv, createHash } from 'node:crypto';

const DSH_HOME = process.env.DSH_HOME ?? join(process.env.USERPROFILE ?? '.', '.dsh');
const dataRoot = join(DSH_HOME, 'usage-meter');
const saltPath = join(dataRoot, 'salt');
const apikeysDir = join(dataRoot, 'apikeys');
const salt = readFileSync(saltPath, 'utf8');
const key = createHash('sha256').update(`dsh-usage-meter:${salt}`).digest();
console.log('salt mtime:', statSync(saltPath).mtime.toISOString());

const files = readdirSync(apikeysDir).filter((f) => f.endsWith('.enc')).sort();
for (const f of files) {
  const st = statSync(join(apikeysDir, f));
  const [ivB64, dataB64] = readFileSync(join(apikeysDir, f), 'utf8').split(':');
  try {
    const d = createDecipheriv('aes-256-cbc', key, Buffer.from(ivB64, 'base64'));
    const plain = Buffer.concat([d.update(Buffer.from(dataB64, 'base64')), d.final()]).toString('utf8');
    console.log(`[OK   ] ${f}  mtime=${st.mtime.toISOString()}  len=${plain.length}`);
  } catch (e) {
    console.log(`[FAIL ] ${f}  mtime=${st.mtime.toISOString()}  ${String(e).split('\n')[0]}`);
  }
}
