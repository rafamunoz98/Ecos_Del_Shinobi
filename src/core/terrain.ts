import { DIRS8, equals, idx, inBounds, isWalkable, terrainAt } from './grid';
import type { GameState, Hazard, TerrainKind, Vec } from './types';

/** Terrenos que arden: arbustos, zarzales y puertas de madera (las de candado no). */
export const FLAMMABLE: ReadonlySet<TerrainKind> = new Set<TerrainKind>(['bush', 'thorns', 'door']);

export const hazardAt = (s: GameState, p: Vec, kind?: Hazard['kind']): Hazard | undefined =>
  s.hazards.find((h) => equals(h.pos, p) && (kind === undefined || h.kind === kind));

export function removeHazard(s: GameState, p: Vec, kind: Hazard['kind']): void {
  s.hazards = s.hazards.filter((h) => !(equals(h.pos, p) && h.kind === kind));
}

/** Pone (o renueva) un peligro. No se apoya en paredes ni en el vacío. El fuego y el agua se anulan entre sí en la misma casilla. */
export function addHazard(s: GameState, pos: Vec, kind: Hazard['kind'], turns: number): void {
  if (!inBounds(s.map, pos) || !isWalkable(s.map, pos) || terrainAt(s.map, pos) === 'chasm') return;
  if (kind === 'fire' && hazardAt(s, pos, 'water')) {
    removeHazard(s, pos, 'water');
    return;
  }
  if (kind === 'water') removeHazard(s, pos, 'fire');
  const cur = hazardAt(s, pos, kind);
  if (cur) cur.turns = Math.max(cur.turns, turns);
  else s.hazards.push({ pos: { ...pos }, kind, turns });
}

/** El charco entero que toca a `start` (vecindad de ocho casillas): por él corre la descarga. */
export function connectedWater(s: GameState, start: Vec): Vec[] {
  if (!hazardAt(s, start, 'water')) return [];
  const seen = new Set<number>([idx(s.map, start)]);
  const out: Vec[] = [start];
  for (let head = 0; head < out.length; head++) {
    for (const d of DIRS8) {
      const n = { x: out[head].x + d.x, y: out[head].y + d.y };
      if (!inBounds(s.map, n) || seen.has(idx(s.map, n)) || !hazardAt(s, n, 'water')) continue;
      seen.add(idx(s.map, n));
      out.push(n);
    }
  }
  return out;
}

/** Casillas de pared agrietada pegadas (ocho vecinas) a las casillas dadas. */
export function crackedNear(s: GameState, cells: readonly Vec[]): Vec[] {
  const out = new Map<number, Vec>();
  for (const c of cells) {
    for (const d of DIRS8) {
      const n = { x: c.x + d.x, y: c.y + d.y };
      if (inBounds(s.map, n) && terrainAt(s.map, n) === 'cracked') out.set(idx(s.map, n), n);
    }
  }
  return [...out.values()];
}

/** Una tirada determinista en [0,1) que NO consume el generador de la partida (buscar y descubrir no alteran el resto). */
export function hashRoll(seed: number, a: number, b: number, c: number): number {
  let h = (seed ^ Math.imul(a + 1, 0x9e3779b1) ^ Math.imul(b + 7, 0x85ebca6b) ^ Math.imul(c + 13, 0xc2b2ae35)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
