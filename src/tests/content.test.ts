import { describe, expect, it } from 'vitest';
import { AFFINITIES } from '../content/affinities';
import { ENEMIES } from '../content/enemies';
import { EQUIPMENT, ITEMS, LOOT_TABLE } from '../content/items';
import { getTechnique, needsAim, TECHNIQUES, techniquesFor } from '../content/techniques';
import { THROWABLES, WEAPONS } from '../content/weapons';

describe('coherencia del contenido', () => {
  it('cada afinidad tiene una técnica de iniciación (nivel 1) y una avanzada (nivel 3)', () => {
    for (const a of AFFINITIES) {
      expect(techniquesFor(a, 1), a).toHaveLength(1);
      expect(techniquesFor(a, 3), a).toHaveLength(2);
    }
  });

  it('los ids coinciden con sus claves y los costes son positivos', () => {
    for (const [k, t] of Object.entries(TECHNIQUES)) {
      expect(t.id).toBe(k);
      expect(t.kiroCost).toBeGreaterThan(0);
      expect(t.description.length).toBeGreaterThan(10);
    }
    for (const [k, e] of Object.entries(ENEMIES)) expect(e.id).toBe(k);
    for (const [k, e] of Object.entries(EQUIPMENT)) expect(e.id).toBe(k);
    for (const [k, e] of Object.entries(WEAPONS)) expect(e.id).toBe(k);
    for (const [k, e] of Object.entries(THROWABLES)) expect(e.id).toBe(k);
  });

  it('la tabla de botín solo referencia contenido existente', () => {
    const table = { item: ITEMS, equipment: EQUIPMENT, weapon: WEAPONS, throwable: THROWABLES } as const;
    for (const e of LOOT_TABLE) expect(table[e.kind][e.id], e.id).toBeDefined();
    expect(LOOT_TABLE.some((e) => e.minFloor === 1)).toBe(true);
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
