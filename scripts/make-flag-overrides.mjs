// svg-country-flags（2021年で更新が止まっている）に入っていない、新しい国旗を作る。
// flag-icons（MIT）の絵はどれも4:3なので、背景が無地の国旗だけ、本物の縦横比の画面のまん中に置き直す。
// 使い方: node scripts/make-flag-overrides.mjs
import fs from 'node:fs';

const SRC = 'node_modules/flag-icons/flags/4x3';
const OUT = 'src/assets/flags';

// 4:3（640x480）の絵を、左右に背景色をのばして width x 480 にする
function widen(id, width, background) {
  const svg = fs.readFileSync(`${SRC}/${id}.svg`, 'utf8');
  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const dx = (width - 640) / 2;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 480">`,
    `<!-- flag-icons (MIT, https://github.com/lipis/flag-icons) の ${id}.svg を縦横比を直して配置 -->`,
    `<rect width="${width}" height="480" fill="${background}"/>`,
    `<g transform="translate(${dx} 0)">${inner}</g>`,
    '</svg>',
    '',
  ].join('\n');
}

fs.mkdirSync(OUT, { recursive: true });
// シリア：2025年からの国旗（緑・白・黒に赤い星3つ）。縦横比 2:3。白い帯のまわりも無地なので左右をのばせる
// （上下の帯は横いっぱいの帯なので、左右にのばすと帯もそのまま続く）
const sy = widen('sy', 720, '#000')
  .replace('<path d="M0 0h640v480H0Z"/>', '<path d="M-40 0h720v480H-40Z"/>')
  .replace('<path fill="#fff" d="M0 0h640v320H0Z"/>', '<path fill="#fff" d="M-40 0h720v320H-40Z"/>')
  .replace('<path fill="#007a3d" d="M0 0h640v160H0Z"/>', '<path fill="#007a3d" d="M-40 0h720v160H-40Z"/>');
fs.writeFileSync(`${OUT}/sy.svg`, sy);
// キルギス：2023年からの国旗（赤地に黄色い太陽）。縦横比 3:5
fs.writeFileSync(`${OUT}/kg.svg`, widen('kg', 800, 'red'));
console.log('flag overrides written');
