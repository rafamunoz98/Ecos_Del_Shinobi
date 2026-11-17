import { describe, expect, it } from 'vitest';
import { applyCommand, previewTechnique } from '../core/engine';
import type { Affinity, Command, GameState, Vec } from '../core/types';
import { makeGame, wait } from './helpers';

const use = (techniqueId: string, target: Vec): Command => ({ type: 'UseTechnique', techniqueId, target });
const known = (id: string) => (g: GameState) => {
  g.player.techniques.push(id);
};
/** Los enemigos no persiguen (rango 0) ni hacen daño apreciable, para aislar el efecto de la técnica. */
const passive = (g: GameState) => {
  for (const e of g.enemies) {
    e.power = 0;
    e.aggroRange = 0;
  }
};
function game(rows: string[], affinity: Affinity, techniqueId: string, tweak?: (g: GameState) => void) {
  return makeGame(
    rows,
    (g) => {
      if (!g.player.techniques.includes(techniqueId)) known(techniqueId)(g);
      tweak?.(g);
    },
    { affinity },
  );
}

describe('Lengua de Fuego (Ascua, línea)', () => {
  const room = ['##########', '#@..E.E..#', '##########'];

  it('alcanza a todos en la línea, daña y quema', () => {
    const r = applyCommand(game(room, 'ascua', 'lengua_de_fuego', passive), use('lengua_de_fuego', { x: 2, y: 1 }));
    expect(r.ok).toBe(true);
    expect(r.state.player.kiro).toBe(6);
    // 10 - 8 de impacto - 1 de quemadura de la ronda = 1
    expect(r.state.enemies.map((e) => e.hp)).toEqual([1, 1]);
  });

  it('exige alineación y se detiene en las paredes', () => {
    const s = game(['########', '#@..#.E#', '########'], 'ascua', 'lengua_de_fuego');
    expect(applyCommand(s, use('lengua_de_fuego', { x: 5, y: 1 })).ok).toBe(true);
    const m = makeGame(['#####', '#@..#', '#...#', '#####'], known('lengua_de_fuego'), { affinity: 'ascua' });
    expect(applyCommand(m, use('lengua_de_fuego', { x: 2, y: 2 })).reason).toBe('not_aligned');
    const blockedLine = game(['####', '#@##', '####'], 'ascua', 'lengua_de_fuego');
    expect(applyCommand(blockedLine, use('lengua_de_fuego', { x: 2, y: 1 })).reason).toBe('blocked');
  });
});

describe('Velo de Corriente (Marea, protección)', () => {
  it('reduce el daño recibido en 2 durante su duración y luego termina', () => {
    const s = makeGame(['####', '#@E#', '####'], undefined, { affinity: 'marea' });
    const r = applyCommand(s, use('velo_de_corriente', s.player.pos));
    expect(r.ok).toBe(true);
    expect(r.state.player.kiro).toBe(8);
    expect(r.state.player.statuses[0]).toEqual({ id: 'protegido', turns: 3 });
    // Acechador: 4 - (1 base + 2 protegido) = 1
    expect(r.state.player.hp).toBe(19);
    let cur = r.state;
    for (let i = 0; i < 3; i++) cur = applyCommand(cur, wait()).state;
    expect(cur.player.statuses).toEqual([]);
  });
});

describe('Ola Empujadora (Marea, empuje)', () => {
  it('empuja 2 casillas alejando al enemigo', () => {
    const s = game(['########', '#@E....#', '########'], 'marea', 'ola_empujadora', passive);
    const r = applyCommand(s, use('ola_empujadora', { x: 2, y: 1 }));
    expect(r.ok).toBe(true);
    expect(r.state.enemies[0].pos).toEqual({ x: 4, y: 1 });
    expect(r.state.enemies[0].hp).toBe(7);
  });

  it('estrellarlo contra una pared hace daño extra', () => {
    const s = game(['#####', '#@E##', '#####'], 'marea', 'ola_empujadora', passive);
    const r = applyCommand(s, use('ola_empujadora', { x: 2, y: 1 }));
    expect(r.state.enemies[0].pos).toEqual({ x: 2, y: 1 });
    expect(r.state.enemies[0].hp).toBe(10 - 3 - 2);
  });
});

describe('Corte de Aire (Vendaval, línea larga)', () => {
  it('daña a lo largo de la línea', () => {
    const s = game(['##########', '#@.....E.#', '##########'], 'vendaval', 'corte_de_aire', passive);
    expect(applyCommand(s, use('corte_de_aire', { x: 3, y: 1 })).state.enemies[0].hp).toBe(5);
    expect(s.player.kiro).toBe(10);
  });
});

describe('Paso de Ráfaga (Vendaval, desplazamiento)', () => {
  const room = ['#########', '#@..E...#', '#########'];
  it('teletransporta a una casilla libre visible dentro del alcance', () => {
    const r = applyCommand(game(room, 'vendaval', 'paso_de_rafaga'), use('paso_de_rafaga', { x: 3, y: 1 }));
    expect(r.ok).toBe(true);
    expect(r.state.player.pos).toEqual({ x: 3, y: 1 });
    expect(r.state.player.kiro).toBe(8);
  });
  it('rechaza casillas ocupadas, lejanas o sin visión', () => {
    const s = game(room, 'vendaval', 'paso_de_rafaga');
    expect(applyCommand(s, use('paso_de_rafaga', { x: 4, y: 1 })).reason).toBe('occupied');
    expect(applyCommand(s, use('paso_de_rafaga', { x: 7, y: 1 })).reason).toBe('out_of_range');
    const wall = game(['########', '#@.#..E#', '########'], 'vendaval', 'paso_de_rafaga');
    expect(applyCommand(wall, use('paso_de_rafaga', { x: 4, y: 1 })).reason).toBe('no_line_of_sight');
  });
});

describe('Muro de Pizarra (Piedra, barrera)', () => {
  it('bloquea el paso a enemigos y jugador, y desaparece al pasar su duración', () => {
    const rows = ['#######', '#.....#', '#@....#', '#.....#', '#######'];
    const s = makeGame(rows, (g) => {
      g.enemies.push({ ...makeGame(['#E@#']).enemies[0], pos: { x: 5, y: 2 } });
    }, { affinity: 'piedra' });
    const r = applyCommand(s, use('muro_de_pizarra', { x: 3, y: 2 }));
    expect(r.ok).toBe(true);
    expect(r.state.barriers.map((b) => b.pos).sort((a: Vec, b: Vec) => a.y - b.y)).toEqual([
      { x: 3, y: 1 },
      { x: 3, y: 2 },
      { x: 3, y: 3 },
    ]);
    expect(r.state.player.kiro).toBe(7);
    // La barrera tapa todo el pasillo vertical de 3 casillas: el enemigo no cruza.
    expect(r.state.enemies[0].pos.x).toBeGreaterThanOrEqual(4);
    // El jugador tampoco la atraviesa.
    const step = applyCommand({ ...r.state, player: { ...r.state.player, pos: { x: 2, y: 2 } } }, { type: 'Move', dx: 1, dy: 0 });
    expect(step.reason).toBe('blocked');
    // Expira: se alzó con 6 y cada ronda resta 1.
    let cur = r.state;
    for (let i = 0; i < 5; i++) cur = applyCommand(cur, wait()).state;
    expect(cur.barriers).toEqual([]);
  });

  it('no se puede alzar sobre casillas ocupadas', () => {
    const s = game(['#####', '#@E.#', '#####'], 'piedra', 'muro_de_pizarra');
    expect(applyCommand(s, use('muro_de_pizarra', { x: 2, y: 1 })).reason).toBe('occupied');
  });
});

describe('Golpe Sísmico (Piedra, aturdir adyacentes)', () => {
  it('daña y aturde: el enemigo aturdido no ataca esa ronda', () => {
    const s = game(['####', '#@E#', '####'], 'piedra', 'golpe_sismico');
    const r = applyCommand(s, use('golpe_sismico', s.player.pos));
    expect(r.ok).toBe(true);
    expect(r.state.enemies[0].hp).toBe(5);
    expect(r.state.player.hp).toBe(20); // no contraatacó
    expect(r.state.enemies[0].statuses).toEqual([]); // duración 1: ya consumida
  });
});

describe('Aguja Resonante (Rayo, precisión)', () => {
  it('ignora la defensa y aturde', () => {
    const s = game(['########', '#@..E..#', '########'], 'rayo', 'aguja_resonante', (g) => {
      g.enemies[0].defense = 3;
    });
    const r = applyCommand(s, use('aguja_resonante', { x: 4, y: 1 }));
    expect(r.state.enemies[0].hp).toBe(5);
    expect(r.state.enemies[0].pos).toEqual({ x: 4, y: 1 }); // aturdido: no se movió
  });
});

describe('Descarga Estática (Rayo, ráfaga de radio 2)', () => {
  it('golpea alrededor, ignora defensa y no atraviesa paredes', () => {
    const s = game(['#######', '#.E@E.#', '#.#.#.#', '#######'], 'rayo', 'descarga_estatica', (g) => {
      for (const e of g.enemies) {
        e.defense = 5;
        e.power = 0;
      }
    });
    const r = applyCommand(s, use('descarga_estatica', s.player.pos));
    expect(r.state.enemies.map((e) => e.hp)).toEqual([6, 6]);
  });
});

describe('vista previa y validación general', () => {
  it('no deja lanzar técnicas de otra afinidad ni no aprendidas', () => {
    const s = makeGame(['####', '#@E#', '####'], undefined, { affinity: 'marea' });
    expect(applyCommand(s, use('brasa_circular', { x: 2, y: 1 })).reason).toBe('not_known');
    const forced = makeGame(['####', '#@E#', '####'], known('brasa_circular'), { affinity: 'marea' });
    expect(applyCommand(forced, use('brasa_circular', { x: 2, y: 1 })).reason).toBe('wrong_affinity');
  });

  it('la vista previa de una línea muestra las casillas sin gastar turno', () => {
    const s = game(['########', '#@.....#', '########'], 'ascua', 'lengua_de_fuego');
    const p = previewTechnique(s, 'lengua_de_fuego', { x: 3, y: 1 });
    expect(p.valid).toBe(true);
    expect(p.cells).toHaveLength(5);
    expect(p.kiroCost).toBe(4);
    expect(s.turn).toBe(0);
  });
});
