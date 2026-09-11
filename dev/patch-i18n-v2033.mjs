// One-shot v2.0.33: rename theme i18n keys + bump package.json 2.0.32 -> 2.0.33.
import fs from 'node:fs';

function sub(p, pairs) {
  let c = fs.readFileSync(p, 'utf8');
  for (const [old, n, tag] of pairs) {
    const cnt = c.split(old).length - 1;
    if (cnt !== 1) { console.error(`ABORT ${tag} count=${cnt} in ${p}`); process.exit(1); }
    c = c.split(old).join(n);
    console.log(`OK ${tag}`);
  }
  fs.writeFileSync(p, c, 'utf8');
}

sub('z:/deepseek/dsh-usage-meter/src/i18n.ts', [
  ["'靛蓝黎明（默认）': 'Indigo Dawn (default)',", "'靛蓝黎明（浅色）': 'Indigo Dawn (light)',", 'i18n-indigo'],
  ["'林滩晓色（浅色）': 'Forest Shore (light)',", "'林滩晓色（默认，浅色）': 'Forest Shore (default, light)',", 'i18n-forest'],
]);

sub('z:/deepseek/dsh-usage-meter/package.json', [
  ['  "version": "2.0.32",', '  "version": "2.0.33",', 'version'],
]);
console.log('done');
