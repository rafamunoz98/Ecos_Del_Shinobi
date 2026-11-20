import { floorHints } from './hints';
import { BALANCE } from '../content/balance';
import { ENEMIES, getEnemy, isBossFloor, type EnemyDef, type SkillDef } from '../content/enemies';
import { CHEST_LOOT, CURRENCY, KEYS, LACQUER_LOOT, MANUAL_ITEM, coinAmount, getEquipment, getItem, isKey, lootTableFor, type LootEntry } from '../content/items';
import { itemName } from '../content/names';
import { getTechnique, learnableFor, techniquesFor, type TechniqueDef } from '../content/techniques';
import { getAllyDef } from '../content/allies';
import { MERCHANT_KIND, SHOP_PRICES } from '../content/shop';
import { getArcana, getPotion, getScroll, isArcana, isPotion, POTIONS, RANDOM_POTION, RANDOM_SCROLL, rollArcana, SCROLLS, type PotionEffect, type ScrollEffect } from '../content/arcana';
import { baseGearId, getMod, isCursedGear, makeGearId, modsFor, purified, type GearSlot } from '../content/enchants';
import { getNpc, getNote, type NpcOption } from '../content/story';
import { STATUS_NAMES } from '../content/describe';
import { getThrowable, getWeapon, weaponLabel, WEAPONS, type WeaponDef } from '../content/weapons';
import { FORGE_KIND, generateLevel } from '../dungeon/generator';
import { createEnemy } from '../dungeon/spawn';
import { calcDamage, effectiveDefense, effectivePower, weaponLevel } from './combat';
import { DIRS, DIRS8, adjacent, chebyshev, equals, findPath, hasLineOfSight, inBounds, isWalkable, lineCells, manhattan, stepOk, terrainAt } from './grid';
import { mixSeed, nextRandom, Rng } from './rng';
import { canSeeEntity, enemySees, openDoors, visibleCells } from './sight';
import type {
  Chest,
  Command,
  CommandResult,
  Enemy,
  GameEvent,
  GameState,
  InvalidReason,
  Npc,
  Offer,
  Player,
  StatusId,
  Telegraph,
  Vec,
} from './types';

/*
 * Orden de una ronda (documento de reglas, sección 1):
 * 1 comando · 2 validar · 3 si es inválida: informar y NO consumir turno · 4-5 acción del jugador y efectos ·
 * 6 estados del jugador · 7 enemigos vivos (en orden de lista) · 8 estados de enemigos y barreras ·
 * 9 muerte/victoria/recompensas · 10 presentación (fuera del core).
 * Extras: los enemigos derrotados se retiran antes de actuar; si el jugador gana o cae, no hay fase enemiga.
 */

export const REASON_TEXT: Record<InvalidReason, string> = {
  run_over: 'La expedición ya terminó.',
  bad_direction: 'Solo puedes moverte una casilla (también en diagonal).',
  corner: 'No puedes cortar esquinas: hay una pared en medio.',
  out_of_bounds: 'Eso queda fuera del mapa.',
  blocked: 'Hay un obstáculo en el camino.',
  occupied: 'Esa casilla está ocupada.',
  no_target: 'No hay ningún objetivo ahí.',
  not_adjacent: 'Está demasiado lejos.',
  unknown_technique: 'No conoces esa técnica.',
  not_known: 'No tienes equipada esa técnica.',
  wrong_affinity: 'Tu afinidad no permite usar esa técnica.',
  not_enough_kiro: 'No tienes kiro suficiente.',
  out_of_range: 'El objetivo está fuera de alcance.',
  no_line_of_sight: 'No tienes línea de visión.',
  not_aligned: 'Debe estar en línea recta: arriba, abajo, izquierda o derecha.',
  unknown_item: 'Ese objeto no existe.',
  no_item: 'No te quedan de ese objeto.',
  not_throwable: 'Eso no se puede lanzar.',
  already_equipped: 'Ya la llevas equipada.',
  already_known: 'Ya conoces esa técnica.',
  not_in_grimoire: 'Esa técnica no está en tu grimorio.',
  cursed: 'Un sello maldito te impide soltarla: purifícala (Sello de Purificación o forja).',
  bad_slot: 'Elige cuál de tus técnicas equipadas sustituir.',
  nothing_to_interact: 'No hay nada con lo que interactuar ahí.',
  already_opened: 'Ya está abierto.',
  exit_sealed: 'La salida está sellada: algo guarda esta cámara.',
  locked_door: 'La puerta tiene un candado de hierro. Busca la llave de hierro en este sector.',
  locked_chest: 'El cofre está lacrado. Busca la llave de laca en este sector.',
  not_at_forge: 'Necesitas estar junto a una mesa de forja.',
  max_upgrade: 'Esa arma ya está al máximo.',
  cannot_afford: 'No tienes suficientes monedas o esquirlas.',
  sold_out: 'Eso ya está vendido.',
  unknown_option: 'Esa opción no existe.',
  option_unavailable: 'No puedes pagar el coste de esa opción.',
  already_used: 'Ya elegiste aquí.',
  extraction_unavailable: 'Aún no puedes extraerte de la expedición.',
};

// ---------- Consultas ----------

const enemyAt = (s: GameState, p: Vec): Enemy | undefined => s.enemies.find((e) => equals(e.pos, p));
const chestAt = (s: GameState, p: Vec): Chest | undefined => s.chests.find((c) => equals(c.pos, p));
const barrierAt = (s: GameState, p: Vec): boolean => s.barriers.some((b) => equals(b.pos, p));
const npcAt = (s: GameState, p: Vec): Npc | undefined => s.npcs.find((n) => equals(n.pos, p));
const isBoss = (e: Enemy): boolean => getEnemy(e.kind)?.behavior === 'boss';
/** ¿Queda un jefe vivo en el sector? (mientras viva, la salida está sellada) */
export const bossAlive = (s: GameState): boolean => s.enemies.some(isBoss);
const enemyName = (e: Enemy): string => getEnemy(e.kind)?.name ?? e.kind;
/** Defensa de un enemigo contando el estado «vulnerable». */
const defenseOf = (e: Enemy): number => Math.max(0, e.defense - (e.statuses.some((st) => st.id === 'vulnerable') ? BALANCE.vulnerableDefense : 0));
/** Estados a los que un jefe es inmune. */
const BOSS_IMMUNE: readonly string[] = ['aturdido', 'atado', 'ralentizado'];
/** Los manuales de técnica viven en la mochila como «manual:<id de técnica>». */
export const MANUAL_PREFIX = 'manual:';

/** Casilla transitable y vacía: sin pared, enemigo, cofre, barrera ni jugador. */
function cellFree(s: GameState, p: Vec): boolean {
  return (
    inBounds(s.map, p) && isWalkable(s.map, p) && !enemyAt(s, p) && !allyAt(s, p) && !chestAt(s, p) && !npcAt(s, p) && !barrierAt(s, p) && !equals(s.player.pos, p)
  );
}

// La visión y el sigilo viven en sight.ts; se reexportan para la presentación.
export { canSeeEntity, enemySees, openDoors, visibleCells };

const sign = (n: number): number => (n > 0 ? 1 : n < 0 ? -1 : 0);

/** Dirección (cardinal o diagonal) si `to` está en la misma fila, columna o diagonal que `from` (y no es la misma casilla). */
function alignedDir(from: Vec, to: Vec): Vec | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return null;
  if (dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy)) return { x: sign(dx), y: sign(dy) };
  return null;
}

/** Dirección cardinal dominante de `from` hacia `to` (empates: horizontal). */
function dominantDir(from: Vec, to: Vec): Vec {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return { x: 1, y: 0 };
  return Math.abs(dx) >= Math.abs(dy) ? { x: sign(dx), y: 0 } : { x: 0, y: sign(dy) };
}

/** Dirección de empuje: la diagonal exacta si están alineados en diagonal; si no, la cardinal dominante. */
function pushDir(from: Vec, to: Vec): Vec {
  const d = alignedDir(from, to);
  return d ?? dominantDir(from, to);
}

/** Casillas transitables a distancia ≤ radius: en rombo (cruz) o en cuadrado (con diagonales), con o sin línea de visión. */
function region(s: GameState, origin: Vec, radius: number, needLos: boolean, shape: 'diamond' | 'square' = 'diamond'): Vec[] {
  const cells: Vec[] = [];
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (shape === 'diamond' && Math.abs(dx) + Math.abs(dy) > radius) continue;
      const p = { x: origin.x + dx, y: origin.y + dy };
      if (!inBounds(s.map, p) || !isWalkable(s.map, p)) continue;
      if (needLos && !hasLineOfSight(s.map, origin, p, openDoors(s))) continue;
      cells.push(p);
    }
  }
  return cells;
}

const diamond = (s: GameState, origin: Vec, radius: number, needLos: boolean): Vec[] => region(s, origin, radius, needLos, 'diamond');

const allyAt = (s: GameState, p: Vec) => s.allies.find((a) => equals(a.pos, p));

/** Carrera de una técnica 'dash': casillas recorridas, destino (null si no te mueves) y enemigo golpeado. */
function dashPlan(s: GameState, length: number, target: Vec): { cells: Vec[]; dest: Vec | null; victim: Enemy | undefined } {
  const from = s.player.pos;
  const dir = alignedDir(from, target);
  const cells: Vec[] = [];
  let dest: Vec | null = null;
  let victim: Enemy | undefined;
  if (!dir) return { cells, dest, victim };
  let prev = from;
  for (let i = 1; i <= length; i++) {
    const c = { x: from.x + dir.x * i, y: from.y + dir.y * i };
    if (!inBounds(s.map, c) || !isWalkable(s.map, c) || !stepOk(s.map, prev, c) || barrierAt(s, c) || chestAt(s, c) || npcAt(s, c) || allyAt(s, c)) break;
    const e = enemyAt(s, c);
    if (e) {
      victim = e;
      cells.push(c);
      break;
    }
    cells.push(c);
    dest = c;
    prev = c;
  }
  return { cells, dest, victim };
}

/** Casillas que afecta una técnica lanzada sobre `target` (sirve para el aviso previo y para resolverla). */
function techniqueCells(s: GameState, def: TechniqueDef, target: Vec): Vec[] {
  const from = s.player.pos;
  const t = def.target;
  switch (t.kind) {
    case 'self':
      return [from];
    case 'area':
      return inBounds(s.map, target) ? region(s, target, t.areaRadius, false, t.shape) : [];
    case 'burst':
      return region(s, from, t.radius, true, t.shape).filter((c) => !equals(c, from));
    case 'dash':
      return dashPlan(s, t.length, target).cells;
    case 'blink':
      return inBounds(s.map, target) ? [target] : [];
    case 'line': {
      const dir = alignedDir(from, target);
      if (!dir) return [];
      const cells: Vec[] = [];
      for (let i = 1; i <= t.length; i++) {
        const c = { x: from.x + dir.x * i, y: from.y + dir.y * i };
        if (!inBounds(s.map, c) || !isWalkable(s.map, c) || barrierAt(s, c)) break;
        cells.push(c);
      }
      return cells;
    }
    case 'barrier': {
      const dir = dominantDir(from, target);
      const perp = dir.x === 0 ? { x: 1, y: 0 } : { x: 0, y: 1 };
      return [target, { x: target.x + perp.x, y: target.y + perp.y }, { x: target.x - perp.x, y: target.y - perp.y }].filter((c) =>
        cellFree(s, c),
      );
    }
  }
}

function validateTechnique(s: GameState, techniqueId: string, target: Vec): InvalidReason | null {
  const def = getTechnique(techniqueId);
  if (!def) return 'unknown_technique';
  const p = s.player;
  if (!p.techniques.includes(techniqueId)) return 'not_known';
  if (def.affinity && def.affinity !== p.affinity) return 'wrong_affinity';
  if (p.kiro < def.kiroCost) return 'not_enough_kiro';
  const t = def.target;
  switch (t.kind) {
    case 'self':
    case 'burst':
      return null;
    case 'line':
    case 'dash':
      if (!inBounds(s.map, target)) return 'out_of_bounds';
      if (!alignedDir(p.pos, target)) return 'not_aligned';
      return techniqueCells(s, def, target).length > 0 ? null : 'blocked';
    case 'area':
    case 'blink':
    case 'barrier': {
      if (!inBounds(s.map, target)) return 'out_of_bounds';
      if (!isWalkable(s.map, target)) return 'blocked';
      if (manhattan(p.pos, target) > t.range) return 'out_of_range';
      const needLos = t.kind === 'area' ? t.lineOfSight : true;
      if (needLos && !hasLineOfSight(s.map, p.pos, target, openDoors(s))) return 'no_line_of_sight';
      if (t.kind === 'blink' && !cellFree(s, target)) return 'occupied';
      if (t.kind === 'barrier' && techniqueCells(s, def, target).length === 0) return 'occupied';
      return null;
    }
  }
}

// ---------- Armas ----------

interface AttackPlan {
  reason: InvalidReason | null;
  cells: Vec[];
  hits: Enemy[];
  weapon: WeaponDef;
}

/** Qué casillas y enemigos alcanza el arma equipada al atacar hacia `target`. */
function attackPlan(s: GameState, target: Vec): AttackPlan {
  const weapon = getWeapon(s.player.equipment.weapon) ?? WEAPONS.tanto_gastado;
  const p = s.player.pos;
  const fail = (reason: InvalidReason): AttackPlan => ({ reason, cells: [], hits: [], weapon });
  if (weapon.kind === 'blade') {
    if (!adjacent(s.map, p, target)) return fail('not_adjacent');
    const e = enemyAt(s, target);
    return e ? { reason: null, cells: [target], hits: [e], weapon } : fail('no_target');
  }
  const dir = alignedDir(p, target);
  if (!dir) return fail('not_aligned');
  if (chebyshev(p, target) > weapon.reach) return fail('out_of_range');
  const cells: Vec[] = [];
  const hits: Enemy[] = [];
  for (let i = 1; i <= weapon.reach; i++) {
    const c = { x: p.x + dir.x * i, y: p.y + dir.y * i };
    if (!inBounds(s.map, c) || !isWalkable(s.map, c) || barrierAt(s, c) || chestAt(s, c) || npcAt(s, c)) break;
    cells.push(c);
    const e = enemyAt(s, c);
    if (e) {
      hits.push(e);
      if (weapon.kind === 'whip') break; // el látigo golpea al primero
    }
  }
  return { reason: hits.length > 0 ? null : 'no_target', cells, hits, weapon };
}

export interface AttackPreview {
  valid: boolean;
  reason?: InvalidReason;
  message?: string;
  cells: Vec[];
}

/** Aviso previo del ataque con el arma equipada (para armas de alcance), sin gastar turno. */
export function previewAttack(state: GameState, target: Vec): AttackPreview {
  const plan = attackPlan(state, target);
  return plan.reason
    ? { valid: false, reason: plan.reason, message: REASON_TEXT[plan.reason], cells: plan.cells }
    : { valid: true, cells: plan.cells };
}

/** Recorrido de un proyectil: se detiene en el primer enemigo, o antes de pared/barrera. */
function throwPath(s: GameState, target: Vec): { landing: Vec; victim: Enemy | undefined; cells: Vec[] } {
  let landing = s.player.pos;
  const cells: Vec[] = [];
  for (const c of lineCells(s.player.pos, target)) {
    if (!inBounds(s.map, c) || !isWalkable(s.map, c) || barrierAt(s, c)) break;
    landing = c;
    cells.push(c);
    const victim = enemyAt(s, c);
    if (victim) return { landing, victim, cells };
  }
  return { landing, victim: undefined, cells };
}

function validateThrow(s: GameState, itemId: string, target: Vec): InvalidReason | null {
  const def = getThrowable(itemId);
  if (!def) return 'not_throwable';
  if ((s.player.inventory[itemId] ?? 0) <= 0) return 'no_item';
  if (!inBounds(s.map, target)) return 'out_of_bounds';
  if (equals(target, s.player.pos)) return 'blocked';
  if (manhattan(s.player.pos, target) > def.range) return 'out_of_range';
  if (!hasLineOfSight(s.map, s.player.pos, target, openDoors(s))) return 'no_line_of_sight';
  if (equals(throwPath(s, target).landing, s.player.pos)) return 'blocked';
  return null;
}

export interface ThrowPreview {
  valid: boolean;
  reason?: InvalidReason;
  message?: string;
  /** Casillas del recorrido, y casilla donde caerá. */
  cells: Vec[];
  landing: Vec;
}

export function previewThrow(state: GameState, itemId: string, target: Vec): ThrowPreview {
  const reason = validateThrow(state, itemId, target);
  const path = inBounds(state.map, target) ? throwPath(state, target) : { landing: state.player.pos, cells: [] as Vec[] };
  return reason
    ? { valid: false, reason, message: REASON_TEXT[reason], cells: path.cells, landing: path.landing }
    : { valid: true, cells: path.cells, landing: path.landing };
}

export interface TechniquePreview {
  valid: boolean;
  reason?: InvalidReason;
  message?: string;
  kiroCost: number;
  /** Casillas afectadas (para dibujar el aviso antes de confirmar). */
  cells: Vec[];
}

/** Coste y área de una técnica sobre un objetivo, sin ejecutar nada ni consumir turno. */
export function previewTechnique(state: GameState, techniqueId: string, target: Vec): TechniquePreview {
  const def = getTechnique(techniqueId);
  if (!def) return { valid: false, reason: 'unknown_technique', message: REASON_TEXT.unknown_technique, kiroCost: 0, cells: [] };
  const reason = validateTechnique(state, techniqueId, target);
  const cells = techniqueCells(state, def, target);
  return reason
    ? { valid: false, reason, message: REASON_TEXT[reason], kiroCost: def.kiroCost, cells }
    : { valid: true, kiroCost: def.kiroCost, cells };
}

/** Motivo (en español) por el que una opción de un maestro/evento no se puede pagar ahora, o null si se puede. */
export function optionBlocker(state: GameState, opt: NpcOption): string | null {
  const p = state.player;
  const c = opt.cost;
  if (c?.hp !== undefined && p.hp <= c.hp) return `Necesitas más de ${c.hp} de vida.`;
  if (c?.kiro === 'all' && p.kiro < (c.minKiro ?? 1)) return `Necesitas al menos ${c.minKiro ?? 1} de kiro.`;
  if (c?.item && (p.inventory[c.item.id] ?? 0) < c.item.count) {
    return `Necesitas ${c.item.count} × ${getThrowable(c.item.id)?.name ?? getItem(c.item.id)?.name ?? c.item.id}.`;
  }
  if (opt.gains.some((g) => g.kind === 'advancedTechnique') && !nextLearnable(p)) {
    return 'Ya conoces todas las técnicas que se pueden enseñar.';
  }
  return null;
}

/** Coste de subir un arma de su nivel actual al siguiente (null si ya está al máximo). */
export interface UpgradeQuote {
  level: number;
  maxed: boolean;
  coins: number;
  shards: number;
  canCoins: boolean;
  canShards: boolean;
}

export function upgradeQuote(state: GameState, weaponId: string): UpgradeQuote {
  const level = weaponLevel(state.player, weaponId);
  const maxed = level >= BALANCE.forge.maxLevel;
  const coins = maxed ? 0 : BALANCE.forge.coins[level];
  const shards = maxed ? 0 : BALANCE.forge.shards[level];
  return { level, maxed, coins, shards, canCoins: !maxed && state.player.coins >= coins, canShards: !maxed && state.player.shards >= shards };
}

/** ¿Hay una mesa de forja con ese id junto al jugador? */
const forgeNear = (s: GameState, npcId: string): Npc | undefined => {
  const n = s.npcs.find((x) => x.id === npcId && x.kind === FORGE_KIND);
  return n && chebyshev(s.player.pos, n.pos) <= 1 ? n : undefined;
};

export function validateCommand(state: GameState, cmd: Command): InvalidReason | null {
  if (state.status !== 'playing') return 'run_over';
  const p = state.player;
  switch (cmd.type) {
    case 'Move': {
      if (!Number.isInteger(cmd.dx) || !Number.isInteger(cmd.dy) || Math.abs(cmd.dx) > 1 || Math.abs(cmd.dy) > 1 || (cmd.dx === 0 && cmd.dy === 0)) {
        return 'bad_direction';
      }
      const to = { x: p.pos.x + cmd.dx, y: p.pos.y + cmd.dy };
      if (!inBounds(state.map, to)) return 'out_of_bounds';
      if (!isWalkable(state.map, to) || barrierAt(state, to)) return 'blocked';
      if (!stepOk(state.map, p.pos, to)) return 'corner';
      if (enemyAt(state, to) || chestAt(state, to) || npcAt(state, to)) return 'occupied';
      return null;
    }
    case 'Wait':
      return null;
    case 'BasicAttack':
      return attackPlan(state, cmd.target).reason;
    case 'UseTechnique':
      return validateTechnique(state, cmd.techniqueId, cmd.target);
    case 'UseItem': {
      if (cmd.itemId.startsWith(MANUAL_PREFIX)) {
        const tech = getTechnique(cmd.itemId.slice(MANUAL_PREFIX.length));
        if (!tech) return 'unknown_item';
        if ((p.inventory[cmd.itemId] ?? 0) <= 0) return 'no_item';
        return p.techniques.includes(tech.id) || p.grimoire.includes(tech.id) ? 'already_known' : null;
      }
      if (!getItem(cmd.itemId) && !getArcana(cmd.itemId)) return 'unknown_item';
      return (p.inventory[cmd.itemId] ?? 0) > 0 ? null : 'no_item';
    }
    case 'EquipTechnique': {
      if (!p.grimoire.includes(cmd.techniqueId)) return 'not_in_grimoire';
      if (p.techniques.length < BALANCE.techniqueSlots) return null;
      return cmd.replace && p.techniques.includes(cmd.replace) ? null : 'bad_slot';
    }
    case 'Throw':
      return validateThrow(state, cmd.itemId, cmd.target);
    case 'EquipWeapon':
      if (!getWeapon(cmd.weaponId)) return 'unknown_item';
      if (!p.weapons.includes(cmd.weaponId)) return 'no_item';
      if (p.equipment.weapon === cmd.weaponId) return 'already_equipped';
      return isCursedGear(p.equipment.weapon) ? 'cursed' : null;
    case 'EquipArmor':
      if (!getEquipment(cmd.armorId)) return 'unknown_item';
      if (!p.armors.includes(cmd.armorId)) return 'no_item';
      if (p.equipment.armor === cmd.armorId) return 'already_equipped';
      return isCursedGear(p.equipment.armor) ? 'cursed' : null;
    case 'Buy': {
      const npc = state.npcs.find((n) => n.id === cmd.npcId && n.kind === MERCHANT_KIND);
      if (!npc || chebyshev(p.pos, npc.pos) > 1) return 'not_adjacent';
      const offer = npc.stock?.find((o) => o.id === cmd.offerId);
      if (!offer) return 'unknown_item';
      if (offer.sold) return 'sold_out';
      return p.coins >= offer.price ? null : 'cannot_afford';
    }
    case 'Purify': {
      if (!forgeNear(state, cmd.npcId)) return 'not_at_forge';
      if (!p.weapons.includes(cmd.itemId) && !p.armors.includes(cmd.itemId)) return 'no_item';
      if (!isCursedGear(cmd.itemId) || !p.identified.includes(cmd.itemId)) return 'nothing_to_interact';
      return p.coins >= BALANCE.purifyCost ? null : 'cannot_afford';
    }
    case 'Interact': {
      if (chebyshev(p.pos, cmd.target) > 1) return 'not_adjacent';
      const chest = chestAt(state, cmd.target);
      if (chest) {
        if (chest.opened) return 'already_opened';
        return chest.locked && !p.keys.includes('llave_laca') ? 'locked_chest' : null;
      }
      if (npcAt(state, cmd.target)) return null;
      const terrain = terrainAt(state.map, cmd.target);
      if (terrain === 'locked') return p.keys.includes('llave_hierro') ? null : 'locked_door';
      if (terrain !== 'exit') return 'nothing_to_interact';
      return bossAlive(state) ? 'exit_sealed' : null;
    }
    case 'Upgrade': {
      if (!forgeNear(state, cmd.npcId)) return 'not_at_forge';
      if (!getWeapon(cmd.weaponId) || !p.weapons.includes(cmd.weaponId)) return 'no_item';
      const q = upgradeQuote(state, cmd.weaponId);
      if (q.maxed) return 'max_upgrade';
      return (cmd.pay === 'coins' ? q.canCoins : q.canShards) ? null : 'cannot_afford';
    }
    case 'Choose': {
      const npc = state.npcs.find((n) => n.id === cmd.npcId);
      const def = npc ? getNpc(npc.kind) : undefined;
      if (!npc || !def) return 'no_target';
      if (chebyshev(p.pos, npc.pos) > 1) return 'not_adjacent';
      if (npc.used) return 'already_used';
      const opt = def.options.find((o) => o.id === cmd.optionId);
      if (!opt) return 'unknown_option';
      return optionBlocker(state, opt) ? 'option_unavailable' : null;
    }
    case 'Extract':
      return 'extraction_unavailable'; // Decisión del diseño: no disponible al inicio.
  }
}

// ---------- Resolución ----------

interface Ctx {
  state: GameState;
  events: GameEvent[];
}

function say(ctx: Ctx, text: string): void {
  ctx.state.log.push(text);
  const over = ctx.state.log.length - BALANCE.logLimit;
  if (over > 0) ctx.state.log.splice(0, over);
}

/** Muestra un diálogo una sola vez por expedición (la presentación lo pinta al recibir el evento). */
function dialogueOnce(ctx: Ctx, id: string): void {
  if (ctx.state.seenDialogues.includes(id)) return;
  ctx.state.seenDialogues.push(id);
  ctx.events.push({ type: 'Dialogue', id });
}

/** Un enemigo pasa de no saber de ti a saberlo. El jefe se presenta. */
function noticePlayer(ctx: Ctx, enemy: Enemy): void {
  ctx.events.push({ type: 'EnemyAlerted', enemyId: enemy.id });
  const intro = getEnemy(enemy.kind)?.boss?.dialogues.intro;
  if (intro) dialogueOnce(ctx, intro);
}

/** Un enemigo que recibe daño sabe dónde estás, aunque no te viera. */
function alertEnemy(ctx: Ctx, enemy: Enemy): void {
  if (enemy.alert === 0) noticePlayer(ctx, enemy);
  enemy.alert = BALANCE.alertTurns;
  enemy.tracking = false;
  enemy.lastSeen = { ...ctx.state.player.pos };
}

/** Fase del jefe según su vida restante: 1 (>2/3), 2 (>1/3), 3 (resto). */
const bossPhaseFor = (e: Enemy): number => (e.hp * 3 > e.maxHp * 2 ? 1 : e.hp * 3 > e.maxHp ? 2 : 3);

/** Casillas libres alrededor de `origin`, de más cerca a más lejos (orden fijo: desempate determinista). */
function freeCellsAround(s: GameState, origin: Vec, maxRadius: number): Vec[] {
  const out: Vec[] = [];
  for (let r = 1; r <= maxRadius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) + Math.abs(dy) !== r) continue;
        const c = { x: origin.x + dx, y: origin.y + dy };
        if (cellFree(s, c)) out.push(c);
      }
    }
  }
  return out;
}

function summonEnemies(ctx: Ctx, owner: Enemy, enemyId: string, count: number, text: string): void {
  const s = ctx.state;
  const def = ENEMIES[enemyId];
  if (!def) return;
  const cells = freeCellsAround(s, owner.pos, 4);
  for (let i = 0; i < count && i < cells.length; i++) {
    const minion = createEnemy(def, `enemy-${enemyId}-${s.turn}-${owner.id}-${i}`, cells[i], s.floor);
    minion.alert = BALANCE.alertTurns;
    minion.lastSeen = { ...s.player.pos };
    s.enemies.push(minion);
    ctx.events.push({ type: 'EnemySummoned', enemyId: minion.id, pos: cells[i] });
  }
  say(ctx, text);
}

function updateBossPhase(ctx: Ctx, enemy: Enemy): void {
  const def = getEnemy(enemy.kind);
  if (!def?.boss || enemy.hp <= 0) return;
  const phase = bossPhaseFor(enemy);
  if (phase <= enemy.phase) return;
  enemy.phase = phase;
  ctx.events.push({ type: 'BossPhase', enemyId: enemy.id, phase });
  say(ctx, `${enemyName(enemy)} entra en la fase ${phase}.`);
  dialogueOnce(ctx, phase === 2 ? def.boss.dialogues.phase2 : def.boss.dialogues.phase3);
  if (phase === 3 && def.boss.phaseSummon) summonEnemies(ctx, enemy, def.boss.phaseSummon.enemy, def.boss.phaseSummon.count, def.boss.phaseSummon.text);
}

function damageEnemy(ctx: Ctx, enemy: Enemy, amount: number, source: string): void {
  enemy.hp = Math.max(0, enemy.hp - amount);
  ctx.state.stats.damageDealt += amount;
  ctx.events.push({ type: 'DamageApplied', targetId: enemy.id, amount, source });
  alertEnemy(ctx, enemy);
  updateBossPhase(ctx, enemy);
}

function defeatPlayer(ctx: Ctx): void {
  if (ctx.state.status !== 'playing') return;
  ctx.state.status = 'lost';
  ctx.events.push({ type: 'PlayerDefeated' });
  say(ctx, 'Caes derrotado. La expedición termina.');
}

function damagePlayer(ctx: Ctx, rawAmount: number, source: string): void {
  const p = ctx.state.player;
  const amount = rawAmount + (rawAmount > 0 ? (getMod(p.equipment.armor)?.damageTaken ?? 0) : 0);
  p.hp = Math.max(0, p.hp - amount);
  ctx.state.stats.damageTaken += amount;
  ctx.events.push({ type: 'DamageApplied', targetId: 'player', amount, source });
  if (p.hp <= 0) {
    ctx.state.stats.defeatedBy = ctx.state.enemies.find((e) => e.id === source)?.kind ?? source;
    defeatPlayer(ctx);
  }
}

/** Un estado no se acumula: volver a aplicarlo refresca su duración al máximo de ambas. */
function applyStatus(target: { statuses: { id: StatusId; turns: number }[] }, id: StatusId, turns: number): void {
  const existing = target.statuses.find((s) => s.id === id);
  if (existing) existing.turns = Math.max(existing.turns, turns);
  else target.statuses.push({ id, turns });
}

function tickStatuses(ctx: Ctx, target: Player | Enemy, targetId: string): void {
  for (const st of target.statuses) {
    if (st.id === 'regeneracion' && targetId === 'player' && target.hp < target.maxHp) {
      target.hp += 1;
      ctx.events.push({ type: 'HealApplied', amount: 1, resource: 'hp' });
    }
    if (st.id === 'quemadura' || st.id === 'veneno') {
      target.hp = Math.max(0, target.hp - BALANCE.burnDamage);
      if (targetId === 'player') ctx.state.stats.damageTaken += BALANCE.burnDamage;
      else ctx.state.stats.damageDealt += BALANCE.burnDamage;
      ctx.events.push({ type: 'DamageApplied', targetId, amount: BALANCE.burnDamage, source: st.id });
    }
    st.turns -= 1;
  }
  target.statuses = target.statuses.filter((st) => st.turns > 0);
}

/** Efectos de una poción o pergamino. Usarlo lo identifica para el resto de la expedición. */
function useArcana(ctx: Ctx, id: string): void {
  const s = ctx.state;
  const p = s.player;
  const def = getArcana(id);
  if (!def) return;
  const shownName = itemName(id, s);
  consume(p, id);
  s.stats.itemsUsed += 1;
  ctx.events.push({ type: 'ItemUsed', itemId: id });
  say(ctx, isPotion(id) ? `Bebes ${shownName}.` : `Desenrollas ${shownName}.`);
  if (isPotion(id)) drinkPotion(ctx, (getPotion(id) as NonNullable<ReturnType<typeof getPotion>>).effect);
  else readScroll(ctx, (getScroll(id) as NonNullable<ReturnType<typeof getScroll>>).effect);
  if (!p.known.includes(id)) {
    p.known.push(id);
    ctx.events.push({ type: 'ArcanaIdentified', itemId: id });
    say(ctx, `Ahora lo sabes: era ${def.name}.`);
  }
}

function drinkPotion(ctx: Ctx, fx: PotionEffect): void {
  const s = ctx.state;
  const p = s.player;
  switch (fx.kind) {
    case 'heal': {
      const gained = Math.min(fx.amount, p.maxHp - p.hp);
      p.hp += gained;
      ctx.events.push({ type: 'HealApplied', amount: gained, resource: 'hp' });
      say(ctx, `Recuperas ${gained} de vida.`);
      if (fx.cleanse) p.statuses = p.statuses.filter((st) => st.id !== 'quemadura' && st.id !== 'veneno' && st.id !== 'ceguera');
      return;
    }
    case 'kiro': {
      const gained = Math.min(fx.amount, p.maxKiro - p.kiro);
      p.kiro += gained;
      ctx.events.push({ type: 'HealApplied', amount: gained, resource: 'kiro' });
      say(ctx, `Recuperas ${gained} de kiro.`);
      return;
    }
    case 'strength':
      p.power += 1;
      say(ctx, 'Sientes los músculos arder: +1 de poder para siempre.');
      return;
    case 'status':
      applyStatus(p, fx.status, fx.turns);
      ctx.events.push({ type: 'StatusApplied', targetId: 'player', status: fx.status, turns: fx.turns });
      say(ctx, STATUS_NAMES[fx.status] ? `${STATUS_NAMES[fx.status]} (${fx.turns} rondas).` : `Efecto: ${fx.status}.`);
      return;
    case 'reveal':
      revealMap(ctx);
      return;
    case 'alarm':
      raiseAlarm(ctx, 'Un silbido agudo recorre el sector: todos saben dónde estás.');
      return;
  }
}

function revealMap(ctx: Ctx): void {
  ctx.state.explored.fill(true);
  say(ctx, 'El mapa del sector se despliega ante tus ojos.');
}

function raiseAlarm(ctx: Ctx, text: string): void {
  const s = ctx.state;
  for (const e of s.enemies) {
    if (e.hp <= 0) continue;
    if (e.alert === 0) noticePlayer(ctx, e);
    e.alert = BALANCE.alertTurns;
    e.lastSeen = { ...s.player.pos };
    e.tracking = false;
  }
  say(ctx, text);
}

function readScroll(ctx: Ctx, fx: ScrollEffect): void {
  const s = ctx.state;
  const p = s.player;
  switch (fx.kind) {
    case 'summon':
      summonAllies(ctx, fx.ally, fx.count, fx.turns);
      return;
    case 'teleport': {
      const cells: Vec[] = [];
      for (let y = 0; y < s.map.height; y++) {
        for (let x = 0; x < s.map.width; x++) {
          const c = { x, y };
          if (s.explored[y * s.map.width + x] && terrainAt(s.map, c) === 'floor' && cellFree(s, c) && manhattan(c, p.pos) >= 6) cells.push(c);
        }
      }
      if (cells.length === 0) {
        say(ctx, 'El tronco cae sin más: no hay a dónde ir.');
        return;
      }
      const dest = cells[Math.floor(rand(ctx) * cells.length)];
      const from = p.pos;
      p.pos = dest;
      ctx.events.push({ type: 'PlayerMoved', from, to: dest });
      for (const e of s.enemies) {
        if (e.alert > 0 && chebyshev(e.pos, p.pos) > 1) {
          e.alert = 0;
          e.lastSeen = null;
          e.tracking = false;
          ctx.events.push({ type: 'EnemyLostTrack', enemyId: e.id });
        }
      }
      say(ctx, 'Un tronco ocupa tu lugar: reapareces lejos y tus perseguidores pierden tu rastro.');
      return;
    }
    case 'reveal':
      revealMap(ctx);
      return;
    case 'purify': {
      const cleaned: string[] = [];
      for (const slot of ['weapon', 'armor'] as const) {
        const cur = p.equipment[slot];
        if (cur && isCursedGear(cur)) cleaned.push(itemName(purifyGear(ctx, cur), s));
      }
      say(ctx, cleaned.length ? `Los sellos malditos se desvanecen: ${cleaned.join(' y ')}.` : 'No hay ninguna maldición que romper en lo que llevas puesto.');
      return;
    }
    case 'blast': {
      const cells = region(s, p.pos, fx.radius, true, 'square');
      const hit = s.enemies.filter((e) => e.hp > 0 && cells.some((c) => equals(c, e.pos)));
      for (const e of hit) {
        damageEnemy(ctx, e, fx.power, 'sello_explosivo');
        say(ctx, `La explosión alcanza a ${enemyName(e)} (${fx.power} de daño).`);
      }
      if (hit.length === 0) say(ctx, 'El sello estalla sin tocar a nadie.');
      ctx.events.push({ type: 'TechniqueCast', techniqueId: 'sello_explosivo', target: p.pos, cells });
      return;
    }
    case 'bind':
    case 'stun': {
      const status: StatusId = fx.kind === 'bind' ? 'atado' : 'aturdido';
      const visible = visibleCells(s);
      let n = 0;
      for (const e of s.enemies) {
        if (e.hp <= 0 || !canSeeEntity(s, visible, e.pos) || isBoss(e)) continue;
        applyStatus(e, status, fx.turns);
        ctx.events.push({ type: 'StatusApplied', targetId: e.id, status, turns: fx.turns });
        alertEnemy(ctx, e);
        n += 1;
      }
      say(ctx, n > 0 ? `${n} ${n === 1 ? 'enemigo queda' : 'enemigos quedan'} ${fx.kind === 'bind' ? 'inmovilizados' : 'aturdidos'} ${fx.turns} rondas.` : 'No hay nadie a la vista (o se resisten).');
      return;
    }
    case 'upgrade': {
      const w = p.equipment.weapon;
      if (!w || weaponLevel(p, w) >= BALANCE.forge.maxLevel) {
        say(ctx, 'Tu arma ya no admite más refuerzos: el sello se consume sin efecto.');
        return;
      }
      p.weaponLevels[w] = weaponLevel(p, w) + 1;
      ctx.events.push({ type: 'WeaponUpgraded', weaponId: w, level: p.weaponLevels[w] });
      say(ctx, `${itemName(w, s)} se refuerza: +${p.weaponLevels[w]}.`);
      return;
    }
    case 'identify': {
      let n = 0;
      for (const id of [...p.weapons, ...p.armors]) {
        if (!p.identified.includes(id)) {
          markIdentified(p, id);
          ctx.events.push({ type: 'GearIdentified', itemId: id });
          n += 1;
        }
      }
      const unknown = [...Object.keys(POTIONS).map((k) => `pocion:${k}`), ...Object.keys(SCROLLS).map((k) => `pergamino:${k}`)].filter((k) => !p.known.includes(k) && (p.inventory[k] ?? 0) > 0);
      if (unknown.length > 0) {
        const k = unknown[Math.floor(rand(ctx) * unknown.length)];
        p.known.push(k);
        ctx.events.push({ type: 'ArcanaIdentified', itemId: k });
        say(ctx, `Reconoces ${itemName(k, s)}.`);
      }
      say(ctx, n > 0 ? `Tu equipo revela sus secretos (${n} ${n === 1 ? 'pieza' : 'piezas'}).` : 'Todo tu equipo ya estaba identificado.');
      return;
    }
    case 'alarm':
      raiseAlarm(ctx, 'Un trueno sin tormenta retumba por la cripta: todos saben dónde estás.');
      return;
  }
}

/** Gasta una unidad de un objeto de la mochila. */
function consume(p: Player, itemId: string, n = 1): void {
  const left = (p.inventory[itemId] ?? 0) - n;
  if (left > 0) p.inventory[itemId] = left;
  else delete p.inventory[itemId];
}

/** Sube un nivel (solo se llama al despejar un sector): más vida, kiro y poder, y técnicas de la afinidad. */
function levelUp(ctx: Ctx): void {
  const p = ctx.state.player;
  p.level += 1;
  p.maxHp += BALANCE.levelUp.hp;
  p.hp = Math.min(p.maxHp, p.hp + BALANCE.levelUp.hp);
  p.maxKiro += BALANCE.levelUp.kiro;
  p.kiro += BALANCE.levelUp.kiro;
  if (p.level % BALANCE.levelUp.powerEvery === 0) p.power += 1;
  const learned = techniquesFor(p.affinity, p.level).filter((id) => !p.techniques.includes(id) && !p.grimoire.includes(id));
  ctx.events.push({ type: 'LevelUp', level: p.level, learned });
  say(ctx, `¡Sector despejado! Subes al nivel ${p.level}.`);
  for (const id of learned) learnTechnique(ctx, id);
}

/** Aprende una técnica: va a una ranura libre si la hay y, si no, al grimorio (el jugador elige luego cuál sustituir). */
function learnTechnique(ctx: Ctx, id: string): boolean {
  const p = ctx.state.player;
  const def = getTechnique(id);
  if (!def || p.techniques.includes(id) || p.grimoire.includes(id)) return false;
  const equipped = p.techniques.length < BALANCE.techniqueSlots;
  (equipped ? p.techniques : p.grimoire).push(id);
  ctx.events.push({ type: 'TechniqueLearned', techniqueId: id, equipped });
  say(ctx, equipped ? `Aprendes ${def.name}.` : `Aprendes ${def.name}, pero no tienes ranura libre: elige cuál de tus técnicas sustituir (Tab → Técnicas).`);
  return true;
}

/** Primera técnica aprendible de tu afinidad (o común) que todavía no conoces ni llevas como manual. */
function nextLearnable(p: Player): string | undefined {
  return learnableFor(p.affinity).find((id) => !p.techniques.includes(id) && !p.grimoire.includes(id) && !(p.inventory[MANUAL_PREFIX + id] > 0));
}

/** Cuenta una baja del sector; al caer el último enemigo (los convocados no cuentan) se sube de nivel, una vez por sector. */
function registerKill(ctx: Ctx, e: Enemy): void {
  const s = ctx.state;
  if (getEnemy(e.kind)?.summoned) return;
  s.floorKilled += 1;
  if (!s.floorCleared && s.floorEnemies > 0 && s.floorKilled >= s.floorEnemies) {
    s.floorCleared = true;
    ctx.events.push({ type: 'FloorCleared', floor: s.floor });
    if (s.player.level < s.maxFloor + 1) levelUp(ctx);
  }
}

/** Quita los ataques anunciados de un enemigo (cae o queda aturdido) y avisa a la presentación. */
function cancelTelegraphs(ctx: Ctx, ownerId: string): boolean {
  const had = ctx.state.telegraphs.some((t) => t.ownerId === ownerId);
  if (!had) return false;
  ctx.state.telegraphs = ctx.state.telegraphs.filter((t) => t.ownerId !== ownerId);
  ctx.events.push({ type: 'TelegraphCancelled', ownerId });
  return true;
}

/** Surtido del mercader: lo básico, una poción, un pergamino, una pieza de equipo y un manual (todo identificado, sin maldiciones). */
function makeStock(ctx: Ctx): Offer[] {
  const s = ctx.state;
  const p = s.player;
  const stock: Offer[] = [];
  const add = (itemId: string, price: number, count = 1): void => {
    stock.push({ id: `of-${stock.length}`, itemId, count, price, sold: false });
  };
  add('unguento_musgo', SHOP_PRICES.unguento_musgo);
  add('tonico_kiro', SHOP_PRICES.tonico_kiro);
  const potion = rollArcana('potion', rand(ctx));
  add(potion, getArcana(potion)?.price ?? 12);
  const scroll = rollArcana('scroll', rand(ctx));
  add(scroll, getArcana(scroll)?.price ?? 14);
  // Equipo: de la tabla del cofre lacado según el sector; solo corriente o encantado.
  const gear = lootTableFor(s.floor, LACQUER_LOOT);
  const owned = (id: string): boolean => p.weapons.some((w) => baseGearId(w) === id) || p.armors.some((a) => baseGearId(a) === id) || baseGearId(p.equipment.armor ?? '') === id;
  const fresh = gear.filter((e) => !owned(e.id));
  const pick = (fresh.length > 0 ? fresh : gear)[Math.floor(rand(ctx) * (fresh.length > 0 ? fresh : gear).length)];
  const slot: GearSlot = getWeapon(pick.id) ? 'weapon' : 'armor';
  const enchanted = rand(ctx) < 0.4;
  const pool = modsFor(slot, 'enchant');
  const mod = enchanted ? pool[Math.floor(rand(ctx) * pool.length)].id : null;
  const bonus = (getWeapon(pick.id)?.bonus ?? getEquipment(pick.id)?.bonus ?? 1);
  add(makeGearId(pick.id, mod), (slot === 'weapon' ? SHOP_PRICES.weaponBase : SHOP_PRICES.armorBase) + bonus * SHOP_PRICES.perBonus + (mod ? SHOP_PRICES.enchantExtra : 0));
  // Un manual de técnica que aún no conozcas.
  const pool2 = learnableFor(p.affinity).filter((id) => !p.techniques.includes(id) && !p.grimoire.includes(id) && !(p.inventory[MANUAL_PREFIX + id] > 0));
  if (pool2.length > 0) add(MANUAL_PREFIX + pool2[Math.floor(rand(ctx) * pool2.length)], SHOP_PRICES.manual);
  return stock;
}

/** Tras caer un jefe aparece un mercader cerca de donde cayó (sin cerrar el camino a la salida). */
function placeMerchant(ctx: Ctx, near: Vec): void {
  const s = ctx.state;
  let exit: Vec | null = null;
  for (let y = 0; y < s.map.height && !exit; y++) for (let x = 0; x < s.map.width; x++) if (s.map.tiles[y * s.map.width + x] === 'exit') exit = { x, y };
  const candidates = freeCellsAround(s, near, 8).filter((c) => terrainAt(s.map, c) === 'floor' && !equals(c, s.player.pos) && !s.drops.some((d) => equals(d.pos, c)));
  for (const c of candidates) {
    if (exit) {
      const blocked = (q: Vec): boolean => equals(q, c) || !isWalkable(s.map, q) || chestAt(s, q) !== undefined || npcAt(s, q) !== undefined;
      if (!findPath(s.map, s.player.pos, exit, blocked) && chebyshev(s.player.pos, exit) > 1) continue;
    }
    const npc: Npc = { id: `npc-merchant-${s.floor}`, kind: MERCHANT_KIND, pos: c, used: false, stock: makeStock(ctx) };
    s.npcs.push(npc);
    ctx.events.push({ type: 'MerchantAppeared', npcId: npc.id, pos: c });
    say(ctx, 'Un mercader surge de entre las sombras con su fardo: «Los muertos no gastan. Los vivos, sí.»');
    return;
  }
}

function defeatBoss(ctx: Ctx, boss: Enemy): void {
  const s = ctx.state;
  const bdef = getEnemy(boss.kind)?.boss;
  s.stats.bossDefeated = true;
  s.bossesDefeated += 1;
  if (bdef && !s.player.relics.includes(bdef.relic)) s.player.relics.push(bdef.relic);
  // Todo lo que convocó se desvanece con su amo.
  const minions = s.enemies.filter((o) => getEnemy(o.kind)?.summoned);
  for (const e of minions) {
    cancelTelegraphs(ctx, e.id);
    ctx.events.push({ type: 'EnemyDefeated', enemyId: e.id });
    releaseStuck(s, e);
  }
  s.enemies = s.enemies.filter((o) => !getEnemy(o.kind)?.summoned);
  ctx.events.push({ type: 'BossDefeated', enemyId: boss.id });
  say(ctx, bdef?.defeatText ?? 'El jefe cae y la salida se abre.');
  if (bdef) dialogueOnce(ctx, bdef.dialogues.defeat);
  placeMerchant(ctx, boss.pos);
}

function reapDead(ctx: Ctx): void {
  const alive: Enemy[] = [];
  const fallen: Enemy[] = [];
  for (const e of ctx.state.enemies) (e.hp > 0 ? alive : fallen).push(e);
  ctx.state.enemies = alive;
  for (const e of fallen) {
    ctx.events.push({ type: 'EnemyDefeated', enemyId: e.id });
    say(ctx, `${enemyName(e)} cae derrotado.`);
    ctx.state.stats.kills += 1;
    cancelTelegraphs(ctx, e.id);
    registerKill(ctx, e);
    releaseStuck(ctx.state, e);
    dropEnemyLoot(ctx, e);
    if (isBoss(e)) defeatBoss(ctx, e);
  }
}

/** Las armas arrojadizas clavadas en un enemigo caen al suelo donde muere. */
function releaseStuck(s: GameState, e: Enemy): void {
  for (const [id, n] of Object.entries(e.stuck ?? {})) placeDrop(s, e.pos, id, n);
  e.stuck = {};
}

const hashId = (id: string): number => [...id].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 7);

/** Monedas que suelta un enemigo al caer (determinista: no consume el generador de la partida). El jefe da un botín fijo. */
function dropEnemyLoot(ctx: Ctx, e: Enemy): void {
  const s = ctx.state;
  const def = getEnemy(e.kind);
  if (!def || def.noLoot) return;
  if (isBoss(e)) {
    placeDrop(s, e.pos, 'moneda', BALANCE.bossLoot.coins);
    placeDrop(s, e.pos, 'esquirla', BALANCE.bossLoot.shards);
    placeDrop(s, { x: e.pos.x, y: e.pos.y }, MANUAL_ITEM, 1);
    return;
  }
  const rng = new Rng(mixSeed((s.seed + Math.imul(s.turn, 0x9e3779b1)) >>> 0, s.floor, hashId(e.id)));
  const c = BALANCE.enemyCoins;
  if (rng.chance(c.chance)) placeDrop(s, e.pos, 'moneda', rng.int(c.min, c.max) + (s.floor - 1) * c.perFloor);
}

/** Tirada ponderada en una tabla de botín: sin repetir armas ya tenidas ni vestimenta peor que la puesta (si no queda nada, vale todo). */
function rollFrom(ctx: Ctx, table: readonly LootEntry[]): LootEntry {
  const p = ctx.state.player;
  const floorTable = lootTableFor(ctx.state.floor, table);
  const useful = floorTable.filter((e) => {
    if (e.kind === 'weapon') return !p.weapons.includes(e.id);
    if (e.kind === 'equipment') return !p.armors.some((a) => a.split('~')[0] === e.id) && p.equipment.armor?.split('~')[0] !== e.id;
    return true;
  });
  const pool = useful.length > 0 ? useful : floorTable;
  const total = pool.reduce((sum, e) => sum + e.weight, 0);
  const r = nextRandom(ctx.state.rngState);
  ctx.state.rngState = r.state;
  let roll = r.value * total;
  for (const entry of pool) {
    if (roll < entry.weight) return entry;
    roll -= entry.weight;
  }
  return pool[pool.length - 1];
}

/** Empuja a un enemigo `steps` casillas alejándolo del jugador; si choca, recibe daño de impacto. */
function pushEnemy(ctx: Ctx, enemy: Enemy, steps: number): void {
  const s = ctx.state;
  const dir = pushDir(s.player.pos, enemy.pos);
  for (let i = 0; i < steps; i++) {
    const next = { x: enemy.pos.x + dir.x, y: enemy.pos.y + dir.y };
    if (!cellFree(s, next)) {
      damageEnemy(ctx, enemy, BALANCE.slamDamage, 'impacto');
      say(ctx, `${enemyName(enemy)} se estrella (${BALANCE.slamDamage} de daño).`);
      return;
    }
    const from = enemy.pos;
    enemy.pos = next;
    ctx.events.push({ type: 'EnemyMoved', enemyId: enemy.id, from, to: next });
  }
}

function castTechnique(ctx: Ctx, def: TechniqueDef, target: Vec): void {
  const s = ctx.state;
  const p = s.player;
  p.kiro -= def.kiroCost;
  s.stats.techniquesUsed += 1;
  ctx.events.push({ type: 'KiroSpent', amount: def.kiroCost });
  const cells = techniqueCells(s, def, target);
  ctx.events.push({ type: 'TechniqueCast', techniqueId: def.id, target, cells });
  say(ctx, `Usas ${def.name} (-${def.kiroCost} kiro).`);

  if (def.selfStatus) {
    applyStatus(p, def.selfStatus.status, def.selfStatus.turns);
    ctx.events.push({ type: 'StatusApplied', targetId: 'player', status: def.selfStatus.status, turns: def.selfStatus.turns });
  }
  if (def.heal) {
    const gained = Math.min(def.heal, p.maxHp - p.hp);
    p.hp += gained;
    ctx.events.push({ type: 'HealApplied', amount: gained, resource: 'hp' });
    say(ctx, `Recuperas ${gained} de vida.`);
  }
  if (def.selfDamage) {
    const paid = Math.max(0, Math.min(def.selfDamage, p.hp - 1));
    p.hp -= paid;
    s.stats.damageTaken += paid;
    ctx.events.push({ type: 'DamageApplied', targetId: 'player', amount: paid, source: def.id });
  }
  if (def.restoreKiro) {
    const gained = Math.min(def.restoreKiro, p.maxKiro - p.kiro);
    p.kiro += gained;
    ctx.events.push({ type: 'HealApplied', amount: gained, resource: 'kiro' });
    say(ctx, `Recuperas ${gained} de kiro.`);
  }
  if (def.summon) summonAllies(ctx, def.summon.kind, def.summon.count, def.summon.turns);
  if (def.target.kind === 'blink') {
    const from = p.pos;
    p.pos = target;
    ctx.events.push({ type: 'PlayerMoved', from, to: target });
  }
  if (def.target.kind === 'dash') {
    const plan = dashPlan(s, def.target.length, target);
    if (plan.dest) {
      const from = p.pos;
      p.pos = plan.dest;
      ctx.events.push({ type: 'PlayerMoved', from, to: plan.dest });
    }
  }
  if (def.losePursuers) {
    for (const e of s.enemies) {
      if (e.alert > 0 && chebyshev(e.pos, p.pos) > 1) {
        e.alert = 0;
        e.lastSeen = null;
        e.tracking = false;
        ctx.events.push({ type: 'EnemyLostTrack', enemyId: e.id });
      }
    }
    say(ctx, 'Un tronco ocupa tu lugar: tus perseguidores pierden tu rastro.');
  }
  if (def.target.kind === 'barrier') {
    for (const c of cells) s.barriers.push({ pos: c, turns: def.barrierTurns ?? 6 });
    ctx.events.push({ type: 'BarrierRaised', cells });
  }

  // Bonificación de nivel a las técnicas ofensivas: +1 cada dos niveles (nivel 1 = 0).
  const levelBonus = Math.floor((p.level - 1) / 2);
  for (const enemy of [...s.enemies]) {
    if (!cells.some((c) => equals(c, enemy.pos))) continue;
    if (def.damage) {
      const dmg = calcDamage(def.damage.power, levelBonus, def.damage.ignoreDefense ? 0 : defenseOf(enemy));
      damageEnemy(ctx, enemy, dmg, def.id);
      say(ctx, `${enemyName(enemy)} recibe ${dmg} de daño.`);
    }
    if (def.inflict && enemy.hp > 0) {
      if (isBoss(enemy) && BOSS_IMMUNE.includes(def.inflict.status)) {
        say(ctx, `${enemyName(enemy)} es inmune a ${STATUS_NAMES[def.inflict.status].toLowerCase()}.`);
      } else {
        applyStatus(enemy, def.inflict.status, def.inflict.turns);
        ctx.events.push({ type: 'StatusApplied', targetId: enemy.id, status: def.inflict.status, turns: def.inflict.turns });
      }
    }
    if (def.push && enemy.hp > 0 && !isBoss(enemy)) pushEnemy(ctx, enemy, def.push);
    if (def.pull && enemy.hp > 0 && !isBoss(enemy)) pullEnemy(ctx, enemy, def.pull);
  }
}

/** Arrastra a un enemigo `steps` casillas hacia el jugador (se detiene ante obstáculos y ante el propio jugador). */
function pullEnemy(ctx: Ctx, enemy: Enemy, steps: number): void {
  const s = ctx.state;
  for (let i = 0; i < steps; i++) {
    const dir = pushDir(enemy.pos, s.player.pos);
    const next = { x: enemy.pos.x + dir.x, y: enemy.pos.y + dir.y };
    if (!cellFree(s, next) || !stepOk(s.map, enemy.pos, next)) return;
    const from = enemy.pos;
    enemy.pos = next;
    ctx.events.push({ type: 'EnemyMoved', enemyId: enemy.id, from, to: next });
  }
}

/** Número en [0,1) del generador de la partida. */
function rand(ctx: Ctx): number {
  const r = nextRandom(ctx.state.rngState);
  ctx.state.rngState = r.state;
  return r.value;
}

/** Sortea el modificador de una pieza nueva: maldita, encantada o corriente (null). */
function rollGearMod(ctx: Ctx, baseId: string): string | null {
  const slot: GearSlot = getWeapon(baseId) ? 'weapon' : 'armor';
  const roll = rand(ctx);
  const kind = roll < BALANCE.gear.curseChance ? 'curse' : roll < BALANCE.gear.curseChance + BALANCE.gear.enchantChance ? 'enchant' : null;
  if (!kind) return null;
  const pool = modsFor(slot, kind);
  return pool[Math.floor(rand(ctx) * pool.length)].id;
}

function markIdentified(p: Player, id: string): void {
  if (!p.identified.includes(id)) p.identified.push(id);
}

/** Al equipar por primera vez una pieza se descubre qué escondía. */
function identifyGear(ctx: Ctx, id: string): void {
  const p = ctx.state.player;
  if (p.identified.includes(id)) return;
  p.identified.push(id);
  ctx.events.push({ type: 'GearIdentified', itemId: id });
  const mod = getMod(id);
  if (!mod) say(ctx, 'No tiene nada de particular: es una pieza corriente.');
  else say(ctx, mod.kind === 'curse' ? `¡Está maldita! ${itemName(id, ctx.state)}: ${mod.description}` : `Está encantada: ${itemName(id, ctx.state)}. ${mod.description}`);
}

/** Rompe la maldición de una pieza concreta; traslada su sitio, su mejora de forja y su identificación. Devuelve el id nuevo. */
function purifyGear(ctx: Ctx, id: string): string {
  const p = ctx.state.player;
  const clean = purified(id);
  if (clean === id) return id;
  const swap = (list: string[]) => {
    const i = list.indexOf(id);
    if (i < 0) return;
    if (list.includes(clean)) list.splice(i, 1);
    else list[i] = clean;
  };
  swap(p.weapons);
  swap(p.armors);
  if (p.equipment.weapon === id) p.equipment.weapon = clean;
  if (p.equipment.armor === id) p.equipment.armor = clean;
  if (p.weaponLevels[id] !== undefined) {
    p.weaponLevels[clean] = Math.max(p.weaponLevels[clean] ?? 0, p.weaponLevels[id]);
    delete p.weaponLevels[id];
  }
  markIdentified(p, clean);
  ctx.events.push({ type: 'GearPurified', itemId: clean });
  return clean;
}

/** Efectos del arma encantada o maldita tras un golpe cuerpo a cuerpo. */
function applyWeaponMod(ctx: Ctx, enemy: Enemy): void {
  const p = ctx.state.player;
  const mod = getMod(p.equipment.weapon);
  if (!mod) return;
  if (mod.onHitStatus && enemy.hp > 0 && !(isBoss(enemy) && BOSS_IMMUNE.includes(mod.onHitStatus.status)) && rand(ctx) < mod.onHitStatus.chance) {
    applyStatus(enemy, mod.onHitStatus.status, mod.onHitStatus.turns);
    ctx.events.push({ type: 'StatusApplied', targetId: enemy.id, status: mod.onHitStatus.status, turns: mod.onHitStatus.turns });
  }
  if (mod.onHitHeal && p.hp < p.maxHp) {
    p.hp += 1;
    ctx.events.push({ type: 'HealApplied', amount: 1, resource: 'hp' });
  }
  if (mod.onHitKiro) {
    const before = p.kiro;
    p.kiro = Math.max(0, Math.min(p.maxKiro, p.kiro + mod.onHitKiro));
    if (p.kiro !== before) ctx.events.push({ type: 'HealApplied', amount: p.kiro - before, resource: 'kiro' });
  }
  if (mod.onHitSelfDamage && p.hp > 1) {
    p.hp -= mod.onHitSelfDamage;
    ctx.state.stats.damageTaken += mod.onHitSelfDamage;
    ctx.events.push({ type: 'DamageApplied', targetId: 'player', amount: mod.onHitSelfDamage, source: 'sello_de_sangre' });
  }
}

function openChest(ctx: Ctx, chest: Chest): void {
  const p = ctx.state.player;
  const floor = ctx.state.floor;
  chest.opened = true;
  ctx.state.stats.chestsOpened += 1;
  if (chest.locked) {
    p.keys = p.keys.filter((k) => k !== 'llave_laca');
    say(ctx, 'La llave de laca gira y el cofre cede.');
  }
  const entry = rollFrom(ctx, chest.locked ? LACQUER_LOOT : CHEST_LOOT);
  ctx.events.push({ type: 'ChestOpened', chestId: chest.id, itemId: entry.id });
  const amount = entry.kind === 'coins' ? coinAmount(entry.amount ?? 4, floor) : (entry.amount ?? 1);
  collect(ctx, entry.id, amount, 'Abres el cofre y encuentras:');
  // Un cofre siempre trae algo de dinero, y el lacado además esquirlas.
  collect(ctx, 'moneda', coinAmount(chest.locked ? 6 : 3, floor), 'Dentro hay además');
  if (chest.locked) collect(ctx, 'esquirla', 2, 'Dentro hay además');
}

function placeDrop(s: GameState, pos: Vec, itemId: string, count = 1): void {
  const existing = s.drops.find((d) => d.itemId === itemId && equals(d.pos, pos));
  if (existing) existing.count += count;
  else s.drops.push({ pos: { ...pos }, itemId, count });
}

/**
 * Pasa un objeto al jugador: monedas y esquirlas se suman a su cartera, las llaves a su llavero, las armas a su colección,
 * la vestimenta se equipa si mejora la actual y lo demás va a la mochila. Lo repetido o peor se desmonta en esquirlas.
 */
function collect(ctx: Ctx, rawId: string, count: number, verb: string, fixed = false): void {
  const p = ctx.state.player;
  let itemId = rawId;
  // Los ids «al azar» se resuelven al recoger (tirada determinista con el generador de la partida).
  if (rawId === RANDOM_POTION) itemId = rollArcana('potion', rand(ctx));
  else if (rawId === RANDOM_SCROLL) itemId = rollArcana('scroll', rand(ctx));
  else if (!fixed && !rawId.includes('~') && (getWeapon(rawId) || getEquipment(rawId))) itemId = makeGearId(rawId, rollGearMod(ctx, rawId));
  ctx.events.push({ type: 'ItemPickedUp', itemId, count });
  if (itemId === 'moneda') {
    p.coins += count;
    ctx.state.stats.coinsFound += count;
    say(ctx, `${verb} ${count} ${CURRENCY.moneda.name.toLowerCase()}.`);
    return;
  }
  if (itemId === 'esquirla') {
    p.shards += count;
    say(ctx, `${verb} ${count} ${count === 1 ? 'esquirla' : 'esquirlas'} de campana.`);
    return;
  }
  if (isKey(itemId)) {
    if (!p.keys.includes(itemId)) p.keys.push(itemId);
    say(ctx, `${verb} ${KEYS[itemId].name}.`);
    return;
  }
  if (itemId === MANUAL_ITEM) {
    // El manual sin abrir se convierte en el de una técnica que aún no conoces.
    const pool = learnableFor(p.affinity).filter((id) => !p.techniques.includes(id) && !p.grimoire.includes(id) && !(p.inventory[MANUAL_PREFIX + id] > 0));
    if (pool.length === 0) {
      p.shards += 3;
      say(ctx, `${verb} un manual, pero ya dominas todo lo que enseña: lo desmontas (+3 esquirlas).`);
      return;
    }
    const id = pool[Math.floor(rand(ctx) * pool.length)];
    p.inventory[MANUAL_PREFIX + id] = 1;
    say(ctx, `${verb} un manual: «${getTechnique(id)?.name ?? id}». Léelo desde el menú (Tab → Objetos) para aprenderla.`);
    return;
  }
  const weapon = getWeapon(itemId);
  if (weapon) {
    if (!p.weapons.includes(itemId)) {
      p.weapons.push(itemId);
      if (fixed) markIdentified(p, itemId);
      say(ctx, `${verb} ${itemName(itemId, ctx.state)}. Equípala desde el menú (Tab) para saber qué esconde.`);
    } else {
      p.shards += 2;
      say(ctx, `${verb} ${weapon.name}, pero ya la tienes: la desmontas (+2 esquirlas).`);
    }
    return;
  }
  const armor = getEquipment(itemId);
  if (armor) {
    if (!p.armors.includes(itemId) && p.equipment.armor !== itemId) {
      p.armors.push(itemId);
      if (fixed) markIdentified(p, itemId);
      say(ctx, `${verb} ${itemName(itemId, ctx.state)}. Póntela desde el menú (Tab) para saber qué esconde.`);
    } else {
      p.shards += 1;
      say(ctx, `${verb} ${armor.name}, pero ya la tienes: la desmontas (+1 esquirla).`);
    }
    return;
  }
  p.inventory[itemId] = (p.inventory[itemId] ?? 0) + count;
  say(ctx, `${verb} ${count > 1 ? `${count}× ` : ''}${itemName(itemId, ctx.state)}.`);
}

/** Recoge lo que haya en el suelo bajo el jugador. */
function pickUp(ctx: Ctx): void {
  const s = ctx.state;
  for (const sc of s.scrolls.filter((c) => equals(c.pos, s.player.pos))) {
    if (!s.player.notes.includes(sc.noteId)) s.player.notes.push(sc.noteId);
    ctx.events.push({ type: 'NoteFound', noteId: sc.noteId });
    say(ctx, `Encuentras un pergamino: «${getNote(sc.noteId)?.title ?? sc.noteId}» (Tab → Notas).`);
  }
  s.scrolls = s.scrolls.filter((c) => !equals(c.pos, s.player.pos));
  const here = s.drops.filter((d) => equals(d.pos, s.player.pos));
  if (here.length === 0) return;
  s.drops = s.drops.filter((d) => !equals(d.pos, s.player.pos));
  for (const d of here) collect(ctx, d.itemId, d.count, 'Recoges');
}

function descend(ctx: Ctx): void {
  const s = ctx.state;
  const level = generateLevel({ seed: s.seed, floor: s.floor + 1, boss: isBossFloor(s.floor + 1) || s.floor + 1 >= s.maxFloor });
  s.floor += 1;
  s.map = level.map;
  s.player.pos = level.playerStart;
  s.enemies = level.enemies;
  s.allies = [];
  s.chests = level.chests;
  s.barriers = [];
  s.drops = level.drops;
  s.telegraphs = [];
  s.npcs = level.npcs;
  s.scrolls = level.scrolls;
  s.explored = new Array<boolean>(level.map.width * level.map.height).fill(false);
  s.floorEnemies = level.enemies.length;
  s.floorKilled = 0;
  s.floorCleared = false;
  if (s.player.keys.length > 0) {
    s.player.keys = [];
    say(ctx, 'Las llaves que no usaste se deshacen en polvo al cruzar.');
  }
  ctx.events.push({ type: 'FloorChanged', floor: s.floor });
  say(ctx, `Desciendes al sector ${s.floor}.`);
  for (const h of floorHints(s)) say(ctx, h);
}

function resolvePlayerAction(ctx: Ctx, cmd: Command): void {
  const s = ctx.state;
  const p = s.player;
  switch (cmd.type) {
    case 'Move': {
      const from = p.pos;
      p.pos = { x: from.x + cmd.dx, y: from.y + cmd.dy };
      const friend = allyAt(s, p.pos);
      if (friend) {
        // Cambias de sitio con tu aliado en vez de bloquearle el paso.
        friend.pos = { ...from };
        ctx.events.push({ type: 'AllyMoved', allyId: friend.id, from: p.pos, to: from });
      }
      ctx.events.push({ type: 'PlayerMoved', from, to: p.pos });
      return;
    }
    case 'Wait': {
      const gained = Math.min(BALANCE.waitKiro, p.maxKiro - p.kiro);
      p.kiro += gained;
      ctx.events.push({ type: 'PlayerWaited', kiroRecovered: gained });
      say(ctx, gained > 0 ? `Respiras hondo y recuperas ${gained} de kiro.` : 'Esperas.');
      return;
    }
    case 'BasicAttack': {
      const plan = attackPlan(s, cmd.target);
      ctx.events.push({ type: 'PlayerAttacked', weaponId: plan.weapon.id, cells: plan.cells, targets: plan.hits.map((e) => e.pos) });
      for (const enemy of plan.hits) {
        let dmg = calcDamage(effectivePower(p), 0, defenseOf(enemy));
        if (enemy.alert === 0) {
          dmg *= BALANCE.sneakMultiplier;
          ctx.state.stats.sneakAttacks += 1;
          ctx.events.push({ type: 'SneakAttack', enemyId: enemy.id });
          say(ctx, `¡Golpe furtivo a ${enemyName(enemy)}! (${dmg} de daño).`);
        } else {
          say(ctx, `Golpeas a ${enemyName(enemy)} (${dmg} de daño).`);
        }
        damageEnemy(ctx, enemy, dmg, 'ataque_basico');
        applyWeaponMod(ctx, enemy);
      }
      return;
    }
    case 'Throw': {
      const def = getThrowable(cmd.itemId) as NonNullable<ReturnType<typeof getThrowable>>;
      const left = (p.inventory[def.id] ?? 0) - 1;
      if (left > 0) p.inventory[def.id] = left;
      else delete p.inventory[def.id];
      const { landing, victim } = throwPath(s, cmd.target);
      ctx.events.push({ type: 'ItemThrown', itemId: def.id, from: p.pos, to: landing, hit: Boolean(victim) });
      if (victim) {
        const bonus = Math.floor((p.level - 1) / 2);
        let dmg = calcDamage(def.damage, bonus, def.ignoreDefense ? 0 : defenseOf(victim));
        if (victim.alert === 0) {
          dmg *= BALANCE.sneakMultiplier;
          ctx.state.stats.sneakAttacks += 1;
          ctx.events.push({ type: 'SneakAttack', enemyId: victim.id });
          say(ctx, `¡Lanzamiento furtivo! ${def.name} hiere a ${enemyName(victim)} (${dmg} de daño).`);
        } else {
          say(ctx, `${def.name} hiere a ${enemyName(victim)} (${dmg} de daño).`);
        }
        damageEnemy(ctx, victim, dmg, def.id);
      } else {
        say(ctx, `Lanzas ${def.name}.`);
      }
      const roll = nextRandom(s.rngState);
      s.rngState = roll.state;
      if (roll.value < def.breakChance) {
        say(ctx, `${def.name} se pierde.`);
      } else if (victim && victim.hp > 0) {
        // Clavada en el enemigo: la recuperarás cuando caiga.
        victim.stuck[def.id] = (victim.stuck[def.id] ?? 0) + 1;
        ctx.events.push({ type: 'ItemStuck', enemyId: victim.id, itemId: def.id });
        say(ctx, `${def.name} queda clavada en ${enemyName(victim)}.`);
      } else {
        placeDrop(s, landing, def.id);
      }
      return;
    }
    case 'EquipWeapon': {
      p.equipment.weapon = cmd.weaponId;
      ctx.events.push({ type: 'WeaponEquipped', weaponId: cmd.weaponId });
      say(ctx, `Equipas: ${itemName(cmd.weaponId, s)}.`);
      identifyGear(ctx, cmd.weaponId);
      return;
    }
    case 'EquipArmor': {
      p.equipment.armor = cmd.armorId;
      ctx.events.push({ type: 'EquipmentEquipped', slot: 'armor', itemId: cmd.armorId });
      say(ctx, `Te pones: ${itemName(cmd.armorId, s)}.`);
      identifyGear(ctx, cmd.armorId);
      return;
    }
    case 'Buy': {
      const npc = s.npcs.find((n) => n.id === cmd.npcId) as Npc;
      const offer = (npc.stock as Offer[]).find((o) => o.id === cmd.offerId) as Offer;
      p.coins -= offer.price;
      offer.sold = true;
      ctx.events.push({ type: 'ItemBought', itemId: offer.itemId, price: offer.price });
      collect(ctx, offer.itemId, offer.count, 'Compras', true);
      if (isArcana(offer.itemId) && !p.known.includes(offer.itemId)) p.known.push(offer.itemId);
      return;
    }
    case 'Purify': {
      p.coins -= BALANCE.purifyCost;
      const clean = purifyGear(ctx, cmd.itemId);
      say(ctx, `El herrero rompe el sello (−${BALANCE.purifyCost} monedas): ${itemName(clean, s)}.`);
      return;
    }
    case 'UseTechnique':
      castTechnique(ctx, getTechnique(cmd.techniqueId) as TechniqueDef, cmd.target);
      return;
    case 'EquipTechnique': {
      p.grimoire = p.grimoire.filter((id) => id !== cmd.techniqueId);
      let replaced: string | null = null;
      if (p.techniques.length < BALANCE.techniqueSlots) {
        p.techniques.push(cmd.techniqueId);
      } else {
        const i = p.techniques.indexOf(cmd.replace as string);
        replaced = p.techniques[i];
        p.techniques[i] = cmd.techniqueId;
        p.grimoire.push(replaced);
      }
      ctx.events.push({ type: 'TechniqueEquipped', techniqueId: cmd.techniqueId, replaced });
      say(ctx, replaced ? `Cambias ${getTechnique(replaced)?.name} por ${getTechnique(cmd.techniqueId)?.name}.` : `Equipas ${getTechnique(cmd.techniqueId)?.name}.`);
      return;
    }
    case 'UseItem': {
      if (cmd.itemId.startsWith(MANUAL_PREFIX)) {
        consume(p, cmd.itemId);
        ctx.state.stats.itemsUsed += 1;
        ctx.events.push({ type: 'ItemUsed', itemId: cmd.itemId });
        learnTechnique(ctx, cmd.itemId.slice(MANUAL_PREFIX.length));
        return;
      }
      if (isArcana(cmd.itemId)) {
        useArcana(ctx, cmd.itemId);
        return;
      }
      const item = getItem(cmd.itemId);
      if (!item) return;
      const left = (p.inventory[cmd.itemId] ?? 0) - 1;
      if (left > 0) p.inventory[cmd.itemId] = left;
      else delete p.inventory[cmd.itemId];
      ctx.state.stats.itemsUsed += 1;
      ctx.events.push({ type: 'ItemUsed', itemId: item.id });
      if (item.effect.kind === 'restoreHp') {
        const gained = Math.min(item.effect.amount, p.maxHp - p.hp);
        p.hp += gained;
        ctx.events.push({ type: 'HealApplied', amount: gained, resource: 'hp' });
        say(ctx, `Usas ${item.name}: recuperas ${gained} de vida.`);
      } else {
        const gained = Math.min(item.effect.amount, p.maxKiro - p.kiro);
        p.kiro += gained;
        ctx.events.push({ type: 'HealApplied', amount: gained, resource: 'kiro' });
        say(ctx, `Usas ${item.name}: recuperas ${gained} de kiro.`);
      }
      return;
    }
    case 'Interact': {
      const chest = chestAt(s, cmd.target);
      if (chest) {
        openChest(ctx, chest);
        return;
      }
      if (npcAt(s, cmd.target)) return; // hablar es una acción libre (ver applyCommand)
      if (terrainAt(s.map, cmd.target) === 'locked') {
        s.map.tiles[cmd.target.y * s.map.width + cmd.target.x] = 'door';
        p.keys = p.keys.filter((k) => k !== 'llave_hierro');
        ctx.events.push({ type: 'DoorUnlocked', pos: { ...cmd.target } });
        say(ctx, 'La llave de hierro gira: el candado cae y la puerta se abre.');
        return;
      }
      if (s.floor >= s.maxFloor) {
        s.status = 'won';
        ctx.events.push({ type: 'RunWon' });
        say(ctx, 'Cruzas la salida. ¡Has sobrevivido a la cripta!');
      } else {
        descend(ctx);
      }
      return;
    }
    case 'Choose': {
      const npc = s.npcs.find((n) => n.id === cmd.npcId) as Npc;
      const opt = (getNpc(npc.kind)?.options.find((o) => o.id === cmd.optionId)) as NpcOption;
      applyOption(ctx, npc, opt);
      return;
    }
    case 'Upgrade': {
      const q = upgradeQuote(s, cmd.weaponId);
      if (cmd.pay === 'coins') p.coins -= q.coins;
      else p.shards -= q.shards;
      const level = q.level + 1;
      p.weaponLevels[cmd.weaponId] = level;
      s.stats.upgrades += 1;
      ctx.events.push({ type: 'WeaponUpgraded', weaponId: cmd.weaponId, level });
      say(ctx, `El herrero de la mesa afila tu arma: ${weaponLabel(cmd.weaponId, level)} (+${BALANCE.forge.bonusPerLevel} de poder).`);
      return;
    }
    case 'Extract':
      return; // Inalcanzable: la validación lo rechaza.
  }
}

/** Paga el coste y aplica las ganancias de una opción de maestro o evento. */
function applyOption(ctx: Ctx, npc: Npc, opt: NpcOption): void {
  const p = ctx.state.player;
  const c = opt.cost;
  if (c?.hp !== undefined) {
    p.hp -= c.hp;
    ctx.state.stats.damageTaken += c.hp;
  }
  if (c?.kiro === 'all') p.kiro = 0;
  if (c?.item) {
    const left = (p.inventory[c.item.id] ?? 0) - c.item.count;
    if (left > 0) p.inventory[c.item.id] = left;
    else delete p.inventory[c.item.id];
  }
  for (const g of opt.gains) {
    switch (g.kind) {
      case 'power':
        p.power += g.amount;
        break;
      case 'defense':
        p.defense += g.amount;
        break;
      case 'maxKiro':
        p.maxKiro += g.amount;
        p.kiro += g.amount;
        break;
      case 'maxHp':
        p.maxHp += g.amount;
        p.hp += g.amount;
        break;
      case 'healFull':
        p.hp = p.maxHp;
        break;
      case 'advancedTechnique': {
        const id = nextLearnable(p);
        if (id) learnTechnique(ctx, id);
        break;
      }
    }
  }
  npc.used = true;
  ctx.state.stats.decisions += 1;
  ctx.events.push({ type: 'NpcChoice', npcId: npc.id, optionId: opt.id });
  say(ctx, `${getNpc(npc.kind)?.name ?? npc.kind}: ${opt.label}.`);
}

// ---------- Enemigos ----------

type StepResult = 'moved' | 'attacked' | 'none';

/** Casilla por la que un enemigo puede pasar: libre de otros enemigos, cofres, barreras y del jugador. */
function enemyCanEnter(s: GameState, self: Enemy, p: Vec): boolean {
  return (
    inBounds(s.map, p) &&
    isWalkable(s.map, p) &&
    !s.enemies.some((o) => o !== self && equals(o.pos, p)) &&
    !allyAt(s, p) &&
    !chestAt(s, p) &&
    !barrierAt(s, p) &&
    !equals(s.player.pos, p)
  );
}

// ---------- Aliados invocados ----------

/** Invoca aliados en casillas libres junto al jugador. */
function summonAllies(ctx: Ctx, kind: string, count: number, turns: number): void {
  const s = ctx.state;
  const def = getAllyDef(kind);
  if (!def) return;
  const cells = freeCellsAround(s, s.player.pos, 2);
  for (let i = 0; i < count && i < cells.length; i++) {
    const ally = {
      id: `ally-${s.turn}-${s.allies.length}`,
      kind,
      pos: cells[i],
      hp: def.maxHp,
      maxHp: def.maxHp,
      power: def.power + Math.floor((s.player.level - 1) / 2),
      turns,
    };
    s.allies.push(ally);
    ctx.events.push({ type: 'AllySummoned', allyId: ally.id, pos: cells[i] });
    say(ctx, `${def.name} aparece a tu lado.`);
  }
  if (cells.length === 0) say(ctx, 'No hay sitio para invocar nada aquí.');
}

/** Turno de los aliados: golpean al enemigo más cercano a su alcance o se acercan; sin enemigos, siguen al jugador. */
function runAllies(ctx: Ctx): void {
  const s = ctx.state;
  for (const ally of s.allies) {
    const def = getAllyDef(ally.kind);
    if (!def || ally.hp <= 0) continue;
    for (let a = 0; a < def.actions; a++) {
      const foes = s.enemies.filter((e) => e.hp > 0 && chebyshev(e.pos, ally.pos) <= 8).sort((x, y) => chebyshev(x.pos, ally.pos) - chebyshev(y.pos, ally.pos));
      const foe = foes[0];
      if (foe && adjacent(s.map, ally.pos, foe.pos)) {
        const dmg = calcDamage(ally.power, 0, defenseOf(foe));
        damageEnemy(ctx, foe, dmg, 'aliado');
        say(ctx, `${def.name} golpea a ${enemyName(foe)} (${dmg} de daño).`);
        break;
      }
      const goal = foe ? foe.pos : chebyshev(ally.pos, s.player.pos) > 2 ? s.player.pos : null;
      if (!goal) break;
      const blocked = (q: Vec): boolean => !cellFree(s, q) || equals(q, ally.pos);
      const path = findPath(s.map, ally.pos, goal, blocked);
      if (!path || path.length === 0) break;
      const next = path[0];
      if (!cellFree(s, next)) break;
      const from = ally.pos;
      ally.pos = next;
      ctx.events.push({ type: 'AllyMoved', allyId: ally.id, from, to: next });
    }
  }
}

/** Retira a los aliados caídos o que se agotan (tras contar la ronda). */
function reapAllies(ctx: Ctx, countDown: boolean): void {
  const s = ctx.state;
  const keep = [];
  for (const a of s.allies) {
    if (countDown) a.turns -= 1;
    if (a.hp > 0 && a.turns > 0) keep.push(a);
    else {
      ctx.events.push({ type: 'AllyDefeated', allyId: a.id });
      say(ctx, a.hp > 0 ? `${getAllyDef(a.kind)?.name ?? 'Tu aliado'} se desvanece.` : `${getAllyDef(a.kind)?.name ?? 'Tu aliado'} cae.`);
    }
  }
  s.allies = keep;
}

// ---------- Ataques anunciados ----------

/** Cruz centrada en `origin` (incluida): filas y columnas hasta `length`, deteniéndose en paredes. */
function crossCells(s: GameState, origin: Vec, length: number): Vec[] {
  const cells: Vec[] = [{ ...origin }];
  for (const d of DIRS) {
    for (let i = 1; i <= length; i++) {
      const c = { x: origin.x + d.x * i, y: origin.y + d.y * i };
      if (!inBounds(s.map, c) || !isWalkable(s.map, c)) break;
      cells.push(c);
    }
  }
  return cells;
}

// ---------- Habilidades de enemigos y jefes ----------

/** Dirección (8 vías) desde `a` hasta `b` si están alineados; null si no. */
function lineDir(a: Vec, b: Vec): Vec | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return null;
  if (dx !== 0 && dy !== 0 && Math.abs(dx) !== Math.abs(dy)) return null;
  return { x: sign(dx), y: sign(dy) };
}

/** Casillas de una línea desde `origin` (sin incluirlo), hasta `length`, deteniéndose en paredes. */
function beamCells(s: GameState, origin: Vec, dir: Vec, length: number): Vec[] {
  const out: Vec[] = [];
  for (let i = 1; i <= length; i++) {
    const c = { x: origin.x + dir.x * i, y: origin.y + dir.y * i };
    if (!inBounds(s.map, c) || !isWalkable(s.map, c)) break;
    out.push(c);
  }
  return out;
}

/** Casilla libre junto al jugador a la que puede saltar el enemigo (la más cercana a él). */
function dashLanding(s: GameState, enemy: Enemy, range: number): Vec | null {
  let best: Vec | null = null;
  let bestD = Infinity;
  for (const d of DIRS8) {
    const c = { x: s.player.pos.x + d.x, y: s.player.pos.y + d.y };
    if (!cellFree(s, c) || !stepOk(s.map, s.player.pos, c)) continue;
    const dist = manhattan(c, enemy.pos);
    if (dist > range || dist >= bestD) continue;
    best = c;
    bestD = dist;
  }
  return best;
}

function skillReady(ctx: Ctx, enemy: Enemy, sk: SkillDef): boolean {
  const s = ctx.state;
  const p = s.player.pos;
  const dist = manhattan(enemy.pos, p);
  const los = (): boolean => hasLineOfSight(s.map, enemy.pos, p, openDoors(s));
  const sh = sk.shape;
  switch (sh.kind) {
    case 'burst':
      return dist <= sh.radius;
    case 'zone':
    case 'cross':
      return dist <= sh.range && los();
    case 'beam': {
      const d = lineDir(enemy.pos, p);
      return d !== null && chebyshev(enemy.pos, p) <= sh.length && los();
    }
    case 'shot':
      return chebyshev(enemy.pos, p) >= (sk.minDist ?? 1) && dist <= sh.range && los();
    case 'dash':
      return dist >= (sk.minDist ?? 2) && dist <= sh.range + 1 && dashLanding(s, enemy, sh.range) !== null;
    case 'summon': {
      const alive = s.enemies.filter((e) => e.kind === sh.enemy && e.hp > 0).length;
      return dist >= (sk.minDist ?? 1) && alive < sh.count;
    }
  }
}

/** Primera habilidad disponible (cooldown, fase y geometría) en orden de prioridad. */
function pickSkill(ctx: Ctx, enemy: Enemy, def: EnemyDef): SkillDef | null {
  for (const sk of def.skills ?? []) {
    if ((enemy.cooldowns[sk.id] ?? 0) > 0) continue;
    if ((sk.minPhase ?? 1) > Math.max(1, enemy.phase)) continue;
    if (skillReady(ctx, enemy, sk)) return sk;
  }
  return null;
}

function startTelegraph(ctx: Ctx, enemy: Enemy, sk: SkillDef, cells: Vec[], power: number): void {
  const tg: Telegraph = {
    id: `tg-${ctx.state.turn}-${enemy.id}`,
    ownerId: enemy.id,
    name: sk.name,
    cells,
    power,
    turns: sk.delay,
    inflict: sk.inflict ? { status: sk.inflict.status, turns: sk.inflict.turns } : undefined,
  };
  ctx.state.telegraphs.push(tg);
  ctx.events.push({ type: 'TelegraphStarted', ownerId: enemy.id, cells, turns: sk.delay });
  say(ctx, `${enemyName(enemy)} prepara ${sk.name}: ¡apártate de las casillas marcadas!`);
}

/** Daño de una habilidad y el estado que deja; lo usan los ataques anunciados al liberarse y los disparos inmediatos. */
function hitPlayerWithSkill(ctx: Ctx, enemy: Enemy, name: string, power: number, inflict?: { status: StatusId; turns: number }): void {
  const p = ctx.state.player;
  const dmg = calcDamage(power, 0, effectiveDefense(p));
  damagePlayer(ctx, dmg, enemy.id);
  say(ctx, `${name} te alcanza (${dmg} de daño).`);
  if (inflict && ctx.state.status === 'playing') {
    applyStatus(p, inflict.status, inflict.turns);
    ctx.events.push({ type: 'StatusApplied', targetId: 'player', status: inflict.status, turns: inflict.turns });
    say(ctx, `${STATUS_NAMES[inflict.status] ?? inflict.status} (${inflict.turns} rondas).`);
  }
}

/** Cuenta atrás de un ataque anunciado; al llegar a 0 se libera y daña a quien siga dentro. */
function processTelegraph(ctx: Ctx, enemy: Enemy, tg: Telegraph): void {
  tg.turns -= 1;
  if (tg.turns > 0) return;
  const s = ctx.state;
  s.telegraphs = s.telegraphs.filter((t) => t !== tg);
  const hit = tg.cells.some((c) => equals(c, s.player.pos));
  ctx.events.push({ type: 'TelegraphReleased', ownerId: enemy.id, cells: tg.cells, hit });
  if (hit) hitPlayerWithSkill(ctx, enemy, tg.name, tg.power, tg.inflict);
  else say(ctx, `${tg.name} estalla en el vacío: lo esquivaste.`);
}

/** Usa una habilidad (la geometría ya se comprobó). Devuelve true si gastó la acción. */
function useSkill(ctx: Ctx, enemy: Enemy, def: EnemyDef, sk: SkillDef): void {
  const s = ctx.state;
  const p = s.player.pos;
  const power = sk.power + (enemy.power - def.power); // los enemigos de sectores hondos pegan algo más fuerte
  enemy.cooldowns[sk.id] = sk.cooldown;
  const sh = sk.shape;
  const announce = (cells: Vec[]): void => {
    if (sk.delay > 0) {
      startTelegraph(ctx, enemy, sk, cells, power);
    } else {
      ctx.events.push({ type: 'EnemySkill', enemyId: enemy.id, skillId: sk.id, from: enemy.pos, to: p });
      if (cells.some((c) => equals(c, p))) hitPlayerWithSkill(ctx, enemy, sk.name, power, sk.inflict);
    }
  };
  switch (sh.kind) {
    case 'burst':
      announce(diamond(s, enemy.pos, sh.radius, false).filter((c) => !equals(c, enemy.pos)));
      return;
    case 'zone':
      announce(diamond(s, p, sh.radius, false));
      return;
    case 'cross':
      announce(crossCells(s, p, sh.length));
      return;
    case 'beam': {
      const d = lineDir(enemy.pos, p) as Vec;
      announce(beamCells(s, enemy.pos, d, sh.length));
      return;
    }
    case 'shot':
      ctx.events.push({ type: 'EnemySkill', enemyId: enemy.id, skillId: sk.id, from: enemy.pos, to: p });
      say(ctx, `${enemyName(enemy)} ${sk.flavor ?? `usa ${sk.name}`}.`);
      hitPlayerWithSkill(ctx, enemy, sk.name, power, sk.inflict);
      return;
    case 'dash': {
      const dest = dashLanding(s, enemy, sh.range);
      if (!dest) return;
      const from = enemy.pos;
      enemy.pos = dest;
      ctx.events.push({ type: 'EnemyMoved', enemyId: enemy.id, from, to: dest });
      ctx.events.push({ type: 'EnemySkill', enemyId: enemy.id, skillId: sk.id, from, to: dest });
      say(ctx, `${enemyName(enemy)} ${sk.flavor ?? `usa ${sk.name}`}.`);
      return;
    }
    case 'summon':
      summonEnemies(ctx, enemy, sh.enemy, sh.count, `${enemyName(enemy)} usa ${sk.name}: ${sh.count} ${ENEMIES[sh.enemy]?.name ?? 'aliados'} aparecen.`);
      return;
  }
}

function enemyStep(ctx: Ctx, enemy: Enemy, def: EnemyDef, sees: boolean): StepResult {
  const s = ctx.state;
  const p = s.player;
  const dist = manhattan(enemy.pos, p.pos);

  const hit = (verb: string): StepResult => {
    const dmg = calcDamage(enemy.power, 0, effectiveDefense(p));
    damagePlayer(ctx, dmg, enemy.id);
    say(ctx, `${enemyName(enemy)} ${verb} (${dmg} de daño).`);
    const thorns = getMod(p.equipment.armor)?.thorns;
    if (thorns && s.status === 'playing' && enemy.hp > 0 && chebyshev(enemy.pos, p.pos) <= 1) {
      damageEnemy(ctx, enemy, thorns, 'espinas');
      say(ctx, `Tus espinas hieren a ${enemyName(enemy)} (${thorns} de daño).`);
    }
    return 'attacked';
  };

  if (sees) {
    const skill = pickSkill(ctx, enemy, def);
    if (skill) {
      useSkill(ctx, enemy, def, skill);
      return skill.shape.kind === 'dash' ? 'moved' : 'attacked';
    }
    if (def.behavior === 'ranged') {
      const range = def.range ?? 5;
      const keepAway = def.keepAway ?? 2;
      if (dist <= keepAway) {
        // Retrocede a la vecina libre que más lo aleje (orden fijo de DIRS: desempate determinista).
        let best: Vec | null = null;
        let bestD = dist;
        for (const d of DIRS8) {
          const n = { x: enemy.pos.x + d.x, y: enemy.pos.y + d.y };
          if (!enemyCanEnter(s, enemy, n) || !stepOk(s.map, enemy.pos, n)) continue;
          const nd = manhattan(n, p.pos);
          if (nd > bestD) {
            best = n;
            bestD = nd;
          }
        }
        if (best) {
          const from = enemy.pos;
          enemy.pos = best;
          ctx.events.push({ type: 'EnemyMoved', enemyId: enemy.id, from, to: best });
          return 'moved';
        }
      }
      if (dist <= range && hasLineOfSight(s.map, enemy.pos, p.pos, openDoors(s))) return hit('te dispara');
    } else if (adjacent(s.map, enemy.pos, p.pos)) {
      return hit('te golpea');
    }
  }

  // Si no estás a su alcance pero un aliado tuyo sí, se ensaña con él.
  if (def.behavior === 'melee' && !adjacent(s.map, enemy.pos, p.pos)) {
    const friend = s.allies.find((a) => adjacent(s.map, enemy.pos, a.pos));
    if (friend) {
      const dmg = calcDamage(enemy.power, 0, 0);
      friend.hp -= dmg;
      ctx.events.push({ type: 'DamageApplied', targetId: friend.id, amount: dmg, source: enemy.id });
      say(ctx, `${enemyName(enemy)} golpea a ${getAllyDef(friend.kind)?.name ?? 'tu aliado'} (${dmg} de daño).`);
      return 'attacked';
    }
  }

  if (enemy.aggroRange === 0) return 'none'; // centinela: ataca a quien tiene al lado pero no se mueve
  if (enemy.statuses.some((st) => st.id === 'atado')) return 'none'; // inmovilizado
  if (def.boss?.slowApproach && s.turn % 2 !== 0) return 'none'; // algunos jefes avanzan despacio
  // Sin verte, va a donde te vio por última vez; al llegar sigue tu rastro hasta donde estés, aunque sea tras una puerta.
  let goal = sees ? p.pos : enemy.lastSeen;
  if (!sees && goal !== null && equals(goal, enemy.pos)) enemy.tracking = true;
  const tracking = !sees && enemy.tracking;
  if (tracking) goal = p.pos;
  if (!goal || equals(goal, enemy.pos)) return 'none';
  const blocked = (q: Vec): boolean => !enemyCanEnter(s, enemy, q);
  const path = findPath(s.map, enemy.pos, goal, blocked);
  if (!path || path.length > (tracking ? BALANCE.scentRange : BALANCE.chaseLimit)) return 'none';
  const next = path[0];
  if (equals(next, p.pos)) return 'none';
  const from = enemy.pos;
  enemy.pos = next;
  ctx.events.push({ type: 'EnemyMoved', enemyId: enemy.id, from, to: next });
  return 'moved';
}

function enemyAct(ctx: Ctx, enemy: Enemy, index: number): void {
  const def = getEnemy(enemy.kind);
  if (!def) return;
  if (enemy.statuses.some((st) => st.id === 'aturdido') && !isBoss(enemy)) {
    if (cancelTelegraphs(ctx, enemy.id)) say(ctx, `${enemyName(enemy)} se interrumpe: su ataque se deshace.`);
    else say(ctx, `${enemyName(enemy)} está aturdido y pierde su acción.`);
    return;
  }
  for (const k of Object.keys(enemy.cooldowns)) if (enemy.cooldowns[k] > 0) enemy.cooldowns[k] -= 1;
  // Un ataque anunciado ocupa toda su acción hasta liberarse.
  const charging = ctx.state.telegraphs.find((t) => t.ownerId === enemy.id);
  if (charging) {
    processTelegraph(ctx, enemy, charging);
    return;
  }
  // Percepción: te nota si te ve (distancia, línea de visión, arbustos y puertas). Al perderte, sigue alerta unas rondas.
  const sees = enemySees(ctx.state, enemy);
  if (sees) {
    if (enemy.alert === 0) {
      noticePlayer(ctx, enemy);
      say(ctx, `${enemyName(enemy)} te ha visto.`);
    }
    enemy.alert = BALANCE.alertTurns;
    enemy.lastSeen = { ...ctx.state.player.pos };
    enemy.tracking = false;
  }
  if (enemy.alert === 0) return; // no sabe de ti: permanece quieto
  // Los lentos actúan una de cada N rondas; el índice escalona a los de la misma clase (determinista).
  if (def.actEvery > 1 && (ctx.state.turn + index) % def.actEvery !== 0) return;
  if (enemy.statuses.some((st) => st.id === 'ralentizado') && (ctx.state.turn + index) % 2 !== 0) return;
  let progressed = false;
  for (let n = 0; n < def.actionsPerTurn; n++) {
    const r = enemyStep(ctx, enemy, def, sees);
    if (r !== 'none') progressed = true;
    if (r !== 'moved') break;
  }
  // Sin verte, su alerta solo se agota cuando sigue tu rastro o ya no avanza hacia ti (no hay camino): así llegan de lejos.
  if (!sees && enemy.alert > 0 && (enemy.tracking || !progressed)) {
    enemy.alert -= 1;
    if (enemy.alert === 0) {
      enemy.lastSeen = null;
      enemy.tracking = false;
      ctx.events.push({ type: 'EnemyLostTrack', enemyId: enemy.id });
    }
  }
}

function updateExplored(state: GameState): void {
  for (const i of visibleCells(state)) state.explored[i] = true;
}

/**
 * Punto de entrada del motor. Es puro: no modifica `state`; devuelve un estado nuevo.
 * Si la acción es inválida devuelve el mismo objeto `state`, sin eventos y sin consumir turno.
 */
export function applyCommand(state: GameState, cmd: Command): CommandResult {
  const reason = validateCommand(state, cmd);
  if (reason) return { ok: false, reason, message: REASON_TEXT[reason], state, events: [] };

  // Hablar con un maestro, un altar... es una acción libre: no gasta turno ni activa a los enemigos.
  if (cmd.type === 'Interact') {
    const npc = npcAt(state, cmd.target);
    const def = npc ? getNpc(npc.kind) : undefined;
    if (npc && def) {
      const events: GameEvent[] = [
        { type: 'NpcTalked', npcId: npc.id },
        { type: 'Dialogue', id: npc.used ? def.afterId : def.introId },
      ];
      return { ok: true, state, events };
    }
    if (npc?.kind === FORGE_KIND || npc?.kind === MERCHANT_KIND) return { ok: true, state, events: [{ type: 'NpcTalked', npcId: npc.id }] };
  }

  const ctx: Ctx = { state: structuredClone(state), events: [] };
  const s = ctx.state;

  resolvePlayerAction(ctx, cmd); // pasos 4-5
  if (s.status === 'playing') pickUp(ctx);
  reapDead(ctx);
  if (s.status === 'playing') {
    runAllies(ctx); // tus aliados actúan tras ti y antes que los enemigos
    reapDead(ctx);
  }

  if (s.status === 'playing') {
    // paso 6: estados del jugador
    tickStatuses(ctx, s.player, 'player');
    if (s.player.hp <= 0) {
      s.stats.defeatedBy = 'quemadura';
      defeatPlayer(ctx);
    }
    // Regeneración natural lenta (la ronda que acaba es la número turn + 1).
    if (s.status === 'playing' && (s.turn + 1) % BALANCE.hpRegenEvery === 0 && s.player.hp < s.player.maxHp) {
      s.player.hp += 1;
      ctx.events.push({ type: 'HealApplied', amount: 1, resource: 'hp' });
    }
    const armorMod = getMod(s.player.equipment.armor);
    if (s.status === 'playing' && armorMod?.regenEvery && (s.turn + 1) % armorMod.regenEvery === 0 && s.player.hp < s.player.maxHp) {
      s.player.hp += 1;
      ctx.events.push({ type: 'HealApplied', amount: 1, resource: 'hp' });
    }
    // El kiro también vuelve solo, más deprisa que la vida.
    if (s.status === 'playing' && !armorMod?.noKiroRegen && (s.turn + 1) % BALANCE.kiroRegenEvery === 0 && s.player.kiro < s.player.maxKiro) {
      const gain = Math.min(1 + (armorMod?.kiroRegenBonus ?? 0), s.player.maxKiro - s.player.kiro);
      s.player.kiro += gain;
      ctx.events.push({ type: 'HealApplied', amount: gain, resource: 'kiro' });
    }
  }

  if (s.status === 'playing') {
    // paso 7: enemigos vivos, en orden determinista (orden de la lista)
    s.enemies.forEach((enemy, index) => {
      if (s.status !== 'playing' || enemy.hp <= 0) return;
      enemyAct(ctx, enemy, index);
    });
  }

  if (s.status === 'playing') {
    // paso 8: estados de enemigos y duración de barreras
    for (const enemy of s.enemies) tickStatuses(ctx, enemy, enemy.id);
    s.barriers = s.barriers.map((b) => ({ ...b, turns: b.turns - 1 })).filter((b) => b.turns > 0);
    reapAllies(ctx, true);
    reapDead(ctx);
  }

  s.turn += 1; // paso 9
  updateExplored(s);
  return { ok: true, state: s, events: ctx.events };
}
