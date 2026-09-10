// 临时工具：从设置页截图提取色块（swatch）的精确 hex。
// 用法: node scripts/_extract-swatch-colors.mjs <png路径>
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire('C:/Users/faith/.dsh/profiles/web/node_modules/pngjs/package.json');
const { PNG } = require('pngjs');

const file = process.argv[2];
if (!file) { console.error('usage: node _extract-swatch-colors.mjs <png>'); process.exit(1); }
const png = PNG.sync.read(readFileSync(file));
const { width, height, data } = png;

const px = (x, y) => { const i = (y * width + x) * 4; return [data[i], data[i + 1], data[i + 2], data[i + 3]]; };
const hex = (r, g, b) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');

// 只收“有颜色”的像素（饱和度/亮度过滤，排除灰字、白底、淡边框）
const clusters = new Map();
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const [r, g, b, a] = px(x, y);
    if (a < 200) continue;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const sat = mx === 0 ? 0 : (mx - mn) / mx;
    if (sat < 0.25 || mx < 80) continue;
    const key = `${r >> 4},${g >> 4},${b >> 4}`;
    let c = clusters.get(key);
    if (!c) { c = { n: 0, sr: 0, sg: 0, sb: 0, minX: x, maxX: x, minY: y, maxY: y }; clusters.set(key, c); }
    c.n++; c.sr += r; c.sg += g; c.sb += b;
    if (x < c.minX) c.minX = x; if (x > c.maxX) c.maxX = x;
    if (y < c.minY) c.minY = y; if (y > c.maxY) c.maxY = y;
  }
}

const list = [...clusters.values()].filter(c => c.n > 50).sort((a, b) => b.n - a.n).slice(0, 10);
console.log(`image ${width}x${height}, ${list.length} colored clusters (>50px):`);
for (const c of list) {
  const r = Math.round(c.sr / c.n), g = Math.round(c.sg / c.n), b = Math.round(c.sb / c.n);
  const cx = (c.minX + c.maxX) >> 1, cy = (c.minY + c.maxY) >> 1;
  const [cr, cg, cb] = px(cx, cy);
  console.log(`  avg ${hex(r, g, b)} | center ${hex(cr, cg, cb)} | n=${c.n} | bbox=${c.minX},${c.minY}-${c.maxX},${c.maxY} (${c.maxX - c.minX + 1}x${c.maxY - c.minY + 1}px)`);
}
