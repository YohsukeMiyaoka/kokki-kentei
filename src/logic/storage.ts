import type { ExamResult, Settings, User } from '../types';

// 端末の中（localStorage）だけに保存する。外には送らない。
const KEY = 'kokki-kentei:v1';

export interface SaveData {
  users: User[];
  results: ExamResult[];
  settings: Settings;
  currentUserId: string | null;
}

export const DEFAULT_SETTINGS: Settings = {
  timeLimitMin: { 1: 60, 2: 50 },
  sound: true,
  instantFeedback: true,
  inputMode: 'kana',
};

const empty = (): SaveData => ({ users: [], results: [], settings: DEFAULT_SETTINGS, currentUserId: null });

export function load(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const data = JSON.parse(raw) as Partial<SaveData>;
    return {
      users: data.users ?? [],
      results: data.results ?? [],
      settings: { ...DEFAULT_SETTINGS, ...data.settings },
      currentUserId: data.currentUserId ?? null,
    };
  } catch {
    return empty();
  }
}

export function save(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // 容量オーバーなど。保存できなくてもアプリは使えるようにする
  }
}

export const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
