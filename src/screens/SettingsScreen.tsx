import type { Grade, InputMode, Settings } from '../types';

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
  onBack: () => void;
}

const MIN = 10;
const MAX = 120;
const STEP = 5;
const INPUT_MODES: [InputMode, string][] = [
  ['kana', '50音'],
  ['native', 'キーボード・音声'],
];

export function SettingsScreen({ settings, onChange, onBack }: Props) {
  const setTime = (g: Grade, v: number) =>
    onChange({ ...settings, timeLimitMin: { ...settings.timeLimitMin, [g]: Math.min(MAX, Math.max(MIN, v)) } });

  return (
    <div className="screen settings">
      <header className="review-header">
        <button className="btn ghost small" onClick={onBack}>もどる</button>
        <h1 className="title-sm">設定</h1>
        <span />
      </header>

      <section className="setting-list">
        {([1, 2] as const).map((g) => (
          <div key={g} className="setting">
            <span>{g}級の制限時間</span>
            <div className="stepper">
              <button className="btn round" onClick={() => setTime(g, settings.timeLimitMin[g] - STEP)}>−</button>
              <strong>{settings.timeLimitMin[g]}分</strong>
              <button className="btn round" onClick={() => setTime(g, settings.timeLimitMin[g] + STEP)}>＋</button>
            </div>
          </div>
        ))}
        <div className="setting">
          <span>効果音</span>
          <Toggle on={settings.sound} onChange={(v) => onChange({ ...settings, sound: v })} />
        </div>
        <div className="setting">
          <span>1問ずつ答え合わせ</span>
          <Toggle on={settings.instantFeedback} onChange={(v) => onChange({ ...settings, instantFeedback: v })} />
        </div>
        <div className="setting">
          <span>書く問題の入力</span>
          <div className="tabs">
            {INPUT_MODES.map(([mode, label]) => (
              <button
                key={mode}
                className={`tab ${settings.inputMode === mode ? 'active' : ''}`}
                onClick={() => onChange({ ...settings, inputMode: mode })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>
      <p className="note">
        答え合わせをオフにすると、本物の検定と同じように、最後まで答えが分からないよ。
      </p>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className={`toggle ${on ? 'on' : ''}`} role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span>{on ? 'オン' : 'オフ'}</span>
    </button>
  );
}
