import fs from 'node:fs';
const s = fs.readFileSync('z:/deepseek/dsh-usage-meter/src/client.tsx', 'utf8');
const lines = s.split(/\r?\n/);
// find UsageReadout definition and print a window around live/realtime references
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (/realtime|liveRef|liveRate|useProjection\(|export function UsageReadout|RATE_TICK|setInterval/.test(l)) {
    console.log('>> L' + (i + 1) + ': ' + l.trim().slice(0, 160));
  }
}
