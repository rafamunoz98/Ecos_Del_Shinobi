// Tipos del núcleo. Todo el estado es serializable (JSON plano): sin Set, Map ni instancias de Phaser.

export interface Vec {
  readonly x: number;
  readonly y: number;
}

/**
 * bush: arbusto (transitable, tapa la visión y esconde); door: puerta (transitable, tapa la visión salvo que alguien esté en ella);
 * locked: puerta con candado de una cámara sellada (no se puede cruzar ni ver a través; se abre con la llave de hierro y pasa a ser 'door').
 */
export type TerrainKind = 'floor' | 'wall' | 'exit' | 'bush' | 'door' | 'locked';

export interface GameMap {
  readonly width: number;
  readonly height: number;
  /** Fila a fila: índice = y * width + x */
  readonly tiles: TerrainKind[];
}

export type Affinity = 'ascua' | 'marea' | 'vendaval' | 'piedra' | 'rayo';
export type StatusId = 'quemadura' | 'aturdido' | 'protegido';
export type EquipSlot = 'weapon' | 'armor';

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
  /** Poder base; el arma suma su bonificación (ver combat.effectivePower). */
  power: number;
  /** Defensa base; la vestimenta y el estado "protegido" suman (ver combat.effectiveDefense). */
  defense: number;
  level: number;
  xp: number;
  affinity: Affinity;
  techniques: string[];
  /** Armas cuerpo a cuerpo que posee (la equipada es equipment.weapon). */
  weapons: string[];
  /** Notas de lore encontradas (ids de content/story). */
  notes: string[];
  /** Reliquias ganadas en la expedición (p. ej. el sello antiguo del Campanero). */
  relics: string[];
  /** Consumibles y arrojadizas: id → cantidad. */
  inventory: Record<string, number>;
  /** Monedas y esquirlas de campana (pagan las mejoras de la forja). */
  coins: number;
  shards: number;
  /** Llaves que lleva (ids de content/items KEYS). Se deshacen al cambiar de sector. */
  keys: string[];
  /** Nivel de mejora de cada arma (forja): id de arma → nivel. Ausente = 0. */
  weaponLevels: Record<string, number>;
  equipment: Record<EquipSlot, string | null>;
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
  /** Distancia máxima a la que puede notar al jugador (con línea de visión). */
  aggroRange: number;
  /** Rondas de alerta que le quedan (0 = no sabe de ti). Mientras sea >0 te persigue. */
  alert: number;
  /** Última posición donde te vio. */
  lastSeen: Vec | null;
  statuses: StatusEffect[];
  /** Fase de combate de un jefe (1-3); 0 en enemigos normales. */
  phase: number;
  /** Armas arrojadizas clavadas en él (id → cantidad); caen al suelo cuando muere. */
  stuck: Record<string, number>;
}

/** Ataque anunciado: las casillas se marcan y se liberan cuando `turns` llega a 0 (hay tiempo de apartarse o interrumpirlo). */
export interface Telegraph {
  id: string;
  ownerId: string;
  /** Nombre del ataque (para el registro). */
  name: string;
  cells: Vec[];
  power: number;
  /** Rondas que faltan para liberarse. */
  turns: number;
}

/** Personaje no jugador o evento fijo en el mapa (maestra, altar...). Bloquea el paso como un cofre. */
export interface Npc {
  id: string;
  kind: string;
  pos: Vec;
  /** Ya se eligió una opción: no ofrece más. */
  used: boolean;
}

/** Pergamino de lore en el suelo; se recoge al pisarlo. */
export interface Scroll {
  id: string;
  pos: Vec;
  noteId: string;
}

/** Contadores de la expedición para el resumen final. */
export interface RunStats {
  kills: number;
  chestsOpened: number;
  damageDealt: number;
  damageTaken: number;
  techniquesUsed: number;
  itemsUsed: number;
  sneakAttacks: number;
  decisions: number;
  bossDefeated: boolean;
  /** Monedas reunidas y mejoras hechas en la forja. */
  coinsFound: number;
  upgrades: number;
  /** Qué te derrotó: tipo de enemigo o 'quemadura' (null si sigues en pie o ganaste). */
  defeatedBy: string | null;
}

export interface Chest {
  id: string;
  pos: Vec;
  opened: boolean;
  /** Cofre lacado: exige la llave de laca y guarda equipo mejor. */
  locked?: boolean;
}

/** Obstáculo temporal creado por una técnica: bloquea el paso de todos, no la visión. */
export interface Barrier {
  pos: Vec;
  turns: number;
}

/** Objeto en el suelo (monedas, llaves, consumibles, arrojadizas, equipo...). Se recoge al pisarlo. */
export interface Drop {
  pos: Vec;
  itemId: string;
  count: number;
}

export type RunStatus = 'playing' | 'won' | 'lost';

export interface GameState {
  schemaVersion: number;
  seed: number;
  /** Estado del generador pseudoaleatorio (se avanza dentro del core). */
  rngState: number;
  turn: number;
  /** Sector actual (1 = el primero). */
  floor: number;
  /** Sector final: su salida (sellada mientras viva el jefe) gana la expedición. */
  maxFloor: number;
  map: GameMap;
  player: Player;
  enemies: Enemy[];
  chests: Chest[];
  barriers: Barrier[];
  drops: Drop[];
  telegraphs: Telegraph[];
  npcs: Npc[];
  scrolls: Scroll[];
  stats: RunStats;
  /** Diálogos que ya se mostraron y no deben repetirse solos (introducción del jefe, etc.). */
  seenDialogues: string[];
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
  | { type: 'Throw'; itemId: string; target: Vec }
  | { type: 'EquipWeapon'; weaponId: string }
  | { type: 'Interact'; target: Vec }
  /** Elige una opción de un maestro o altar (ver content/story). */
  | { type: 'Choose'; npcId: string; optionId: string }
  /** Mejora un arma en una mesa de forja adyacente, pagando con monedas o con esquirlas. */
  | { type: 'Upgrade'; npcId: string; weaponId: string; pay: 'coins' | 'shards' }
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
  | 'not_aligned'
  | 'unknown_item'
  | 'no_item'
  | 'not_throwable'
  | 'already_equipped'
  | 'nothing_to_interact'
  | 'already_opened'
  | 'exit_sealed'
  | 'locked_door'
  | 'locked_chest'
  | 'not_at_forge'
  | 'max_upgrade'
  | 'cannot_afford'
  | 'unknown_option'
  | 'option_unavailable'
  | 'already_used'
  | 'extraction_unavailable';

// ---------- Eventos (la presentación los escucha) ----------

export type GameEvent =
  | { type: 'PlayerMoved'; from: Vec; to: Vec }
  | { type: 'PlayerWaited'; kiroRecovered: number }
  | { type: 'TechniqueCast'; techniqueId: string; target: Vec; cells: Vec[] }
  | { type: 'KiroSpent'; amount: number }
  | { type: 'DamageApplied'; targetId: string; amount: number; source: string }
  | { type: 'StatusApplied'; targetId: string; status: StatusId; turns: number }
  | { type: 'BarrierRaised'; cells: Vec[] }
  | { type: 'ItemUsed'; itemId: string }
  | { type: 'PlayerAttacked'; weaponId: string; cells: Vec[]; targets: Vec[] }
  | { type: 'ItemThrown'; itemId: string; from: Vec; to: Vec; hit: boolean }
  | { type: 'ItemPickedUp'; itemId: string; count: number }
  | { type: 'ItemStuck'; enemyId: string; itemId: string }
  | { type: 'DoorUnlocked'; pos: Vec }
  | { type: 'WeaponUpgraded'; weaponId: string; level: number }
  | { type: 'WeaponEquipped'; weaponId: string }
  | { type: 'EnemyAlerted'; enemyId: string }
  | { type: 'EnemyLostTrack'; enemyId: string }
  | { type: 'SneakAttack'; enemyId: string }
  | { type: 'HealApplied'; amount: number; resource: 'hp' | 'kiro' }
  | { type: 'ChestOpened'; chestId: string; itemId: string }
  | { type: 'EquipmentEquipped'; slot: EquipSlot; itemId: string }
  | { type: 'XpGained'; amount: number }
  | { type: 'LevelUp'; level: number; learned: string[] }
  | { type: 'EnemyMoved'; enemyId: string; from: Vec; to: Vec }
  | { type: 'TelegraphStarted'; ownerId: string; cells: Vec[]; turns: number }
  | { type: 'TelegraphReleased'; ownerId: string; cells: Vec[]; hit: boolean }
  | { type: 'TelegraphCancelled'; ownerId: string }
  | { type: 'BossPhase'; enemyId: string; phase: number }
  | { type: 'EnemySummoned'; enemyId: string; pos: Vec }
  | { type: 'Dialogue'; id: string }
  | { type: 'NpcTalked'; npcId: string }
  | { type: 'NpcChoice'; npcId: string; optionId: string }
  | { type: 'NoteFound'; noteId: string }
  | { type: 'BossDefeated'; enemyId: string }
  | { type: 'EnemyDefeated'; enemyId: string }
  | { type: 'FloorChanged'; floor: number }
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
  /** Si se omite, se sortea una de las cinco con la semilla (decisión de diseño). */
  affinity?: Affinity;
  /** Sala en ASCII (pruebas y prototipos). Sin ella, se genera el sector 1 proceduralmente. */
  room?: readonly string[];
  /** Número de sectores. Por defecto 3 (o 1 si se usa `room`). */
  floors?: number;
}
