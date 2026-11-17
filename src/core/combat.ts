import { BALANCE } from '../content/balance';
import { getEquipment } from '../content/items';
import { getWeapon } from '../content/weapons';
import type { Player } from './types';

/** Fórmula inicial del documento de reglas: daño = max(1, poder + bonificación - defensa). */
export function calcDamage(power: number, bonus: number, defense: number): number {
  return Math.max(1, power + bonus - defense);
}

/** Poder base + bonificación del arma equipada. */
export function effectivePower(p: Player): number {
  return p.power + (getWeapon(p.equipment.weapon)?.bonus ?? 0);
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
