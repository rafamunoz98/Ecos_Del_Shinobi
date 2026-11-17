import { createGame } from '../core/newGame';
import type { Affinity, Command, GameState, TerrainKind, Vec } from '../core/types';

/** Crea una partida sobre una sala ASCII; `tweak` permite ajustar el estado recién creado. */
export function makeGame(
  rows: string[],
  tweak?: (s: GameState) => void,
  opts: { seed?: number; affinity?: Affinity } = {},
): GameState {
  const s = createGame({ seed: opts.seed ?? 1, room: rows, affinity: opts.affinity ?? 'ascua' });
  tweak?.(s);
  return s;
}

/** Cambia el terreno de una casilla (arbusto, puerta...) en una partida de prueba. */
export const setTile = (g: GameState, x: number, y: number, kind: TerrainKind): void => {
  g.map.tiles[y * g.map.width + x] = kind;
};

export const move = (dx: number, dy: number): Command => ({ type: 'Move', dx, dy });
export const wait = (): Command => ({ type: 'Wait' });
export const attack = (target: Vec): Command => ({ type: 'BasicAttack', target });
export const cast = (target: Vec): Command => ({ type: 'UseTechnique', techniqueId: 'brasa_circular', target });
export const interact = (target: Vec): Command => ({ type: 'Interact', target });

/** Sala abierta de 9x5 con el jugador en (1,2) y dos enemigos en (5,2) y (5,3). */
export const OPEN_ROOM = [
  '#########',
  '#.......#',
  '#@...E..#',
  '#....E..#',
  '#########',
];
