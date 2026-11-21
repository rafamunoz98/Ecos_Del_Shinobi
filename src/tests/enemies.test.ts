import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../content/enemies';
import { applyCommand } from '../core/engine';
import { manhattan } from '../core/grid';
import type { Enemy, GameState } from '../core/types';
import { createEnemy } from '../dungeon/spawn';
import { makeGame, wait } from './helpers';

/** Sustituye al enemigo 0 de la sala por otro tipo en la misma posición. */
const asKind = (kind: keyof typeof ENEMIES, floor = 1) => (g: GameState) => {
  // Alerta de partida: estos enemigos ya saben de ti (el sigilo se prueba en stealth.test.ts).
  g.enemies[0] = { ...createEnemy(ENEMIES[kind], 'enemy-0', g.enemies[0].pos, floor), alert: 8 };
};
const moves = (events: { type: string }[]) => events.filter((e) => e.type === 'EnemyMoved').length;

describe('Cuervo de Sal (rápido y frágil)', () => {
  it('se mueve dos casillas por ronda', () => {
    const s = makeGame(['###########', '#@......E.#', '###########'], asKind('cuervo_de_sal'));
    const r = applyCommand(s, wait());
    expect(moves(r.events)).toBe(2);
    expect(r.state.enemies[0].pos).toEqual({ x: 6, y: 1 });
  });

  it('si queda adyacente tras moverse, ataca en la misma ronda, una sola vez', () => {
    const s = makeGame(['######', '#@.E.#', '######'], asKind('cuervo_de_sal'), { affinity: 'piedra' });
    const r = applyCommand(s, wait());
    expect(r.state.enemies[0].pos).toEqual({ x: 2, y: 1 });
    expect(r.state.player.hp).toBe(20 - 2); // poder 3 - defensa 1
    const adjacent = makeGame(['####', '#@E#', '####'], asKind('cuervo_de_sal'), { affinity: 'piedra' });
    expect(applyCommand(adjacent, wait()).state.player.hp).toBe(18);
  });
});

describe('Larva de Piedra (lenta y resistente)', () => {
  it('actúa solo una de cada dos rondas', () => {
    // Distancia de camino 6 = su alcance de persecución, para que sí se ponga en marcha.
    let s = makeGame(['############', '#@.....E...#', '############'], asKind('larva_de_piedra', 2));
    let previous = s.enemies[0].pos.x;
    let moved = 0;
    for (let i = 0; i < 4; i++) {
      s = applyCommand(s, wait()).state;
      if (s.enemies[0].pos.x !== previous) moved++;
      previous = s.enemies[0].pos.x;
    }
    expect(moved).toBe(2);
  });

  it('tiene defensa que reduce el daño básico', () => {
    const s = makeGame(['####', '#@E#', '####'], asKind('larva_de_piedra'));
    const r = applyCommand(s, { type: 'BasicAttack', target: { x: 2, y: 1 } });
    expect(r.state.enemies[0].hp).toBe(16 - 2); // 4 - 2 de defensa
  });
});

describe('Tirador de Junco (a distancia)', () => {
  const kind = asKind('tirador_de_junco', 2);

  it('dispara con línea de visión dentro de su alcance sin acercarse', () => {
    const s = makeGame(['#########', '#@..E...#', '#########'], kind, { affinity: 'piedra' });
    const r = applyCommand(s, wait());
    expect(r.state.player.hp).toBe(20 - 2); // poder 3 + 0 de sector 2 → 3 - 1
    expect(r.state.enemies[0].pos).toEqual({ x: 4, y: 1 });
  });

  it('no dispara a través de paredes', () => {
    const s = makeGame(['#########', '#@.#E...#', '#########'], kind);
    const r = applyCommand(s, wait());
    expect(r.state.player.hp).toBe(20);
  });

  it('retrocede si el jugador se acerca demasiado', () => {
    const s = makeGame(['#########', '#@E.....#', '#########'], kind);
    const r = applyCommand(s, wait());
    expect(manhattan(r.state.enemies[0].pos, r.state.player.pos)).toBeGreaterThan(1);
    expect(r.state.enemies[0].pos).toEqual({ x: 3, y: 1 });
  });

  it('acorralado, dispara en lugar de huir', () => {
    const s = makeGame(['####', '#@E#', '####'], kind, { affinity: 'piedra' });
    expect(applyCommand(s, wait()).state.player.hp).toBe(18);
  });
});

describe('aturdimiento', () => {
  it('un enemigo aturdido pierde su acción esa ronda', () => {
    const s = makeGame(['####', '#@E#', '####'], (g) => {
      g.enemies[0].statuses.push({ id: 'aturdido', turns: 1 });
    });
    const r = applyCommand(s, wait());
    expect(r.state.player.hp).toBe(20);
    expect(r.state.enemies[0].statuses).toEqual([]);
    expect(applyCommand(r.state, wait()).state.player.hp).toBe(17);
  });
});

describe('IA general', () => {
  it('varios enemigos no se pisan ni entran en la casilla del jugador', () => {
    const s = makeGame(['#########', '#@......#', '#.......#', '#########'], (g) => {
      const base = makeGame(['#E@#']).enemies[0];
      g.enemies = [
        { ...base, id: 'a', pos: { x: 5, y: 1 } } as Enemy,
        { ...base, id: 'b', pos: { x: 5, y: 2 } } as Enemy,
        { ...base, id: 'c', pos: { x: 6, y: 1 } } as Enemy,
      ];
    });
    let cur = s;
    for (let i = 0; i < 8 && cur.status === 'playing'; i++) {
      cur = applyCommand(cur, wait()).state;
      const cells = new Set(cur.enemies.map((e) => `${e.pos.x},${e.pos.y}`));
      expect(cells.size).toBe(cur.enemies.length);
      expect(cur.enemies.some((e) => e.pos.x === cur.player.pos.x && e.pos.y === cur.player.pos.y)).toBe(false);
    }
  });
});
