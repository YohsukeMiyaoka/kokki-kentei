// 50音キーボード用の文字の変換

const DAKUTEN: Record<string, string> = {
  カ: 'ガ', キ: 'ギ', ク: 'グ', ケ: 'ゲ', コ: 'ゴ',
  サ: 'ザ', シ: 'ジ', ス: 'ズ', セ: 'ゼ', ソ: 'ゾ',
  タ: 'ダ', チ: 'ヂ', ツ: 'ヅ', テ: 'デ', ト: 'ド',
  ハ: 'バ', ヒ: 'ビ', フ: 'ブ', ヘ: 'ベ', ホ: 'ボ',
  ウ: 'ヴ',
};
const HANDAKUTEN: Record<string, string> = { ハ: 'パ', ヒ: 'ピ', フ: 'プ', ヘ: 'ペ', ホ: 'ポ' };
const SMALL: Record<string, string> = {
  ア: 'ァ', イ: 'ィ', ウ: 'ゥ', エ: 'ェ', オ: 'ォ', ツ: 'ッ', ヤ: 'ャ', ユ: 'ュ', ヨ: 'ョ', ワ: 'ヮ',
};

const invert = (m: Record<string, string>) => Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k]));
const DAKUTEN_BACK = invert(DAKUTEN);
const HANDAKUTEN_BACK = invert(HANDAKUTEN);
const SMALL_BACK = invert(SMALL);

function replaceLast(text: string, fn: (ch: string) => string | undefined): string {
  const chars = [...text];
  const last = chars.pop();
  if (last === undefined) return text;
  const next = fn(last);
  return next === undefined ? text : chars.join('') + next;
}

/** 最後の文字に濁点をつける（もう一度おすと外す。パ→バにもする） */
export function applyDakuten(text: string): string {
  return replaceLast(text, (ch) => DAKUTEN[ch] ?? DAKUTEN_BACK[ch] ?? (HANDAKUTEN_BACK[ch] ? DAKUTEN[HANDAKUTEN_BACK[ch]] : undefined));
}

/** 最後の文字に半濁点をつける（もう一度おすと外す。バ→パにもする） */
export function applyHandakuten(text: string): string {
  return replaceLast(text, (ch) => {
    const base = DAKUTEN_BACK[ch] ?? ch;
    return HANDAKUTEN[base] ?? HANDAKUTEN_BACK[ch];
  });
}

/** 最後の文字を小さい文字にする（もう一度おすと大きくもどす） */
export function applySmall(text: string): string {
  return replaceLast(text, (ch) => SMALL[ch] ?? SMALL_BACK[ch]);
}

const toHiragana = (s: string) => s.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
const isHiragana = (ch: string) => /[ぁ-ゖ]/.test(ch);

/** ひらがなで入力しているときも濁点などが使えるよう、最後の文字をカタカナにしてから変換する */
export function transformLast(text: string, fn: (text: string) => string): string {
  const chars = [...text];
  const last = chars.pop();
  if (last === undefined) return text;
  if (!isHiragana(last)) return fn(text);
  const kata = String.fromCharCode(last.charCodeAt(0) + 0x60);
  return chars.join('') + toHiragana(fn(kata));
}

export const kanaFor = (katakana: string, hiragana: boolean) => (hiragana ? toHiragana(katakana) : katakana);

export function backspace(text: string): string {
  return [...text].slice(0, -1).join('');
}

/** キーボードの50音（列ごと。右から ア行→ワ行 の順にならべる） */
export const KANA_COLUMNS: (string | null)[][] = [
  ['ア', 'イ', 'ウ', 'エ', 'オ'],
  ['カ', 'キ', 'ク', 'ケ', 'コ'],
  ['サ', 'シ', 'ス', 'セ', 'ソ'],
  ['タ', 'チ', 'ツ', 'テ', 'ト'],
  ['ナ', 'ニ', 'ヌ', 'ネ', 'ノ'],
  ['ハ', 'ヒ', 'フ', 'ヘ', 'ホ'],
  ['マ', 'ミ', 'ム', 'メ', 'モ'],
  ['ヤ', null, 'ユ', null, 'ヨ'],
  ['ラ', 'リ', 'ル', 'レ', 'ロ'],
  ['ワ', null, 'ヲ', null, 'ン'],
];
