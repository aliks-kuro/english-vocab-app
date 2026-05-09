let _ctx: AudioContext | null = null;
let _enabled = true;

export function setSoundEnabled(v: boolean) { _enabled = v; }

function ac(): AudioContext | null {
  if (!_enabled) return null;
  try {
    if (!_ctx) _ctx = new AudioContext();
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  } catch { return null; }
}

function note(
  c: AudioContext, freq: number, type: OscillatorType,
  startT: number, duration: number, volume: number, freqEnd?: number,
) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.connect(g);
  g.connect(c.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startT);
  if (freqEnd !== undefined) osc.frequency.linearRampToValueAtTime(freqEnd, startT + duration);
  g.gain.setValueAtTime(0, startT);
  g.gain.linearRampToValueAtTime(volume, startT + 0.01);
  g.gain.linearRampToValueAtTime(0, startT + duration);
  osc.start(startT);
  osc.stop(startT + duration + 0.02);
}

export const sfx = {
  tileClick() {
    const c = ac(); if (!c) return;
    note(c, 1100, 'sine', c.currentTime, 0.07, 0.18);
  },

  correct() {
    const c = ac(); if (!c) return;
    const t = c.currentTime;
    note(c, 523, 'sine', t, 0.12, 0.25);
    note(c, 659, 'sine', t + 0.09, 0.12, 0.28);
    note(c, 784, 'sine', t + 0.18, 0.22, 0.32);
  },

  wrong() {
    const c = ac(); if (!c) return;
    note(c, 180, 'sawtooth', c.currentTime, 0.22, 0.28, 90);
  },

  damage() {
    const c = ac(); if (!c) return;
    const t = c.currentTime;
    note(c, 110, 'sawtooth', t, 0.32, 0.4, 55);
    note(c, 200, 'square',   t, 0.15, 0.18, 80);
  },

  monsterAttack() {
    const c = ac(); if (!c) return;
    note(c, 520, 'sawtooth', c.currentTime, 0.42, 0.28, 75);
  },

  timeout() {
    const c = ac(); if (!c) return;
    const t = c.currentTime;
    [392, 349, 330].forEach((f, i) => note(c, f, 'square', t + i * 0.18, 0.16, 0.2));
  },

  victory() {
    const c = ac(); if (!c) return;
    const t = c.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => note(c, f, 'sine', t + i * 0.13, 0.2, 0.3));
    [523, 659, 784].forEach(f => note(c, f, 'sine', t + 0.60, 0.55, 0.2));
  },

  defeat() {
    const c = ac(); if (!c) return;
    const t = c.currentTime;
    [392, 349, 294, 220].forEach((f, i) => note(c, f, 'sine', t + i * 0.24, 0.22, 0.25));
  },

  combo(n: number) {
    const c = ac(); if (!c) return;
    const t = c.currentTime;
    const freq = 440 + n * 75;
    note(c, freq, 'sine', t, 0.14, 0.28);
    if (n >= 4) note(c, freq * 1.5, 'sine', t + 0.07, 0.12, 0.2);
  },
};
