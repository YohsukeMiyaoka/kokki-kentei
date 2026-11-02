// ホーム画面用のアイコン（PNG）を作る。画像ツールなしで動くよう、PNGを直接書き出す。
// 使い方: node scripts/make-icons.mjs
import fs from 'node:fs';
import zlib from 'node:zlib';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

function png(size, pixel) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x / size, y / size);
      const i = y * (size * 3 + 1) + 1 + x * 3;
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// 青い空に、白い旗（赤い丸）とポール。maskable でも切れないよう中央にまとめる
const SKY = [47, 125, 225], WHITE = [255, 255, 255], RED = [230, 0, 51], POLE = [120, 80, 40], SHADOW = [30, 90, 180];
function pixel(x, y) {
  if (x > 0.22 && x < 0.26 && y > 0.2 && y < 0.82) return POLE;
  const wave = Math.sin((x - 0.26) * 9) * 0.02;
  const fy = y - wave;
  if (x >= 0.26 && x < 0.8 && fy > 0.24 && fy < 0.6) {
    const dx = x - 0.53, dy = fy - 0.42;
    return dx * dx + dy * dy < 0.011 ? RED : WHITE;
  }
  if (x >= 0.28 && x < 0.82 && fy > 0.26 && fy < 0.62) return SHADOW;
  return SKY;
}

fs.mkdirSync('public/icons', { recursive: true });
for (const [name, size] of [['icon-192', 192], ['icon-512', 512], ['apple-touch-icon', 180]]) {
  fs.writeFileSync(`public/icons/${name}.png`, png(size, pixel));
}
console.log('icons written');
