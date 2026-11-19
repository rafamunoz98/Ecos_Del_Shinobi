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
  /** melee persigue y golpea; ranged dispara; channeler marca un área y la libera; boss tiene fases. */
  behavior: 'melee' | 'ranged' | 'channeler' | 'boss';
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
  /** Solo 'channeler': alcance de marcado, radio del área (alrededor del jugador), poder y rondas de carga. */
  channel?: { range: number; radius: number; power: number; delay: number; name: string };
  /** Solo 'boss'. Inmune a aturdimiento y empuje. */
  boss?: {
    /** Golpe cercano: área alrededor del jefe cuando estás a ≤ radius. */
    slam: { radius: number; power: number; delay: number; name: string };
    /** Onda: cruz centrada donde estás cuando te marca (fila y columna, hasta `length`). */
    wave: { length: number; power: number; delay: number; name: string };
    /** Ecos que convoca al entrar en la fase 3. */
    echoes: number;
  };
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
  monje_hueco: {
    id: 'monje_hueco',
    name: 'Monje Hueco',
    maxHp: 12,
    power: 6,
    defense: 1,
    aggroRange: 8,
    xp: 8,
    behavior: 'channeler',
    actionsPerTurn: 1,
    actEvery: 1,
    minFloor: 2,
    weight: 2,
    channel: { range: 5, radius: 1, power: 6, delay: 2, name: 'Pulso Hueco' },
  },
  eco_menor: {
    id: 'eco_menor',
    name: 'Eco Menor',
    maxHp: 6,
    power: 3,
    defense: 0,
    aggroRange: 12,
    xp: 3,
    behavior: 'melee',
    actionsPerTurn: 1,
    actEvery: 1,
    minFloor: 99, // solo los convoca el jefe
    weight: 0,
  },
  campanero_sepultado: {
    id: 'campanero_sepultado',
    name: 'El Campanero Sepultado',
    maxHp: 40,
    power: 7,
    defense: 2,
    aggroRange: 10,
    xp: 30,
    behavior: 'boss',
    actionsPerTurn: 1,
    actEvery: 1,
    minFloor: 99, // se coloca a mano en el último sector
    weight: 0,
    boss: {
      slam: { radius: 2, power: 7, delay: 2, name: 'Campanada' },
      wave: { length: 4, power: 5, delay: 2, name: 'Onda de la Campana' },
      echoes: 2,
    },
  },
};

export const BOSS_ID = 'campanero_sepultado';

export function getEnemy(id: string): EnemyDef | undefined {
  return Object.hasOwn(ENEMIES, id) ? ENEMIES[id] : undefined;
}
