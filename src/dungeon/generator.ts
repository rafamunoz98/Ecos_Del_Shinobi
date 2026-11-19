import { BALANCE } from '../content/balance';
import { DIRS, fromIdx, idx, inBounds, isWalkable, manhattan } from '../core/grid';
import { mixSeed, Rng } from '../core/rng';
import { BOSS_ID, ENEMIES } from '../content/enemies';
import { NPC_BY_FLOOR, notesForFloor } from '../content/story';
import type { Chest, Enemy, GameMap, Npc, Scroll, TerrainKind, Vec } from '../core/types';
import { createBoss, createEnemy, pickEnemyDef } from './spawn';

export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GeneratedLevel {
  map: GameMap;
  playerStart: Vec;
  exit: Vec;
  enemies: Enemy[];
  chests: Chest[];
  npcs: Npc[];
  scrolls: Scroll[];
  rooms: Room[];
  /** Sala del jefe (la de la salida) en el último sector. */
  bossRoom: Room | null;
}

export interface LevelParams {
  seed: number;
  floor: number;
  width?: number;
  height?: number;
  /** Último sector: la sala de la salida se convierte en la arena del Campanero Sepultado. */
  boss?: boolean;
}

const MAX_ATTEMPTS = 50;

const center = (r: Room): Vec => ({ x: r.x + Math.floor(r.w / 2), y: r.y + Math.floor(r.h / 2) });

/** Dos salas "se tocan" si les falta al menos una casilla de pared entre ellas. */
const touches = (a: Room, b: Room): boolean =>
  a.x - 1 < b.x + b.w && a.x + a.w + 1 > b.x && a.y - 1 < b.y + b.h && a.y + a.h + 1 > b.y;

/** Distancia de camino (BFS ortogonal) desde `from`; -1 = inalcanzable. `blocked` son índices intransitables. */
export function distancesFrom(map: GameMap, from: Vec, blocked?: ReadonlySet<number>): Int32Array {
  const dist = new Int32Array(map.width * map.height).fill(-1);
  const start = idx(map, from);
  if (!inBounds(map, from) || !isWalkable(map, from) || blocked?.has(start)) return dist;
  dist[start] = 0;
  const queue = [start];
  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head];
    const c = fromIdx(map, cur);
    for (const d of DIRS) {
      const n = { x: c.x + d.x, y: c.y + d.y };
      if (!inBounds(map, n) || !isWalkable(map, n)) continue;
      const ni = idx(map, n);
      if (dist[ni] !== -1 || blocked?.has(ni)) continue;
      dist[ni] = dist[cur] + 1;
      queue.push(ni);
    }
  }
  return dist;
}

export function reachableCount(map: GameMap, from: Vec, blocked?: ReadonlySet<number>): number {
  let n = 0;
  for (const d of distancesFrom(map, from, blocked)) if (d >= 0) n++;
  return n;
}

function carveCorridor(tiles: TerrainKind[], width: number, a: Vec, b: Vec, horizontalFirst: boolean): void {
  const carve = (x: number, y: number): void => {
    tiles[y * width + x] = 'floor';
  };
  const hLine = (y: number, x0: number, x1: number): void => {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) carve(x, y);
  };
  const vLine = (x: number, y0: number, y1: number): void => {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) carve(x, y);
  };
  if (horizontalFirst) {
    hLine(a.y, a.x, b.x);
    vLine(b.x, a.y, b.y);
  } else {
    vLine(a.x, a.y, b.y);
    hLine(b.y, a.x, b.x);
  }
}

function buildLevel(rng: Rng, width: number, height: number, floor: number, withBoss: boolean): GeneratedLevel | null {
  const tiles: TerrainKind[] = new Array<TerrainKind>(width * height).fill('wall');
  const rooms: Room[] = [];

  // 1. Salas sin solaparse.
  for (let attempt = 0; attempt < 400 && rooms.length < BALANCE.level.targetRooms; attempt++) {
    const w = rng.int(4, 11);
    const h = rng.int(4, 8);
    if (w > width - 2 || h > height - 2) continue;
    const cand: Room = { w, h, x: rng.int(1, width - w - 1), y: rng.int(1, height - h - 1) };
    if (rooms.some((r) => touches(r, cand))) continue;
    rooms.push(cand);
  }
  if (rooms.length < 4) return null;
  for (const r of rooms) {
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) tiles[y * width + x] = 'floor';
  }

  // 2. Conexión: cada sala nueva se une a la más cercana ya conectada (garantiza un único componente).
  const key = (a: number, b: number): string => (a < b ? `${a}-${b}` : `${b}-${a}`);
  const linked = new Set<string>();
  const link = (a: number, b: number): void => {
    linked.add(key(a, b));
    carveCorridor(tiles, width, center(rooms[a]), center(rooms[b]), rng.chance(0.5));
  };
  const inTree = [0];
  const rest = rooms.map((_, i) => i).slice(1);
  while (rest.length > 0) {
    let best = { a: 0, ri: 0, d: Infinity };
    for (const a of inTree) {
      rest.forEach((b, ri) => {
        const d = manhattan(center(rooms[a]), center(rooms[b]));
        if (d < best.d) best = { a, ri, d };
      });
    }
    const [b] = rest.splice(best.ri, 1);
    link(best.a, b);
    inTree.push(b);
  }
  // Bucles extra para que no sea un árbol puro (más rutas, más decisiones).
  for (let k = 0; k < 3; k++) {
    const a = rng.int(0, rooms.length - 1);
    let bestB = -1;
    let bestD = Infinity;
    rooms.forEach((_, b) => {
      if (b === a || linked.has(key(a, b))) return;
      const d = manhattan(center(rooms[a]), center(rooms[b]));
      if (d < bestD) {
        bestD = d;
        bestB = b;
      }
    });
    if (bestB >= 0) link(a, bestB);
  }

  const map: GameMap = { width, height, tiles };

  // 3. Entrada y salida: la salida es la sala más lejana por camino.
  const startRoom = rng.int(0, rooms.length - 1);
  const playerStart = center(rooms[startRoom]);
  const dist = distancesFrom(map, playerStart);
  let exitRoom = -1;
  let farthest = 0;
  rooms.forEach((r, i) => {
    if (i === startRoom) return;
    const d = dist[idx(map, center(r))];
    if (d > farthest) {
      farthest = d;
      exitRoom = i;
    }
  });
  if (exitRoom < 0) return null;
  const exit = center(rooms[exitRoom]);
  tiles[idx(map, exit)] = 'exit';

  const used = new Set<number>([idx(map, playerStart), idx(map, exit)]);
  const others = rooms.map((_, i) => i).filter((i) => i !== startRoom);
  const bossRoom = withBoss ? rooms[exitRoom] : null;
  // En el último sector la sala de la salida es la arena: sin enemigos ni arbustos aparte del jefe.
  const spawnRooms = others.filter((i) => !withBoss || i !== exitRoom);
  const order = rng.shuffle([...spawnRooms]);
  const randomCell = (r: Room): Vec => ({ x: rng.int(r.x, r.x + r.w - 1), y: rng.int(r.y, r.y + r.h - 1) });

  // 4. Enemigos: lejos de la entrada, repartidos por salas.
  const enemies: Enemy[] = [];
  const tryPlaceEnemy = (room: Room): boolean => {
    for (let t = 0; t < 20; t++) {
      const c = randomCell(room);
      const i = idx(map, c);
      if (used.has(i) || manhattan(c, playerStart) < 6) continue;
      used.add(i);
      enemies.push(createEnemy(pickEnemyDef(floor, rng), `enemy-${enemies.length}`, c, floor));
      return true;
    }
    return false;
  };
  for (const ri of order) {
    if (enemies.length >= BALANCE.level.maxEnemies) break;
    const room = rooms[ri];
    const roomMax = Math.min(3, 1 + Math.floor((room.w * room.h) / 24));
    const n = rng.int(0, roomMax);
    for (let k = 0; k < n && enemies.length < BALANCE.level.maxEnemies; k++) tryPlaceEnemy(room);
  }
  for (let guard = 0; enemies.length < BALANCE.level.minEnemies && guard < 60; guard++) {
    tryPlaceEnemy(rooms[rng.pick(spawnRooms)]);
  }

  // 5. Cofres: nunca deben cortar el camino (se comprueba que el resto del suelo siga conectado).
  const chests: Chest[] = [];
  const chestCells = new Set<number>();
  const floorCount = tiles.filter((t) => t !== 'wall').length;
  const tryPlaceChest = (room: Room): boolean => {
    for (let t = 0; t < 20; t++) {
      const c = randomCell(room);
      const i = idx(map, c);
      if (used.has(i)) continue;
      const trial = new Set(chestCells).add(i);
      if (reachableCount(map, playerStart, trial) !== floorCount - trial.size) continue;
      chestCells.add(i);
      used.add(i);
      chests.push({ id: `chest-${chests.length}`, pos: c, opened: false });
      return true;
    }
    return false;
  };
  for (const ri of order) {
    if (chests.length >= BALANCE.level.maxChests) break;
    if (rng.chance(0.4)) tryPlaceChest(rooms[ri]);
  }
  for (let guard = 0; chests.length === 0 && guard < 20; guard++) tryPlaceChest(rooms[rng.pick(spawnRooms)]);

  // 6. Decoración con efecto en el juego: arbustos (esconden y tapan la vista) y puertas (tapan la vista).
  const inRoom = (c: Vec): boolean => rooms.some((r) => c.x >= r.x && c.x < r.x + r.w && c.y >= r.y && c.y < r.y + r.h);
  const clusters = BALANCE.level.bushClusters + (floor >= 2 ? 1 : 0);
  for (let k = 0; k < clusters; k++) {
    const room = rooms[rng.int(0, rooms.length - 1)];
    if (room === bossRoom) continue;
    const centerCell = randomCell(room);
    const radius = rng.int(1, 2);
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const c = { x: centerCell.x + dx, y: centerCell.y + dy };
        if (Math.abs(dx) + Math.abs(dy) > radius || !inBounds(map, c) || !inRoom(c)) continue;
        const i = idx(map, c);
        if (tiles[i] !== 'floor' || used.has(i) || !rng.chance(0.8)) continue;
        if (manhattan(c, playerStart) <= 1) continue;
        tiles[i] = 'bush';
      }
    }
  }
  const wallAt = (c: Vec): boolean => !inBounds(map, c) || tiles[idx(map, c)] === 'wall';
  const doorCandidates: Vec[] = [];
  for (const r of rooms) {
    const ring: Vec[] = [];
    for (let x = r.x; x < r.x + r.w; x++) ring.push({ x, y: r.y - 1 }, { x, y: r.y + r.h });
    for (let y = r.y; y < r.y + r.h; y++) ring.push({ x: r.x - 1, y }, { x: r.x + r.w, y });
    for (const c of ring) {
      if (!inBounds(map, c) || tiles[idx(map, c)] !== 'floor' || inRoom(c)) continue;
      const sideWalls = wallAt({ x: c.x - 1, y: c.y }) && wallAt({ x: c.x + 1, y: c.y });
      const endWalls = wallAt({ x: c.x, y: c.y - 1 }) && wallAt({ x: c.x, y: c.y + 1 });
      if (sideWalls !== endWalls) doorCandidates.push(c); // un pasillo de una casilla, no un cruce
    }
  }
  let doors = 0;
  for (const c of rng.shuffle(doorCandidates)) {
    if (doors >= BALANCE.level.maxDoors) break;
    const i = idx(map, c);
    if (tiles[i] !== 'floor' || !rng.chance(0.6)) continue;
    if (DIRS.some((d) => tiles[idx(map, { x: c.x + d.x, y: c.y + d.y })] === 'door')) continue;
    tiles[i] = 'door';
    doors++;
  }

  // 7. Jefe, evento/maestro y pergaminos de lore (al final: no alteran los mapas de los sectores anteriores).
  if (bossRoom) {
    let spot: Vec | null = null;
    for (let t = 0; t < 40 && !spot; t++) {
      const c = randomCell(bossRoom);
      if (used.has(idx(map, c)) || manhattan(c, exit) < 2) continue;
      spot = c;
    }
    spot ??= { x: exit.x + 1, y: exit.y };
    used.add(idx(map, spot));
    enemies.push(createBoss(ENEMIES[BOSS_ID], `enemy-${enemies.length}`, spot));
  }

  const npcs: Npc[] = [];
  const npcKind = NPC_BY_FLOOR[floor];
  if (npcKind) {
    const blocked = new Set<number>([...chestCells]);
    for (let t = 0; t < 60 && npcs.length === 0; t++) {
      const room = rooms[rng.pick(spawnRooms)];
      const c = randomCell(room);
      const i = idx(map, c);
      if (used.has(i) || tiles[i] !== 'floor' || manhattan(c, playerStart) < 4) continue;
      const trial = new Set(blocked).add(i);
      if (reachableCount(map, playerStart, trial) !== floorCount - trial.size) continue;
      used.add(i);
      npcs.push({ id: `npc-${npcs.length}`, kind: npcKind, pos: c, used: false });
    }
  }

  const scrolls: Scroll[] = [];
  const pool = rng.shuffle([...notesForFloor(floor)]);
  const wanted = Math.min(pool.length, rng.int(1, 2));
  for (let t = 0; t < 80 && scrolls.length < wanted; t++) {
    const room = rooms[rng.int(0, rooms.length - 1)];
    const c = randomCell(room);
    const i = idx(map, c);
    if (used.has(i) || tiles[i] !== 'floor') continue;
    used.add(i);
    scrolls.push({ id: `scroll-${scrolls.length}`, pos: c, noteId: pool[scrolls.length].id });
  }

  return { map, playerStart, exit, enemies, chests, npcs, scrolls, rooms, bossRoom };
}

/**
 * Genera un sector completo. Determinista: misma semilla + mismo sector = mismo mapa.
 * Si un intento sale degenerado se reintenta con otra variante derivada de la misma semilla.
 */
export function generateLevel(params: LevelParams): GeneratedLevel {
  const width = params.width ?? BALANCE.level.width;
  const height = params.height ?? BALANCE.level.height;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const level = buildLevel(new Rng(mixSeed(params.seed, params.floor, attempt)), width, height, params.floor, params.boss ?? false);
    if (level) return level;
  }
  throw new Error(`No se pudo generar el sector ${params.floor} con la semilla ${params.seed}.`);
}
