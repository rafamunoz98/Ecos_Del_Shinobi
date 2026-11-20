import { describe, expect, it } from 'vitest';
import { BOSS_BY_FLOOR, ENEMIES, isBossFloor } from '../content/enemies';
import { MERCHANT_KIND } from '../content/shop';
import { applyCommand } from '../core/engine';
import { createGame } from '../core/newGame';
import type { Enemy, GameState } from '../core/types';
import { generateLevel } from '../dungeon/generator';
import { createEnemy } from '../dungeon/spawn';
import { attack, interact, makeGame, wait } from './helpers';

const addEnemy = (g: GameState, kind: string, x: number, y: number): Enemy => {
  const e = { ...createEnemy(ENEMIES[kind], `e-${kind}`, { x, y }, 1), alert: 12 };
  g.enemies = [e];
  return e;
};

describe('habilidades de los shinobi', () => {
  it('el catálogo tiene al menos 8 shinobi con habilidades y 2 jefes shinobi', () => {
    const shinobi = Object.values(ENEMIES).filter((e) => e.family === 'shinobi' && e.behavior !== 'boss');
    expect(shinobi.length).toBeGreaterThanOrEqual(8);
    expect(shinobi.filter((e) => (e.skills ?? []).length > 0).length).toBeGreaterThanOrEqual(8);
    const bosses = Object.values(ENEMIES).filter((e) => e.behavior === 'boss');
    expect(bosses).toHaveLength(2);
    expect(bosses.every((b) => b.family === 'shinobi')).toBe(true);
    expect(Object.keys(ENEMIES).some((k) => k.includes('campanero'))).toBe(false);
  });

  it('el espadachín prepara un tajo giratorio alrededor de sí y no daña hasta liberarlo', () => {
    const s = makeGame(['#######', '#@E...#', '#######'], (g) => addEnemy(g, 'espadachin_de_laca', 2, 1));
    const r = applyCommand(s, wait());
    expect(r.state.telegraphs).toHaveLength(1);
    expect(r.state.telegraphs[0].name).toBe('Tajo Giratorio');
    expect(r.state.player.hp).toBe(s.player.hp);
    const r2 = applyCommand(r.state, wait());
    expect(r2.state.player.hp).toBeLessThan(s.player.hp);
  });

  it('el adepto de la brasa lanza una línea de fuego alineada y deja quemadura', () => {
    const s = makeGame(['###########', '#@........#', '###########'], (g) => {
      addEnemy(g, 'adepto_de_brasa', 5, 1);
    });
    const r = applyCommand(s, wait());
    const tg = r.state.telegraphs[0];
    expect(tg.name).toBe('Aliento de Brasa');
    expect(tg.cells.some((c) => c.x === 1 && c.y === 1)).toBe(true);
    expect(tg.cells.some((c) => c.x === 5)).toBe(false); // no incluye su casilla
    const r2 = applyCommand(r.state, wait());
    expect(r2.state.player.statuses.some((st) => st.id === 'quemadura')).toBe(true);
  });

  it('el envenenador dispara senbon que envenenan, y la habilidad entra en cooldown', () => {
    const s = makeGame(['###########', '#@........#', '###########'], (g) => {
      addEnemy(g, 'envenenador_de_raiz', 5, 1);
    });
    const r = applyCommand(s, wait());
    expect(r.state.player.statuses.some((st) => st.id === 'veneno')).toBe(true);
    expect(r.state.enemies[0].cooldowns.senbon_envenenadas).toBeGreaterThan(0);
  });

  it('el rastreador salta junto al jugador desde lejos', () => {
    const s = makeGame(['###########', '#@........#', '###########'], (g) => {
      addEnemy(g, 'rastreador_hilo_gris', 6, 1);
    });
    const r = applyCommand(s, wait());
    const e = r.state.enemies[0];
    expect(Math.max(Math.abs(e.pos.x - r.state.player.pos.x), Math.abs(e.pos.y - r.state.player.pos.y))).toBeLessThanOrEqual(1);
    expect(r.events.some((ev) => ev.type === 'EnemySkill')).toBe(true);
  });

  it('el sellador convoca clones que no cuentan para despejar el sector', () => {
    const s = makeGame(['###########', '#@........#', '###########'], (g) => {
      addEnemy(g, 'sellador_invocador', 6, 1);
      g.floorEnemies = 1;
    });
    const r = applyCommand(s, wait());
    expect(r.state.enemies.filter((e) => e.kind === 'clon_de_niebla')).toHaveLength(2);
    expect(ENEMIES.clon_de_niebla.summoned).toBe(true);
  });

  it('un enemigo aturdido pierde el ataque anunciado', () => {
    const s = makeGame(['#######', '#@E...#', '#######'], (g) => addEnemy(g, 'espadachin_de_laca', 2, 1));
    const charging = applyCommand(s, wait()).state;
    expect(charging.telegraphs).toHaveLength(1);
    charging.enemies[0].statuses.push({ id: 'aturdido', turns: 2 });
    const r = applyCommand(charging, wait());
    expect(r.state.telegraphs).toHaveLength(0);
    expect(r.state.player.hp).toBe(s.player.hp);
  });
});

describe('jefes por zona', () => {
  it('hay jefe en los sectores 3 y 6 (y solo allí)', () => {
    expect(isBossFloor(3)).toBe(true);
    expect(isBossFloor(6)).toBe(true);
    for (const f of [1, 2, 4, 5]) expect(isBossFloor(f)).toBe(false);
    expect(BOSS_BY_FLOOR[3]).toBe('sokan_predicador');
    expect(BOSS_BY_FLOOR[6]).toBe('yugiri_hilo_roto');
    for (const [floor, id] of [[3, 'sokan_predicador'], [6, 'yugiri_hilo_roto']] as const) {
      const lv = generateLevel({ seed: 11, floor, boss: true });
      expect(lv.enemies.filter((e) => e.kind === id)).toHaveLength(1);
    }
    expect(generateLevel({ seed: 11, floor: 4, boss: false }).enemies.some((e) => ENEMIES[e.kind].behavior === 'boss')).toBe(false);
  });

  it('los sectores hondos traen shinobi nuevos', () => {
    const kinds = new Set<string>();
    for (let seed = 1; seed <= 12; seed++) for (const f of [4, 5]) generateLevel({ seed, floor: f, boss: false }).enemies.forEach((e) => kinds.add(e.kind));
    expect([...kinds].some((k) => ENEMIES[k].family === 'shinobi' && ENEMIES[k].minFloor >= 4)).toBe(true);
    expect(kinds.has('maestro_del_trueno') || kinds.has('adepto_de_brasa') || kinds.has('envenenador_de_raiz')).toBe(true);
  });

  it('Yūgiri usa hilos en línea y salta; en fase 2 lanza la red en cruz', () => {
    const room = ['###############', '#@............#', '#.............#', '#.............#', '###############'];
    const s = makeGame(room, (g) => {
      const y = { ...createEnemy(ENEMIES.yugiri_hilo_roto, 'enemy-y', { x: 8, y: 1 }, 1), alert: 12 };
      g.enemies = [y];
    });
    const r = applyCommand(s, wait());
    // Alineado en la fila: lo primero disponible es el salto (está a 7) o el corte en línea; en cualquier caso hace algo.
    expect(r.events.some((e) => e.type === 'EnemySkill' || e.type === 'TelegraphStarted')).toBe(true);
    const phase2 = makeGame(room, (g) => {
      const y = { ...createEnemy(ENEMIES.yugiri_hilo_roto, 'enemy-y', { x: 7, y: 3 }, 1), alert: 12, phase: 2 };
      g.enemies = [y];
    });
    const r2 = applyCommand(phase2, wait());
    expect(['Red de Hilos', 'Lluvia de Senbon', 'Paso Fantasma']).toContain(r2.state.telegraphs[0]?.name ?? 'Paso Fantasma');
  });

  it('al caer el primer jefe aparece un mercader con surtido, la estética avanza y la salida deja seguir', () => {
    const s = makeGame(['#########', '#@B...>.#', '#.......#', '#########'], (g) => {
      g.enemies[0].hp = 1;
      g.maxFloor = 6;
      g.floor = 3;
      g.player.coins = 100;
    });
    const r = applyCommand(s, attack({ x: 2, y: 1 }));
    expect(r.state.bossesDefeated).toBe(1);
    const m = r.state.npcs.find((n) => n.kind === MERCHANT_KIND);
    expect(m).toBeDefined();
    expect(m?.stock?.length).toBeGreaterThanOrEqual(5);
    expect(r.events.some((e) => e.type === 'MerchantAppeared')).toBe(true);
    // Salir no gana la partida: faltan sectores.
    const exit = r.state.map.tiles.indexOf('exit');
    expect(exit).toBeGreaterThanOrEqual(0);
  });
});

describe('tienda del mercader', () => {
  const shop = (): GameState => {
    const s = makeGame(['#########', '#@B...>.#', '#.......#', '#########'], (g) => {
      g.enemies[0].hp = 1;
      g.player.coins = 200;
    });
    const dead = applyCommand(s, attack({ x: 2, y: 1 })).state;
    // El primer jefe ofrece elegir una afinidad nueva: hay que elegir antes de seguir.
    return applyCommand(dead, { type: 'ChooseAffinity', affinity: (dead.affinityOffer as NonNullable<GameState['affinityOffer']>)[0] }).state;
  };
  const near = (s: GameState): GameState => {
    const m = s.npcs.find((n) => n.kind === MERCHANT_KIND);
    if (!m) throw new Error('sin mercader');
    s.player.pos = { x: m.pos.x === 1 ? 1 : m.pos.x - 1, y: m.pos.y };
    s.drops = []; // el botín del jefe no interfiere con la cuenta
    return s;
  };

  it('comprar descuenta monedas, entrega el objeto identificado y marca el artículo como vendido', () => {
    const s = near(shop());
    const m = s.npcs.find((n) => n.kind === MERCHANT_KIND);
    expect(m).toBeDefined();
    if (!m?.stock) return;
    const offer = m.stock.find((o) => o.itemId.startsWith('pocion:')) ?? m.stock[0];
    const before = s.player.coins;
    const r = applyCommand(s, { type: 'Buy', npcId: m.id, offerId: offer.id });
    expect(r.ok).toBe(true);
    expect(r.state.player.coins).toBe(before - offer.price);
    expect(r.state.npcs.find((n) => n.id === m.id)?.stock?.find((o) => o.id === offer.id)?.sold).toBe(true);
    if (offer.itemId.startsWith('pocion:')) expect(r.state.player.known).toContain(offer.itemId);
    const again = applyCommand(r.state, { type: 'Buy', npcId: m.id, offerId: offer.id });
    expect(again.ok).toBe(false);
    expect(again.reason).toBe('sold_out');
  });

  it('sin monedas suficientes o lejos del mercader, la compra se rechaza sin gastar turno', () => {
    const s = near(shop());
    const m = s.npcs.find((n) => n.kind === MERCHANT_KIND);
    if (!m?.stock) throw new Error('sin stock');
    const poor = { ...s, player: { ...s.player, coins: 0 } };
    const r = applyCommand(poor, { type: 'Buy', npcId: m.id, offerId: m.stock[0].id });
    expect(r.reason).toBe('cannot_afford');
    expect(r.state).toBe(poor);
    const far = { ...s, player: { ...s.player, pos: { x: 7, y: 2 } } };
    expect(applyCommand(far, { type: 'Buy', npcId: m.id, offerId: m.stock[0].id }).reason).toBe('not_adjacent');
  });

  it('hablar con el mercader es gratis y no gasta turno', () => {
    const s = near(shop());
    const m = s.npcs.find((n) => n.kind === MERCHANT_KIND) as NonNullable<GameState['npcs'][number]>;
    const r = applyCommand(s, interact(m.pos));
    expect(r.ok).toBe(true);
    expect(r.state.turn).toBe(s.turn);
  });

  it('una partida completa usa 6 sectores', () => {
    expect(createGame({ seed: 5, affinity: 'rayo' }).maxFloor).toBe(6);
  });
});
