import { describe, expect, it } from 'vitest';
import { BALANCE } from '../content/balance';
import { itemName } from '../content/names';
import { ALL_TRINKET_IDS, CLEAN_SUFFIX, RANDOM_TRINKET, TRINKETS, isCursedTrinket, rollTrinket, trinketAppearances, trinketEffects, wornEffects } from '../content/trinkets';
import { canWield, effectiveDefense, effectivePower, strengthOf } from '../core/combat';
import { applyCommand } from '../core/engine';
import { visionRadiusOf } from '../core/sight';
import { createGame } from '../core/newGame';
import type { Command, GameState } from '../core/types';
import { FORGE_KIND } from '../dungeon/generator';
import { makeGame, wait } from './helpers';

const run = (g: GameState, ...cmds: Command[]): GameState => {
  let s = g;
  for (const c of cmds) {
    const r = applyCommand(s, c);
    expect(r.ok, `${JSON.stringify(c)} → ${r.message ?? ''}`).toBe(true);
    s = r.state;
  }
  return s;
};
const equip = (trinketId: string): Command => ({ type: 'EquipTrinket', trinketId });
const room = ['########', '#@.....#', '########'];
const withTrinkets = (...ids: string[]) =>
  makeGame(room, (s) => {
    s.player.trinkets.push(...ids);
  });

describe('joyas: contenido y aspecto', () => {
  it('hay 8 anillos y 6 colgantes, 5 de ellos malditos, todos con descripción', () => {
    expect(ALL_TRINKET_IDS).toHaveLength(14);
    expect(Object.values(TRINKETS).filter((t) => t.slot === 'ring')).toHaveLength(8);
    expect(Object.values(TRINKETS).filter((t) => t.curse)).toHaveLength(5);
    for (const t of Object.values(TRINKETS)) expect(t.description.length).toBeGreaterThan(10);
  });

  it('cada partida da a cada joya un aspecto distinto (determinista y propio de la semilla)', () => {
    const a = trinketAppearances(7);
    expect(a).toEqual(trinketAppearances(7));
    expect(a).not.toEqual(trinketAppearances(8));
    expect(new Set(Object.values(a)).size).toBe(14);
    const g = createGame({ seed: 7, affinity: 'ascua' });
    expect(g.appearance['trinket:anillo_vigor']).toBe(a['trinket:anillo_vigor']);
  });

  it('el sorteo no repite lo que ya tienes, da ~30 % de malditas y avisa cuando no queda ninguna', () => {
    let cursed = 0;
    for (let i = 0; i < 1000; i++) {
      const id = rollTrinket(i / 1000, []);
      expect(id).not.toBeNull();
      if (isCursedTrinket(id)) cursed++;
    }
    expect(cursed / 1000).toBeGreaterThan(0.25);
    expect(cursed / 1000).toBeLessThan(0.35);
    expect(rollTrinket(0.5, ['anillo_vigor'])).not.toBe('anillo_vigor');
    expect(rollTrinket(0.5, [...ALL_TRINKET_IDS])).toBeNull();
  });
});

describe('joyas: equipar y efectos pasivos', () => {
  it('sin identificar se ve su aspecto con (?): ponértela no la revela, hacen falta muchas rondas (como al resto del equipo)', () => {
    const g = withTrinkets('anillo_vigor');
    expect(itemName('anillo_vigor', g)).toBe(`${g.appearance['trinket:anillo_vigor']} (?)`);
    let s = run(g, equip('anillo_vigor'));
    expect(s.player.equipment.ring).toBe('anillo_vigor');
    expect(s.player.identified).not.toContain('anillo_vigor');
    expect(itemName('anillo_vigor', s)).toContain('(?)');
    // Sus efectos funcionan aunque no sepas qué es: el vigor ya suma vida máxima.
    expect(s.player.maxHp).toBe(g.player.maxHp + 5);
    for (let i = 0; i < BALANCE.identifyTurns - 2; i++) s = run(s, wait()); // ponértela ya fue la primera ronda
    expect(s.player.identified).not.toContain('anillo_vigor');
    s = run(s, wait());
    expect(s.player.identified).toContain('anillo_vigor');
    expect(itemName('anillo_vigor', s)).toBe('Anillo del Vigor');
  });

  it('vida y kiro máximos suben al ponerla y vuelven al quitarla', () => {
    const g = withTrinkets('anillo_vigor');
    const on = run(g, equip('anillo_vigor'));
    expect(on.player.maxHp).toBe(g.player.maxHp + 5);
    expect(on.player.hp).toBe(g.player.hp + 5);
    const off = run(on, { type: 'UnequipTrinket', slot: 'ring' });
    expect(off.player.maxHp).toBe(g.player.maxHp);
    expect(off.player.hp).toBe(g.player.maxHp);
    expect(off.player.equipment.ring).toBeNull();
  });

  it('poder, defensa y Fuerza se suman; con +1 de Fuerza ya se empuña una hoja de requisito 4', () => {
    const g = withTrinkets('anillo_filo', 'anillo_guarda', 'colgante_toro');
    g.player.weapons.push('hoja_afilada');
    expect(canWield(g.player, 'hoja_afilada')).toBe(false);
    const s = run(g, equip('anillo_filo'), equip('colgante_toro'));
    expect(effectivePower(s.player)).toBe(effectivePower(g.player) + 1);
    expect(strengthOf(s.player)).toBe(strengthOf(g.player) + 1);
    expect(canWield(s.player, 'hoja_afilada')).toBe(true);
    const guard = run(g, equip('anillo_guarda'));
    expect(effectiveDefense(guard.player)).toBe(effectiveDefense(g.player) + 1);
  });

  it('un anillo y un colgante a la vez; otro anillo sustituye al anterior', () => {
    const g = withTrinkets('anillo_filo', 'anillo_guarda', 'colgante_luz');
    const s = run(g, equip('anillo_filo'), equip('colgante_luz'), equip('anillo_guarda'));
    expect(s.player.equipment.ring).toBe('anillo_guarda');
    expect(s.player.equipment.pendant).toBe('colgante_luz');
    expect(applyCommand(s, equip('anillo_guarda')).reason).toBe('already_equipped');
    expect(applyCommand(g, equip('anillo_vigor')).reason).toBe('no_item');
  });

  it('Savia regenera vida; el Colgante de Rocío da kiro extra; la Luz amplía la visión', () => {
    const g = withTrinkets('anillo_savia', 'colgante_luz', 'colgante_rocio');
    g.player.hp = 10;
    const s = run(g, equip('anillo_savia'));
    let t = s;
    for (let i = 0; i < 16; i++) t = run(t, wait());
    expect(t.player.hp).toBeGreaterThan(s.player.hp + 1); // regeneración natural + la del anillo
    const light = run(g, equip('colgante_luz'));
    expect(visionRadiusOf(light)).toBe(visionRadiusOf(g) + 1);
    const base = makeGame(room, (x) => {
      x.player.trinkets.push('colgante_rocio');
      x.player.kiro = 0;
    });
    const dew = run(base, equip('colgante_rocio'));
    let a = base;
    let b = dew;
    for (let i = 0; i < BALANCE.kiroRegenEvery * 2; i++) {
      const step: Command = { type: 'Move', dx: i % 2 === 0 ? 1 : -1, dy: 0 }; // moverse no da kiro: solo cuenta la regeneración con el tiempo
      a = run(a, step);
      b = run(b, step);
    }
    expect(b.player.kiro).toBeGreaterThan(a.player.kiro);
  });

  it('el Anillo del Mercader da +50 % de monedas', () => {
    const g = withTrinkets('anillo_mercader');
    g.drops.push({ pos: { x: 2, y: 1 }, itemId: 'moneda', count: 4 });
    const plain = run(g, { type: 'Move', dx: 1, dy: 0 }, { type: 'Move', dx: 1, dy: 0 });
    expect(plain.player.coins).toBe(4);
    const rich = run(run(g, equip('anillo_mercader')), { type: 'Move', dx: 1, dy: 0 }, { type: 'Move', dx: 1, dy: 0 });
    expect(rich.player.coins).toBe(6);
  });

  it('el Colgante de Imán suaviza el golpe del enemigo que te vence por afinidad (×1,25 en vez de ×1,5)', () => {
    const mk = (pendant: boolean): GameState => {
      const g = makeGame(['#####', '#@E.#', '#####'], (s) => {
        s.player.affinity = 'ascua';
        s.player.defense = 0;
        s.enemies[0].affinity = 'marea'; // la marea vence al ascua
        s.enemies[0].power = 8;
        s.enemies[0].alert = 9;
        if (pendant) {
          s.player.trinkets.push('colgante_iman');
          s.player.equipment.pendant = 'colgante_iman';
        }
      });
      return g;
    };
    const lost = (g: GameState): number => g.player.hp - applyCommand(g, wait()).state.player.hp;
    expect(lost(mk(false))).toBe(12); // 8 × 1,5
    expect(lost(mk(true))).toBe(10); // 8 × 1,25
  });
});

describe('joyas malditas', () => {
  it('se quedan pegadas: no puedes quitarlas ni cambiarlas, y avisan de su maldición al ponértelas', () => {
    const g = withTrinkets('anillo_hambre', 'anillo_filo');
    const s = run(g, equip('anillo_hambre'));
    expect(s.log.join('\n')).toContain('maldito');
    expect(applyCommand(s, { type: 'UnequipTrinket', slot: 'ring' }).reason).toBe('cursed');
    expect(applyCommand(s, equip('anillo_filo')).reason).toBe('cursed');
  });

  it('el Anillo del Hambre da +2 de poder y te drena 1 de vida cada 6 rondas, sin matarte', () => {
    const g = withTrinkets('anillo_hambre');
    g.player.hp = 3;
    let s = run(g, equip('anillo_hambre'));
    expect(effectivePower(s.player)).toBe(effectivePower(g.player) + 2);
    for (let i = 0; i < 40; i++) s = run(s, wait());
    expect(s.player.hp).toBeGreaterThanOrEqual(1);
    expect(s.status).toBe('playing');
  });

  it('Anillo Vacío (−3 kiro máx) y Colgante de la Venda (−2 de visión) cuestan lo que dicen', () => {
    const g = withTrinkets('anillo_vacio', 'colgante_venda');
    const s = run(g, equip('anillo_vacio'));
    expect(s.player.maxKiro).toBe(g.player.maxKiro - 3);
    expect(s.player.kiro).toBeLessThanOrEqual(s.player.maxKiro);
    const t = run(g, equip('colgante_venda'));
    expect(t.player.maxKiro).toBe(g.player.maxKiro + 4);
    expect(visionRadiusOf(t)).toBe(Math.max(1, visionRadiusOf(g) - 2));
  });

  it('el Anillo de la Presa hace que cada golpe duela 1 más', () => {
    const mk = (cursed: boolean): GameState =>
      makeGame(['#####', '#@E.#', '#####'], (s) => {
        s.enemies[0].affinity = null;
        s.enemies[0].power = 4;
        s.enemies[0].alert = 9;
        s.player.defense = 0;
        if (cursed) {
          s.player.trinkets.push('anillo_presa');
          s.player.equipment.ring = 'anillo_presa';
          s.player.maxHp += 4;
          s.player.hp += 4;
        }
      });
    const lost = (g: GameState): number => g.player.hp - applyCommand(g, wait()).state.player.hp;
    expect(lost(mk(true))).toBe(lost(mk(false)) + 1);
  });

  it('un Sello de Purificación quita la parte mala y conserva la buena', () => {
    const g = withTrinkets('anillo_vacio');
    g.player.inventory['pergamino:purificacion'] = 1;
    g.player.known.push('pergamino:purificacion');
    const cursed = run(g, equip('anillo_vacio'));
    expect(cursed.player.maxKiro).toBe(g.player.maxKiro - 3);
    const clean = run(cursed, { type: 'UseItem', itemId: 'pergamino:purificacion' });
    expect(clean.player.equipment.ring).toBe(`anillo_vacio${CLEAN_SUFFIX}`);
    expect(clean.player.trinkets).toEqual([`anillo_vacio${CLEAN_SUFFIX}`]);
    expect(clean.player.maxKiro).toBe(g.player.maxKiro);
    expect(trinketEffects(clean.player.equipment.ring).defense).toBe(1);
    expect(isCursedTrinket(clean.player.equipment.ring)).toBe(false);
    expect(run(clean, { type: 'UnequipTrinket', slot: 'ring' }).player.equipment.ring).toBeNull();
  });

  it('la forja también purifica una joya maldita (cuesta monedas)', () => {
    const g = makeGame(['#####', '#@F.#', '#####'], (s) => {
      s.player.trinkets.push('anillo_hambre');
      s.player.identified.push('anillo_hambre');
      s.player.coins = BALANCE.purifyCost;
    });
    const forge = g.npcs.find((n) => n.kind === FORGE_KIND);
    expect(forge).toBeDefined();
    const s = run(g, { type: 'Purify', npcId: forge?.id ?? '', itemId: 'anillo_hambre' });
    expect(s.player.trinkets).toEqual([`anillo_hambre${CLEAN_SUFFIX}`]);
    expect(s.player.coins).toBe(0);
    expect(wornEffects({ ring: `anillo_hambre${CLEAN_SUFFIX}` }).drainEvery).toBeUndefined();
  });
});

describe('joyas: botín', () => {
  it('«joya_azar» se convierte en una joya concreta al recogerla; las repetidas se desmontan', () => {
    const g = makeGame(room);
    g.drops.push({ pos: { x: 2, y: 1 }, itemId: RANDOM_TRINKET, count: 1 });
    const s = run(g, { type: 'Move', dx: 1, dy: 0 }, { type: 'Move', dx: 1, dy: 0 });
    expect(s.player.trinkets).toHaveLength(1);
    const full = makeGame(room, (x) => {
      x.player.trinkets.push(...ALL_TRINKET_IDS);
    });
    full.drops.push({ pos: { x: 2, y: 1 }, itemId: RANDOM_TRINKET, count: 1 });
    const t = run(full, { type: 'Move', dx: 1, dy: 0 }, { type: 'Move', dx: 1, dy: 0 });
    expect(t.player.trinkets).toHaveLength(14);
    expect(t.player.shards).toBe(2);
  });

  it('los cofres (y por tanto las cámaras selladas y ocultas) pueden traer joyas', () => {
    let found = 0;
    for (let seed = 1; seed <= 120; seed++) {
      const g = makeGame(['#####', '#@C.#', '#####'], undefined, { seed });
      const s = applyCommand(g, { type: 'Interact', target: { x: 2, y: 1 } }).state;
      if (s.player.trinkets.length > 0) found++;
    }
    expect(found).toBeGreaterThan(0);
  });
});
