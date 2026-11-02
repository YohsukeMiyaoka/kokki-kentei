import { useState } from 'react';
import { bestByUser, formatTime } from '../logic/exam';
import type { ExamResult, Grade, User } from '../types';

interface Props {
  users: User[];
  results: ExamResult[];
  currentUserId: string;
  onOpen: (r: ExamResult) => void;
  onBack: () => void;
}

const MODE_LABEL = { exam: '本番', mini: '練習', retry: 'やり直し' } as const;
const MEDALS = ['🥇', '🥈', '🥉'];

export function ScoresScreen({ users, results, currentUserId, onOpen, onBack }: Props) {
  const [grade, setGrade] = useState<Grade>(1);
  const nameOf = (id: string) => users.find((u) => u.id === id)?.name ?? '？';
  const ranking = bestByUser(results, grade);
  const history = results
    .filter((r) => r.userId === currentUserId && r.grade === grade)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="screen scores">
      <header className="review-header">
        <button className="btn ghost small" onClick={onBack}>もどる</button>
        <h1 className="title-sm">記録</h1>
        <div className="tabs">
          {([1, 2] as const).map((g) => (
            <button key={g} className={`tab ${g === grade ? 'active' : ''}`} onClick={() => setGrade(g)}>{g}級</button>
          ))}
        </div>
      </header>

      <section>
        <h2>ハイスコア（本番）</h2>
        {ranking.length === 0 ? (
          <p className="empty">まだ記録がないよ</p>
        ) : (
          <ol className="ranking">
            {ranking.map((r, i) => (
              <li key={r.id} className={r.userId === currentUserId ? 'me' : ''}>
                <span className="rank">{MEDALS[i] ?? `${i + 1}`}</span>
                <span className="who">{nameOf(r.userId)}</span>
                <span className="pts">{r.score}点</span>
                <span className="time">{formatTime(r.timeMs)}</span>
                <span>{r.passed ? '🏅' : ''}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h2>{nameOf(currentUserId)}さんのこれまでの記録</h2>
        {history.length === 0 ? (
          <p className="empty">まだ記録がないよ</p>
        ) : (
          <ul className="history">
            {history.map((r) => {
              const wrong = r.answers.filter((a) => !a.correct).length;
              return (
                <li key={r.id}>
                  <span className="date">{new Date(r.date).toLocaleDateString('ja-JP')}</span>
                  <span className="mode">{MODE_LABEL[r.mode]}</span>
                  <span className="pts">{r.score} / {r.total}</span>
                  <span className="time">{formatTime(r.timeMs)}</span>
                  <span>{r.passed ? '合格' : ''}</span>
                  {wrong > 0 && <button className="btn small" onClick={() => onOpen(r)}>ふり返り</button>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
