import { BALANCE } from '../content/balance';
import { ENEMIES } from '../content/enemies';
import type { Chest, Enemy, GameMap, TerrainKind, Vec } from '../core/types';
import { createEnemy } from './spawn';

export interface ParsedRoom {
  map: GameMap;
  playerStart: Vec;
  enemyStarts: Vec[];
  chestStarts: Vec[];
}

/** Convierte una sala en ASCII en mapa + posiciones iniciales. Lanza error si el formato no es válido. */
export function parseRoom(rows: readonly string[]): ParsedRoom {
  if (rows.length === 0) throw new Error('La sala está vacía.');
  const width = rows[0].length;
  if (width === 0) throw new Error('La sala no tiene columnas.');
  const tiles: TerrainKind[] = [];
  const enemyStarts: Vec[] = [];
  const chestStarts: Vec[] = [];
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
        default:
          throw new Error(`Carácter desconocido '${ch}' en (${x}, ${y}).`);
      }
    });
  });

  if (!playerStart) throw new Error('Falta la posición inicial del jugador (@).');
  return { map: { width, height: rows.length, tiles }, playerStart, enemyStarts, chestStarts };
}

/** Sala ASCII → nivel jugable (las 'E' son Acechadores de Hollín del sector 1). */
export function levelFromRoom(rows: readonly string[]): { map: GameMap; playerStart: Vec; enemies: Enemy[]; chests: Chest[] } {
  const room = parseRoom(rows);
  const def = ENEMIES.acechador_hollin;
  return {
    map: room.map,
    playerStart: room.playerStart,
    // Los enemigos de una sala de prototipo/prueba ya están alerta (no esperan a verte).
    enemies: room.enemyStarts.map((pos, i) => ({ ...createEnemy(def, `enemy-${i}`, pos, 1), alert: BALANCE.alertTurns })),
    chests: room.chestStarts.map((pos, i) => ({ id: `chest-${i}`, pos, opened: false })),
  };
}
