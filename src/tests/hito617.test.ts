import { describe, expect, it } from 'vitest';
import { BALANCE } from '../content/balance';
import { ECHO_FLOORS, type EchoRecord, echoFromState, echoKind, echoStats, isEchoKind, parseEcho } from '../content/echo';
import { AFFINITIES } from '../content/affinities';
import { ENEMIES, isBossFloor } from '../content/enemies';
import { HEROES } from '../content/heroes';
import { DIALOGUES } from '../content/story';
import { applyCommand } from '../core/engine';
import { floorHints } from '../core/hints';
import { createGame } from '../core/newGame';
import { echoFloorOf, generateLevel } from '../dungeon/generator';
import { createEnemy } from '../dungeon/spawn';
import { attack, makeGame } from './helpers';

const REC: EchoRecord = { affinity: 'rayo', affinity2: 'marea', level: 5, floor: 4, weapon: 'hoja_afilada~oxido', armor: 'cota_de_laminas' };

describe('eco de la expedición anterior: contenido', () => {
  it('hay un eco por afinidad, con su nombre, su afinidad y al menos una habilidad', () => {
    for (const a of AFFINITIES) {
      const def = ENEMIES[echoKind(a)];
      expect(def, a).toBeDefined();
      expect(def.affinity).toBe(a);
      expect(def.family).toBe('echo');
      expect(def.name).toContain(HEROES[a].name);
      expect(def.skills?.length).toBeGreaterThan(0);
      expect(def.weight).toBe(0); // nunca sale como enemigo corriente
      expect(isEchoKind(def.id)).toBe(true);
    }
    expect(isEchoKind('eco_menor')).toBe(false);
    expect(isEchoKind('lobo_de_raiz')).toBe(false);
  });

  it('sus números crecen con el nivel con el que cayó quien fue, con tope', () => {
    const st = (level: number) => echoStats({ ...REC, level });
    expect(st(1).maxHp).toBeLessThan(st(6).maxHp);
    expect(st(1).power).toBeLessThanOrEqual(st(6).power);
    expect(st(99)).toEqual(st(12));
    expect(st(0)).toEqual(st(1));
  });

  it('el sector del eco es 2, 4 o 5 (nunca de jefe), determinista por semilla, y las tres opciones se dan', () => {
    const seen = new Set<number>();
    for (let seed = 1; seed <= 60; seed++) {
      const f = echoFloorOf(seed);
      expect(ECHO_FLOORS).toContain(f);
      expect(isBossFloor(f)).toBe(false);
      expect(echoFloorOf(seed)).toBe(f);
      seen.add(f);
    }
    expect(seen.size).toBe(3);
  });

  it('el diálogo del eco vencido existe', () => {
    expect(DIALOGUES.eco_derrota?.lines.length).toBeGreaterThan(1);
  });
});

describe('eco de la expedición anterior: lo que se guarda', () => {
  it('parseEcho acepta un registro válido y rechaza todo lo demás', () => {
    expect(parseEcho(JSON.parse(JSON.stringify(REC)))).toEqual(REC);
    expect(parseEcho(null)).toBeNull();
    expect(parseEcho('x')).toBeNull();
    expect(parseEcho({ ...REC, affinity: 'agua' })).toBeNull();
    expect(parseEcho({ ...REC, affinity2: 'fuego' })).toBeNull();
    expect(parseEcho({ ...REC, level: 'alto' })).toBeNull();
    expect(parseEcho({ ...REC, weapon: 5 })).toBeNull();
    expect(parseEcho({ ...REC, armor: 'x'.repeat(200) })).toBeNull();
    expect(parseEcho({ ...REC, affinity2: null, weapon: null, armor: null })).toMatchObject({ weapon: null, armor: null });
  });

  it('acota niveles absurdos', () => {
    expect(parseEcho({ ...REC, level: 1e9 })?.level).toBe(99);
    expect(parseEcho({ ...REC, level: -4 })?.level).toBe(1);
  });

  it('echoFromState recoge afinidades, nivel, sector y equipo', () => {
    const g = makeGame(['#####', '#@..#', '#####'], (s) => {
      s.player.affinity2 = 'piedra';
      s.player.level = 4;
      s.floor = 3;
      s.player.equipment.weapon = 'hoja_afilada';
    });
    expect(echoFromState(g)).toEqual({ affinity: 'ascua', affinity2: 'piedra', level: 4, floor: 3, weapon: 'hoja_afilada', armor: null });
  });
});

describe('eco de la expedición anterior: en la partida', () => {
  it('el generador lo deja dormido en una sala que no es la de entrada, sin tocar nada más del sector', () => {
    for (const floor of [2, 4, 5]) {
      const plain = generateLevel({ seed: 11, floor });
      const lvl = generateLevel({ seed: 11, floor, echo: REC });
      const echo = lvl.enemies.filter((e) => isEchoKind(e.kind));
      expect(echo, `sector ${floor}`).toHaveLength(1);
      expect(echo[0].kind).toBe(echoKind('rayo'));
      expect(echo[0].alert).toBe(0);
      expect(echo[0].affinity).toBe('rayo');
      expect(lvl.map.tiles).toEqual(plain.map.tiles);
      expect(lvl.enemies.filter((e) => !isEchoKind(e.kind))).toEqual(plain.enemies);
      expect(lvl.drops).toEqual(plain.drops);
    }
    expect(generateLevel({ seed: 11, floor: 3, boss: true, echo: REC }).enemies.some((e) => isEchoKind(e.kind))).toBe(false);
  });

  it('nunca es más fuerte de lo que podrías ser en ese sector', () => {
    const lvl = generateLevel({ seed: 3, floor: 2, echo: { ...REC, level: 12 } });
    const e = lvl.enemies.find((x) => isEchoKind(x.kind));
    const capped = echoStats({ ...REC, level: 3 });
    expect(e?.maxHp).toBe(capped.maxHp);
    expect(e?.power).toBe(capped.power);
  });

  it('baja al sector del eco y se lo encuentra; en los demás sectores no está', () => {
    let seed = 1;
    while (echoFloorOf(seed) !== 2) seed++;
    const s = createGame({ seed, echo: REC });
    expect(s.echo).toEqual(REC);
    expect(s.enemies.some((e) => isEchoKind(e.kind))).toBe(false);
    const exit = s.map.tiles.indexOf('exit');
    s.enemies = [];
    s.player.pos = { x: (exit % s.map.width) - 1, y: Math.floor(exit / s.map.width) };
    const down = applyCommand(s, { type: 'Interact', target: { x: exit % s.map.width, y: Math.floor(exit / s.map.width) } });
    expect(down.ok, down.message).toBe(true);
    expect(down.state.floor).toBe(2);
    expect(down.state.enemies.filter((e) => isEchoKind(e.kind))).toHaveLength(1);
    expect(floorHints(down.state).join(' ')).toContain('eco');
  });

  it('sin registro previo no hay eco', () => {
    const s = createGame({ seed: 4 });
    expect(s.echo).toBeNull();
  });

  const duel = (rec: EchoRecord) =>
    makeGame(['#########', '#@E.....#', '#.......#', '#########'], (g) => {
      g.echo = rec;
      g.enemies = [{ ...createEnemy(ENEMIES[echoKind(rec.affinity)], 'enemy-eco', { x: 2, y: 1 }, 2), hp: 1 }];
    });

  it('al vencerlo suelta su equipo PURIFICADO y esquirlas, apaga el eco y se despide', () => {
    const r = applyCommand(duel(REC), attack({ x: 2, y: 1 }));
    expect(r.ok).toBe(true);
    const ids = r.state.drops.map((d) => d.itemId);
    expect(ids).toContain('hoja_afilada'); // la maldición del óxido desaparece
    expect(ids).not.toContain('hoja_afilada~oxido');
    expect(ids).toContain('cota_de_laminas');
    expect(r.state.drops.find((d) => d.itemId === 'esquirla')?.count).toBe(BALANCE.echoLoot.shards);
    expect(r.state.drops.find((d) => d.itemId === 'moneda')?.count).toBe(BALANCE.echoLoot.coins);
    expect(r.state.echo).toBeNull();
    expect(r.events.some((e) => e.type === 'EchoDefeated')).toBe(true);
    expect(r.events.some((e) => e.type === 'Dialogue' && e.id === 'eco_derrota')).toBe(true);
  });

  it('un encantamiento bueno se conserva, y un equipo inventado o ausente no suelta nada raro', () => {
    const good = applyCommand(duel({ ...REC, weapon: 'hoja_afilada~llama', armor: null }), attack({ x: 2, y: 1 }));
    expect(good.state.drops.map((d) => d.itemId)).toContain('hoja_afilada~llama');
    const none = applyCommand(duel({ ...REC, weapon: 'espada_que_no_existe', armor: null }), attack({ x: 2, y: 1 }));
    expect(none.state.drops.map((d) => d.itemId)).toEqual(expect.not.arrayContaining(['espada_que_no_existe']));
  });
});
