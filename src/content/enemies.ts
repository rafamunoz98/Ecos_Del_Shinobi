export interface EnemyDef {
  id: string;
  name: string;
  maxHp: number;
  power: number;
  defense: number;
  /** Distancia de camino máxima a la que empieza a perseguir. */
  aggroRange: number;
  /** Experiencia que da al caer. */
  xp: number;
  behavior: 'melee' | 'ranged';
  /** Acciones por ronda (el Cuervo de Sal se mueve dos veces; ataca como mucho una). */
  actionsPerTurn: number;
  /** Actúa una de cada N rondas (la Larva de Piedra es lenta). */
  actEvery: number;
  /** Primer sector en el que aparece y peso relativo de aparición. */
  minFloor: number;
  weight: number;
  /** Solo 'ranged': alcance de disparo y distancia a la que intenta retroceder. */
  range?: number;
  keepAway?: number;
}

export const ENEMIES: Record<string, EnemyDef> = {
  acechador_hollin: {
    id: 'acechador_hollin',
    name: 'Acechador de Hollín',
    maxHp: 10,
    power: 4,
    defense: 0,
    aggroRange: 8,
    xp: 4,
    behavior: 'melee',
    actionsPerTurn: 1,
    actEvery: 1,
    minFloor: 1,
    weight: 5,
  },
  cuervo_de_sal: {
    id: 'cuervo_de_sal',
    name: 'Cuervo de Sal',
    maxHp: 5,
    power: 3,
    defense: 0,
    aggroRange: 10,
    xp: 3,
    behavior: 'melee',
    actionsPerTurn: 2,
    actEvery: 1,
    minFloor: 1,
    weight: 3,
  },
  larva_de_piedra: {
    id: 'larva_de_piedra',
    name: 'Larva de Piedra',
    maxHp: 16,
    power: 4,
    defense: 2,
    aggroRange: 6,
    xp: 6,
    behavior: 'melee',
    actionsPerTurn: 1,
    actEvery: 2,
    minFloor: 2,
    weight: 2,
  },
  tirador_de_junco: {
    id: 'tirador_de_junco',
    name: 'Tirador de Junco',
    maxHp: 7,
    power: 3,
    defense: 0,
    aggroRange: 9,
    xp: 5,
    behavior: 'ranged',
    actionsPerTurn: 1,
    actEvery: 1,
    minFloor: 2,
    weight: 3,
    range: 5,
    keepAway: 2,
  },
};

export function getEnemy(id: string): EnemyDef | undefined {
  return Object.hasOwn(ENEMIES, id) ? ENEMIES[id] : undefined;
}
