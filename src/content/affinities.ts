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
