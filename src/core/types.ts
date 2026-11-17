// Tipos del núcleo. Todo el estado es serializable (JSON plano): sin Set, Map ni instancias de Phaser.

export interface Vec {
  readonly x: number;
  readonly y: number;
}

export type TerrainKind = 'floor' | 'wall' | 'exit';

export interface GameMap {
  readonly width: number;
  readonly height: number;
  /** Fila a fila: índice = y * width + x */
  readonly tiles: TerrainKind[];
}

export type Affinity = 'ascua' | 'marea' | 'vendaval' | 'piedra' | 'rayo';
export type StatusId = 'quemadura';

export interface StatusEffect {
  id: StatusId;
  turns: number;
}

export interface Player {
  pos: Vec;
  hp: number;
  maxHp: number;
  kiro: number;
  maxKiro: number;
  power: number;
  defense: number;
  affinity: Affinity;
  techniques: string[];
  inventory: Record<string, number>;
  statuses: StatusEffect[];
}

export interface Enemy {
  id: string;
  kind: string;
  pos: Vec;
  hp: number;
  maxHp: number;
  power: number;
  defense: number;
  aggroRange: number;
  statuses: StatusEffect[];
}

export interface Chest {
  id: string;
  pos: Vec;
  opened: boolean;
}

export type RunStatus = 'playing' | 'won' | 'lost';

export interface GameState {
  schemaVersion: number;
  seed: number;
  /** Estado del generador pseudoaleatorio (se avanza dentro del core). */
  rngState: number;
  turn: number;
  map: GameMap;
  player: Player;
  enemies: Enemy[];
  chests: Chest[];
  /** Casillas ya vistas (niebla de guerra). Mismo índice que map.tiles. */
  explored: boolean[];
  status: RunStatus;
  log: string[];
}

// ---------- Comandos ----------

export type Command =
  | { type: 'Move'; dx: number; dy: number }
  | { type: 'Wait' }
  | { type: 'BasicAttack'; target: Vec }
  | { type: 'UseTechnique'; techniqueId: string; target: Vec }
  | { type: 'UseItem'; itemId: string }
  | { type: 'Interact'; target: Vec }
  | { type: 'Extract' };

export type InvalidReason =
  | 'run_over'
  | 'bad_direction'
  | 'out_of_bounds'
  | 'blocked'
  | 'occupied'
  | 'no_target'
  | 'not_adjacent'
  | 'unknown_technique'
  | 'not_known'
  | 'wrong_affinity'
  | 'not_enough_kiro'
  | 'out_of_range'
  | 'no_line_of_sight'
  | 'unknown_item'
  | 'no_item'
  | 'nothing_to_interact'
  | 'already_opened'
  | 'extraction_unavailable';

// ---------- Eventos (la presentación los escucha) ----------

export type GameEvent =
  | { type: 'PlayerMoved'; from: Vec; to: Vec }
  | { type: 'PlayerWaited'; kiroRecovered: number }
  | { type: 'TechniqueCast'; techniqueId: string; target: Vec; cells: Vec[] }
  | { type: 'KiroSpent'; amount: number }
  | { type: 'DamageApplied'; targetId: string; amount: number; source: string }
  | { type: 'StatusApplied'; targetId: string; status: StatusId; turns: number }
  | { type: 'ItemUsed'; itemId: string }
  | { type: 'HealApplied'; amount: number; resource: 'hp' | 'kiro' }
  | { type: 'ChestOpened'; chestId: string; itemId: string }
  | { type: 'EnemyMoved'; enemyId: string; from: Vec; to: Vec }
  | { type: 'EnemyDefeated'; enemyId: string }
  | { type: 'PlayerDefeated' }
  | { type: 'RunWon' };

export interface CommandResult {
  ok: boolean;
  reason?: InvalidReason;
  /** Texto en español para mostrar al jugador cuando la acción es inválida. */
  message?: string;
  /** Si la acción es inválida, es EXACTAMENTE el mismo objeto de entrada (no se consume turno). */
  state: GameState;
  events: GameEvent[];
}

export interface NewGameOptions {
  seed: number;
  affinity?: Affinity;
  /** Sala en ASCII; por defecto, la sala del prototipo. */
  room?: readonly string[];
}
