import { Composer, MOOD_PARAMS, playMusicEvent } from './music';
import { playCue } from './cues';
import type { Cue, MusicSetting } from './soundMap';
import { Synth } from './synth';

/**
 * Motor de audio: crea el `AudioContext` (hace falta un gesto del jugador), mezcla efectos y música con un compresor para
 * no saturar, programa la música por adelantado y recuerda en `localStorage` qué ha silenciado el jugador.
 */
export interface AudioPrefs {
  music: boolean;
  sfx: boolean;
}

const PREFS_KEY = 'ecos.audio.v1';
const LOOKAHEAD = 0.45;
const TICK_MS = 90;

type CtxCtor = typeof AudioContext;

function ctxCtor(): CtxCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: CtxCtor; webkitAudioContext?: CtxCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function loadPrefs(): AudioPrefs {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(PREFS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<AudioPrefs>;
      return { music: p.music !== false, sfx: p.sfx !== false };
    }
  } catch {
    /* sin almacenamiento: valores por defecto */
  }
  return { music: true, sfx: true };
}

/** Respuesta al impulso de una sala pequeña de madera y papel: ruido que se apaga (reverb barata y reproducible). */
function impulse(ctx: BaseAudioContext, seconds = 1.6): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let s = 0x1234567 + ch * 7919;
    for (let i = 0; i < len; i++) {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      const noise = ((s >>> 0) / 0xffffffff) * 2 - 1;
      d[i] = noise * (1 - i / len) ** 2.4;
    }
  }
  return buf;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private sfxSynth: Synth | null = null;
  private musicSynth: Synth | null = null;
  private musicBus: GainNode | null = null;
  private droneGain: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextTime = 0;
  private step = 0;
  private readonly composer = new Composer();
  private setting: MusicSetting = { mood: 'off', root: 50 };
  private variant = 0;
  private prefs: AudioPrefs = loadPrefs();
  private readonly listeners = new Set<() => void>();
  private droneOscs: OscillatorNode[] = [];

  get supported(): boolean {
    return ctxCtor() !== null;
  }

  get preferences(): Readonly<AudioPrefs> {
    return this.prefs;
  }

  onChange(fn: () => void): void {
    this.listeners.add(fn);
  }

  private save(): void {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(this.prefs));
    } catch {
      /* sin almacenamiento: no pasa nada */
    }
    for (const fn of this.listeners) fn();
  }

  /** Debe llamarse desde un gesto del jugador (tecla, clic, toque): los navegadores no dejan sonar antes. */
  unlock(): void {
    const Ctor = ctxCtor();
    if (!Ctor) return;
    if (!this.ctx) this.build(new Ctor());
    const ctx = this.ctx;
    if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
    this.refreshMusic();
  }

  private build(ctx: AudioContext): void {
    this.ctx = ctx;
    const master = ctx.createGain();
    master.gain.value = 0.8;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 14;
    comp.ratio.value = 5;
    comp.attack.value = 0.005;
    comp.release.value = 0.2;
    master.connect(comp);
    comp.connect(ctx.destination);

    const reverb = ctx.createConvolver();
    reverb.buffer = impulse(ctx);
    const wet = ctx.createGain();
    wet.gain.value = 0.28;
    reverb.connect(wet);
    wet.connect(master);

    const sfx = ctx.createGain();
    sfx.gain.value = 0.7;
    sfx.connect(master);
    const sfxSend = ctx.createGain();
    sfxSend.gain.value = 0.25;
    sfx.connect(sfxSend);
    sfxSend.connect(reverb);

    const music = ctx.createGain();
    music.gain.value = 0;
    music.connect(master);
    const musicSend = ctx.createGain();
    musicSend.gain.value = 0.6;
    music.connect(musicSend);
    musicSend.connect(reverb);

    this.musicBus = music;
    this.sfxSynth = new Synth(ctx, sfx);
    this.musicSynth = new Synth(ctx, music);
    this.buildDrone(ctx, music);

    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend().catch(() => undefined);
      else void this.ctx.resume().catch(() => undefined);
    });
  }

  /** Bordón: tónica y quinta muy graves y filtradas, que respiran lentamente. */
  private buildDrone(ctx: AudioContext, out: AudioNode): void {
    const g = ctx.createGain();
    g.gain.value = 0;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    lp.Q.value = 0.7;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 140;
    lfo.connect(lfoGain);
    lfoGain.connect(lp.frequency);
    lfo.start();
    for (const [ratio, vol] of [[1, 0.1], [1.5, 0.06], [2, 0.03]] as const) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = (440 * 2 ** ((50 - 12 - 69) / 12)) * ratio;
      const og = ctx.createGain();
      og.gain.value = vol;
      o.connect(og);
      og.connect(lp);
      o.start();
      this.droneOscs.push(o);
    }
    lp.connect(g);
    g.connect(out);
    this.droneGain = g;
  }

  /** Efecto(s) de sonido, escalonados unos milisegundos para que se distingan. */
  play(cues: readonly Cue[]): void {
    cues.forEach((c, i) => this.cue(c, i * 0.075));
  }

  cue(name: Cue, delay = 0): void {
    const ctx = this.ctx;
    const synth = this.sfxSynth;
    if (!ctx || !synth || !this.prefs.sfx || ctx.state !== 'running') return;
    this.variant += 1;
    playCue(synth, name, ctx.currentTime + 0.01 + delay, this.variant);
  }

  /** La música sigue al ánimo de la partida; una nueva tónica (otro sector) retoca el bordón. */
  setMusic(setting: MusicSetting): void {
    const changedRoot = setting.root !== this.setting.root;
    this.setting = setting;
    if (changedRoot) this.retuneDrone();
    this.refreshMusic();
  }

  private retuneDrone(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const base = 440 * 2 ** ((this.setting.root - 12 - 69) / 12);
    this.droneOscs.forEach((o, i) => o.frequency.setTargetAtTime(base * ([1, 1.5, 2][i] ?? 1), ctx.currentTime, 1.5));
  }

  private refreshMusic(): void {
    const ctx = this.ctx;
    const bus = this.musicBus;
    if (!ctx || !bus) return;
    const on = this.prefs.music && this.setting.mood !== 'off';
    bus.gain.setTargetAtTime(on ? 0.3 : 0, ctx.currentTime, on ? 0.8 : 0.5);
    const drone = this.droneGain;
    if (drone) {
      const level = this.setting.mood === 'off' ? 0 : MOOD_PARAMS[this.setting.mood].drone;
      drone.gain.setTargetAtTime(on ? level : 0, ctx.currentTime, 1.2);
    }
    if (on && this.timer === null) {
      this.nextTime = ctx.currentTime + 0.1;
      this.timer = setInterval(() => this.tick(), TICK_MS);
    } else if (!on && this.timer !== null) {
      // Se deja sonar la cola (el bus se apaga solo) y se detiene el programador.
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private tick(): void {
    const ctx = this.ctx;
    const synth = this.musicSynth;
    const mood = this.setting.mood;
    if (!ctx || !synth || mood === 'off' || ctx.state !== 'running') return;
    if (this.nextTime < ctx.currentTime) this.nextTime = ctx.currentTime + 0.05;
    const params = MOOD_PARAMS[mood];
    while (this.nextTime < ctx.currentTime + LOOKAHEAD) {
      for (const ev of this.composer.step(this.step, mood, this.setting.root)) playMusicEvent(synth, ev, this.nextTime);
      this.nextTime += 60 / params.bpm / 2;
      this.step += 1;
    }
  }

  toggleMusic(): boolean {
    this.prefs = { ...this.prefs, music: !this.prefs.music };
    this.save();
    this.refreshMusic();
    return this.prefs.music;
  }

  toggleSfx(): boolean {
    this.prefs = { ...this.prefs, sfx: !this.prefs.sfx };
    this.save();
    if (this.prefs.sfx) this.cue('ui');
    return this.prefs.sfx;
  }
}

export const audio = new AudioEngine();
