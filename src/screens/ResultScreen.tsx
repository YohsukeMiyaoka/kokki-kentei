import { useEffect } from 'react';
import { formatTime } from '../logic/exam';
import { sounds } from '../logic/sound';
import type { ExamResult } from '../types';

interface Props {
  result: ExamResult;
  passLine: number;
  isNewBest: boolean;
  onReview: () => void;
  onMenu: () => void;
}

const MODE_LABEL = { exam: '本番', mini: '練習', retry: 'やり直し' } as const;

export function ResultScreen({ result, passLine, isNewBest, onReview, onMenu }: Props) {
  const rate = Math.round((result.score / result.total) * 100);
  const wrong = result.total - result.score;

  useEffect(() => {
    if (result.passed) sounds.fanfare();
  }, [result.passed]);

  return (
    <div className="screen result">
      {result.passed && <Confetti />}
      <p className="result-mode">{result.grade}級 {MODE_LABEL[result.mode]}</p>
      <div className={`stamp ${result.passed ? 'pass' : 'fail'}`}>
        {result.passed ? '合格！' : '残念…'}
      </div>
      {isNewBest && <p className="new-best">🎉 自己ベスト！</p>}
      <div className="score">
        <strong>{result.score}</strong>
        <span> / {result.total} 問</span>
      </div>
      <dl className="result-stats">
        <div><dt>正答率</dt><dd>{rate}%</dd></div>
        <div><dt>合格ライン</dt><dd>{passLine}問</dd></div>
        <div><dt>かかった時間</dt><dd>{formatTime(result.timeMs)}</dd></div>
      </dl>
      {result.timedOut && <p className="note">時間切れ！ 答えていない問題は×になったよ。</p>}
      {!result.passed && <p className="note">あと{Math.max(0, passLine - result.score)}問で合格！</p>}
      <div className="row">
        {wrong > 0 && <button className="btn big primary" onClick={onReview}>ふり返り（{wrong}問）</button>}
        <button className="btn big" onClick={onMenu}>メニューへ</button>
      </div>
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 40 }, (_, i) => i);
  const colors = ['#ff4d6d', '#ffd166', '#06d6a0', '#118ab2', '#ef476f', '#8338ec'];
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((i) => (
        <span
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            background: colors[i % colors.length],
            animationDelay: `${(i % 10) * 0.15}s`,
            animationDuration: `${2.5 + (i % 5) * 0.4}s`,
          }}
        />
      ))}
    </div>
  );
}
