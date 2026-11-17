import { describe, expect, it } from 'vitest';
import { applyCommand, canSeeEntity, visibleCells } from '../core/engine';
import { idx } from '../core/grid';
import type { GameState } from '../core/types';
import { attack, makeGame, move, setTile, wait } from './helpers';

/** Hace que el enemigo 0 no sepa nada de ti (estado de reposo). */
const unaware = (g: GameState) => {
  for (const e of g.enemies) {
    e.alert = 0;
    e.lastSeen = null;
  }
};
const sees = (s: GameState, x: number, y: number) => visibleCells(s).has(idx(s.map, { x, y }));

describe('visión: arbustos y puertas', () => {
  const row = ['#########', '#@..b...#', '#########'];

  it('un arbusto es visible pero tapa lo que hay detrás', () => {
    const s = makeGame(row);
    expect(sees(s, 4, 1)).toBe(true); // el arbusto se ve
    expect(sees(s, 5, 1)).toBe(false); // lo de detrás, no
    expect(sees(s, 3, 1)).toBe(true);
  });

  it('una puerta cerrada tapa la vista y se abre mientras alguien está en ella', () => {
    const s = makeGame(['#########', '#@..+...#', '#########']);
    expect(sees(s, 3, 1)).toBe(true);
    expect(sees(s, 4, 1)).toBe(true); // la propia puerta se ve
    expect(sees(s, 5, 1)).toBe(false);
    const inDoor = makeGame(['#########', '#.@+....#', '#########'], (g) => g.player.pos = { x: 3, y: 1 });
    expect(sees(inDoor, 6, 1)).toBe(true); // de pie en la puerta, ves a través
  });

  it('dentro de un arbusto ves menos lejos', () => {
    const open = makeGame(['###############', '#@............#', '###############']);
    expect(sees(open, 6, 1)).toBe(true);
    const hidden = makeGame(['###############', '#@............#', '###############'], (g) => setTile(g, 1, 1, 'bush'));
    expect(sees(hidden, 3, 1)).toBe(true);
    expect(sees(hidden, 6, 1)).toBe(false);
  });

  it('un enemigo dentro de un arbusto solo se ve desde una casilla de distancia', () => {
    const s = makeGame(['#########', '#@..E...#', '#########'], (g) => setTile(g, 4, 1, 'bush'));
    const vis = visibleCells(s);
    expect(canSeeEntity(s, vis, { x: 4, y: 1 })).toBe(false);
    const near = makeGame(['#########', '#.@.E...#', '#########'], (g) => {
      g.player.pos = { x: 3, y: 1 };
      setTile(g, 4, 1, 'bush');
    });
    expect(canSeeEntity(near, visibleCells(near), { x: 4, y: 1 })).toBe(true);
  });
});

describe('percepción de los enemigos', () => {
  it('un enemigo que no te ve permanece quieto', () => {
    const s = makeGame(['#########', '#@..b..E#', '#########'], unaware);
    const r = applyCommand(s, wait());
    expect(r.state.enemies[0].pos).toEqual({ x: 7, y: 1 });
    expect(r.state.enemies[0].alert).toBe(0);
  });

  it('te nota si hay línea de visión y distancia, y se pone en marcha esa misma ronda', () => {
    const s = makeGame(['#########', '#@.....E#', '#########'], unaware);
    const r = applyCommand(s, wait());
    expect(r.events.some((e) => e.type === 'EnemyAlerted')).toBe(true);
    expect(r.state.enemies[0].alert).toBeGreaterThan(0);
    expect(r.state.enemies[0].pos).toEqual({ x: 6, y: 1 });
    expect(r.state.log.some((l) => l.includes('te ha visto'))).toBe(true);
  });

  it('no te nota más allá de su alcance de percepción', () => {
    const wall = '#'.repeat(14);
    const s = makeGame([wall, '#@' + '.'.repeat(10) + 'E#', wall], unaware);
    expect(applyCommand(s, wait()).state.enemies[0].alert).toBe(0);
  });

  it('un jugador escondido en un arbusto no es visto salvo desde una casilla', () => {
    const s = makeGame(['#########', '#@.....E#', '#########'], (g) => {
      unaware(g);
      setTile(g, 1, 1, 'bush');
    });
    let cur = s;
    for (let i = 0; i < 4; i++) cur = applyCommand(cur, wait()).state;
    expect(cur.enemies[0].alert).toBe(0);
    expect(cur.enemies[0].pos).toEqual({ x: 7, y: 1 });
  });

  it('al perderte de vista sigue alerta unas rondas, va a donde te vio y luego se rinde', () => {
    // El enemigo te ve y tú te metes en un arbusto: sigue hacia donde te vio y acaba perdiendo el rastro.
    const s = makeGame(['###########', '#@......E.#', '#b........#', '###########'], unaware);
    let cur = applyCommand(s, wait()).state; // te ve (alerta)
    expect(cur.enemies[0].alert).toBeGreaterThan(0);
    cur = applyCommand(cur, move(0, 1)).state; // entras en el arbusto (1,2)
    let lost = false;
    for (let i = 0; i < 14 && !lost; i++) {
      const r = applyCommand(cur, wait());
      cur = r.state;
      lost = r.events.some((e) => e.type === 'EnemyLostTrack');
      if (cur.status !== 'playing') break;
    }
    // O bien te encuentra al llegar a tu lado (adyacente te ve) o pierde el rastro: nunca se queda alerta para siempre.
    expect(lost || cur.player.hp < cur.player.maxHp).toBe(true);
  });

  it('un enemigo herido sabe dónde estás aunque no te viera', () => {
    const s = makeGame(['#########', '#@E.....#', '#########'], (g) => {
      unaware(g);
      setTile(g, 1, 1, 'bush');
    });
    const r = applyCommand(s, attack({ x: 2, y: 1 }));
    expect(r.events.some((e) => e.type === 'EnemyAlerted')).toBe(true);
    expect(r.state.enemies[0].lastSeen).toEqual({ x: 1, y: 1 });
  });
});

describe('golpe furtivo', () => {
  it('duplica el daño al enemigo que no sabe de ti, una sola vez', () => {
    const s = makeGame(['#####', '#@E.#', '#####'], (g) => {
      unaware(g);
      g.enemies[0].hp = 30;
      g.enemies[0].power = 0;
    });
    const first = applyCommand(s, attack({ x: 2, y: 1 }));
    expect(first.events.some((e) => e.type === 'SneakAttack')).toBe(true);
    expect(first.state.enemies[0].hp).toBe(30 - 8);
    const second = applyCommand(first.state, attack({ x: 2, y: 1 }));
    expect(second.events.some((e) => e.type === 'SneakAttack')).toBe(false);
    expect(second.state.enemies[0].hp).toBe(30 - 8 - 4);
  });
});

describe('puertas y enemigos', () => {
  it('un enemigo que cruza una puerta la abre para que la veas', () => {
    const s = makeGame(['#########', '#@..+.E.#', '#########'], (g) => {
      g.enemies[0].alert = 0;
      g.enemies[0].aggroRange = 0;
    });
    expect(canSeeEntity(s, visibleCells(s), { x: 6, y: 1 })).toBe(false);
    const withEnemyInDoor = makeGame(['#########', '#@..+...#', '#########'], (g) => {
      g.enemies.push({ ...makeGame(['#E@#']).enemies[0], pos: { x: 4, y: 1 } });
    });
    expect(canSeeEntity(withEnemyInDoor, visibleCells(withEnemyInDoor), { x: 4, y: 1 })).toBe(true);
  });
});
