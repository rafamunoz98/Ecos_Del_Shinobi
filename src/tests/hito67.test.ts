import { describe, expect, it } from 'vitest';
import { MANUAL_ITEM } from '../content/items';
import { itemName } from '../content/names';
import { applyCommand, MANUAL_PREFIX } from '../core/engine';
import type { Affinity, Command, GameState, Vec } from '../core/types';
import { makeGame, move, wait } from './helpers';

const use = (techniqueId: string, target: Vec = { x: 1, y: 1 }): Command => ({ type: 'UseTechnique', techniqueId, target });
const passive = (g: GameState) => {
  for (const e of g.enemies) {
    e.power = 0;
    e.aggroRange = 0;
  }
};
const game = (rows: string[], affinity: Affinity, techs: string[], tweak?: (g: GameState) => void) =>
  makeGame(rows, (g) => {
    g.player.techniques.push(...techs);
    passive(g);
    tweak?.(g);
  }, { affinity });

describe('técnicas nuevas: movimiento y curación', () => {
  it('Lanzada de Viento avanza en línea y golpea al primer enemigo', () => {
    const s = game(['##########', '#@..E....#', '##########'], 'vendaval', ['lanzada_de_viento']);
    const r = applyCommand(s, use('lanzada_de_viento', { x: 4, y: 1 }));
    expect(r.ok).toBe(true);
    expect(r.state.player.pos).toEqual({ x: 3, y: 1 });
    expect(r.state.enemies[0].hp).toBeLessThan(s.enemies[0].hp);
  });

  it('Rocío Restaurador cura sin pasar de la vida máxima', () => {
    const s = game(['#####', '#@..#', '#####'], 'marea', ['rocio_restaurador'], (g) => {
      g.player.hp = 3;
    });
    const r = applyCommand(s, use('rocio_restaurador'));
    expect(r.state.player.hp).toBe(Math.min(s.player.maxHp, 11));
  });

  it('Carga Interior paga vida, devuelve kiro y nunca mata', () => {
    const s = game(['#####', '#@..#', '#####'], 'rayo', ['carga_interior'], (g) => {
      g.player.kiro = 0;
      g.player.hp = 2;
    });
    const r = applyCommand(s, use('carga_interior'));
    expect(r.state.player.hp).toBe(1);
    expect(r.state.player.kiro).toBeGreaterThanOrEqual(6);
  });

  it('Ola Empujadora y Paso de Ráfaga se pueden lanzar y consumen kiro', () => {
    const s = game(['##########', '#@..E....#', '##########'], 'marea', ['ola_empujadora']);
    const r = applyCommand(s, use('ola_empujadora', { x: 4, y: 1 }));
    expect(r.ok).toBe(true);
    expect(r.state.player.kiro).toBeLessThanOrEqual(s.player.kiro - 3 + 1);
    const v = game(['##########', '#@..E....#', '##########'], 'vendaval', ['paso_de_rafaga']);
    const b = applyCommand(v, use('paso_de_rafaga', { x: 3, y: 1 }));
    expect(b.state.player.pos).toEqual({ x: 3, y: 1 });
  });
});

describe('grimorio y sustitución de técnicas', () => {
  const room = ['#####', '#@..#', '#####'];
  const full = (g: GameState) => {
    g.player.techniques = ['brasa_circular', 'aliento_ardiente', 'lengua_de_fuego', 'lluvia_de_chispas'];
    g.player.grimoire = ['pira_del_condenado'];
  };

  it('equipar una técnica del grimorio sustituye la elegida y manda la anterior al grimorio', () => {
    const s = makeGame(room, full);
    const r = applyCommand(s, { type: 'EquipTechnique', techniqueId: 'pira_del_condenado', replace: 'lluvia_de_chispas' });
    expect(r.ok).toBe(true);
    expect(r.state.player.techniques).toContain('pira_del_condenado');
    expect(r.state.player.techniques).not.toContain('lluvia_de_chispas');
    expect(r.state.player.grimoire).toContain('lluvia_de_chispas');
    expect(r.state.turn).toBe(s.turn + 1);
  });

  it('sin ranura libre exige elegir cuál sustituir; técnicas ajenas se rechazan', () => {
    const s = makeGame(room, full);
    expect(applyCommand(s, { type: 'EquipTechnique', techniqueId: 'pira_del_condenado' }).ok).toBe(false);
    const bad = applyCommand(s, { type: 'EquipTechnique', techniqueId: 'carcel_de_agua', replace: 'brasa_circular' });
    expect(bad.ok).toBe(false);
    expect(bad.state).toBe(s);
  });

  it('con ranura libre se equipa directamente', () => {
    const s = makeGame(room, (g) => {
      g.player.techniques = ['brasa_circular'];
      g.player.grimoire = ['pira_del_condenado'];
    });
    const r = applyCommand(s, { type: 'EquipTechnique', techniqueId: 'pira_del_condenado' });
    expect(r.state.player.techniques).toEqual(['brasa_circular', 'pira_del_condenado']);
    expect(r.state.player.grimoire).toEqual([]);
  });
});

describe('manuales de técnica', () => {
  it('un manual recogido se convierte en un manual concreto y se aprende al usarlo', () => {
    const s = makeGame(['#####', '#@..#', '#####'], (g) => {
      g.player.techniques = ['brasa_circular', 'aliento_ardiente', 'lengua_de_fuego', 'lluvia_de_chispas'];
      g.player.inventory[MANUAL_PREFIX + 'pira_del_condenado'] = 1;
    });
    expect(itemName(MANUAL_PREFIX + 'pira_del_condenado')).toMatch(/Pira del Condenado/);
    const r = applyCommand(s, { type: 'UseItem', itemId: MANUAL_PREFIX + 'pira_del_condenado' });
    expect(r.ok).toBe(true);
    expect(r.state.player.grimoire).toContain('pira_del_condenado');
    expect(r.state.player.inventory[MANUAL_PREFIX + 'pira_del_condenado'] ?? 0).toBe(0);
  });

  it('el manual genérico tiene nombre', () => {
    expect(itemName(MANUAL_ITEM).length).toBeGreaterThan(3);
  });
});

describe('aliados invocados', () => {
  const room = ['##########', '#@...E...#', '##########'];

  it('Clon de Sombra crea un aliado que ataca al enemigo y caduca', () => {
    const s = makeGame(room, (g) => {
      g.player.techniques.push('clon_de_sombra');
      g.enemies[0].aggroRange = 0;
      g.enemies[0].power = 0;
    });
    const r = applyCommand(s, use('clon_de_sombra'));
    expect(r.ok).toBe(true);
    expect(r.state.allies).toHaveLength(1);
    let st = r.state;
    for (let i = 0; i < 12; i++) st = applyCommand(st, wait()).state;
    expect(st.allies).toHaveLength(0);
    expect(st.enemies[0]?.hp ?? 0).toBeLessThan(s.enemies[0].hp);
  });

  it('caminar contra un aliado intercambia el sitio', () => {
    const s = makeGame(room, (g) => {
      g.player.techniques.push('clon_de_sombra');
      passive(g);
    });
    let st = applyCommand(s, use('clon_de_sombra')).state;
    st.allies[0].pos = { x: 2, y: 1 };
    st = applyCommand(st, move(1, 0)).state;
    expect(st.player.pos).toEqual({ x: 2, y: 1 });
    expect(st.allies[0].pos.x).toBeLessThanOrEqual(2);
  });
});

describe('estados nuevos', () => {
  it('el veneno quita vida cada ronda y la regeneración la devuelve', () => {
    const s = makeGame(['#####', '#@..#', '#####'], (g) => {
      g.player.hp = 10;
      g.player.statuses.push({ id: 'veneno', turns: 3 });
    });
    const r = applyCommand(s, wait());
    expect(r.state.player.hp).toBeLessThan(10);
    const t = makeGame(['#####', '#@..#', '#####'], (g) => {
      g.player.hp = 5;
      g.player.statuses.push({ id: 'regeneracion', turns: 3 });
    });
    expect(applyCommand(t, wait()).state.player.hp).toBeGreaterThan(5);
  });
});
