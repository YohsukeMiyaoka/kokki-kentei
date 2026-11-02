// 効果音（音のファイルは使わず、Web Audioでその場で作る）
let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

function audio(): AudioContext | null {
  if (!enabled) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.2) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur);
}

export const sounds = {
  tap: () => tone(660, 0, 0.06, 'triangle', 0.08),
  correct: () => {
    tone(1047, 0, 0.15, 'triangle');
    tone(1319, 0.1, 0.3, 'triangle');
  },
  wrong: () => tone(196, 0, 0.35, 'square', 0.08),
  fanfare: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.14, i === 3 ? 0.6 : 0.2, 'triangle')),
};
