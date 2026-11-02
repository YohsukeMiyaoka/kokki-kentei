import { Flag } from '../components/Flag';
import { answerLabel } from '../logic/exam';
import type { Answer, Question } from '../types';

interface Props {
  items: { question: Question; answer: Answer }[];
  onRetry: () => void;
  onBack: () => void;
}

function AnswerView({ q, value }: { q: Question; value: string | null }) {
  const choice = q.choices?.find((c) => c.id === value);
  if (choice?.flag) return <Flag id={choice.flag} className="mini-flag" />;
  return <>{answerLabel(q, value)}</>;
}

export function ReviewScreen({ items, onRetry, onBack }: Props) {
  return (
    <div className="screen review">
      <header className="review-header">
        <button className="btn ghost small" onClick={onBack}>もどる</button>
        <h1 className="title-sm">ふり返り</h1>
        <button className="btn primary" onClick={onRetry}>もう一度解く</button>
      </header>
      <ol className="review-list">
        {items.map(({ question: q, answer }) => (
          <li key={q.id} className="review-item">
            <div className="review-q">
              {/* 国旗を見せずに出した問題も、ふり返りでは答えの国の国旗を見せる */}
              {(q.flag ?? (q.choices?.[0]?.flag ? undefined : q.countryIds[0])) && (
                <Flag id={q.flag ?? q.countryIds[0]} className="review-flag" />
              )}
              <p className="prompt-sm">{q.prompt}</p>
            </div>
            <dl className="review-answers">
              <div className="ok">
                <dt>正解</dt>
                <dd>{q.answerText}</dd>
                {q.choices?.[0]?.flag && q.answer && <Flag id={q.answer} className="mini-flag" />}
              </div>
              <div className="ng"><dt>自分の答え</dt><dd><AnswerView q={q} value={answer.value} /></dd></div>
            </dl>
            <p className="explanation">{q.explanation}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
