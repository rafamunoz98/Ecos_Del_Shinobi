import { describe, expect, it } from 'vitest';
import { AFFINITIES } from '../content/affinities';
import { POTIONS } from '../content/arcana';
import { ALL_LOOT_TABLES } from '../content/items';
import { ENEMIES, isBossFloor } from '../content/enemies';
import { BALANCE } from '../content/balance';
import { getTechnique, TECHNIQUES } from '../content/techniques';
import { applyCommand } from '../core/engine';
import { hasLineOfSight, mutualSight, stepOk } from '../core/grid';
import type { Enemy, GameState, Vec } from '../core/types';
import { createEnemy } from '../dungeon/spawn';
import { generateLevel, healFloorOfPhase } from '../dungeon/generator';
import { attack, makeGame, move, setTile, wait } from './helpers';

const spawn = (kind: string, id: string, pos: Vec, extra: Partial<Enemy> = {}): Enemy => ({ ...createEnemy(ENEMIES[kind], id, pos, 1), alert: 12, lastSeen: null, ...extra });
const cast = (techniqueId: string, target: Vec) => ({ type: 'UseTechnique', techniqueId, target }) as const;

describe('movimiento en diagonal', () => {
  const g = (rows: string[]) => makeGame(rows);

  it('se puede cortar la esquina si una de las dos casillas contiguas está libre', () => {
    // Muro a la derecha del jugador, pero la casilla de abajo está libre: la diagonal abajo-derecha es válida.
    const s = g(['####', '#@##', '#..#', '####']);
    expect(stepOk(s.map, { x: 1, y: 1 }, { x: 2, y: 2 })).toBe(true);
    const r = applyCommand(s, move(1, 1));
    expect(r.ok).toBe(true);
    expect(r.state.player.pos).toEqual({ x: 2, y: 2 });
  });

  it('solo se bloquea si las dos casillas contiguas son pared', () => {
    const s = g(['####', '#@##', '##.#', '####']);
    expect(stepOk(s.map, { x: 1, y: 1 }, { x: 2, y: 2 })).toBe(false);
    expect(applyCommand(s, move(1, 1)).ok).toBe(false);
  });
});

describe('línea de visión mutua: nadie dispara a través de los muros', () => {
  it('la visión es simétrica y una diagonal entre dos muros no deja pasar', () => {
    const s = makeGame(['#####', '#@#.#', '##.##', '#...#', '#####']);
    const a = { x: 1, y: 1 };
    const b = { x: 3, y: 1 };
    expect(mutualSight(s.map, a, b)).toBe(false);
    expect(hasLineOfSight(s.map, a, b)).toBe(mutualSight(s.map, b, a));
  });

  it('un tirador sin línea de tiro no dispara aunque esté alerta y a distancia', () => {
    const s = makeGame(['#########', '#@..#...#', '#...#...#', '#.......#', '#########'], (g) => {
      g.enemies = [spawn('tirador_de_junco', 'enemy-t', { x: 6, y: 1 })];
    });
    const r = applyCommand(s, wait());
    expect(r.events.some((e) => e.type === 'EnemySkill')).toBe(false);
    expect(r.events.some((e) => e.type === 'DamageApplied' && e.targetId === 'player')).toBe(false);
  });

  it('con el muro quitado, el mismo tirador sí te alcanza', () => {
    const s = makeGame(['#########', '#@......#', '#.......#', '#.......#', '#########'], (g) => {
      g.enemies = [spawn('tirador_de_junco', 'enemy-t', { x: 5, y: 1 })];
    });
    const r = applyCommand(s, wait());
    expect(r.events.some((e) => e.type === 'DamageApplied' && e.targetId === 'player')).toBe(true);
  });
});

describe('Lanzar Roca', () => {
  it('sustituye a Fortaleza de Pizarra y golpea a distancia empujando al objetivo', () => {
    expect(getTechnique('fortaleza_de_pizarra')).toBeUndefined();
    const t = getTechnique('lanzar_roca');
    expect(t?.affinity).toBe('piedra');
    const s = makeGame(['###########', '#@..E.....#', '###########'], (g) => {
      g.player.techniques.push('lanzar_roca');
      g.enemies[0].hp = 40;
      g.enemies[0].maxHp = 40;
      g.enemies[0].aggroRange = 0;
    }, { affinity: 'piedra' });
    const r = applyCommand(s, cast('lanzar_roca', { x: 4, y: 1 }));
    expect(r.ok).toBe(true);
    const e = r.state.enemies[0];
    expect(e.hp).toBeLessThan(40);
    expect(e.pos.x).toBe(5);
  });
});

describe('Sustitución: deja un tronco señuelo', () => {
  const room = ['###########', '#@.......E#', '###########'];

  it('el tronco aparece en tu casilla y tú reapareces más allá', () => {
    const s = makeGame(room, (g) => {
      g.player.techniques.push('sustitucion');
      g.player.kiro = g.player.maxKiro;
      g.enemies = [];
    });
    const r = applyCommand(s, cast('sustitucion', { x: 4, y: 1 }));
    expect(r.ok).toBe(true);
    expect(r.state.player.pos).toEqual({ x: 4, y: 1 });
    const log = r.state.allies.find((a) => a.kind === 'tronco_senuelo');
    expect(log?.pos).toEqual({ x: 1, y: 1 });
  });

  it('los enemigos que te perseguían golpean al tronco en vez de a ti', () => {
    const s = makeGame(['#########', '#@...E..#', '#.......#', '#.......#', '#########'], (g) => {
      g.player.techniques.push('sustitucion');
      g.player.kiro = g.player.maxKiro;
      g.enemies[0].alert = 12;
      g.enemies[0].lastSeen = { x: 1, y: 1 };
      g.enemies[0].power = 3;
    });
    // Un acechador te persigue: te apartas dos casillas y el tronco queda en medio.
    const r = applyCommand(s, cast('sustitucion', { x: 1, y: 3 }));
    expect(r.ok).toBe(true);
    let st: GameState = r.state;
    const hp = st.player.hp;
    for (let i = 0; i < 6; i++) st = applyCommand(st, wait()).state;
    // El jugador no recibe daño mientras el enemigo se ensaña con el tronco, y el tronco sí sufre.
    expect(st.player.hp).toBe(hp);
    const log = st.allies.find((a) => a.kind === 'tronco_senuelo');
    expect(!log || log.hp < 10).toBe(true);
  });
});

describe('aliados dañados por los ataques de jefes', () => {
  it('un ataque anunciado también hiere a tu clon si está en el área', () => {
    const s = makeGame(['###########', '#..@B.....#', '###########'], (g) => {
      g.enemies[0].alert = 12;
      g.allies = [{ id: 'ally-1', kind: 'clon_de_sombra', pos: { x: 2, y: 1 }, hp: 8, maxHp: 8, power: 0, turns: 6 }];
      g.player.hp = 60;
      g.player.maxHp = 60;
    });
    let st = s;
    let hurt = false;
    for (let i = 0; i < 6 && !hurt; i++) {
      const r = applyCommand(st, wait());
      st = r.state;
      hurt = r.events.some((e) => e.type === 'DamageApplied' && e.targetId === 'ally-1') || !st.allies.some((a) => a.id === 'ally-1');
    }
    expect(hurt).toBe(true);
  });
});

describe('Sōkan: escudo de tablillas', () => {
  const arena = ['###############', '#@............#', '#.............#', '#.............#', '###############'];

  it('mientras queda alguna tablilla, el jefe no recibe daño', () => {
    const s = makeGame(arena, (g) => {
      g.enemies = [spawn('sokan_predicador', 'enemy-b0', { x: 2, y: 1 }), spawn('tablilla_sello', 'enemy-t1', { x: 8, y: 3 })];
    });
    const r = applyCommand(s, attack({ x: 2, y: 1 }));
    expect(r.state.enemies.find((e) => e.id === 'enemy-b0')?.hp).toBe(ENEMIES.sokan_predicador.maxHp);
    expect(r.events.some((e) => e.type === 'ShieldHit')).toBe(true);
  });

  it('romper la última tablilla rompe el escudo y deja de absorber', () => {
    const s = makeGame(arena, (g) => {
      g.enemies = [spawn('sokan_predicador', 'enemy-b0', { x: 8, y: 1 }), spawn('tablilla_sello', 'enemy-t1', { x: 2, y: 1 }, { hp: 1 })];
    });
    const r = applyCommand(s, attack({ x: 2, y: 1 }));
    expect(r.events.some((e) => e.type === 'ShieldBroken')).toBe(true);
    expect(r.state.enemies.some((e) => e.kind === 'tablilla_sello')).toBe(false);
  });

  it('su golpe de cayado empuja al jugador', () => {
    const s = makeGame(arena, (g) => {
      g.enemies = [spawn('sokan_predicador', 'enemy-b0', { x: 6, y: 1 })];
      g.player.pos = { x: 4, y: 1 };
      g.player.hp = 40;
      g.player.maxHp = 40;
    });
    let st: GameState = s;
    let shoved = false;
    for (let i = 0; i < 8 && !shoved; i++) {
      const r = applyCommand(st, wait());
      st = r.state;
      shoved = r.events.some((e) => e.type === 'PlayerShoved');
    }
    expect(shoved).toBe(true);
  });
});

describe('Yūgiri: mecánicas propias', () => {
  const arena = ['###############', '#@............#', '#.............#', '#.............#', '###############'];

  it('el hilo atrapador arrastra al jugador hacia el jefe', () => {
    const y = spawn('yugiri_hilo_roto', 'enemy-y', { x: 8, y: 1 });
    y.cooldowns = Object.fromEntries((ENEMIES.yugiri_hilo_roto.skills ?? []).filter((sk) => sk.id !== 'hilo_atrapador').map((sk) => [sk.id, 9]));
    const s = makeGame(arena, (g) => {
      g.enemies = [y];
      g.player.hp = 60;
      g.player.maxHp = 60;
    });
    let st: GameState = s;
    let pulled = false;
    for (let i = 0; i < 6 && !pulled; i++) {
      const r = applyCommand(st, wait());
      st = r.state;
      pulled = r.events.some((e) => e.type === 'PlayerShoved');
    }
    expect(pulled).toBe(true);
    expect(st.player.pos.x).toBeGreaterThan(1);
  });

  it('al ser golpeado puede sustituirse por una marioneta explosiva (kawarimi)', () => {
    const s = makeGame(arena, (g) => {
      g.enemies = [spawn('yugiri_hilo_roto', 'enemy-y', { x: 2, y: 1 })];
    });
    const r = applyCommand(s, attack({ x: 2, y: 1 }));
    expect(r.events.some((e) => e.type === 'Substitution')).toBe(true);
    expect(r.state.enemies.some((e) => e.kind === 'marioneta_explosiva')).toBe(true);
    // El jefe no pierde vida en el golpe sustituido.
    expect(r.state.enemies.find((e) => e.id === 'enemy-y')?.hp).toBe(ENEMIES.yugiri_hilo_roto.maxHp);
  });
});

describe('primer jefe: afinidad nueva', () => {
  const win = (): GameState => {
    const s = makeGame(['#########', '#@B...>.#', '#.......#', '#########'], (g) => {
      g.enemies[0].hp = 1;
      g.maxFloor = 6;
      g.floor = 3;
    });
    return applyCommand(s, attack({ x: 2, y: 1 })).state;
  };

  it('ofrece dos afinidades distintas a la tuya y bloquea la partida hasta elegir', () => {
    const s = win();
    const offer = s.affinityOffer ?? [];
    expect(offer).toHaveLength(2);
    expect(offer[0]).not.toBe(offer[1]);
    expect(offer).not.toContain(s.player.affinity);
    expect(applyCommand(s, wait()).reason).toBe('affinity_pending');
  });

  it('elegir una no ofrecida es inválido; elegir una válida enseña su técnica más básica sin gastar turno', () => {
    const s = win();
    const offer = s.affinityOffer ?? [];
    const other = AFFINITIES.find((a) => !offer.includes(a)) ?? 'ascua';
    expect(applyCommand(s, { type: 'ChooseAffinity', affinity: other }).ok).toBe(false);
    const r = applyCommand(s, { type: 'ChooseAffinity', affinity: offer[0] });
    expect(r.ok).toBe(true);
    expect(r.state.turn).toBe(s.turn);
    expect(r.state.player.affinity2).toBe(offer[0]);
    expect(r.state.affinityOffer).toBeNull();
    const learned = [...r.state.player.techniques, ...r.state.player.grimoire].filter((id) => getTechnique(id)?.affinity === offer[0]);
    expect(learned.length).toBeGreaterThanOrEqual(1);
  });
});

describe('objetos y tienda', () => {
  it('ya no existen tónicos ni ungüentos en ninguna tabla de botín', () => {
    for (const table of ALL_LOOT_TABLES) for (const e of table) expect(JSON.stringify(e)).not.toMatch(/tonico|unguento/);
  });

  it('hay una poción que recupera kiro y se puede aprender hasta 6 técnicas', () => {
    expect(POTIONS.kiro_mayor.effect).toEqual({ kind: 'kiro', amount: 12 });
    expect(BALANCE.techniqueSlots).toBe(6);
    expect(Object.keys(TECHNIQUES).length).toBeGreaterThan(6);
  });

  it('cada fase (sectores previos a un jefe) tiene una poción de sanación asegurada en el suelo', () => {
    const phases: number[][] = [[1, 2], [4, 5]];
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      for (const phase of phases) {
        const floors = phase.filter((f) => !isBossFloor(f));
        const healFloor = healFloorOfPhase(seed, floors[0]);
        expect(floors).toContain(healFloor);
        const lvl = generateLevel({ seed, floor: healFloor, boss: false });
        expect(lvl.drops.some((d) => d.itemId === 'pocion:sanacion')).toBe(true);
      }
    }
  });

  it('no aparecen manuales de técnica en el suelo', () => {
    for (const seed of [1, 2, 3, 4, 5]) for (const floor of [1, 2, 4, 5]) expect(generateLevel({ seed, floor, boss: false }).drops.some((d) => d.itemId.startsWith('manual:'))).toBe(false);
  });
});

describe('arbustos en los pasillos', () => {
  it('algunos sectores generan arbustos fuera de las salas', () => {
    let bushes = 0;
    for (let seed = 1; seed <= 8; seed++) {
      const lvl = generateLevel({ seed, floor: 2, boss: false });
      bushes += lvl.map.tiles.filter((t) => t === 'bush').length;
    }
    expect(bushes).toBeGreaterThan(0);
    // Un arbusto sigue siendo transitable.
    const s = makeGame(['#####', '#@b.#', '#####']);
    setTile(s, 3, 1, 'floor');
    expect(applyCommand(s, move(1, 0)).ok).toBe(true);
  });
});
