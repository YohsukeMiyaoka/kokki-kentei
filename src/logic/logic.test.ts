import { describe, expect, it } from 'vitest';
import type { ExamResult, Question } from '../types';
import { bestByUser, buildExam, EXAM_SPECS, isCorrect, passLine, scoreExam } from './exam';
import { applyDakuten, applyHandakuten, applySmall, backspace } from './kana';
import { isWrittenCorrect, normalizeAnswer, toKatakana } from './normalize';
import { seededRng } from './random';
import { questionPools } from '../data';

describe('normalizeAnswer', () => {
  it('ひらがなをカタカナにそろえる', () => {
    expect(toKatakana('あめりか')).toBe('アメリカ');
    expect(normalizeAnswer('にほん')).toBe('ニホン');
  });
  it('空白と「・」を無視する', () => {
    expect(normalizeAnswer(' セントクリストファー・ネービス ')).toBe('セントクリストファーネービス');
    expect(normalizeAnswer('ボスニア　ヘルツェゴビナ')).toBe('ボスニアヘルツェゴビナ');
  });
  it('半角カナを全角にそろえる', () => {
    expect(normalizeAnswer('ﾌﾗﾝｽ')).toBe('フランス');
  });
  it('acceptedAnswers のどれかと合えば正解', () => {
    expect(isWrittenCorrect('アメリカガッシュウコク', ['アメリカ', 'アメリカガッシュウコク'])).toBe(true);
    expect(isWrittenCorrect('あめりか', ['アメリカ'])).toBe(true);
    expect(isWrittenCorrect('アメリ', ['アメリカ'])).toBe(false);
    expect(isWrittenCorrect('', ['アメリカ'])).toBe(false);
  });
  it('iPadのキーボード・音声入力の答え（漢字・句読点つき）も採点できる', () => {
    const accepted = ['アメリカ', 'アメリカガッシュウコク', 'アメリカ', 'アメリカ合衆国'];
    expect(isWrittenCorrect('アメリカ合衆国', accepted)).toBe(true);
    expect(isWrittenCorrect('アメリカ合衆国。', accepted)).toBe(true);
    expect(isWrittenCorrect('日本', ['ニホン', '日本', '日本国'])).toBe(true);
    expect(isWrittenCorrect('セントクリストファー・ネービス', ['セントクリストファーネービス'])).toBe(true);
  });
});

describe('kana keyboard', () => {
  it('濁点をつけたり外したりできる', () => {
    expect(applyDakuten('カ')).toBe('ガ');
    expect(applyDakuten('ガ')).toBe('カ');
    expect(applyDakuten('パ')).toBe('バ');
    expect(applyDakuten('ウ')).toBe('ヴ');
    expect(applyDakuten('ア')).toBe('ア');
    expect(applyDakuten('')).toBe('');
  });
  it('半濁点', () => {
    expect(applyHandakuten('ハ')).toBe('パ');
    expect(applyHandakuten('バ')).toBe('パ');
    expect(applyHandakuten('パ')).toBe('ハ');
    expect(applyHandakuten('カ')).toBe('カ');
  });
  it('小さい文字', () => {
    expect(applySmall('チヤ')).toBe('チャ');
    expect(applySmall('ャ')).toBe('ヤ');
    expect(applySmall('ツ')).toBe('ッ');
  });
  it('消す', () => {
    expect(backspace('ニホン')).toBe('ニホ');
    expect(backspace('')).toBe('');
  });
});

describe('buildExam', () => {
  for (const grade of [1, 2] as const) {
    const spec = EXAM_SPECS[grade];
    it(`${grade}級は本番と同じ問題数・選択式→記述式の順`, () => {
      const exam = buildExam(questionPools[grade], spec, seededRng(grade));
      expect(exam).toHaveLength(spec.choice + spec.written);
      expect(exam.slice(0, spec.choice).every((q) => q.format === 'choice')).toBe(true);
      expect(exam.slice(spec.choice).every((q) => q.format === 'written')).toBe(true);
      expect(new Set(exam.map((q) => q.id)).size).toBe(exam.length);
    });
    it(`${grade}級で同じ国が出すぎない（1か国2回まで）`, () => {
      for (let seed = 0; seed < 20; seed++) {
        const exam = buildExam(questionPools[grade], spec, seededRng(seed));
        const counts = new Map<string, number>();
        for (const q of exam) counts.set(q.countryIds[0], (counts.get(q.countryIds[0]) ?? 0) + 1);
        expect(Math.max(...counts.values())).toBeLessThanOrEqual(2);
      }
    });
  }
  it('選択肢の位置がシャッフルされる', () => {
    const positions = new Set<number>();
    for (let seed = 0; seed < 30; seed++) {
      const exam = buildExam(questionPools[1], EXAM_SPECS[1], seededRng(seed));
      positions.add(exam[0].choices!.findIndex((c) => c.id === exam[0].answer));
    }
    expect(positions.size).toBeGreaterThan(1);
  });
});

describe('採点', () => {
  const choiceQ: Question = {
    id: 'c', grade: 1, format: 'choice', type: 't', prompt: '', answer: 'JP',
    choices: [{ id: 'JP' }, { id: 'BD' }], answerText: '日本', explanation: '', countryIds: ['JP'],
  };
  const writtenQ: Question = {
    id: 'w', grade: 1, format: 'written', type: 't', prompt: '', acceptedAnswers: ['ニホン', 'ニッポン'],
    answerText: '日本', explanation: '', countryIds: ['JP'],
  };
  it('選択式・記述式の正誤', () => {
    expect(isCorrect(choiceQ, 'JP')).toBe(true);
    expect(isCorrect(choiceQ, 'BD')).toBe(false);
    expect(isCorrect(writtenQ, 'にっぽん')).toBe(true);
    expect(isCorrect(writtenQ, null)).toBe(false);
  });
  it('合格ラインは80%', () => {
    expect(passLine(EXAM_SPECS[1])).toBe(80);
    expect(passLine(EXAM_SPECS[2])).toBe(64);
  });
  it('答えていない問題は不正解として数える', () => {
    const r = scoreExam([choiceQ, writtenQ], [{ questionId: 'c', value: 'JP', correct: true }], EXAM_SPECS[1]);
    expect(r.score).toBe(1);
    expect(r.answers[1]).toEqual({ questionId: 'w', value: null, correct: false });
    expect(r.passed).toBe(false);
  });
});

describe('ハイスコア', () => {
  const r = (userId: string, score: number, timeMs: number, mode: ExamResult['mode'] = 'exam'): ExamResult => ({
    id: `${userId}${score}${timeMs}`, userId, grade: 1, mode, score, total: 100, passed: score >= 80,
    timeMs, timedOut: false, date: '', answers: [],
  });
  it('ユーザーごとの最高点。同点なら時間が短い方が上', () => {
    const list = bestByUser([r('a', 80, 5000), r('a', 90, 9000), r('b', 90, 4000), r('c', 100, 1, 'mini')], 1);
    expect(list.map((x) => [x.userId, x.score])).toEqual([['b', 90], ['a', 90]]);
  });
});
