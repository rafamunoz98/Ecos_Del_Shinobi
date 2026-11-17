import type { Affinity, StatusId } from '../core/types';

/**
 * Forma de la técnica (cómo se apunta y qué casillas afecta):
 *  area     centrada en una casilla visible dentro del alcance; areaRadius 0 = una casilla.
 *  line     desde el jugador en línea recta (arriba/abajo/izquierda/derecha), hasta `length`, parando en obstáculos.
 *  burst    explosión alrededor del jugador, sin apuntar.
 *  self     solo el jugador, sin apuntar.
 *  blink    desplazamiento instantáneo del jugador a una casilla libre visible.
 *  barrier  tres casillas en perpendicular a la dirección de lanzamiento, alrededor del objetivo.
 */
export type TechniqueTarget =
  | { kind: 'area'; range: number; areaRadius: number; lineOfSight: boolean }
  | { kind: 'line'; length: number }
  | { kind: 'burst'; radius: number }
  | { kind: 'self' }
  | { kind: 'blink'; range: number }
  | { kind: 'barrier'; range: number };

export interface TechniqueDef {
  id: string;
  name: string;
  affinity: Affinity | null;
  /** Nivel del jugador al que se aprende (1 = de iniciación). */
  minLevel: number;
  kiroCost: number;
  target: TechniqueTarget;
  /** Daño = max(1, power + bonus de nivel - defensa); con ignoreDefense no resta defensa. */
  damage?: { power: number; ignoreDefense?: boolean };
  /** Estado que reciben los enemigos alcanzados. */
  inflict?: { status: StatusId; turns: number };
  /** Estado que recibe el jugador al lanzarla. */
  selfStatus?: { status: StatusId; turns: number };
  /** Casillas que empuja a los alcanzados, alejándolos del jugador. */
  push?: number;
  /** Turnos que dura cada casilla de barrera. */
  barrierTurns?: number;
  description: string;
}

/*
 * Cada afinidad tiene una técnica de iniciación (nivel 1) y una avanzada (nivel 3), con identidades distintas:
 *  Ascua    daño y zonas persistentes  → área que quema / línea que quema
 *  Marea    control y protección       → defensa propia / empuje
 *  Vendaval alcance y movilidad        → corte largo / desplazamiento
 *  Piedra   defensa y terreno          → barrera / sacudida aturdidora
 *  Rayo     precisión e interrupción   → aguja que aturde / descarga que ignora defensa
 */
export const TECHNIQUES: Record<string, TechniqueDef> = {
  brasa_circular: {
    id: 'brasa_circular',
    name: 'Brasa Circular',
    affinity: 'ascua',
    minLevel: 1,
    kiroCost: 3,
    target: { kind: 'area', range: 4, areaRadius: 1, lineOfSight: true },
    damage: { power: 6 },
    inflict: { status: 'quemadura', turns: 3 },
    description: 'Estalla una brasa en la casilla elegida y a su alrededor; los alcanzados arden.',
  },
  lengua_de_fuego: {
    id: 'lengua_de_fuego',
    name: 'Lengua de Fuego',
    affinity: 'ascua',
    minLevel: 3,
    kiroCost: 4,
    target: { kind: 'line', length: 5 },
    damage: { power: 8 },
    inflict: { status: 'quemadura', turns: 2 },
    description: 'Una ráfaga de llamas recorre una línea recta y prende a todo lo que toca.',
  },
  velo_de_corriente: {
    id: 'velo_de_corriente',
    name: 'Velo de Corriente',
    affinity: 'marea',
    minLevel: 1,
    kiroCost: 2,
    target: { kind: 'self' },
    selfStatus: { status: 'protegido', turns: 4 },
    description: 'Una corriente fina te envuelve: +2 de defensa durante 3 rondas.',
  },
  ola_empujadora: {
    id: 'ola_empujadora',
    name: 'Ola Empujadora',
    affinity: 'marea',
    minLevel: 3,
    kiroCost: 3,
    target: { kind: 'line', length: 4 },
    damage: { power: 3 },
    push: 2,
    description: 'Una ola golpea en línea y empuja 2 casillas; chocar con un obstáculo duele más.',
  },
  corte_de_aire: {
    id: 'corte_de_aire',
    name: 'Corte de Aire',
    affinity: 'vendaval',
    minLevel: 1,
    kiroCost: 2,
    target: { kind: 'line', length: 6 },
    damage: { power: 5 },
    description: 'Un tajo de viento recorre una línea larga y hiere a todos los que encuentra.',
  },
  paso_de_rafaga: {
    id: 'paso_de_rafaga',
    name: 'Paso de Ráfaga',
    affinity: 'vendaval',
    minLevel: 3,
    kiroCost: 2,
    target: { kind: 'blink', range: 4 },
    description: 'Una ráfaga te lleva al instante a una casilla libre que veas, hasta 4 de distancia.',
  },
  muro_de_pizarra: {
    id: 'muro_de_pizarra',
    name: 'Muro de Pizarra',
    affinity: 'piedra',
    minLevel: 1,
    kiroCost: 3,
    target: { kind: 'barrier', range: 4 },
    barrierTurns: 6,
    description: 'Alza un muro de tres casillas durante 6 rondas. Nadie pasa, tampoco los enemigos.',
  },
  golpe_sismico: {
    id: 'golpe_sismico',
    name: 'Golpe Sísmico',
    affinity: 'piedra',
    minLevel: 3,
    kiroCost: 4,
    target: { kind: 'burst', radius: 1 },
    damage: { power: 5 },
    inflict: { status: 'aturdido', turns: 1 },
    description: 'Pisas con fuerza: los adyacentes reciben daño y pierden su próxima acción.',
  },
  aguja_resonante: {
    id: 'aguja_resonante',
    name: 'Aguja Resonante',
    affinity: 'rayo',
    minLevel: 1,
    kiroCost: 3,
    target: { kind: 'area', range: 5, areaRadius: 0, lineOfSight: true },
    damage: { power: 5, ignoreDefense: true },
    inflict: { status: 'aturdido', turns: 1 },
    description: 'Un pinchazo preciso que ignora la defensa e interrumpe la próxima acción del objetivo.',
  },
  descarga_estatica: {
    id: 'descarga_estatica',
    name: 'Descarga Estática',
    affinity: 'rayo',
    minLevel: 3,
    kiroCost: 4,
    target: { kind: 'burst', radius: 2 },
    damage: { power: 4, ignoreDefense: true },
    description: 'Un estallido de chispas a tu alrededor (radio 2) que ignora la defensa.',
  },
};

export function getTechnique(id: string): TechniqueDef | undefined {
  return Object.hasOwn(TECHNIQUES, id) ? TECHNIQUES[id] : undefined;
}

/** Técnicas de una afinidad disponibles a un nivel dado, en orden de definición. */
export function techniquesFor(affinity: Affinity, level: number): string[] {
  return Object.values(TECHNIQUES)
    .filter((t) => t.affinity === affinity && t.minLevel <= level)
    .map((t) => t.id);
}

/** ¿Hay que elegir una casilla antes de lanzarla? */
export function needsAim(def: TechniqueDef): boolean {
  return def.target.kind === 'area' || def.target.kind === 'line' || def.target.kind === 'blink' || def.target.kind === 'barrier';
}
