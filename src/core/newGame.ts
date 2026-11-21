import { floorHints, terrainHints } from './hints';
import { AFFINITIES } from '../content/affinities';
import { BALANCE } from '../content/balance';
import { isBossFloor } from '../content/enemies';
import { heroFor } from '../content/heroes';
import { techniquesFor } from '../content/techniques';
import { generateLevel } from '../dungeon/generator';
import { levelFromRoom } from '../dungeon/ascii';
import { computeVisible } from './grid';
import { visionRadiusOf } from './sight';
import { ALWAYS_KNOWN, shuffleAppearances, STARTING_KNOWN } from '../content/arcana';
import { trinketAppearances } from '../content/trinkets';
import { nextRandom } from './rng';
import type { GameState, NewGameOptions, RunStats } from './types';

export const SCHEMA_VERSION = 11;

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
  coinsFound: 0,
  upgrades: 0,
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
  const level = opts.room ? levelFromRoom(opts.room) : generateLevel({ seed: opts.seed, floor: 1, boss: maxFloor <= 1 || isBossFloor(1) });

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
      strength: BALANCE.player.strength,
      level: 1,
      xp: 0,
      affinity,
      affinity2: null,
      tier2: 0,
      techniques: techniquesFor(affinity, 1),
      grimoire: [],
      weapons: [],
      armors: [],
      trinkets: [],
      identified: [],
      wear: {},
      known: [...ALWAYS_KNOWN, ...STARTING_KNOWN[affinity]],
      notes: [],
      relics: [],
      inventory: { shuriken: 5 },
      coins: 0,
      shards: 0,
      keys: [],
      weaponLevels: {},
      equipment: { weapon: null, armor: null, ring: null, pendant: null },
      statuses: [],
    },
    enemies: level.enemies,
    allies: [],
    companion: null,
    echo: opts.echo ?? null,
    chests: level.chests,
    barriers: [],
    hazards: [],
    hintedSecrets: [],
    drops: level.drops,
    telegraphs: [],
    npcs: level.npcs,
    scrolls: level.scrolls,
    stats: emptyStats(),
    floorEnemies: level.enemies.length,
    floorKilled: 0,
    floorCleared: false,
    bossesDefeated: 0,
    affinityOffer: null,
    appearance: {},
    seenDialogues: [],
    explored: new Array<boolean>(level.map.width * level.map.height).fill(false),
    status: 'playing',
    log: [`${heroFor(affinity).name}, ${heroFor(affinity).epithet}, entra en la cripta. El aire huele a ceniza.`],
  };

  state.appearance = shuffleAppearances(() => {
    const r = nextRandom(state.rngState);
    state.rngState = r.state;
    return r.value;
  });
  Object.assign(state.appearance, trinketAppearances(state.seed));
  for (const i of computeVisible(state.map, state.player.pos, visionRadiusOf(state))) {
    state.explored[i] = true;
  }
  state.log.push(...floorHints(state), ...terrainHints(state));
  return state;
}
