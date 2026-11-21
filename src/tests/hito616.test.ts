import { describe, expect, it } from 'vitest';
import { itemName } from '../content/names';
import { MANUAL_FUSION } from '../content/items';
import { MERCHANT_KIND, SHOP_PRICES } from '../content/shop';
import { FUSION_IDS, TECHNIQUES, fusionFor, learnableFor, techniqueAffinity, techniquesFor } from '../content/techniques';
import { ADVANTAGE, beats, companionAffinityFor, scaleDamage, weakTo } from '../content/affinities';
import { companionKind, getAllyDef } from '../content/allies';
import { BALANCE } from '../content/balance';
import { DIALOGUES, captiveKind, getNpc, isCaptiveKind } from '../content/story';
import { applyCommand, MANUAL_PREFIX } from '../core/engine';
import type { Affinity, Command, GameState } from '../core/types';
import { generateLevel, reachableCount } from '../dungeon/generator';
import { attack, makeGame, setTile } from './helpers';

const AFFS: Affinity[] = ['ascua', 'marea', 'vendaval', 'piedra', 'rayo'];
const run = (g: GameState, ...cmds: Command[]): GameState => {
  let s = g;
  for (const c of cmds) {
    const r = applyCommand(s, c);
    expect(r.ok, `${JSON.stringify(c)} → ${r.message ?? ''} ${r.reason ?? ''}`).toBe(true);
    s = r.state;
  }
  return s;
};

describe('técnicas de fusión: contenido', () => {
  it('hay una por cada pareja de afinidades (10), todas distintas y con descripción', () => {
    expect(FUSION_IDS).toHaveLength(10);
    const seen = new Set<string>();
    for (const id of FUSION_IDS) {
      const t = TECHNIQUES[id];
      expect(t.fusion).toHaveLength(2);
      expect(t.fusion?.[0]).not.toBe(t.fusion?.[1]);
      seen.add([...(t.fusion ?? [])].sort().join('+'));
      expect(t.description.length).toBeGreaterThan(20);
      expect(t.affinity).toBeNull();
      expect(techniqueAffinity(t)).toBe(t.fusion?.[0]);
    }
    expect(seen.size).toBe(10);
  });

  it('fusionFor encuentra la pareja en cualquier orden y no existe con una sola afinidad', () => {
    for (const a of AFFS) {
      expect(fusionFor(a, null)).toBeUndefined();
      expect(fusionFor(a, a)).toBeUndefined();
      for (const b of AFFS) if (a !== b) expect(fusionFor(a, b)).toBe(fusionFor(b, a));
    }
    expect(fusionFor('ascua', 'rayo')?.id).toBe('plasma');
  });

  it('no salen por nivel ni entre las técnicas que enseña un manual corriente: se desbloquean aparte', () => {
    for (const a of AFFS) {
      for (const id of FUSION_IDS) {
        expect(techniquesFor(a, 99)).not.toContain(id);
        expect(learnableFor(a)).not.toContain(id);
      }
    }
  });
});

describe('técnicas de fusión: uso', () => {
  const cast = (id: string): Command => ({ type: 'UseTechnique', techniqueId: id, target: { x: 1, y: 1 } });

  it('solo las lanza quien domina las DOS afinidades', () => {
    const mk = (aff2: Affinity | null) =>
      makeGame(['########', '#@E....#', '########'], (g) => {
        g.player.techniques = ['torbellino_de_fuego'];
        g.player.affinity2 = aff2;
        g.player.kiro = g.player.maxKiro = 20;
      });
    expect(applyCommand(mk(null), cast('torbellino_de_fuego')).ok).toBe(false);
    expect(applyCommand(mk('marea'), cast('torbellino_de_fuego')).ok).toBe(false);
    expect(applyCommand(mk('vendaval'), cast('torbellino_de_fuego')).ok).toBe(true);
  });

  it('el daño cuenta como de ambas afinidades: gana si CUALQUIERA vence al enemigo', () => {
    const dmg = (enemyAff: Affinity | null): number => {
      const s = makeGame(['########', '#@.E...#', '########'], (g) => {
        g.player.techniques = ['plasma'];
        g.player.affinity2 = 'rayo';
        g.player.kiro = g.player.maxKiro = 20;
        g.enemies[0].affinity = enemyAff;
        g.enemies[0].aggroRange = 0;
        g.enemies[0].power = 0;
        g.enemies[0].maxHp = g.enemies[0].hp = 60;
      });
      const r = applyCommand(s, { type: 'UseTechnique', techniqueId: 'plasma', target: { x: 3, y: 1 } });
      expect(r.ok).toBe(true);
      return 60 - r.state.enemies[0].hp;
    };
    const base = dmg(null);
    expect(base).toBe(10); // poder 10 ignorando defensa
    expect(dmg('vendaval')).toBe(scaleDamage(base, ADVANTAGE)); // Ascua vence a Vendaval
    expect(dmg('marea')).toBe(scaleDamage(base, ADVANTAGE)); // Marea resiste a Ascua, pero Rayo la vence: se queda con lo mejor
  });
});

describe('técnicas de fusión: reacciones con el terreno', () => {
  const mk = (tech: string, aff2: Affinity, rows: string[], tweak?: (g: GameState) => void, aff: Affinity = 'ascua') =>
    makeGame(rows, (g) => {
      g.player.techniques = [tech];
      g.player.affinity2 = aff2;
      g.player.kiro = g.player.maxKiro = 20;
      tweak?.(g);
    }, { affinity: aff });

  it('Tormenta Eléctrica moja el suelo y lo electrifica a la vez (marea + rayo)', () => {
    const s = mk('tormenta_electrica', 'rayo', ['#########', '#@......#', '#.......#', '#########'], (g) => {
      g.enemies = [];
    }, 'marea');
    const r = applyCommand(s, { type: 'UseTechnique', techniqueId: 'tormenta_electrica', target: { x: 5, y: 1 } });
    expect(r.ok).toBe(true);
    expect(r.state.hazards.some((h) => h.kind === 'water')).toBe(true);
    expect(r.state.hazards.some((h) => h.kind === 'shock')).toBe(true);
  });

  it('Torbellino de Fuego prende los arbustos de alrededor (ascua + viento)', () => {
    const s = mk('torbellino_de_fuego', 'vendaval', ['#########', '#@b.....#', '#.......#', '#########'], (g) => {
      g.enemies = [];
      setTile(g, 2, 1, 'bush');
    });
    const r = applyCommand(s, { type: 'UseTechnique', techniqueId: 'torbellino_de_fuego', target: s.player.pos });
    expect(r.ok, r.message).toBe(true);
    expect(r.state.hazards.some((h) => h.kind === 'fire')).toBe(true);
  });

  it('Yunque del Trueno derriba el muro agrietado de al lado (roca + rayo)', () => {
    const s = mk('yunque_del_trueno', 'rayo', ['#######', '#@x...#', '#######'], (g) => {
      g.enemies = [];
    }, 'piedra');
    expect(s.map.tiles[1 * s.map.width + 2]).toBe('cracked');
    const r = applyCommand(s, { type: 'UseTechnique', techniqueId: 'yunque_del_trueno', target: s.player.pos });
    expect(r.ok, r.message).toBe(true);
    expect(r.state.map.tiles[1 * r.state.map.width + 2]).toBe('floor');
  });
});

describe('Manual de Fusión', () => {
  const ready = (aff2: Affinity | null = 'rayo') =>
    makeGame(['########', '#@.....#', '########'], (g) => {
      g.player.affinity2 = aff2;
      g.drops = [{ pos: { x: 2, y: 1 }, itemId: MANUAL_FUSION, count: 1 }];
    });

  it('al recogerlo se convierte en el manual de la fusión de TUS dos afinidades y se estudia desde el inventario', () => {
    const s = run(ready(), { type: 'Move', dx: 1, dy: 0 });
    expect(s.player.inventory[`${MANUAL_PREFIX}plasma`]).toBe(1);
    const learned = run(s, { type: 'UseItem', itemId: `${MANUAL_PREFIX}plasma` });
    expect([...learned.player.techniques, ...learned.player.grimoire]).toContain('plasma');
    expect(learned.player.inventory[`${MANUAL_PREFIX}plasma`] ?? 0).toBe(0);
  });

  it('sin segunda afinidad, o si ya la dominas, se desmonta en esquirlas', () => {
    const s = run(ready(null), { type: 'Move', dx: 1, dy: 0 });
    expect(s.player.shards).toBe(3);
    expect(Object.keys(s.player.inventory).some((k) => k.startsWith(MANUAL_PREFIX))).toBe(false);
    const again = ready();
    again.player.grimoire.push('plasma');
    const t = run(again, { type: 'Move', dx: 1, dy: 0 });
    expect(t.player.shards).toBe(3);
  });

  it('tiene nombre propio', () => {
    expect(itemName(MANUAL_FUSION)).toBe('Manual de fusión');
    expect(itemName(`${MANUAL_PREFIX}plasma`)).toContain('Plasma');
  });

  it('el mercader del primer jefe la vende en cuanto eliges la segunda afinidad (y no la repite si ya la tienes)', () => {
    const s = makeGame(['#########', '#@B...>.#', '#.......#', '#########'], (g) => {
      g.enemies[0].hp = 1;
      g.maxFloor = 6;
      g.floor = 3;
      g.player.coins = 200;
    });
    const dead = applyCommand(s, attack({ x: 2, y: 1 })).state;
    const merchant0 = dead.npcs.find((n) => n.kind === MERCHANT_KIND);
    expect(merchant0?.stock?.some((o) => o.itemId.startsWith(MANUAL_PREFIX) && TECHNIQUES[o.itemId.slice(MANUAL_PREFIX.length)]?.fusion)).toBe(false); // aún no hay pareja
    const chosen = run(dead, { type: 'ChooseAffinity', affinity: (dead.affinityOffer as Affinity[])[0] });
    const fusion = fusionFor(chosen.player.affinity, chosen.player.affinity2);
    expect(fusion).toBeDefined();
    const m = chosen.npcs.find((n) => n.kind === MERCHANT_KIND);
    const offer = m?.stock?.find((o) => o.itemId === `${MANUAL_PREFIX}${fusion?.id}`);
    expect(offer).toBeDefined();
    expect(offer?.price).toBe(SHOP_PRICES.fusion);
    expect(m?.stock?.filter((o) => o.itemId === `${MANUAL_PREFIX}${fusion?.id}`)).toHaveLength(1);
  });

  it('las bibliotecas ocultas de los sectores 4+ guardan uno, y las anteriores no', () => {
    let found = 0;
    for (let seed = 1; seed <= 60 && found < 3; seed++) {
      for (const floor of [2, 4, 5]) {
        const lvl = generateLevel({ seed, floor });
        if (lvl.secretKind !== 'biblioteca') continue;
        const has = lvl.drops.some((d) => d.itemId === MANUAL_FUSION);
        expect(has, `semilla ${seed} sector ${floor}`).toBe(floor >= 4);
        if (floor >= 4) found += 1;
      }
    }
    expect(found).toBeGreaterThan(0);
  });
});

// ---------- Compañero ----------

describe('compañero único', () => {
  const captiveRoom = (pcAff: Affinity = 'ascua') =>
    makeGame(['########', '#@.....#', '#......#', '########'], (g) => {
      g.npcs = [{ id: 'npc-c', kind: captiveKind(companionAffinityFor(pcAff)), pos: { x: 2, y: 1 }, used: false }];
    }, { affinity: pcAff });

  it('hay un prisionero por afinidad, con diálogo y una única opción: liberar', () => {
    for (const a of AFFS) {
      const def = getNpc(captiveKind(a));
      expect(def?.options).toHaveLength(1);
      expect(DIALOGUES[def?.introId ?? '']?.lines.length).toBeGreaterThan(2);
      expect(DIALOGUES[def?.afterId ?? '']).toBeDefined();
      expect(getAllyDef(companionKind(a))?.companion).toBe(a);
    }
  });

  it('el sector 2 genera el prisionero de la afinidad que cubre tu debilidad (y nunca en otros sectores)', () => {
    for (const a of AFFS) {
      const lvl = generateLevel({ seed: 5, floor: 2, companion: companionAffinityFor(a) });
      const cap = lvl.npcs.filter((n) => isCaptiveKind(n.kind));
      expect(cap).toHaveLength(1);
      expect(cap[0].kind).toBe(captiveKind(companionAffinityFor(a)));
      expect(beats(companionAffinityFor(a), weakTo(a))).toBe(true); // vence a quien te vence
    }
    expect(generateLevel({ seed: 5, floor: 2 }).npcs.some((n) => isCaptiveKind(n.kind))).toBe(false);
    expect(generateLevel({ seed: 5, floor: 1 }).npcs.some((n) => isCaptiveKind(n.kind))).toBe(false);
  });

  it('el prisionero nunca corta el camino ni se coloca sobre otra cosa (30 semillas)', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const lvl = generateLevel({ seed, floor: 2, companion: 'rayo' });
      const cap = lvl.npcs.find((n) => isCaptiveKind(n.kind));
      expect(cap, `semilla ${seed}`).toBeDefined();
      if (!cap) continue;
      expect(lvl.enemies.some((e) => e.pos.x === cap.pos.x && e.pos.y === cap.pos.y)).toBe(false);
      expect(lvl.chests.some((c) => c.pos.x === cap.pos.x && c.pos.y === cap.pos.y)).toBe(false);
      expect(lvl.npcs.filter((n) => n.pos.x === cap.pos.x && n.pos.y === cap.pos.y)).toHaveLength(1);
      const blocked = new Set<number>([cap.pos.y * lvl.map.width + cap.pos.x]);
      expect(reachableCount(lvl.map, lvl.playerStart, blocked)).toBe(reachableCount(lvl.map, lvl.playerStart) - 1);
    }
  });

  it('el generador es el de siempre cuando no hay compañero, y el resto del sector no cambia con él', () => {
    const a = generateLevel({ seed: 9, floor: 2 });
    const b = generateLevel({ seed: 9, floor: 2, companion: 'marea' });
    expect(b.map.tiles).toEqual(a.map.tiles);
    expect(b.enemies).toEqual(a.enemies);
    expect(b.chests).toEqual(a.chests);
    expect(b.drops).toEqual(a.drops);
    expect(b.npcs.filter((n) => !isCaptiveKind(n.kind))).toEqual(a.npcs);
  });

  it('liberarlo: se une a tu lado, el prisionero desaparece y no puedes llevar otro', () => {
    const s = captiveRoom();
    const talked = applyCommand(s, { type: 'Interact', target: { x: 2, y: 1 } });
    expect(talked.state.turn).toBe(s.turn); // hablar es gratis
    const r = applyCommand(s, { type: 'Choose', npcId: 'npc-c', optionId: 'liberar' });
    expect(r.ok).toBe(true);
    expect(r.state.companion).toMatchObject({ affinity: 'rayo', downed: false });
    expect(r.state.allies.some((a) => a.companion && a.kind === companionKind('rayo'))).toBe(true);
    expect(r.state.npcs.some((n) => isCaptiveKind(n.kind))).toBe(false);
    expect(r.events.some((e) => e.type === 'CompanionJoined')).toBe(true);
    // Un segundo prisionero ya no se puede liberar.
    const again = makeGame(['########', '#@.....#', '########'], (g) => {
      g.companion = { affinity: 'rayo', hp: 10, downed: false };
      g.npcs = [{ id: 'npc-d', kind: captiveKind('marea'), pos: { x: 2, y: 1 }, used: false }];
    });
    expect(applyCommand(again, { type: 'Choose', npcId: 'npc-d', optionId: 'liberar' }).ok).toBe(false);
  });

  const withMate = (enemyAff: Affinity | null, mateAff: Affinity = 'rayo') =>
    makeGame(['########', '#@E....#', '#......#', '########'], (g) => {
      g.companion = { affinity: mateAff, hp: 20, downed: false };
      g.allies = [{ id: 'ally-companion', kind: companionKind(mateAff), pos: { x: 2, y: 2 }, hp: 20, maxHp: 20, power: 4, turns: 999999, companion: true }];
      g.enemies[0].affinity = enemyAff;
      g.enemies[0].maxHp = g.enemies[0].hp = 80;
      g.enemies[0].power = 0;
    });

  it('golpea con su afinidad: ×1,5 contra quien le es débil, ×0,75 contra quien la vence', () => {
    const dmg = (aff: Affinity | null): number => 80 - applyCommand(withMate(aff), { type: 'Wait' }).state.enemies[0].hp;
    const base = dmg(null);
    expect(base).toBeGreaterThan(0);
    expect(dmg('marea')).toBe(scaleDamage(base, ADVANTAGE)); // Rayo vence a Marea
    expect(dmg('piedra')).toBe(scaleDamage(base, 0.75)); // Piedra vence a Rayo
  });

  it('al caer no muere: queda fuera de combate y vuelve al cruzar la escalera con la mitad de su vida', () => {
    const s = makeGame(['#########', '#@..>...#', '#.......#', '#########'], (g) => {
      g.maxFloor = 6;
      g.enemies = [];
      g.companion = { affinity: 'rayo', hp: 1, downed: false };
      g.allies = [{ id: 'ally-companion', kind: companionKind('rayo'), pos: { x: 1, y: 2 }, hp: 0, maxHp: 20, power: 4, turns: 999999, companion: true }];
    });
    const reaped = applyCommand(s, { type: 'Wait' }).state;
    expect(reaped.allies.some((a) => a.companion)).toBe(false);
    expect(reaped.companion?.downed).toBe(true);
    expect(reaped.log.join(' ')).toContain('no está muerto');
    // Cruza la escalera: reaparece.
    const next = structuredClone(reaped);
    next.player.pos = { x: 3, y: 1 };
    const down = applyCommand(next, { type: 'Interact', target: { x: 4, y: 1 } });
    expect(down.ok).toBe(true);
    const mate = down.state.allies.find((a) => a.companion);
    expect(mate).toBeDefined();
    expect(mate?.hp).toBe(Math.ceil((mate?.maxHp ?? 0) / 2));
    expect(down.state.companion?.downed).toBe(false);
  });

  it('si sigue vivo, cruza contigo y recupera algo de vida; su vida máxima crece con tu nivel', () => {
    const s = makeGame(['#########', '#@..>...#', '#.......#', '#########'], (g) => {
      g.maxFloor = 6;
      g.enemies = [];
      g.companion = { affinity: 'piedra', hp: 5, downed: false };
      g.allies = [{ id: 'ally-companion', kind: companionKind('piedra'), pos: { x: 1, y: 2 }, hp: 5, maxHp: 16, power: 4, turns: 999999, companion: true }];
      g.player.pos = { x: 3, y: 1 };
      g.player.level = 4;
    });
    const down = applyCommand(s, { type: 'Interact', target: { x: 4, y: 1 } }).state;
    const mate = down.allies.find((a) => a.companion);
    expect(mate?.maxHp).toBe(BALANCE.companion.baseHp + BALANCE.companion.hpPerLevel * 4);
    expect(mate?.hp).toBeGreaterThan(5);
  });
});
