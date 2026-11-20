import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../content/enemies';
import { learnableFor } from '../content/techniques';
import { NOTES, NPCS, notesForFloor } from '../content/story';
import { applyCommand, bossAlive, optionBlocker } from '../core/engine';
import { createGame } from '../core/newGame';
import { equals, idx } from '../core/grid';
import type { Command, GameState, Vec } from '../core/types';
import { distancesFrom, generateLevel } from '../dungeon/generator';
import { attack, interact, makeGame, move, wait } from './helpers';

const choose = (npcId: string, optionId: string): Command => ({ type: 'Choose', npcId, optionId });
const at = (s: GameState, id: string) => s.enemies.find((e) => e.id === id);
const hasCell = (cells: readonly Vec[], p: Vec) => cells.some((c) => equals(c, p));

describe('Monje Hueco: ataque anunciado', () => {
  const room = ['###########', '#..@...M..#', '###########'];

  it('marca un área alrededor del jugador y no hace daño al marcarla', () => {
    const s = makeGame(room);
    const r = applyCommand(s, wait());
    expect(r.state.telegraphs).toHaveLength(1);
    const tg = r.state.telegraphs[0];
    expect(tg.turns).toBe(2);
    expect(hasCell(tg.cells, { x: 3, y: 1 })).toBe(true);
    expect(hasCell(tg.cells, { x: 4, y: 1 })).toBe(true);
    expect(r.state.player.hp).toBe(s.player.hp);
    expect(r.events.some((e) => e.type === 'TelegraphStarted')).toBe(true);
  });

  it('si te quedas, la liberación te daña (poder 6 menos defensa)', () => {
    let s = applyCommand(makeGame(room), wait()).state; // marca
    s = applyCommand(s, wait()).state; // carga (queda 1)
    expect(s.telegraphs[0].turns).toBe(1);
    const hp = s.player.hp;
    const r = applyCommand(s, wait()); // libera
    expect(r.events).toContainEqual(expect.objectContaining({ type: 'TelegraphReleased', hit: true }));
    expect(r.state.player.hp).toBe(hp - 5);
    expect(r.state.telegraphs).toHaveLength(0);
  });

  it('si te apartas dos casillas a tiempo, lo esquivas', () => {
    let s = applyCommand(makeGame(room), wait()).state;
    s = applyCommand(s, move(-1, 0)).state;
    const hp = s.player.hp;
    const r = applyCommand(s, move(-1, 0));
    expect(r.events).toContainEqual(expect.objectContaining({ type: 'TelegraphReleased', hit: false }));
    expect(r.state.player.hp).toBe(hp);
  });

  it('aturdirlo interrumpe el ataque', () => {
    const s = applyCommand(makeGame(room), wait()).state;
    s.enemies[0].statuses.push({ id: 'aturdido', turns: 1 });
    const r = applyCommand(s, wait());
    expect(r.state.telegraphs).toHaveLength(0);
    expect(r.events).toContainEqual({ type: 'TelegraphCancelled', ownerId: s.enemies[0].id });
  });

  it('derrotarlo cancela el ataque', () => {
    const s = applyCommand(makeGame(['#######', '#@M...#', '#######']), wait()).state;
    expect(s.telegraphs).toHaveLength(1);
    s.enemies[0].hp = 1;
    const r = applyCommand(s, attack({ x: 2, y: 1 }));
    expect(r.state.enemies).toHaveLength(0);
    expect(r.state.telegraphs).toHaveLength(0);
  });

  it('el ataque sigue su cuenta atrás aunque te escondas (no depende de que te vea)', () => {
    let s = applyCommand(makeGame(room), wait()).state;
    s.enemies[0].alert = 0;
    s.enemies[0].lastSeen = null;
    s = applyCommand(s, wait()).state;
    expect(s.telegraphs[0].turns).toBe(1);
  });

  it('fuera de su alcance se acerca en lugar de marcar', () => {
    const far = makeGame(['###############', '#@.......M....#', '###############']);
    const r = applyCommand(far, wait());
    expect(r.state.telegraphs).toHaveLength(0);
    expect(r.state.enemies[0].pos.x).toBeLessThan(9);
  });
});

describe('Sōkan, Predicador Hueco (jefe shinobi)', () => {
  const big = ['#############', '#@..........#', '#...........#', '#........B..#', '#############'];
  const near = ['#####', '#@>.#', '#B..#', '#####'];

  it('está en el catálogo como jefe con 44 de vida', () => {
    expect(ENEMIES.sokan_predicador.behavior).toBe('boss');
    expect(ENEMIES.sokan_predicador.maxHp).toBe(44);
  });

  it('a corta distancia marca un golpe cercano (Golpe de Cayado) que no incluye su casilla', () => {
    const s = makeGame(near);
    const r = applyCommand(s, wait());
    expect(r.state.telegraphs).toHaveLength(1);
    const tg = r.state.telegraphs[0];
    expect(tg.name).toBe('Golpe de Cayado');
    expect(hasCell(tg.cells, { x: 1, y: 2 })).toBe(false);
    expect(hasCell(tg.cells, { x: 1, y: 1 })).toBe(true);
  });

  it('en fase 1 lejos solo avanza despacio; en fase 2 lanza la onda en cruz sobre ti', () => {
    const far = makeGame(big);
    const r1 = applyCommand(far, wait());
    expect(r1.state.telegraphs).toHaveLength(0);
    expect(r1.state.enemies[0].pos.x + r1.state.enemies[0].pos.y).toBeLessThan(12); // avanza en turno par
    const r2 = applyCommand(r1.state, wait()); // turno impar: se queda
    expect(r2.state.enemies[0].pos).toEqual(r1.state.enemies[0].pos);

    const mid = ['#############', '#@..........#', '#...........#', '#.....B.....#', '#############'];
    const f2 = makeGame(mid, (g) => (g.enemies[0].phase = 2));
    const r = applyCommand(f2, wait());
    const tg = r.state.telegraphs[0];
    expect(tg.name).toBe('Onda de Campana');
    expect(hasCell(tg.cells, { x: 1, y: 1 })).toBe(true);
    expect(hasCell(tg.cells, { x: 5, y: 1 })).toBe(true); // su fila, hasta el largo de la onda
    expect(hasCell(tg.cells, { x: 2, y: 2 })).toBe(false); // fuera de la cruz
  });

  it('presenta su diálogo una sola vez al verte', () => {
    const s = makeGame(big, (g) => {
      g.enemies[0].alert = 0;
      g.enemies[0].lastSeen = null;
    });
    const r = applyCommand(s, wait());
    expect(r.events).toContainEqual({ type: 'Dialogue', id: 'sokan_intro' });
    const again = applyCommand(r.state, wait());
    expect(again.events.some((e) => e.type === 'Dialogue' && e.id === 'sokan_intro')).toBe(false);
  });

  it('cambia de fase al perder vida: 2 por debajo de 2/3 y 3 por debajo de 1/3 (convoca dos ecos)', () => {
    const s = makeGame(near, (g) => {
      g.enemies[0].hp = 28;
    });
    const r = applyCommand(s, attack({ x: 1, y: 2 }));
    expect(r.state.enemies[0].phase).toBe(2);
    expect(r.events).toContainEqual({ type: 'BossPhase', enemyId: 'enemy-b0', phase: 2 });
    expect(r.events).toContainEqual({ type: 'Dialogue', id: 'sokan_fase2' });

    const s3 = makeGame(near, (g) => {
      g.enemies[0].hp = 14;
      g.enemies[0].phase = 2;
    });
    const r3 = applyCommand(s3, attack({ x: 1, y: 2 }));
    expect(r3.state.enemies[0].phase).toBe(3);
    expect(r3.state.enemies.filter((e) => e.kind === 'eco_menor')).toHaveLength(2);
    expect(r3.events.filter((e) => e.type === 'EnemySummoned')).toHaveLength(2);
  });

  it('es inmune al aturdimiento y al empuje', () => {
    const s = makeGame(['###########', '#@..B.....#', '###########'], undefined, { affinity: 'rayo' });
    const stun = applyCommand(s, { type: 'UseTechnique', techniqueId: 'aguja_resonante', target: { x: 4, y: 1 } });
    expect(at(stun.state, 'enemy-b0')?.statuses.some((st) => st.id === 'aturdido')).toBe(false);
    const w = makeGame(['###########', '#@..B.....#', '###########'], (g) => g.player.techniques.push('ola_empujadora'), { affinity: 'marea' });
    const push = applyCommand(w, { type: 'UseTechnique', techniqueId: 'ola_empujadora', target: { x: 4, y: 1 } });
    expect(at(push.state, 'enemy-b0')?.pos.x).toBeLessThanOrEqual(4); // no sale despedido (como mucho avanza hacia ti)
  });

  it('la salida está sellada mientras viva y al caer concede el sello antiguo y deja ganar', () => {
    const s = makeGame(near);
    expect(bossAlive(s)).toBe(true);
    expect(applyCommand(s, interact({ x: 2, y: 1 })).reason).toBe('exit_sealed');

    const dying = makeGame(near, (g) => (g.enemies[0].hp = 1));
    const r = applyCommand(dying, attack({ x: 1, y: 2 }));
    expect(bossAlive(r.state)).toBe(false);
    expect(r.state.player.relics).toContain('sello_antiguo');
    expect(r.state.stats.bossDefeated).toBe(true);
    expect(r.events.some((e) => e.type === 'BossDefeated')).toBe(true);
    expect(r.events).toContainEqual({ type: 'Dialogue', id: 'sokan_derrota' });
    const win = applyCommand(r.state, interact({ x: 2, y: 1 }));
    expect(win.state.status).toBe('won');
  });

  it('al caer el jefe desaparecen los ecos que convocó', () => {
    const s = makeGame(near, (g) => {
      g.enemies[0].hp = 1;
      g.enemies.push({ ...g.enemies[0], id: 'eco-x', kind: 'eco_menor', hp: 6, maxHp: 6, phase: 0, pos: { x: 3, y: 2 } });
    });
    const r = applyCommand(s, attack({ x: 1, y: 2 }));
    expect(r.state.enemies).toHaveLength(0);
  });
});

describe('maestros, eventos y notas', () => {
  const room = ['#########', '#@N....A#', '#########'];

  it('hablar es una acción libre: no gasta turno ni mueve a los enemigos', () => {
    const s = makeGame(['#########', '#@N...E.#', '#########']);
    const r = applyCommand(s, interact({ x: 2, y: 1 }));
    expect(r.ok).toBe(true);
    expect(r.state.turn).toBe(s.turn);
    expect(r.state.enemies[0].pos).toEqual(s.enemies[0].pos);
    expect(r.events).toContainEqual({ type: 'Dialogue', id: 'sayoko_intro' });
  });

  it('un maestro bloquea el paso como un cofre', () => {
    expect(applyCommand(makeGame(room), move(1, 0)).reason).toBe('occupied');
  });

  it('la maestra concede una mejora y solo una', () => {
    const s = makeGame(room);
    const r = applyCommand(s, choose('npc-0', 'filo'));
    expect(r.ok).toBe(true);
    expect(r.state.player.power).toBe(s.player.power + 1);
    expect(r.state.npcs[0].used).toBe(true);
    expect(r.state.stats.decisions).toBe(1);
    expect(r.state.turn).toBe(s.turn + 1);
    expect(applyCommand(r.state, choose('npc-0', 'respiracion')).reason).toBe('already_used');
    expect(applyCommand(r.state, interact({ x: 2, y: 1 })).events).toContainEqual({ type: 'Dialogue', id: 'sayoko_after' });
  });

  it('cada opción de la maestra aplica sus ganancias', () => {
    const base = makeGame(room);
    const k = applyCommand(base, choose('npc-0', 'respiracion')).state.player;
    expect(k.maxKiro).toBe(base.player.maxKiro + 4);
    expect(k.kiro).toBe(base.player.kiro + 4);
    const c = applyCommand(base, choose('npc-0', 'corteza')).state.player;
    expect(c.defense).toBe(base.player.defense + 1);
    expect(c.maxHp).toBe(base.player.maxHp + 4);
    const l = applyCommand(base, choose('npc-0', 'leccion')).state.player;
    expect(l.techniques.concat(l.grimoire)).toContain('pira_del_condenado');
  });

  it('la lección adelantada no se puede pagar si ya conoces la técnica', () => {
    const s = makeGame(room, (g) => {
      g.player.grimoire.push(...learnableFor('ascua'));
    });
    expect(applyCommand(s, choose('npc-0', 'leccion')).reason).toBe('option_unavailable');
    const opt = NPCS.maestra_sayoko.options.find((o) => o.id === 'leccion');
    expect(opt && optionBlocker(s, opt)).toMatch(/Ya conoces/);
  });

  it('exige estar junto al maestro y una opción válida', () => {
    const far = makeGame(['#########', '#@.N....#', '#########']);
    expect(applyCommand(far, choose('npc-0', 'filo')).reason).toBe('not_adjacent');
    expect(applyCommand(makeGame(room), choose('npc-0', 'nada')).reason).toBe('unknown_option');
    expect(applyCommand(makeGame(room), choose('npc-9', 'filo')).reason).toBe('no_target');
  });

  it('altar: la ofrenda de sangre cuesta vida y da poder y kiro máximo', () => {
    const s = makeGame(['#########', '#@A.....#', '#########']);
    const r = applyCommand(s, choose('npc-0', 'sangre')).state.player;
    expect(r.hp).toBe(s.player.hp - 6);
    expect(r.power).toBe(s.player.power + 1);
    expect(r.maxKiro).toBe(s.player.maxKiro + 2);
  });

  it('altar: no puedes pagar con la vida justa, ni sin kiro, ni sin shuriken', () => {
    const lowHp = makeGame(['#########', '#@A.....#', '#########'], (g) => (g.player.hp = 6));
    expect(applyCommand(lowHp, choose('npc-0', 'sangre')).reason).toBe('option_unavailable');
    const noKiro = makeGame(['#########', '#@A.....#', '#########'], (g) => (g.player.kiro = 2));
    expect(applyCommand(noKiro, choose('npc-0', 'plegaria')).reason).toBe('option_unavailable');
    const noStars = makeGame(['#########', '#@A.....#', '#########'], (g) => (g.player.inventory.shuriken = 2));
    expect(applyCommand(noStars, choose('npc-0', 'ofrenda')).reason).toBe('option_unavailable');
  });

  it('altar: la plegaria cambia todo el kiro por toda la vida; la ofrenda de acero gasta 3 shuriken', () => {
    const hurt = makeGame(['#########', '#@A.....#', '#########'], (g) => (g.player.hp = 5));
    const r = applyCommand(hurt, choose('npc-0', 'plegaria')).state.player;
    expect(r.hp).toBe(r.maxHp);
    expect(r.kiro).toBe(0);
    const s = makeGame(['#########', '#@A.....#', '#########']);
    const o = applyCommand(s, choose('npc-0', 'ofrenda')).state.player;
    expect(o.inventory.shuriken).toBe(2);
    expect(o.defense).toBe(s.player.defense + 1);
  });

  it('un pergamino se recoge al pisarlo y queda en las notas', () => {
    const s = makeGame(['#######', '#@S...#', '#######']);
    const r = applyCommand(s, move(1, 0));
    expect(r.state.player.notes).toContain('diario_cartografo');
    expect(r.state.scrolls).toHaveLength(0);
    expect(r.events).toContainEqual({ type: 'NoteFound', noteId: 'diario_cartografo' });
  });

  it('las estadísticas cuentan bajas, daño, técnicas y golpes furtivos', () => {
    const s = makeGame(['#######', '#@E...#', '#######'], (g) => {
      g.enemies[0].hp = 1;
      g.enemies[0].alert = 0;
    });
    const r = applyCommand(s, attack({ x: 2, y: 1 }));
    expect(r.state.stats.kills).toBe(1);
    expect(r.state.stats.sneakAttacks).toBe(1);
    expect(r.state.stats.damageDealt).toBeGreaterThan(0);
  });
});

describe('generación con jefe, eventos y lore', () => {
  const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);

  it('el último sector tiene la arena del jefe: Sōkan en la sala de la salida y nada más allí', () => {
    for (const seed of SEEDS) {
      const lv = generateLevel({ seed, floor: 3, boss: true });
      expect(lv.bossRoom).not.toBeNull();
      const room = lv.bossRoom as NonNullable<typeof lv.bossRoom>;
      const inRoom = (p: Vec) => p.x >= room.x && p.x < room.x + room.w && p.y >= room.y && p.y < room.y + room.h;
      const bosses = lv.enemies.filter((e) => e.kind === 'sokan_predicador');
      expect(bosses).toHaveLength(1);
      expect(inRoom(bosses[0].pos)).toBe(true);
      expect(inRoom(lv.exit)).toBe(true);
      expect(lv.enemies.filter((e) => e.kind !== 'sokan_predicador' && inRoom(e.pos))).toHaveLength(0);
      expect(bosses[0].hp).toBe(ENEMIES.sokan_predicador.maxHp);
    }
  });

  it('los demás sectores no tienen jefe', () => {
    for (const seed of SEEDS) {
      for (const floor of [1, 2]) {
        const lv = generateLevel({ seed, floor });
        expect(lv.bossRoom).toBeNull();
        expect(lv.enemies.some((e) => e.kind === 'sokan_predicador')).toBe(false);
      }
    }
  });

  it('el sector 1 trae el altar y el 2 la maestra; todo es alcanzable y está en suelo', () => {
    for (const seed of SEEDS) {
      const l1 = generateLevel({ seed, floor: 1 });
      const l2 = generateLevel({ seed, floor: 2 });
      expect(l1.npcs.map((n) => n.kind)).toEqual(['altar_eco_roto']);
      expect(l2.npcs.map((n) => n.kind)).toEqual(['maestra_sayoko', 'mesa_forja']);
      for (const lv of [l1, l2, generateLevel({ seed, floor: 3, boss: true })]) {
        const blocked = new Set([...lv.npcs.map((n) => idx(lv.map, n.pos)), ...lv.chests.map((c) => idx(lv.map, c.pos))]);
        const dist = distancesFrom(lv.map, lv.playerStart, blocked);
        for (const n of lv.npcs) {
          expect(lv.map.tiles[idx(lv.map, n.pos)]).toBe('floor');
          // alguna casilla vecina es alcanzable para hablar con él
          const neighbours = [
            { x: n.pos.x + 1, y: n.pos.y },
            { x: n.pos.x - 1, y: n.pos.y },
            { x: n.pos.x, y: n.pos.y + 1 },
            { x: n.pos.x, y: n.pos.y - 1 },
          ];
          expect(neighbours.some((c) => dist[idx(lv.map, c)] >= 0)).toBe(true);
        }
        for (const sc of lv.scrolls) {
          expect(lv.map.tiles[idx(lv.map, sc.pos)]).toBe('floor');
          expect(dist[idx(lv.map, sc.pos)]).toBeGreaterThanOrEqual(0);
        }
        // exit y enemigos siguen alcanzables
        expect(dist[idx(lv.map, lv.exit)]).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('cada sector coloca entre 1 y 2 pergaminos distintos de su propio sector', () => {
    for (const seed of SEEDS) {
      for (const floor of [1, 2, 3]) {
        const lv = generateLevel({ seed, floor });
        expect(lv.scrolls.length).toBeGreaterThanOrEqual(1);
        expect(lv.scrolls.length).toBeLessThanOrEqual(2);
        const ids = lv.scrolls.map((s) => s.noteId);
        expect(new Set(ids).size).toBe(ids.length);
        for (const id of ids) expect(NOTES[id].floor).toBe(floor);
      }
    }
    for (const f of [1, 2, 3]) expect(notesForFloor(f).length).toBeGreaterThanOrEqual(2);
  });

  it('una expedición baja hasta el jefe y su estado se serializa y repite con la semilla', () => {
    const run = () => {
      let s = createGame({ seed: 21 });
      for (let f = 0; f < 2; f++) {
        const i = s.map.tiles.indexOf('exit');
        const exit = { x: i % s.map.width, y: Math.floor(i / s.map.width) };
        const adj = [
          { x: exit.x - 1, y: exit.y },
          { x: exit.x + 1, y: exit.y },
          { x: exit.x, y: exit.y - 1 },
          { x: exit.x, y: exit.y + 1 },
        ].find((c) => s.map.tiles[c.y * s.map.width + c.x] === 'floor') as Vec;
        s = applyCommand({ ...s, enemies: [], player: { ...s.player, pos: adj } }, interact(exit)).state;
      }
      return s;
    };
    const s = run();
    expect(s.floor).toBe(3);
    expect(s.enemies.some((e) => e.kind === 'sokan_predicador')).toBe(true);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
    expect(run()).toEqual(s);
  });
});

describe('resumen de la expedición', () => {
  it('guarda qué te derrotó', () => {
    const s = makeGame(['#######', '#@M...#', '#######'], (g) => (g.player.hp = 3));
    let r = applyCommand(s, wait()); // marca
    r = applyCommand(r.state, wait()); // carga
    r = applyCommand(r.state, wait()); // libera: 6 - defensa 1 = 5 ≥ 3
    expect(r.state.status).toBe('lost');
    expect(r.state.stats.defeatedBy).toBe('monje_hueco');
  });
});
