import { useState } from 'react';
import {
  applyDakuten, applyHandakuten, applySmall, backspace, KANA_COLUMNS, kanaFor, transformLast,
} from '../logic/kana';
import { sounds } from '../logic/sound';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  submitLabel?: string;
  maxLength?: number;
  /** ひらがな・カタカナを切りかえるキーを出す（名前の入力用） */
  allowHiragana?: boolean;
}

// 50音表と同じく、ア行を右はしに置く
const COLUMNS = [...KANA_COLUMNS].reverse();

export function KanaKeyboard({ value, onChange, onSubmit, submitLabel = '決定', maxLength = 20, allowHiragana }: Props) {
  const [hiragana, setHiragana] = useState(false);
  const press = (fn: () => void) => () => {
    sounds.tap();
    fn();
  };
  const type = (k: string) => {
    if ([...value].length < maxLength) onChange(value + kanaFor(k, hiragana));
  };

  return (
    <div className="kana-keyboard" role="group" aria-label="50音キーボード">
      <div className="kana-grid">
        {COLUMNS.map((col, ci) =>
          col.map((k, ri) =>
            k ? (
              <button
                key={`${ci}-${ri}`}
                className="key"
                style={{ gridColumn: ci + 1, gridRow: ri + 1 }}
                onClick={press(() => type(k))}
              >
                {kanaFor(k, hiragana)}
              </button>
            ) : null,
          ),
        )}
      </div>
      <div className="kana-func">
        {allowHiragana && (
          <button className="key func" onClick={press(() => setHiragana(!hiragana))}>
            {hiragana ? 'カナ' : 'かな'}
          </button>
        )}
        <button className="key func" onClick={press(() => onChange(transformLast(value, applySmall)))}>小</button>
        <button className="key func" onClick={press(() => onChange(transformLast(value, applyDakuten)))}>゛</button>
        <button className="key func" onClick={press(() => onChange(transformLast(value, applyHandakuten)))}>゜</button>
        <button className="key func" onClick={press(() => type('ー'))}>ー</button>
        <button className="key func delete" onClick={press(() => onChange(backspace(value)))}>消す</button>
        <button className="key func submit" onClick={press(onSubmit)}>{submitLabel}</button>
      </div>
    </div>
  );
}
