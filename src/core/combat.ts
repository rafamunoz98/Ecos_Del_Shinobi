import { BALANCE } from '../content/balance';
import { getEquipment } from '../content/items';
import { getWeapon } from '../content/weapons';
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
  return p.power + (w?.bonus ?? 0) + weaponLevel(p, w?.id) * BALANCE.forge.bonusPerLevel;
}

/** Defensa base + vestimenta + estado "protegido". */
export function effectiveDefense(p: Player): number {
  const protectedBonus = p.statuses.some((s) => s.id === 'protegido') ? BALANCE.protectedDefense : 0;
  return p.defense + (getEquipment(p.equipment.armor)?.bonus ?? 0) + protectedBonus;
}

/** Experiencia necesaria para pasar del nivel dado al siguiente. */
export function xpToNext(level: number): number {
  return BALANCE.xpBase * level;
}
