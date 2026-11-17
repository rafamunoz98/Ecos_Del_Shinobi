import Phaser from 'phaser';
import { applyCommand, previewTechnique, visibleCells } from '../core/engine';
import { DIRS, equals, idx, inBounds, terrainAt } from '../core/grid';
import { createGame } from '../core/newGame';
import type { Command, GameState, Vec } from '../core/types';
import { Hud } from '../ui/hud';

/** Tamaño de casilla en píxeles. Constante única para poder cambiarla a 16 o 32 más adelante. */
export const TILE = 32;

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

const ITEM_KEYS: Record<string, string> = { '1': 'tonico_kiro', '2': 'unguento_musgo' };

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

  constructor(private readonly initialSeed: number) {
    super('GameScene');
  }

  create(): void {
    this.gfx = this.add.graphics();
    this.cameras.main.setBackgroundColor(0x0b0b12);
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.onKey(e));
    this.input.on('wheel', (_pointer: unknown, _objects: unknown, _dx: number, dy: number) => {
      const cam = this.cameras.main;
      cam.setZoom(Phaser.Math.Clamp(cam.zoom * (dy > 0 ? 0.9 : 1.1), 0.5, 3));
    });
    this.startRun(this.initialSeed);
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
    if (this.state.status !== 'playing') return;

    if (this.targeting) {
      this.onTargetingKey(key);
      return;
    }

    const dir = KEY_DIRS[key];
    if (dir) {
      const to = { x: this.state.player.pos.x + dir.x, y: this.state.player.pos.y + dir.y };
      const enemy = this.state.enemies.find((en) => equals(en.pos, to));
      this.dispatch(enemy ? { type: 'BasicAttack', target: to } : { type: 'Move', dx: dir.x, dy: dir.y });
    } else if (key === ' ') {
      this.dispatch({ type: 'Wait' });
    } else if (key === 'e') {
      this.interact();
    } else if (key === 't') {
      const techniqueId = this.state.player.techniques[0];
      if (techniqueId) {
        this.targeting = { techniqueId, cursor: { ...this.state.player.pos } };
        this.hud.notice('');
        this.refresh();
      }
    } else if (ITEM_KEYS[key]) {
      this.dispatch({ type: 'UseItem', itemId: ITEM_KEYS[key] });
    }
  }

  private onTargetingKey(key: string): void {
    const t = this.targeting as TargetingMode;
    const dir = KEY_DIRS[key];
    if (dir) {
      const next = { x: t.cursor.x + dir.x, y: t.cursor.y + dir.y };
      if (inBounds(this.state.map, next)) t.cursor = next;
      this.refresh();
    } else if (key === 'enter' || key === ' ') {
      const ok = this.dispatch({ type: 'UseTechnique', techniqueId: t.techniqueId, target: t.cursor });
      if (ok) this.targeting = null;
      this.refresh();
    } else if (key === 'escape' || key === 't') {
      this.targeting = null;
      this.hud.notice('');
      this.refresh();
    }
  }

  /** Inspeccionar/Interactuar: busca un cofre sin abrir o la salida en la casilla propia o adyacentes. */
  private interact(): void {
    const { player, map, chests } = this.state;
    const candidates = [player.pos, ...DIRS.map((d) => ({ x: player.pos.x + d.x, y: player.pos.y + d.y }))];
    const target = candidates.find(
      (c) => chests.some((ch) => equals(ch.pos, c) && !ch.opened) || terrainAt(map, c) === 'exit',
    );
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

    for (const e of s.enemies) {
      if (!visible.has(idx(map, e.pos))) continue; // enemigos solo en rango de visión
      g.fillStyle(0xb23a48, 1);
      g.fillRect(e.pos.x * TILE + 5, e.pos.y * TILE + 5, TILE - 10, TILE - 10);
      const w = ((TILE - 10) * e.hp) / e.maxHp;
      g.fillStyle(0x00ff88, 1);
      g.fillRect(e.pos.x * TILE + 5, e.pos.y * TILE + 2, w, 3);
    }

    // Shinobi: cuerpo oscuro y pañuelo rojo.
    g.fillStyle(0x15151f, 1);
    g.fillRect(player.pos.x * TILE + 6, player.pos.y * TILE + 6, TILE - 12, TILE - 12);
    g.lineStyle(1, 0x5b8def, 1);
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
