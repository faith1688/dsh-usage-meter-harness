import fs from 'node:fs';
const f = 'z:/deepseek/dsh-usage-meter/src/client.tsx';
let s = fs.readFileSync(f, 'utf8');
const old = [
  ' * Pure reader: the host computed every number into the `usageCost`',
  ' * projection (each in its native currency). Display-currency conversion',
  ' * (CNY\u2194USD, live rate) happens here only.',
].join('\r\n');
const count = s.split(old).length - 1;
if (count !== 1) { console.error('matches: ' + count); process.exit(1); }
const neu = [
  ' * Pure reader: the host computed every number into the `usageCost`',
  ' * projection (each in its native currency). Display-currency conversion',
  ' * (CNY\u2194USD, live rate) happens here only. Exception: the live tok/s rate is',
  ' * sampled client-side from the streaming partial (the dock kit\'s `useChat`',
  ' * hook), because the installed 0.1.5 runner does not update the projection',
  ' * mid-turn.',
].join('\r\n');
s = s.replace(old, neu);
fs.writeFileSync(f, s);
console.log('doc replaced OK');
