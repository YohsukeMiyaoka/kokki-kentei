import { countryById } from '../data';

// flag-icons のSVGをバンドルに入れる（外部CDNは使わない）
const urls = import.meta.glob<string>('/node_modules/flag-icons/flags/4x3/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});

export function flagUrl(id: string): string {
  return urls[`/node_modules/flag-icons/flags/4x3/${id.toLowerCase()}.svg`];
}

export function Flag({ id, className = '' }: { id: string; className?: string }) {
  return (
    <img
      className={`flag ${className}`}
      src={flagUrl(id)}
      alt={countryById.get(id)?.name ?? ''}
      draggable={false}
    />
  );
}
