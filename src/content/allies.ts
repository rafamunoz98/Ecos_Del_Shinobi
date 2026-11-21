import { AFFINITIES, AFFINITY_NAMES } from './affinities';
import { HEROES } from './heroes';
import type { Affinity } from '../core/types';

/** Aliados invocables (técnica Clon de Sombra, pergaminos de invocación): luchan unas rondas y desaparecen. */
export interface AllyDef {
  id: string;
  name: string;
  maxHp: number;
  power: number;
  /** Acciones por ronda. */
  actions: number;
  description: string;
  /** Señuelo: no ataca; los enemigos alertados lo persiguen y golpean en lugar de a ti. */
  decoy?: boolean;
  /** Compañero rescatable: su afinidad (daña con ella y tiene ventaja o desventaja según el enemigo). */
  companion?: Affinity;
}

export const ALLY_KINDS: Record<string, AllyDef> = {
  clon_de_sombra: { id: 'clon_de_sombra', name: 'Clon de sombra', maxHp: 8, power: 3, actions: 1, description: 'Un doble de humo que golpea a tu lado.' },
  sapo_de_piedra: { id: 'sapo_de_piedra', name: 'Sapo de piedra', maxHp: 16, power: 4, actions: 1, description: 'Un sapo enorme y duro como la roca: aguanta y golpea fuerte.' },
  tronco_senuelo: { id: 'tronco_senuelo', name: 'Tronco', maxHp: 10, power: 0, actions: 0, decoy: true, description: 'Un tronco con tu aspecto: los enemigos que te persiguen se ensañan con él.' },
  cuervo_aliado: { id: 'cuervo_aliado', name: 'Cuervo mensajero', maxHp: 6, power: 3, actions: 2, description: 'Un cuervo veloz que se lanza dos veces por ronda.' },
};

/** Un compañero por cada afinidad: son los otros protagonistas (los cinco shinobi originales del juego). */
export const companionKind = (a: Affinity): string => `companero_${a}`;
for (const a of AFFINITIES) {
  ALLY_KINDS[companionKind(a)] = {
    id: companionKind(a),
    name: HEROES[a].name,
    maxHp: 14,
    power: 4,
    actions: 1,
    companion: a,
    description: `${HEROES[a].epithet}: domina ${AFFINITY_NAMES[a]} y lucha a tu lado.`,
  };
}

export function getAllyDef(id: string): AllyDef | undefined {
  return Object.hasOwn(ALLY_KINDS, id) ? ALLY_KINDS[id] : undefined;
}
