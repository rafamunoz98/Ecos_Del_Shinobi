import { describe, expect, it } from 'vitest';
import { RANDOM_POTION, RANDOM_SCROLL } from '../content/arcana';
import { AFFINITIES } from '../content/affinities';
import { ENEMIES } from '../content/enemies';
import { ALL_LOOT_TABLES, CURRENCY, EQUIPMENT, KEYS, MANUAL_ITEM } from '../content/items';
import { getTechnique, learnableFor, needsAim, TECHNIQUES, techniquesFor } from '../content/techniques';
import { THROWABLES, WEAPONS } from '../content/weapons';

describe('coherencia del contenido', () => {
  it('cada afinidad desbloquea 5 técnicas por nivel (una por nivel) y ofrece al menos 3 aprendibles', () => {
    for (const a of AFFINITIES) {
      expect(techniquesFor(a, 1), a).toHaveLength(1);
      expect(techniquesFor(a, 3), a).toHaveLength(3);
      expect(techniquesFor(a, 5), a).toHaveLength(5);
      expect(techniquesFor(a, 9), a).toHaveLength(5);
      expect(learnableFor(a).length, a).toBeGreaterThanOrEqual(3);
    }
  });

  it('los ids coinciden con sus claves y los costes son positivos', () => {
    for (const [k, t] of Object.entries(TECHNIQUES)) {
      expect(t.id).toBe(k);
      expect(t.kiroCost).toBeGreaterThanOrEqual(0);
      expect(t.description.length).toBeGreaterThan(10);
    }
    for (const [k, e] of Object.entries(ENEMIES)) expect(e.id).toBe(k);
    for (const [k, e] of Object.entries(EQUIPMENT)) expect(e.id).toBe(k);
    for (const [k, e] of Object.entries(WEAPONS)) expect(e.id).toBe(k);
    for (const [k, e] of Object.entries(THROWABLES)) expect(e.id).toBe(k);
  });

  it('la tabla de botín solo referencia contenido existente', () => {
    const table: Record<string, Record<string, unknown>> = {
      item: { [MANUAL_ITEM]: true, [RANDOM_POTION]: true, [RANDOM_SCROLL]: true },
      equipment: EQUIPMENT,
      weapon: WEAPONS,
      throwable: THROWABLES,
      coins: CURRENCY,
      shards: CURRENCY,
    };
    for (const loot of ALL_LOOT_TABLES) {
      for (const e of loot) expect(table[e.kind][e.id], e.id).toBeDefined();
      expect(loot.some((e) => e.minFloor === 1)).toBe(true);
    }
    expect(Object.keys(KEYS)).toEqual(['llave_hierro', 'llave_laca']);
  });

  it('getTechnique no confunde claves heredadas del prototipo de Object', () => {
    expect(getTechnique('toString')).toBeUndefined();
    expect(getTechnique('__proto__')).toBeUndefined();
  });

  it('las técnicas con objetivo se apuntan; las de uno mismo o ráfaga, no', () => {
    expect(needsAim(TECHNIQUES.brasa_circular)).toBe(true);
    expect(needsAim(TECHNIQUES.corte_de_aire)).toBe(true);
    expect(needsAim(TECHNIQUES.velo_de_corriente)).toBe(false);
    expect(needsAim(TECHNIQUES.golpe_sismico)).toBe(false);
  });
});
