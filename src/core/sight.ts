import { BALANCE } from '../content/balance';
import { chebyshev, computeVisible, equals, hasLineOfSight, idx, manhattan, terrainAt } from './grid';
import type { Enemy, GameState, Vec } from './types';

/**
 * Visión y sigilo. Reglas:
 *  - Arbustos y puertas cerradas tapan la visión (la tuya y la de los enemigos). Una puerta se abre
 *    mientras alguien está dentro de ella.
 *  - Quien está dentro de un arbusto solo es visto desde una casilla de distancia.
 *  - Mientras estás en un arbusto ves menos (radio reducido): esconderse tiene un precio.
 */

/** Índices de puertas con alguien dentro (abiertas por ese momento). */
export function openDoors(s: GameState): Set<number> {
  const open = new Set<number>();
  const occupants: Vec[] = [s.player.pos, ...s.enemies.map((e) => e.pos)];
  for (const p of occupants) {
    if (terrainAt(s.map, p) === 'door') open.add(idx(s.map, p));
  }
  return open;
}

export function visionRadiusOf(s: GameState): number {
  const base = terrainAt(s.map, s.player.pos) === 'bush' ? BALANCE.bushVision : BALANCE.visionRadius;
  return s.player.statuses.some((st) => st.id === 'ceguera') ? Math.min(base, 2) : base;
}

/** Casillas que el jugador ve ahora mismo. */
export function visibleCells(s: GameState): Set<number> {
  return computeVisible(s.map, s.player.pos, visionRadiusOf(s), openDoors(s));
}

/** ¿Ve el jugador a una entidad en `pos`? Dentro de un arbusto solo se la ve desde una casilla. */
export function canSeeEntity(s: GameState, visible: ReadonlySet<number>, pos: Vec): boolean {
  if (!visible.has(idx(s.map, pos))) return false;
  if (terrainAt(s.map, pos) === 'bush' && manhattan(s.player.pos, pos) > 1) return false;
  return true;
}

/** ¿Nota el enemigo al jugador ahora mismo? */
export function enemySees(s: GameState, e: Enemy): boolean {
  const p = s.player.pos;
  const d = manhattan(e.pos, p);
  if (equals(e.pos, p)) return true;
  if (chebyshev(e.pos, p) === 1) return true;
  if (s.player.statuses.some((st) => st.id === 'sigilo')) return false; // invisible salvo a quemarropa
  if (d > e.aggroRange) return false;
  if (terrainAt(s.map, p) === 'bush') return false;
  return hasLineOfSight(s.map, e.pos, p, openDoors(s));
}
