import { AFFINITIES } from '../content/affinities';
import { BALANCE } from '../content/balance';
import { techniquesFor } from '../content/techniques';
import { generateLevel } from '../dungeon/generator';
import { levelFromRoom } from '../dungeon/ascii';
import { computeVisible } from './grid';
import { visionRadiusOf } from './sight';
import { nextRandom } from './rng';
import type { GameState, NewGameOptions, RunStats } from './types';

export const SCHEMA_VERSION = 4;

export const emptyStats = (): RunStats => ({
  kills: 0,
  chestsOpened: 0,
  damageDealt: 0,
  damageTaken: 0,
  techniquesUsed: 0,
  itemsUsed: 0,
  sneakAttacks: 0,
  decisions: 0,
  bossDefeated: false,
  defeatedBy: null,
});

export function createGame(opts: NewGameOptions): GameState {
  let rngState = opts.seed >>> 0;

  // La afinidad inicial se sortea con la semilla, salvo que se fije (pruebas).
  let affinity = opts.affinity;
  if (!affinity) {
    const r = nextRandom(rngState);
    rngState = r.state;
    affinity = AFFINITIES[Math.floor(r.value * AFFINITIES.length)];
  }

  const maxFloor = opts.floors ?? (opts.room ? 1 : BALANCE.maxFloors);
  const level = opts.room ? levelFromRoom(opts.room) : generateLevel({ seed: opts.seed, floor: 1, boss: maxFloor <= 1 });

  const state: GameState = {
    schemaVersion: SCHEMA_VERSION,
    seed: opts.seed >>> 0,
    rngState,
    turn: 0,
    floor: 1,
    maxFloor,
    map: level.map,
    player: {
      pos: level.playerStart,
      hp: BALANCE.player.maxHp,
      maxHp: BALANCE.player.maxHp,
      kiro: BALANCE.player.maxKiro,
      maxKiro: BALANCE.player.maxKiro,
      power: BALANCE.player.power,
      defense: BALANCE.player.defense,
      level: 1,
      xp: 0,
      affinity,
      techniques: techniquesFor(affinity, 1),
      weapons: ['tanto_gastado'],
      notes: [],
      relics: [],
      inventory: { unguento_musgo: 1, shuriken: 5 },
      equipment: { weapon: 'tanto_gastado', armor: null },
      statuses: [],
    },
    enemies: level.enemies,
    chests: level.chests,
    barriers: [],
    drops: [],
    telegraphs: [],
    npcs: level.npcs,
    scrolls: level.scrolls,
    stats: emptyStats(),
    seenDialogues: [],
    explored: new Array<boolean>(level.map.width * level.map.height).fill(false),
    status: 'playing',
    log: ['Entras en la cripta. El aire huele a ceniza.'],
  };

  for (const i of computeVisible(state.map, state.player.pos, visionRadiusOf(state))) {
    state.explored[i] = true;
  }
  return state;
}
