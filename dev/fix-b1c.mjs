// Fix line 118 (0-indexed 117) of i18n-add2.mjs again: the 更新于 pattern must be
// unique to L662 (template literal, missing $). L764 is VALID JSX (no fix needed)
// and uses ' {fmtTime' (no $), so extend the pattern with ' ${fmtTime(accountBalance.updatedAt)}'.
// The ambiguous paren/brace cluster is built from char codes.
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
const OB = String.fromCharCode(123); // {
const DOL = String.fromCharCode(36); // $
const Q = String.fromCharCode(39); // '
const DQ = String.fromCharCode(34); // "
const tail = 'fmtTime(accountBalance.updatedAt)'; // unambiguous ASCII
// old: ))}{L('更新于')} ${fmtTime(accountBalance.updatedAt)}
const oldS = CP + CP + CB + OB + 'L(' + Q + '更新于' + Q + CP + CB + ' ' + DOL + OB + tail + CB;
// new: ))}${L('更新于')} ${fmtTime(accountBalance.updatedAt)}
const newS = CP + CP + CB + DOL + OB + 'L(' + Q + '更新于' + Q + CP + CB + ' ' + DOL + OB + tail + CB;
lines[117] = '  [' + DQ + oldS + DQ + ', ' + DQ + newS + DQ + ', 1],';
writeFileSync(p, lines.join('\n'), 'utf8');
console.log('fixed line 118 (extended unique pattern)');
console.log('old: ' + [...oldS].map((c) => c.charCodeAt(0)).join(','));
console.log('new: ' + [...newS].map((c) => c.charCodeAt(0)).join(','));
