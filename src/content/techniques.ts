import type { Affinity, StatusId } from '../core/types';

export interface TechniqueDef {
  id: string;
  name: string;
  affinity: Affinity | null;
  kiroCost: number;
  /** Distancia máxima (Manhattan) del jugador al centro del área. */
  range: number;
  requiresLineOfSight: boolean;
  /** Radio Manhattan del área alrededor del objetivo. */
  areaRadius: number;
  power: number;
  applies?: { status: StatusId; turns: number };
  description: string;
}

export const TECHNIQUES: Record<string, TechniqueDef> = {
  brasa_circular: {
    id: 'brasa_circular',
    name: 'Brasa Circular',
    affinity: 'ascua',
    kiroCost: 3,
    range: 4,
    requiresLineOfSight: true,
    areaRadius: 1,
    power: 6,
    applies: { status: 'quemadura', turns: 3 },
    description: 'Estalla una brasa en la casilla elegida y a su alrededor; los alcanzados arden.',
  },
};

export function getTechnique(id: string): TechniqueDef | undefined {
  return Object.hasOwn(TECHNIQUES, id) ? TECHNIQUES[id] : undefined;
}
