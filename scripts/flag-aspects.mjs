// 国旗のSVGの viewBox から縦横比（横÷縦）を読んで、countries.json の aspect に書きこむ。
// 国旗の画像を差しかえたら実行する。使い方: node scripts/flag-aspects.mjs
import fs from 'node:fs';

export function flagFile(id) {
  const override = `src/assets/flags/${id.toLowerCase()}.svg`;
  return fs.existsSync(override) ? override : `node_modules/svg-country-flags/svg/${id.toLowerCase()}.svg`;
}

export function svgAspect(file) {
  const svg = fs.readFileSync(file, 'utf8');
  const [, , w, h] = svg.match(/viewBox="([^"]+)"/)[1].trim().split(/[\s,]+/).map(Number);
  return Math.round((w / h) * 1000) / 1000;
}

if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const path = 'src/data/countries.json';
  const countries = JSON.parse(fs.readFileSync(path, 'utf8'));
  for (const c of countries) c.aspect = svgAspect(flagFile(c.id));
  fs.writeFileSync(path, '[\n' + countries.map((c) => JSON.stringify(c)).join(',\n') + '\n]\n');
  console.log('aspect written');
}
