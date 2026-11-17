export interface EnemyDef {
  id: string;
  name: string;
  maxHp: number;
  power: number;
  defense: number;
  /** Distancia de camino máxima a la que empieza a perseguir. */
  aggroRange: number;
}

export const ENEMIES: Record<string, EnemyDef> = {
  acechador_hollin: {
    id: 'acechador_hollin',
    name: 'Acechador de Hollín',
    maxHp: 10,
    power: 4,
    defense: 0,
    aggroRange: 8,
  },
};

export function getEnemy(id: string): EnemyDef | undefined {
  return Object.hasOwn(ENEMIES, id) ? ENEMIES[id] : undefined;
}
