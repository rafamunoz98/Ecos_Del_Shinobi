import { describe, expect, it } from 'vitest';
import { HEROES, heroFor } from '../content/heroes';
import { AFFINITIES } from '../content/affinities';
import { ENEMIES } from '../content/enemies';
import { applyCommand } from '../core/engine';
import { createGame } from '../core/newGame';
import { knownPath, travelInterrupted } from '../core/travel';
import type { Enemy, GameEvent, GameState, Vec } from '../core/types';
import { createEnemy } from '../dungeon/spawn';
import { CHORD_WINDOW_MS, DirectionChords, combineCardinals, isCardinal, type ChordTimers } from '../presentation/chords';
import { makeGame, move } from './helpers';

const N: Vec = { x: 0, y: -1 };
const E: Vec = { x: 1, y: 0 };
const S: Vec = { x: 0, y: 1 };
const W: Vec = { x: -1, y: 0 };

/** Temporizadores falsos para controlar el paso del tiempo sin esperar. */
function fakeTimers(): ChordTimers & { advance(ms: number): void } {
  let clock = 0;
  let nextId = 1;
  const pending = new Map<number, { at: number; fn: () => void }>();
  return {
    set(fn, ms) {
      const id = nextId++;
      pending.set(id, { at: clock + ms, fn });
      return id;
    },
    clear(id) {
      pending.delete(id as number);
    },
    advance(ms) {
      clock += ms;
      for (const [id, t] of [...pending]) {
        if (t.at <= clock) {
          pending.delete(id);
          t.fn();
        }
      }
    },
  };
}

function chords(): { c: DirectionChords; out: string[]; timers: ReturnType<typeof fakeTimers> } {
  const out: string[] = [];
  const timers = fakeTimers();
  return { c: new DirectionChords((k) => out.push(k), CHORD_WINDOW_MS, timers), out, timers };
}

describe('diagonales con dos flechas (un solo turno)', () => {
  it('una diagonal en el motor cuesta exactamente un turno (las cuatro)', () => {
    for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const s = makeGame(['#####', '#...#', '#.@.#', '#...#', '#####']);
      const r = applyCommand(s, move(dx, dy));
      expect(r.ok).toBe(true);
      expect(r.state.turn - s.turn).toBe(1);
      expect(r.state.player.pos).toEqual({ x: 2 + dx, y: 2 + dy });
    }
  });

  it('dos cardinales perpendiculares forman la diagonal; las demás combinaciones no', () => {
    expect(combineCardinals(N, E)).toEqual({ x: 1, y: -1 });
    expect(combineCardinals(S, W)).toEqual({ x: -1, y: 1 });
    expect(combineCardinals(E, W)).toBeNull();
    expect(combineCardinals(N, N)).toBeNull();
    expect(combineCardinals({ x: 1, y: 1 }, N)).toBeNull();
    expect(isCardinal(N)).toBe(true);
    expect(isCardinal({ x: 1, y: 1 })).toBe(false);
  });

  it('↑ y → casi a la vez dan UNA diagonal (E), no dos movimientos', () => {
    const { c, out, timers } = chords();
    c.press('arrowup', N, false);
    timers.advance(20);
    c.press('arrowright', E, false);
    timers.advance(500);
    expect(out).toEqual(['e']);
  });

  it('las cuatro parejas dan sus diagonales Q E Z C, en cualquier orden', () => {
    const cases: [string, Vec, string, Vec, string][] = [
      ['w', N, 'a', W, 'q'],
      ['d', E, 'w', N, 'e'],
      ['s', S, 'a', W, 'z'],
      ['d', E, 's', S, 'c'],
    ];
    for (const [k1, d1, k2, d2, diag] of cases) {
      const { c, out, timers } = chords();
      c.press(k1, d1, false);
      c.press(k2, d2, false);
      timers.advance(500);
      expect(out).toEqual([diag]);
    }
  });

  it('una flecha sola se emite pasada la ventana, y no antes', () => {
    const { c, out, timers } = chords();
    c.press('arrowleft', W, false);
    expect(out).toEqual([]);
    timers.advance(CHORD_WINDOW_MS - 1);
    expect(out).toEqual([]);
    timers.advance(2);
    expect(out).toEqual(['arrowleft']);
  });

  it('dos pulsaciones separadas más que la ventana son dos movimientos', () => {
    const { c, out, timers } = chords();
    c.press('arrowright', E, false);
    c.release('arrowright');
    timers.advance(CHORD_WINDOW_MS + 5);
    c.press('arrowup', N, false);
    timers.advance(CHORD_WINDOW_MS + 5);
    expect(out).toEqual(['arrowright', 'arrowup']);
  });

  it('flechas opuestas o de la misma línea no se fusionan y conservan el orden', () => {
    const { c, out, timers } = chords();
    c.press('arrowleft', W, false);
    c.press('arrowright', E, false);
    timers.advance(500);
    expect(out).toEqual(['arrowleft', 'arrowright']);
  });

  it('flush() emite al instante la flecha retenida (para no desordenar otras teclas)', () => {
    const { c, out, timers } = chords();
    c.press('arrowdown', S, false);
    c.flush();
    expect(out).toEqual(['arrowdown']);
    timers.advance(500);
    expect(out).toEqual(['arrowdown']);
  });

  it('clear() descarta la flecha retenida y las teclas «pegadas»', () => {
    const { c, out, timers } = chords();
    c.press('arrowdown', S, false);
    c.clear();
    timers.advance(500);
    expect(out).toEqual([]);
  });

  it('manteniendo una flecha y añadiendo otra, la repetición sigue en diagonal', () => {
    const { c, out, timers } = chords();
    c.press('arrowright', E, false);
    timers.advance(500);
    expect(out).toEqual(['arrowright']);
    c.press('arrowup', N, false); // pulsación nueva con → mantenida
    c.press('arrowright', E, true); // repetición automática de →
    timers.advance(500);
    expect(out).toEqual(['arrowright', 'e']);
    c.press('arrowup', N, true);
    expect(out).toEqual(['arrowright', 'e', 'e']);
    c.release('arrowup');
    c.press('arrowright', E, true);
    expect(out[out.length - 1]).toBe('arrowright');
  });

  it('pulsar rápido en secuencia con solape (→ aún pulsada al llegar ↑ tarde) no inventa diagonales', () => {
    const { c, out, timers } = chords();
    c.press('arrowright', E, false);
    timers.advance(200); // → sale sola
    c.press('arrowup', N, false); // → sigue físicamente pulsada, pero esto NO es una repetición
    timers.advance(200);
    expect(out).toEqual(['arrowright', 'arrowup']);
  });
});

describe('viaje automático con clic', () => {
  const ROOM = ['###########', '#@........#', '#.........#', '#.........#', '###########'];
  const open = (extra?: (s: GameState) => void): GameState =>
    makeGame(ROOM, (s) => {
      s.explored.fill(true);
      extra?.(s);
    });
  const spawn = (id: string, pos: Vec, extra: Partial<Enemy> = {}): Enemy => ({ ...createEnemy(Object.values(ENEMIES)[0], id, pos, 1), alert: 0, lastSeen: null, ...extra });

  it('el camino llega a la meta, paso a paso y en diagonal cuando conviene', () => {
    const s = open();
    const path = knownPath(s, { x: 4, y: 3 }) as Vec[];
    expect(path).not.toBeNull();
    expect(path[path.length - 1]).toEqual({ x: 4, y: 3 });
    expect(path.length).toBe(3); // distancia de Chebyshev: 3 pasos, con diagonales
  });

  it('ya estás en la meta: camino vacío', () => {
    expect(knownPath(open(), { x: 1, y: 1 })).toEqual([]);
  });

  it('una casilla sin explorar no tiene camino conocido, aunque exista', () => {
    const s = open();
    s.explored[3 * s.map.width + 6] = false;
    expect(knownPath(s, { x: 6, y: 3 })).toBeNull();
  });

  it('no atraviesa casillas sin explorar: rodea por lo conocido o no hay camino', () => {
    const s = open();
    // Se tapa con «sin explorar» toda la columna 3: el camino hacia la derecha deja de existir.
    for (let y = 0; y < s.map.height; y++) s.explored[y * s.map.width + 3] = false;
    expect(knownPath(s, { x: 6, y: 2 })).toBeNull();
  });

  it('rodea a un enemigo que ves; la meta sí puede ser el propio enemigo', () => {
    const s = open((g) => {
      g.enemies = [spawn('e1', { x: 3, y: 1 })];
    });
    const detour = knownPath(s, { x: 5, y: 1 }) as Vec[];
    expect(detour).not.toBeNull();
    expect(detour.some((p) => p.x === 3 && p.y === 1)).toBe(false);
    const toEnemy = knownPath(s, { x: 3, y: 1 }) as Vec[];
    expect(toEnemy[toEnemy.length - 1]).toEqual({ x: 3, y: 1 });
  });

  it('un cofre o un PNJ cierran el paso, pero se puede ir hasta ellos', () => {
    const s = open((g) => {
      g.chests = [{ id: 'c', pos: { x: 3, y: 1 }, opened: false }];
    });
    const toChest = knownPath(s, { x: 3, y: 1 }) as Vec[];
    expect(toChest[toChest.length - 1]).toEqual({ x: 3, y: 1 });
    const past = knownPath(s, { x: 5, y: 1 }) as Vec[];
    expect(past.some((p) => p.x === 3 && p.y === 1)).toBe(false);
  });

  it('caminar sin novedad no interrumpe el viaje', () => {
    const s = open();
    const r = applyCommand(s, move(1, 0));
    expect(travelInterrupted(s, r.state, r.events as GameEvent[])).toBe(false);
  });

  it('perder vida interrumpe', () => {
    const s = open();
    const hurt = { ...s, player: { ...s.player, hp: s.player.hp - 1 } };
    expect(travelInterrupted(s, hurt, [])).toBe(true);
  });

  it('que ocurra algo más que caminar (recoger un objeto, un diálogo...) interrumpe', () => {
    const s = open();
    const ev = [{ type: 'ItemPickedUp', itemId: 'moneda', amount: 1 }] as unknown as GameEvent[];
    expect(travelInterrupted(s, s, ev)).toBe(true);
  });

  it('un ataque anunciado interrumpe', () => {
    const s = open();
    const tele = { ...s, telegraphs: [{ id: 't', ownerId: 'x', name: 'golpe', cells: [], power: 1 }] } as unknown as GameState;
    expect(travelInterrupted(s, tele, [])).toBe(true);
  });

  it('un enemigo que entra en la vista interrumpe; uno que ya veías lejos, no', () => {
    const base = open();
    const withFar = { ...base, enemies: [spawn('lejos', { x: 6, y: 2 })] };
    expect(travelInterrupted(base, withFar, [])).toBe(true);
    expect(travelInterrupted(withFar, withFar, [])).toBe(false);
  });

  it('un enemigo a dos casillas o menos interrumpe, salvo que sea el objetivo del viaje', () => {
    const base = open();
    const near = { ...base, enemies: [spawn('cerca', { x: 3, y: 1 })] };
    expect(travelInterrupted(near, near, [])).toBe(true);
    expect(travelInterrupted(near, near, [], 'cerca')).toBe(false);
  });

  it('el fin de la partida interrumpe', () => {
    const s = open();
    expect(travelInterrupted(s, { ...s, status: 'lost' } as GameState, [])).toBe(true);
  });
});

describe('protagonistas por afinidad', () => {
  it('hay un protagonista por cada afinidad, con nombre y apodo propios', () => {
    expect(Object.keys(HEROES).sort()).toEqual([...AFFINITIES].sort());
    const names = AFFINITIES.map((a) => heroFor(a).name);
    expect(new Set(names).size).toBe(AFFINITIES.length);
    for (const a of AFFINITIES) {
      const h = heroFor(a);
      expect(h.id).toBe(a);
      expect(h.name.length).toBeGreaterThan(3);
      expect(h.epithet.length).toBeGreaterThan(3);
      expect(h.blurb.length).toBeGreaterThan(20);
    }
  });

  it('los peinados y colores de pelo son todos distintos', () => {
    expect(new Set(AFFINITIES.map((a) => heroFor(a).hairStyle)).size).toBe(AFFINITIES.length);
    expect(new Set(AFFINITIES.map((a) => heroFor(a).hair.main)).size).toBe(AFFINITIES.length);
    expect(new Set(AFFINITIES.map((a) => heroFor(a).tunic.main)).size).toBe(AFFINITIES.length);
  });

  it('cada protagonista cumple lo pedido: rubio viento, moreno fuego, blanco rayo, azul agua, rosa tierra', () => {
    const luma = (hex: string): number => {
      const n = parseInt(hex.slice(1), 16);
      return 0.3 * ((n >> 16) & 255) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255);
    };
    const rgb = (hex: string): [number, number, number] => {
      const n = parseInt(hex.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    const [vr, vg, vb] = rgb(heroFor('vendaval').hair.main);
    expect(vr).toBeGreaterThan(200); // rubio: mucho rojo y verde, poco azul
    expect(vg).toBeGreaterThan(170);
    expect(vb).toBeLessThan(140);
    expect(luma(heroFor('ascua').hair.main)).toBeLessThan(40); // moreno
    expect(heroFor('ascua').hairStyle).toBe('long');
    expect(luma(heroFor('rayo').hair.main)).toBeGreaterThan(220); // blanco
    const [ar, , ab] = rgb(heroFor('marea').hair.main);
    expect(ab).toBeGreaterThan(ar + 100); // azul
    const [pr, pg, pb] = rgb(heroFor('piedra').hair.main);
    expect(pr).toBeGreaterThan(pg + 60); // rosa
    expect(pb).toBeGreaterThan(pg);
    expect(heroFor('marea').female).toBe(true);
    expect(heroFor('piedra').female).toBe(true);
    expect(heroFor('vendaval').female).toBe(false);
    expect(heroFor('ascua').female).toBe(false);
    expect(heroFor('rayo').female).toBe(false);
  });

  it('la expedición empieza con el protagonista de la afinidad recibida', () => {
    for (const a of AFFINITIES) {
      const s = createGame({ seed: 7, affinity: a });
      expect(s.player.affinity).toBe(a);
      expect(s.log[0]).toContain(heroFor(a).name);
    }
  });
});
