import Phaser from 'phaser';
import { getTechnique, needsAim } from '../content/techniques';
import { THROWABLES, getWeapon } from '../content/weapons';
import { applyCommand, previewAttack, previewTechnique, previewThrow } from '../core/engine';
import { DIRS, equals, inBounds, manhattan, terrainAt } from '../core/grid';
import { createGame } from '../core/newGame';
import { canSeeEntity, visibleCells } from '../core/sight';
import type { Command, GameEvent, GameState, Vec } from '../core/types';
import { Hud, ITEM_SLOTS, TECHNIQUE_KEYS, type AimInfo, type UiAction } from '../ui/hud';
import { Menu } from '../ui/menu';
import { type Overlay, WorldRenderer, affinityColor } from './art/renderer';

const KEY_DIRS: Record<string, Vec> = {
  arrowup: DIRS[0],
  w: DIRS[0],
  arrowright: DIRS[1],
  d: DIRS[1],
  arrowdown: DIRS[2],
  s: DIRS[2],
  arrowleft: DIRS[3],
  a: DIRS[3],
};

const TECHNIQUE_SLOT_KEYS = TECHNIQUE_KEYS.map((k) => k.toLowerCase());
const ITEM_KEYS: Record<string, string> = Object.fromEntries(ITEM_SLOTS.map((s) => [s.key, s.itemId]));

/** Modo de apuntado: una técnica, un lanzamiento o un ataque de alcance con látigo/lanza. */
type Aim =
  | { kind: 'technique'; techniqueId: string; cursor: Vec }
  | { kind: 'throw'; itemId: string; cursor: Vec }
  | { kind: 'reach'; cursor: Vec };

const now = (): number => performance.now() / 1000;

/**
 * Presentación: traduce teclas en comandos y delega el dibujo en `WorldRenderer` (lienzo 2D que se
 * muestra como textura de Phaser). No decide resultados: toda la lógica vive en src/core.
 */
export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private readonly world = new WorldRenderer();
  private readonly hud = new Hud();
  private readonly menu = new Menu({
    cast: (slot) => this.castSlot(slot),
    useItem: (itemId) => void this.dispatch({ type: 'UseItem', itemId }),
    throwItem: (itemId) => this.startThrow(itemId),
    equipWeapon: (weaponId) => void this.dispatch({ type: 'EquipWeapon', weaponId }),
  });
  private aim: Aim | null = null;
  private facing: Vec = DIRS[1];
  private throwSel = 'shuriken';
  private tex: Phaser.Textures.CanvasTexture | null = null;
  private img: Phaser.GameObjects.Image | null = null;
  private texCount = 0;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor(private readonly initialSeed: number) {
    super('GameScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x05050a);
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.onKey(e));
    this.input.on('wheel', (_pointer: unknown, _objects: unknown, _dx: number, dy: number) => {
      this.world.zoomBy(dy > 0 ? 0.9 : 1.1);
    });
    this.scale.on('resize', () => this.rebuildTexture());
    this.hud.onAction = (a) => this.perform(a);
    this.rebuildTexture();
    this.startRun(this.initialSeed);
  }

  /** Lienzo del tamaño de la pantalla (con la densidad de píxeles del dispositivo) mostrado como imagen. */
  private rebuildTexture(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(64, Math.floor(this.scale.width));
    const h = Math.max(64, Math.floor(this.scale.height));
    this.img?.destroy();
    if (this.tex) this.textures.remove(this.tex.key);
    const key = `mundo-${this.texCount++}`;
    const tex = this.textures.createCanvas(key, Math.floor(w * dpr), Math.floor(h * dpr));
    if (!tex) return;
    this.tex = tex;
    this.ctx = tex.getContext();
    this.img = this.add.image(0, 0, key).setOrigin(0, 0).setScale(1 / dpr);
    this.world.resize(w, h, dpr);
  }

  update(): void {
    if (!this.ctx || !this.tex || !this.state) return;
    this.world.render(this.ctx, now(), this.overlay());
    this.tex.refresh();
  }

  private startRun(seed: number): void {
    this.state = createGame({ seed });
    this.aim = null;
    this.hud.notice('');
    this.world.reset(this.state, now());
    this.menu.close();
    this.refreshHud();
  }

  // ---------- Entrada ----------

  private onKey(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'tab'].includes(key)) e.preventDefault();
    this.handleKey(key);
  }

  /** Una tecla (física o de la cruceta táctil) ya en minúsculas. */
  private handleKey(key: string): void {
    if (this.menu.onKey(key)) return;

    if (key === 'r') {
      this.startRun((Date.now() >>> 0) || 1);
      return;
    }
    if (key === '+' || key === '=') return this.world.zoomBy(1.15);
    if (key === '-' || key === '_') return this.world.zoomBy(1 / 1.15);
    if (this.state.status !== 'playing') return;

    if (this.aim) {
      this.onAimKey(key);
      return;
    }
    if (key === 'tab' || key === 'i') {
      this.menu.open(this.state);
      return;
    }

    const dir = KEY_DIRS[key];
    const slot = TECHNIQUE_SLOT_KEYS.indexOf(key);
    if (dir) {
      this.facing = dir;
      const to = { x: this.state.player.pos.x + dir.x, y: this.state.player.pos.y + dir.y };
      const enemy = this.state.enemies.find((en) => equals(en.pos, to));
      this.dispatch(enemy ? { type: 'BasicAttack', target: to } : { type: 'Move', dx: dir.x, dy: dir.y });
    } else if (key === ' ') {
      this.dispatch({ type: 'Wait' });
    } else if (key === 'e') {
      this.interact();
    } else if (key === 'f') {
      this.startReach();
    } else if (key === 'g') {
      this.startThrow();
    } else if (key === 'q') {
      this.cycleWeapon();
    } else if (slot >= 0) {
      this.castSlot(slot);
    } else if (ITEM_KEYS[key]) {
      this.dispatch({ type: 'UseItem', itemId: ITEM_KEYS[key] });
    }
  }

  /** Órdenes dadas con el ratón o el dedo desde el panel: equivalen a su tecla. */
  private perform(a: UiAction): void {
    if (a.type === 'key') return this.handleKey(a.key);
    if (this.state.status !== 'playing' || this.menu.isOpen) return;
    if (this.aim) {
      this.aim = null;
      this.refreshHud();
    }
    switch (a.type) {
      case 'technique':
        return this.castSlot(a.slot);
      case 'item':
        void this.dispatch({ type: 'UseItem', itemId: a.itemId });
        return;
      case 'throw':
        return this.startThrow();
      case 'reach':
        return this.startReach();
      case 'weapon':
        return this.cycleWeapon();
      case 'wait':
        void this.dispatch({ type: 'Wait' });
        return;
      case 'interact':
        return this.interact();
      case 'menu':
        this.menu.open(this.state);
    }
  }

  /** Técnica de la ranura: las de un toque se lanzan al instante; las demás abren el modo de apuntado. */
  private castSlot(slot: number): void {
    const id = this.state.player.techniques[slot];
    const def = id ? getTechnique(id) : undefined;
    if (!id || !def) return;
    const { player } = this.state;
    if (!needsAim(def)) {
      this.dispatch({ type: 'UseTechnique', techniqueId: id, target: player.pos });
      return;
    }
    let cursor: Vec = player.pos;
    if (def.target.kind === 'line') cursor = this.step(player.pos, this.facing);
    else if (def.target.kind === 'area' || def.target.kind === 'barrier') cursor = this.nearestVisibleEnemy() ?? cursor;
    this.aim = { kind: 'technique', techniqueId: id, cursor };
    this.hud.notice('');
    this.refreshHud();
  }

  /** Lanzar: arrojadiza elegida (la primera que tengas si no hay elegida). */
  startThrow(itemId?: string): void {
    const inv = this.state.player.inventory;
    const have = Object.keys(THROWABLES).filter((id) => (inv[id] ?? 0) > 0);
    if (have.length === 0) {
      this.hud.notice('No llevas armas arrojadizas.');
      return;
    }
    const pick = itemId && have.includes(itemId) ? itemId : have.includes(this.throwSel) ? this.throwSel : have[0];
    this.throwSel = pick;
    const { player } = this.state;
    this.aim = { kind: 'throw', itemId: pick, cursor: this.nearestVisibleEnemy() ?? this.step(player.pos, this.facing) };
    this.hud.notice('');
    this.refreshHud();
  }

  private startReach(): void {
    const w = getWeapon(this.state.player.equipment.weapon);
    if (!w || w.reach < 2) {
      this.hud.notice('Tu arma solo golpea a un enemigo adyacente: camina hacia él.');
      return;
    }
    this.aim = { kind: 'reach', cursor: this.step(this.state.player.pos, this.facing) };
    this.hud.notice('');
    this.refreshHud();
  }

  /** Equipa la siguiente arma de la mochila (gasta un turno). */
  private cycleWeapon(): void {
    const { weapons, equipment } = this.state.player;
    if (weapons.length < 2) {
      this.hud.notice('No tienes otra arma.');
      return;
    }
    const next = weapons[(weapons.indexOf(equipment.weapon ?? '') + 1) % weapons.length];
    this.dispatch({ type: 'EquipWeapon', weaponId: next });
  }

  private step(from: Vec, dir: Vec): Vec {
    return { x: from.x + dir.x, y: from.y + dir.y };
  }

  private nearestVisibleEnemy(): Vec | null {
    const visible = visibleCells(this.state);
    const p = this.state.player.pos;
    const near = this.state.enemies
      .filter((e) => canSeeEntity(this.state, visible, e.pos))
      .sort((a, b) => manhattan(a.pos, p) - manhattan(b.pos, p))[0];
    return near ? near.pos : null;
  }

  private onAimKey(key: string): void {
    const a = this.aim as Aim;
    const dir = KEY_DIRS[key];
    const pos = this.state.player.pos;
    const def = a.kind === 'technique' ? getTechnique(a.techniqueId) : undefined;
    const lineLike = a.kind === 'reach' || def?.target.kind === 'line';
    if (dir) {
      if (lineLike) {
        // En las de línea las flechas eligen la dirección desde el jugador.
        this.facing = dir;
        a.cursor = this.step(pos, dir);
      } else {
        const next = this.step(a.cursor, dir);
        if (inBounds(this.state.map, next)) a.cursor = next;
      }
      this.refreshHud();
    } else if (key === 'enter' || key === ' ') {
      if (this.dispatch(this.aimCommand(a))) this.aim = null;
      this.refreshHud();
    } else if (a.kind === 'throw' && key === 'tab') {
      this.cycleThrowable(a);
    } else if (key === 'escape' || (a.kind === 'technique' && TECHNIQUE_SLOT_KEYS.includes(key)) || (a.kind === 'throw' && key === 'g') || (a.kind === 'reach' && key === 'f')) {
      this.aim = null;
      this.hud.notice('');
      this.refreshHud();
    }
  }

  private cycleThrowable(a: Extract<Aim, { kind: 'throw' }>): void {
    const inv = this.state.player.inventory;
    const have = Object.keys(THROWABLES).filter((id) => (inv[id] ?? 0) > 0);
    if (have.length < 2) return;
    a.itemId = have[(have.indexOf(a.itemId) + 1) % have.length];
    this.throwSel = a.itemId;
    this.refreshHud();
  }

  private aimCommand(a: Aim): Command {
    if (a.kind === 'technique') return { type: 'UseTechnique', techniqueId: a.techniqueId, target: a.cursor };
    if (a.kind === 'throw') return { type: 'Throw', itemId: a.itemId, target: a.cursor };
    return { type: 'BasicAttack', target: a.cursor };
  }

  /** Inspeccionar/Interactuar: busca un cofre sin abrir o la escalera en la casilla propia o adyacentes. */
  private interact(): void {
    const { player, map, chests } = this.state;
    const candidates = [player.pos, ...DIRS.map((d) => ({ x: player.pos.x + d.x, y: player.pos.y + d.y }))];
    const target = candidates.find((c) => chests.some((ch) => equals(ch.pos, c) && !ch.opened) || terrainAt(map, c) === 'exit');
    if (!target) {
      this.hud.notice('No hay nada con lo que interactuar aquí.');
      return;
    }
    this.dispatch({ type: 'Interact', target });
  }

  /** Aplica una orden (también la usa el menú). Devuelve si fue válida. */
  dispatch(cmd: Command): boolean {
    const result = applyCommand(this.state, cmd);
    if (!result.ok) {
      this.hud.notice(result.message ?? 'Acción no válida.');
      return false;
    }
    this.state = result.state;
    this.hud.notice('');
    this.world.setState(this.state, result.events as GameEvent[], now());
    this.refreshHud();
    return true;
  }

  // ---------- Presentación ----------

  private overlay(): Overlay | null {
    const a = this.aim;
    if (!a) return null;
    if (a.kind === 'technique') {
      const pv = previewTechnique(this.state, a.techniqueId, a.cursor);
      return { cells: pv.cells, cursor: a.cursor, valid: pv.valid, color: affinityColor(getTechnique(a.techniqueId)?.affinity) };
    }
    if (a.kind === 'throw') {
      const pv = previewThrow(this.state, a.itemId, a.cursor);
      return { cells: pv.cells, cursor: a.cursor, valid: pv.valid, color: '#d8e4ff' };
    }
    const pv = previewAttack(this.state, a.cursor);
    return { cells: pv.cells, cursor: a.cursor, valid: pv.valid, color: '#ffffff' };
  }

  private aimInfo(): AimInfo | null {
    const a = this.aim;
    if (!a) return null;
    if (a.kind === 'technique') {
      const pv = previewTechnique(this.state, a.techniqueId, a.cursor);
      return { title: getTechnique(a.techniqueId)?.name ?? a.techniqueId, detail: `Coste: ${pv.kiroCost} kiro · Casillas: ${pv.cells.length}`, valid: pv.valid, message: pv.message };
    }
    if (a.kind === 'throw') {
      const pv = previewThrow(this.state, a.itemId, a.cursor);
      return { title: `Lanzar ${THROWABLES[a.itemId]?.name ?? a.itemId}`, detail: `Tab: cambiar de arrojadiza · Quedan ${this.state.player.inventory[a.itemId] ?? 0}`, valid: pv.valid, message: pv.message };
    }
    const pv = previewAttack(this.state, a.cursor);
    const w = getWeapon(this.state.player.equipment.weapon);
    return { title: `Atacar con ${w?.name ?? 'arma'}`, detail: 'Flechas: dirección', valid: pv.valid, message: pv.message };
  }

  private refreshHud(): void {
    this.hud.update(this.state, this.aimInfo());
    this.menu.refresh(this.state);
  }
}
