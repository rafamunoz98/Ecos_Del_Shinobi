import { BALANCE } from '../content/balance';
import { getMod } from '../content/enchants';
import { getEquipment } from '../content/items';
import { getWeapon } from '../content/weapons';
import { wornEffects } from '../content/trinkets';
import type { Player } from './types';

/** Fórmula inicial del documento de reglas: daño = max(1, poder + bonificación - defensa). */
export function calcDamage(power: number, bonus: number, defense: number): number {
  return Math.max(1, power + bonus - defense);
}

/** Nivel de mejora de forja de un arma (0 si nunca se mejoró). */
export function weaponLevel(p: Player, weaponId: string | null | undefined): number {
  return weaponId ? (p.weaponLevels[weaponId] ?? 0) : 0;
}

/** Poder base + bonificación del arma equipada + mejoras de forja. */
export function effectivePower(p: Player): number {
  const w = getWeapon(p.equipment.weapon);
  const boosted = p.statuses.some((s) => s.id === 'potenciado') ? BALANCE.potentiatedPower : 0;
  const mod = getMod(p.equipment.weapon)?.power ?? 0;
  return Math.max(1, p.power + (w?.bonus ?? 0) + weaponLevel(p, p.equipment.weapon) * BALANCE.forge.bonusPerLevel + boosted + mod + (wornEffects(p.equipment).power ?? 0));
}

/** Defensa base + vestimenta + estado "protegido". */
export function effectiveDefense(p: Player): number {
  const protectedBonus = p.statuses.some((s) => s.id === 'protegido') ? BALANCE.protectedDefense : 0;
  const mod = getMod(p.equipment.armor)?.defense ?? 0;
  return Math.max(0, p.defense + (getEquipment(p.equipment.armor)?.bonus ?? 0) + protectedBonus + mod + (wornEffects(p.equipment).defense ?? 0));
}

/** Experiencia necesaria para pasar del nivel dado al siguiente. */
export function xpToNext(level: number): number {
  return BALANCE.xpBase * level;
}

/** Fuerza total del jugador: la base más lo que den las joyas que lleva puestas. */
export function strengthOf(p: Player): number {
  return Math.max(0, p.strength + (wornEffects(p.equipment).strength ?? 0));
}

/** Fuerza que exige un arma: la base menos un punto por nivel de forja (nunca menos de 1). Los puños no exigen nada. */
export function weaponReq(p: Player, weaponId: string): number {
  const w = getWeapon(weaponId);
  if (!w) return 0;
  return Math.max(1, w.req - weaponLevel(p, weaponId));
}

/** ¿Tiene fuerza para empuñarla? */
export function canWield(p: Player, weaponId: string): boolean {
  return strengthOf(p) >= weaponReq(p, weaponId);
}
