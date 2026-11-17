import { describe, expect, it } from 'vitest';
import { applyCommand, previewAttack, previewThrow } from '../core/engine';
import type { Command, GameState, Vec } from '../core/types';
import { THROWABLES } from '../content/weapons';
import { attack, makeGame, move } from './helpers';

const equip = (id: string) => (g: GameState) => {
  g.player.weapons.push(id);
  g.player.equipment.weapon = id;
};
const throwItem = (itemId: string, target: Vec): Command => ({ type: 'Throw', itemId, target });
const calm = (g: GameState) => {
  for (const e of g.enemies) {
    e.power = 0;
    e.hp = 40;
    e.maxHp = 40;
    e.aggroRange = 0;
  }
};

describe('látigo de cadena', () => {
  const room = ['#########', '#@.E....#', '#########'];
  it('alcanza a 2 casillas en línea recta', () => {
    const s = makeGame(room, (g) => {
      equip('latigo_de_cadena')(g);
      calm(g);
    });
    const r = applyCommand(s, attack({ x: 3, y: 1 }));
    expect(r.ok).toBe(true);
    expect(r.state.enemies[0].hp).toBe(36);
    expect(r.events.some((e) => e.type === 'PlayerAttacked' && e.weaponId === 'latigo_de_cadena')).toBe(true);
  });
  it('no llega a 3, exige línea recta y se detiene en obstáculos', () => {
    const s = makeGame(['#########', '#@..E...#', '#.......#', '#########'], equip('latigo_de_cadena'));
    expect(applyCommand(s, attack({ x: 4, y: 1 })).reason).toBe('out_of_range');
    expect(applyCommand(s, attack({ x: 2, y: 2 })).reason).toBe('not_aligned');
    const chest = makeGame(['#########', '#@CE....#', '#########'], equip('latigo_de_cadena'));
    expect(applyCommand(chest, attack({ x: 3, y: 1 })).reason).toBe('no_target');
  });
  it('golpea solo al primer enemigo de la línea', () => {
    const s = makeGame(['#########', '#@EE....#', '#########'], (g) => {
      equip('latigo_de_cadena')(g);
      calm(g);
    });
    const r = applyCommand(s, attack({ x: 3, y: 1 }));
    expect(r.state.enemies[0].hp).toBe(36);
    expect(r.state.enemies[1].hp).toBe(40);
  });
});

describe('lanza de bambú', () => {
  it('atraviesa: golpea a todos los enemigos de las 2 casillas', () => {
    const s = makeGame(['#########', '#@EE....#', '#########'], (g) => {
      equip('lanza_de_bambu')(g);
      calm(g);
    });
    const r = applyCommand(s, attack({ x: 2, y: 1 }));
    expect(r.state.enemies.map((e) => e.hp)).toEqual([35, 35]); // poder 4 + 1
  });
});

describe('equipar armas', () => {
  it('cambia el arma, gasta un turno y valida', () => {
    const s = makeGame(['#####', '#@..#', '#####'], (g) => g.player.weapons.push('kunai_de_hierro'));
    const r = applyCommand(s, { type: 'EquipWeapon', weaponId: 'kunai_de_hierro' });
    expect(r.ok).toBe(true);
    expect(r.state.player.equipment.weapon).toBe('kunai_de_hierro');
    expect(r.state.turn).toBe(1);
    expect(applyCommand(r.state, { type: 'EquipWeapon', weaponId: 'kunai_de_hierro' }).reason).toBe('already_equipped');
    expect(applyCommand(s, { type: 'EquipWeapon', weaponId: 'hoja_afilada' }).reason).toBe('no_item');
    expect(applyCommand(s, { type: 'EquipWeapon', weaponId: 'nada' }).reason).toBe('unknown_item');
  });
  it('el arma equipada cambia el daño', () => {
    const s = makeGame(['####', '#@E#', '####'], (g) => {
      equip('hoja_afilada')(g);
      calm(g);
    });
    expect(applyCommand(s, attack({ x: 2, y: 1 })).state.enemies[0].hp).toBe(34);
  });
});

describe('arrojadizas', () => {
  const room = ['###########', '#@...E....#', '###########'];
  it('el shuriken hiere al primer enemigo y gasta una unidad', () => {
    const s = makeGame(room, calm);
    const r = applyCommand(s, throwItem('shuriken', { x: 5, y: 1 }));
    expect(r.ok).toBe(true);
    expect(r.state.enemies[0].hp).toBe(37);
    expect(r.state.player.inventory.shuriken).toBe(4);
    expect(r.events.some((e) => e.type === 'ItemThrown' && e.hit)).toBe(true);
  });
  it('se detiene en el primer enemigo aunque apuntes más allá', () => {
    const s = makeGame(['###########', '#@.E.E....#', '###########'], calm);
    const r = applyCommand(s, throwItem('shuriken', { x: 5, y: 1 }));
    expect(r.state.enemies[0].hp).toBe(37);
    expect(r.state.enemies[1].hp).toBe(40);
  });
  it('el shuriken a veces se recupera del suelo y a veces se pierde; el senbon siempre se gasta', () => {
    let dropped = 0;
    let lost = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const s = makeGame(room, (g) => {
        calm(g);
        g.rngState = seed;
        g.player.inventory.senbon = 3;
      });
      const r = applyCommand(s, throwItem('shuriken', { x: 5, y: 1 }));
      if (r.state.drops.length === 1) {
        dropped++;
        expect(r.state.drops[0]).toEqual({ pos: { x: 5, y: 1 }, itemId: 'shuriken', count: 1 });
      } else lost++;
      const n = applyCommand(s, throwItem('senbon', { x: 5, y: 1 }));
      expect(n.state.drops).toEqual([]);
      expect(n.state.player.inventory.senbon).toBe(2);
    }
    const ratio = dropped / 200;
    expect(ratio).toBeGreaterThan(1 - THROWABLES.shuriken.breakChance - 0.12);
    expect(ratio).toBeLessThan(1 - THROWABLES.shuriken.breakChance + 0.12);
    expect(lost).toBeGreaterThan(0);
  });
  it('se recoge del suelo al pisarlo', () => {
    const s = makeGame(room, (g) => {
      g.enemies = [];
      g.drops.push({ pos: { x: 3, y: 1 }, itemId: 'shuriken', count: 2 });
    });
    let cur = applyCommand(s, move(1, 0)).state;
    expect(cur.player.inventory.shuriken).toBe(5);
    cur = applyCommand(cur, move(1, 0)).state;
    expect(cur.player.inventory.shuriken).toBe(7);
    expect(cur.drops).toEqual([]);
    expect(cur.log.some((l) => l.includes('Recoges 2'))).toBe(true);
  });
  it('si no hay enemigo cae en la casilla elegida o antes de la pared', () => {
    const s = makeGame(['#######', '#@..#.#', '#######'], (g) => {
      g.enemies = [];
      g.rngState = 3;
    });
    const r = applyCommand(s, throwItem('kunai_arrojadizo', { x: 2, y: 1 }));
    expect(r.ok).toBe(false); // no tiene kunai arrojadizo
    const t = makeGame(['#######', '#@..#.#', '#######'], (g) => {
      g.player.inventory.kunai_arrojadizo = 5;
      g.rngState = 3;
    });
    const w = applyCommand(t, throwItem('kunai_arrojadizo', { x: 3, y: 1 }));
    expect(w.ok).toBe(true);
    const ev = w.events.find((e) => e.type === 'ItemThrown');
    expect(ev && ev.type === 'ItemThrown' && ev.to).toEqual({ x: 3, y: 1 });
  });
  it('el senbon ignora la defensa', () => {
    const s = makeGame(room, (g) => {
      calm(g);
      g.enemies[0].defense = 9;
      g.player.inventory.senbon = 1;
    });
    expect(applyCommand(s, throwItem('senbon', { x: 5, y: 1 })).state.enemies[0].hp).toBe(38);
  });
  it('el lanzamiento furtivo duplica el daño', () => {
    const s = makeGame(room, (g) => {
      calm(g);
      g.enemies[0].alert = 0;
    });
    expect(applyCommand(s, throwItem('shuriken', { x: 5, y: 1 })).state.enemies[0].hp).toBe(34);
  });
  it('valida alcance, visión, existencias y tipo', () => {
    const s = makeGame(['###############', '#@............#', '###############']);
    expect(applyCommand(s, throwItem('shuriken', { x: 8, y: 1 })).reason).toBe('out_of_range');
    expect(applyCommand(s, throwItem('tonico_kiro', { x: 3, y: 1 })).reason).toBe('not_throwable');
    expect(applyCommand(s, throwItem('senbon', { x: 3, y: 1 })).reason).toBe('no_item');
    expect(applyCommand(s, throwItem('shuriken', s.player.pos)).reason).toBe('blocked');
    const behind = makeGame(['#########', '#@.b..E.#', '#########']);
    expect(applyCommand(behind, throwItem('shuriken', { x: 5, y: 1 })).reason).toBe('no_line_of_sight');
    const wallNext = makeGame(['####', '#@##', '####']);
    expect(applyCommand(wallNext, throwItem('shuriken', { x: 2, y: 1 })).reason).toBe('blocked');
  });
  it('la vista previa muestra el recorrido y dónde caerá', () => {
    const s = makeGame(room, calm);
    const p = previewThrow(s, 'shuriken', { x: 4, y: 1 });
    expect(p.valid).toBe(true);
    expect(p.landing).toEqual({ x: 4, y: 1 });
    expect(p.cells).toHaveLength(3);
    expect(previewAttack(s, { x: 2, y: 1 }).valid).toBe(false);
  });
});
