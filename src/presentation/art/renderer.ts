import { getEnemy } from '../../content/enemies';
import { getTechnique } from '../../content/techniques';
import { getWeapon } from '../../content/weapons';
import { isKey } from '../../content/items';
import { itemName } from '../../content/names';
import { getThrowable } from '../../content/weapons';
import { canSeeEntity, enemySees, openDoors, visibleCells, visionRadiusOf } from '../../core/sight';
import { manhattan } from '../../core/grid';
import type { Affinity, GameEvent, GameState, Vec } from '../../core/types';
import { type Dir, drawAlly, drawEnemy, drawNinja } from './actors';
import { SHINOBI_STYLES } from './shinobi';
import { drawNpc } from './bosses';
import { type Ctx, circle, makeCanvas, radial, roundRectPath } from './draw';
import {
  type Fx,
  deathFx,
  elementFx,
  impactFx,
  projectileFx,
  puffFx,
  ringFx,
  slashFx,
  sparkleFx,
  thrustFx,
  trailFx,
  whipFx,
} from './fx';
import { drawIcon } from './icons';
import { clamp, easeOut, hash2, rgba } from './noise';
import { type Theme, themeFor } from './themes';
import { E, N, NE, NW, S, SE, SW, W, barrierTile, bushTile, chestTile, doorTile, floorTile, lockedDoorTile, stairsTile, wallTile } from './tileart';

/** Qué casillas resaltar mientras se apunta una técnica o un lanzamiento. */
export interface Overlay {
  cells: Vec[];
  cursor: Vec | null;
  valid: boolean;
  /** Color CSS '#rrggbb' del resalte. */
  color: string;
}

interface Disp {
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  t0: number;
  delay: number;
  dur: number;
  dir: Dir;
  lx: number;
  ly: number;
  lt0: number;
  lamp: number;
  flashT0: number;
  face: 1 | -1;
}

interface FloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  start: number;
  dur: number;
}

interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ph: number;
  s: number;
}

const PLAYER = 'player';
const ENEMY_DELAY = 0.2;
const AFFINITY_COLOR: Record<Affinity, string> = {
  ascua: '#ff7a2a',
  marea: '#4a93f0',
  vendaval: '#6fd6a8',
  piedra: '#c0a868',
  rayo: '#ffe14a',
};
export const affinityColor = (a: Affinity | null | undefined): string => (a ? AFFINITY_COLOR[a] : '#ffffff');

export class WorldRenderer {
  private state: GameState | null = null;
  private theme: Theme = themeFor(1);
  private w = 960;
  private h = 640;
  private dpr = 1;
  private userZoom = 1;
  private baseTile = 56;
  private cam = { x: 0, y: 0 };
  private disp = new Map<string, Disp>();
  private fx: Fx[] = [];
  private texts: FloatText[] = [];
  private shake = 0;
  private hurt = 0;
  private fadeT0 = 0;
  /** Destello dorado al cambiar la estética de la zona (caída de un jefe). */
  private themeFlashT0 = -10;
  private hide = 0;
  private visible = new Set<number>();
  private doors = new Set<number>();
  private fog = new Float32Array(0);
  private fogCanvas: HTMLCanvasElement | null = null;
  private fogCtx: Ctx | null = null;
  private fogImg: ImageData | null = null;
  private floorMask = new Uint8Array(0);
  private wallMask = new Uint8Array(0);
  private variant = new Uint8Array(0);
  private doorNS = new Uint8Array(0);
  private barrierBorn = new Map<number, number>();
  private alertT0 = new Map<string, number>();
  private motes: Mote[] = [];
  private lastNow = 0;
  private scratch: HTMLCanvasElement | null = null;
  private scratchCtx: Ctx | null = null;
  private seedMotes = false;
  private teleLabels: { x: number; y: number; text: string; urgent: boolean }[] = [];

  // ---------- Configuración ----------

  resize(w: number, h: number, dpr: number): void {
    this.w = Math.max(64, w);
    this.h = Math.max(64, h);
    this.dpr = dpr;
    this.baseTile = clamp(Math.min(this.w, this.h) / 9, 38, 78);
  }

  get tilePx(): number {
    return this.baseTile * this.userZoom;
  }

  zoomBy(f: number): void {
    this.userZoom = clamp(this.userZoom * f, 0.45, 2.4);
  }

  get zoom(): number {
    return this.userZoom;
  }

  // ---------- Estado ----------

  /** Empieza de cero con un estado nuevo (nueva expedición o nuevo sector). */
  reset(state: GameState, now: number): void {
    this.state = state;
    this.theme = themeFor(state.bossesDefeated);
    this.disp.clear();
    this.fx = [];
    this.texts = [];
    this.barrierBorn.clear();
    this.alertT0.clear();
    this.shake = 0;
    this.hurt = 0;
    this.hide = 0;
    this.fadeT0 = now;
    this.prepareMap(state);
    this.syncDisp(state, null, now, true);
    const p = this.pos(PLAYER, now);
    this.cam = { x: p.x + 0.5, y: p.y + 0.5 };
    this.visible = visibleCells(state);
    this.doors = openDoors(state);
    this.fog.fill(1);
    this.seedMotes = false;
  }

  /** Recibe el estado tras una acción y sus eventos: lanza animaciones y efectos. */
  setState(next: GameState, events: GameEvent[], now: number): void {
    const prev = this.state;
    if (!prev || next.floor !== prev.floor || next.seed !== prev.seed || events.some((e) => e.type === 'FloorChanged')) {
      this.reset(next, now);
      return;
    }
    this.state = next;
    this.visible = visibleCells(next);
    this.doors = openDoors(next);
    this.syncDisp(next, prev, now, false);
    this.spawnEffects(next, prev, events, now);
    for (const b of next.barriers) {
      const i = b.pos.y * next.map.width + b.pos.x;
      if (!this.barrierBorn.has(i)) this.barrierBorn.set(i, now);
    }
    for (const [i] of this.barrierBorn) {
      if (!next.barriers.some((b) => b.pos.y * next.map.width + b.pos.x === i)) this.barrierBorn.delete(i);
    }
  }

  private prepareMap(s: GameState): void {
    const { width: W_, height: H_, tiles } = s.map;
    const n = W_ * H_;
    this.floorMask = new Uint8Array(n);
    this.wallMask = new Uint8Array(n);
    this.variant = new Uint8Array(n);
    this.doorNS = new Uint8Array(n);
    this.fog = new Float32Array(n).fill(1);
    const isWall = (x: number, y: number): boolean => x < 0 || y < 0 || x >= W_ || y >= H_ || tiles[y * W_ + x] === 'wall';
    for (let y = 0; y < H_; y++) {
      for (let x = 0; x < W_; x++) {
        const i = y * W_ + x;
        const r = hash2(x, y, s.floor * 31 + 7);
        this.variant[i] = r < 0.5 ? 0 : r < 0.68 ? 1 : Math.floor(2 + ((r - 0.68) / 0.32) * 4);
        if (tiles[i] === 'wall') {
          let m = 0;
          if (!isWall(x, y - 1)) m |= N;
          if (!isWall(x + 1, y)) m |= E;
          if (!isWall(x, y + 1)) m |= S;
          if (!isWall(x - 1, y)) m |= W;
          this.wallMask[i] = m;
        } else {
          let m = 0;
          if (isWall(x, y - 1)) m |= N;
          if (isWall(x + 1, y)) m |= E;
          if (isWall(x, y + 1)) m |= S;
          if (isWall(x - 1, y)) m |= W;
          if (isWall(x + 1, y - 1)) m |= NE;
          if (isWall(x + 1, y + 1)) m |= SE;
          if (isWall(x - 1, y + 1)) m |= SW;
          if (isWall(x - 1, y - 1)) m |= NW;
          this.floorMask[i] = m;
          if (tiles[i] === 'door' || tiles[i] === 'locked') this.doorNS[i] = isWall(x - 1, y) && isWall(x + 1, y) ? 1 : 0;
        }
      }
    }
    const [c, ctx] = makeCanvas(W_, H_);
    this.fogCanvas = c;
    this.fogCtx = ctx;
    this.fogImg = ctx.createImageData(W_, H_);
  }

  private syncDisp(s: GameState, prev: GameState | null, now: number, snap: boolean): void {
    const apply = (id: string, pos: Vec, delay: number): void => {
      const d = this.disp.get(id);
      if (!d) {
        this.disp.set(id, {
          fx: pos.x, fy: pos.y, tx: pos.x, ty: pos.y, t0: now, delay: 0, dur: 0.001, dir: 'down',
          lx: 0, ly: 0, lt0: -9, lamp: 0, flashT0: -9, face: 1,
        });
        return;
      }
      if (d.tx === pos.x && d.ty === pos.y) return;
      const cur = this.pos(id, now);
      const jump = Math.abs(pos.x - cur.x) + Math.abs(pos.y - cur.y) > 1.6;
      d.fx = snap || jump ? pos.x : cur.x;
      d.fy = snap || jump ? pos.y : cur.y;
      d.tx = pos.x;
      d.ty = pos.y;
      d.t0 = now;
      d.delay = jump ? 0 : delay;
      d.dur = snap || jump ? 0.001 : 0.13;
    };
    const setDir = (id: string, from: Vec, to: Vec): void => {
      const d = this.disp.get(id);
      if (!d) return;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      if (dx === 0 && dy === 0) return;
      d.dir = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
      if (dx !== 0) d.face = dx > 0 ? 1 : -1;
    };
    const pp = prev?.player.pos ?? s.player.pos;
    apply(PLAYER, s.player.pos, 0);
    setDir(PLAYER, pp, s.player.pos);
    for (const e of s.enemies) {
      const before = prev?.enemies.find((q) => q.id === e.id)?.pos ?? e.pos;
      apply(e.id, e.pos, 0.1);
      setDir(e.id, before, e.pos);
    }
    for (const a of s.allies) {
      const before = prev?.allies.find((q) => q.id === a.id)?.pos ?? a.pos;
      apply(a.id, a.pos, 0.05);
      setDir(a.id, before, a.pos);
    }
    for (const id of [...this.disp.keys()]) {
      if (id !== PLAYER && !s.enemies.some((e) => e.id === id) && !s.allies.some((a) => a.id === id)) this.disp.delete(id);
    }
  }

  private pos(id: string, now: number): { x: number; y: number; moving: boolean } {
    const d = this.disp.get(id);
    if (!d) return { x: 0, y: 0, moving: false };
    const raw = (now - d.t0 - d.delay) / d.dur;
    const p = clamp(raw, 0, 1);
    const e = easeOut(p);
    return { x: d.fx + (d.tx - d.fx) * e, y: d.fy + (d.ty - d.fy) * e, moving: raw >= 0 && raw < 1 && d.dur > 0.01 };
  }

  // ---------- Efectos a partir de eventos ----------

  private text(at: Vec, text: string, color: string, now: number, delay = 0, size = 0.36, dur = 0.95): void {
    // Los textos en la misma casilla se apilan para no taparse.
    let stack = 0;
    for (const t of this.texts) if (Math.abs(t.x - (at.x + 0.5)) < 0.3 && Math.abs(t.y - at.y) < 0.9 && now - t.start < 0.5) stack++;
    this.texts.push({ x: at.x + 0.5, y: at.y + 0.1 - stack * 0.28, text, color, size, start: now + delay, dur });
  }

  private spawnEffects(next: GameState, prev: GameState, events: GameEvent[], now: number): void {
    const where = (id: string): Vec | null => {
      if (id === PLAYER) return next.player.pos;
      return next.enemies.find((e) => e.id === id)?.pos ?? prev.enemies.find((e) => e.id === id)?.pos ?? next.allies.find((a) => a.id === id)?.pos ?? prev.allies.find((a) => a.id === id)?.pos ?? null;
    };
    const lunge = (id: string, dir: Vec, amp: number, at: number): void => {
      const d = this.disp.get(id);
      if (!d) return;
      d.lx = Math.sign(dir.x);
      d.ly = Math.sign(dir.y);
      d.lamp = amp;
      d.lt0 = at;
      if (id === PLAYER) {
        d.dir = Math.abs(dir.x) >= Math.abs(dir.y) ? (dir.x > 0 ? 'right' : 'left') : dir.y > 0 ? 'down' : 'up';
      }
    };
    const flash = (id: string, at: number): void => {
      const d = this.disp.get(id);
      if (d) d.flashT0 = at;
    };
    const add = (f: Fx): void => {
      this.fx.push(f);
    };
    let enemyPhase = false;
    const pPos = next.player.pos;

    for (const ev of events) {
      const delay = enemyPhase ? ENEMY_DELAY : 0;
      switch (ev.type) {
        case 'PlayerMoved':
          add(puffFx(now, ev.from, '#a6a39a', 3, 0.18));
          break;
        case 'PlayerAttacked': {
          const first = ev.cells[0] ?? ev.targets[0];
          const last = ev.cells[ev.cells.length - 1] ?? first;
          if (!first) break;
          const dir = { x: Math.sign(first.x - pPos.x), y: Math.sign(first.y - pPos.y) };
          const kind = getWeapon(ev.weaponId)?.kind ?? 'blade';
          lunge(PLAYER, dir, kind === 'blade' ? 0.28 : 0.18, now);
          if (kind === 'blade') add(slashFx(now + 0.04, first, dir));
          else if (kind === 'whip') add(whipFx(now + 0.02, pPos, last));
          else add(thrustFx(now + 0.02, pPos, last));
          break;
        }
        case 'ItemThrown': {
          lunge(PLAYER, { x: Math.sign(ev.to.x - ev.from.x), y: Math.sign(ev.to.y - ev.from.y) }, -0.1, now);
          const fl = 0.18;
          add(projectileFx(now, ev.from, ev.to, ev.itemId, fl));
          if (ev.hit) add(impactFx(now + fl * 1.2, ev.to, '#ffffff'));
          else add(puffFx(now + fl * 1.2, ev.to, '#b8b4a6', 4, 0.2));
          break;
        }
        case 'DamageApplied': {
          const at = where(ev.targetId);
          if (!at) break;
          const isPlayer = ev.targetId === PLAYER;
          const enemySrc = prev.enemies.find((e) => e.id === ev.source) ?? next.enemies.find((e) => e.id === ev.source);
          let t = now;
          if (isPlayer && enemySrc) {
            enemyPhase = true;
            const ranged = manhattan(enemySrc.pos, at) > 1;
            const d0 = ENEMY_DELAY;
            if (ranged) {
              add(projectileFx(now + d0, enemySrc.pos, at, 'senbon', 0.16));
              t = now + d0 + 0.2;
            } else {
              lunge(enemySrc.id, { x: Math.sign(at.x - enemySrc.pos.x), y: Math.sign(at.y - enemySrc.pos.y) }, 0.3, now + d0);
              t = now + d0 + 0.08;
            }
          } else if (!isPlayer) {
            t = now + (ev.source === 'ataque_basico' ? 0.06 : getThrowable(ev.source) ? 0.2 : 0.1);
          }
          flash(ev.targetId, t);
          const burn = ev.source === 'quemadura';
          this.text(at, `${ev.amount}`, burn ? '#ff9a4a' : isPlayer ? '#ff6b6b' : '#fff1b0', now, t - now, isPlayer ? 0.46 : 0.4);
          if (!burn) add(impactFx(t, at, isPlayer ? '#ff8080' : '#ffffff', ev.amount >= 6));
          if (isPlayer) {
            this.shake = Math.max(this.shake, Math.min(0.18, 0.05 + ev.amount * 0.012));
            this.hurt = Math.max(this.hurt, Math.min(0.9, 0.35 + ev.amount * 0.07));
          }
          break;
        }
        case 'TechniqueCast': {
          const def = getTechnique(ev.techniqueId);
          const aff: Affinity = def?.affinity ?? 'ascua';
          const kind = def?.target.kind;
          const toward = ev.cells[0] ?? ev.target;
          const dir = { x: Math.sign(toward.x - pPos.x), y: Math.sign(toward.y - pPos.y) };
          if (kind === 'self') {
            add(ringFx(now, pPos, affinityColor(aff), 1.1, 0.7));
            add(sparkleFx(now, pPos, '#bfe0ff', 10));
          } else if (kind === 'blink') {
            add(trailFx(now, prev.player.pos, pPos));
            add(puffFx(now, prev.player.pos, '#d8f2e6', 6, 0.35));
            add(puffFx(now + 0.05, pPos, '#d8f2e6', 6, 0.35));
          } else {
            if (dir.x || dir.y) lunge(PLAYER, dir, 0.12, now);
            add(ringFx(now, pPos, affinityColor(aff), 0.8, 0.4));
            for (const cell of ev.cells) {
              const d = manhattan(cell, pPos);
              add(elementFx(now + 0.03 + (kind === 'line' ? d * 0.045 : 0), aff, cell, dir));
            }
          }
          break;
        }
        case 'BarrierRaised':
          for (const cell of ev.cells) add(puffFx(now + 0.05, cell, '#b8ad93', 6, 0.32));
          this.shake = Math.max(this.shake, 0.05);
          break;
        case 'HealApplied':
          this.text(pPos, `+${ev.amount}`, ev.resource === 'hp' ? '#7dff9a' : '#8ec5ff', now, 0, 0.4);
          add(sparkleFx(now, pPos, ev.resource === 'hp' ? '#9dffb0' : '#a9d0ff', 8));
          break;
        case 'XpGained':
          this.text(pPos, `+${ev.amount} XP`, '#ffd166', now, 0.35, 0.3, 1.1);
          break;
        case 'LevelUp':
          this.text(pPos, `¡Nivel ${ev.level}!`, '#ffe08a', now, 0.3, 0.5, 1.6);
          add(ringFx(now + 0.3, pPos, '#ffe08a', 1.6, 0.9));
          add(sparkleFx(now + 0.3, pPos, '#ffe08a', 16));
          break;
        case 'SneakAttack': {
          const at = where(ev.enemyId);
          if (at) this.text(at, '¡Furtivo!', '#ffd24a', now, 0.02, 0.34, 1.0);
          break;
        }
        case 'EnemyAlerted':
          this.alertT0.set(ev.enemyId, now + (enemyPhase ? ENEMY_DELAY : 0.05));
          break;
        case 'EnemyMoved':
          enemyPhase = true;
          break;
        case 'EnemyDefeated': {
          const e = prev.enemies.find((q) => q.id === ev.enemyId);
          if (!e) break;
          const face: 1 | -1 = this.disp.get(ev.enemyId)?.face ?? 1;
          const kind = e.kind;
          add(deathFx(now + 0.08 + delay, e.pos, (ctx) => drawEnemy(ctx, kind, { t: now, walk: 0, phase: 0, face })));
          add(puffFx(now + 0.1 + delay, e.pos, '#8c8aa0', 9, 0.5));
          break;
        }
        case 'ChestOpened': {
          const ch = next.chests.find((c) => c.id === ev.chestId);
          if (ch) add(sparkleFx(now, ch.pos, '#ffe08a', 16));
          break;
        }
        case 'ItemPickedUp': {
          const warm = ev.itemId === 'moneda' || ev.itemId === 'esquirla';
          const color = warm ? '#ffe08a' : isKey(ev.itemId) ? '#ffffff' : '#d8e4ff';
          const label = ev.count > 1 || warm ? `+${ev.count} ${itemName(ev.itemId)}` : `+ ${itemName(ev.itemId)}`;
          this.text(pPos, label, color, now, 0, 0.28, 1.0);
          if (warm) add(sparkleFx(now, pPos, '#ffd36a', 6));
          else if (isKey(ev.itemId)) add(sparkleFx(now, pPos, '#ffffff', 14));
          break;
        }
        case 'ItemStuck': {
          const victim = next.enemies.find((e) => e.id === ev.enemyId);
          if (victim) add(impactFx(now + 0.22, victim.pos, '#d8e4ff'));
          break;
        }
        case 'DoorUnlocked':
          add(sparkleFx(now, ev.pos, '#ffe08a', 18));
          add(ringFx(now, ev.pos, '#ffe08a', 1.4, 0.6));
          this.text(ev.pos, '¡Abierta!', '#ffe9a8', now, 0, 0.32, 1.1);
          break;
        case 'WeaponUpgraded':
          add(sparkleFx(now, pPos, '#9cf0b4', 18));
          add(ringFx(now, pPos, '#9cf0b4', 1.5, 0.6));
          this.text(pPos, `${getWeapon(ev.weaponId)?.name ?? ev.weaponId} +${ev.level}`, '#9cf0b4', now, 0, 0.34, 1.2);
          break;
        case 'TelegraphStarted': {
          const owner = next.enemies.find((e) => e.id === ev.ownerId);
          if (owner) {
            this.text(owner.pos, '¡Prepara un ataque!', '#ff9ab0', now, ENEMY_DELAY, 0.3, 1.3);
            add(ringFx(now + ENEMY_DELAY, owner.pos, '#ff6b8a', 1.0, 0.5));
          }
          enemyPhase = true;
          break;
        }
        case 'TelegraphReleased': {
          const t = now + ENEMY_DELAY;
          for (const cell of ev.cells) {
            add(impactFx(t + manhattan(cell, ev.cells[0]) * 0.012, cell, ev.hit ? '#ff8fb0' : '#c9a6ff', false));
            add(puffFx(t, cell, '#a58cc8', 4, 0.22));
          }
          this.shake = Math.max(this.shake, ev.hit ? 0.16 : 0.09);
          enemyPhase = true;
          break;
        }
        case 'TelegraphCancelled': {
          const owner = prev.enemies.find((e) => e.id === ev.ownerId);
          if (owner) {
            this.text(owner.pos, '¡Interrumpido!', '#9be6ff', now, 0.05, 0.32, 1.2);
            add(puffFx(now, owner.pos, '#9be6ff', 8, 0.4));
          }
          break;
        }
        case 'BossPhase': {
          const boss = next.enemies.find((e) => e.id === ev.enemyId);
          if (boss) {
            add(ringFx(now + ENEMY_DELAY, boss.pos, '#c79cff', 3.2, 0.9));
            add(sparkleFx(now + ENEMY_DELAY, boss.pos, '#e0c4ff', 18));
          }
          this.shake = Math.max(this.shake, 0.22);
          break;
        }
        case 'EnemySkill': {
          const dash = ev.skillId.includes('paso_fantasma');
          if (dash) {
            add(trailFx(now + delay, ev.from, ev.to));
            add(puffFx(now + delay, ev.from, '#c9d0e0', 8, 0.4));
            add(puffFx(now + delay + 0.1, ev.to, '#c9d0e0', 8, 0.4));
          } else {
            const fl = 0.16;
            add(projectileFx(now + delay, ev.from, ev.to, ev.skillId.includes('senbon') ? 'senbon' : 'kunai_arrojadizo', fl));
          }
          enemyPhase = true;
          break;
        }
        case 'MerchantAppeared':
          add(ringFx(now + 0.15, ev.pos, '#ffe08a', 1.8, 0.9));
          add(sparkleFx(now + 0.15, ev.pos, '#ffe08a', 16));
          break;
        case 'ItemBought':
          this.text(pPos, `−${ev.price} monedas`, '#ffd36a', now, 0.05, 0.3, 1.2);
          add(sparkleFx(now, pPos, '#ffe08a', 8));
          break;
        case 'GearIdentified':
        case 'ArcanaIdentified':
          this.text(pPos, '¡Identificado!', '#b8f0ff', now, 0.1, 0.32, 1.4);
          add(sparkleFx(now + 0.05, pPos, '#b8f0ff', 12));
          break;
        case 'AllySummoned':
          add(puffFx(now + delay, ev.pos, '#9ec0ff', 10, 0.45));
          add(ringFx(now + delay, ev.pos, '#9ec0ff', 0.9, 0.5));
          break;
        case 'AllyDefeated':
          add(puffFx(now + delay, where(ev.allyId) ?? pPos, '#9ec0ff', 8, 0.4));
          break;
        case 'EnemySummoned':
          add(puffFx(now + delay, ev.pos, '#9ec0ff', 10, 0.45));
          add(ringFx(now + delay, ev.pos, '#9ec0ff', 0.9, 0.5));
          break;
        case 'BossDefeated': {
          this.theme = themeFor(next.bossesDefeated);
          this.themeFlashT0 = now + 0.1;
          const boss = prev.enemies.find((e) => e.id === ev.enemyId);
          if (boss) {
            add(ringFx(now + 0.1, boss.pos, '#ffe08a', 4.5, 1.2));
            add(sparkleFx(now + 0.1, boss.pos, '#ffe08a', 26));
            add(puffFx(now + 0.1, boss.pos, '#c9b8f0', 16, 0.8));
          }
          this.shake = Math.max(this.shake, 0.25);
          break;
        }
        case 'NoteFound':
          this.text(pPos, 'Pergamino', '#ffe9a8', now, 0.1, 0.3, 1.3);
          add(sparkleFx(now, pPos, '#fff0c0', 10));
          break;
        case 'NpcChoice': {
          const npc = next.npcs.find((n) => n.id === ev.npcId);
          if (npc) {
            add(ringFx(now, npc.pos, '#ffe08a', 1.8, 0.8));
            add(sparkleFx(now, npc.pos, '#ffe9a8', 16));
          }
          add(ringFx(now + 0.1, pPos, '#ffe08a', 1.2, 0.7));
          break;
        }
        case 'PlayerDefeated':
          this.hurt = 1;
          this.shake = 0.2;
          break;
        default:
          break;
      }
    }
  }

  // ---------- Dibujo ----------

  render(ctx: Ctx, now: number, overlay: Overlay | null): void {
    const s = this.state;
    const dt = clamp(now - this.lastNow, 0, 0.1);
    this.lastNow = now;
    const W_ = this.w * this.dpr;
    const H_ = this.h * this.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#030306';
    ctx.fillRect(0, 0, W_, H_);
    if (!s) return;
    const th = this.theme;
    const map = s.map;
    const scale = this.tilePx * this.dpr;

    // Cámara.
    const pp = this.pos(PLAYER, now);
    const tx = pp.x + 0.5;
    const ty = pp.y + 0.5;
    const k = Math.min(1, dt * 9);
    this.cam.x += (tx - this.cam.x) * k;
    this.cam.y += (ty - this.cam.y) * k;
    this.shake = Math.max(0, this.shake - dt * 0.5);
    this.hurt = Math.max(0, this.hurt - dt * 1.6);
    const shx = (Math.random() - 0.5) * this.shake * scale;
    const shy = (Math.random() - 0.5) * this.shake * scale;
    const ox = W_ / 2 - this.cam.x * scale + shx;
    const oy = H_ / 2 - this.cam.y * scale + shy;
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const halfW = W_ / 2 / scale + 1.5;
    const halfH = H_ / 2 / scale + 2;
    const x0 = Math.max(0, Math.floor(this.cam.x - halfW));
    const x1 = Math.min(map.width - 1, Math.ceil(this.cam.x + halfW));
    const y0 = Math.max(0, Math.floor(this.cam.y - halfH));
    const y1 = Math.min(map.height - 1, Math.ceil(this.cam.y + halfH));
    const eps = 0.006;
    const sway = (x: number, y: number): number => Math.sin(now * 1.7 + x * 1.3 + y * 0.7) * 0.025;

    // 1) Terreno.
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * map.width + x;
        if (!s.explored[i]) continue;
        const kind = map.tiles[i];
        let img: HTMLCanvasElement;
        if (kind === 'wall') img = wallTile(th, this.variant[i] % 3, this.wallMask[i]);
        else if (kind === 'exit') img = stairsTile(th);
        else if (kind === 'door') img = doorTile(th, this.doorNS[i] ? 'ns' : 'ew', this.doors.has(i));
        else if (kind === 'locked') img = lockedDoorTile(th, this.doorNS[i] ? 'ns' : 'ew');
        else img = floorTile(th, kind === 'bush' ? 0 : this.variant[i], this.floorMask[i]);
        ctx.drawImage(img, x - eps, y - eps, 1 + eps * 2, 1 + eps * 2);
        if (kind === 'bush') {
          ctx.save();
          ctx.translate(x + 0.5, y + 0.9);
          ctx.transform(1, 0, sway(x, y), 1, 0, 0);
          ctx.drawImage(bushTile(this.variant[i] % 3).back, -0.5, -0.9, 1, 1);
          ctx.restore();
        }
      }
    }

    // Brillo de la escalera.
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * map.width + x;
        if (map.tiles[i] !== 'exit' || !s.explored[i]) continue;
        const pulse = 0.65 + 0.35 * Math.sin(now * 2.4);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = radial(ctx, x + 0.5, y + 0.5, 0.05, 1.5, `rgba(150,100,255,${0.5 * pulse})`, 'rgba(120,70,255,0)');
        ctx.fillRect(x - 1.2, y - 1.2, 3.4, 3.4);
        ctx.restore();
      }
    }

    // 2) Objetos: cofres, barreras, botín del suelo.
    for (const c of s.chests) {
      const i = c.pos.y * map.width + c.pos.x;
      if (!s.explored[i]) continue;
      ctx.drawImage(chestTile(c.opened, !!c.locked), c.pos.x + 0.02, c.pos.y - 0.04, 0.96, 0.96);
      if (!c.opened && this.visible.has(i)) {
        const tw = 0.5 + 0.5 * Math.sin(now * 3 + c.pos.x * 2.1);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(255,224,138,${0.5 * tw})`;
        circle(ctx, c.pos.x + 0.7, c.pos.y + 0.32, 0.05 + 0.04 * tw);
        ctx.fill();
        ctx.restore();
      }
    }
    for (const d of s.drops) {
      const i = d.pos.y * map.width + d.pos.x;
      if (!s.explored[i]) continue;
      const bob = Math.sin(now * 3 + d.pos.x) * 0.03;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(d.pos.x + 0.5, d.pos.y + 0.72, 0.2, 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const warm = d.itemId === 'moneda' || d.itemId === 'esquirla';
      const keyItem = isKey(d.itemId);
      ctx.fillStyle = radial(
        ctx, d.pos.x + 0.5, d.pos.y + 0.55, 0.02, keyItem ? 0.55 : 0.42,
        warm ? 'rgba(255,200,100,0.34)' : keyItem ? 'rgba(255,240,190,0.5)' : 'rgba(200,225,255,0.28)',
        warm ? 'rgba(255,200,100,0)' : keyItem ? 'rgba(255,240,190,0)' : 'rgba(200,225,255,0)',
      );
      ctx.fillRect(d.pos.x - 0.1, d.pos.y, 1.2, 1.1);
      ctx.restore();
      const rot = warm ? 0 : keyItem ? -0.25 + Math.sin(now * 1.6 + d.pos.x) * 0.1 : 0.5 + Math.sin(now * 1.2 + d.pos.y) * 0.1;
      const size = keyItem ? 0.58 : warm ? 0.4 + Math.min(0.12, d.count * 0.008) : 0.46;
      drawIcon(ctx, d.itemId, d.pos.x + 0.5, d.pos.y + 0.54 + bob, size, rot);
    }
    for (const sc of s.scrolls) {
      const i = sc.pos.y * map.width + sc.pos.x;
      if (!s.explored[i]) continue;
      const bob = Math.sin(now * 2.4 + sc.pos.x) * 0.025;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(sc.pos.x + 0.5, sc.pos.y + 0.74, 0.18, 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = radial(ctx, sc.pos.x + 0.5, sc.pos.y + 0.55, 0.02, 0.4, 'rgba(255,226,150,0.32)', 'rgba(255,226,150,0)');
      ctx.fillRect(sc.pos.x, sc.pos.y + 0.1, 1, 0.9);
      ctx.restore();
      drawIcon(ctx, 'pergamino', sc.pos.x + 0.5, sc.pos.y + 0.55 + bob, 0.42, -0.25);
    }
    this.drawTelegraphs(ctx, s, now);
    for (const b of s.barriers) {
      const i = b.pos.y * map.width + b.pos.x;
      const born = this.barrierBorn.get(i) ?? now - 1;
      const rise = easeOut(clamp((now - born) / 0.3, 0, 1));
      const flicker = b.turns <= 1 ? 0.55 + 0.35 * Math.sin(now * 14) : 1;
      ctx.save();
      ctx.globalAlpha = flicker;
      ctx.translate(b.pos.x + 0.5, b.pos.y + 0.96);
      ctx.scale(1, rise);
      ctx.drawImage(barrierTile(th), -0.5, -0.96, 1, 1);
      ctx.restore();
    }

    // 3) Entidades ordenadas por profundidad.
    interface Ent {
      y: number;
      draw: () => void;
    }
    const ents: Ent[] = [];
    const lungeOf = (d: Disp): { x: number; y: number } => {
      const p = clamp((now - d.lt0) / 0.22, 0, 1);
      const a = Math.sin(p * Math.PI) * d.lamp;
      return { x: d.lx * a, y: d.ly * a };
    };
    const flashOf = (d: Disp): number => clamp(1 - (now - d.flashT0) / 0.22, 0, 1) * (now >= d.flashT0 ? 1 : 0);

    const pd = this.disp.get(PLAYER);
    if (pd) {
      const lg = lungeOf(pd);
      const inBush = map.tiles[s.player.pos.y * map.width + s.player.pos.x] === 'bush';
      const weapon = getWeapon(s.player.equipment.weapon)?.kind;
      const px = pp.x + lg.x;
      const py = pp.y + lg.y;
      ents.push({
        y: pp.y,
        draw: () =>
          this.drawActor(ctx, px + 0.5, py + 0.5, flashOf(pd), (c) =>
            drawNinja(c, {
              t: now, walk: pp.moving ? 1 : 0, phase: now * 16, dir: pd.dir, weapon,
              protected: s.player.statuses.some((st) => st.id === 'protegido'), alpha: inBush ? 0.92 : 1,
            }),
          ),
      });
    }
    for (const n of s.npcs) {
      const i = n.pos.y * map.width + n.pos.x;
      if (!s.explored[i]) continue;
      ents.push({
        y: n.pos.y,
        draw: () => {
          this.drawActor(ctx, n.pos.x + 0.5, n.pos.y + 0.5, 0, (c) => drawNpc(c, n.kind, now, n.used));
          if (!n.used && manhattan(n.pos, s.player.pos) <= 2 && this.visible.has(i)) this.speechBubble(ctx, n.pos.x + 0.5, n.pos.y - 0.12, now);
        },
      });
    }
    for (const e of s.enemies) {
      if (!canSeeEntity(s, this.visible, e.pos)) continue;
      const d = this.disp.get(e.id);
      if (!d) continue;
      const ep = this.pos(e.id, now);
      const lg = lungeOf(d);
      const face: 1 | -1 = s.player.pos.x === e.pos.x ? d.face : s.player.pos.x > e.pos.x ? 1 : -1;
      const stunned = e.statuses.some((st) => st.id === 'aturdido');
      const charging = s.telegraphs.some((t) => t.ownerId === e.id);
      const style = SHINOBI_STYLES[e.kind];
      ents.push({
        y: ep.y,
        draw: () =>
          this.drawActor(ctx, ep.x + lg.x + 0.5, ep.y + lg.y + 0.5, flashOf(d), (c) => {
            drawEnemy(c, e.kind, { t: stunned ? now * 0.3 : now, walk: ep.moving ? 1 : 0, phase: now * 14, face, charging, bossPhase: e.phase });
          }),
      });
      // Arrojadizas clavadas: pequeñas, en el cuerpo, hasta 5 a la vista.
      const stuckList = Object.entries(e.stuck ?? {}).flatMap(([id, n]) => Array.from({ length: Math.min(n, 3) }, () => id)).slice(0, 5);
      if (stuckList.length > 0) {
        const bodyX = ep.x + lg.x + 0.5;
        const sc = style?.scale ?? 1;
        const bodyY = ep.y + lg.y + (sc > 1.1 ? 0.18 : 0.38);
        ents.push({
          y: ep.y + 0.01,
          draw: () =>
            stuckList.forEach((id, k) => {
              const ox = (((k * 37) % 5) - 2) * 0.06 * sc;
              const oy = (((k * 53) % 5) - 2) * 0.05 * sc;
              drawIcon(ctx, id, bodyX + ox, bodyY + oy, 0.2 * sc, 0.9 + k * 1.3);
            }),
        });
      }
    }
    for (const a of s.allies) {
      if (!this.visible.has(a.pos.y * map.width + a.pos.x)) continue;
      const d = this.disp.get(a.id);
      if (!d) continue;
      const ap = this.pos(a.id, now);
      const aface: 1 | -1 = d.face;
      ents.push({
        y: ap.y,
        draw: () => {
          this.drawActor(ctx, ap.x + 0.5, ap.y + 0.5, flashOf(d), (c) => drawAlly(c, a.kind, { t: now, walk: ap.moving ? 1 : 0, phase: now * 14, face: aface }));
        },
      });
    }
    ents.sort((a, b) => a.y - b.y);
    for (const e of ents) e.draw();

    // 4) Hojas de arbusto por delante de quien se esconde.
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * map.width + x;
        if (!s.explored[i] || map.tiles[i] !== 'bush') continue;
        ctx.save();
        ctx.translate(x + 0.5, y + 0.9);
        ctx.transform(1, 0, sway(x, y), 1, 0, 0);
        ctx.drawImage(bushTile(this.variant[i] % 3).front, -0.5, -0.9, 1, 1);
        ctx.restore();
      }
    }

    // 5) Luz ambiental y niebla.
    this.ambient(ctx, now, dt, th);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const flick = 0.92 + 0.08 * Math.sin(now * 5.3);
    ctx.fillStyle = radial(ctx, pp.x + 0.5, pp.y + 0.5, 0.3, 5.5, rgba(th.glow, 0.2 * flick), rgba(th.glow, 0));
    ctx.fillRect(pp.x - 6, pp.y - 6, 13, 13);
    ctx.restore();
    this.drawFog(ctx, s, dt, pp);

    // 6) Efectos y resaltes (por encima de la niebla).
    if (overlay) this.drawOverlay(ctx, overlay, now);
    this.fx = this.fx.filter((f) => now - f.start < f.dur);
    for (const f of this.fx) {
      if (now < f.start) continue;
      ctx.save();
      f.draw(ctx, (now - f.start) / f.dur);
      ctx.restore();
    }

    // 7) Indicadores sobre los enemigos visibles (vida, alerta, estados).
    for (const e of s.enemies) {
      if (!canSeeEntity(s, this.visible, e.pos)) continue;
      const ep = this.pos(e.id, now);
      this.drawEnemyHud(ctx, s, e, ep.x, ep.y, now);
    }
    for (const a of s.allies) {
      if (!this.visible.has(a.pos.y * map.width + a.pos.x)) continue;
      const ap = this.pos(a.id, now);
      const w = 0.6;
      ctx.fillStyle = 'rgba(8,10,20,0.7)';
      ctx.fillRect(ap.x + 0.2, ap.y - 0.04, w, 0.09);
      ctx.fillStyle = '#7fb8ff';
      ctx.fillRect(ap.x + 0.2, ap.y - 0.04, w * Math.max(0, a.hp / a.maxHp), 0.09);
    }

    // 8) Texto flotante y capas de pantalla.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.drawTelegraphLabels(ctx, now, scale, ox, oy);
    this.drawTexts(ctx, now, scale, ox, oy);
    this.drawScreenLayers(ctx, s, now, dt, W_, H_);
    this.drawBossBar(ctx, s, W_);
  }

  /** Casillas marcadas por ataques anunciados: trama de aviso con cuenta atrás (más intensa al quedar 1 ronda). */
  private drawTelegraphs(ctx: Ctx, s: GameState, now: number): void {
    this.teleLabels = [];
    for (const tg of s.telegraphs) {
      const urgent = tg.turns <= 1;
      const pulse = 0.5 + 0.5 * Math.sin(now * (urgent ? 12 : 5));
      const a = (urgent ? 0.34 : 0.2) + pulse * (urgent ? 0.22 : 0.12);
      for (const c of tg.cells) {
        const i = c.y * s.map.width + c.x;
        if (!s.explored[i]) continue;
        ctx.save();
        roundRectPath(ctx, c.x + 0.04, c.y + 0.04, 0.92, 0.92, 0.1);
        ctx.fillStyle = `rgba(${urgent ? '255,60,90' : '210,80,200'},${a})`;
        ctx.fill();
        ctx.clip();
        ctx.strokeStyle = `rgba(255,170,190,${0.25 + pulse * 0.2})`;
        ctx.lineWidth = 0.05;
        const off = ((now * 0.25) % 0.3);
        ctx.beginPath();
        for (let k = -1; k < 6; k++) {
          const o = k * 0.3 + off;
          ctx.moveTo(c.x + o, c.y);
          ctx.lineTo(c.x + o - 1, c.y + 1);
        }
        ctx.stroke();
        ctx.restore();
        roundRectPath(ctx, c.x + 0.06, c.y + 0.06, 0.88, 0.88, 0.1);
        ctx.strokeStyle = urgent ? '#ff5d7e' : '#e08cff';
        ctx.lineWidth = 0.04;
        ctx.stroke();
      }
      // La cuenta atrás se dibuja en el centro de la zona (en pantalla, después).
      const ref = tg.cells.reduce((acc, c) => ({ x: acc.x + c.x, y: acc.y + c.y }), { x: 0, y: 0 });
      const mid = tg.cells.reduce((best, c) => {
        const d = Math.abs(c.x - ref.x / tg.cells.length) + Math.abs(c.y - ref.y / tg.cells.length);
        return d < best.d ? { d, c } : best;
      }, { d: Infinity, c: tg.cells[0] }).c;
      if (mid && s.explored[mid.y * s.map.width + mid.x]) this.teleLabels.push({ x: mid.x + 0.5, y: mid.y + 0.5, text: String(tg.turns), urgent });
    }
  }

  private speechBubble(ctx: Ctx, x: number, y: number, now: number): void {
    const bob = Math.sin(now * 3) * 0.02;
    ctx.save();
    ctx.translate(x, y - 0.3 + bob);
    roundRectPath(ctx, -0.17, -0.12, 0.34, 0.22, 0.08);
    ctx.fillStyle = '#fffaf0';
    ctx.fill();
    ctx.strokeStyle = '#1a1020';
    ctx.lineWidth = 0.03;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-0.04, 0.1);
    ctx.lineTo(0, 0.17);
    ctx.lineTo(0.04, 0.1);
    ctx.closePath();
    ctx.fillStyle = '#fffaf0';
    ctx.fill();
    ctx.fillStyle = '#1a1020';
    for (const dx of [-0.08, 0, 0.08]) {
      circle(ctx, dx, -0.01, 0.022);
      ctx.fill();
    }
    ctx.restore();
  }

  /** Barra de vida del jefe en lo alto de la pantalla mientras está a la vista. */
  private drawBossBar(ctx: Ctx, s: GameState, W_: number): void {
    const boss = s.enemies.find((e) => getEnemy(e.kind)?.behavior === 'boss');
    if (!boss || !canSeeEntity(s, this.visible, boss.pos)) return;
    const u = this.dpr;
    const w = Math.min(W_ * 0.7, 520 * u);
    const x = (W_ - w) / 2;
    const y = 34 * u;
    const h = 14 * u;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = `700 ${Math.round(14 * u)}px system-ui, "Segoe UI", sans-serif`;
    ctx.lineWidth = 4 * u;
    ctx.strokeStyle = 'rgba(10,6,16,0.9)';
    const name = getEnemy(boss.kind)?.name ?? boss.kind;
    ctx.strokeText(name, W_ / 2, y - 3 * u);
    ctx.fillStyle = '#f4e6c8';
    ctx.fillText(name, W_ / 2, y - 3 * u);
    roundRectPath(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = 'rgba(10,6,16,0.82)';
    ctx.fill();
    const f = clamp(boss.hp / boss.maxHp, 0, 1);
    roundRectPath(ctx, x + 2 * u, y + 2 * u, Math.max(h, (w - 4 * u) * f), h - 4 * u, (h - 4 * u) / 2);
    ctx.fillStyle = boss.phase >= 3 ? '#e2514b' : boss.phase === 2 ? '#e0903a' : '#b878f0';
    ctx.fill();
    ctx.strokeStyle = 'rgba(244,230,200,0.7)';
    ctx.lineWidth = 2 * u;
    for (const mark of [1 / 3, 2 / 3]) {
      ctx.beginPath();
      ctx.moveTo(x + w * mark, y + 1 * u);
      ctx.lineTo(x + w * mark, y + h - 1 * u);
      ctx.stroke();
    }
    roundRectPath(ctx, x, y, w, h, h / 2);
    ctx.strokeStyle = 'rgba(244,230,200,0.55)';
    ctx.lineWidth = 2 * u;
    ctx.stroke();
    ctx.restore();
  }

  private drawActor(ctx: Ctx, cx: number, cy: number, flash: number, draw: (c: Ctx) => void): void {
    if (flash <= 0.02) {
      ctx.save();
      ctx.translate(cx, cy);
      draw(ctx);
      ctx.restore();
      return;
    }
    const size = Math.ceil(this.tilePx * this.dpr * 2);
    if (!this.scratch || this.scratch.width !== size) {
      const [c, sc] = makeCanvas(size, size);
      this.scratch = c;
      this.scratchCtx = sc;
    }
    const sc = this.scratchCtx as Ctx;
    sc.setTransform(1, 0, 0, 1, 0, 0);
    sc.clearRect(0, 0, size, size);
    const u = size / 2;
    sc.setTransform(u / 1, 0, 0, u / 1, u, u);
    sc.globalCompositeOperation = 'source-over';
    draw(sc);
    sc.globalCompositeOperation = 'source-atop';
    sc.fillStyle = `rgba(255,255,255,${0.85 * flash})`;
    sc.fillRect(-1, -1, 2, 2);
    sc.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.scratch, cx - 1, cy - 1, 2, 2);
  }

  private drawEnemyHud(ctx: Ctx, s: GameState, e: GameState['enemies'][number], x: number, y: number, now: number): void {
    const cx = x + 0.5;
    const top = y + 0.02;
    if (e.hp < e.maxHp) {
      const w = 0.56;
      roundRectPath(ctx, cx - w / 2, top, w, 0.09, 0.045);
      ctx.fillStyle = 'rgba(8,6,14,0.8)';
      ctx.fill();
      const f = clamp(e.hp / e.maxHp, 0, 1);
      roundRectPath(ctx, cx - w / 2 + 0.012, top + 0.012, Math.max(0.04, (w - 0.024) * f), 0.066, 0.033);
      ctx.fillStyle = f > 0.5 ? '#5bd37a' : f > 0.25 ? '#f0c040' : '#e2514b';
      ctx.fill();
    }
    // Estados.
    let ix = cx + 0.3;
    for (const st of e.statuses) {
      drawIcon(ctx, st.id, ix, top + 0.04, 0.22);
      ix += 0.2;
    }
    // Alerta.
    if (e.alert > 0) {
      const t0 = this.alertT0.get(e.id) ?? now - 1;
      const k = clamp((now - t0) / 0.28, 0, 1);
      if (now >= t0) {
        const seen = enemySees(s, e);
        const pop = k < 1 ? 1 + Math.sin(k * Math.PI) * 0.45 : 1;
        const by = top - 0.2 - (seen ? 0 : Math.sin(now * 5) * 0.02);
        ctx.save();
        ctx.translate(cx, by);
        ctx.scale(pop * k, pop * k);
        circle(ctx, 0, 0, 0.15);
        ctx.fillStyle = seen ? '#e0364a' : '#e8b53a';
        ctx.fill();
        ctx.strokeStyle = '#1a0f16';
        ctx.lineWidth = 0.035;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.fillRect(-0.02, -0.09, 0.04, seen ? 0.11 : 0.07);
        circle(ctx, 0, seen ? 0.07 : 0.06, 0.025);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  private drawFog(ctx: Ctx, s: GameState, dt: number, pp: { x: number; y: number }): void {
    const { width, height } = s.map;
    if (!this.fogCanvas || !this.fogCtx || !this.fogImg) return;
    const r = visionRadiusOf(s);
    const k = Math.min(1, dt * 9);
    const data = this.fogImg.data;
    const [fr, fg, fb] = hexRgb(this.theme.fog);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        let target: number;
        if (!s.explored[i]) target = 1;
        else if (this.visible.has(i)) {
          const d = Math.hypot(x - pp.x, y - pp.y);
          target = Math.pow(clamp((d - 2.4) / (r + 0.6 - 2.4), 0, 1), 1.25) * 0.55;
        } else target = 0.64;
        const cur = this.fog[i];
        this.fog[i] = cur + (target - cur) * k;
        const o = i * 4;
        // Lo no explorado se mezcla con negro puro; lo explorado, con el tono del sector.
        const dark = s.explored[i] ? 1 : 0;
        data[o] = fr * dark;
        data[o + 1] = fg * dark;
        data[o + 2] = fb * dark;
        data[o + 3] = Math.round(this.fog[i] * 255);
      }
    }
    this.fogCtx.putImageData(this.fogImg, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.fogCanvas, 0, 0, width, height);
  }

  private drawOverlay(ctx: Ctx, o: Overlay, now: number): void {
    const pulse = 0.5 + 0.5 * Math.sin(now * 6);
    const col = o.valid ? o.color : '#ff4d4d';
    for (const c of o.cells) {
      roundRectPath(ctx, c.x + 0.07, c.y + 0.07, 0.86, 0.86, 0.14);
      ctx.fillStyle = rgba(col, 0.2 + pulse * 0.16);
      ctx.fill();
      ctx.strokeStyle = rgba(col, 0.9);
      ctx.lineWidth = 0.04;
      ctx.stroke();
    }
    if (o.cursor) {
      const c = o.cursor;
      const m = 0.04 + pulse * 0.04;
      ctx.strokeStyle = o.valid ? '#ffffff' : '#ff5a5a';
      ctx.lineWidth = 0.06;
      ctx.lineCap = 'round';
      const L = 0.26;
      const x0 = c.x + m;
      const y0 = c.y + m;
      const x1 = c.x + 1 - m;
      const y1 = c.y + 1 - m;
      ctx.beginPath();
      for (const [px, py, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]] as const) {
        ctx.moveTo(px + sx * L, py);
        ctx.lineTo(px, py);
        ctx.lineTo(px, py + sy * L);
      }
      ctx.stroke();
    }
  }

  private drawTelegraphLabels(ctx: Ctx, now: number, scale: number, ox: number, oy: number): void {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (const l of this.teleLabels) {
      const pulse = l.urgent ? 1 + 0.12 * Math.sin(now * 12) : 1;
      ctx.font = `800 ${Math.round(0.46 * scale * pulse)}px system-ui, "Segoe UI", sans-serif`;
      ctx.lineWidth = Math.max(3, 0.1 * scale);
      ctx.strokeStyle = 'rgba(14,8,20,0.9)';
      const px = l.x * scale + ox;
      const py = l.y * scale + oy;
      ctx.strokeText(l.text, px, py);
      ctx.fillStyle = l.urgent ? '#ffd0da' : '#f0d4ff';
      ctx.fillText(l.text, px, py);
    }
  }

  private drawTexts(ctx: Ctx, now: number, scale: number, ox: number, oy: number): void {
    this.texts = this.texts.filter((t) => now - t.start < t.dur);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (const t of this.texts) {
      if (now < t.start) continue;
      const p = (now - t.start) / t.dur;
      const rise = easeOut(p) * 0.7;
      const pop = p < 0.12 ? 0.6 + (p / 0.12) * 0.55 : p < 0.2 ? 1.15 - ((p - 0.12) / 0.08) * 0.15 : 1;
      const px = t.x * scale + ox;
      const py = (t.y - rise) * scale + oy;
      ctx.font = `800 ${Math.round(t.size * scale * pop)}px system-ui, "Segoe UI", sans-serif`;
      ctx.globalAlpha = 1 - clamp((p - 0.65) / 0.35, 0, 1);
      ctx.lineWidth = Math.max(3, t.size * scale * 0.2);
      ctx.strokeStyle = 'rgba(14,8,20,0.9)';
      ctx.strokeText(t.text, px, py);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, px, py);
    }
    ctx.globalAlpha = 1;
  }

  private drawScreenLayers(ctx: Ctx, s: GameState, now: number, dt: number, W_: number, H_: number): void {
    // Viñeta.
    const inBush = s.map.tiles[s.player.pos.y * s.map.width + s.player.pos.x] === 'bush';
    this.hide += ((inBush ? 1 : 0) - this.hide) * Math.min(1, dt * 6);
    const g = ctx.createRadialGradient(W_ / 2, H_ / 2, Math.min(W_, H_) * 0.35, W_ / 2, H_ / 2, Math.max(W_, H_) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(${Math.round(2 + 0 * this.hide)},${Math.round(4 + 18 * this.hide)},${Math.round(8)},${0.55 + 0.2 * this.hide})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W_, H_);
    if (this.hide > 0.02) {
      ctx.fillStyle = `rgba(40,110,50,${0.1 * this.hide})`;
      ctx.fillRect(0, 0, W_, H_);
    }
    if (this.hurt > 0.01) {
      const h = ctx.createRadialGradient(W_ / 2, H_ / 2, Math.min(W_, H_) * 0.25, W_ / 2, H_ / 2, Math.max(W_, H_) * 0.7);
      h.addColorStop(0, 'rgba(200,20,30,0)');
      h.addColorStop(1, `rgba(200,20,30,${0.55 * this.hurt})`);
      ctx.fillStyle = h;
      ctx.fillRect(0, 0, W_, H_);
    }
    if (s.status === 'lost') {
      ctx.fillStyle = 'rgba(30,0,6,0.5)';
      ctx.fillRect(0, 0, W_, H_);
    }
    const flash = 1 - clamp((now - this.themeFlashT0) / 1.6, 0, 1);
    if (flash > 0.01 && now >= this.themeFlashT0) {
      ctx.fillStyle = `rgba(255,236,190,${0.75 * flash})`;
      ctx.fillRect(0, 0, W_, H_);
    }
    const fade = 1 - clamp((now - this.fadeT0) / 0.7, 0, 1);
    if (fade > 0.01) {
      ctx.fillStyle = `rgba(0,0,0,${fade})`;
      ctx.fillRect(0, 0, W_, H_);
    }
  }

  private ambient(ctx: Ctx, now: number, dt: number, th: Theme): void {
    const halfW = this.w / 2 / this.tilePx + 1;
    const halfH = this.h / 2 / this.tilePx + 1;
    if (!this.seedMotes) {
      this.motes = Array.from({ length: 46 }, (_, i) => ({
        x: this.cam.x + (hash2(i, 1, 5) - 0.5) * halfW * 2,
        y: this.cam.y + (hash2(i, 2, 5) - 0.5) * halfH * 2,
        vx: (hash2(i, 3, 5) - 0.5) * 0.25,
        vy: th.ambient === 'sal' ? 0.12 + hash2(i, 4, 5) * 0.1 : th.ambient === 'brasas' ? -(0.25 + hash2(i, 4, 5) * 0.25) : (hash2(i, 4, 5) - 0.5) * 0.12,
        ph: hash2(i, 5, 5) * 6.28,
        s: 0.02 + hash2(i, 6, 5) * 0.035,
      }));
      this.seedMotes = true;
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const m of this.motes) {
      m.x += (m.vx + Math.sin(now * 0.8 + m.ph) * 0.08) * dt;
      m.y += m.vy * dt;
      // Reaparecen al otro lado de la pantalla.
      if (m.x < this.cam.x - halfW) m.x += halfW * 2;
      if (m.x > this.cam.x + halfW) m.x -= halfW * 2;
      if (m.y < this.cam.y - halfH) m.y += halfH * 2;
      if (m.y > this.cam.y + halfH) m.y -= halfH * 2;
      const tw = th.ambient === 'luciernagas' ? 0.35 + 0.65 * Math.max(0, Math.sin(now * 1.6 + m.ph * 3)) : 0.55;
      ctx.fillStyle = radial(ctx, m.x, m.y, 0, m.s * 2.2, rgba(th.ambientColor, 0.6 * tw), rgba(th.ambientColor, 0));
      circle(ctx, m.x, m.y, m.s * 2.2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function hexRgb(hex: string): [number, number, number] {
  const p = parseInt(hex.slice(1), 16);
  return [p >> 16, (p >> 8) & 255, p & 255];
}
