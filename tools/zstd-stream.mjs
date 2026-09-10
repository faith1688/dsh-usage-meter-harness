import fs from 'node:fs';
import zlib from 'node:zlib';
const f = process.argv[2];
const outPath = process.argv[3] || 'C:/Users/faith/AppData/Local/Temp/session-decoded.txt';
const raw = fs.readFileSync(f);
const dec = zlib.createZstdDecompress ? zlib.createZstdDecompress() : zlib.zstdDecompressStream();
const chunks = [];
dec.on('data', (c) => chunks.push(c));
dec.on('error', (e) => { console.error('ERR', e.message); process.exit(1); });
dec.on('end', () => {
  const text = Buffer.concat(chunks).toString('utf8');
  fs.writeFileSync(outPath, text);
  const lines = text.split(/\r?\n/).filter(Boolean);
  console.log('decompressed bytes:', text.length, '| jsonl lines:', lines.length, '| wrote:', outPath);
});
for (let i = 0; i < raw.length; i += 512 * 1024) dec.write(raw.subarray(i, i + 512 * 1024));
dec.end();
