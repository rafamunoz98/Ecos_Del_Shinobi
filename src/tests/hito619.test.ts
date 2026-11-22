import { describe, expect, it } from 'vitest';
import { applyCommand } from '../core/engine';
import { travelInterrupted } from '../core/travel';
import type { GameEvent, GameState } from '../core/types';
import { CUE_FNS, playCue } from '../presentation/audio/cues';
import { Composer, MOOD_PARAMS, playMusicEvent, type MusicEvent } from '../presentation/audio/music';
import { ALL_CUES, cuesFor, moodFor, type Cue } from '../presentation/audio/soundMap';
import { Synth, midiToHz } from '../presentation/audio/synth';
import { isTeleport } from '../presentation/art/motion';
import { makeGame, move } from './helpers';

// ---------- Un contexto de audio falso que vigila que nada se programe mal (NaN, rampas a 0...) ----------

class FakeParam {
  value = 0;
  maxRamp = 0;
  private check(v: number, t?: number): void {
    if (!Number.isFinite(v)) throw new Error(`valor no finito: ${v}`);
    if (t !== undefined && (!Number.isFinite(t) || t < 0)) throw new Error(`tiempo inválido: ${t}`);
  }
  setValueAtTime(v: number, t: number): void {
    this.check(v, t);
    this.value = v;
  }
  linearRampToValueAtTime(v: number, t: number): void {
    this.check(v, t);
    this.maxRamp = Math.max(this.maxRamp, v);
  }
  exponentialRampToValueAtTime(v: number, t: number): void {
    this.check(v, t);
    if (v <= 0) throw new Error('una rampa exponencial no puede acabar en 0 (el navegador lanza RangeError)');
  }
  setTargetAtTime(v: number, t: number): void {
    this.check(v, t);
  }
}

class FakeNode {
  readonly connections: FakeNode[] = [];
  connect(n: FakeNode): FakeNode {
    this.connections.push(n);
    return n;
  }
}

class FakeOsc extends FakeNode {
  type = 'sine';
  frequency = new FakeParam();
  detune = new FakeParam();
  started = -1;
  stopped = -1;
  start(t: number): void {
    this.started = t;
  }
  stop(t: number): void {
    this.stopped = t;
  }
}
class FakeGain extends FakeNode {
  gain = new FakeParam();
}
class FakeFilter extends FakeNode {
  type = 'lowpass';
  frequency = new FakeParam();
  Q = new FakeParam();
}
class FakePan extends FakeNode {
  pan = new FakeParam();
}
class FakeSource extends FakeNode {
  buffer: unknown = null;
  started = -1;
  start(t: number, offset = 0, dur = 0): void {
    if (offset < 0 || dur < 0) throw new Error('desplazamiento negativo');
    this.started = t;
  }
}

class FakeCtx {
  sampleRate = 8000;
  oscs: FakeOsc[] = [];
  gains: FakeGain[] = [];
  sources: FakeSource[] = [];
  createBuffer(_ch: number, len: number): { getChannelData: () => Float32Array } {
    const data = new Float32Array(len);
    return { getChannelData: () => data };
  }
  createOscillator(): FakeOsc {
    const o = new FakeOsc();
    this.oscs.push(o);
    return o;
  }
  createGain(): FakeGain {
    const g = new FakeGain();
    this.gains.push(g);
    return g;
  }
  createBiquadFilter(): FakeFilter {
    return new FakeFilter();
  }
  createStereoPanner(): FakePan {
    return new FakePan();
  }
  createBufferSource(): FakeSource {
    const s = new FakeSource();
    this.sources.push(s);
    return s;
  }
}

const synthOf = (): { ctx: FakeCtx; synth: Synth } => {
  const ctx = new FakeCtx();
  const synth = new Synth(ctx as unknown as BaseAudioContext, new FakeNode() as unknown as AudioNode);
  return { ctx, synth };
};

describe('mapa de sonidos', () => {
  it('cada acción del jugador suena y los pasos y esperas ceden ante algo más importante', () => {
    expect(cuesFor([{ type: 'PlayerMoved', from: { x: 0, y: 0 }, to: { x: 1, y: 0 } }])).toEqual(['step']);
    const hit: GameEvent[] = [
      { type: 'PlayerMoved', from: { x: 0, y: 0 }, to: { x: 1, y: 0 } },
      { type: 'ItemPickedUp', itemId: 'shuriken', count: 1 },
    ];
    expect(cuesFor(hit)).toEqual(['pickup']);
    expect(cuesFor([{ type: 'PlayerWaited', kiroRecovered: 1 }, { type: 'PlayerSearched', found: 0 }])).toEqual(['search']);
    expect(cuesFor([{ type: 'SecretFound', pos: { x: 3, y: 3 } }, { type: 'PlayerSearched', found: 1 }])).toEqual(['secret', 'search']);
  });

  it('no repite efectos y limita cuántos suenan a la vez', () => {
    const many: GameEvent[] = [
      { type: 'DamageApplied', targetId: 'e1', amount: 3, source: 'x' },
      { type: 'DamageApplied', targetId: 'e2', amount: 3, source: 'x' },
      { type: 'DamageApplied', targetId: 'player', amount: 3, source: 'x' },
      { type: 'EnemyAlerted', enemyId: 'e1' },
      { type: 'LevelUp', level: 2, learned: [] },
      { type: 'HealApplied', amount: 1, resource: 'hp' },
      { type: 'ItemPickedUp', itemId: 'a', count: 1 },
      { type: 'ChestOpened', chestId: 'c', itemId: 'a' },
    ];
    const cues = cuesFor(many);
    expect(new Set(cues).size).toBe(cues.length);
    expect(cues.length).toBeLessThanOrEqual(5);
    // Lo último que pasó pesa más: el cofre sigue, el primer golpe se descarta.
    expect(cues).toContain('chest');
  });

  it('el sonido de una técnica depende de su afinidad y el de un golpe, del tipo de arma', () => {
    const cast = (techniqueId: string): Cue[] => cuesFor([{ type: 'TechniqueCast', techniqueId, target: { x: 0, y: 0 }, cells: [] }]);
    expect(cast('brasa_circular')).toEqual(['cast_ascua']);
    expect(cast('garra_de_relampago')).toEqual(['cast_rayo']);
    expect(cuesFor([{ type: 'PlayerAttacked', weaponId: 'tanto', cells: [], targets: [] }])).toHaveLength(1);
    expect(cuesFor([{ type: 'TerrainChanged', cells: [], to: 'floor' }])).toEqual([]);
  });

  it('hay un efecto sintetizado para cada cue y todos se programan sin valores inválidos', () => {
    expect(Object.keys(CUE_FNS).sort()).toEqual([...ALL_CUES].sort());
    for (const cue of ALL_CUES) {
      const { ctx, synth } = synthOf();
      playCue(synth, cue, 1.5, 3);
      const nodes = ctx.oscs.length + ctx.sources.length;
      expect(nodes, `${cue} no genera sonido`).toBeGreaterThan(0);
      for (const o of ctx.oscs) expect(o.stopped, cue).toBeGreaterThan(o.started);
      // Ningún efecto debe pasar de un volumen razonable (el compresor del motor hace el resto).
      for (const g of ctx.gains) expect(g.gain.maxRamp, `${cue} demasiado fuerte`).toBeLessThanOrEqual(0.5);
    }
  });
});

describe('ánimo de la música', () => {
  const base = (): GameState => makeGame(['#######', '#@..E.#', '#######']);

  it('explora en calma, se tensa si alguien te persigue y suena a jefe contra uno', () => {
    const s = base();
    for (const e of s.enemies) e.alert = 0;
    expect(moodFor(s).mood).toBe('explore');
    for (const e of s.enemies) e.alert = 5;
    expect(moodFor(s).mood).toBe('tense');
    for (const e of s.enemies) e.kind = 'sokan_predicador';
    expect(moodFor(s).mood).toBe('boss');
  });

  it('se apaga cuando la expedición termina y cambia de tónica con el sector', () => {
    const s = base();
    s.status = 'lost';
    expect(moodFor(s).mood).toBe('off');
    const a = base();
    const b = base();
    b.floor = 2;
    expect(moodFor(a).root).not.toBe(moodFor(b).root);
  });
});

describe('compositor generativo', () => {
  const run = (seed: number, mood: 'explore' | 'tense' | 'boss', steps = 256): MusicEvent[] => {
    const c = new Composer(seed);
    const out: MusicEvent[] = [];
    for (let n = 0; n < steps; n++) out.push(...c.step(n, mood, 50));
    return out;
  };

  it('es reproducible con la misma semilla y distinto con otra', () => {
    expect(run(7, 'explore')).toEqual(run(7, 'explore'));
    expect(run(7, 'explore')).not.toEqual(run(8, 'explore'));
  });

  it('las notas quedan en un registro audible y se quedan dentro de la escala del ánimo', () => {
    for (const mood of ['explore', 'tense', 'boss'] as const) {
      const scale = MOOD_PARAMS[mood].scale;
      for (const ev of run(3, mood)) {
        if (ev.layer === 'koto' || ev.layer === 'breath') {
          expect(ev.midi).toBeGreaterThanOrEqual(40);
          expect(ev.midi).toBeLessThanOrEqual(100);
          expect(scale).toContain(((ev.midi - 50) % 12 + 12) % 12);
        }
        expect(ev.vel).toBeGreaterThan(0);
        expect(ev.vel).toBeLessThanOrEqual(1);
      }
    }
  });

  it('los tambores solo entran con tensión y los jefes los llevan más densos', () => {
    const count = (mood: 'explore' | 'tense' | 'boss'): number => run(3, mood).filter((e) => e.layer === 'taiko').length;
    expect(count('explore')).toBe(0);
    expect(count('tense')).toBeGreaterThan(0);
    expect(count('boss')).toBeGreaterThan(count('tense'));
  });

  it('todos los eventos musicales se pueden sintetizar sin valores inválidos', () => {
    for (const mood of ['explore', 'tense', 'boss'] as const) {
      const { ctx, synth } = synthOf();
      for (const ev of run(5, mood, 64)) playMusicEvent(synth, ev, 2);
      expect(ctx.oscs.length + ctx.sources.length).toBeGreaterThan(0);
    }
    expect(midiToHz(69)).toBeCloseTo(440, 5);
  });
});

describe('animación de Buscar y movimiento diagonal', () => {
  it('buscar emite PlayerSearched con el número de hallazgos y no interrumpe un viaje', () => {
    const none = applyCommand(makeGame(['#####', '#@..#', '#####']), { type: 'Search' });
    expect(none.events.find((e) => e.type === 'PlayerSearched')).toEqual({ type: 'PlayerSearched', found: 0 });
    const g = makeGame(['#####', '#@s.#', '#####']);
    const r = applyCommand(g, { type: 'Search' });
    expect(r.events.find((e) => e.type === 'PlayerSearched')).toEqual({ type: 'PlayerSearched', found: 1 });
    const calm = applyCommand(makeGame(['#####', '#@..#', '#####']), { type: 'Search' });
    expect(travelInterrupted(g, calm.state, calm.events.filter((e) => e.type !== 'PlayerWaited'))).toBe(false);
  });

  it('un paso diagonal no es un teletransporte, un salto de varias casillas sí', () => {
    expect(isTeleport(1, 0)).toBe(false);
    expect(isTeleport(1, 1)).toBe(false);
    expect(isTeleport(-1, 1)).toBe(false);
    expect(isTeleport(2, 0)).toBe(true);
    expect(isTeleport(2, 2)).toBe(true);
    // La diagonal del núcleo mueve exactamente una casilla en cada eje.
    const r = applyCommand(makeGame(['#####', '#@..#', '#...#', '#####']), move(1, 1));
    expect(r.state.player.pos).toEqual({ x: 2, y: 2 });
  });
});
