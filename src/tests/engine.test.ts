import { describe, expect, it } from 'vitest';
import { applyCommand, previewTechnique } from '../core/engine';
import { attack, cast, interact, makeGame, move, OPEN_ROOM, wait } from './helpers';

describe('movimiento', () => {
  it('mueve a una casilla libre y consume un turno', () => {
    const s = makeGame(['#####', '#@..#', '#####']);
    const r = applyCommand(s, move(1, 0));
    expect(r.ok).toBe(true);
    expect(r.state.player.pos).toEqual({ x: 2, y: 1 });
    expect(r.state.turn).toBe(1);
    expect(s.turn).toBe(0); // el estado de entrada no se modifica
  });

  it('rechaza una pared sin consumir turno', () => {
    const s = makeGame(['#####', '#@..#', '#####']);
    const r = applyCommand(s, move(-1, 0));
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('blocked');
    expect(r.state).toBe(s);
  });

  it('rechaza salir del borde del mapa', () => {
    const s = makeGame(['@..']);
    expect(applyCommand(s, move(-1, 0)).reason).toBe('out_of_bounds');
    expect(applyCommand(s, move(0, -1)).reason).toBe('out_of_bounds');
  });

  it('rechaza una casilla ocupada por un enemigo o un cofre', () => {
    expect(applyCommand(makeGame(['####', '#@E#', '####']), move(1, 0)).reason).toBe('occupied');
    expect(applyCommand(makeGame(['####', '#@C#', '####']), move(1, 0)).reason).toBe('occupied');
  });

  it('rechaza movimientos no ortogonales', () => {
    const s = makeGame(['#####', '#@..#', '#...#', '#####']);
    expect(applyCommand(s, move(1, 1)).reason).toBe('bad_direction');
    expect(applyCommand(s, move(0, 0)).reason).toBe('bad_direction');
    expect(applyCommand(s, move(0.5, 0.5)).reason).toBe('bad_direction');
  });

  it('una acción inválida no activa a los enemigos', () => {
    const s = makeGame(['########', '#@....E#', '########']);
    const r = applyCommand(s, move(-1, 0));
    expect(r.ok).toBe(false);
    expect(r.events).toEqual([]);
    expect(r.state.enemies[0].pos).toEqual({ x: 6, y: 1 });
  });
});

describe('turnos', () => {
  it('una acción válida provoca exactamente una respuesta enemiga', () => {
    const s = makeGame(['##########', '#@......E#', '##########']);
    const r = applyCommand(s, wait());
    expect(r.events.filter((e) => e.type === 'EnemyMoved')).toHaveLength(1);
    expect(r.state.enemies[0].pos).toEqual({ x: 7, y: 1 });
  });

  it('un enemigo fuera de su rango de persecución no actúa', () => {
    const wall = '#'.repeat(14);
    const s = makeGame([wall, '#@' + '.'.repeat(10) + 'E#', wall]); // camino de 11 > rango 8
    const r = applyCommand(s, wait());
    expect(r.events.some((e) => e.type === 'EnemyMoved')).toBe(false);
  });

  it('un enemigo adyacente ataca con daño = poder - defensa', () => {
    const s = makeGame(['####', '#@E#', '####']);
    const r = applyCommand(s, wait());
    expect(r.state.player.hp).toBe(20 - (4 - 1));
    expect(r.events.some((e) => e.type === 'DamageApplied' && e.targetId === 'player')).toBe(true);
  });

  it('los enemigos derrotados no actúan', () => {
    const s = makeGame(['####', '#@E#', '####'], (g) => {
      g.enemies[0].hp = 4;
    });
    const r = applyCommand(s, attack({ x: 2, y: 1 }));
    expect(r.state.enemies).toHaveLength(0);
    expect(r.state.player.hp).toBe(20);
    expect(r.events.some((e) => e.type === 'EnemyDefeated')).toBe(true);
  });

  it('tras terminar la expedición se rechazan los comandos', () => {
    const s = makeGame(['####', '#@E#', '####'], (g) => {
      g.player.hp = 1;
    });
    const r = applyCommand(s, wait());
    expect(r.state.status).toBe('lost');
    expect(applyCommand(r.state, wait()).reason).toBe('run_over');
  });

  it('esperar recupera kiro sin superar el máximo', () => {
    const s = makeGame(['#####', '#@..#', '#####'], (g) => {
      g.player.kiro = 5;
    });
    expect(applyCommand(s, wait()).state.player.kiro).toBe(6);
    expect(applyCommand(makeGame(['#####', '#@..#', '#####']), wait()).state.player.kiro).toBe(10);
  });
});

describe('ataque y daño', () => {
  it('el ataque básico daña y el enemigo contraataca', () => {
    const s = makeGame(['####', '#@E#', '####']);
    const r = applyCommand(s, attack({ x: 2, y: 1 }));
    expect(r.state.enemies[0].hp).toBe(10 - 4);
    expect(r.state.player.hp).toBe(17);
  });

  it('exige objetivo adyacente y enemigo presente', () => {
    const s = makeGame(['#####', '#@.E#', '#####']);
    expect(applyCommand(s, attack({ x: 3, y: 1 })).reason).toBe('not_adjacent');
    expect(applyCommand(s, attack({ x: 2, y: 1 })).reason).toBe('no_target');
  });

  it('el daño mínimo es 1', () => {
    const s = makeGame(['####', '#@E#', '####'], (g) => {
      g.enemies[0].power = 0;
    });
    expect(applyCommand(s, wait()).state.player.hp).toBe(19);
  });
});

describe('kiro y técnicas', () => {
  it('gasta el coste exacto y daña en área, aplicando quemadura', () => {
    const s = makeGame(OPEN_ROOM);
    const r = applyCommand(s, cast({ x: 5, y: 2 }));
    expect(r.ok).toBe(true);
    expect(r.state.player.kiro).toBe(7);
    expect(r.events).toContainEqual({ type: 'KiroSpent', amount: 3 });
    // 10 - 6 de impacto - 1 de quemadura al final de la ronda
    expect(r.state.enemies.map((e) => e.hp)).toEqual([3, 3]);
    expect(r.state.enemies.every((e) => e.statuses[0]?.id === 'quemadura' && e.statuses[0].turns === 2)).toBe(true);
  });

  it('rechaza sin kiro suficiente y no gasta nada', () => {
    const s = makeGame(OPEN_ROOM, (g) => {
      g.player.kiro = 2;
    });
    const r = applyCommand(s, cast({ x: 5, y: 2 }));
    expect(r.reason).toBe('not_enough_kiro');
    expect(r.state).toBe(s);
    expect(s.player.kiro).toBe(2);
  });

  it('rechaza objetivos fuera de alcance', () => {
    expect(applyCommand(makeGame(OPEN_ROOM), cast({ x: 6, y: 2 })).reason).toBe('out_of_range');
  });

  it('respeta la línea de visión', () => {
    const s = makeGame(['#########', '#@.#.E..#', '#########']);
    const r = applyCommand(s, cast({ x: 5, y: 1 }));
    expect(r.reason).toBe('no_line_of_sight');
    expect(r.state).toBe(s);
  });

  it('rechaza una afinidad que no corresponde', () => {
    // Se fuerza el aprendizaje para comprobar la comprobación de afinidad (sin ella, falla antes con not_known).
    const s = makeGame(
      OPEN_ROOM,
      (g) => {
        g.player.techniques.push('brasa_circular');
      },
      { affinity: 'marea' },
    );
    expect(applyCommand(s, cast({ x: 5, y: 2 })).reason).toBe('wrong_affinity');
  });

  it('la vista previa da coste y casillas sin consumir turno', () => {
    const s = makeGame(OPEN_ROOM);
    const p = previewTechnique(s, 'brasa_circular', { x: 4, y: 2 });
    expect(p.valid).toBe(true);
    expect(p.kiroCost).toBe(3);
    expect(p.cells).toHaveLength(5);
    expect(s.turn).toBe(0);
  });

  it('la quemadura puede rematar al enemigo en la misma ronda', () => {
    const s = makeGame(['#########', '#@...E..#', '#########'], (g) => {
      g.enemies[0].hp = 7;
    });
    const r = applyCommand(s, cast({ x: 5, y: 1 }));
    expect(r.state.enemies).toHaveLength(0);
    expect(r.events.some((e) => e.type === 'EnemyDefeated')).toBe(true);
  });
});

describe('objetos, cofres y salida', () => {
  it('el ungüento cura sin pasarse del máximo y se agota', () => {
    const s = makeGame(['#####', '#@..#', '#####'], (g) => {
      g.player.hp = 10;
    });
    const r = applyCommand(s, { type: 'UseItem', itemId: 'unguento_musgo' });
    expect(r.state.player.hp).toBe(18);
    expect(r.state.player.inventory.unguento_musgo).toBeUndefined();
    expect(applyCommand(r.state, { type: 'UseItem', itemId: 'unguento_musgo' }).reason).toBe('no_item');
  });

  it('el tónico recupera kiro', () => {
    const s = makeGame(['#####', '#@..#', '#####'], (g) => {
      g.player.kiro = 1;
      g.player.inventory.tonico_kiro = 1;
    });
    expect(applyCommand(s, { type: 'UseItem', itemId: 'tonico_kiro' }).state.player.kiro).toBe(6);
  });

  it('el cofre da un objeto o equipo y no se abre dos veces', () => {
    const s = makeGame(['#####', '#@C.#', '#####']);
    const r = applyCommand(s, interact({ x: 2, y: 1 }));
    expect(r.ok).toBe(true);
    const count = (inv: Record<string, number>) => Object.values(inv).reduce((a, b) => a + b, 0);
    const gotItem = count(r.state.player.inventory) > count(s.player.inventory);
    const gotGear = r.events.some((e) => e.type === 'EquipmentEquipped') || r.state.player.weapons.length > s.player.weapons.length;
    const betterGear = r.state.log[r.state.log.length - 1].includes('equipo actual es mejor');
    expect(gotItem || gotGear || betterGear).toBe(true);
    expect(r.state.chests[0].opened).toBe(true);
    expect(applyCommand(r.state, interact({ x: 2, y: 1 })).reason).toBe('already_opened');
  });

  it('interactuar con la salida gana la partida', () => {
    const s = makeGame(['####', '#@>#', '####']);
    const r = applyCommand(s, interact({ x: 2, y: 1 }));
    expect(r.state.status).toBe('won');
    expect(r.events).toContainEqual({ type: 'RunWon' });
  });

  it('no se puede interactuar con nada, ni extraerse todavía', () => {
    const s = makeGame(['#####', '#@..#', '#####']);
    expect(applyCommand(s, interact({ x: 2, y: 1 })).reason).toBe('nothing_to_interact');
    expect(applyCommand(s, interact({ x: 3, y: 1 })).reason).toBe('not_adjacent');
    expect(applyCommand(s, { type: 'Extract' }).reason).toBe('extraction_unavailable');
  });
});

describe('determinismo y guardado', () => {
  const script = [move(1, 0), interact({ x: 3, y: 1 }), wait()];
  const room = ['######', '#@.C.#', '######'];

  it('misma semilla y mismos comandos dan el mismo resultado', () => {
    const run = () => {
      let s = makeGame(room, undefined, { seed: 99 });
      for (const c of script) s = applyCommand(s, c).state;
      return s;
    };
    expect(run()).toEqual(run());
  });

  it('el estado sobrevive a un viaje por JSON y continúa igual', () => {
    const s = makeGame(OPEN_ROOM, undefined, { seed: 5 });
    const restored = JSON.parse(JSON.stringify(s));
    expect(restored).toEqual(s);
    expect(applyCommand(restored, cast({ x: 5, y: 2 })).state).toEqual(applyCommand(s, cast({ x: 5, y: 2 })).state);
  });
});
