import { describe, expect, it } from 'vitest';
import { describeEffects, describeShape, describeWeaponPattern } from '../content/describe';
import { TECHNIQUES } from '../content/techniques';
import { WEAPONS } from '../content/weapons';

describe('textos del menú', () => {
  it('toda técnica tiene forma y efectos no vacíos', () => {
    for (const def of Object.values(TECHNIQUES)) {
      expect(describeShape(def).length, def.id).toBeGreaterThan(8);
      expect(describeEffects(def).length, def.id).toBeGreaterThan(0);
    }
  });
  it('describe los datos reales de la técnica', () => {
    expect(describeEffects(TECHNIQUES.brasa_circular).join(' ')).toContain('Daño 6');
    expect(describeEffects(TECHNIQUES.brasa_circular).join(' ')).toContain('Quemadura 3');
    expect(describeShape(TECHNIQUES.lengua_de_fuego)).toContain('5');
    expect(describeEffects(TECHNIQUES.ola_empujadora).join(' ')).toContain('Empuja 2');
    expect(describeEffects(TECHNIQUES.aguja_resonante).join(' ')).toContain('ignora defensa');
  });
  it('cada arma explica su patrón', () => {
    for (const w of Object.values(WEAPONS)) expect(describeWeaponPattern(w).length).toBeGreaterThan(10);
    expect(describeWeaponPattern(WEAPONS.latigo_de_cadena)).toContain('2');
  });
});
