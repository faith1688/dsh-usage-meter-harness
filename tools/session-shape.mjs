import fs from 'node:fs';
import zlib from 'node:zlib';
const f = process.argv[2];
const raw = fs.readFileSync(f);
const text = zlib.zstdDecompressSync(raw).toString('utf8');
const lines = text.split(/\r?\n/).filter(Boolean);
console.log('total lines:', lines.length);
// inspect shape of first 3 lines
for (let i = 0; i < Math.min(3, lines.length); i++) {
  try {
    const o = JSON.parse(lines[i]);
    console.log('LINE', i, 'keys:', Object.keys(o).join(','), '| type:', o.type, '| role:', o.role);
  } catch (e) {
    console.log('LINE', i, 'parse fail:', lines[i].slice(0, 120));
  }
}
