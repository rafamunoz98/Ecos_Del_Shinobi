import { describe, expect, it } from 'vitest';
import { effectiveDefense, effectivePower, xpToNext } from '../core/combat';
import { applyCommand } from '../core/engine';
import { createGame } from '../core/newGame';
import type { GameState } from '../core/types';
import { attack, interact, makeGame, wait } from './helpers';

describe('experiencia y niveles', () => {
  it('derrotar enemigos da XP según el tipo', () => {
    const s = makeGame(['####', '#@E#', '####'], (g) => {
      g.enemies[0].hp = 4;
    });
    const r = applyCommand(s, attack({ x: 2, y: 1 }));
    expect(r.state.player.xp).toBe(4);
    expect(r.events).toContainEqual({ type: 'XpGained', amount: 4 });
  });

  it('subir de nivel mejora vida y kiro, cura lo ganado y lo anuncia', () => {
    const s = makeGame(['####', '#@E#', '####'], (g) => {
      g.enemies[0].hp = 4;
      g.player.xp = xpToNext(1) - 1;
    });
    const r = applyCommand(s, attack({ x: 2, y: 1 }));
    const p = r.state.player;
    expect(p.level).toBe(2);
    expect(p.maxHp).toBe(24);
    expect(p.hp).toBe(24);
    expect(p.maxKiro).toBe(11);
    expect(p.power).toBe(5); // +1 de poder en niveles pares
    expect(p.xp).toBe(3);
    expect(r.events.some((e) => e.type === 'LevelUp' && e.level === 2)).toBe(true);
  });

  it('aprende la técnica avanzada de su afinidad al llegar al nivel 3', () => {
    const s = makeGame(['####', '#@E#', '####'], (g) => {
      g.enemies[0].hp = 1;
      g.player.level = 2;
      g.player.xp = xpToNext(2) - 1;
    });
    const r = applyCommand(s, attack({ x: 2, y: 1 }));
    expect(r.state.player.level).toBe(3);
    expect(r.state.player.techniques).toEqual(['brasa_circular', 'lengua_de_fuego']);
    const lvl = r.events.find((e) => e.type === 'LevelUp');
    expect(lvl && lvl.type === 'LevelUp' && lvl.learned).toEqual(['lengua_de_fuego']);
  });

  it('una quemadura que remata también da XP', () => {
    const s = makeGame(['####', '#@E#', '####'], (g) => {
      g.enemies[0].hp = 1;
      g.enemies[0].statuses.push({ id: 'quemadura', turns: 2 });
      g.enemies[0].power = 0;
    });
    expect(applyCommand(s, wait()).state.player.xp).toBe(4);
  });
});

describe('equipo', () => {
  it('el arma suma al poder del ataque básico y la vestimenta a la defensa', () => {
    const s = makeGame(['####', '#@E#', '####'], (g) => {
      g.player.equipment.weapon = 'hoja_afilada';
      g.player.equipment.armor = 'cota_de_laminas';
    });
    expect(effectivePower(s.player)).toBe(6);
    expect(effectiveDefense(s.player)).toBe(3);
    const r = applyCommand(s, attack({ x: 2, y: 1 }));
    expect(r.state.enemies[0].hp).toBe(10 - 6);
    expect(r.state.player.hp).toBe(20 - 1); // 4 - 3
  });

  it('un cofre equipa la vestimenta si mejora y la descarta si no', () => {
    let equipped = 0;
    let discarded = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const s = makeGame(['#####', '#@C.#', '#####'], (g) => {
        g.floor = 3; // en el sector 3 puede salir vestimenta mejor que la actual
        g.rngState = seed;
        g.player.equipment.armor = 'cota_de_laminas';
      });
      const r = applyCommand(s, interact({ x: 2, y: 1 }));
      const ev = r.events.find((e) => e.type === 'EquipmentEquipped');
      if (ev && ev.type === 'EquipmentEquipped') {
        equipped++;
        expect(r.state.player.equipment.armor).toBe('coraza_de_pizarra');
      }
      if (r.state.log[r.state.log.length - 1].includes('equipo actual es mejor')) {
        discarded++;
        expect(r.state.player.equipment.armor).toBe('cota_de_laminas');
      }
    }
    expect(equipped).toBeGreaterThan(0);
    expect(discarded).toBeGreaterThan(0);
  });

  it('un cofre da armas nuevas sin equiparlas y no repite las que ya tienes', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 400; seed++) {
      const s = makeGame(['#####', '#@C.#', '#####'], (g) => {
        g.floor = 3;
        g.rngState = seed;
      });
      const r = applyCommand(s, interact({ x: 2, y: 1 }));
      for (const w of r.state.player.weapons) seen.add(w);
      expect(r.state.player.equipment.weapon).toBe('tanto_gastado');
      expect(r.state.player.weapons.length).toBeLessThanOrEqual(2);
    }
    expect(seen.size).toBeGreaterThan(3);
    const owned = makeGame(['#####', '#@C.#', '#####'], (g) => {
      g.player.weapons = ['tanto_gastado', 'kunai_de_hierro', 'latigo_de_cadena'];
    });
    for (let seed = 1; seed <= 100; seed++) {
      owned.rngState = seed;
      const r = applyCommand(owned, interact({ x: 2, y: 1 }));
      expect(new Set(r.state.player.weapons).size).toBe(r.state.player.weapons.length);
    }
  });
});

describe('sectores', () => {
  function walkToExit(s: GameState): GameState {
    const i = s.map.tiles.indexOf('exit');
    const exit = { x: i % s.map.width, y: Math.floor(i / s.map.width) };
    // Se coloca al jugador junto a la salida, despejando enemigos, para probar solo la transición.
    const adj = [
      { x: exit.x - 1, y: exit.y },
      { x: exit.x + 1, y: exit.y },
      { x: exit.x, y: exit.y - 1 },
      { x: exit.x, y: exit.y + 1 },
    ].find((c) => s.map.tiles[c.y * s.map.width + c.x] === 'floor') as { x: number; y: number };
    return { ...s, enemies: [], player: { ...s.player, pos: adj } };
  }
  const exitOf = (s: GameState) => {
    const i = s.map.tiles.indexOf('exit');
    return { x: i % s.map.width, y: Math.floor(i / s.map.width) };
  };

  it('la escalera lleva al sector siguiente conservando al personaje y regenerando el mapa', () => {
    let s = createGame({ seed: 11 });
    s.player.hp = 13;
    s.player.xp = 5;
    s.player.inventory.tonico_kiro = 2;
    const firstMap = s.map;
    s = walkToExit(s);
    const r = applyCommand(s, interact(exitOf(s)));
    expect(r.ok).toBe(true);
    expect(r.state.status).toBe('playing');
    expect(r.state.floor).toBe(2);
    expect(r.state.map).not.toEqual(firstMap);
    expect(r.state.player.xp).toBe(5);
    expect(r.state.player.inventory.tonico_kiro).toBe(2);
    expect(r.state.player.hp).toBeGreaterThanOrEqual(13 - 3 * 2);
    expect(r.state.enemies.length).toBeGreaterThanOrEqual(4);
    expect(r.state.barriers).toEqual([]);
    expect(r.events).toContainEqual({ type: 'FloorChanged', floor: 2 });
    expect(r.state.explored.some(Boolean)).toBe(true);
  });

  it('cruzar la salida del último sector gana la expedición', () => {
    let s = createGame({ seed: 12, floors: 2 });
    s = walkToExit(s);
    s = applyCommand(s, interact(exitOf(s))).state;
    expect(s.floor).toBe(2);
    s = walkToExit(s);
    const r = applyCommand(s, interact(exitOf(s)));
    expect(r.state.status).toBe('won');
  });

  it('la misma semilla produce la misma expedición completa', () => {
    const run = () => {
      let s = createGame({ seed: 77, floors: 3 });
      for (let f = 0; f < 2; f++) {
        s = walkToExit(s);
        s = applyCommand(s, interact(exitOf(s))).state;
      }
      return s;
    };
    expect(run()).toEqual(run());
  });
});
