import type { Affinity } from '../core/types';

export const AFFINITIES: readonly Affinity[] = ['ascua', 'marea', 'vendaval', 'piedra', 'rayo'];

export const AFFINITY_NAMES: Record<Affinity, string> = {
  ascua: 'Ascua',
  marea: 'Marea',
  vendaval: 'Vendaval',
  piedra: 'Piedra',
  rayo: 'Rayo',
};
