import type { GameMap, TerrainKind, Vec } from './types';

/** Orden fijo de direcciones: arriba, derecha, abajo, izquierda (desempates deterministas). */
export const DIRS: readonly Vec[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

export const equals = (a: Vec, b: Vec): boolean => a.x === b.x && a.y === b.y;
export const manhattan = (a: Vec, b: Vec): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export const inBounds = (map: GameMap, p: Vec): boolean =>
  Number.isInteger(p.x) && Number.isInteger(p.y) && p.x >= 0 && p.y >= 0 && p.x < map.width && p.y < map.height;

export const idx = (map: GameMap, p: Vec): number => p.y * map.width + p.x;
export const fromIdx = (map: GameMap, i: number): Vec => ({ x: i % map.width, y: Math.floor(i / map.width) });

/** Fuera del mapa cuenta como pared. */
export function terrainAt(map: GameMap, p: Vec): TerrainKind {
  return inBounds(map, p) ? map.tiles[idx(map, p)] : 'wall';
}

export const isWalkable = (map: GameMap, p: Vec): boolean => terrainAt(map, p) !== 'wall';

/** ¿Este tipo de casilla tapa la visión? Las puertas solo mientras están cerradas (ver `open`). */
export const blocksSight = (kind: TerrainKind): boolean => kind === 'wall' || kind === 'bush' || kind === 'door';

/** Casillas intermedias de la recta de a a b (Bresenham), sin a y con b. */
export function lineCells(a: Vec, b: Vec): Vec[] {
  const cells: Vec[] = [];
  let x = a.x;
  let y = a.y;
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);
  const sx = a.x < b.x ? 1 : -1;
  const sy = a.y < b.y ? 1 : -1;
  let err = dx - dy;
  while (x !== b.x || y !== b.y) {
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
    cells.push({ x, y });
  }
  return cells;
}

/**
 * Línea de visión por Bresenham. Las casillas intermedias opacas (pared, arbusto, puerta cerrada) bloquean;
 * los extremos no cuentan (una pared o un arbusto son visibles si la línea llega hasta ellos).
 * `open` son índices de puertas abiertas (hay alguien dentro) y no bloquean.
 * Nota: no es perfectamente simétrica (a→b puede diferir de b→a); es suficiente para el prototipo.
 */
export function hasLineOfSight(map: GameMap, a: Vec, b: Vec, open?: ReadonlySet<number>): boolean {
  for (const c of lineCells(a, b)) {
    if (c.x === b.x && c.y === b.y) return true;
    if (!inBounds(map, c)) return false;
    const kind = terrainAt(map, c);
    if (blocksSight(kind) && !(kind === 'door' && open?.has(idx(map, c)))) return false;
  }
  return true;
}

/** Casillas visibles desde `origin` dentro de un radio (círculo + línea de visión). */
export function computeVisible(map: GameMap, origin: Vec, radius: number, open?: ReadonlySet<number>): Set<number> {
  const out = new Set<number>();
  const r2 = radius * radius;
  for (let y = origin.y - radius; y <= origin.y + radius; y++) {
    for (let x = origin.x - radius; x <= origin.x + radius; x++) {
      const p = { x, y };
      if (!inBounds(map, p)) continue;
      const dx = x - origin.x;
      const dy = y - origin.y;
      if (dx * dx + dy * dy > r2) continue;
      if (hasLineOfSight(map, origin, p, open)) out.add(idx(map, p));
    }
  }
  return out;
}

/**
 * Camino más corto (BFS) de `from` a `to`, sin incluir `from` e incluyendo `to`.
 * `blocked` marca casillas intermedias intransitables (otras entidades); el destino siempre se admite
 * si es transitable. Devuelve null si no hay camino. Determinista gracias al orden fijo de DIRS.
 */
export function findPath(map: GameMap, from: Vec, to: Vec, blocked: (p: Vec) => boolean): Vec[] | null {
  if (equals(from, to)) return [];
  const start = idx(map, from);
  const prev = new Map<number, number>();
  const visited = new Set<number>([start]);
  const queue: Vec[] = [from];
  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head];
    for (const d of DIRS) {
      const n = { x: cur.x + d.x, y: cur.y + d.y };
      if (!inBounds(map, n)) continue;
      const ni = idx(map, n);
      if (visited.has(ni)) continue;
      if (!isWalkable(map, n)) continue;
      const isGoal = equals(n, to);
      if (!isGoal && blocked(n)) continue;
      visited.add(ni);
      prev.set(ni, idx(map, cur));
      if (isGoal) {
        const path: Vec[] = [];
        let c = ni;
        while (c !== start) {
          path.push(fromIdx(map, c));
          c = prev.get(c) as number;
        }
        return path.reverse();
      }
      queue.push(n);
    }
  }
  return null;
}
