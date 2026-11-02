import { useState } from 'react';
import { Flag } from '../components/Flag';
import { FlagViewer } from '../components/FlagViewer';
import { answerLabel } from '../logic/exam';
import type { Answer, Question } from '../types';

interface Props {
  items: { question: Question; answer: Answer }[];
  onRetry: () => void;
  onBack: () => void;
}

/** タップすると大きく見られる国旗 */
function ZoomableFlag({ id, className, onZoom }: { id: string; className: string; onZoom: (id: string) => void }) {
  return (
    <button className="flag-zoom" onClick={() => onZoom(id)} aria-label="国旗を大きく見る">
      <Flag id={id} className={className} />
      <span className="zoom-mark" aria-hidden>🔍</span>
    </button>
  );
}

export function ReviewScreen({ items, onRetry, onBack }: Props) {
  const [zoomId, setZoomId] = useState<string | null>(null);

  const answerView = (q: Question, value: string | null) => {
    const choice = q.choices?.find((c) => c.id === value);
    if (choice?.flag) return <ZoomableFlag id={choice.flag} className="mini-flag" onZoom={setZoomId} />;
    return answerLabel(q, value);
  };

  return (
    <div className="screen review">
      <header className="review-header">
        <button className="btn ghost small" onClick={onBack}>もどる</button>
        <h1 className="title-sm">ふり返り</h1>
        <button className="btn primary" onClick={onRetry}>もう一度解く</button>
      </header>
      <p className="note">国旗をタップすると、大きくして見られるよ。</p>
      <ol className="review-list">
        {items.map(({ question: q, answer }) => {
          // 国旗を見せずに出した問題も、ふり返りでは答えの国の国旗を見せる
          const promptFlag = q.flag ?? (q.choices?.[0]?.flag ? undefined : q.countryIds[0]);
          return (
            <li key={q.id} className="review-item">
              <div className="review-q">
                {promptFlag && <ZoomableFlag id={promptFlag} className="review-flag" onZoom={setZoomId} />}
                <p className="prompt-sm">{q.prompt}</p>
              </div>
              <dl className="review-answers">
                <div className="ok">
                  <dt>正解</dt>
                  <dd>{q.answerText}</dd>
                  {q.choices?.[0]?.flag && q.answer && (
                    <ZoomableFlag id={q.answer} className="mini-flag" onZoom={setZoomId} />
                  )}
                </div>
                <div className="ng"><dt>自分の答え</dt><dd>{answerView(q, answer.value)}</dd></div>
              </dl>
              <p className="explanation">{q.explanation}</p>
            </li>
          );
        })}
      </ol>
      {zoomId && <FlagViewer id={zoomId} onClose={() => setZoomId(null)} />}
    </div>
  );
}
