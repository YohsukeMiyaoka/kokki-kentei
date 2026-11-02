import type { Answer, ExamResult, Grade, Question } from '../types';
import { isWrittenCorrect } from './normalize';
import { shuffle, type Rng } from './random';

export interface ExamSpec {
  choice: number;
  written: number;
  passRate: number;
}

/** 本物の検定と同じ問題数・合格ライン */
export const EXAM_SPECS: Record<Grade, ExamSpec> = {
  1: { choice: 50, written: 50, passRate: 0.8 },
  2: { choice: 45, written: 35, passRate: 0.8 },
};

export const MINI_SPEC: ExamSpec = { choice: 6, written: 4, passRate: 0.8 };

export const passLine = (spec: ExamSpec) => Math.ceil((spec.choice + spec.written) * spec.passRate);

const mainCountry = (q: Question) => q.countryIds[0];

/**
 * 問題を n 問えらぶ。同じ国が出すぎないよう、1か国あたりの回数を少しずつゆるめながらえらぶ。
 * counts は形式をまたいで共有する（選択式と記述式で同じ国がかたよらないように）。
 */
function pickSpread(pool: Question[], n: number, counts: Map<string, number>, rng: Rng): Question[] {
  const candidates = shuffle(pool, rng);
  const picked: Question[] = [];
  const used = new Set<string>();
  for (let cap = 1; picked.length < n && used.size < candidates.length; cap++) {
    for (const q of candidates) {
      if (picked.length >= n) break;
      if (used.has(q.id)) continue;
      const c = counts.get(mainCountry(q)) ?? 0;
      if (c >= cap) continue;
      picked.push(q);
      used.add(q.id);
      counts.set(mainCountry(q), c + 1);
    }
  }
  return picked;
}

/** 選択肢の順番をシャッフルした問題を返す */
export function shuffleChoices(q: Question, rng: Rng): Question {
  return q.choices ? { ...q, choices: shuffle(q.choices, rng) } : q;
}

/** 選択式→記述式の順にテストを組み立てる */
export function buildExam(pool: Question[], spec: ExamSpec, rng: Rng = Math.random): Question[] {
  const counts = new Map<string, number>();
  const choice = pickSpread(pool.filter((q) => q.format === 'choice'), spec.choice, counts, rng);
  const written = pickSpread(pool.filter((q) => q.format === 'written'), spec.written, counts, rng);
  return [...choice, ...written].map((q) => shuffleChoices(q, rng));
}

export function isCorrect(q: Question, value: string | null): boolean {
  if (value === null) return false;
  if (q.format === 'choice') return value === q.answer;
  return isWrittenCorrect(value, q.acceptedAnswers ?? []);
}

export function gradeAnswer(q: Question, value: string | null): Answer {
  return { questionId: q.id, value, correct: isCorrect(q, value) };
}

/** 時間切れなどで答えていない問題は、未回答（不正解）として採点する */
export function scoreExam(questions: Question[], answers: Answer[], spec: ExamSpec) {
  const byId = new Map(answers.map((a) => [a.questionId, a]));
  const full = questions.map((q) => byId.get(q.id) ?? { questionId: q.id, value: null, correct: false });
  const score = full.filter((a) => a.correct).length;
  const total = questions.length;
  return { answers: full, score, total, passed: score >= Math.ceil(total * spec.passRate) };
}

/** 答えを表示用の文字にする */
export function answerLabel(q: Question, value: string | null): string {
  if (value === null || value === '') return '（答えなし）';
  if (q.format === 'written') return value;
  const c = q.choices?.find((x) => x.id === value);
  return c?.text ?? c?.flag ?? value;
}

/** 点数が高い順、同点なら時間が短い順 */
export function compareResults(a: ExamResult, b: ExamResult): number {
  return b.score - a.score || a.timeMs - b.timeMs;
}

/** ユーザーごとの最高記録（本番モードのみ）をランキング順で返す */
export function bestByUser(results: ExamResult[], grade: Grade): ExamResult[] {
  const best = new Map<string, ExamResult>();
  for (const r of results) {
    if (r.mode !== 'exam' || r.grade !== grade) continue;
    const cur = best.get(r.userId);
    if (!cur || compareResults(r, cur) < 0) best.set(r.userId, r);
  }
  return [...best.values()].sort(compareResults);
}

export function formatTime(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}分${String(s % 60).padStart(2, '0')}秒`;
}
