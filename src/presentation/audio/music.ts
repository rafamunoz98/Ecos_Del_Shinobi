import type { Mood } from './soundMap';
import { type Synth, midiToHz } from './synth';

/**
 * Música generativa: nunca se repite igual. Una escala pentatónica japonesa (hirajoshi al explorar, "in", más oscura, en
 * tensión y contra jefes) sobre un bordón; un koto que camina por la escala, un shakuhachi que respira de vez en cuando y
 * tambores taiko que entran con la tensión. Usa su propio generador pseudoaleatorio: jamás toca el del juego.
 */
export type Layer = 'koto' | 'bass' | 'breath' | 'taiko' | 'tick';

export interface MusicEvent {
  layer: Layer;
  /** Nota MIDI (sin sentido en los tambores). */
  midi: number;
  /** Fuerza 0..1. */
  vel: number;
  /** Duración en segundos para las notas largas. */
  dur: number;
}

interface MoodParams {
  /** Corcheas por minuto ÷ 2. */
  bpm: number;
  scale: readonly number[];
  /** Probabilidad de koto en un pulso fuerte / débil. */
  koto: readonly [number, number];
  /** Tambor: 0 = nunca. */
  drum: 0 | 1 | 2;
  /** Nivel del bordón (0..1). */
  drone: number;
  breath: number;
}

const HIRAJOSHI = [0, 2, 3, 7, 8];
const IN_SCALE = [0, 1, 5, 7, 8];

export const MOOD_PARAMS: Record<Exclude<Mood, 'off'>, MoodParams> = {
  explore: { bpm: 64, scale: HIRAJOSHI, koto: [0.55, 0.16], drum: 0, drone: 0.8, breath: 0.4 },
  tense: { bpm: 90, scale: IN_SCALE, koto: [0.6, 0.3], drum: 1, drone: 1, breath: 0.1 },
  boss: { bpm: 112, scale: IN_SCALE, koto: [0.8, 0.45], drum: 2, drone: 1.2, breath: 0 },
};

/** Compases de 8 corcheas. Pulso: 0..7 dentro del compás. */
export const STEPS_PER_BAR = 8;

/** Compositor: dado el número de corchea, el ánimo y la tónica, decide qué suena. Determinista para una semilla. */
export class Composer {
  private state: number;
  private degree = 2;

  constructor(seed = 0x5eed) {
    this.state = seed >>> 0 || 1;
  }

  private rand(): number {
    // mulberry32
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  private noteAt(scale: readonly number[], degree: number, root: number): number {
    const n = scale.length;
    const oct = Math.floor(degree / n);
    const idx = ((degree % n) + n) % n;
    return root + 12 + (scale[idx] ?? 0) + oct * 12;
  }

  step(n: number, mood: Exclude<Mood, 'off'>, root: number): MusicEvent[] {
    const p = MOOD_PARAMS[mood];
    const out: MusicEvent[] = [];
    const inBar = n % STEPS_PER_BAR;
    const strong = inBar % 2 === 0;

    // Bajo: la tónica al inicio del compás (y a media en tensión).
    if (inBar === 0 && this.rand() < 0.85) out.push({ layer: 'bass', midi: root - 12, vel: 0.7, dur: 2.4 });
    else if (inBar === 4 && mood !== 'explore') out.push({ layer: 'bass', midi: root - 12 + (this.rand() < 0.5 ? 7 : 0), vel: 0.5, dur: 1.2 });

    // Koto: paseo aleatorio por la escala; cada 16 corcheas vuelve a casa.
    if (this.rand() < (strong ? p.koto[0] : p.koto[1])) {
      const phraseEnd = n % (STEPS_PER_BAR * 2) === STEPS_PER_BAR * 2 - 2;
      const delta = phraseEnd ? Math.sign(2 - this.degree) * Math.min(2, Math.abs(2 - this.degree)) : [-2, -1, -1, 0, 1, 1, 2][Math.floor(this.rand() * 7)] ?? 0;
      this.degree = Math.max(-3, Math.min(p.scale.length * 2, this.degree + delta));
      out.push({ layer: 'koto', midi: this.noteAt(p.scale, this.degree, root), vel: strong ? 0.8 : 0.5, dur: 1.3 });
    }

    // Shakuhachi: una nota larga cada dos compases, a veces.
    if (inBar === 0 && n % (STEPS_PER_BAR * 2) === 0 && this.rand() < p.breath) {
      const d = [2, 3, 4][Math.floor(this.rand() * 3)] ?? 3;
      out.push({ layer: 'breath', midi: this.noteAt(p.scale, d, root) + 12, vel: 0.6, dur: 3.4 });
    }

    // Tambores: en tensión, un golpe grave cada compás y medio; contra jefes, un pulso constante.
    if (p.drum >= 1 && inBar % 4 === 0) out.push({ layer: 'taiko', midi: 0, vel: inBar === 0 ? 0.9 : 0.6, dur: 0.4 });
    if (p.drum === 2 && inBar === 6) out.push({ layer: 'taiko', midi: 0, vel: 0.55, dur: 0.3 });
    if (p.drum === 2 && inBar % 2 === 1) out.push({ layer: 'tick', midi: 0, vel: 0.35, dur: 0.05 });
    return out;
  }
}

/** Convierte un evento musical en sonido a partir de `t`. */
export function playMusicEvent(s: Synth, ev: MusicEvent, t: number): void {
  const f = midiToHz(ev.midi);
  switch (ev.layer) {
    case 'koto': {
      s.tone(t, f, ev.dur, { vol: 0.2 * ev.vel, type: 'triangle', attack: 0.003, lp: 3200, lpTo: 700 });
      s.tone(t, f * 2, ev.dur * 0.4, { vol: 0.06 * ev.vel, attack: 0.002 });
      s.noise(t, 0.03, { vol: 0.1 * ev.vel, filter: 'bandpass', f0: f * 3, q: 2 });
      break;
    }
    case 'bass':
      s.tone(t, f, ev.dur, { vol: 0.3 * ev.vel, type: 'sine', attack: 0.04 });
      s.tone(t, f * 2, ev.dur * 0.6, { vol: 0.06 * ev.vel, type: 'triangle', attack: 0.05, lp: 500 });
      break;
    case 'breath':
      s.tone(t, f, ev.dur, { vol: 0.09 * ev.vel, type: 'sine', attack: 0.7 });
      s.noise(t, ev.dur, { vol: 0.06 * ev.vel, filter: 'bandpass', f0: f * 2, q: 6, attack: 0.8 });
      break;
    case 'taiko':
      s.tone(t, 150, 0.35, { vol: 0.5 * ev.vel, slideTo: 48 });
      s.noise(t, 0.12, { vol: 0.22 * ev.vel, f0: 900, f1: 200 });
      break;
    case 'tick':
      s.noise(t, 0.05, { vol: 0.14 * ev.vel, filter: 'highpass', f0: 5200 });
      break;
  }
}
