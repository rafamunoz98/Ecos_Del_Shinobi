import Phaser from 'phaser';
import { getTechnique, needsAim } from '../content/techniques';
import { applyCommand, previewTechnique, visibleCells } from '../core/engine';
import { DIRS, equals, idx, inBounds, manhattan, terrainAt } from '../core/grid';
import { createGame } from '../core/newGame';
import type { Command, GameState, Vec } from '../core/types';
import { Hud, ITEM_SLOTS, TECHNIQUE_KEYS } from '../ui/hud';

/**
 * Tamaño de casilla en píxeles del mundo. Es solo de presentación: los mapas son grandes (64×44)
 * y la cámara los recorre con zoom, así que cambiarlo no afecta a las reglas.
 */
export const TILE = 32;
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 3;

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

const ENEMY_COLORS: Record<string, number> = {
  acechador_hollin: 0xb23a48,
  cuervo_de_sal: 0x6b6bd6,
  larva_de_piedra: 0x9a8a5a,
  tirador_de_junco: 0x4aa06a,
};

interface TargetingMode {
  techniqueId: string;
  cursor: Vec;
}

/**
 * Presentación: dibuja el estado y traduce teclas en comandos. No decide resultados de combate:
 * toda la lógica vive en src/core.
 */
export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private gfx!: Phaser.GameObjects.Graphics;
  private readonly hud = new Hud();
  private targeting: TargetingMode | null = null;
  private facing: Vec = DIRS[1];

  constructor(private readonly initialSeed: number) {
    super('GameScene');
  }

  create(): void {
    this.gfx = this.add.graphics();
    this.cameras.main.setBackgroundColor(0x0b0b12);
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.onKey(e));
    this.input.on('wheel', (_pointer: unknown, _objects: unknown, _dx: number, dy: number) => {
      this.zoom(dy > 0 ? 0.9 : 1.1);
    });
    this.startRun(this.initialSeed);
  }

  private zoom(factor: number): void {
    const cam = this.cameras.main;
    cam.setZoom(Phaser.Math.Clamp(cam.zoom * factor, ZOOM_MIN, ZOOM_MAX));
  }

  private startRun(seed: number): void {
    this.state = createGame({ seed });
    this.targeting = null;
    this.hud.notice('');
    this.refresh();
  }

  private onKey(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) e.preventDefault();

    if (key === 'r') {
      this.startRun((Date.now() >>> 0) || 1);
      return;
    }
    if (key === '+' || key === '=') return this.zoom(1.15);
    if (key === '-' || key === '_') return this.zoom(1 / 1.15);
    if (this.state.status !== 'playing') return;

    if (this.targeting) {
      this.onTargetingKey(key);
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
    } else if (slot >= 0) {
      this.castSlot(slot);
    } else if (ITEM_KEYS[key]) {
      this.dispatch({ type: 'UseItem', itemId: ITEM_KEYS[key] });
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
    if (def.target.kind === 'line') {
      cursor = { x: player.pos.x + this.facing.x, y: player.pos.y + this.facing.y };
    } else if (def.target.kind === 'area' || def.target.kind === 'barrier') {
      // Empieza sobre el enemigo visible más cercano, si lo hay.
      const visible = visibleCells(this.state);
      const near = this.state.enemies
        .filter((e) => visible.has(idx(this.state.map, e.pos)))
        .sort((a, b) => manhattan(a.pos, player.pos) - manhattan(b.pos, player.pos))[0];
      if (near) cursor = near.pos;
    }
    this.targeting = { techniqueId: id, cursor };
    this.hud.notice('');
    this.refresh();
  }

  private onTargetingKey(key: string): void {
    const t = this.targeting as TargetingMode;
    const dir = KEY_DIRS[key];
    const def = getTechnique(t.techniqueId);
    if (dir) {
      const pos = this.state.player.pos;
      if (def?.target.kind === 'line') {
        // En las técnicas de línea las flechas eligen la dirección desde el jugador.
        this.facing = dir;
        t.cursor = { x: pos.x + dir.x, y: pos.y + dir.y };
      } else {
        const next = { x: t.cursor.x + dir.x, y: t.cursor.y + dir.y };
        if (inBounds(this.state.map, next)) t.cursor = next;
      }
      this.refresh();
    } else if (key === 'enter' || key === ' ') {
      if (this.dispatch({ type: 'UseTechnique', techniqueId: t.techniqueId, target: t.cursor })) this.targeting = null;
      this.refresh();
    } else if (key === 'escape' || TECHNIQUE_SLOT_KEYS.includes(key)) {
      this.targeting = null;
      this.hud.notice('');
      this.refresh();
    }
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

  private dispatch(cmd: Command): boolean {
    const result = applyCommand(this.state, cmd);
    if (!result.ok) {
      this.hud.notice(result.message ?? 'Acción no válida.');
      return false;
    }
    this.state = result.state;
    this.hud.notice('');
    this.refresh();
    return true;
  }

  private refresh(): void {
    this.render();
    const targeting = this.targeting
      ? {
          techniqueId: this.targeting.techniqueId,
          preview: previewTechnique(this.state, this.targeting.techniqueId, this.targeting.cursor),
        }
      : null;
    this.hud.update(this.state, targeting);
  }

  private render(): void {
    const g = this.gfx;
    const s = this.state;
    const { map, player } = s;
    const visible = visibleCells(s);
    g.clear();

    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const i = idx(map, { x, y });
        if (!s.explored[i]) continue; // solo se ve lo ya visitado
        const kind = map.tiles[i];
        g.fillStyle(kind === 'wall' ? 0x1b1b2a : kind === 'exit' ? 0x6a4cff : 0x34344a, 1);
        g.fillRect(x * TILE, y * TILE, TILE, TILE);
        if (kind === 'floor') {
          g.lineStyle(1, 0x000000, 0.18);
          g.strokeRect(x * TILE, y * TILE, TILE, TILE);
        }
        if (!visible.has(i)) {
          g.fillStyle(0x000000, 0.55); // recordada pero fuera de visión
          g.fillRect(x * TILE, y * TILE, TILE, TILE);
        }
      }
    }

    for (const c of s.chests) {
      if (!s.explored[idx(map, c.pos)]) continue;
      g.fillStyle(c.opened ? 0x6b5a2a : 0xd9a441, 1);
      g.fillRect(c.pos.x * TILE + 7, c.pos.y * TILE + 10, TILE - 14, TILE - 18);
    }

    for (const b of s.barriers) {
      g.fillStyle(0x8a93a6, 1);
      g.fillRect(b.pos.x * TILE + 2, b.pos.y * TILE + 2, TILE - 4, TILE - 4);
      g.lineStyle(2, 0xc9d1e0, 1);
      g.strokeRect(b.pos.x * TILE + 2, b.pos.y * TILE + 2, TILE - 4, TILE - 4);
    }

    for (const e of s.enemies) {
      if (!visible.has(idx(map, e.pos))) continue; // enemigos solo en rango de visión
      g.fillStyle(ENEMY_COLORS[e.kind] ?? 0xb23a48, 1);
      g.fillRect(e.pos.x * TILE + 5, e.pos.y * TILE + 5, TILE - 10, TILE - 10);
      if (e.statuses.some((st) => st.id === 'aturdido')) {
        g.lineStyle(2, 0xffe14a, 1);
        g.strokeRect(e.pos.x * TILE + 4, e.pos.y * TILE + 4, TILE - 8, TILE - 8);
      }
      if (e.statuses.some((st) => st.id === 'quemadura')) {
        g.fillStyle(0xff7a1a, 1);
        g.fillRect(e.pos.x * TILE + TILE - 11, e.pos.y * TILE + 5, 6, 6);
      }
      g.fillStyle(0x00ff88, 1);
      g.fillRect(e.pos.x * TILE + 5, e.pos.y * TILE + 2, ((TILE - 10) * e.hp) / e.maxHp, 3);
    }

    // Shinobi: cuerpo oscuro y pañuelo rojo; halo azul si está protegido.
    g.fillStyle(0x15151f, 1);
    g.fillRect(player.pos.x * TILE + 6, player.pos.y * TILE + 6, TILE - 12, TILE - 12);
    g.lineStyle(player.statuses.some((st) => st.id === 'protegido') ? 3 : 1, 0x5b8def, 1);
    g.strokeRect(player.pos.x * TILE + 6, player.pos.y * TILE + 6, TILE - 12, TILE - 12);
    g.fillStyle(0xd62839, 1);
    g.fillRect(player.pos.x * TILE + 6, player.pos.y * TILE + 11, TILE - 12, 4);

    if (this.targeting) {
      const pv = previewTechnique(s, this.targeting.techniqueId, this.targeting.cursor);
      g.fillStyle(0xff6a2a, 0.45);
      for (const c of pv.cells) g.fillRect(c.x * TILE, c.y * TILE, TILE, TILE);
      g.lineStyle(2, pv.valid ? 0xffffff : 0xff4444, 1);
      g.strokeRect(this.targeting.cursor.x * TILE, this.targeting.cursor.y * TILE, TILE, TILE);
    }

    this.cameras.main.centerOn(player.pos.x * TILE + TILE / 2, player.pos.y * TILE + TILE / 2);
  }
}
