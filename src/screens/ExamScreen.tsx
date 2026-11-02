import { useCallback, useEffect, useRef, useState } from 'react';
import { Flag } from '../components/Flag';
import { KanaKeyboard } from '../components/KanaKeyboard';
import { gradeAnswer } from '../logic/exam';
import { sounds } from '../logic/sound';
import type { Answer, InputMode, Question } from '../types';

export interface ExamSession {
  questions: Question[];
  title: string;
  /** null なら時間制限なし */
  timeLimitMs: number | null;
}

interface Props {
  session: ExamSession;
  instantFeedback: boolean;
  inputMode: InputMode;
  onInputModeChange: (m: InputMode) => void;
  onFinish: (answers: Answer[], timeMs: number, timedOut: boolean) => void;
  onQuit: () => void;
}

const CORRECT_DELAY_MS = 800;

function formatClock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function ExamScreen({ session, instantFeedback, inputMode, onInputModeChange, onFinish, onQuit }: Props) {
  const { questions, timeLimitMs } = session;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<Answer | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const startRef = useRef(Date.now());
  const finishedRef = useRef(false);
  const answersRef = useRef<Answer[]>([]);

  const q = questions[index];
  const elapsed = now - startRef.current;
  const remaining = timeLimitMs === null ? null : timeLimitMs - elapsed;

  const finish = useCallback(
    (list: Answer[], timedOut: boolean) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      const timeMs = Math.min(Date.now() - startRef.current, timeLimitMs ?? Infinity);
      onFinish(list, timeMs, timedOut);
    },
    [onFinish, timeLimitMs],
  );

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  // 時間切れになったら、その時点で採点する
  useEffect(() => {
    if (remaining !== null && remaining <= 0) finish(answersRef.current, true);
  }, [remaining, finish]);

  const next = useCallback(
    (list: Answer[]) => {
      setFeedback(null);
      setInput('');
      if (index + 1 >= questions.length) finish(list, false);
      else setIndex(index + 1);
    },
    [index, questions.length, finish],
  );

  const submit = (value: string | null) => {
    if (feedback || finishedRef.current) return;
    const ans = gradeAnswer(q, value);
    const list = [...answers, ans];
    setAnswers(list);
    answersRef.current = list;
    if (!instantFeedback) {
      next(list);
      return;
    }
    setFeedback(ans);
    if (ans.correct) {
      sounds.correct();
      setTimeout(() => next(list), CORRECT_DELAY_MS);
    } else {
      sounds.wrong();
    }
  };

  const submitInput = () => {
    if (input.trim()) submit(input);
  };
  const answerClass = feedback ? (feedback.correct ? 'is-correct' : 'is-wrong') : '';
  // 意味・由来の問題のように選択肢が長い文のときは、1列にして読みやすくする
  const longChoices = q.choices?.some((c) => (c.text?.length ?? 0) > 14) ?? false;

  const quit = () => {
    if (confirm('テストをやめますか？\nこのテストの記録は残りません。')) onQuit();
  };

  const choiceClass = (id: string) => {
    if (!feedback) return '';
    if (id === q.answer) return 'is-correct';
    if (id === feedback.value) return 'is-wrong';
    return 'is-dim';
  };

  return (
    <div className="screen exam">
      <header className="exam-header">
        <button className="btn ghost small" onClick={quit}>やめる</button>
        <div className="progress">
          <div className="progress-label">
            <span className={`badge fmt-${q.format}`}>{q.format === 'choice' ? '選ぶ' : '書く'}</span>
            {index + 1} / {questions.length}
          </div>
          <div className="progress-bar"><div style={{ width: `${(index / questions.length) * 100}%` }} /></div>
        </div>
        <div className={`timer ${remaining !== null && remaining < 60_000 ? 'hurry' : ''}`}>
          ⏱ {remaining === null ? formatClock(elapsed) : formatClock(remaining)}
        </div>
      </header>

      <main className={`question fmt-${q.format} input-${inputMode}`} key={q.id}>
        <p className="prompt">{q.prompt}</p>
        {q.flag && <Flag id={q.flag} className={q.format === 'written' ? 'q-flag small' : 'q-flag'} />}

        {q.format === 'choice' ? (
          <div className={`choices ${q.choices![0].flag ? 'flag-choices' : 'text-choices'} ${longChoices ? 'long' : ''}`}>
            {q.choices!.map((c) => (
              <button
                key={c.id}
                className={`choice ${choiceClass(c.id)}`}
                onClick={() => submit(c.id)}
                disabled={!!feedback}
              >
                {c.flag ? <Flag id={c.flag} /> : c.text}
              </button>
            ))}
          </div>
        ) : (
          <div className="written-area">
            <div className="input-mode" role="group" aria-label="入力のしかた">
              <button className={`tab ${inputMode === 'kana' ? 'active' : ''}`} onClick={() => onInputModeChange('kana')}>50音</button>
              <button className={`tab ${inputMode === 'native' ? 'active' : ''}`} onClick={() => onInputModeChange('native')}>
                ⌨ キーボード・🎤 音声
              </button>
            </div>
            <div className="answer-row">
              {inputMode === 'native' ? (
                <input
                  className={`answer-box answer-input ${answerClass}`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    // 漢字変換を確定するためのEnterでは送信しない
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) submitInput();
                  }}
                  placeholder="ここをタップして入力"
                  lang="ja"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  enterKeyHint="done"
                  disabled={!!feedback}
                  autoFocus
                />
              ) : (
                <div className={`answer-box ${answerClass}`}>
                  {input || <span className="placeholder">ここに答えが出るよ</span>}
                </div>
              )}
              <button className="btn ghost small" onClick={() => submit('')} disabled={!!feedback}>分からない</button>
            </div>
            {inputMode === 'native' ? (
              <div className="native-actions">
                <p className="note">キーボードの 🎤 マイクをおすと、声で答えられるよ。</p>
                <button className="btn big primary" onClick={submitInput} disabled={!!feedback}>決定</button>
              </div>
            ) : (
              <KanaKeyboard value={input} onChange={feedback ? () => {} : setInput} onSubmit={submitInput} />
            )}
          </div>
        )}
      </main>

      {feedback?.correct && (
        <div className="pop-correct" aria-live="polite">
          <span className="maru">◯</span>
          <span className="pop-text">正解！</span>
        </div>
      )}
      {feedback && !feedback.correct && (
        <div className="feedback-bar" aria-live="polite">
          <div>
            <span className="batsu">✕</span> 残念！ 答えは <strong>{q.answerText}</strong>
          </div>
          <button className="btn primary" onClick={() => next(answers)}>次へ ▶</button>
        </div>
      )}
    </div>
  );
}
