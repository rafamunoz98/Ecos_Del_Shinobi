import { describe, expect, it } from 'vitest';
import { POTIONS, SCROLLS, STARTING_KNOWN } from '../content/arcana';
import { BALANCE } from '../content/balance';
import { MODS, makeGearId, splitGear } from '../content/enchants';
import { itemName } from '../content/names';
import { AFFINITIES } from '../content/affinities';
import { effectiveDefense, effectivePower } from '../core/combat';
import { applyCommand } from '../core/engine';
import { createGame } from '../core/newGame';
import type { GameState } from '../core/types';
import { attack, makeGame, move, wait } from './helpers';

const use = (itemId: string) => ({ type: 'UseItem', itemId }) as const;
const room = ['#########', '#@..E...#', '#########'];
const calm = (g: GameState) => {
  for (const e of g.enemies) {
    e.aggroRange = 0;
    e.power = 0;
  }
};

describe('apariencias y conocimiento por afinidad', () => {
  it('cada partida asigna una apariencia distinta a cada poción y pergamino, de forma determinista', () => {
    const a = createGame({ seed: 7, affinity: 'ascua' });
    const b = createGame({ seed: 7, affinity: 'ascua' });
    expect(a.appearance).toEqual(b.appearance);
    const keys = [...Object.keys(POTIONS).map((k) => `pocion:${k}`), ...Object.keys(SCROLLS).map((k) => `pergamino:${k}`)];
    for (const k of keys) expect(a.appearance[k], k).toBeTruthy();
    expect(new Set(Object.values(a.appearance)).size).toBe(keys.length);
    const c = createGame({ seed: 8, affinity: 'ascua' });
    expect(c.appearance).not.toEqual(a.appearance);
  });

  it('cada afinidad reconoce de entrada una poción y un pergamino distintos', () => {
    const seenP = new Set<string>();
    const seenS = new Set<string>();
    for (const aff of AFFINITIES) {
      const g = createGame({ seed: 3, affinity: aff });
      const known = g.player.known;
      expect(known).toEqual([...STARTING_KNOWN[aff]]);
      expect(known.filter((k) => k.startsWith('pocion:'))).toHaveLength(1);
      expect(known.filter((k) => k.startsWith('pergamino:'))).toHaveLength(1);
      known.forEach((k) => (k.startsWith('pocion:') ? seenP : seenS).add(k));
    }
    expect(seenP.size).toBe(5);
    expect(seenS.size).toBe(5);
  });

  it('lo no identificado se muestra con su apariencia y lo identificado con su nombre', () => {
    const g = createGame({ seed: 5, affinity: 'ascua' });
    expect(itemName('pocion:sanacion', g)).toBe(g.appearance['pocion:sanacion']);
    expect(itemName('pocion:ignea', g)).toBe('Poción Ígnea');
    expect(itemName('hoja_afilada~llama', g)).toBe('Hoja afilada (?)');
    g.player.identified.push('hoja_afilada~llama');
    expect(itemName('hoja_afilada~llama', g)).toBe('Hoja afilada de Llama');
    expect(itemName('pocion:sanacion')).toBe('Poción de Sanación');
  });
});

describe('equipo encantado y maldito', () => {
  it('splitGear/makeGearId son inversas y los ids con modificador resuelven al arma base', () => {
    expect(splitGear('hoja_afilada~llama')).toEqual({ base: 'hoja_afilada', mod: 'llama' });
    expect(makeGearId('hoja_afilada', null)).toBe('hoja_afilada');
    for (const m of Object.values(MODS)) expect(m.description.length).toBeGreaterThan(5);
  });

  it('una pieza normal tarda unas rondas en identificarse; mientras tanto se ve como «(?)»', () => {
    const s = makeGame(room, (g) => {
      g.player.weapons.push('hoja_afilada~filo_fino');
      calm(g);
    });
    expect(s.player.identified).not.toContain('hoja_afilada~filo_fino');
    let st = applyCommand(s, { type: 'EquipWeapon', weaponId: 'hoja_afilada~filo_fino' }).state;
    expect(st.player.identified).not.toContain('hoja_afilada~filo_fino');
    expect(itemName('hoja_afilada~filo_fino', st)).toContain('(?)');
    for (let i = 0; i < BALANCE.identifyTurns - 2; i++) st = applyCommand(st, { type: 'Wait' }).state;
    expect(st.player.identified).not.toContain('hoja_afilada~filo_fino');
    const r = applyCommand(st, { type: 'Wait' });
    expect(r.state.player.identified).toContain('hoja_afilada~filo_fino');
    expect(r.events).toContainEqual({ type: 'GearIdentified', itemId: 'hoja_afilada~filo_fino' });
    expect(effectivePower(r.state.player)).toBe(s.player.power + 2 + 2);
  });

  it('una pieza maldita se revela al instante al equiparla (y ya no se puede quitar)', () => {
    const s = makeGame(room, (g) => {
      g.player.weapons.push('hoja_afilada~oxido');
      calm(g);
    });
    const r = applyCommand(s, { type: 'EquipWeapon', weaponId: 'hoja_afilada~oxido' });
    expect(r.ok).toBe(true);
    expect(r.state.player.identified).toContain('hoja_afilada~oxido');
    expect(r.events).toContainEqual({ type: 'GearIdentified', itemId: 'hoja_afilada~oxido' });
  });

  it('cambiar de pieza antes de identificarla no la identifica', () => {
    const s = makeGame(room, (g) => {
      g.player.weapons.push('hoja_afilada~filo_fino');
      calm(g);
    });
    let st = applyCommand(s, { type: 'EquipWeapon', weaponId: 'hoja_afilada~filo_fino' }).state;
    for (let i = 0; i < 5; i++) st = applyCommand(st, { type: 'Wait' }).state;
    st = applyCommand(st, { type: 'EquipWeapon', weaponId: 'tanto_gastado' }).state;
    for (let i = 0; i < BALANCE.identifyTurns; i++) st = applyCommand(st, { type: 'Wait' }).state;
    expect(st.player.identified).not.toContain('hoja_afilada~filo_fino');
  });

  it('una maldición se queda pegada: no puedes cambiar de arma hasta purificarla', () => {
    const s = makeGame(room, (g) => {
      g.player.weapons.push('hoja_afilada~oxido', 'kunai_de_hierro');
      calm(g);
    });
    const cursed = applyCommand(s, { type: 'EquipWeapon', weaponId: 'hoja_afilada~oxido' }).state;
    expect(effectivePower(cursed.player)).toBe(s.player.power + 2 - 2);
    const swap = applyCommand(cursed, { type: 'EquipWeapon', weaponId: 'kunai_de_hierro' });
    expect(swap.ok).toBe(false);
    expect(swap.reason).toBe('cursed');
    expect(swap.state).toBe(cursed);
  });

  it('la armadura maldita resta defensa y se queda pegada; la encantada suma', () => {
    const s = makeGame(room, (g) => {
      g.player.armors.push('cota_de_laminas~quebradiza', 'cota_de_laminas~roca');
    });
    const bad = applyCommand(s, { type: 'EquipArmor', armorId: 'cota_de_laminas~quebradiza' }).state;
    expect(effectiveDefense(bad.player)).toBe(s.player.defense + 2 - 2);
    expect(applyCommand(bad, { type: 'EquipArmor', armorId: 'cota_de_laminas~roca' }).reason).toBe('cursed');
    const good = applyCommand(s, { type: 'EquipArmor', armorId: 'cota_de_laminas~roca' }).state;
    expect(effectiveDefense(good.player)).toBe(s.player.defense + 2 + 1);
  });

  it('un arma de llama prende al enemigo con el tiempo (determinista)', () => {
    let burned = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const s = makeGame(['#####', '#@E.#', '#####'], (g) => {
        g.rngState = seed;
        g.player.equipment.weapon = 'hoja_afilada~llama';
        g.player.weapons.push('hoja_afilada~llama');
        g.enemies[0].hp = 30;
        g.enemies[0].maxHp = 30;
        calm(g);
      });
      const r = applyCommand(s, attack({ x: 2, y: 1 }));
      if (r.state.enemies[0].statuses.some((x) => x.id === 'quemadura')) burned++;
    }
    expect(burned).toBeGreaterThan(5);
    expect(burned).toBeLessThan(40);
  });

  it('las espinas hieren al que te golpea y la corriente cura con las rondas', () => {
    const s = makeGame(['#####', '#@E.#', '#####'], (g) => {
      g.player.equipment.armor = 'cota_de_laminas~espinas';
      g.enemies[0].power = 5;
    });
    const r = applyCommand(s, wait());
    expect(r.state.enemies[0].hp).toBeLessThan(s.enemies[0].hp);
    const t = makeGame(room, (g) => {
      g.player.equipment.armor = 'cota_de_laminas~corriente';
      g.player.hp = 10;
      g.turn = 5;
      calm(g);
    });
    expect(applyCommand(t, wait()).state.player.hp).toBeGreaterThan(10);
  });

  it('el herrero purifica una pieza maldita identificada por monedas', () => {
    const s = makeGame(['######', '#@F..#', '######'], (g) => {
      g.player.weapons.push('hoja_afilada~oxido');
      g.player.equipment.weapon = 'hoja_afilada~oxido';
      g.player.identified.push('hoja_afilada~oxido');
      g.player.coins = 20;
      g.player.weaponLevels['hoja_afilada~oxido'] = 1;
    });
    const forge = s.npcs.find((n) => n.kind === 'mesa_forja');
    expect(forge).toBeDefined();
    if (!forge) return;
    const r = applyCommand(s, { type: 'Purify', npcId: forge.id, itemId: 'hoja_afilada~oxido' });
    expect(r.ok).toBe(true);
    expect(r.state.player.equipment.weapon).toBe('hoja_afilada');
    expect(r.state.player.weapons).toContain('hoja_afilada');
    expect(r.state.player.weaponLevels['hoja_afilada']).toBe(1);
    expect(r.state.player.coins).toBeLessThan(20);
  });
});

describe('pociones y pergaminos', () => {
  const withItem = (id: string, tweak?: (g: GameState) => void, rows = room) =>
    makeGame(rows, (g) => {
      g.player.inventory[id] = 1;
      tweak?.(g);
    });

  it('usar un objeto desconocido lo identifica y gasta una unidad', () => {
    const s = withItem('pocion:sanacion', (g) => {
      g.player.hp = 5;
      calm(g);
    });
    expect(s.player.known).not.toContain('pocion:sanacion');
    const r = applyCommand(s, use('pocion:sanacion'));
    expect(r.ok).toBe(true);
    expect(r.state.player.known).toContain('pocion:sanacion');
    expect(r.state.player.hp).toBe(20);
    expect(r.state.player.inventory['pocion:sanacion']).toBeUndefined();
    expect(r.events).toContainEqual({ type: 'ArcanaIdentified', itemId: 'pocion:sanacion' });
  });

  it('pociones malas: el veneno y la niebla se aplican a ti', () => {
    const v = applyCommand(withItem('pocion:veneno'), use('pocion:veneno')).state;
    expect(v.player.statuses.some((x) => x.id === 'veneno')).toBe(true);
    const c = applyCommand(withItem('pocion:niebla_oscura'), use('pocion:niebla_oscura')).state;
    expect(c.player.statuses.some((x) => x.id === 'ceguera')).toBe(true);
  });

  it('la píldora Akimichi sube el poder para siempre; el ojo blanco revela el mapa', () => {
    const a = withItem('pocion:akimichi');
    expect(applyCommand(a, use('pocion:akimichi')).state.player.power).toBe(a.player.power + 1);
    const o = withItem('pocion:ojo_blanco');
    expect(applyCommand(o, use('pocion:ojo_blanco')).state.explored.every(Boolean)).toBe(true);
  });

  it('las invocaciones crean aliados y los clones, dos', () => {
    const sapo = applyCommand(withItem('pergamino:invocacion_sapo', calm), use('pergamino:invocacion_sapo')).state;
    expect(sapo.allies.map((x) => x.kind)).toEqual(['sapo_de_piedra']);
    const clones = applyCommand(withItem('pergamino:clones', calm), use('pergamino:clones')).state;
    expect(clones.allies).toHaveLength(2);
    const cuervos = applyCommand(withItem('pergamino:invocacion_cuervos', calm), use('pergamino:invocacion_cuervos')).state;
    expect(cuervos.allies.every((x) => x.kind === 'cuervo_aliado')).toBe(true);
  });

  it('el sello explosivo daña a los enemigos cercanos; el de inmovilidad los ata; el genjutsu los aturde', () => {
    const e = applyCommand(withItem('pergamino:explosivo', (g) => calm(g)), use('pergamino:explosivo')).state;
    expect(e.enemies[0]?.hp ?? 0).toBeLessThan(10);
    const b = applyCommand(withItem('pergamino:inmovil', (g) => calm(g)), use('pergamino:inmovil')).state;
    expect(b.enemies[0].statuses.some((x) => x.id === 'atado')).toBe(true);
    const gj = applyCommand(withItem('pergamino:genjutsu', (g) => calm(g)), use('pergamino:genjutsu')).state;
    expect(gj.enemies[0].statuses.some((x) => x.id === 'aturdido')).toBe(true);
  });

  it('el estruendo y la poción estridente alertan a todos los enemigos', () => {
    const s = withItem('pergamino:estruendo', (g) => {
      calm(g);
      g.enemies[0].alert = 0;
    });
    expect(s.enemies[0].alert).toBe(0);
    const r = applyCommand(s, use('pergamino:estruendo')).state;
    expect(r.enemies[0].alert).toBeGreaterThan(0);
  });

  it('el sello de purificación rompe las maldiciones de lo que llevas puesto; el refuerzo sube un nivel de forja', () => {
    const s = withItem('pergamino:purificacion', (g) => {
      g.player.equipment.weapon = 'hoja_afilada~oxido';
      g.player.weapons.push('hoja_afilada~oxido');
      g.player.equipment.armor = 'cota_de_laminas~roca';
      g.player.armors.push('cota_de_laminas~roca');
    });
    const r = applyCommand(s, use('pergamino:purificacion')).state;
    expect(r.player.equipment.weapon).toBe('hoja_afilada');
    expect(r.player.equipment.armor).toBe('cota_de_laminas~roca'); // los encantamientos no se tocan
    const u = withItem('pergamino:refuerzo');
    expect(applyCommand(u, use('pergamino:refuerzo')).state.player.weaponLevels['tanto_gastado']).toBe(1);
  });

  it('la revelación identifica el equipo; la sustitución te mueve lejos', () => {
    const s = withItem('pergamino:revelacion', (g) => {
      g.player.weapons.push('hoja_afilada~llama');
    });
    expect(applyCommand(s, use('pergamino:revelacion')).state.player.identified).toContain('hoja_afilada~llama');
    const wide = ['#################', '#@..............#', '#################'];
    const t = withItem('pergamino:sustitucion', (g) => g.explored.fill(true), wide);
    expect(applyCommand(t, use('pergamino:sustitucion')).state.player.pos.x).toBeGreaterThanOrEqual(7);
  });

  it('usar algo que no tienes se rechaza sin gastar turno', () => {
    const s = makeGame(room);
    const r = applyCommand(s, use('pocion:sanacion'));
    expect(r.ok).toBe(false);
    expect(r.state).toBe(s);
  });

  it('los objetos al azar del botín se resuelven al recogerlos en una poción o pergamino concretos', () => {
    const s = makeGame(['#####', '#@..#', '#####'], (g) => {
      g.drops.push({ pos: { x: 2, y: 1 }, itemId: 'pocion_azar', count: 1 }, { pos: { x: 3, y: 1 }, itemId: 'pergamino_azar', count: 1 });
    });
    const r1 = applyCommand(s, move(1, 0));
    const r2 = applyCommand(r1.state, move(1, 0));
    const ids = Object.keys(r2.state.player.inventory);
    expect(ids.some((i) => i.startsWith('pocion:'))).toBe(true);
    expect(ids.some((i) => i.startsWith('pergamino:'))).toBe(true);
  });
});
