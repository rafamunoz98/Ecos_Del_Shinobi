import { BALANCE } from '../content/balance';
import { BOSS_ID, ENEMIES } from '../content/enemies';
import type { Chest, Drop, Enemy, GameMap, Npc, Scroll, TerrainKind, Vec } from '../core/types';
import { createBoss, createEnemy } from './spawn';

export interface ParsedRoom {
  map: GameMap;
  playerStart: Vec;
  enemyStarts: Vec[];
  chestStarts: Vec[];
  monkStarts: Vec[];
  bossStarts: Vec[];
  npcStarts: { pos: Vec; kind: string }[];
  scrollStarts: Vec[];
  lockedChestStarts: Vec[];
  keyStarts: { pos: Vec; id: string }[];
}

/** Convierte una sala en ASCII en mapa + posiciones iniciales. Lanza error si el formato no es válido. */
export function parseRoom(rows: readonly string[]): ParsedRoom {
  if (rows.length === 0) throw new Error('La sala está vacía.');
  const width = rows[0].length;
  if (width === 0) throw new Error('La sala no tiene columnas.');
  const tiles: TerrainKind[] = [];
  const enemyStarts: Vec[] = [];
  const chestStarts: Vec[] = [];
  const monkStarts: Vec[] = [];
  const bossStarts: Vec[] = [];
  const npcStarts: { pos: Vec; kind: string }[] = [];
  const scrollStarts: Vec[] = [];
  const lockedChestStarts: Vec[] = [];
  const keyStarts: { pos: Vec; id: string }[] = [];
  let playerStart: Vec | null = null;

  rows.forEach((row, y) => {
    if (row.length !== width) {
      throw new Error(`La fila ${y} mide ${row.length} y se esperaba ${width}.`);
    }
    [...row].forEach((ch, x) => {
      switch (ch) {
        case '#':
          tiles.push('wall');
          break;
        case '.':
          tiles.push('floor');
          break;
        case '>':
          tiles.push('exit');
          break;
        case 'b':
          tiles.push('bush');
          break;
        case '+':
          tiles.push('door');
          break;
        case '@':
          if (playerStart) throw new Error('Hay más de un jugador (@) en la sala.');
          playerStart = { x, y };
          tiles.push('floor');
          break;
        case 'E':
          enemyStarts.push({ x, y });
          tiles.push('floor');
          break;
        case 'C':
          chestStarts.push({ x, y });
          tiles.push('floor');
          break;
        case 'M': // Monje Hueco
          monkStarts.push({ x, y });
          tiles.push('floor');
          break;
        case 'B': // Sōkan, el jefe de prueba
          bossStarts.push({ x, y });
          tiles.push('floor');
          break;
        case 'N': // Maestra Sayoko
        case 'A': // Altar del Eco Roto
          npcStarts.push({ pos: { x, y }, kind: ch === 'N' ? 'maestra_sayoko' : 'altar_eco_roto' });
          tiles.push('floor');
          break;
        case 'L': // puerta con candado (cámara sellada)
          tiles.push('locked');
          break;
        case 'c': // cofre lacado (llave de laca)
          lockedChestStarts.push({ x, y });
          tiles.push('floor');
          break;
        case 'F': // mesa de forja
          npcStarts.push({ pos: { x, y }, kind: 'mesa_forja' });
          tiles.push('floor');
          break;
        case 'k': // llave de hierro en el suelo
        case 'q': // llave de laca en el suelo
          keyStarts.push({ pos: { x, y }, id: ch === 'k' ? 'llave_hierro' : 'llave_laca' });
          tiles.push('floor');
          break;
        case 'S': // pergamino de lore
          scrollStarts.push({ x, y });
          tiles.push('floor');
          break;
        default:
          throw new Error(`Carácter desconocido '${ch}' en (${x}, ${y}).`);
      }
    });
  });

  if (!playerStart) throw new Error('Falta la posición inicial del jugador (@).');
  return { map: { width, height: rows.length, tiles }, playerStart, enemyStarts, chestStarts, monkStarts, bossStarts, npcStarts, scrollStarts, lockedChestStarts, keyStarts };
}

/** Sala ASCII → nivel jugable (las 'E' son Acechadores de Hollín del sector 1). */
export function levelFromRoom(rows: readonly string[]): { map: GameMap; playerStart: Vec; enemies: Enemy[]; chests: Chest[]; npcs: Npc[]; scrolls: Scroll[]; drops: Drop[] } {
  const room = parseRoom(rows);
  const def = ENEMIES.acechador_hollin;
  return {
    map: room.map,
    playerStart: room.playerStart,
    // Los enemigos de una sala de prototipo/prueba ya están alerta (no esperan a verte).
    enemies: [
      ...room.enemyStarts.map((pos, i) => ({ ...createEnemy(def, `enemy-${i}`, pos, 1), affinity: null, alert: BALANCE.alertTurns })),
      ...room.monkStarts.map((pos, i) => ({ ...createEnemy(ENEMIES.monje_hueco, `enemy-m${i}`, pos, 1), affinity: null, alert: BALANCE.alertTurns })),
      ...room.bossStarts.map((pos, i) => ({ ...createBoss(ENEMIES[BOSS_ID], `enemy-b${i}`, pos), affinity: null, alert: BALANCE.alertTurns })),
    ],
    chests: [
      ...room.chestStarts.map((pos, i) => ({ id: `chest-${i}`, pos, opened: false })),
      ...room.lockedChestStarts.map((pos, i) => ({ id: `chest-l${i}`, pos, opened: false, locked: true })),
    ],
    npcs: room.npcStarts.map((n, i) => ({ id: `npc-${i}`, kind: n.kind, pos: n.pos, used: false })),
    scrolls: room.scrollStarts.map((pos, i) => ({ id: `scroll-${i}`, pos, noteId: 'diario_cartografo' })),
    drops: room.keyStarts.map((k) => ({ pos: k.pos, itemId: k.id, count: 1 })),
  };
}
