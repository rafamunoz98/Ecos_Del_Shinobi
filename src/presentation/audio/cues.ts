import type { Cue } from './soundMap';
import { type Synth, midiToHz } from './synth';

/**
 * Los efectos de sonido, sintetizados con osciladores y ruido (sin archivos). Cada uno recibe el sintetizador, el instante
 * de inicio y una variante (para que dos pasos seguidos no suenen idénticos).
 */
type CueFn = (s: Synth, t: number, v: number) => void;

/** Pentatónica japonesa (hirajoshi) sobre la 4.ª octava: la paleta de las campanas y los arpegios. */
const PENTA = [62, 64, 65, 69, 70, 74, 76, 77, 81, 82];

const bell = (s: Synth, t: number, midi: number, vol = 0.12, dur = 0.9): void => {
  const f = midiToHz(midi);
  s.tone(t, f, dur, { vol, attack: 0.004 });
  s.tone(t, f * 2.76, dur * 0.45, { vol: vol * 0.35, attack: 0.002 });
  s.tone(t, f * 5.4, dur * 0.2, { vol: vol * 0.15, attack: 0.002 });
};

const thud = (s: Synth, t: number, vol = 0.35, f = 150): void => {
  s.tone(t, f, 0.16, { vol, slideTo: f * 0.4, type: 'sine' });
  s.noise(t, 0.08, { vol: vol * 0.7, f0: 1400, f1: 300 });
};

const swish = (s: Synth, t: number, f0: number, f1: number, dur: number, vol: number, q = 1.2): void =>
  s.noise(t, dur, { vol, filter: 'bandpass', f0, f1, q, attack: dur * 0.3 });

const arp = (s: Synth, t: number, notes: readonly number[], gap: number, vol: number): void =>
  notes.forEach((n, i) => bell(s, t + i * gap, n, vol, 0.7));

const gong = (s: Synth, t: number, base: number, vol = 0.22): void => {
  for (const [m, k] of [[1, 1], [1.505, 0.7], [2.01, 0.5], [2.76, 0.3]] as const) {
    s.tone(t, base * m, 1.9, { vol: vol * k, attack: 0.01, detune: m * 3 });
  }
  s.noise(t, 0.25, { vol: vol * 0.5, f0: 3000, f1: 800 });
};

export const CUE_FNS: Record<Cue, CueFn> = {
  step: (s, t, v) => {
    s.noise(t, 0.05, { vol: 0.1, filter: 'bandpass', f0: 700 + (v % 3) * 140, f1: 350, q: 1.4 });
    s.tone(t, 95 + (v % 2) * 12, 0.05, { vol: 0.07, slideTo: 60 });
  },
  wait: (s, t) => s.noise(t, 0.45, { vol: 0.06, f0: 900, f1: 300, attack: 0.18 }),
  search: (s, t) => {
    for (let i = 0; i < 3; i++) {
      s.tone(t + i * 0.17, 260 + i * 25, 0.07, { vol: 0.16, type: 'triangle', slideTo: 170 });
      s.noise(t + i * 0.17, 0.04, { vol: 0.07, f0: 1800, f1: 900 });
    }
    s.tone(t + 0.1, 620, 0.6, { vol: 0.04, slideTo: 980, attack: 0.2 });
  },
  secret: (s, t) => {
    s.noise(t, 0.75, { vol: 0.28, f0: 500, f1: 120, q: 0.6, attack: 0.1 });
    thud(s, t + 0.62, 0.3, 90);
    arp(s, t + 0.25, [74, 77, 81, 86], 0.11, 0.1);
  },
  slash: (s, t) => swish(s, t, 2500, 7500, 0.13, 0.22),
  whip: (s, t) => {
    swish(s, t, 1800, 5200, 0.1, 0.16);
    s.noise(t + 0.08, 0.04, { vol: 0.3, filter: 'highpass', f0: 5000 });
  },
  thrust: (s, t) => {
    swish(s, t, 1700, 800, 0.1, 0.2);
    s.tone(t, 210, 0.08, { vol: 0.1, type: 'triangle', slideTo: 130 });
  },
  sneak: (s, t) => {
    s.noise(t, 0.07, { vol: 0.3, filter: 'highpass', f0: 4200 });
    s.tone(t, 900, 0.12, { vol: 0.09, type: 'square', slideTo: 420, lp: 2500 });
    thud(s, t + 0.04, 0.3, 130);
  },
  hit: (s, t, v) => thud(s, t, 0.34, 170 - (v % 3) * 15),
  hurt: (s, t) => {
    s.tone(t, 230, 0.24, { vol: 0.18, type: 'sawtooth', slideTo: 100, lp: 900, lpTo: 300 });
    thud(s, t, 0.3, 120);
  },
  kill: (s, t) => {
    s.tone(t, 340, 0.4, { vol: 0.2, type: 'triangle', slideTo: 80 });
    s.noise(t, 0.3, { vol: 0.16, f0: 900, f1: 200 });
    thud(s, t + 0.12, 0.25, 90);
  },
  boss_down: (s, t) => {
    gong(s, t, 110, 0.26);
    arp(s, t + 0.5, [62, 65, 69, 74, 77, 81], 0.14, 0.12);
  },
  cast_ascua: (s, t) => {
    swish(s, t, 400, 1800, 0.5, 0.26, 0.8);
    s.tone(t, 110, 0.5, { vol: 0.16, type: 'sawtooth', slideTo: 260, lp: 700, lpTo: 1800 });
    for (let i = 0; i < 6; i++) s.noise(t + 0.12 + i * 0.07, 0.025, { vol: 0.12, filter: 'highpass', f0: 3000 + i * 300 });
  },
  cast_marea: (s, t) => {
    s.tone(t, 300, 0.55, { vol: 0.13, slideTo: 640 });
    s.tone(t, 304, 0.55, { vol: 0.1, slideTo: 650, detune: 8 });
    s.noise(t, 0.55, { vol: 0.12, f0: 700, f1: 1400, attack: 0.2 });
    for (let i = 0; i < 5; i++) s.tone(t + 0.1 + i * 0.08, 500 + i * 130, 0.07, { vol: 0.08, slideTo: 800 + i * 150 });
  },
  cast_vendaval: (s, t) => {
    swish(s, t, 500, 2600, 0.3, 0.26, 3);
    swish(s, t + 0.28, 2600, 700, 0.35, 0.22, 3);
    s.tone(t, 420, 0.6, { vol: 0.05, slideTo: 720, attack: 0.25 });
  },
  cast_piedra: (s, t) => {
    s.tone(t, 90, 0.45, { vol: 0.4, slideTo: 45 });
    s.noise(t, 0.4, { vol: 0.28, f0: 600, f1: 150 });
    for (let i = 0; i < 4; i++) s.noise(t + 0.08 + i * 0.07, 0.03, { vol: 0.2, f0: 1500, f1: 500 });
  },
  cast_rayo: (s, t) => {
    s.tone(t, 1900, 0.18, { vol: 0.13, type: 'square', slideTo: 180, lp: 6000 });
    s.noise(t, 0.16, { vol: 0.28, filter: 'highpass', f0: 3500, f1: 9000 });
    s.tone(t + 0.07, 2300, 0.12, { vol: 0.09, type: 'square', slideTo: 260, lp: 6000 });
    thud(s, t + 0.04, 0.22, 100);
  },
  cast_neutral: (s, t) => {
    s.tone(t, 520, 0.4, { vol: 0.1, slideTo: 880 });
    bell(s, t + 0.15, 81, 0.07, 0.5);
  },
  throw: (s, t) => swish(s, t, 2200, 900, 0.14, 0.18),
  pickup: (s, t) => {
    s.tone(t, 880, 0.12, { vol: 0.13 });
    s.tone(t + 0.07, 1320, 0.2, { vol: 0.13 });
  },
  coin: (s, t) => {
    s.tone(t, 1568, 0.09, { vol: 0.12, type: 'triangle' });
    s.tone(t + 0.07, 2093, 0.3, { vol: 0.12, type: 'triangle' });
  },
  unlock: (s, t) => {
    s.tone(t, 420, 0.04, { vol: 0.14, type: 'square', lp: 2000 });
    s.tone(t + 0.09, 640, 0.05, { vol: 0.14, type: 'square', lp: 2000 });
    s.noise(t + 0.09, 0.03, { vol: 0.12, filter: 'highpass', f0: 4000 });
  },
  chest: (s, t) => {
    s.tone(t, 130, 0.3, { vol: 0.1, type: 'sawtooth', slideTo: 190, lp: 600 });
    arp(s, t + 0.28, [74, 77, 81], 0.09, 0.09);
  },
  equip: (s, t) => {
    s.noise(t, 0.1, { vol: 0.16, filter: 'highpass', f0: 2200 });
    s.tone(t + 0.02, 520, 0.12, { vol: 0.1, type: 'triangle', slideTo: 720 });
  },
  potion: (s, t) => {
    for (let i = 0; i < 3; i++) s.tone(t + i * 0.12, 300 - i * 30, 0.09, { vol: 0.18, slideTo: 190 });
    s.tone(t + 0.4, 700, 0.18, { vol: 0.07, slideTo: 1100 });
  },
  heal: (s, t) => arp(s, t, [72, 76, 79, 84], 0.09, 0.1),
  identify: (s, t) => {
    bell(s, t, 81, 0.1, 1);
    bell(s, t + 0.13, 88, 0.08, 1);
  },
  learn: (s, t) => arp(s, t, PENTA.slice(0, 6), 0.075, 0.1),
  levelup: (s, t) => {
    arp(s, t, [PENTA[0] ?? 62, 65, 69, 74, 77, 81], 0.09, 0.13);
    for (const m of [74, 81, 86]) bell(s, t + 0.65, m, 0.1, 1.4);
  },
  stairs: (s, t) => {
    s.tone(t, 280, 0.7, { vol: 0.1, slideTo: 90, attack: 0.1 });
    for (let i = 0; i < 3; i++) s.noise(t + i * 0.16, 0.05, { vol: 0.09, filter: 'bandpass', f0: 700, f1: 350, q: 1.4 });
  },
  fall: (s, t) => {
    s.tone(t, 620, 0.55, { vol: 0.14, slideTo: 70 });
    thud(s, t + 0.55, 0.4, 80);
  },
  alert: (s, t) => {
    s.tone(t, 880, 0.09, { vol: 0.1, type: 'square', lp: 2600 });
    s.tone(t + 0.1, 660, 0.14, { vol: 0.1, type: 'square', lp: 2600 });
  },
  warn: (s, t) => {
    s.tone(t, 110, 0.5, { vol: 0.14, type: 'sawtooth', lp: 500, lpTo: 260, attack: 0.15 });
    s.tone(t + 0.02, 116, 0.5, { vol: 0.1, type: 'sawtooth', lp: 500, lpTo: 260, attack: 0.15 });
  },
  boom: (s, t) => {
    thud(s, t, 0.45, 110);
    s.noise(t, 0.35, { vol: 0.25, f0: 1800, f1: 200 });
  },
  boss_phase: (s, t) => gong(s, t, 98, 0.3),
  shield: (s, t) => {
    s.tone(t, 1400, 0.35, { vol: 0.08, type: 'triangle' });
    s.tone(t + 0.06, 1850, 0.3, { vol: 0.07, type: 'triangle' });
  },
  clang: (s, t) => {
    for (const k of [1, 1.46, 1.93, 2.62]) s.tone(t, 1150 * k, 0.28, { vol: 0.07, type: 'triangle' });
    s.noise(t, 0.03, { vol: 0.2, filter: 'highpass', f0: 4000 });
  },
  shatter: (s, t) => {
    s.noise(t, 0.3, { vol: 0.22, filter: 'highpass', f0: 3500, f1: 7000 });
    for (let i = 0; i < 5; i++) s.tone(t + 0.04 + i * 0.05, 2200 + i * 380, 0.14, { vol: 0.06, type: 'triangle' });
  },
  poof: (s, t) => {
    s.noise(t, 0.25, { vol: 0.22, f0: 1500, f1: 300 });
    s.tone(t + 0.03, 330, 0.06, { vol: 0.12, type: 'square', lp: 1500 });
  },
  thud: (s, t) => thud(s, t, 0.38, 120),
  barrier: (s, t) => {
    s.noise(t, 0.32, { vol: 0.2, f0: 420, f1: 180, attack: 0.08 });
    s.tone(t, 80, 0.3, { vol: 0.22, slideTo: 60 });
  },
  status: (s, t) => s.tone(t, 620, 0.14, { vol: 0.09, type: 'triangle', slideTo: 380 }),
  summon: (s, t) => {
    s.tone(t, 280, 0.5, { vol: 0.11, slideTo: 900 });
    arp(s, t + 0.2, [81, 86, 88], 0.08, 0.07);
  },
  dialog: (s, t, v) => s.tone(t, 420 + (v % 3) * 40, 0.05, { vol: 0.05 }),
  error: (s, t) => s.tone(t, 160, 0.13, { vol: 0.1, type: 'square', slideTo: 115, lp: 600 }),
  ui: (s, t) => s.tone(t, 760, 0.04, { vol: 0.06, type: 'triangle' }),
  defeat: (s, t) => {
    [64, 60, 57, 52].forEach((m, i) => s.tone(t + i * 0.38, midiToHz(m), 0.9, { vol: 0.16, type: 'triangle', attack: 0.04 }));
    gong(s, t + 1.4, 82, 0.22);
  },
  victory: (s, t) => {
    arp(s, t, [62, 65, 69, 74, 77, 81, 86], 0.16, 0.13);
    for (const m of [62, 69, 74, 81]) bell(s, t + 1.3, m, 0.1, 2.2);
    gong(s, t + 1.3, 110, 0.16);
  },
};

export const playCue = (s: Synth, cue: Cue, t: number, variant = 0): void => CUE_FNS[cue](s, t, variant);
