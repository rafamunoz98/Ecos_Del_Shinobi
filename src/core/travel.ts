import { getAllyDef } from '../content/allies';
import { chebyshev, equals, findPath, idx, inBounds } from './grid';
import { canSeeEntity, visibleCells } from './sight';
import type { GameEvent, GameState, Vec } from './types';

/**
 * Viaje automático (clic en una casilla lejana). Todo es puro y determinista: la presentación solo decide cuándo
 * dar cada paso, y cada paso es una orden normal (Move, BasicAttack o Interact), así que el motor sigue siendo el único
 * que decide resultados.
 */

/** Eventos que no interrumpen un viaje: moverse tú, tus aliados o enemigos que se mueven sin haberte notado. */
const CALM_EVENTS: ReadonlySet<GameEvent['type']> = new Set(['PlayerMoved', 'AllyMoved', 'EnemyMoved', 'EnemyLostTrack', 'XpGained']);

/** ¿Hay algo en `p` que impida pisarla? (enemigo a la vista, cofre, PNJ, señuelo o barrera). Los enemigos que no ves no cuentan. */
function occupied(s: GameState, p: Vec, visible: ReadonlySet<number>): boolean {
  return (
    s.enemies.some((e) => equals(e.pos, p) && canSeeEntity(s, visible, e.pos)) ||
    s.chests.some((c) => equals(c.pos, p)) ||
    s.npcs.some((n) => equals(n.pos, p)) ||
    s.allies.some((a) => equals(a.pos, p) && getAllyDef(a.kind)?.decoy === true) ||
    s.barriers.some((b) => equals(b.pos, p)) ||
    s.hazards.some((h) => h.kind === 'fire' && equals(h.pos, p))
  );
}

/**
 * Camino hasta `goal` pasando solo por casillas ya exploradas (no se revela el mapa por el que no has pasado ni se
 * atraviesa nada ocupado que veas). La meta puede estar ocupada (un enemigo, un cofre, un PNJ): el último paso será atacar o
 * interactuar. Devuelve [] si ya estás en ella y null si no hay camino conocido.
 */
export function knownPath(s: GameState, goal: Vec): Vec[] | null {
  const { map, player, explored } = s;
  if (!inBounds(map, goal) || !explored[idx(map, goal)]) return null;
  const visible = visibleCells(s);
  return findPath(map, player.pos, goal, (p) => !explored[idx(map, p)] || occupied(s, p, visible));
}

/** Enemigos que el jugador ve ahora mismo. */
function visibleEnemyIds(s: GameState): Set<string> {
  const visible = visibleCells(s);
  return new Set(s.enemies.filter((e) => canSeeEntity(s, visible, e.pos)).map((e) => e.id));
}

/**
 * ¿Debe detenerse el viaje tras la acción `prev → next`? Sí si pasó algo más que caminar (daño, objeto recogido, diálogo,
 * un enemigo te nota...), si aparece un enemigo nuevo a la vista, si hay un ataque anunciado o si un enemigo (que no sea
 * el objetivo del viaje) queda a menos de tres casillas.
 */
export function travelInterrupted(prev: GameState, next: GameState, events: readonly GameEvent[], goalEnemyId?: string): boolean {
  if (next.status !== 'playing' || next.floor !== prev.floor) return true;
  if (next.affinityOffer && next.affinityOffer.length > 0) return true;
  if (events.some((e) => !CALM_EVENTS.has(e.type))) return true;
  if (next.telegraphs.length > 0) return true;
  if (next.player.hp < prev.player.hp) return true;
  if (next.player.statuses.length !== prev.player.statuses.length) return true;
  const before = visibleEnemyIds(prev);
  const now = visibleEnemyIds(next);
  for (const id of now) if (!before.has(id)) return true;
  return next.enemies.some((e) => e.id !== goalEnemyId && now.has(e.id) && chebyshev(e.pos, next.player.pos) <= 2);
}
