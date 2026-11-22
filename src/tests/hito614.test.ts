import { describe, expect, it } from 'vitest';
import { BALANCE } from '../content/balance';
import { applyCommand } from '../core/engine';
import { findPath, isStandable } from '../core/grid';
import { PERMANENT_HAZARD, addHazard, connectedWater, hazardAt } from '../core/terrain';
import type { Command, GameState, TerrainKind, Vec } from '../core/types';
import { CHALLENGE_ITEM, distancesFrom, generateLevel, secretFloorOfPhase } from '../dungeon/generator';
import { floorHints, terrainHints } from '../core/hints';
import { createGame } from '../core/newGame';
import { makeGame, move, wait } from './helpers';

const run = (g: GameState, ...cmds: Command[]): GameState => {
  let s = g;
  for (const c of cmds) {
    const r = applyCommand(s, c);
    expect(r.ok, `${JSON.stringify(c)} → ${r.message ?? ''}`).toBe(true);
    s = r.state;
  }
  return s;
};
const throwItem = (itemId: string, target: Vec): Command => ({ type: 'Throw', itemId, target });
const calm = (g: GameState): void => {
  for (const e of g.enemies) {
    e.aggroRange = 0;
    e.power = 0;
  }
};
const tileAt = (g: GameState, x: number, y: number): TerrainKind => g.map.tiles[y * g.map.width + x];

const CORRIDOR = ['#########', '#@~.....#', '#.......#', '#########'];
/** Una partida de sala con varios sectores por delante (así caer o bajar sí lleva a otro sector). */
const deep = (rows: string[], tweak?: (s: GameState) => void, opts?: { seed?: number }): GameState =>
  makeGame(rows, (s) => {
    s.maxFloor = 6;
    tweak?.(s);
  }, opts);

describe('precipicios', () => {
  it('pisar el vacío te hace caer al sector de abajo y te cuesta la mitad de tu vida máxima', () => {
    const g = deep(CORRIDOR);
    const r = applyCommand(g, move(1, 0));
    expect(r.ok).toBe(true);
    expect(r.state.floor).toBe(2);
    expect(r.state.player.hp).toBe(g.player.maxHp - Math.ceil(g.player.maxHp * BALANCE.fallDamageFraction));
    expect(r.events.some((e) => e.type === 'PlayerFell')).toBe(true);
    // Del sector de arriba no queda fuego ni descargas: solo los charcos naturales del nuevo sector.
    expect(r.state.hazards.every((h) => h.kind === 'water' && h.turns >= PERMANENT_HAZARD)).toBe(true);
  });

  it('la caída nunca mata: deja al menos 1 de vida', () => {
    const g = deep(CORRIDOR, (s) => {
      s.player.hp = 3;
    });
    const r = applyCommand(g, move(1, 0));
    expect(r.state.floor).toBe(2);
    expect(r.state.player.hp).toBe(1);
    expect(r.state.status).toBe('playing');
  });

  it('aterrizas lejos (≥6) de los enemigos del sector de abajo', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const g = deep(CORRIDOR, undefined, { seed });
      const s = applyCommand(g, move(1, 0)).state;
      for (const e of s.enemies) expect(Math.abs(e.pos.x - s.player.pos.x) + Math.abs(e.pos.y - s.player.pos.y), `semilla ${seed}`).toBeGreaterThanOrEqual(6);
      expect(s.map.tiles[s.player.pos.y * s.map.width + s.player.pos.x]).toBe('floor');
    }
  });

  it('levitando cruzas el vacío sin caer, y si la levitación acaba encima, caes', () => {
    const g = deep(CORRIDOR, (s) => {
      s.player.statuses.push({ id: 'levitando', turns: 3 });
    });
    const over = run(g, move(1, 0));
    expect(over.floor).toBe(1);
    expect(over.player.pos).toEqual({ x: 2, y: 1 });
    const crossed = run(over, move(1, 0));
    expect(crossed.floor).toBe(1);
    // Sin tiempo de sobra: se acaba la levitación sobre el vacío.
    const short = deep(CORRIDOR, (s) => {
      s.player.statuses.push({ id: 'levitando', turns: 2 });
    });
    const hover = run(short, move(1, 0));
    expect(hover.floor).toBe(1);
    expect(applyCommand(hover, wait()).state.floor).toBe(2);
  });

  it('los precipicios no son suelo para enemigos ni trayectos, pero las casillas de al lado siguen conectadas', () => {
    const g = makeGame(['########', '#@.~..E#', '#......#', '########']);
    expect(isStandable(g.map, { x: 3, y: 1 })).toBe(false);
    const path = findPath(g.map, { x: 1, y: 1 }, { x: 5, y: 1 }, () => false);
    expect(path).not.toBeNull();
    expect(path?.some((p) => p.x === 3 && p.y <= 2 && g.map.tiles[p.y * g.map.width + p.x] === 'chasm')).toBe(false);
    expect(findPath(makeGame(['#####', '#@~.#', '#####']).map, { x: 1, y: 1 }, { x: 3, y: 1 }, () => false)).toBeNull();
  });

  it('un enemigo empujado al vacío cae y no deja botín', () => {
    const g = deep(['#########', '#@.E~...#', '#########'], (s) => {
      s.player.affinity = 'marea';
      s.player.techniques = ['ola_empujadora'];
      s.player.kiro = 10;
      calm(s);
    });
    const s = applyCommand(g, { type: 'UseTechnique', techniqueId: 'ola_empujadora', target: { x: 2, y: 1 } }).state;
    expect(s.enemies).toHaveLength(0);
    expect(s.drops.some((d) => d.pos.x === 4)).toBe(false);
    expect(s.log.join('\n')).toContain('precipicio');
  });

  it('no hay precipicios en los sectores de jefe ni donde está la Poción de Fuerza asegurada', () => {
    for (let seed = 1; seed <= 60; seed++) {
      for (const floor of [1, 2, 3, 4, 5, 6]) {
        const lv = generateLevel({ seed, floor, boss: floor === 3 || floor === 6 });
        if (floor === 3 || floor === 6) expect(lv.map.tiles.includes('chasm'), `semilla ${seed} sector ${floor}`).toBe(false);
        if (lv.drops.some((d) => d.itemId === 'pocion:fuerza')) expect(lv.map.tiles.includes('chasm'), `semilla ${seed} sector ${floor}`).toBe(false);
      }
    }
  });
});

describe('fuego, agua y rayo sobre el terreno', () => {
  it('una Poción Ígnea lanzada quema el arbusto y deja llamas que saltan al arbusto de al lado', () => {
    const g = makeGame(['###########', '#@.....bbb#', '###########'], (s) => {
      s.player.inventory['pocion:ignea'] = 1;
    });
    let s = run(g, throwItem('pocion:ignea', { x: 5, y: 1 }));
    expect(hazardAt(s, { x: 5, y: 1 }, 'fire')).toBeDefined();
    expect(tileAt(s, 8, 1)).toBe('bush');
    // El fuego prende el arbusto de la casilla vecina con el paso de las rondas.
    s = run(s, wait(), wait(), wait());
    expect(tileAt(s, 7, 1)).toBe('floor'); // consumido
    expect(tileAt(s, 9, 1)).toBe('floor'); // el incendio recorrió el matorral entero
    // Y acaba apagándose.
    for (let i = 0; i < 6; i++) s = run(s, wait());
    expect(s.hazards.filter((h) => h.kind === 'fire')).toHaveLength(0);
  });

  it('el fuego consume un zarzal y abre la alcoba', () => {
    const g = makeGame(['#########', '#@.....t#', '#########'], (s) => {
      s.player.inventory['pocion:ignea'] = 1;
    });
    const s = run(g, throwItem('pocion:ignea', { x: 6, y: 1 }), wait());
    expect(tileAt(s, 7, 1)).toBe('floor');
  });

  it('quien pisa las llamas arde; levitando no', () => {
    const base = makeGame(['#######', '#@....#', '#######'], (s) => {
      s.player.inventory['pocion:ignea'] = 1;
    });
    const burning = run(base, throwItem('pocion:ignea', { x: 3, y: 1 }), move(1, 0), move(1, 0));
    expect(burning.player.statuses.some((st) => st.id === 'quemadura')).toBe(true);
    const floating = makeGame(['#######', '#@....#', '#######'], (s) => {
      s.player.inventory['pocion:ignea'] = 1;
      s.player.statuses.push({ id: 'levitando', turns: 12 });
    });
    const safe = run(floating, throwItem('pocion:ignea', { x: 4, y: 1 }), move(1, 0), move(1, 0), move(1, 0));
    expect(safe.player.statuses.some((st) => st.id === 'quemadura')).toBe(false);
  });

  it('los enemigos rodean las llamas en vez de cruzarlas', () => {
    const g = makeGame(['########', '#@..E..#', '########'], (s) => {
      s.enemies[0].alert = 9;
      s.enemies[0].aggroRange = 8;
    });
    addHazard(g, { x: 3, y: 1 }, 'fire', 5);
    const s = run(g, wait());
    expect(s.enemies[0].pos).toEqual({ x: 4, y: 1 }); // no puede entrar en (3,1)
  });

  it('el agua apaga el fuego y el fuego seca el agua (en la misma casilla)', () => {
    const g = makeGame(['#####', '#@..#', '#####']);
    addHazard(g, { x: 2, y: 1 }, 'water', 10);
    addHazard(g, { x: 2, y: 1 }, 'fire', 3);
    expect(hazardAt(g, { x: 2, y: 1 }, 'fire')).toBeUndefined();
    expect(hazardAt(g, { x: 2, y: 1 }, 'water')).toBeUndefined();
    addHazard(g, { x: 3, y: 1 }, 'fire', 3);
    addHazard(g, { x: 3, y: 1 }, 'water', 10);
    expect(hazardAt(g, { x: 3, y: 1 }, 'fire')).toBeUndefined();
    expect(hazardAt(g, { x: 3, y: 1 }, 'water')).toBeDefined();
  });

  it('una técnica de Marea deja un charco y una descarga de Rayo lo recorre entero, hiriendo y aturdiendo', () => {
    const g = makeGame(['###########', '#@........#', '#...E.E...#', '###########'], (s) => {
      s.player.affinity = 'marea';
      s.player.affinity2 = 'rayo';
      s.player.techniques = ['aguja_de_agua', 'aguja_resonante'];
      s.player.kiro = 10;
      calm(s);
      s.enemies[0].pos = { x: 4, y: 2 };
      s.enemies[1].pos = { x: 6, y: 2 };
      s.enemies[0].hp = s.enemies[0].maxHp = 20;
      s.enemies[1].hp = s.enemies[1].maxHp = 20;
      s.enemies[0].affinity = s.enemies[1].affinity = null;
      s.enemies[0].defense = s.enemies[1].defense = 0;
    });
    // Charco bajo cada enemigo y uno que los une.
    for (const x of [4, 5, 6]) addHazard(g, { x, y: 2 }, 'water', 10);
    expect(connectedWater(g, { x: 4, y: 2 })).toHaveLength(3);
    const before = g.enemies.map((e) => e.hp);
    const s = applyCommand(g, { type: 'UseTechnique', techniqueId: 'aguja_resonante', target: { x: 4, y: 2 } }).state;
    // Aguja Resonante hiere al objetivo; la descarga alcanza TAMBIÉN al otro enemigo, que no estaba en la zona.
    expect(s.enemies[1].hp).toBeLessThan(before[1]);
    expect(s.enemies[1].statuses.some((st) => st.id === 'aturdido')).toBe(true);
    expect(s.hazards.some((h) => h.kind === 'shock')).toBe(true);
  });

  it('un rayo sin agua no electrocuta a nadie más, y metido en el charco te alcanza a ti (salvo levitando)', () => {
    const mk = (lev: boolean): GameState =>
      makeGame(['#########', '#@..E...#', '#########'], (s) => {
        s.player.affinity = 'rayo';
        s.player.techniques = ['aguja_resonante'];
        s.player.kiro = 10;
        calm(s);
        if (lev) s.player.statuses.push({ id: 'levitando', turns: 9 });
        addHazard(s, { x: 1, y: 1 }, 'water', 10);
        addHazard(s, { x: 2, y: 1 }, 'water', 10);
        addHazard(s, { x: 3, y: 1 }, 'water', 10);
        addHazard(s, { x: 4, y: 1 }, 'water', 10);
      });
    const wet = applyCommand(mk(false), { type: 'UseTechnique', techniqueId: 'aguja_resonante', target: { x: 4, y: 1 } }).state;
    expect(wet.player.hp).toBeLessThan(mk(false).player.hp);
    const dry = applyCommand(mk(true), { type: 'UseTechnique', techniqueId: 'aguja_resonante', target: { x: 4, y: 1 } }).state;
    expect(dry.player.hp).toBe(mk(true).player.hp);
  });
});

describe('muros agrietados y puertas secretas', () => {
  it('un Sello Explosivo junto a un muro agrietado lo derriba', () => {
    const g = makeGame(['#######', '#@.x..#', '#######'], (s) => {
      s.player.inventory['pergamino:explosivo'] = 1;
      s.player.known.push('pergamino:explosivo');
    });
    expect(isStandable(g.map, { x: 3, y: 1 })).toBe(false);
    const s = run(g, { type: 'UseItem', itemId: 'pergamino:explosivo' });
    expect(tileAt(s, 3, 1)).toBe('floor');
  });

  it('una técnica de piedra o ascua que revienta en área también lo derriba; una cualquiera no', () => {
    const mk = (id: string, aff: 'piedra' | 'ascua' | 'rayo'): GameState =>
      makeGame(['#######', '#@x...#', '#######'], (s) => {
        s.player.affinity = aff;
        s.player.techniques = [id];
        s.player.kiro = 10;
      });
    expect(tileAt(applyCommand(mk('golpe_sismico', 'piedra'), { type: 'UseTechnique', techniqueId: 'golpe_sismico', target: { x: 1, y: 1 } }).state, 2, 1)).toBe('floor');
    expect(tileAt(applyCommand(mk('chispazo', 'rayo'), { type: 'UseTechnique', techniqueId: 'chispazo', target: { x: 1, y: 1 } }).state, 2, 1)).toBe('cracked');
  });

  it('buscar descubre las paredes secretas a ≤2 casillas y no las lejanas', () => {
    const g = makeGame(['###########', '#@...s....#', '#.........#', '#####s#####', '###########']);
    const near = run(g, { type: 'Search' }, move(1, 0), { type: 'Search' }); // junto a (5,1)
    expect(tileAt(near, 5, 1)).toBe('door');
    const far = makeGame(['###############', '#@............#', '###############', '#######s#######']);
    expect(tileAt(run(far, { type: 'Search' }), 7, 3)).toBe('secret');
  });

  it('buscar recupera kiro como esperar y un hallazgo se anuncia con un evento', () => {
    const g = makeGame(['#####', '#@s.#', '#####'], (s) => {
      s.player.kiro = 5;
    });
    const r = applyCommand(g, { type: 'Search' });
    expect(r.state.player.kiro).toBe(5 + BALANCE.waitKiro);
    expect(r.events.some((e) => e.type === 'SecretFound')).toBe(true);
  });

  it('caminar junto a una pared secreta avisa una sola vez', () => {
    const g = makeGame(['###########', '#@........#', '#.........#', '#####s#####', '###########']);
    let s = g;
    let hints = 0;
    for (let i = 0; i < 8; i++) {
      const r = applyCommand(s, move(1, 0));
      s = r.state;
      hints += s.log.slice(-4).filter((l) => l.includes('no encaja')).length > 0 ? 0 : 0;
    }
    expect(s.hintedSecrets.length).toBeLessThanOrEqual(1);
    expect(s.log.filter((l) => l.includes('Algo no encaja'))).toHaveLength(s.hintedSecrets.length);
    expect(hints).toBe(0);
  });

  it('las puertas descubiertas se abren y la cámara de dentro es transitable', () => {
    const g = makeGame(['#####', '#@s.#', '#####']);
    const s = run(g, { type: 'Search' });
    expect(tileAt(s, 2, 1)).toBe('door');
    expect(applyCommand(s, move(1, 0)).ok).toBe(true);
  });
});

describe('minidesafíos y cámaras ocultas generadas', () => {
  const SEEDS = 80;
  it('cada sector que no es de jefe trae un minidesafío con su objeto asegurado (sin identificar, en pila de 2) y accesible', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      for (const floor of [1, 2, 4, 5]) {
        const lv = generateLevel({ seed, floor });
        const ctx = `semilla ${seed} sector ${floor}`;
        expect(lv.challenge, ctx).not.toBeNull();
        const kind = lv.challenge as 'zarzal' | 'grieta' | 'isla';
        const item = lv.drops.find((d) => d.itemId === CHALLENGE_ITEM[kind]);
        expect(item?.known, ctx).toBeUndefined();
        expect(item?.count, ctx).toBe(2);
        const stand = distancesFrom(lv.map, lv.playerStart, undefined, true);
        expect(stand[(item?.pos.y ?? 0) * lv.map.width + (item?.pos.x ?? 0)], `${ctx}: objeto inalcanzable`).toBeGreaterThanOrEqual(0);
        // La recompensa (un cofre) está en la alcoba.
        const nook = lv.challengeNook;
        expect(nook, ctx).not.toBeNull();
        const cells = new Set((nook?.cells ?? []).map((c) => c.y * lv.map.width + c.x));
        expect(lv.chests.some((c) => cells.has(c.pos.y * lv.map.width + c.pos.x)), ctx).toBe(true);
        if (kind === 'zarzal') expect(lv.map.tiles[(nook?.door.y ?? 0) * lv.map.width + (nook?.door.x ?? 0)], ctx).toBe('thorns');
        if (kind === 'grieta') expect(lv.map.tiles[(nook?.door.y ?? 0) * lv.map.width + (nook?.door.x ?? 0)], ctx).toBe('cracked');
        if (kind === 'isla') {
          // La isla solo se alcanza sobrevolando el vacío.
          expect(lv.map.tiles.includes('chasm'), ctx).toBe(true);
          const chest = lv.chests.find((c) => cells.has(c.pos.y * lv.map.width + c.pos.x));
          expect(stand[(chest?.pos.y ?? 0) * lv.map.width + (chest?.pos.x ?? 0)], ctx).toBe(-1);
          const flying = distancesFrom(lv.map, lv.playerStart);
          expect(flying[(chest?.pos.y ?? 0) * lv.map.width + (chest?.pos.x ?? 0)], ctx).toBeGreaterThan(0);
        }
        // Los sectores de jefe no llevan desafío.
      }
      for (const floor of [3, 6]) expect(generateLevel({ seed, floor, boss: true }).challenge).toBeNull();
    }
  });

  it('todo el suelo de pie sigue conectado aunque haya precipicios', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      for (const floor of [1, 2, 4, 5]) {
        const lv = generateLevel({ seed, floor });
        const reach = distancesFrom(lv.map, lv.playerStart, undefined, true);
        const walk = distancesFrom(lv.map, lv.playerStart);
        const ctx = `semilla ${seed} sector ${floor}`;
        expect(reach[lv.exit.y * lv.map.width + lv.exit.x], ctx).toBeGreaterThan(0);
        // Salvo la isla, lo alcanzable volando y a pie coincide en lo que no es vacío.
        const island = new Set(lv.challenge === 'isla' ? (lv.challengeNook?.cells ?? []).map((c) => c.y * lv.map.width + c.x) : []);
        lv.map.tiles.forEach((t, i) => {
          if (t === 'chasm' || island.has(i)) return;
          if (walk[i] >= 0) expect(reach[i], `${ctx} casilla ${i}`).toBeGreaterThanOrEqual(0);
        });
      }
    }
  });

  it('la alcoba de un zarzal o muro agrietado queda cerrada hasta que cae su obstáculo', () => {
    let tried = 0;
    for (let seed = 1; seed <= SEEDS && tried < 20; seed++) {
      const lv = generateLevel({ seed, floor: 2 });
      if (lv.challenge === 'isla' || !lv.challengeNook) continue;
      tried++;
      const nook = lv.challengeNook;
      const first = nook.cells[4];
      expect(distancesFrom(lv.map, lv.playerStart)[first.y * lv.map.width + first.x]).toBe(-1);
      const opened = { ...lv.map, tiles: [...lv.map.tiles] };
      opened.tiles[nook.door.y * lv.map.width + nook.door.x] = 'floor';
      expect(distancesFrom(opened, lv.playerStart)[first.y * lv.map.width + first.x]).toBeGreaterThan(0);
    }
    expect(tried).toBeGreaterThan(5);
  });

  it('hay UNA cámara oculta por fase (nunca en el sector del jefe), esconde tesoro y se abre al descubrirla', () => {
    let secrets = 0;
    let expected = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      for (const floor of [1, 2, 4, 5]) {
        const lv = generateLevel({ seed, floor });
        const wants = secretFloorOfPhase(seed, floor) === floor;
        if (!wants) {
          expect(lv.secret, `semilla ${seed} sector ${floor}`).toBeNull();
          continue;
        }
        expected++;
        if (!lv.secret) continue;
        secrets++;
        const t = lv.map.tiles[lv.secret.door.y * lv.map.width + lv.secret.door.x];
        expect(t).toBe('secret');
        const inside = new Set(lv.secret.cells.map((c) => c.y * lv.map.width + c.x));
        const loot = lv.drops.filter((d) => inside.has(d.pos.y * lv.map.width + d.pos.x)).length + lv.chests.filter((c) => inside.has(c.pos.y * lv.map.width + c.pos.x)).length;
        expect(loot, `semilla ${seed} sector ${floor}`).toBeGreaterThan(0);
        expect(distancesFrom(lv.map, lv.playerStart)[lv.secret.cells[4].y * lv.map.width + lv.secret.cells[4].x]).toBe(-1);
      }
      for (const floor of [3, 6]) expect(generateLevel({ seed, floor, boss: true }).secret).toBeNull();
    }
    // Casi siempre se logra tallar la cámara en el sector sorteado.
    expect(expected).toBe(SEEDS * 2);
    expect(secrets / expected).toBeGreaterThan(0.95);
  });

  it('al entrar en el sector de la cámara oculta el registro avisa de que «se siente misterioso»', () => {
    let seen = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const g = createGame({ seed, affinity: 'rayo' });
      const hints = floorHints(g);
      const has = g.map.tiles.includes('secret');
      expect(hints.some((h) => h.includes('misterioso')), `semilla ${seed}`).toBe(has);
      if (has) {
        seen++;
        expect(g.log.some((l) => l.includes('misterioso'))).toBe(true);
      }
    }
    expect(seen).toBeGreaterThan(5);
  });

  it('el sector avisa de su desafío al entrar (zarzal, muro agrietado o isla) SIN nombrar el objeto asegurado', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= SEEDS * 3 && seen.size < 3; seed++) {
      for (const floor of [1, 2, 4, 5]) {
        const lv = generateLevel({ seed, floor });
        if (!lv.challenge) continue;
        const g = createGame({ seed, affinity: 'ascua' });
        g.map = lv.map;
        g.chests = lv.chests;
        g.challenge = lv.challenge;
        const hints = terrainHints(g).join(' ');
        expect(hints).not.toMatch(/Ígnea|Explosivo|Levitación/);
        if (lv.challenge === 'zarzal') expect(hints).toContain('zarzal');
        if (lv.challenge === 'grieta') expect(hints).toContain('muro agrietado');
        if (lv.challenge === 'isla') expect(hints).toContain('isla');
        seen.add(lv.challenge);
      }
    }
    expect(seen.size).toBe(3);
  });

  it('el objeto asegurado NO se identifica al recogerlo: hay que probarlo (lanzarlo identifica la poción)', () => {
    const g = createGame({ seed: 5, affinity: 'rayo' });
    g.drops.push({ pos: { x: g.player.pos.x, y: g.player.pos.y }, itemId: 'pocion:ignea', count: 2 });
    const s = applyCommand(g, wait()).state;
    expect(s.player.known).not.toContain('pocion:ignea');
    expect(s.player.inventory['pocion:ignea']).toBe(2);
    expect(s.log.some((l) => l.includes('Ígnea'))).toBe(false);
  });
});
