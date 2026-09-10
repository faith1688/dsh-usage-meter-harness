// Surgical fix: lines 114-117 of i18n-add2.mjs contain a broken .replace(...) construction
// whose runtime pattern does not exist in client.tsx. Replace them with clean [old, new, 1]
// entries, building the ambiguous char sequences explicitly (no hand-typed }).
import { readFileSync, writeFileSync } from 'node:fs';

const p = 'z:/deepseek/dsh-usage-meter/i18n-add2.mjs';
const lines = readFileSync(p, 'utf8').split('\n');
const CP = String.fromCharCode(41); // )
const CB = String.fromCharCode(125); // }
const PAT = (k) => `  ["${CP}${CB}{L('${k}')}", "${CP}${CB}${'$'}{L('${k}')}", 1],`;

for (let i = 113; i <= 116; i++) {
  if (!lines[i] || !lines[i].includes('.replace(')) {
    console.error('FAIL: line ' + (i + 1) + ' is not the expected broken line: ' + JSON.stringify(lines[i]));
    process.exit(1);
  }
}
lines[113] = PAT('天');
lines[114] = PAT('小时');
lines[115] = PAT('分钟');
lines[116] = PAT('秒');
writeFileSync(p, lines.join('\n'), 'utf8');
console.log('fixed lines 114-117 of i18n-add2.mjs');
