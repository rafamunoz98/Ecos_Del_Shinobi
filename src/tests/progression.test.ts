import { describe, expect, it } from 'vitest';
import { BALANCE } from '../content/balance';
import { effectiveDefense, effectivePower } from '../core/combat';
import { applyCommand } from '../core/engine';
import { createGame } from '../core/newGame';
import type { GameState } from '../core/types';
import { attack, interact, makeGame, move, wait } from './helpers';

describe('niveles por sector despejado', () => {
  const lone = (g: GameState) => {
    g.enemies[0].hp = 4;
    g.floorEnemies = 1;
  };

  it('derrotar enemigos no da experiencia: el nivel solo sube al despejar el sector', () => {
    const s = makeGame(['#####', '#@EE#', '#####'], (g) => {
      g.enemies[0].hp = 4;
      g.floorEnemies = 2;
    });
    const r = applyCommand(s, attack({ x: 2, y: 1 }));
    expect(r.state.player.level).toBe(1);
    expect(r.state.floorKilled).toBe(1);
    expect(r.events.some((e) => e.type === 'FloorCleared')).toBe(false);
  });

  it('al caer el último enemigo se sube un nivel: más vida, kiro y poder, y se anuncia', () => {
    const s = makeGame(['####', '#@E#', '####'], (g) => {
      lone(g);
      g.maxFloor = 3;
    });
    const r = applyCommand(s, attack({ x: 2, y: 1 }));
    const p = r.state.player;
    expect(p.level).toBe(2);
    expect(p.maxHp).toBe(24);
    expect(p.hp).toBe(24);
    expect(p.maxKiro).toBe(11);
    expect(p.power).toBe(5); // +1 de poder en niveles pares
    expect(r.state.floorCleared).toBe(true);
    expect(r.events.some((e) => e.type === 'FloorCleared')).toBe(true);
    expect(r.events.some((e) => e.type === 'LevelUp' && e.level === 2)).toBe(true);
  });

  it('solo se sube un nivel por sector, aunque caigan más enemigos después', () => {
    const s = makeGame(['#####', '#@E.#', '#####'], (g) => {
      lone(g);
      g.maxFloor = 3;
    });
    const once = applyCommand(s, attack({ x: 2, y: 1 })).state;
    const again = structuredClone(once);
    again.enemies.push({ ...structuredClone(s.enemies[0]), id: 'extra', hp: 1, pos: { x: 3, y: 1 } });
    again.player.pos = { x: 2, y: 1 };
    const r = applyCommand(again, attack({ x: 3, y: 1 }));
    expect(r.state.player.level).toBe(2);
  });

  it('los enemigos convocados no cuentan para despejar el sector', () => {
    const s = makeGame(['#####', '#@EE#', '#####'], (g) => {
      g.enemies[0].hp = 4;
      g.enemies[1].kind = 'eco_menor';
      g.floorEnemies = 1;
    });
    const r = applyCommand(s, attack({ x: 2, y: 1 }));
    expect(r.state.floorCleared).toBe(true);
    const e = makeGame(['####', '#@E#', '####'], (g) => {
      g.enemies[0].kind = 'eco_menor';
      g.enemies[0].hp = 1;
      g.floorEnemies = 1;
    });
    expect(applyCommand(e, attack({ x: 2, y: 1 })).state.floorKilled).toBe(0);
  });

  it('una quemadura que remata también cuenta como baja', () => {
    const s = makeGame(['####', '#@E#', '####'], (g) => {
      g.enemies[0].hp = 1;
      g.enemies[0].statuses.push({ id: 'quemadura', turns: 2 });
      g.enemies[0].power = 0;
      g.floorEnemies = 1;
    });
    expect(applyCommand(s, wait()).state.floorKilled).toBe(1);
  });

  it('el kiro se recupera solo con el tiempo', () => {
    let s = makeGame(['#######', '#@....#', '#######'], (g) => {
      g.player.kiro = 2;
    });
    for (let i = 0; i < 6; i++) s = applyCommand(s, move(i % 2 === 0 ? 1 : -1, 0)).state;
    expect(s.player.kiro).toBe(2 + 6 / BALANCE.kiroRegenEvery);
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

  it('un cofre equipa la vestimenta si mejora y nunca te la cambia por una peor', () => {
    let equipped = 0;
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
      expect(['cota_de_laminas', 'coraza_de_pizarra']).toContain(r.state.player.equipment.armor);
    }
    expect(equipped).toBeGreaterThan(0);
  });

  it('una vestimenta peor encontrada en el suelo se desmonta en esquirlas', () => {
    const s = makeGame(['#####', '#@..#', '#####'], (g) => {
      g.player.equipment.armor = 'cota_de_laminas';
      g.drops.push({ pos: { x: 2, y: 1 }, itemId: 'chaleco_acolchado', count: 1 });
    });
    const r = applyCommand(s, move(1, 0));
    expect(r.state.player.equipment.armor).toBe('cota_de_laminas');
    expect(r.state.player.shards).toBe(1);
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
    ].find((c) => ['floor', 'bush', 'door'].includes(s.map.tiles[c.y * s.map.width + c.x])) as { x: number; y: number };
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
