import { BALANCE } from '../content/balance';
import { getEnemy, type EnemyDef } from '../content/enemies';
import { getEquipment, getItem, lootTableFor } from '../content/items';
import { getTechnique, techniquesFor, type TechniqueDef } from '../content/techniques';
import { getThrowable, getWeapon, WEAPONS, type WeaponDef } from '../content/weapons';
import { generateLevel } from '../dungeon/generator';
import { calcDamage, effectiveDefense, effectivePower, xpToNext } from './combat';
import { DIRS, equals, findPath, hasLineOfSight, inBounds, isWalkable, lineCells, manhattan, terrainAt } from './grid';
import { nextRandom } from './rng';
import { canSeeEntity, enemySees, openDoors, visibleCells } from './sight';
import type {
  Chest,
  Command,
  CommandResult,
  Enemy,
  GameEvent,
  GameState,
  InvalidReason,
  Player,
  StatusId,
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
  extraction_unavailable: 'Aún no puedes extraerte de la expedición.',
};

// ---------- Consultas ----------

const enemyAt = (s: GameState, p: Vec): Enemy | undefined => s.enemies.find((e) => equals(e.pos, p));
const chestAt = (s: GameState, p: Vec): Chest | undefined => s.chests.find((c) => equals(c.pos, p));
const barrierAt = (s: GameState, p: Vec): boolean => s.barriers.some((b) => equals(b.pos, p));
const enemyName = (e: Enemy): string => getEnemy(e.kind)?.name ?? e.kind;

/** Casilla transitable y vacía: sin pared, enemigo, cofre, barrera ni jugador. */
function cellFree(s: GameState, p: Vec): boolean {
  return (
    inBounds(s.map, p) && isWalkable(s.map, p) && !enemyAt(s, p) && !chestAt(s, p) && !barrierAt(s, p) && !equals(s.player.pos, p)
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
    if (!inBounds(s.map, c) || !isWalkable(s.map, c) || barrierAt(s, c) || chestAt(s, c)) break;
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
      if (enemyAt(state, to) || chestAt(state, to)) return 'occupied';
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
      if (chest) return chest.opened ? 'already_opened' : null;
      return terrainAt(state.map, cmd.target) === 'exit' ? null : 'nothing_to_interact';
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

/** Un enemigo que recibe daño sabe dónde estás, aunque no te viera. */
function alertEnemy(ctx: Ctx, enemy: Enemy): void {
  if (enemy.alert === 0) ctx.events.push({ type: 'EnemyAlerted', enemyId: enemy.id });
  enemy.alert = BALANCE.alertTurns;
  enemy.lastSeen = { ...ctx.state.player.pos };
}

function damageEnemy(ctx: Ctx, enemy: Enemy, amount: number, source: string): void {
  enemy.hp = Math.max(0, enemy.hp - amount);
  ctx.events.push({ type: 'DamageApplied', targetId: enemy.id, amount, source });
  alertEnemy(ctx, enemy);
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
  ctx.events.push({ type: 'DamageApplied', targetId: 'player', amount, source });
  if (p.hp <= 0) defeatPlayer(ctx);
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

function reapDead(ctx: Ctx): void {
  const alive: Enemy[] = [];
  const fallen: Enemy[] = [];
  for (const e of ctx.state.enemies) (e.hp > 0 ? alive : fallen).push(e);
  ctx.state.enemies = alive;
  for (const e of fallen) {
    ctx.events.push({ type: 'EnemyDefeated', enemyId: e.id });
    say(ctx, `${enemyName(e)} cae derrotado.`);
    gainXp(ctx, getEnemy(e.kind)?.xp ?? 0);
  }
}

function rollLoot(ctx: Ctx) {
  const owned = ctx.state.player.weapons;
  const table = lootTableFor(ctx.state.floor).filter((e) => !(e.kind === 'weapon' && owned.includes(e.id)));
  const total = table.reduce((sum, e) => sum + e.weight, 0);
  const r = nextRandom(ctx.state.rngState);
  ctx.state.rngState = r.state;
  let roll = r.value * total;
  for (const entry of table) {
    if (roll < entry.weight) return entry;
    roll -= entry.weight;
  }
  return table[table.length - 1];
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
      applyStatus(enemy, def.inflict.status, def.inflict.turns);
      ctx.events.push({ type: 'StatusApplied', targetId: enemy.id, status: def.inflict.status, turns: def.inflict.turns });
    }
    if (def.push && enemy.hp > 0) pushEnemy(ctx, enemy, def.push);
  }
}

function openChest(ctx: Ctx, chest: Chest): void {
  const p = ctx.state.player;
  chest.opened = true;
  const entry = rollLoot(ctx);
  ctx.events.push({ type: 'ChestOpened', chestId: chest.id, itemId: entry.id });
  switch (entry.kind) {
    case 'item':
      p.inventory[entry.id] = (p.inventory[entry.id] ?? 0) + 1;
      say(ctx, `Abres el cofre y encuentras: ${getItem(entry.id)?.name ?? entry.id}.`);
      return;
    case 'throwable': {
      const n = entry.amount ?? 3;
      p.inventory[entry.id] = (p.inventory[entry.id] ?? 0) + n;
      say(ctx, `Abres el cofre y encuentras: ${n}× ${getThrowable(entry.id)?.name ?? entry.id}.`);
      return;
    }
    case 'weapon': {
      const w = getWeapon(entry.id);
      if (!w) return;
      if (!p.weapons.includes(w.id)) p.weapons.push(w.id);
      say(ctx, `Abres el cofre y encuentras: ${w.name}. Puedes equiparla desde el menú (Tab).`);
      return;
    }
    case 'equipment': {
      const def = getEquipment(entry.id);
      if (!def) return;
      const current = getEquipment(p.equipment[def.slot])?.bonus ?? -1;
      if (def.bonus > current) {
        p.equipment[def.slot] = def.id;
        ctx.events.push({ type: 'EquipmentEquipped', slot: def.slot, itemId: def.id });
        say(ctx, `Abres el cofre y te equipas: ${def.name} (${def.description}).`);
      } else {
        say(ctx, `Abres el cofre y hallas ${def.name}, pero tu equipo actual es mejor.`);
      }
    }
  }
}

function placeDrop(s: GameState, pos: Vec, itemId: string): void {
  const existing = s.drops.find((d) => d.itemId === itemId && equals(d.pos, pos));
  if (existing) existing.count += 1;
  else s.drops.push({ pos: { ...pos }, itemId, count: 1 });
}

/** Recoge lo que haya en el suelo bajo el jugador. */
function pickUp(ctx: Ctx): void {
  const s = ctx.state;
  const here = s.drops.filter((d) => equals(d.pos, s.player.pos));
  if (here.length === 0) return;
  for (const d of here) {
    s.player.inventory[d.itemId] = (s.player.inventory[d.itemId] ?? 0) + d.count;
    ctx.events.push({ type: 'ItemPickedUp', itemId: d.itemId, count: d.count });
    say(ctx, `Recoges ${d.count}× ${getThrowable(d.itemId)?.name ?? d.itemId}.`);
  }
  s.drops = s.drops.filter((d) => !equals(d.pos, s.player.pos));
}

function descend(ctx: Ctx): void {
  const s = ctx.state;
  const level = generateLevel({ seed: s.seed, floor: s.floor + 1 });
  s.floor += 1;
  s.map = level.map;
  s.player.pos = level.playerStart;
  s.enemies = level.enemies;
  s.chests = level.chests;
  s.barriers = [];
  s.drops = [];
  s.explored = new Array<boolean>(level.map.width * level.map.height).fill(false);
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
      if (roll.value >= def.breakChance) placeDrop(s, landing, def.id);
      else say(ctx, `${def.name} se pierde.`);
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
      if (s.floor >= s.maxFloor) {
        s.status = 'won';
        ctx.events.push({ type: 'RunWon' });
        say(ctx, 'Cruzas la salida. ¡Has sobrevivido a la cripta!');
      } else {
        descend(ctx);
      }
      return;
    }
    case 'Extract':
      return; // Inalcanzable: la validación lo rechaza.
  }
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
    if (def.behavior === 'ranged') {
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
  if (enemy.statuses.some((st) => st.id === 'aturdido')) {
    say(ctx, `${enemyName(enemy)} está aturdido y pierde su acción.`);
    return;
  }
  // Percepción: te nota si te ve (distancia, línea de visión, arbustos y puertas). Al perderte, sigue alerta unas rondas.
  const sees = enemySees(ctx.state, enemy);
  if (sees) {
    if (enemy.alert === 0) {
      ctx.events.push({ type: 'EnemyAlerted', enemyId: enemy.id });
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

  const ctx: Ctx = { state: structuredClone(state), events: [] };
  const s = ctx.state;

  resolvePlayerAction(ctx, cmd); // pasos 4-5
  if (s.status === 'playing') pickUp(ctx);
  reapDead(ctx);

  if (s.status === 'playing') {
    // paso 6: estados del jugador
    tickStatuses(ctx, s.player, 'player');
    if (s.player.hp <= 0) defeatPlayer(ctx);
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
