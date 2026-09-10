// Structural zstd frame scanner — algorithm copied verbatim from
// dsh-session-persistence-jsonl (scanZstdFrames), then one-shot decode per frame.
import fs from 'node:fs';
import zlib from 'node:zlib';

const file = process.argv[2];
const outPath = process.argv[3];
const buffer = fs.readFileSync(file);
const ZSTD_MAGIC = 4247762216;

function scanZstdFrames(buf, maxFrames = Number.POSITIVE_INFINITY) {
  const frames = [];
  let offset = 0;
  while (offset < buf.length) {
    const start = offset;
    if (buf.length - offset < 4) return { frames, tornStart: start };
    if (buf.readUInt32LE(offset) !== ZSTD_MAGIC) throw new Error(`invalid frame magic at byte ${offset}`);
    offset += 4;
    if (offset === buf.length) return { frames, tornStart: start };
    const descriptor = buf.readUInt8(offset);
    offset += 1;
    if ((descriptor & 24) !== 0) throw new Error(`reserved frame-header bit at byte ${offset - 1}`);
    const contentSizeFlag = descriptor >>> 6;
    const singleSegment = (descriptor & 32) !== 0;
    const checksum = (descriptor & 4) !== 0;
    const dictionaryFlag = descriptor & 3;
    const dictionaryBytes = dictionaryFlag === 3 ? 4 : dictionaryFlag;
    const contentSizeBytes = contentSizeFlag === 0 ? singleSegment ? 1 : 0 : 1 << contentSizeFlag;
    const remainingHeaderBytes = (singleSegment ? 0 : 1) + dictionaryBytes + contentSizeBytes;
    if (buf.length - offset < remainingHeaderBytes) return { frames, tornStart: start };
    offset += remainingHeaderBytes;
    for (;;) {
      if (buf.length - offset < 3) return { frames, tornStart: start };
      const blockHeader = buf.readUIntLE(offset, 3);
      offset += 3;
      const lastBlock = (blockHeader & 1) !== 0;
      const blockType = blockHeader >>> 1 & 3;
      const blockSize = blockHeader >>> 3;
      if (blockType === 3) throw new Error(`reserved block type at byte ${offset - 3}`);
      const payloadBytes = blockType === 1 ? 1 : blockSize;
      if (buf.length - offset < payloadBytes) return { frames, tornStart: start };
      offset += payloadBytes;
      if (lastBlock) break;
    }
    if (checksum) {
      if (buf.length - offset < 4) return { frames, tornStart: start };
      offset += 4;
    }
    frames.push({ start, end: offset });
    if (frames.length === maxFrames) return { frames };
  }
  return { frames };
}

const { frames, tornStart } = scanZstdFrames(buffer);
console.log('frames:', frames.length, tornStart !== undefined ? `| torn final frame at ${tornStart}` : '');
const parts = [];
let bad = 0;
for (const fr of frames) {
  try {
    parts.push(zlib.zstdDecompressSync(buffer.subarray(fr.start, fr.end)).toString('utf8'));
  } catch (e) {
    bad++;
    if (bad <= 3) console.error('frame @', fr.start, 'failed:', e.message);
  }
}
const text = parts.join('');
fs.writeFileSync(outPath, text);
const lines = text.split(/\r?\n/).filter(Boolean);
console.log('decompressed bytes:', text.length, '| jsonl lines:', lines.length, '| bad frames:', bad);
