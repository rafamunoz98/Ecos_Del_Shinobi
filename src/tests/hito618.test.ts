import { describe, expect, it } from 'vitest';
import { BALANCE } from '../content/balance';
import { itemName } from '../content/names';
import { ALTAR_KIND, ALTAR_OFFERS, NPCS, altarOffer, getNpc, npcOptions } from '../content/story';
import { TECHNIQUES, learnableFor, techniqueIconId } from '../content/techniques';
import { ALL_TRINKET_IDS, isCursedTrinket } from '../content/trinkets';
import { applyCommand, optionBlocker } from '../core/engine';
import { Rng } from '../core/rng';
import { PERMANENT_HAZARD, addHazard, hazardAt } from '../core/terrain';
import type { Command, GameState } from '../core/types';
import { createGame } from '../core/newGame';
import { generateLevel, strengthFloorOfPhase } from '../dungeon/generator';
import { BOSS_FLOORS } from '../content/enemies';
import { makeGame, wait } from './helpers';

const run = (g: GameState, ...cmds: Command[]): GameState => {
  let s = g;
  for (const c of cmds) {
    const r = applyCommand(s, c);
    expect(r.ok, `${JSON.stringify(c)} → ${r.message ?? ''} ${r.reason ?? ''}`).toBe(true);
    s = r.state;
  }
  return s;
};
const calm = (g: GameState): void => {
  for (const e of g.enemies) {
    e.aggroRange = 0;
    e.power = 0;
    e.hp = e.maxHp = 999;
  }
};

describe('identificación lenta y por uso', () => {
  const ROOM = ['#######', '#@E...#', '#######'];

  it('una pieza tarda BALANCE.identifyTurns rondas puestas en revelarse (150) si no se usa', () => {
    expect(BALANCE.identifyTurns).toBe(150);
    const g = makeGame(['########', '#@.....#', '########'], (s) => {
      s.player.armors = ['chaleco_acolchado'];
    });
    let s = run(g, { type: 'EquipArmor', armorId: 'chaleco_acolchado' });
    for (let i = 0; i < BALANCE.identifyTurns - 2; i++) s = run(s, wait());
    expect(s.player.identified).not.toContain('chaleco_acolchado');
    s = run(s, wait());
    expect(s.player.identified).toContain('chaleco_acolchado');
  });

  it('golpear con el arma acorta la espera: cada golpe cuenta BALANCE.identifyUse.weapon rondas más', () => {
    const g = makeGame(ROOM, (s) => {
      calm(s);
      s.player.weapons = ['kunai_de_hierro'];
      s.player.equipment.weapon = 'kunai_de_hierro';
      s.player.hp = s.player.maxHp = 999; // el enemigo, aun sin poder, hace 1 de daño mínimo: que no te mate durante la prueba
    });
    const s = run(g, { type: 'BasicAttack', target: { x: 2, y: 1 } });
    // La ronda cuenta 1 y el golpe, lo que acorte el uso.
    expect(s.player.wear.kunai_de_hierro).toBe(1 + BALANCE.identifyUse.weapon);
    // Con unos 38 golpes se descubre sin esperar las 150 rondas.
    let t = s;
    for (let i = 0; i < 40 && !t.player.identified.includes('kunai_de_hierro'); i++) t = run(t, { type: 'BasicAttack', target: { x: 2, y: 1 } });
    expect(t.player.identified).toContain('kunai_de_hierro');
    expect(t.turn).toBeLessThan(BALANCE.identifyTurns / 2);
  });

  it('aguantar golpes acorta la espera de la vestimenta y de las joyas puestas', () => {
    const g = makeGame(ROOM, (s) => {
      s.player.armors = ['chaleco_acolchado'];
      s.player.equipment.armor = 'chaleco_acolchado';
      s.player.trinkets = ['anillo_vigor'];
      s.player.equipment.ring = 'anillo_vigor';
      s.enemies[0].power = 6;
      s.enemies[0].alert = 12;
    });
    const s = run(g, wait());
    expect(s.player.hp).toBeLessThan(g.player.hp); // le dolió
    expect(s.player.wear.chaleco_acolchado).toBe(1 + BALANCE.identifyUse.armor);
    expect(s.player.wear.anillo_vigor).toBe(1 + BALANCE.identifyUse.trinket);
  });

  it('un anillo o colgante maldito se delata al ponértelo; uno corriente no', () => {
    const cursed = ALL_TRINKET_IDS.find((id) => isCursedTrinket(id)) as string;
    const clean = ALL_TRINKET_IDS.find((id) => !isCursedTrinket(id)) as string;
    const g = makeGame(['########', '#@.....#', '########'], (s) => {
      s.player.trinkets.push(cursed, clean);
    });
    const a = run(g, { type: 'EquipTrinket', trinketId: cursed });
    expect(a.player.identified).toContain(cursed);
    expect(a.log.some((l) => l.includes('maldito'))).toBe(true);
    const b = run(g, { type: 'EquipTrinket', trinketId: clean });
    expect(b.player.identified).not.toContain(clean);
    expect(itemName(clean, b)).toContain('(?)');
  });
});

describe('altar del Eco Roto: variedad', () => {
  const ids = NPCS[ALTAR_KIND].options.map((o) => o.id);

  it('tiene 9 opciones y cada altar ofrece solo 3, distintas entre sí', () => {
    expect(ids).toHaveLength(9);
    expect(new Set(ids).size).toBe(9);
    expect(ALTAR_OFFERS).toBe(3);
    for (let seed = 1; seed <= 30; seed++) {
      const offer = altarOffer(new Rng(seed));
      expect(offer).toHaveLength(3);
      expect(new Set(offer).size).toBe(3);
      for (const id of offer) expect(ids).toContain(id);
    }
  });

  it('no siempre salen las mismas: en pocas semillas aparecen muchas combinaciones y todas las opciones', () => {
    const combos = new Set<string>();
    const seen = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      const offer = altarOffer(new Rng(seed));
      combos.add([...offer].sort().join('|'));
      offer.forEach((o) => seen.add(o));
    }
    expect(combos.size).toBeGreaterThan(20);
    expect(seen.size).toBe(9);
  });

  it('el generador coloca el altar (sectores 1 y 4) con su lista de 3 opciones, determinista por semilla', () => {
    let different = 0;
    for (let seed = 1; seed <= 20; seed++) {
      for (const floor of [1, 4]) {
        const altar = generateLevel({ seed, floor }).npcs.find((n) => n.kind === ALTAR_KIND);
        expect(altar, `semilla ${seed} sector ${floor}`).toBeDefined();
        expect(altar?.offer).toHaveLength(3);
        expect(generateLevel({ seed, floor }).npcs.find((n) => n.kind === ALTAR_KIND)?.offer).toEqual(altar?.offer);
      }
      const a = generateLevel({ seed, floor: 1 }).npcs.find((n) => n.kind === ALTAR_KIND)?.offer?.join();
      const b = generateLevel({ seed, floor: 4 }).npcs.find((n) => n.kind === ALTAR_KIND)?.offer?.join();
      if (a !== b) different++;
    }
    expect(different).toBeGreaterThan(10); // los dos altares de una partida suelen ofrecer cosas distintas
  });

  const altarGame = (offer: string[], tweak?: (s: GameState) => void): GameState =>
    makeGame(['########', '#@.....#', '########'], (s) => {
      s.npcs.push({ id: 'npc-altar', kind: ALTAR_KIND, pos: { x: 2, y: 1 }, used: false, offer });
      tweak?.(s);
    });
  const choose = (optionId: string): Command => ({ type: 'Choose', npcId: 'npc-altar', optionId });

  it('solo se pueden elegir las opciones que ese altar ofrece', () => {
    const g = altarGame(['temple', 'ayuno', 'vision']);
    expect(npcOptions(g.npcs[0]).map((o) => o.id)).toEqual(['temple', 'ayuno', 'vision']);
    expect(applyCommand(g, choose('sangre')).reason).toBe('unknown_option');
    expect(applyCommand(g, choose('ayuno')).ok).toBe(true);
  });

  it('las opciones nuevas cobran y dan lo que dicen', () => {
    const base = altarGame(['temple', 'pozo', 'limosna'], (s) => {
      s.player.coins = 30;
    });
    const t = run(base, choose('temple'));
    expect(t.player.hp).toBe(base.player.hp - 8);
    expect(t.player.power).toBe(base.player.power + 1);
    expect(t.player.defense).toBe(base.player.defense + 1);
    const p = run(base, choose('pozo'));
    expect(p.player.coins).toBe(15);
    expect(p.player.maxHp).toBe(base.player.maxHp + 5);
    expect(p.player.hp).toBe(p.player.maxHp);
    const l = run(base, choose('limosna'));
    expect(l.player.coins).toBe(20);
    expect(l.player.inventory['pocion:sanacion']).toBe(2);
    expect(l.player.known).toContain('pocion:sanacion');
    const poor = altarGame(['pozo', 'limosna', 'fundicion']);
    expect(optionBlocker(poor, getNpc(ALTAR_KIND)?.options.find((o) => o.id === 'pozo') as never)).toContain('monedas');
    expect(applyCommand(poor, choose('pozo')).reason).toBe('option_unavailable');
    expect(applyCommand(poor, choose('fundicion')).reason).toBe('option_unavailable');
    const rich = altarGame(['fundicion', 'pozo', 'limosna'], (s) => {
      s.player.shards = 3;
    });
    const f = run(rich, choose('fundicion'));
    expect(f.player.shards).toBe(0);
    expect(f.player.power).toBe(rich.player.power + 1);
  });

  it('«Visión del eco» identifica todo lo que llevas y no se ofrece si no hay nada que identificar', () => {
    const g = altarGame(['vision', 'ayuno', 'temple'], (s) => {
      s.player.armors = ['chaleco_acolchado'];
      s.player.weapons = ['kunai_de_hierro'];
      s.player.trinkets = ['anillo_vigor'];
    });
    const s = run(g, choose('vision'));
    expect(s.player.identified).toEqual(expect.arrayContaining(['chaleco_acolchado', 'kunai_de_hierro', 'anillo_vigor']));
    expect(applyCommand(altarGame(['vision', 'ayuno', 'temple']), choose('vision')).reason).toBe('option_unavailable');
  });
});

describe('charcos y precipicios visibles en el mapa', () => {
  it('los sectores sin jefe traen charcos naturales permanentes, sobre suelo, lejos de la entrada y la salida', () => {
    let withPuddles = 0;
    let total = 0;
    for (let seed = 1; seed <= 30; seed++) {
      for (const floor of [1, 2, 4, 5]) {
        const lv = generateLevel({ seed, floor });
        total++;
        if (lv.hazards.length > 0) withPuddles++;
        for (const h of lv.hazards) {
          expect(h.kind).toBe('water');
          expect(h.turns).toBe(PERMANENT_HAZARD);
          expect(lv.map.tiles[h.pos.y * lv.map.width + h.pos.x]).toBe('floor');
          expect(Math.abs(h.pos.x - lv.playerStart.x) + Math.abs(h.pos.y - lv.playerStart.y)).toBeGreaterThanOrEqual(2);
        }
      }
      for (const floor of BOSS_FLOORS) expect(generateLevel({ seed, floor, boss: true }).hazards).toEqual([]);
    }
    expect(withPuddles / total).toBeGreaterThan(0.9);
  });

  it('el paso de las rondas no seca un charco natural, y el fuego sí lo evapora', () => {
    const g = makeGame(['#########', '#@......#', '#########']);
    g.hazards = [{ pos: { x: 4, y: 1 }, kind: 'water', turns: PERMANENT_HAZARD }];
    let s = g;
    for (let i = 0; i < 30; i++) s = run(s, wait());
    expect(hazardAt(s, { x: 4, y: 1 }, 'water')?.turns).toBe(PERMANENT_HAZARD);
    addHazard(s, { x: 4, y: 1 }, 'fire', 3);
    expect(hazardAt(s, { x: 4, y: 1 }, 'water')).toBeUndefined();
  });

  it('todo sector sin jefe, salvo el de la Poción de Fuerza asegurada, tiene parches de precipicio', () => {
    let eligible = 0;
    let withChasm = 0;
    for (let seed = 1; seed <= 25; seed++) {
      for (const floor of [1, 2, 4, 5]) {
        const lv = generateLevel({ seed, floor });
        const strengthFloor = strengthFloorOfPhase(seed, floor) === floor;
        if (strengthFloor) {
          expect(lv.map.tiles.includes('chasm'), `semilla ${seed} sector ${floor}: saltar te haría perder la poción`).toBe(false);
          continue;
        }
        eligible++;
        if (lv.map.tiles.includes('chasm')) withChasm++;
      }
    }
    expect(withChasm / eligible).toBeGreaterThan(0.9);
  });

  it('el botín del suelo es escaso: de 3 a 5 objetos por sector', () => {
    expect(BALANCE.level.groundItems).toEqual({ min: 3, max: 5 });
    let sum = 0;
    for (let seed = 1; seed <= 20; seed++) sum += generateLevel({ seed, floor: 2 }).drops.length;
    expect(sum / 20).toBeLessThan(12);
  });
});

describe('Garra de Relámpago (técnica de Rayo de corto alcance)', () => {
  it('es una técnica de Rayo que se aprende: carrera de 3 casillas, ignora la defensa y aturde; la primera que enseña un maestro', () => {
    const t = TECHNIQUES.garra_de_relampago;
    expect(t.affinity).toBe('rayo');
    expect(t.learnable).toBe(true);
    expect(t.target).toEqual({ kind: 'dash', length: 3 });
    expect(t.damage?.ignoreDefense).toBe(true);
    expect(t.inflict?.status).toBe('aturdido');
    expect(learnableFor('rayo')[0]).toBe('garra_de_relampago');
  });

  it('te desplaza hasta pegarte al enemigo y lo golpea', () => {
    const g = makeGame(['#########', '#@..E...#', '#########'], (s) => {
      s.player.affinity = 'rayo';
      s.player.techniques = ['garra_de_relampago'];
      s.player.kiro = 10;
      s.enemies[0].defense = 5;
      s.enemies[0].affinity = null;
      s.enemies[0].alert = 12;
      s.enemies[0].power = 0;
    });
    const hp = g.enemies[0].hp;
    const r = applyCommand(g, { type: 'UseTechnique', techniqueId: 'garra_de_relampago', target: { x: 4, y: 1 } });
    expect(r.ok).toBe(true);
    const s = r.state;
    expect(s.player.pos).toEqual({ x: 3, y: 1 });
    expect(s.player.kiro).toBe(10 - 4);
    expect(s.enemies[0].hp).toBe(hp - 8); // ignora los 5 de defensa
    expect(r.events.some((e) => e.type === 'StatusApplied' && e.status === 'aturdido' && e.targetId === s.enemies[0].id)).toBe(true);
  });

  it('no llega más allá de 3 casillas', () => {
    const g = makeGame(['##########', '#@...E...#', '##########'], (s) => {
      s.player.affinity = 'rayo';
      s.player.techniques = ['garra_de_relampago'];
      s.enemies[0].alert = 12;
    });
    const s = run(g, { type: 'UseTechnique', techniqueId: 'garra_de_relampago', target: { x: 5, y: 1 } });
    expect(s.player.pos).toEqual({ x: 4, y: 1 }); // avanzó 3, pero el enemigo seguía a una casilla
    expect(s.enemies[0].hp).toBe(g.enemies[0].hp);
  });
});

describe('icono de las técnicas de fusión', () => {
  it('las fusiones tienen un icono propio que mezcla sus dos afinidades; las demás, el de su afinidad', () => {
    expect(techniqueIconId(TECHNIQUES.plasma, 'marea')).toBe('fusion:ascua+rayo');
    expect(techniqueIconId(TECHNIQUES.niebla_de_vapor, 'rayo')).toBe('fusion:ascua+marea');
    expect(techniqueIconId(TECHNIQUES.chispazo, 'ascua')).toBe('rayo');
    expect(techniqueIconId(TECHNIQUES.clon_de_sombra, 'piedra')).toBe('piedra');
    expect(techniqueIconId(undefined, 'marea')).toBe('marea');
  });
});

describe('la partida nueva', () => {
  it('sale sin la Poción de Fuerza identificada y con el sector 1 ya generado con sus charcos', () => {
    const g = createGame({ seed: 4, affinity: 'rayo' });
    expect(g.player.known).not.toContain('pocion:fuerza');
    expect(g.schemaVersion).toBe(12);
    expect(g.hazards.every((h) => h.kind === 'water')).toBe(true);
  });
});
