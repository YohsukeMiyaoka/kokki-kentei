import { describe, expect, it } from 'vitest';
import { countries, countryById, questionPools } from '.';
import { EXAM_SPECS } from '../logic/exam';
import { normalizeAnswer } from '../logic/normalize';

const flagFiles = import.meta.glob('/node_modules/flag-icons/flags/4x3/*.svg');

describe('countries.json', () => {
  it('198の国・地域がある', () => {
    expect(countries).toHaveLength(198);
    expect(new Set(countries.map((c) => c.id)).size).toBe(198);
  });
  it('バチカン・コソボ・クック諸島・ニウエ・台湾をふくむ', () => {
    for (const id of ['VA', 'XK', 'CK', 'NU', 'TW']) expect(countryById.has(id)).toBe(true);
  });
  it('すべての国に国旗画像がある', () => {
    for (const c of countries) {
      expect(flagFiles[`/node_modules/flag-icons/flags/4x3/${c.id.toLowerCase()}.svg`], c.id).toBeDefined();
    }
  });
  it('必要な項目がそろっていて、似ている国旗のIDが実在する', () => {
    for (const c of countries) {
      for (const key of ['name', 'reading', 'official', 'capital', 'flag', 'meaning', 'tip'] as const) {
        expect(c[key], `${c.id}.${key}`).toBeTruthy();
      }
      expect(c.reading, c.id).toMatch(/^[ァ-ヴー]+$/);
      for (const s of c.similar) expect(countryById.has(s), `${c.id} -> ${s}`).toBe(true);
    }
  });
  it('記述式の答え（読み・別名）がほかの国とかぶらない', () => {
    const owner = new Map<string, string>();
    for (const c of countries) {
      for (const a of new Set([c.reading, ...c.aliases, c.name, c.official].map(normalizeAnswer))) {
        const n = normalizeAnswer(a);
        const prev = owner.get(n);
        expect(prev === undefined || prev === c.id, `${a}: ${prev} と ${c.id}`).toBe(true);
        owner.set(n, c.id);
      }
    }
  });
});

describe.each([1, 2] as const)('questions-%ikyu.json', (grade) => {
  const pool = questionPools[grade];
  const spec = EXAM_SPECS[grade];
  const choice = pool.filter((q) => q.format === 'choice');
  const written = pool.filter((q) => q.format === 'written');

  it('形式ごとの問題数が本番の5倍', () => {
    expect(choice).toHaveLength(spec.choice * 5);
    expect(written).toHaveLength(spec.written * 5);
  });
  it('IDの重複がない', () => {
    expect(new Set(pool.map((q) => q.id)).size).toBe(pool.length);
  });
  it('級が正しい', () => {
    expect(pool.every((q) => q.grade === grade)).toBe(true);
  });
  it('関連する国IDが実在する', () => {
    for (const q of pool) {
      expect(q.countryIds.length, q.id).toBeGreaterThan(0);
      for (const id of q.countryIds) expect(countryById.has(id), `${q.id}: ${id}`).toBe(true);
      if (q.flag) expect(countryById.has(q.flag), q.id).toBe(true);
    }
  });
  it('選択式：4択で、正解が選択肢にふくまれ、選択肢がかぶらない', () => {
    for (const q of choice) {
      const ids = q.choices!.map((c) => c.id);
      expect(ids, q.id).toHaveLength(4);
      expect(ids, q.id).toContain(q.answer);
      expect(new Set(ids).size, q.id).toBe(4);
      const labels = q.choices!.map((c) => c.text ?? c.flag);
      expect(new Set(labels).size, q.id).toBe(4);
      for (const c of q.choices!) if (c.flag) expect(countryById.has(c.flag), `${q.id}: ${c.flag}`).toBe(true);
    }
  });
  it('記述式：カタカナの読みと、漢字の国名の両方が正解になる', () => {
    for (const q of written) {
      const accepted = q.acceptedAnswers!.map(normalizeAnswer);
      const c = countryById.get(q.countryIds[0])!;
      expect(accepted, q.id).toContain(normalizeAnswer(c.reading));
      expect(accepted, q.id).toContain(normalizeAnswer(c.name));
      expect(accepted, q.id).toContain(normalizeAnswer(c.official));
    }
  });
  it('解説に国旗の特ちょうと見分け方が入っている', () => {
    for (const q of pool) expect(q.explanation, q.id).toContain('【見分け方】');
  });
  it('問題文に答えの国名が出ていない（国名を答える問題）', () => {
    for (const q of pool) {
      if (['flagToName', 'descriptionToName', 'symbolToName'].includes(q.type) || q.format === 'written') {
        // 地域のヒント（「北アメリカの国」など）はのぞいて調べる
        const prompt = q.prompt.replace(/ヒント：[^。]+の国。/, '');
        expect(prompt.includes(q.answerText), q.id).toBe(false);
      }
    }
  });
  it('図柄・色・星・説明・意味の問題は国旗を見せない（見れば分かる問題にしない）', () => {
    for (const q of pool) {
      if (['descriptionToName', 'symbolToName', 'whatIsDrawn', 'starCount', 'unusedColor', 'meaning'].includes(q.type)) {
        expect(q.flag, q.id).toBeUndefined();
        expect(q.choices!.some((c) => c.flag), q.id).toBe(false);
      }
    }
  });
});
