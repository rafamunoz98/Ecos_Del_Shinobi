/**
 * Sintetizador mínimo sobre Web Audio: tonos con envolvente y ráfagas de ruido filtrado. Funciona con un `AudioContext` y
 * también con un `OfflineAudioContext` (así se renderizan los sonidos sin altavoces para medir niveles).
 */
export interface ToneOpts {
  type?: OscillatorType;
  /** Volumen de pico (0..1). */
  vol?: number;
  /** Subida inicial (s). */
  attack?: number;
  /** Frecuencia final si el tono se desliza (Hz). */
  slideTo?: number;
  /** Paso bajo (Hz) y, opcionalmente, hacia dónde se cierra. */
  lp?: number;
  lpTo?: number;
  /** Panorama estéreo -1..1. */
  pan?: number;
  detune?: number;
}

export interface NoiseOpts {
  vol?: number;
  attack?: number;
  filter?: BiquadFilterType;
  f0?: number;
  f1?: number;
  q?: number;
  pan?: number;
}

const FLOOR = 0.0001;

export const midiToHz = (m: number): number => 440 * 2 ** ((m - 69) / 12);

/** Ruido blanco reproducible (no usa Math.random para que dos renders suenen igual). */
function whiteNoise(ctx: BaseAudioContext, seconds = 3): AudioBuffer {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let s = 0x9e3779b9;
  for (let i = 0; i < len; i++) {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    data[i] = ((s >>> 0) / 0xffffffff) * 2 - 1;
  }
  return buf;
}

export class Synth {
  private readonly noiseBuf: AudioBuffer;
  private noiseAt = 0;

  constructor(
    readonly ctx: BaseAudioContext,
    readonly out: AudioNode,
  ) {
    this.noiseBuf = whiteNoise(ctx);
  }

  private chain(t: number, dur: number, vol: number, attack: number, pan: number | undefined): GainNode {
    const g = this.ctx.createGain();
    const a = Math.min(Math.max(attack, 0.002), dur * 0.8);
    g.gain.setValueAtTime(FLOOR, t);
    g.gain.linearRampToValueAtTime(Math.max(vol, FLOOR * 2), t + a);
    g.gain.exponentialRampToValueAtTime(FLOOR, t + dur);
    let tail: AudioNode = g;
    if (pan !== undefined && pan !== 0 && typeof this.ctx.createStereoPanner === 'function') {
      const p = this.ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      g.connect(p);
      tail = p;
    }
    tail.connect(this.out);
    return g;
  }

  /**
   * Medio fotograma de desplazamiento: si un sonido arranca justo en una muestra exacta (ocurre al sumar tiempos redondos),
   * Chromium deja pasar esa primera muestra con la ganancia por defecto y se oye un chasquido. Así nunca cae alineado.
   */
  private at(t: number): number {
    return t + 0.5 / this.ctx.sampleRate;
  }

  /** Un tono de `dur` segundos que empieza en `t`. */
  tone(start: number, freq: number, dur: number, o: ToneOpts = {}): void {
    const t = this.at(start);
    const { type = 'sine', vol = 0.2, attack = 0.005, slideTo, lp, lpTo, pan, detune } = o;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(1, freq), t);
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    if (detune) osc.detune.value = detune;
    const g = this.chain(t, dur, vol, attack, pan);
    if (lp !== undefined) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(Math.max(20, lp), t);
      if (lpTo !== undefined) f.frequency.exponentialRampToValueAtTime(Math.max(20, lpTo), t + dur);
      osc.connect(f);
      f.connect(g);
    } else {
      osc.connect(g);
    }
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  /** Una ráfaga de ruido filtrado (silbidos, golpes secos, polvo). */
  noise(start: number, dur: number, o: NoiseOpts = {}): void {
    const t = this.at(start);
    const { vol = 0.2, attack = 0.004, filter = 'lowpass', f0 = 1200, f1, q = 0.8, pan } = o;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = filter;
    f.Q.value = q;
    f.frequency.setValueAtTime(Math.max(20, f0), t);
    if (f1 !== undefined) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = this.chain(t, dur, vol, attack, pan);
    src.connect(f);
    f.connect(g);
    // Cada ráfaga empieza en un punto distinto del búfer: no suenan idénticas.
    this.noiseAt = (this.noiseAt + 0.37) % 1.5;
    src.start(t, this.noiseAt, dur + 0.05);
  }
}
