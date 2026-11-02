import { useEffect, useState } from 'react';
import { questionById, questionPools } from './data';
import { bestByUser, buildExam, compareResults, EXAM_SPECS, MINI_SPEC, scoreExam, shuffleChoices, type ExamSpec } from './logic/exam';
import { setSoundEnabled } from './logic/sound';
import { load, newId, save, type SaveData } from './logic/storage';
import { ExamScreen, type ExamSession } from './screens/ExamScreen';
import { Menu } from './screens/Menu';
import { ResultScreen } from './screens/ResultScreen';
import { ReviewScreen } from './screens/ReviewScreen';
import { ScoresScreen } from './screens/ScoresScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { UserSelect } from './screens/UserSelect';
import type { Answer, ExamMode, ExamResult, Grade } from './types';

interface ActiveExam {
  grade: Grade;
  mode: ExamMode;
  spec: ExamSpec;
  session: ExamSession;
}

type Screen =
  | { name: 'users' }
  | { name: 'menu' }
  | { name: 'exam'; exam: ActiveExam }
  | { name: 'result'; result: ExamResult; passLine: number; isNewBest: boolean }
  | { name: 'review'; result: ExamResult; from: 'result' | 'scores' }
  | { name: 'scores' }
  | { name: 'settings' };

/** 「ふりかえり」用に答えを残す受験の数（古いものは点数だけ残して容量をおさえる） */
const KEEP_ANSWERS = 30;

const MODE_TITLE = { exam: '本番', mini: '練習', retry: 'やり直し' } as const;

export default function App() {
  const [data, setData] = useState<SaveData>(load);
  const [screen, setScreen] = useState<Screen>(() => (data.currentUserId ? { name: 'menu' } : { name: 'users' }));

  const update = (fn: (d: SaveData) => SaveData) =>
    setData((d) => {
      const next = fn(d);
      save(next);
      return next;
    });

  useEffect(() => setSoundEnabled(data.settings.sound), [data.settings.sound]);

  const user = data.users.find((u) => u.id === data.currentUserId);
  if (!user && screen.name !== 'users') {
    return renderUsers();
  }

  function renderUsers() {
    return (
      <UserSelect
        users={data.users}
        onSelect={(id) => {
          update((d) => ({ ...d, currentUserId: id }));
          setScreen({ name: 'menu' });
        }}
        onAdd={(name) => {
          const id = newId();
          update((d) => ({ ...d, users: [...d.users, { id, name, createdAt: new Date().toISOString() }], currentUserId: id }));
          setScreen({ name: 'menu' });
        }}
        onDelete={(id) =>
          update((d) => ({
            ...d,
            users: d.users.filter((u) => u.id !== id),
            results: d.results.filter((r) => r.userId !== id),
            currentUserId: d.currentUserId === id ? null : d.currentUserId,
          }))
        }
      />
    );
  }

  const start = (grade: Grade, mode: ExamMode, retryQuestions?: ExamResult) => {
    let spec: ExamSpec;
    let questions;
    if (mode === 'retry' && retryQuestions) {
      questions = retryQuestions.answers
        .filter((a) => !a.correct)
        .map((a) => questionById.get(a.questionId))
        .filter((q) => q !== undefined)
        .map((q) => shuffleChoices(q, Math.random));
      spec = { choice: 0, written: 0, passRate: EXAM_SPECS[grade].passRate };
    } else {
      spec = mode === 'exam' ? EXAM_SPECS[grade] : MINI_SPEC;
      questions = buildExam(questionPools[grade], spec);
    }
    const timeLimitMs = mode === 'exam' ? data.settings.timeLimitMin[grade] * 60_000 : null;
    setScreen({
      name: 'exam',
      exam: { grade, mode, spec, session: { questions, timeLimitMs, title: `${grade}級 ${MODE_TITLE[mode]}` } },
    });
  };

  const finish = (exam: ActiveExam, answers: Answer[], timeMs: number, timedOut: boolean) => {
    const scored = scoreExam(exam.session.questions, answers, exam.spec);
    const result: ExamResult = {
      id: newId(),
      userId: user!.id,
      grade: exam.grade,
      mode: exam.mode,
      score: scored.score,
      total: scored.total,
      passed: scored.passed,
      timeMs,
      timedOut,
      date: new Date().toISOString(),
      answers: scored.answers,
    };
    const prevBest = bestByUser(data.results.filter((r) => r.userId === user!.id), exam.grade)[0];
    const isNewBest = exam.mode === 'exam' && (!prevBest || compareResults(result, prevBest) < 0);
    update((d) => {
      const results = [...d.results, result];
      // 新しいものから KEEP_ANSWERS 件だけ答えを残す
      const keep = new Set(results.slice(-KEEP_ANSWERS).map((r) => r.id));
      return { ...d, results: results.map((r) => (keep.has(r.id) ? r : { ...r, answers: [] })) };
    });
    setScreen({ name: 'result', result, passLine: Math.ceil(scored.total * exam.spec.passRate), isNewBest });
  };

  switch (screen.name) {
    case 'users':
      return renderUsers();
    case 'menu': {
      const mine = data.results.filter((r) => r.userId === user!.id);
      return (
        <Menu
          user={user!}
          best={{ 1: bestByUser(mine, 1)[0], 2: bestByUser(mine, 2)[0] }}
          settings={data.settings}
          onStart={start}
          onScores={() => setScreen({ name: 'scores' })}
          onSettings={() => setScreen({ name: 'settings' })}
          onChangeUser={() => setScreen({ name: 'users' })}
        />
      );
    }
    case 'exam':
      return (
        <ExamScreen
          key={screen.exam.session.questions.map((q) => q.id).join()}
          session={screen.exam.session}
          instantFeedback={data.settings.instantFeedback}
          inputMode={data.settings.inputMode}
          onInputModeChange={(m) => update((d) => ({ ...d, settings: { ...d.settings, inputMode: m } }))}
          onFinish={(a, t, to) => finish(screen.exam, a, t, to)}
          onQuit={() => setScreen({ name: 'menu' })}
        />
      );
    case 'result':
      return (
        <ResultScreen
          result={screen.result}
          passLine={screen.passLine}
          isNewBest={screen.isNewBest}
          onReview={() => setScreen({ name: 'review', result: screen.result, from: 'result' })}
          onMenu={() => setScreen({ name: 'menu' })}
        />
      );
    case 'review': {
      const items = screen.result.answers
        .filter((a) => !a.correct)
        .flatMap((a) => {
          const question = questionById.get(a.questionId);
          return question ? [{ question, answer: a }] : [];
        });
      return (
        <ReviewScreen
          items={items}
          onRetry={() => start(screen.result.grade, 'retry', screen.result)}
          onBack={() => setScreen(screen.from === 'scores' ? { name: 'scores' } : { name: 'menu' })}
        />
      );
    }
    case 'scores':
      return (
        <ScoresScreen
          users={data.users}
          results={data.results}
          currentUserId={user!.id}
          onOpen={(r) => setScreen({ name: 'review', result: r, from: 'scores' })}
          onBack={() => setScreen({ name: 'menu' })}
        />
      );
    case 'settings':
      return (
        <SettingsScreen
          settings={data.settings}
          onChange={(s) => update((d) => ({ ...d, settings: s }))}
          onBack={() => setScreen({ name: 'menu' })}
        />
      );
  }
}
