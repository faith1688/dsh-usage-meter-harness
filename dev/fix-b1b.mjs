// Fix line 118 (0-indexed 117) of i18n-add2.mjs: the 更新于 pattern was mangled
// (stray leading ', missing }). Rebuild it from char codes:
// client.tsx truth (charcodes): 41,41,125,123,76,40,39,26356,26032,20110,39,41,125
import { readFileSync, writeFileSync } from 'node:fs';

const p = 'z:/deepseek/dsh-usage-meter/i18n-add2.mjs';
const lines = readFileSync(p, 'utf8').split('\n');
const line = lines[117];
if (!line || !line.includes('更新于')) {
  console.error('FAIL: line 118 does not contain 更新于: ' + JSON.stringify(line));
  process.exit(1);
}
const CP = String.fromCharCode(41); // )
const CB = String.fromCharCode(125); // }
const Q = String.fromCharCode(39); // '
const DQ = String.fromCharCode(34); // "
const oldS = CP + CP + CB + '{L(' + Q + '更新于' + Q + CP + CB;
const newS = CP + CP + CB + '$' + '{L(' + Q + '更新于' + Q + CP + CB;
lines[117] = '  [' + DQ + oldS + DQ + ', ' + DQ + newS + DQ + ', 1],';
writeFileSync(p, lines.join('\n'), 'utf8');
console.log('fixed line 118');
console.log('old pattern charcodes: ' + [...oldS].map((c) => c.charCodeAt(0)).join(','));
console.log('new pattern charcodes: ' + [...newS].map((c) => c.charCodeAt(0)).join(','));
