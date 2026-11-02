import { EXAM_SPECS, formatTime, passLine } from '../logic/exam';
import type { ExamMode, ExamResult, Grade, Settings, User } from '../types';

interface Props {
  user: User;
  best: Record<Grade, ExamResult | undefined>;
  settings: Settings;
  onStart: (grade: Grade, mode: ExamMode) => void;
  onScores: () => void;
  onSettings: () => void;
  onChangeUser: () => void;
}

export function Menu({ user, best, settings, onStart, onScores, onSettings, onChangeUser }: Props) {
  return (
    <div className="screen menu">
      <header className="menu-header">
        <h1 className="title-sm">こんにちは、{user.name}さん！</h1>
        <button className="btn ghost small" onClick={onChangeUser}>使う人を変える</button>
      </header>

      <div className="grade-cards">
        {([1, 2] as const).map((g) => {
          const spec = EXAM_SPECS[g];
          const b = best[g];
          return (
            <section key={g} className={`grade-card grade-${g}`}>
              <h2>{g}級</h2>
              <p className="grade-info">
                選ぶ問題 {spec.choice}問 ＋ 書く問題 {spec.written}問<br />
                {passLine(spec)}問以上で合格 ／ 制限時間 {settings.timeLimitMin[g]}分
              </p>
              <p className="best">
                {b ? <>最高：<strong>{b.score}点</strong>（{formatTime(b.timeMs)}）{b.passed && ' 🏅'}</> : 'まだ記録なし'}
              </p>
              <button className="btn big primary" onClick={() => onStart(g, 'exam')}>本番</button>
              <button className="btn" onClick={() => onStart(g, 'mini')}>練習（10問）</button>
            </section>
          );
        })}
      </div>

      <div className="row">
        <button className="btn" onClick={onScores}>🏆 記録</button>
        <button className="btn" onClick={onSettings}>⚙ 設定</button>
      </div>
    </div>
  );
}
