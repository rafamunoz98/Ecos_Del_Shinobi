import { BALANCE } from '../content/balance';
import { ENEMIES, getEnemy, type EnemyDef } from '../content/enemies';
import { CHEST_LOOT, CURRENCY, KEYS, LACQUER_LOOT, coinAmount, getEquipment, getItem, isKey, lootTableFor, type LootEntry } from '../content/items';
import { itemName } from '../content/names';
import { getTechnique, techniquesFor, type TechniqueDef } from '../content/techniques';
import { getNpc, getNote, type NpcOption } from '../content/story';
import { getThrowable, getWeapon, weaponLabel, WEAPONS, type WeaponDef } from '../content/weapons';
import { FORGE_KIND, generateLevel } from '../dungeon/generator';
import { createEnemy } from '../dungeon/spawn';
import { calcDamage, effectiveDefense, effectivePower, weaponLevel, xpToNext } from './combat';
import { DIRS, equals, findPath, hasLineOfSight, inBounds, isWalkable, lineCells, manhattan, terrainAt } from './grid';
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
  bad_direction: 'Solo puedes moverte una casilla en línea recta.',
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
  nothing_to_interact: 'No hay nada con lo que interactuar ahí.',
  already_opened: 'Ya está abierto.',
  exit_sealed: 'La salida está sellada: algo guarda esta cámara.',
  locked_door: 'La puerta tiene un candado de hierro. Busca la llave de hierro en este sector.',
  locked_chest: 'El cofre está lacrado. Busca la llave de laca en este sector.',
  not_at_forge: 'Necesitas estar junto a una mesa de forja.',
  max_upgrade: 'Esa arma ya está al máximo.',
  cannot_afford: 'No tienes suficientes monedas o esquirlas.',
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

/** Casilla transitable y vacía: sin pared, enemigo, cofre, barrera ni jugador. */
function cellFree(s: GameState, p: Vec): boolean {
  return (
    inBounds(s.map, p) && isWalkable(s.map, p) && !enemyAt(s, p) && !chestAt(s, p) && !npcAt(s, p) && !barrierAt(s, p) && !equals(s.player.pos, p)
  );
}

// La visión y el sigilo viven en sight.ts; se reexportan para la presentación.
export { canSeeEntity, enemySees, openDoors, visibleCells };

const sign = (n: number): number => (n > 0 ? 1 : n < 0 ? -1 : 0);

/** Dirección cardinal si `to` está en la misma fila o columna que `from` (y no es la misma casilla). */
function alignedDir(from: Vec, to: Vec): Vec | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy !== 0) return { x: 0, y: sign(dy) };
  if (dy === 0 && dx !== 0) return { x: sign(dx), y: 0 };
  return null;
}

/** Dirección cardinal dominante de `from` hacia `to` (empates: horizontal). */
function dominantDir(from: Vec, to: Vec): Vec {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return { x: 1, y: 0 };
  return Math.abs(dx) >= Math.abs(dy) ? { x: sign(dx), y: 0 } : { x: 0, y: sign(dy) };
}

function diamond(s: GameState, origin: Vec, radius: number, needLos: boolean): Vec[] {
  const cells: Vec[] = [];
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (Math.abs(dx) + Math.abs(dy) > radius) continue;
      const p = { x: origin.x + dx, y: origin.y + dy };
      if (!inBounds(s.map, p) || !isWalkable(s.map, p)) continue;
      if (needLos && !hasLineOfSight(s.map, origin, p, openDoors(s))) continue;
      cells.push(p);
    }
  }
  return cells;
}

/** Casillas que afecta una técnica lanzada sobre `target` (sirve para el aviso previo y para resolverla). */
function techniqueCells(s: GameState, def: TechniqueDef, target: Vec): Vec[] {
  const from = s.player.pos;
  const t = def.target;
  switch (t.kind) {
    case 'self':
      return [from];
    case 'area':
      return inBounds(s.map, target) ? diamond(s, target, t.areaRadius, false) : [];
    case 'burst':
      return diamond(s, from, t.radius, true).filter((c) => !equals(c, from));
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
    if (manhattan(p, target) !== 1) return fail('not_adjacent');
    const e = enemyAt(s, target);
    return e ? { reason: null, cells: [target], hits: [e], weapon } : fail('no_target');
  }
  const dir = alignedDir(p, target);
  if (!dir) return fail('not_aligned');
  if (manhattan(p, target) > weapon.reach) return fail('out_of_range');
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
  if (opt.gains.some((g) => g.kind === 'advancedTechnique') && techniquesFor(p.affinity, 3).every((id) => p.techniques.includes(id))) {
    return 'Ya conoces las técnicas de tu afinidad.';
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
  return n && manhattan(s.player.pos, n.pos) <= 1 ? n : undefined;
};

export function validateCommand(state: GameState, cmd: Command): InvalidReason | null {
  if (state.status !== 'playing') return 'run_over';
  const p = state.player;
  switch (cmd.type) {
    case 'Move': {
      if (!Number.isInteger(cmd.dx) || !Number.isInteger(cmd.dy) || Math.abs(cmd.dx) + Math.abs(cmd.dy) !== 1) {
        return 'bad_direction';
      }
      const to = { x: p.pos.x + cmd.dx, y: p.pos.y + cmd.dy };
      if (!inBounds(state.map, to)) return 'out_of_bounds';
      if (!isWalkable(state.map, to) || barrierAt(state, to)) return 'blocked';
      if (enemyAt(state, to) || chestAt(state, to) || npcAt(state, to)) return 'occupied';
      return null;
    }
    case 'Wait':
      return null;
    case 'BasicAttack':
      return attackPlan(state, cmd.target).reason;
    case 'UseTechnique':
      return validateTechnique(state, cmd.techniqueId, cmd.target);
    case 'UseItem':
      if (!getItem(cmd.itemId)) return 'unknown_item';
      return (p.inventory[cmd.itemId] ?? 0) > 0 ? null : 'no_item';
    case 'Throw':
      return validateThrow(state, cmd.itemId, cmd.target);
    case 'EquipWeapon':
      if (!getWeapon(cmd.weaponId)) return 'unknown_item';
      if (!p.weapons.includes(cmd.weaponId)) return 'no_item';
      return p.equipment.weapon === cmd.weaponId ? 'already_equipped' : null;
    case 'Interact': {
      if (manhattan(p.pos, cmd.target) > 1) return 'not_adjacent';
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
      if (manhattan(p.pos, npc.pos) > 1) return 'not_adjacent';
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
  if (isBoss(enemy)) dialogueOnce(ctx, 'campanero_intro');
}

/** Un enemigo que recibe daño sabe dónde estás, aunque no te viera. */
function alertEnemy(ctx: Ctx, enemy: Enemy): void {
  if (enemy.alert === 0) noticePlayer(ctx, enemy);
  enemy.alert = BALANCE.alertTurns;
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

function summonEchoes(ctx: Ctx, boss: Enemy, count: number): void {
  const s = ctx.state;
  const def = ENEMIES.eco_menor;
  const cells = freeCellsAround(s, boss.pos, 4);
  for (let i = 0; i < count && i < cells.length; i++) {
    const echo = createEnemy(def, `enemy-eco-${s.turn}-${i}`, cells[i], s.floor);
    echo.alert = BALANCE.alertTurns;
    echo.lastSeen = { ...s.player.pos };
    s.enemies.push(echo);
    ctx.events.push({ type: 'EnemySummoned', enemyId: echo.id, pos: cells[i] });
  }
  say(ctx, 'Unos ecos brotan del suelo y se lanzan contra ti.');
}

function updateBossPhase(ctx: Ctx, enemy: Enemy): void {
  const def = getEnemy(enemy.kind);
  if (!def?.boss || enemy.hp <= 0) return;
  const phase = bossPhaseFor(enemy);
  if (phase <= enemy.phase) return;
  enemy.phase = phase;
  ctx.events.push({ type: 'BossPhase', enemyId: enemy.id, phase });
  say(ctx, `${enemyName(enemy)} entra en la fase ${phase}.`);
  dialogueOnce(ctx, `campanero_fase${phase}`);
  if (phase === 3) summonEchoes(ctx, enemy, def.boss.echoes);
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

function damagePlayer(ctx: Ctx, amount: number, source: string): void {
  const p = ctx.state.player;
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
    if (st.id === 'quemadura') {
      target.hp = Math.max(0, target.hp - BALANCE.burnDamage);
      if (targetId === 'player') ctx.state.stats.damageTaken += BALANCE.burnDamage;
      else ctx.state.stats.damageDealt += BALANCE.burnDamage;
      ctx.events.push({ type: 'DamageApplied', targetId, amount: BALANCE.burnDamage, source: 'quemadura' });
    }
    st.turns -= 1;
  }
  target.statuses = target.statuses.filter((st) => st.turns > 0);
}

function gainXp(ctx: Ctx, amount: number): void {
  const p = ctx.state.player;
  p.xp += amount;
  ctx.events.push({ type: 'XpGained', amount });
  while (p.xp >= xpToNext(p.level)) {
    p.xp -= xpToNext(p.level);
    p.level += 1;
    p.maxHp += BALANCE.levelUp.hp;
    p.hp += BALANCE.levelUp.hp;
    p.maxKiro += BALANCE.levelUp.kiro;
    p.kiro += BALANCE.levelUp.kiro;
    if (p.level % BALANCE.levelUp.powerEvery === 0) p.power += 1;
    const learned = techniquesFor(p.affinity, p.level).filter((id) => !p.techniques.includes(id));
    p.techniques.push(...learned);
    ctx.events.push({ type: 'LevelUp', level: p.level, learned });
    say(ctx, `¡Subes al nivel ${p.level}!`);
    for (const id of learned) say(ctx, `Aprendes ${getTechnique(id)?.name ?? id}.`);
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

function defeatBoss(ctx: Ctx, boss: Enemy): void {
  const s = ctx.state;
  s.stats.bossDefeated = true;
  if (!s.player.relics.includes('sello_antiguo')) s.player.relics.push('sello_antiguo');
  // Los ecos convocados se desvanecen con su amo.
  for (const e of s.enemies.filter((o) => o.kind === 'eco_menor')) {
    cancelTelegraphs(ctx, e.id);
    ctx.events.push({ type: 'EnemyDefeated', enemyId: e.id });
  }
  for (const e of s.enemies.filter((o) => o.kind === 'eco_menor')) releaseStuck(s, e);
  s.enemies = s.enemies.filter((o) => o.kind !== 'eco_menor');
  ctx.events.push({ type: 'BossDefeated', enemyId: boss.id });
  say(ctx, 'La campana calla. Obtienes el Sello antiguo y la salida se abre.');
  dialogueOnce(ctx, 'campanero_derrota');
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
    gainXp(ctx, getEnemy(e.kind)?.xp ?? 0);
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
    if (e.kind === 'equipment') return (getEquipment(e.id)?.bonus ?? 0) > (getEquipment(p.equipment.armor)?.bonus ?? 0);
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
  const dir = dominantDir(s.player.pos, enemy.pos);
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
  if (def.target.kind === 'blink') {
    const from = p.pos;
    p.pos = target;
    ctx.events.push({ type: 'PlayerMoved', from, to: target });
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
      const dmg = calcDamage(def.damage.power, levelBonus, def.damage.ignoreDefense ? 0 : enemy.defense);
      damageEnemy(ctx, enemy, dmg, def.id);
      say(ctx, `${enemyName(enemy)} recibe ${dmg} de daño.`);
    }
    if (def.inflict && enemy.hp > 0) {
      if (def.inflict.status === 'aturdido' && isBoss(enemy)) {
        say(ctx, `${enemyName(enemy)} es inmune al aturdimiento.`);
      } else {
        applyStatus(enemy, def.inflict.status, def.inflict.turns);
        ctx.events.push({ type: 'StatusApplied', targetId: enemy.id, status: def.inflict.status, turns: def.inflict.turns });
      }
    }
    if (def.push && enemy.hp > 0 && !isBoss(enemy)) pushEnemy(ctx, enemy, def.push);
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
  collect(ctx, 'moneda', coinAmount(chest.locked ? 10 : 5, floor), 'Dentro hay además');
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
function collect(ctx: Ctx, itemId: string, count: number, verb: string): void {
  const p = ctx.state.player;
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
  const weapon = getWeapon(itemId);
  if (weapon) {
    if (!p.weapons.includes(weapon.id)) {
      p.weapons.push(weapon.id);
      say(ctx, `${verb} ${weapon.name}. Puedes equiparla desde el menú (Tab).`);
    } else {
      p.shards += 2;
      say(ctx, `${verb} ${weapon.name}, pero ya la tienes: la desmontas (+2 esquirlas).`);
    }
    return;
  }
  const armor = getEquipment(itemId);
  if (armor) {
    const current = getEquipment(p.equipment[armor.slot])?.bonus ?? -1;
    if (armor.bonus > current) {
      p.equipment[armor.slot] = armor.id;
      ctx.events.push({ type: 'EquipmentEquipped', slot: armor.slot, itemId: armor.id });
      say(ctx, `${verb} ${armor.name} y te la equipas (${armor.description}).`);
    } else {
      p.shards += 1;
      say(ctx, `${verb} ${armor.name}, pero tu vestimenta actual es mejor: la desmontas (+1 esquirla).`);
    }
    return;
  }
  p.inventory[itemId] = (p.inventory[itemId] ?? 0) + count;
  say(ctx, `${verb} ${count > 1 ? `${count}× ` : ''}${itemName(itemId)}.`);
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
  const level = generateLevel({ seed: s.seed, floor: s.floor + 1, boss: s.floor + 1 >= s.maxFloor });
  s.floor += 1;
  s.map = level.map;
  s.player.pos = level.playerStart;
  s.enemies = level.enemies;
  s.chests = level.chests;
  s.barriers = [];
  s.drops = level.drops;
  s.telegraphs = [];
  s.npcs = level.npcs;
  s.scrolls = level.scrolls;
  s.explored = new Array<boolean>(level.map.width * level.map.height).fill(false);
  if (s.player.keys.length > 0) {
    s.player.keys = [];
    say(ctx, 'Las llaves que no usaste se deshacen en polvo al cruzar.');
  }
  ctx.events.push({ type: 'FloorChanged', floor: s.floor });
  say(ctx, `Desciendes al sector ${s.floor}.`);
}

function resolvePlayerAction(ctx: Ctx, cmd: Command): void {
  const s = ctx.state;
  const p = s.player;
  switch (cmd.type) {
    case 'Move': {
      const from = p.pos;
      p.pos = { x: from.x + cmd.dx, y: from.y + cmd.dy };
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
        let dmg = calcDamage(effectivePower(p), 0, enemy.defense);
        if (enemy.alert === 0) {
          dmg *= BALANCE.sneakMultiplier;
          ctx.state.stats.sneakAttacks += 1;
          ctx.events.push({ type: 'SneakAttack', enemyId: enemy.id });
          say(ctx, `¡Golpe furtivo a ${enemyName(enemy)}! (${dmg} de daño).`);
        } else {
          say(ctx, `Golpeas a ${enemyName(enemy)} (${dmg} de daño).`);
        }
        damageEnemy(ctx, enemy, dmg, 'ataque_basico');
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
        let dmg = calcDamage(def.damage, bonus, def.ignoreDefense ? 0 : victim.defense);
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
      say(ctx, `Equipas: ${getWeapon(cmd.weaponId)?.name ?? cmd.weaponId}.`);
      return;
    }
    case 'UseTechnique':
      castTechnique(ctx, getTechnique(cmd.techniqueId) as TechniqueDef, cmd.target);
      return;
    case 'UseItem': {
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
        const learned = techniquesFor(p.affinity, 3).filter((id) => !p.techniques.includes(id));
        p.techniques.push(...learned);
        for (const id of learned) say(ctx, `Aprendes ${getTechnique(id)?.name ?? id}.`);
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
    !chestAt(s, p) &&
    !barrierAt(s, p) &&
    !equals(s.player.pos, p)
  );
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

function startTelegraph(ctx: Ctx, enemy: Enemy, name: string, cells: Vec[], power: number, delay: number): void {
  const tg: Telegraph = { id: `tg-${ctx.state.turn}-${enemy.id}`, ownerId: enemy.id, name, cells, power, turns: delay };
  ctx.state.telegraphs.push(tg);
  ctx.events.push({ type: 'TelegraphStarted', ownerId: enemy.id, cells, turns: delay });
  say(ctx, `${enemyName(enemy)} prepara ${name}: ¡apártate de las casillas marcadas!`);
}

/** Cuenta atrás de un ataque anunciado; al llegar a 0 se libera y daña a quien siga dentro. */
function processTelegraph(ctx: Ctx, enemy: Enemy, tg: Telegraph): void {
  tg.turns -= 1;
  if (tg.turns > 0) return;
  const s = ctx.state;
  s.telegraphs = s.telegraphs.filter((t) => t !== tg);
  const hit = tg.cells.some((c) => equals(c, s.player.pos));
  ctx.events.push({ type: 'TelegraphReleased', ownerId: enemy.id, cells: tg.cells, hit });
  if (hit) {
    const dmg = calcDamage(tg.power, 0, effectiveDefense(s.player));
    damagePlayer(ctx, dmg, enemy.id);
    say(ctx, `${tg.name} te alcanza (${dmg} de daño).`);
  } else {
    say(ctx, `${tg.name} estalla en el vacío: lo esquivaste.`);
  }
}

/** Marca un ataque propio del Monje Hueco (área alrededor del jugador) si lo ve a su alcance. */
function channelerAttack(ctx: Ctx, enemy: Enemy, def: EnemyDef): StepResult | null {
  const s = ctx.state;
  const ch = def.channel;
  if (!ch) return null;
  const p = s.player.pos;
  if (manhattan(enemy.pos, p) > ch.range || !hasLineOfSight(s.map, enemy.pos, p, openDoors(s))) return null;
  startTelegraph(ctx, enemy, ch.name, diamond(s, p, ch.radius, false), enemy.power, ch.delay);
  return 'attacked';
}

/**
 * Patrón del Campanero: golpe cercano si estás a su alcance; onda en cruz desde la fase 2; en la fase 1 avanza
 * despacio (una de cada dos rondas) mientras estés lejos.
 */
function bossAttack(ctx: Ctx, enemy: Enemy, def: EnemyDef): StepResult | null {
  const s = ctx.state;
  const b = def.boss;
  if (!b) return null;
  const p = s.player.pos;
  const dist = manhattan(enemy.pos, p);
  if (dist <= b.slam.radius) {
    const cells = diamond(s, enemy.pos, b.slam.radius, false).filter((c) => !equals(c, enemy.pos));
    startTelegraph(ctx, enemy, b.slam.name, cells, b.slam.power, b.slam.delay);
    return 'attacked';
  }
  if (enemy.phase >= 2 && hasLineOfSight(s.map, enemy.pos, p, openDoors(s))) {
    startTelegraph(ctx, enemy, b.wave.name, crossCells(s, p, b.wave.length), b.wave.power, b.wave.delay);
    return 'attacked';
  }
  return null;
}

function enemyStep(ctx: Ctx, enemy: Enemy, def: EnemyDef, sees: boolean): StepResult {
  const s = ctx.state;
  const p = s.player;
  const dist = manhattan(enemy.pos, p.pos);

  const hit = (verb: string): StepResult => {
    const dmg = calcDamage(enemy.power, 0, effectiveDefense(p));
    damagePlayer(ctx, dmg, enemy.id);
    say(ctx, `${enemyName(enemy)} ${verb} (${dmg} de daño).`);
    return 'attacked';
  };

  if (sees) {
    if (def.behavior === 'channeler') {
      const r = channelerAttack(ctx, enemy, def);
      if (r) return r;
    } else if (def.behavior === 'boss') {
      const r = bossAttack(ctx, enemy, def);
      if (r) return r;
    } else if (def.behavior === 'ranged') {
      const range = def.range ?? 5;
      const keepAway = def.keepAway ?? 2;
      if (dist <= keepAway) {
        // Retrocede a la vecina libre que más lo aleje (orden fijo de DIRS: desempate determinista).
        let best: Vec | null = null;
        let bestD = dist;
        for (const d of DIRS) {
          const n = { x: enemy.pos.x + d.x, y: enemy.pos.y + d.y };
          if (!enemyCanEnter(s, enemy, n)) continue;
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
    } else if (dist === 1) {
      return hit('te golpea');
    }
  }

  if (def.behavior === 'boss' && s.turn % 2 !== 0) return 'none'; // el Campanero avanza despacio
  // Sin verte, va a donde te vio por última vez.
  const goal = sees ? p.pos : enemy.lastSeen;
  if (!goal || equals(goal, enemy.pos)) return 'none';
  const blocked = (q: Vec): boolean => !enemyCanEnter(s, enemy, q);
  const path = findPath(s.map, enemy.pos, goal, blocked);
  if (!path || path.length > enemy.aggroRange * 2) return 'none';
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
  } else if (enemy.alert > 0) {
    enemy.alert -= 1;
    if (enemy.alert === 0) {
      enemy.lastSeen = null;
      ctx.events.push({ type: 'EnemyLostTrack', enemyId: enemy.id });
    }
  }
  if (enemy.alert === 0) return; // no sabe de ti: permanece quieto
  // Los lentos actúan una de cada N rondas; el índice escalona a los de la misma clase (determinista).
  if (def.actEvery > 1 && (ctx.state.turn + index) % def.actEvery !== 0) return;
  for (let n = 0; n < def.actionsPerTurn; n++) {
    if (enemyStep(ctx, enemy, def, sees) !== 'moved') break;
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
    if (npc?.kind === FORGE_KIND) return { ok: true, state, events: [{ type: 'NpcTalked', npcId: npc.id }] };
  }

  const ctx: Ctx = { state: structuredClone(state), events: [] };
  const s = ctx.state;

  resolvePlayerAction(ctx, cmd); // pasos 4-5
  if (s.status === 'playing') pickUp(ctx);
  reapDead(ctx);

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
    reapDead(ctx);
  }

  s.turn += 1; // paso 9
  updateExplored(s);
  return { ok: true, state: s, events: ctx.events };
}
