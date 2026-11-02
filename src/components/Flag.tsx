import type { CSSProperties } from 'react';
import { countryById } from '../data';

// 国旗は本物の縦横比で描かれた svg-country-flags（パブリックドメイン）をバンドルに入れる（外部CDNは使わない）。
// その後に変わった国旗（シリア・キルギス）は src/assets/flags/ の画像で差しかえる。
const baseUrls = import.meta.glob<string>('/node_modules/svg-country-flags/svg/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});
const overrideUrls = import.meta.glob<string>('/src/assets/flags/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});

export function flagUrl(id: string): string {
  const file = `${id.toLowerCase()}.svg`;
  return overrideUrls[`/src/assets/flags/${file}`] ?? baseUrls[`/node_modules/svg-country-flags/svg/${file}`];
}

export const flagAspect = (id: string) => countryById.get(id)?.aspect ?? 1.5;

/** 大きさは CSS の --flag-h（国旗の高さ）で決める。幅は本物の縦横比から計算し、枠より広い国旗は枠に合わせて小さくする */
export function Flag({ id, className = '' }: { id: string; className?: string }) {
  const aspect = flagAspect(id);
  return (
    <img
      className={`flag ${className}`}
      src={flagUrl(id)}
      alt={countryById.get(id)?.name ?? ''}
      style={{ '--ar': aspect, aspectRatio: aspect } as CSSProperties}
      draggable={false}
    />
  );
}
