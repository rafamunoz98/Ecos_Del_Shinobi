import { BALANCE } from '../content/balance';
import { ENEMIES, type EnemyDef } from '../content/enemies';
import type { Rng } from '../core/rng';
import type { Enemy, Vec } from '../core/types';

/** Crea una instancia de enemigo escalada al sector (más vida y poder en sectores profundos). */
export function createEnemy(def: EnemyDef, id: string, pos: Vec, floor: number): Enemy {
  const scale = Math.max(0, floor - 1);
  const hp = def.maxHp + scale * BALANCE.enemyScale.hpPerFloor;
  return {
    id,
    kind: def.id,
    pos,
    hp,
    maxHp: hp,
    power: def.power + Math.floor(scale / BALANCE.enemyScale.powerEvery),
    defense: def.defense,
    aggroRange: def.aggroRange,
    alert: 0,
    lastSeen: null,
    statuses: [],
  };
}

/** Elige un tipo de enemigo según el sector y los pesos configurados. */
export function pickEnemyDef(floor: number, rng: Rng): EnemyDef {
  const pool = Object.values(ENEMIES).filter((e) => e.minFloor <= floor);
  return rng.weighted(pool);
}
