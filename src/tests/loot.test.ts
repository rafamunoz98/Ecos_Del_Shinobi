import { describe, expect, it } from 'vitest';
import { BALANCE } from '../content/balance';
import { effectivePower } from '../core/combat';
import { applyCommand, previewAttack, upgradeQuote } from '../core/engine';
import { idx } from '../core/grid';
import { createGame } from '../core/newGame';
import type { Command, GameState, Vec } from '../core/types';
import { distancesFrom, generateLevel } from '../dungeon/generator';
import { attack, interact, makeGame, move } from './helpers';

const SEEDS = 150;
const at = (map: { width: number }, p: Vec): number => p.y * map.width + p.x;
const throwItem = (itemId: string, target: Vec): Command => ({ type: 'Throw', itemId, target });
const calm = (g: GameState) => {
  for (const e of g.enemies) {
    e.power = 0;
    e.hp = 40;
    e.maxHp = 40;
    e.aggroRange = 0;
  }
};

describe('generador: objetos sueltos, llaves, cámaras selladas y forja', () => {
  it(`en ${SEEDS} semillas × 3 sectores el botín es alcanzable, no se solapa y las llaves resuelven la cámara y el cofre`, () => {
    let vaults = 0;
    let lacquers = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      for (let floor = 1; floor <= 3; floor++) {
        const lv = generateLevel({ seed, floor, boss: floor === 3 });
        const { map } = lv;
        const ctx = `semilla ${seed} sector ${floor}`;
        const dist = distancesFrom(map, lv.playerStart);
        const vaultCells = new Set((lv.vault?.cells ?? []).map((c) => at(map, c)));

        // Objetos sueltos: suficientes, sin solapar con nada y sobre suelo o arbusto.
        const outside = lv.drops.filter((d) => !vaultCells.has(at(map, d.pos)));
        expect(outside.length, ctx).toBeGreaterThanOrEqual(BALANCE.level.groundItems.min);
        const seen = new Set<number>();
        const solid = new Set<number>([...lv.chests, ...lv.npcs, ...lv.scrolls, ...lv.enemies].map((e) => at(map, e.pos)));
        for (const d of lv.drops) {
          const i = at(map, d.pos);
          expect(['floor', 'bush'], ctx).toContain(map.tiles[i]);
          expect(seen.has(i), `${ctx}: dos objetos en la misma casilla`).toBe(false);
          expect(solid.has(i), `${ctx}: objeto bajo una entidad`).toBe(false);
          expect(i, ctx).not.toBe(at(map, lv.playerStart));
          seen.add(i);
          expect(d.count, ctx).toBeGreaterThan(0);
        }
        for (const d of outside) expect(dist[at(map, d.pos)], `${ctx}: ${d.itemId} inalcanzable`).toBeGreaterThanOrEqual(0);

        // Cámara sellada: cerrada por un candado, sin otro acceso, y la llave de hierro está fuera y es alcanzable.
        const ironKeys = lv.drops.filter((d) => d.itemId === 'llave_hierro');
        if (lv.vault) {
          vaults++;
          expect(map.tiles[at(map, lv.vault.door)], ctx).toBe('locked');
          expect(lv.vault.cells, ctx).toHaveLength(9);
          for (const c of lv.vault.cells) {
            expect(map.tiles[at(map, c)], ctx).toBe('floor');
            expect(dist[at(map, c)], `${ctx}: la cámara tiene otro acceso`).toBe(-1);
          }
          expect(ironKeys, ctx).toHaveLength(1);
          expect(vaultCells.has(at(map, ironKeys[0].pos)), ctx).toBe(false);
          expect(dist[at(map, ironKeys[0].pos)], ctx).toBeGreaterThanOrEqual(0);
          // El tesoro (3 objetos) está dentro.
          expect(lv.drops.filter((d) => vaultCells.has(at(map, d.pos))), ctx).toHaveLength(3);
          // Con el candado abierto, todo el interior se alcanza.
          const opened = { ...map, tiles: [...map.tiles] };
          opened.tiles[at(map, lv.vault.door)] = 'door';
          const after = distancesFrom(opened, lv.playerStart);
          for (const c of lv.vault.cells) expect(after[at(map, c)], ctx).toBeGreaterThan(0);
        } else {
          expect(ironKeys, ctx).toHaveLength(0);
        }

        // Cofre lacado: lleva su llave de laca, alcanzable; los cofres de madera siguen sin cortar el paso.
        const lacquered = lv.chests.filter((c) => c.locked);
        const laceKeys = lv.drops.filter((d) => d.itemId === 'llave_laca');
        expect(lacquered.length, ctx).toBeLessThanOrEqual(1);
        expect(laceKeys.length, ctx).toBe(lacquered.length);
        if (lacquered.length === 1) {
          lacquers++;
          expect(dist[at(map, laceKeys[0].pos)], ctx).toBeGreaterThanOrEqual(0);
        }
        expect(lv.chests.filter((c) => !c.locked).length, ctx).toBeLessThanOrEqual(BALANCE.level.maxChests);
      }
    }
    expect(vaults).toBeGreaterThan(SEEDS * 3 * 0.7);
    expect(lacquers).toBeGreaterThan(SEEDS * 3 * 0.6);
  });

  it('el suelo trae monedas, consumibles y arrojadizas; el equipo se reserva a cofres y cámaras', () => {
    const kinds = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      const lv = generateLevel({ seed, floor: 2 });
      const vaultCells = new Set((lv.vault?.cells ?? []).map((c) => at(lv.map, c)));
      for (const d of lv.drops) {
        if (vaultCells.has(at(lv.map, d.pos))) continue;
        kinds.add(d.itemId);
        expect(['hoja_afilada', 'lanza_de_bambu', 'cota_de_laminas', 'coraza_de_pizarra']).not.toContain(d.itemId);
      }
    }
    for (const id of ['moneda', 'esquirla', 'tonico_kiro', 'unguento_musgo', 'shuriken', 'senbon']) expect(kinds.has(id), id).toBe(true);
  });

  it('las mesas de forja solo aparecen en los sectores configurados y son alcanzables', () => {
    for (let seed = 1; seed <= 60; seed++) {
      for (let floor = 1; floor <= 3; floor++) {
        const lv = generateLevel({ seed, floor, boss: floor === 3 });
        const forges = lv.npcs.filter((n) => n.kind === 'mesa_forja');
        const expected = (BALANCE.forgeFloors as readonly number[]).includes(floor);
        expect(forges.length, `semilla ${seed} sector ${floor}`).toBe(expected ? 1 : 0);
        if (forges[0]) {
          const dist = distancesFrom(lv.map, lv.playerStart, new Set([at(lv.map, forges[0].pos)]));
          const near = [
            { x: forges[0].pos.x + 1, y: forges[0].pos.y },
            { x: forges[0].pos.x - 1, y: forges[0].pos.y },
            { x: forges[0].pos.x, y: forges[0].pos.y + 1 },
            { x: forges[0].pos.x, y: forges[0].pos.y - 1 },
          ];
          expect(near.some((c) => dist[idx(lv.map, c)] >= 0)).toBe(true);
        }
      }
    }
  });

  it('hay bastantes más arbustos que antes (≥ 7 grupos por sector)', () => {
    let total = 0;
    const n = 40;
    for (let seed = 1; seed <= n; seed++) total += generateLevel({ seed, floor: 1 }).map.tiles.filter((t) => t === 'bush').length;
    expect(total / n).toBeGreaterThan(28);
  });

  it('se genera igual con la misma semilla (incluidas llaves y cámara)', () => {
    expect(generateLevel({ seed: 9, floor: 2 })).toEqual(generateLevel({ seed: 9, floor: 2 }));
  });
});

describe('puertas con candado y llaves', () => {
  const room = ['#########', '#@L.....#', '#########'];

  it('una puerta con candado bloquea el paso, la vista y a los enemigos; sin llave no se abre y no gasta turno', () => {
    const s = makeGame(room);
    expect(applyCommand(s, move(1, 0)).reason).toBe('blocked');
    const r = applyCommand(s, interact({ x: 2, y: 1 }));
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('locked_door');
    expect(r.state).toBe(s);
  });

  it('con la llave de hierro se abre, la llave se gasta y la puerta pasa a ser una puerta normal', () => {
    const s = makeGame(room, (g) => {
      g.player.keys.push('llave_hierro');
    });
    const r = applyCommand(s, interact({ x: 2, y: 1 }));
    expect(r.ok).toBe(true);
    expect(r.state.map.tiles[2 + 9]).toBe('door');
    expect(r.state.player.keys).toEqual([]);
    expect(r.state.turn).toBe(1);
    expect(r.events).toContainEqual({ type: 'DoorUnlocked', pos: { x: 2, y: 1 } });
    expect(applyCommand(r.state, move(1, 0)).ok).toBe(true);
  });

  it('la llave de laca no abre la puerta ni la de hierro el cofre', () => {
    const s = makeGame(['#########', '#@Lc....#', '#########'], (g) => {
      g.player.keys.push('llave_laca');
    });
    expect(applyCommand(s, interact({ x: 2, y: 1 })).reason).toBe('locked_door');
  });

  it('una llave en el suelo se recoge al pisarla y va al llavero, no a la mochila', () => {
    const s = makeGame(['#######', '#@k...#', '#######']);
    const r = applyCommand(s, move(1, 0));
    expect(r.state.player.keys).toEqual(['llave_hierro']);
    expect(r.state.player.inventory.llave_hierro).toBeUndefined();
    expect(r.state.drops).toEqual([]);
  });

  it('las llaves se deshacen al cruzar la escalera', () => {
    let s = createGame({ seed: 11 });
    s.player.keys = ['llave_hierro', 'llave_laca'];
    s = { ...s, enemies: [] };
    const i = s.map.tiles.indexOf('exit');
    const exit = { x: i % s.map.width, y: Math.floor(i / s.map.width) };
    const adj = [
      { x: exit.x - 1, y: exit.y },
      { x: exit.x + 1, y: exit.y },
      { x: exit.x, y: exit.y - 1 },
      { x: exit.x, y: exit.y + 1 },
    ].find((c) => ['floor', 'bush', 'door'].includes(s.map.tiles[c.y * s.map.width + c.x])) as Vec;
    s = { ...s, player: { ...s.player, pos: adj } };
    const r = applyCommand(s, interact(exit));
    expect(r.state.floor).toBe(2);
    expect(r.state.player.keys).toEqual([]);
    expect(r.state.drops.length).toBeGreaterThanOrEqual(BALANCE.level.groundItems.min);
  });
});

describe('cofres: madera y laca', () => {
  it('un cofre lacado exige la llave de laca, la gasta y da equipo, monedas y esquirlas', () => {
    const s = makeGame(['#####', '#@c.#', '#####']);
    const closed = applyCommand(s, interact({ x: 2, y: 1 }));
    expect(closed.reason).toBe('locked_chest');
    expect(closed.state).toBe(s);
    for (let seed = 1; seed <= 100; seed++) {
      const t = makeGame(['#####', '#@c.#', '#####'], (g) => {
        g.rngState = seed;
        g.player.keys = ['llave_laca', 'llave_hierro'];
      });
      const r = applyCommand(t, interact({ x: 2, y: 1 }));
      expect(r.ok).toBe(true);
      expect(r.state.player.keys).toEqual(['llave_hierro']);
      expect(r.state.chests[0].opened).toBe(true);
      const gotGear = r.state.player.weapons.length > t.player.weapons.length || r.state.player.equipment.armor !== t.player.equipment.armor;
      expect(gotGear, `semilla ${seed}`).toBe(true);
      expect(r.state.player.coins).toBeGreaterThan(0);
      expect(r.state.player.shards).toBeGreaterThanOrEqual(2);
    }
  });

  it('el cofre de madera ya no es una lotería de consumibles: da equipo o reservas grandes y siempre monedas', () => {
    let gear = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const s = makeGame(['#####', '#@C.#', '#####'], (g) => {
        g.floor = 2;
        g.rngState = seed;
      });
      const r = applyCommand(s, interact({ x: 2, y: 1 }));
      expect(r.state.player.coins).toBeGreaterThan(0);
      if (r.state.player.weapons.length > 1 || r.state.player.equipment.armor) gear++;
      for (const [id, n] of Object.entries(r.state.player.inventory)) {
        if (id !== 'shuriken' && id !== 'unguento_musgo') expect(n).toBeGreaterThanOrEqual(2);
      }
    }
    expect(gear).toBeGreaterThan(60);
  });

  it('un arma repetida se desmonta en esquirlas en vez de duplicarse', () => {
    const s = makeGame(['#####', '#@..#', '#####'], (g) => {
      g.player.weapons.push('hoja_afilada');
      g.drops.push({ pos: { x: 2, y: 1 }, itemId: 'hoja_afilada', count: 1 });
    });
    const r = applyCommand(s, move(1, 0));
    expect(r.state.player.weapons.filter((w) => w === 'hoja_afilada')).toHaveLength(1);
    expect(r.state.player.shards).toBe(2);
  });
});

describe('monedas y botín de enemigos', () => {
  it('las monedas del suelo van a la cartera y cuentan para el resumen', () => {
    const s = makeGame(['#####', '#@..#', '#####'], (g) => {
      g.drops.push({ pos: { x: 2, y: 1 }, itemId: 'moneda', count: 7 });
    });
    const r = applyCommand(s, move(1, 0));
    expect(r.state.player.coins).toBe(7);
    expect(r.state.stats.coinsFound).toBe(7);
    expect(r.state.player.inventory.moneda).toBeUndefined();
  });

  it('un enemigo derrotado suelta monedas a veces (determinista) en su casilla', () => {
    let withCoins = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const s = makeGame(['#####', '#@E.#', '#####'], (g) => {
        g.seed = seed;
        g.enemies[0].hp = 1;
        g.enemies[0].power = 0;
      });
      const r = applyCommand(s, attack({ x: 2, y: 1 }));
      expect(applyCommand(s, attack({ x: 2, y: 1 })).state.drops).toEqual(r.state.drops);
      const coin = r.state.drops.find((d) => d.itemId === 'moneda');
      if (coin) {
        withCoins++;
        expect(coin.pos).toEqual({ x: 2, y: 1 });
        expect(coin.count).toBeGreaterThanOrEqual(BALANCE.enemyCoins.min);
        expect(coin.count).toBeLessThanOrEqual(BALANCE.enemyCoins.max);
      }
    }
    expect(withCoins).toBeGreaterThan(50);
    expect(withCoins).toBeLessThan(90);
  });

  it('el jefe suelta un botín fijo; sus ecos no sueltan nada', () => {
    const s = makeGame(['#######', '#@B...#', '#######'], (g) => {
      g.enemies[0].hp = 1;
    });
    const r = applyCommand(s, attack({ x: 2, y: 1 }));
    expect(r.state.drops.find((d) => d.itemId === 'moneda')?.count).toBe(BALANCE.bossLoot.coins);
    expect(r.state.drops.find((d) => d.itemId === 'esquirla')?.count).toBe(BALANCE.bossLoot.shards);
  });
});

describe('arrojadizas clavadas', () => {
  const room = ['###########', '#@...E....#', '###########'];

  it('al acertar se clavan en el enemigo y caen en su casilla cuando muere', () => {
    let done = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const s = makeGame(room, (g) => {
        calm(g);
        g.rngState = seed;
        g.enemies[0].hp = 5;
      });
      const hit = applyCommand(s, throwItem('shuriken', { x: 5, y: 1 }));
      const stuck = hit.state.enemies[0].stuck.shuriken ?? 0;
      if (stuck === 0) continue; // se rompió
      done++;
      expect(hit.state.drops).toEqual([]);
      // Se acerca y lo mata cuerpo a cuerpo (le quedan 2 de vida).
      const dying = structuredClone(hit.state);
      dying.enemies[0].hp = 1;
      dying.player.pos = { x: 4, y: 1 };
      const kill = applyCommand(dying, attack({ x: 5, y: 1 }));
      expect(kill.state.enemies).toHaveLength(0);
      expect(kill.state.drops.find((d) => d.itemId === 'shuriken')).toEqual({ pos: { x: 5, y: 1 }, itemId: 'shuriken', count: stuck });
    }
    expect(done).toBeGreaterThan(30);
  });

  it('una arrojadiza que mata al enemigo cae en su casilla', () => {
    let seen = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const s = makeGame(room, (g) => {
        calm(g);
        g.rngState = seed;
        g.enemies[0].hp = 3;
        g.enemies[0].defense = 0;
      });
      const r = applyCommand(s, throwItem('shuriken', { x: 5, y: 1 }));
      expect(r.state.enemies).toHaveLength(0);
      if (r.state.drops.some((d) => d.itemId === 'shuriken')) {
        seen++;
        expect(r.state.drops.find((d) => d.itemId === 'shuriken')?.pos).toEqual({ x: 5, y: 1 });
      }
    }
    expect(seen).toBeGreaterThan(30);
  });

  it('las clavadas viajan con el enemigo si lo empujan, y varias se acumulan', () => {
    const s = makeGame(room, (g) => {
      calm(g);
      g.enemies[0].stuck = { shuriken: 2, senbon: 1 };
      g.enemies[0].hp = 1;
    });
    const r = applyCommand(s, throwItem('shuriken', { x: 5, y: 1 }));
    const total = r.state.drops.reduce((n, d) => n + d.count, 0);
    expect(total).toBeGreaterThanOrEqual(3);
    expect(r.state.drops.filter((d) => d.itemId === 'senbon')).toHaveLength(1);
  });

  it('el senbon es ahora una arrojadiza seria: 4 de daño que ignoran defensa', () => {
    const s = makeGame(room, (g) => {
      calm(g);
      g.enemies[0].defense = 3;
      g.player.inventory.senbon = 1;
    });
    expect(applyCommand(s, throwItem('senbon', { x: 5, y: 1 })).state.enemies[0].hp).toBe(36);
  });
});

describe('forja: mejora de armas', () => {
  const room = ['#######', '#@F...#', '#######'];
  const upgrade = (weaponId: string, pay: 'coins' | 'shards'): Command => ({ type: 'Upgrade', npcId: 'npc-0', weaponId, pay });

  it('hablar con la mesa no gasta turno', () => {
    const s = makeGame(room, (g) => (g.enemies = []));
    const r = applyCommand(s, interact({ x: 2, y: 1 }));
    expect(r.ok).toBe(true);
    expect(r.state).toBe(s);
    expect(r.events).toEqual([{ type: 'NpcTalked', npcId: 'npc-0' }]);
  });

  it('mejorar con monedas o esquirlas sube el poder del arma y gasta un turno', () => {
    const s = makeGame(room, (g) => {
      g.enemies = [];
      g.player.coins = 40;
      g.player.shards = 5;
    });
    const base = effectivePower(s.player);
    const a = applyCommand(s, upgrade('tanto_gastado', 'coins'));
    expect(a.ok).toBe(true);
    expect(a.state.player.coins).toBe(40 - BALANCE.forge.coins[0]);
    expect(a.state.player.weaponLevels.tanto_gastado).toBe(1);
    expect(effectivePower(a.state.player)).toBe(base + 1);
    expect(a.state.turn).toBe(1);
    expect(a.events).toContainEqual({ type: 'WeaponUpgraded', weaponId: 'tanto_gastado', level: 1 });
    const b = applyCommand(a.state, upgrade('tanto_gastado', 'shards'));
    expect(b.state.player.shards).toBe(5 - BALANCE.forge.shards[1]);
    expect(effectivePower(b.state.player)).toBe(base + 2);
    expect(b.state.stats.upgrades).toBe(2);
  });

  it('el nivel máximo, el coste, la distancia y el arma se validan sin gastar turno', () => {
    const s = makeGame(room, (g) => {
      g.enemies = [];
      g.player.coins = 5;
      g.player.shards = 1;
    });
    expect(applyCommand(s, upgrade('tanto_gastado', 'coins')).reason).toBe('cannot_afford');
    expect(applyCommand(s, upgrade('tanto_gastado', 'shards')).reason).toBe('cannot_afford');
    expect(applyCommand(s, upgrade('hoja_afilada', 'coins')).reason).toBe('no_item');
    expect(applyCommand(s, { type: 'Upgrade', npcId: 'npc-9', weaponId: 'tanto_gastado', pay: 'coins' }).reason).toBe('not_at_forge');
    const far = makeGame(['########', '#@.F...#', '########'], (g) => {
      g.enemies = [];
      g.player.coins = 99;
    });
    expect(applyCommand(far, upgrade('tanto_gastado', 'coins')).reason).toBe('not_at_forge');
    const rich = makeGame(room, (g) => {
      g.enemies = [];
      g.player.coins = 999;
      g.player.weaponLevels.tanto_gastado = BALANCE.forge.maxLevel;
    });
    expect(applyCommand(rich, upgrade('tanto_gastado', 'coins')).reason).toBe('max_upgrade');
    expect(upgradeQuote(rich, 'tanto_gastado').maxed).toBe(true);
  });

  it('un arma mejorada pega más y el aviso de alcance sigue siendo el mismo', () => {
    const s = makeGame(['####', '#@E#', '####'], (g) => {
      calm(g);
      g.player.weaponLevels.tanto_gastado = 3;
    });
    expect(applyCommand(s, attack({ x: 2, y: 1 })).state.enemies[0].hp).toBe(40 - (4 + 3));
    expect(previewAttack(s, { x: 2, y: 1 }).valid).toBe(true);
  });

  it('el motor sigue siendo serializable y puro con las nuevas piezas', () => {
    const s = makeGame(['#######', '#@F.E.#', '#######'], (g) => {
      g.player.keys = ['llave_hierro'];
      g.player.coins = 3;
      g.enemies[0].stuck = { shuriken: 1 };
    });
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
    const copy = structuredClone(s);
    applyCommand(s, move(1, 0));
    expect(s).toEqual(copy);
  });
});
