import type { Affinity } from '../core/types';

export const AFFINITIES: readonly Affinity[] = ['ascua', 'marea', 'vendaval', 'piedra', 'rayo'];

/** Qué ofrece cada afinidad (para elegir la segunda). */
export const AFFINITY_BLURB: Record<Affinity, string> = {
  ascua: 'Daño y zonas persistentes: fuego que prende a todo lo que toca.',
  marea: 'Control, protección y curación: agua que cura, empuja y ralentiza.',
  vendaval: 'Alcance y movilidad: cortes de viento, saltos y torbellinos.',
  piedra: 'Defensa, terreno y aturdimiento: muros, rocas y temblores.',
  rayo: 'Precisión e interrupción: descargas que ignoran la defensa.',
};

export const AFFINITY_NAMES: Record<Affinity, string> = {
  ascua: 'Ascua',
  marea: 'Marea',
  vendaval: 'Vendaval',
  piedra: 'Piedra',
  rayo: 'Rayo',
};

/*
 * Ciclo de afinidades. Cada una gana a otra y pierde contra otra (una sola de cada, para poder aprenderlo):
 *   Marea apaga a Ascua → Ascua consume a Vendaval → Vendaval erosiona a Piedra → Piedra descarga a Rayo → Rayo recorre a Marea.
 * «Gana» = sus técnicas hacen ×1,5 de daño al enemigo de la afinidad vencida (y ×0,75 si es al revés); el enemigo de la
 * afinidad que te vence te hace ×1,5 de daño a ti. Tu afinidad de nacimiento es la que cuenta como tu debilidad.
 */
export const AFFINITY_BEATS: Record<Affinity, Affinity> = {
  marea: 'ascua',
  ascua: 'vendaval',
  vendaval: 'piedra',
  piedra: 'rayo',
  rayo: 'marea',
};

/** ¿`a` gana a `b`? */
export const beats = (a: Affinity | null | undefined, b: Affinity | null | undefined): boolean => Boolean(a && b && AFFINITY_BEATS[a] === b);

/** La afinidad que vence a `a` (su debilidad). */
export const weakTo = (a: Affinity): Affinity => AFFINITIES.find((x) => AFFINITY_BEATS[x] === a) as Affinity;

/** A quién vence `a`. */
export const strongVs = (a: Affinity): Affinity => AFFINITY_BEATS[a];

/** Afinidad del compañero que cubre tu debilidad: la que vence a la que te vence. */
export const companionAffinityFor = (a: Affinity): Affinity => weakTo(weakTo(a));

export const ADVANTAGE = 1.5;
export const RESISTANCE = 0.75;

/** Multiplicador del daño de un ataque con estas afinidades (varias si es una fusión) contra una afinidad defensora. */
export function affinityFactor(attack: readonly (Affinity | null | undefined)[], defender: Affinity | null | undefined): number {
  const list = attack.filter((a): a is Affinity => Boolean(a));
  if (list.length === 0 || !defender) return 1;
  if (list.some((a) => beats(a, defender))) return ADVANTAGE;
  if (list.every((a) => beats(defender, a))) return RESISTANCE;
  return 1;
}

/** Aplica un multiplicador de afinidad a un daño ya calculado (mínimo 1). */
export const scaleDamage = (dmg: number, factor: number): number => (factor === 1 ? dmg : Math.max(1, Math.round(dmg * factor)));

export const AFFINITY_ICON: Record<Affinity, string> = { ascua: '🔥', marea: '💧', vendaval: '🌪', piedra: '⛰', rayo: '⚡' };
