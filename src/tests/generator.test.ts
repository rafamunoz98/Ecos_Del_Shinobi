import { describe, expect, it } from 'vitest';
import { BALANCE } from '../content/balance';
import { ENEMIES } from '../content/enemies';
import { manhattan } from '../core/grid';
import { createGame } from '../core/newGame';
import { distancesFrom, generateLevel } from '../dungeon/generator';

const SEEDS = 150;

describe('generador de mapas grandes', () => {
  it('genera mapas del tamaño configurado, con paredes en el borde', () => {
    const lv = generateLevel({ seed: 1, floor: 1 });
    expect(lv.map.width).toBe(BALANCE.level.width);
    expect(lv.map.height).toBe(BALANCE.level.height);
    expect(lv.map.tiles).toHaveLength(lv.map.width * lv.map.height);
    for (let x = 0; x < lv.map.width; x++) {
      expect(lv.map.tiles[x]).toBe('wall');
      expect(lv.map.tiles[(lv.map.height - 1) * lv.map.width + x]).toBe('wall');
    }
    for (let y = 0; y < lv.map.height; y++) {
      expect(lv.map.tiles[y * lv.map.width]).toBe('wall');
      expect(lv.map.tiles[y * lv.map.width + lv.map.width - 1]).toBe('wall');
    }
  });

  it(`es válido en ${SEEDS} semillas × 3 sectores: conexo, salida lejana, sin entidades en paredes ni solapadas`, () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      for (let floor = 1; floor <= 3; floor++) {
        const lv = generateLevel({ seed, floor });
        const { map } = lv;
        const at = (p: { x: number; y: number }) => p.y * map.width + p.x;
        const ctx = `semilla ${seed} sector ${floor}`;

        // Todo el suelo es un único componente conexo desde la entrada.
        const dist = distancesFrom(map, lv.playerStart);
        const floorTiles = map.tiles.filter((t) => t !== 'wall').length;
        expect(dist.filter((d) => d >= 0).length, ctx).toBe(floorTiles);

        // Una sola salida, alcanzable y lejos de la entrada.
        expect(map.tiles.filter((t) => t === 'exit'), ctx).toHaveLength(1);
        expect(map.tiles[at(lv.exit)], ctx).toBe('exit');
        expect(dist[at(lv.exit)], ctx).toBeGreaterThan(10);
        expect(map.tiles[at(lv.playerStart)], ctx).toBe('floor');

        // Entidades sobre suelo, sin solaparse, enemigos lejos de la entrada.
        const taken = new Set<number>([at(lv.playerStart), at(lv.exit)]);
        for (const e of lv.enemies) {
          expect(map.tiles[at(e.pos)], ctx).toBe('floor');
          expect(taken.has(at(e.pos)), ctx).toBe(false);
          expect(manhattan(e.pos, lv.playerStart), ctx).toBeGreaterThanOrEqual(6);
          taken.add(at(e.pos));
        }
        for (const c of lv.chests) {
          expect(map.tiles[at(c.pos)], ctx).toBe('floor');
          expect(taken.has(at(c.pos)), ctx).toBe(false);
          taken.add(at(c.pos));
        }

        // Los cofres no cortan el camino: con todos como obstáculos, el resto sigue conectado.
        const chestSet = new Set(lv.chests.map((c) => at(c.pos)));
        const withChests = distancesFrom(map, lv.playerStart, chestSet);
        expect(withChests.filter((d) => d >= 0).length, ctx).toBe(floorTiles - chestSet.size);

        expect(lv.enemies.length, ctx).toBeGreaterThanOrEqual(BALANCE.level.minEnemies);
        expect(lv.enemies.length, ctx).toBeLessThanOrEqual(BALANCE.level.maxEnemies);
        expect(lv.chests.length, ctx).toBeGreaterThanOrEqual(1);
        expect(lv.chests.length, ctx).toBeLessThanOrEqual(BALANCE.level.maxChests);
      }
    }
  });

  it('es reproducible: misma semilla y sector dan el mismo mapa; otra semilla, otro mapa', () => {
    expect(generateLevel({ seed: 42, floor: 2 })).toEqual(generateLevel({ seed: 42, floor: 2 }));
    expect(generateLevel({ seed: 42, floor: 1 }).map.tiles).not.toEqual(generateLevel({ seed: 43, floor: 1 }).map.tiles);
    expect(generateLevel({ seed: 42, floor: 1 }).map.tiles).not.toEqual(generateLevel({ seed: 42, floor: 2 }).map.tiles);
  });

  it('los enemigos respetan el sector: nada avanzado en el sector 1 y escalado en los profundos', () => {
    const kindsFloor1 = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) for (const e of generateLevel({ seed, floor: 1 }).enemies) kindsFloor1.add(e.kind);
    for (const k of kindsFloor1) expect(ENEMIES[k].minFloor).toBe(1);

    const kindsFloor3 = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) for (const e of generateLevel({ seed, floor: 3 }).enemies) kindsFloor3.add(e.kind);
    expect(kindsFloor3.has('tirador_de_junco')).toBe(true);
    expect(kindsFloor3.has('larva_de_piedra')).toBe(true);

    const e1 = generateLevel({ seed: 5, floor: 1 }).enemies.find((e) => e.kind === 'acechador_hollin');
    const e3 = generateLevel({ seed: 5, floor: 3 }).enemies.find((e) => e.kind === 'acechador_hollin');
    expect(e1?.maxHp).toBe(ENEMIES.acechador_hollin.maxHp);
    expect(e3?.maxHp).toBe(ENEMIES.acechador_hollin.maxHp + 2 * BALANCE.enemyScale.hpPerFloor);
    expect(e3?.power).toBe(ENEMIES.acechador_hollin.power + 1);
  });

  it('el rendimiento es razonable (150 sectores en pocos segundos)', () => {
    const t0 = Date.now();
    for (let seed = 1000; seed < 1150; seed++) generateLevel({ seed, floor: 1 });
    expect(Date.now() - t0).toBeLessThan(5000);
  });
});

describe('partida nueva', () => {
  it('sortea una afinidad con la semilla (reproducible) y da su técnica de iniciación', () => {
    const a = createGame({ seed: 10 });
    const b = createGame({ seed: 10 });
    expect(a.player.affinity).toBe(b.player.affinity);
    expect(a.player.techniques).toHaveLength(1);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 100; seed++) seen.add(createGame({ seed }).player.affinity);
    expect(seen.size).toBe(5);
  });

  it('empieza en el sector 1 de 3, con una zona explorada y el estado serializable', () => {
    const s = createGame({ seed: 3 });
    expect(s.floor).toBe(1);
    expect(s.maxFloor).toBe(3);
    expect(s.explored.some(Boolean)).toBe(true);
    expect(s.explored.filter(Boolean).length).toBeLessThan(s.map.tiles.length / 4);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});
