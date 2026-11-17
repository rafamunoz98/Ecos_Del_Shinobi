import { BALANCE } from '../content/balance';
import { getEnemy } from '../content/enemies';
import { getItem, LOOT_TABLE } from '../content/items';
import { getTechnique, type TechniqueDef } from '../content/techniques';
import { calcDamage } from './combat';
import { computeVisible, equals, findPath, hasLineOfSight, inBounds, isWalkable, manhattan, terrainAt } from './grid';
import { nextRandom } from './rng';
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
 * 6 estados del jugador · 7 enemigos vivos (en orden de lista) · 8 estados de enemigos ·
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
  unknown_item: 'Ese objeto no existe.',
  no_item: 'No te quedan de ese objeto.',
  nothing_to_interact: 'No hay nada con lo que interactuar ahí.',
  already_opened: 'Ya está abierto.',
  extraction_unavailable: 'Aún no puedes extraerte de la expedición.',
};

// ---------- Consultas ----------

const enemyAt = (s: GameState, p: Vec): Enemy | undefined => s.enemies.find((e) => equals(e.pos, p));
const chestAt = (s: GameState, p: Vec): Chest | undefined => s.chests.find((c) => equals(c.pos, p));
const enemyName = (e: Enemy): string => getEnemy(e.kind)?.name ?? e.kind;

/** Casillas que el jugador ve ahora mismo (los enemigos solo se muestran si están aquí). */
export function visibleCells(state: GameState): Set<number> {
  return computeVisible(state.map, state.player.pos, BALANCE.visionRadius);
}

function techniqueArea(state: GameState, def: TechniqueDef, target: Vec): Vec[] {
  const cells: Vec[] = [];
  for (let dy = -def.areaRadius; dy <= def.areaRadius; dy++) {
    for (let dx = -def.areaRadius; dx <= def.areaRadius; dx++) {
      if (Math.abs(dx) + Math.abs(dy) > def.areaRadius) continue;
      const p = { x: target.x + dx, y: target.y + dy };
      if (inBounds(state.map, p) && isWalkable(state.map, p)) cells.push(p);
    }
  }
  return cells;
}

function validateTechnique(state: GameState, techniqueId: string, target: Vec): InvalidReason | null {
  const def = getTechnique(techniqueId);
  if (!def) return 'unknown_technique';
  const p = state.player;
  if (!p.techniques.includes(techniqueId)) return 'not_known';
  if (def.affinity && def.affinity !== p.affinity) return 'wrong_affinity';
  if (p.kiro < def.kiroCost) return 'not_enough_kiro';
  if (!inBounds(state.map, target)) return 'out_of_bounds';
  if (!isWalkable(state.map, target)) return 'blocked';
  if (manhattan(p.pos, target) > def.range) return 'out_of_range';
  if (def.requiresLineOfSight && !hasLineOfSight(state.map, p.pos, target)) return 'no_line_of_sight';
  return null;
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
  const cells = inBounds(state.map, target) ? techniqueArea(state, def, target) : [];
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
      if (!isWalkable(state.map, to)) return 'blocked';
      if (enemyAt(state, to) || chestAt(state, to)) return 'occupied';
      return null;
    }
    case 'Wait':
      return null;
    case 'BasicAttack':
      if (manhattan(p.pos, cmd.target) !== 1) return 'not_adjacent';
      return enemyAt(state, cmd.target) ? null : 'no_target';
    case 'UseTechnique':
      return validateTechnique(state, cmd.techniqueId, cmd.target);
    case 'UseItem':
      if (!getItem(cmd.itemId)) return 'unknown_item';
      return (p.inventory[cmd.itemId] ?? 0) > 0 ? null : 'no_item';
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

function damageEnemy(ctx: Ctx, enemy: Enemy, amount: number, source: string): void {
  enemy.hp = Math.max(0, enemy.hp - amount);
  ctx.events.push({ type: 'DamageApplied', targetId: enemy.id, amount, source });
}

function damagePlayer(ctx: Ctx, amount: number, source: string): void {
  const p = ctx.state.player;
  p.hp = Math.max(0, p.hp - amount);
  ctx.events.push({ type: 'DamageApplied', targetId: 'player', amount, source });
  if (p.hp <= 0 && ctx.state.status === 'playing') {
    ctx.state.status = 'lost';
    ctx.events.push({ type: 'PlayerDefeated' });
    say(ctx, 'Caes derrotado. La expedición termina.');
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
      ctx.events.push({ type: 'DamageApplied', targetId, amount: BALANCE.burnDamage, source: 'quemadura' });
    }
    st.turns -= 1;
  }
  target.statuses = target.statuses.filter((st) => st.turns > 0);
}

function reapDead(ctx: Ctx): void {
  const alive: Enemy[] = [];
  for (const e of ctx.state.enemies) {
    if (e.hp > 0) {
      alive.push(e);
    } else {
      ctx.events.push({ type: 'EnemyDefeated', enemyId: e.id });
      say(ctx, `${enemyName(e)} cae derrotado.`);
    }
  }
  ctx.state.enemies = alive;
}

function rollLoot(ctx: Ctx): string {
  const total = LOOT_TABLE.reduce((sum, e) => sum + e.weight, 0);
  const r = nextRandom(ctx.state.rngState);
  ctx.state.rngState = r.state;
  let roll = r.value * total;
  for (const entry of LOOT_TABLE) {
    if (roll < entry.weight) return entry.itemId;
    roll -= entry.weight;
  }
  return LOOT_TABLE[LOOT_TABLE.length - 1].itemId;
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
      const enemy = enemyAt(s, cmd.target) as Enemy;
      const dmg = calcDamage(p.power, 0, enemy.defense);
      damageEnemy(ctx, enemy, dmg, 'ataque_basico');
      say(ctx, `Golpeas a ${enemyName(enemy)} (${dmg} de daño).`);
      return;
    }
    case 'UseTechnique': {
      const def = getTechnique(cmd.techniqueId) as TechniqueDef;
      p.kiro -= def.kiroCost;
      ctx.events.push({ type: 'KiroSpent', amount: def.kiroCost });
      const cells = techniqueArea(s, def, cmd.target);
      ctx.events.push({ type: 'TechniqueCast', techniqueId: def.id, target: cmd.target, cells });
      say(ctx, `Usas ${def.name} (-${def.kiroCost} kiro).`);
      for (const enemy of s.enemies) {
        if (!cells.some((c) => equals(c, enemy.pos))) continue;
        const dmg = calcDamage(def.power, 0, enemy.defense);
        damageEnemy(ctx, enemy, dmg, def.id);
        say(ctx, `${enemyName(enemy)} recibe ${dmg} de daño.`);
        if (def.applies) {
          applyStatus(enemy, def.applies.status, def.applies.turns);
          ctx.events.push({ type: 'StatusApplied', targetId: enemy.id, status: def.applies.status, turns: def.applies.turns });
        }
      }
      return;
    }
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
        chest.opened = true;
        const itemId = rollLoot(ctx);
        p.inventory[itemId] = (p.inventory[itemId] ?? 0) + 1;
        ctx.events.push({ type: 'ChestOpened', chestId: chest.id, itemId });
        say(ctx, `Abres el cofre y encuentras: ${getItem(itemId)?.name ?? itemId}.`);
        return;
      }
      s.status = 'won';
      ctx.events.push({ type: 'RunWon' });
      say(ctx, 'Cruzas la salida. ¡Has sobrevivido a la cripta!');
      return;
    }
    case 'Extract':
      return; // Inalcanzable: la validación lo rechaza.
  }
}

/** Acechador: golpea si está adyacente; si no, persigue por el camino más corto dentro de su rango. */
function enemyAct(ctx: Ctx, enemy: Enemy): void {
  const s = ctx.state;
  const p = s.player;
  if (manhattan(enemy.pos, p.pos) === 1) {
    const dmg = calcDamage(enemy.power, 0, p.defense);
    damagePlayer(ctx, dmg, enemy.id);
    say(ctx, `${enemyName(enemy)} te golpea (${dmg} de daño).`);
    return;
  }
  const blocked = (q: Vec): boolean =>
    s.enemies.some((o) => o !== enemy && equals(o.pos, q)) || s.chests.some((c) => equals(c.pos, q));
  const path = findPath(s.map, enemy.pos, p.pos, blocked);
  if (!path || path.length > enemy.aggroRange) return;
  const next = path[0];
  if (equals(next, p.pos)) return;
  const from = enemy.pos;
  enemy.pos = next;
  ctx.events.push({ type: 'EnemyMoved', enemyId: enemy.id, from, to: next });
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
  reapDead(ctx);

  if (s.status === 'playing') {
    // paso 6: estados del jugador
    tickStatuses(ctx, s.player, 'player');
    if (s.player.hp <= 0) {
      s.status = 'lost';
      ctx.events.push({ type: 'PlayerDefeated' });
      say(ctx, 'Caes derrotado. La expedición termina.');
    }
  }

  if (s.status === 'playing') {
    // paso 7: enemigos vivos, en orden determinista (orden de la lista)
    for (const enemy of s.enemies) {
      if (enemy.hp <= 0) continue;
      enemyAct(ctx, enemy);
      if (s.status !== 'playing') break;
    }
  }

  if (s.status === 'playing') {
    // paso 8: estados de enemigos
    for (const enemy of s.enemies) tickStatuses(ctx, enemy, enemy.id);
    reapDead(ctx);
  }

  s.turn += 1; // paso 9
  updateExplored(s);
  return { ok: true, state: s, events: ctx.events };
}
