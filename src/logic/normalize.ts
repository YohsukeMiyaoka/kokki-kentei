/** ひらがなをカタカナにする */
export function toKatakana(s: string): string {
  return s.replace(/[ぁ-ゖ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60));
}

/**
 * 採点用に答えをそろえる：全角/半角をそろえ、ひらがな→カタカナ、空白と「・」をのぞく。
 * iPadのキーボードや音声入力で入る句読点（「日本。」など）も無視する。
 */
export function normalizeAnswer(s: string): string {
  return toKatakana(s.normalize('NFKC'))
    .replace(/[\s・･。、.,!?！？「」]/g, '')
    .trim();
}

export function isWrittenCorrect(input: string, accepted: string[]): boolean {
  const v = normalizeAnswer(input);
  if (!v) return false;
  return accepted.some((a) => normalizeAnswer(a) === v);
}
