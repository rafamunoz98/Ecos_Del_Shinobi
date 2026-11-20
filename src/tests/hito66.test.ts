import { describe, expect, it } from 'vitest';
import { BALANCE } from '../content/balance';
import { applyCommand } from '../core/engine';
import { equals } from '../core/grid';
import type { GameState } from '../core/types';
import { generateLevel } from '../dungeon/generator';
import { makeGame, move, wait } from './helpers';

describe('persecución y rastreo', () => {
  /** Pasillo largo con una puerta: el enemigo te vio desde lejos y tú te metes tras la puerta. */
  const corridor = ['####################', '#@.+..............E#', '####################'];

  it('un enemigo alertado desde lejos llega hasta ti aunque lo separe una puerta y la distancia sea grande', () => {
    let s: GameState = makeGame(corridor, (g) => {
      const e = g.enemies[0];
      e.aggroRange = 8;
      e.alert = BALANCE.alertTurns;
      e.lastSeen = { x: 5, y: 1 }; // te vio cerca de la puerta
      e.power = 0; // para que el combate no mate al jugador durante la prueba
    });
    let arrived = false;
    for (let i = 0; i < 30 && !arrived; i++) {
      s = applyCommand(s, wait()).state;
      arrived = Math.max(Math.abs(s.enemies[0].pos.x - s.player.pos.x), Math.abs(s.enemies[0].pos.y - s.player.pos.y)) <= 1;
    }
    expect(arrived).toBe(true);
  });

  it('su alerta no se agota mientras sigue yendo hacia donde te vio', () => {
    let s: GameState = makeGame(corridor, (g) => {
      const e = g.enemies[0];
      e.aggroRange = 8;
      e.alert = 3; // poca alerta, pero el camino es largo
      e.lastSeen = { x: 3, y: 1 };
      e.power = 0;
    });
    for (let i = 0; i < 8; i++) s = applyCommand(s, wait()).state;
    expect(s.enemies[0].pos.x).toBeLessThan(18 - 7); // avanzó pese a tener poca alerta
    expect(s.enemies[0].alert).toBeGreaterThan(0);
  });

  it('un enemigo que nunca te notó sigue quieto', () => {
    let s: GameState = makeGame(corridor, (g) => {
      g.enemies[0].aggroRange = 8;
    });
    const start = { ...s.enemies[0].pos };
    for (let i = 0; i < 5; i++) s = applyCommand(s, wait()).state;
    expect(equals(s.enemies[0].pos, start)).toBe(true);
  });

  it('un centinela (percepción 0) ataca a quien tiene al lado pero no se mueve', () => {
    let s: GameState = makeGame(['#####', '#@.E#', '#####'], (g) => {
      g.enemies[0].aggroRange = 0;
      g.enemies[0].alert = 5;
      g.enemies[0].lastSeen = { x: 1, y: 1 };
    });
    s = applyCommand(s, wait()).state;
    expect(s.enemies[0].pos).toEqual({ x: 3, y: 1 });
    s = applyCommand(s, move(1, 0)).state;
    expect(s.player.hp).toBeLessThan(BALANCE.player.maxHp);
  });
});

describe('llaves visibles', () => {
  it('las llaves nunca quedan escondidas entre arbustos', () => {
    for (let seed = 1; seed <= 120; seed++) {
      for (let floor = 1; floor <= 3; floor++) {
        const lv = generateLevel({ seed, floor, boss: floor === 3 });
        for (const d of lv.drops) {
          if (!d.itemId.startsWith('llave')) continue;
          expect(lv.map.tiles[d.pos.y * lv.map.width + d.pos.x], `semilla ${seed} sector ${floor}`).toBe('floor');
        }
      }
    }
  });
});
