import { describe, expect, it } from 'vitest';
import { AFFINITIES, AFFINITY_BEATS, ADVANTAGE, RESISTANCE, affinityFactor, beats, companionAffinityFor, scaleDamage, strongVs, weakTo } from '../content/affinities';
import { ALWAYS_KNOWN, POTIONS } from '../content/arcana';
import { BALANCE } from '../content/balance';
import { ENEMIES } from '../content/enemies';
import { FISTS_ID, WEAPONS } from '../content/weapons';
import { canWield, effectivePower, weaponReq } from '../core/combat';
import { applyCommand, previewAttack, previewThrow } from '../core/engine';
import { enemySees } from '../core/sight';
import { createGame } from '../core/newGame';
import type { Affinity, Command, GameState, Vec } from '../core/types';
import { BOSS_FLOORS } from '../content/enemies';
import { distancesFrom, generateLevel, strengthFloorOfPhase } from '../dungeon/generator';
import { attack, makeGame, wait } from './helpers';

const equip = (weaponId: string): Command => ({ type: 'EquipWeapon', weaponId });
const throwItem = (itemId: string, target: Vec): Command => ({ type: 'Throw', itemId, target });
const calm = (g: GameState) => {
  for (const e of g.enemies) {
    e.aggroRange = 0;
    e.power = 0;
  }
};

describe('fuerza, puños y requisitos de arma', () => {
  it('se empieza a puños, con Fuerza 3 y sin armas; los puños pegan lo mismo que el poder base', () => {
    const g = createGame({ seed: 3, affinity: 'rayo' });
    expect(g.player.weapons).toEqual([]);
    expect(g.player.equipment.weapon).toBeNull();
    expect(g.player.strength).toBe(BALANCE.player.strength);
    expect(effectivePower(g.player)).toBe(g.player.power);
    const s = makeGame(['####', '#@E#', '####'], (t) => calm(t));
    expect(previewAttack(s, { x: 2, y: 1 }).valid).toBe(true);
    const r = applyCommand(s, attack({ x: 2, y: 1 }));
    expect(r.state.enemies[0].hp).toBe(s.enemies[0].hp - s.player.power);
  });

  it('un arma exige Fuerza: sin ella no se puede equipar y no gasta turno', () => {
    const s = makeGame(['#####', '#@..#', '#####'], (g) => {
      g.player.weapons = ['hoja_afilada', 'kunai_de_hierro'];
    });
    expect(WEAPONS.hoja_afilada.req).toBe(4);
    expect(canWield(s.player, 'hoja_afilada')).toBe(false);
    const heavy = applyCommand(s, equip('hoja_afilada'));
    expect(heavy.ok).toBe(false);
    expect(heavy.reason).toBe('too_weak');
    expect(heavy.state).toBe(s);
    const light = applyCommand(s, equip('kunai_de_hierro'));
    expect(light.ok).toBe(true);
    expect(light.state.player.equipment.weapon).toBe('kunai_de_hierro');
  });

  it('la Poción de Fuerza y las mejoras de forja bajan el listón', () => {
    const s = makeGame(['#####', '#@..#', '#####'], (g) => {
      g.player.weapons = ['hoja_afilada', 'hoja_de_ceniza'];
    });
    expect(weaponReq(s.player, 'hoja_de_ceniza')).toBe(5);
    s.player.weaponLevels.hoja_de_ceniza = 2; // dos mejoras: exige 3
    expect(weaponReq(s.player, 'hoja_de_ceniza')).toBe(3);
    expect(applyCommand(s, equip('hoja_de_ceniza')).ok).toBe(true);
    s.player.weaponLevels.hoja_de_ceniza = 3;
    s.player.weaponLevels.hoja_afilada = 3;
    expect(weaponReq(s.player, 'hoja_afilada')).toBe(1); // nunca menos de 1
    const drink = makeGame(['#####', '#@..#', '#####'], (g) => {
      g.player.weapons = ['hoja_afilada'];
      g.player.inventory['pocion:fuerza'] = 1;
    });
    expect(applyCommand(drink, equip('hoja_afilada')).reason).toBe('too_weak');
    const after = applyCommand(drink, { type: 'UseItem', itemId: 'pocion:fuerza' }).state;
    expect(after.player.strength).toBe(BALANCE.player.strength + 1);
    expect(applyCommand(after, equip('hoja_afilada')).ok).toBe(true);
  });

  it('se puede volver a los puños, salvo con un arma maldita', () => {
    const s = makeGame(['#####', '#@..#', '#####'], (g) => {
      g.player.weapons = ['kunai_de_hierro'];
      g.player.equipment.weapon = 'kunai_de_hierro';
    });
    expect(applyCommand(s, equip(FISTS_ID)).state.player.equipment.weapon).toBeNull();
    expect(applyCommand(applyCommand(s, equip(FISTS_ID)).state, equip(FISTS_ID)).reason).toBe('already_equipped');
    const cursed = makeGame(['#####', '#@..#', '#####'], (g) => {
      g.player.weapons = ['kunai_de_hierro~oxido'];
      g.player.equipment.weapon = 'kunai_de_hierro~oxido';
    });
    expect(applyCommand(cursed, equip(FISTS_ID)).reason).toBe('cursed');
  });

  it('la Poción de Fuerza se conoce de entrada y no sale al azar', () => {
    expect(ALWAYS_KNOWN).toContain('pocion:fuerza');
    for (const a of AFFINITIES) expect(createGame({ seed: 1, affinity: a }).player.known).toContain('pocion:fuerza');
    expect(POTIONS.fuerza.weight).toBe(0);
  });

  it('cada fase asegura UNA Poción de Fuerza en un sector sin jefe, alcanzable y antes del jefe', () => {
    for (let seed = 1; seed <= 40; seed++) {
      for (const [lo, hi] of [
        [1, 2],
        [4, 5],
      ]) {
        const floors = [];
        for (let f = lo; f <= hi; f++) {
          const lvl = generateLevel({ seed, floor: f, boss: false });
          const n = lvl.drops.filter((d) => d.itemId === 'pocion:fuerza').length;
          if (n > 0) floors.push(f);
          if (n > 0) {
            const dist = distancesFrom(lvl.map, lvl.playerStart);
            for (const d of lvl.drops.filter((x) => x.itemId === 'pocion:fuerza')) expect(dist[d.pos.y * lvl.map.width + d.pos.x], `semilla ${seed}`).toBeGreaterThan(0);
          }
        }
        expect(floors, `semilla ${seed} fase ${lo}-${hi}`).toEqual([strengthFloorOfPhase(seed, lo)]);
      }
      for (const b of BOSS_FLOORS) {
        expect(generateLevel({ seed, floor: b, boss: true }).drops.some((d) => d.itemId === 'pocion:fuerza')).toBe(false);
      }
    }
  });
});

describe('pociones arrojables', () => {
  const lineRoom = ['###########', '#@.....E..#', '###########'];
  const withPotion = (id: string, extra?: (g: GameState) => void) =>
    makeGame(lineRoom, (g) => {
      g.player.inventory[id] = 2;
      g.enemies[0].alert = 0;
      extra?.(g);
    });

  it('una Poción Ígnea lanzada prende al enemigo, se identifica y no te quema si estás lejos', () => {
    const s = withPotion('pocion:ignea', (g) => (g.player.known = g.player.known.filter((k) => k !== 'pocion:ignea')));
    const r = applyCommand(s, throwItem('pocion:ignea', { x: 6, y: 1 }));
    expect(r.ok).toBe(true);
    expect(r.state.player.inventory['pocion:ignea']).toBe(1);
    expect(r.state.enemies[0].statuses.some((x) => x.id === 'quemadura')).toBe(true);
    expect(r.state.player.statuses.some((x) => x.id === 'quemadura')).toBe(false);
    expect(r.state.player.known).toContain('pocion:ignea');
    expect(r.events).toContainEqual({ type: 'ItemThrown', itemId: 'pocion:ignea', from: { x: 1, y: 1 }, to: { x: 6, y: 1 }, hit: false });
    expect(r.state.enemies[0].alert).toBeGreaterThan(0); // sabe de ti
  });

  it('si el frasco cae pegado a ti, las salpicaduras te alcanzan también', () => {
    const s = makeGame(['#####', '#@E.#', '#####'], (g) => {
      g.player.inventory['pocion:ignea'] = 1;
      calm(g);
    });
    const r = applyCommand(s, throwItem('pocion:ignea', { x: 2, y: 1 }));
    expect(r.state.player.statuses.some((x) => x.id === 'quemadura')).toBe(true);
    expect(r.state.enemies[0].statuses.some((x) => x.id === 'quemadura')).toBe(true);
  });

  it('la Poción de Hiel envenena y la de Niebla Oscura ciega: un enemigo ciego no te ve a distancia', () => {
    const v = applyCommand(withPotion('pocion:veneno'), throwItem('pocion:veneno', { x: 6, y: 1 }));
    expect(v.state.enemies[0].statuses.find((x) => x.id === 'veneno')?.turns).toBeGreaterThan(0);
    const n = applyCommand(withPotion('pocion:niebla_oscura', (g) => (g.enemies[0].aggroRange = 20)), throwItem('pocion:niebla_oscura', { x: 6, y: 1 }));
    const blind = n.state.enemies[0];
    expect(blind.statuses.some((x) => x.id === 'ceguera')).toBe(true);
    expect(enemySees(n.state, blind)).toBe(false);
  });

  it('la Poción Estridente lanzada atrae a los enemigos hacia donde cae (no hacia ti)', () => {
    const s = makeGame(['###########', '#@........#', '#.........#', '#######E###'], (g) => {
      g.player.inventory['pocion:estridente'] = 1;
      g.enemies[0].alert = 0;
    });
    const r = applyCommand(s, throwItem('pocion:estridente', { x: 5, y: 1 }));
    expect(r.state.enemies[0].alert).toBeGreaterThan(0);
    expect(r.state.enemies[0].lastSeen).toEqual({ x: 5, y: 1 });
  });

  it('una poción buena lanzada se desperdicia y sigue sin identificar', () => {
    const s = withPotion('pocion:sanacion', (g) => (g.player.known = g.player.known.filter((k) => k !== 'pocion:sanacion')));
    s.player.hp = 5;
    const r = applyCommand(s, throwItem('pocion:sanacion', { x: 6, y: 1 }));
    expect(r.ok).toBe(true);
    expect(r.state.player.hp).toBe(5);
    expect(r.state.player.known).not.toContain('pocion:sanacion');
    expect(r.state.player.inventory['pocion:sanacion']).toBe(1);
  });

  it('se valida el alcance, la existencia y que no se lancen pergaminos', () => {
    const s = withPotion('pocion:ignea');
    expect(applyCommand(s, throwItem('pocion:ignea', { x: 9, y: 1 })).reason).toBe('out_of_range');
    expect(applyCommand(s, throwItem('pocion:veneno', { x: 3, y: 1 })).reason).toBe('no_item');
    s.player.inventory['pergamino:explosivo'] = 1;
    expect(applyCommand(s, throwItem('pergamino:explosivo', { x: 3, y: 1 })).reason).toBe('not_throwable');
    const pv = previewThrow(s, 'pocion:ignea', { x: 4, y: 1 });
    expect(pv.valid).toBe(true);
    expect(pv.area.length).toBeGreaterThan(1);
    expect(previewThrow(s, 'shuriken', { x: 4, y: 1 }).area).toEqual([]);
  });
});

describe('ciclo de afinidades', () => {
  it('cada afinidad vence a una y pierde contra otra: Marea > Ascua > Vendaval > Piedra > Rayo > Marea', () => {
    expect(AFFINITY_BEATS).toEqual({ marea: 'ascua', ascua: 'vendaval', vendaval: 'piedra', piedra: 'rayo', rayo: 'marea' });
    for (const a of AFFINITIES) {
      expect(beats(a, strongVs(a))).toBe(true);
      expect(beats(weakTo(a), a)).toBe(true);
      expect(new Set(AFFINITIES.map((x) => strongVs(x))).size).toBe(5);
    }
  });

  it('el compañero cubre la debilidad: vence a la afinidad que vence a la tuya', () => {
    const expected: Record<Affinity, Affinity> = { ascua: 'rayo', marea: 'piedra', vendaval: 'marea', piedra: 'ascua', rayo: 'vendaval' };
    for (const a of AFFINITIES) {
      expect(companionAffinityFor(a)).toBe(expected[a]);
      expect(beats(companionAffinityFor(a), weakTo(a))).toBe(true);
      expect(companionAffinityFor(a)).not.toBe(a);
    }
  });

  it('el multiplicador: ×1,5 al vencer, ×0,75 al perder, neutral en el resto; las fusiones cogen lo mejor', () => {
    expect(affinityFactor(['marea'], 'ascua')).toBe(ADVANTAGE);
    expect(affinityFactor(['ascua'], 'marea')).toBe(RESISTANCE);
    expect(affinityFactor(['ascua'], 'piedra')).toBe(1);
    expect(affinityFactor(['ascua'], null)).toBe(1);
    expect(affinityFactor([null], 'ascua')).toBe(1);
    expect(affinityFactor(['ascua', 'marea'], 'ascua')).toBe(ADVANTAGE); // una fusión Ascua+Marea vence a Ascua porque Marea la apaga
    expect(affinityFactor(['ascua', 'rayo'], 'vendaval')).toBe(ADVANTAGE);
    expect(affinityFactor(['ascua', 'vendaval'], 'ascua')).toBe(1);
    expect(scaleDamage(10, 1.5)).toBe(15);
    expect(scaleDamage(1, 0.75)).toBe(1);
  });

  it('todos los enemigos tienen afinidad y reparten las cinco', () => {
    const seen = new Set<Affinity>();
    for (const e of Object.values(ENEMIES)) {
      if (e.family === 'echo') continue;
      expect(e.affinity, e.id).toBeTruthy();
      seen.add(e.affinity as Affinity);
    }
    expect(seen.size).toBe(5);
  });

  it('una técnica hace ×1,5 al enemigo de la afinidad que vence y ×0,75 al que la vence', () => {
    const run = (enemyAff: Affinity | null) => {
      const s = makeGame(['########', '#@.E...#', '########'], (g) => {
        g.player.techniques = ['aguja_de_agua'];
        g.enemies[0].affinity = enemyAff;
        g.enemies[0].aggroRange = 0;
        g.enemies[0].power = 0;
        g.enemies[0].maxHp = g.enemies[0].hp = 40;
      }, { affinity: 'marea' });
      return applyCommand(s, { type: 'UseTechnique', techniqueId: 'aguja_de_agua', target: { x: 3, y: 1 } });
    };
    const neutral = 40 - run(null).state.enemies[0].hp;
    const strong = run('ascua');
    const weak = run('rayo');
    expect(neutral).toBe(4); // poder 4 ignorando defensa
    expect(40 - strong.state.enemies[0].hp).toBe(scaleDamage(neutral, ADVANTAGE));
    expect(40 - weak.state.enemies[0].hp).toBe(scaleDamage(neutral, RESISTANCE));
    expect(strong.events.find((e) => e.type === 'DamageApplied' && e.targetId !== 'player')).toMatchObject({ mult: ADVANTAGE });
    expect(strong.state.log.join(' ')).toContain('débil');
  });

  it('el enemigo de la afinidad que vence a la tuya te hace ×1,5; si tú vences a la suya, ×0,75', () => {
    const run = (enemyAff: Affinity | null) => {
      const s = makeGame(['####', '#@E#', '####'], (g) => {
        g.enemies[0].affinity = enemyAff;
        g.enemies[0].alert = 12;
        g.enemies[0].power = 8;
      }, { affinity: 'ascua' });
      return applyCommand(s, wait());
    };
    const base = 20 - run(null).state.player.hp;
    expect(base).toBeGreaterThan(2);
    expect(20 - run('marea').state.player.hp).toBe(scaleDamage(base, ADVANTAGE)); // Marea apaga a Ascua
    expect(20 - run('vendaval').state.player.hp).toBe(scaleDamage(base, RESISTANCE)); // Ascua consume a Vendaval
    expect(20 - run('piedra').state.player.hp).toBe(base);
  });

  it('un arma encantada con una afinidad cuenta como esa afinidad en melé', () => {
    const run = (mod: string, enemyAff: Affinity) => {
      const s = makeGame(['####', '#@E#', '####'], (g) => {
        g.player.weapons = [`kunai_de_hierro~${mod}`];
        g.player.equipment.weapon = `kunai_de_hierro~${mod}`;
        g.player.identified.push(`kunai_de_hierro~${mod}`);
        g.enemies[0].affinity = enemyAff;
        g.enemies[0].aggroRange = 0;
        g.enemies[0].power = 0;
        g.enemies[0].maxHp = g.enemies[0].hp = 40;
        g.rngState = 5;
      });
      return 40 - applyCommand(s, attack({ x: 2, y: 1 })).state.enemies[0].hp;
    };
    // Poder 4 + kunai 1 = 5. «de Marea» pega ×1,5 a un enemigo de Ascua; «de Trueno» (Rayo) no cambia nada contra Ascua.
    expect(run('marea', 'ascua')).toBe(scaleDamage(5, ADVANTAGE));
    expect(run('trueno', 'ascua')).toBe(5);
  });
});
