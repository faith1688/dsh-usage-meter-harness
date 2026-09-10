import fs from 'node:fs';
const raw = fs.readFileSync(process.argv[2]);
console.log('file size:', raw.length);
const magic = [0x28, 0xb5, 0x2f, 0xfd];
// find all magic occurrences in first 2MB
let hits = [];
for (let i = 0; i + 4 <= Math.min(raw.length, 2 * 1024 * 1024); i++) {
  if (raw[i] === 0x28 && raw[i + 1] === 0xb5 && raw[i + 2] === 0x2f && raw[i + 3] === 0xfd) {
    hits.push(i);
    if (hits.length > 30) break;
  }
}
console.log('magic hits (first 2MB):', hits.length, hits.slice(0, 20).join(','));
// hexdump first 64 bytes
console.log('head hex:', Buffer.from(raw.subarray(0, 64)).toString('hex'));
// if hits exist, show header bytes around second frame
if (hits.length > 1) {
  const off = hits[1];
  console.log('frame2 @', off, 'header hex:', Buffer.from(raw.subarray(off, off + 16)).toString('hex'));
}
