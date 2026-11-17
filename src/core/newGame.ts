import { BALANCE } from '../content/balance';
import { getEnemy } from '../content/enemies';
import { PROTOTYPE_ROOM } from '../content/rooms';
import { parseRoom } from '../dungeon/ascii';
import { computeVisible } from './grid';
import type { Enemy, GameState, NewGameOptions } from './types';

export const SCHEMA_VERSION = 1;
const DEFAULT_ENEMY = 'acechador_hollin';

export function createGame(opts: NewGameOptions): GameState {
  const room = parseRoom(opts.room ?? PROTOTYPE_ROOM);
  const def = getEnemy(DEFAULT_ENEMY);
  if (!def) throw new Error(`Falta la definición del enemigo ${DEFAULT_ENEMY}.`);

  const enemies: Enemy[] = room.enemyStarts.map((pos, i) => ({
    id: `enemy-${i}`,
    kind: def.id,
    pos,
    hp: def.maxHp,
    maxHp: def.maxHp,
    power: def.power,
    defense: def.defense,
    aggroRange: def.aggroRange,
    statuses: [],
  }));

  const state: GameState = {
    schemaVersion: SCHEMA_VERSION,
    seed: opts.seed >>> 0,
    rngState: opts.seed >>> 0,
    turn: 0,
    map: room.map,
    player: {
      pos: room.playerStart,
      hp: BALANCE.player.maxHp,
      maxHp: BALANCE.player.maxHp,
      kiro: BALANCE.player.maxKiro,
      maxKiro: BALANCE.player.maxKiro,
      power: BALANCE.player.power,
      defense: BALANCE.player.defense,
      // Prototipo: afinidad fija (ascua) salvo que se indique. La asignación aleatoria por expedición
      // llega con el meta-progreso (Hito 7).
      affinity: opts.affinity ?? 'ascua',
      techniques: ['brasa_circular'],
      inventory: { unguento_musgo: 1 },
      statuses: [],
    },
    enemies,
    chests: room.chestStarts.map((pos, i) => ({ id: `chest-${i}`, pos, opened: false })),
    explored: new Array<boolean>(room.map.width * room.map.height).fill(false),
    status: 'playing',
    log: ['Entras en la cripta. El aire huele a ceniza.'],
  };

  for (const i of computeVisible(state.map, state.player.pos, BALANCE.visionRadius)) {
    state.explored[i] = true;
  }
  return state;
}
