import { getEnemy } from '../../content/enemies';
import { getTechnique, techniqueAffinity } from '../../content/techniques';
import { getWeapon } from '../../content/weapons';
import type { GameEvent, GameState } from '../../core/types';

/**
 * Qué suena y cuándo. Todo aquí es puro (sin Web Audio): traduce los eventos del núcleo en "cues" y el estado de la partida
 * en un ánimo para la música. Así se puede probar sin navegador y el núcleo sigue sin saber nada del sonido.
 */
export type Cue =
  | 'step' | 'wait' | 'search' | 'secret'
  | 'slash' | 'whip' | 'thrust' | 'sneak' | 'hit' | 'hurt' | 'kill' | 'boss_down'
  | 'cast_ascua' | 'cast_marea' | 'cast_vendaval' | 'cast_piedra' | 'cast_rayo' | 'cast_neutral'
  | 'throw' | 'pickup' | 'coin' | 'unlock' | 'chest' | 'equip' | 'potion' | 'heal' | 'identify' | 'learn' | 'levelup'
  | 'stairs' | 'fall' | 'alert' | 'warn' | 'boom' | 'boss_phase' | 'shield' | 'clang' | 'shatter' | 'poof' | 'thud'
  | 'barrier' | 'status' | 'summon' | 'dialog' | 'error' | 'ui' | 'defeat' | 'victory';

export const ALL_CUES: readonly Cue[] = [
  'step', 'wait', 'search', 'secret', 'slash', 'whip', 'thrust', 'sneak', 'hit', 'hurt', 'kill', 'boss_down',
  'cast_ascua', 'cast_marea', 'cast_vendaval', 'cast_piedra', 'cast_rayo', 'cast_neutral',
  'throw', 'pickup', 'coin', 'unlock', 'chest', 'equip', 'potion', 'heal', 'identify', 'learn', 'levelup',
  'stairs', 'fall', 'alert', 'warn', 'boom', 'boss_phase', 'shield', 'clang', 'shatter', 'poof', 'thud',
  'barrier', 'status', 'summon', 'dialog', 'error', 'ui', 'defeat', 'victory',
];

const PLAYER_ID = 'player';

/** Cues sueltos que no merecen sonar si hay algo más importante en la misma acción. */
const QUIET: ReadonlySet<Cue> = new Set<Cue>(['step', 'wait', 'dialog', 'status']);

/** Como mucho tantos efectos distintos por acción (más se convierte en ruido). */
const MAX_CUES = 5;

function cueFor(ev: GameEvent): Cue | null {
  switch (ev.type) {
    case 'PlayerMoved':
      return 'step';
    case 'PlayerWaited':
      return 'wait';
    case 'PlayerSearched':
      return 'search';
    case 'SecretFound':
      return 'secret';
    case 'TechniqueCast': {
      const a = techniqueAffinity(getTechnique(ev.techniqueId));
      return a ? (`cast_${a}` as Cue) : 'cast_neutral';
    }
    case 'PlayerAttacked': {
      const kind = getWeapon(ev.weaponId)?.kind ?? 'blade';
      return kind === 'blade' ? 'slash' : kind === 'whip' ? 'whip' : 'thrust';
    }
    case 'SneakAttack':
      return 'sneak';
    case 'DamageApplied':
      return ev.targetId === PLAYER_ID ? 'hurt' : 'hit';
    case 'StatusApplied':
      return 'status';
    case 'BarrierRaised':
      return 'barrier';
    case 'ItemUsed':
      return 'potion';
    case 'ItemThrown':
      return 'throw';
    case 'ItemPickedUp':
    case 'NoteFound':
      return 'pickup';
    case 'ItemBought':
      return 'coin';
    case 'DoorUnlocked':
      return 'unlock';
    case 'ChestOpened':
      return 'chest';
    case 'WeaponEquipped':
    case 'EquipmentEquipped':
    case 'WeaponUpgraded':
      return 'equip';
    case 'GearIdentified':
    case 'ArcanaIdentified':
    case 'GearPurified':
      return 'identify';
    case 'TechniqueLearned':
    case 'AffinityLearned':
    case 'NpcChoice':
      return 'learn';
    case 'HealApplied':
      return 'heal';
    case 'AllySummoned':
    case 'CompanionJoined':
    case 'EnemySummoned':
      return 'summon';
    case 'LevelUp':
      return 'levelup';
    case 'EnemyAlerted':
      return 'alert';
    case 'TelegraphStarted':
      return 'warn';
    case 'TelegraphReleased':
      return ev.hit ? 'boom' : null;
    case 'BossPhase':
      return 'boss_phase';
    case 'ShieldRaised':
      return 'shield';
    case 'ShieldHit':
      return 'clang';
    case 'ShieldBroken':
      return 'shatter';
    case 'Substitution':
      return 'poof';
    case 'PlayerShoved':
      return 'thud';
    case 'Dialogue':
      return 'dialog';
    case 'EnemyDefeated':
    case 'EchoDefeated':
    case 'AllyDefeated':
      return 'kill';
    case 'BossDefeated':
      return 'boss_down';
    case 'FloorChanged':
      return 'stairs';
    case 'PlayerFell':
      return 'fall';
    case 'PlayerDefeated':
      return 'defeat';
    case 'RunWon':
      return 'victory';
    default:
      return null;
  }
}

/**
 * Efectos de una acción, en orden cronológico y sin repetir. Si hay algo más relevante que un paso o una espera, estos
 * se omiten; y si hay demasiados, se queda con los últimos (lo que acaba de pasar pesa más que lo que lo precedió).
 */
export function cuesFor(events: readonly GameEvent[]): Cue[] {
  const out: Cue[] = [];
  for (const ev of events) {
    const cue = cueFor(ev);
    if (cue && !out.includes(cue)) out.push(cue);
  }
  const loud = out.filter((c) => !QUIET.has(c));
  const base = loud.length > 0 ? loud : out;
  return base.slice(-MAX_CUES);
}

/** Ánimo de la música: explorar, tensión (algún enemigo te persigue) o jefe; `off` cuando la expedición ha terminado. */
export type Mood = 'explore' | 'tense' | 'boss' | 'off';

export interface MusicSetting {
  mood: Mood;
  /** Nota raíz (MIDI): cambia con el sector para que cada zona tenga su color. */
  root: number;
}

const ROOTS: readonly number[] = [50, 52, 47, 55, 48, 53];

export function moodFor(s: GameState): MusicSetting {
  const root = ROOTS[(Math.max(1, s.floor) - 1) % ROOTS.length] ?? 50;
  if (s.status !== 'playing') return { mood: 'off', root };
  const boss = s.enemies.find((e) => getEnemy(e.kind)?.behavior === 'boss');
  if (boss && boss.alert > 0) return { mood: 'boss', root };
  if (s.enemies.some((e) => e.alert > 0)) return { mood: 'tense', root };
  return { mood: 'explore', root };
}
