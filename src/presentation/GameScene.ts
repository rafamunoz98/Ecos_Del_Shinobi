import Phaser from 'phaser';
import { getTechnique, needsAim } from '../content/techniques';
import { isPotion } from '../content/arcana';
import { BALANCE } from '../content/balance';
import { itemName } from '../content/names';
import { canWield } from '../core/combat';
import { FISTS_ID, THROWABLES, getWeapon } from '../content/weapons';
import { applyCommand, previewAttack, previewTechnique, previewThrow } from '../core/engine';
import { DIRS8, chebyshev, equals, inBounds, manhattan, stepOk, terrainAt } from '../core/grid';
import { createGame } from '../core/newGame';
import { canSeeEntity, visibleCells } from '../core/sight';
import { knownPath, travelInterrupted } from '../core/travel';
import type { Command, GameEvent, GameState, Vec } from '../core/types';
import { AffinityBox } from '../ui/affinityBox';
import { ChoiceBox } from '../ui/choice';
import { ConfirmBox } from '../ui/confirm';
import { ForgeBox } from '../ui/forge';
import { ShopBox } from '../ui/shop';
import { MERCHANT_KIND } from '../content/shop';
import { DialogueBox } from '../ui/dialogue';
import { Hud, TECHNIQUE_KEYS, type AimInfo, type UiAction } from '../ui/hud';
import { Menu } from '../ui/menu';
import { type Overlay, WorldRenderer, affinityColor } from './art/renderer';
import { DirectionChords, isCardinal } from './chords';

const N: Vec = { x: 0, y: -1 };
const E: Vec = { x: 1, y: 0 };
const S: Vec = { x: 0, y: 1 };
const W: Vec = { x: -1, y: 0 };
const NE: Vec = { x: 1, y: -1 };
const SE: Vec = { x: 1, y: 1 };
const SW: Vec = { x: -1, y: 1 };
const NW: Vec = { x: -1, y: -1 };

/**
 * Teclas de movimiento. Las diagonales siguen la disposición clásica de los roguelike con WASD: Q (↖) E (↗) Z (↙) C (↘),
 * o el teclado numérico (7 9 1 3) y Inicio/RePág/Fin/AvPág.
 */
const KEY_DIRS: Record<string, Vec> = {
  arrowup: N,
  w: N,
  np8: N,
  arrowright: E,
  d: E,
  np6: E,
  arrowdown: S,
  s: S,
  np2: S,
  arrowleft: W,
  a: W,
  np4: W,
  q: NW,
  np7: NW,
  home: NW,
  e: NE,
  np9: NE,
  pageup: NE,
  z: SW,
  np1: SW,
  end: SW,
  c: SE,
  np3: SE,
  pagedown: SE,
};

const TECHNIQUE_SLOT_KEYS = TECHNIQUE_KEYS.map((k) => k.toLowerCase());

/** Modo de apuntado: una técnica, un lanzamiento o un ataque de alcance con látigo/lanza. */
type Aim =
  | { kind: 'technique'; techniqueId: string; cursor: Vec }
  | { kind: 'throw'; itemId: string; cursor: Vec }
  | { kind: 'reach'; cursor: Vec };

/** Lo que se usa del puntero de Phaser. */
interface PointerLike {
  x: number;
  y: number;
  isDown: boolean;
  /** 0 = botón principal (o el dedo). */
  button?: number;
}

/** Viaje automático iniciado con un clic: sigue hasta llegar o hasta que algo lo interrumpa. */
interface Travel {
  goal: Vec;
  /** Si el clic fue sobre un enemigo, se le persigue hasta quedar a su lado (no se le ataca solo). */
  enemyId?: string;
  nextAt: number;
}

/** Segundos entre pasos del viaje (un poco más que la animación de un paso, para que se vea fluido). */
const TRAVEL_STEP = 0.15;

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
    equipArmor: (armorId) => void this.dispatch({ type: 'EquipArmor', armorId }),
    equipTechnique: (techniqueId, replace) => void this.dispatch({ type: 'EquipTechnique', techniqueId, replace }),
  });
  private readonly dialogue = new DialogueBox();
  private readonly choice = new ChoiceBox();
  private readonly forge = new ForgeBox();
  private readonly shop = new ShopBox();
  private readonly affinityBox = new AffinityBox();
  private readonly confirm = new ConfirmBox();
  private readonly chords = new DirectionChords((key) => this.handleKey(key));
  private travel: Travel | null = null;
  private hoverTile: Vec | null = null;
  private hoverFor: { state: GameState; tile: Vec } | null = null;
  private lastEvents: GameEvent[] = [];
  private introShown = false;
  private aim: Aim | null = null;
  private facing: Vec = E;
  private drag: { x: number; y: number; moved: boolean } | null = null;
  private panShown = false;
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
    this.input.keyboard?.on('keyup', (e: KeyboardEvent) => this.chords.release(this.keyOf(e)));
    window.addEventListener('blur', () => this.chords.clear());
    this.input.on('wheel', (_pointer: unknown, _objects: unknown, _dx: number, dy: number) => {
      this.world.zoomBy(dy > 0 ? 0.9 : 1.1);
    });
    // Mantener pulsado y arrastrar mueve la vista para repasar lo ya explorado; cualquier acción la recentra.
    this.input.on('pointerdown', (ptr: PointerLike) => {
      this.cancelTravel();
      this.drag = { x: ptr.x, y: ptr.y, moved: false };
    });
    this.input.on('pointermove', (ptr: PointerLike) => {
      const d = this.drag;
      if (!ptr.isDown) {
        // Ratón sin pulsar: se previsualiza el camino hasta la casilla señalada.
        this.hoverTile = this.world.screenToTile(ptr.x, ptr.y);
        return;
      }
      if (!d) return;
      const dx = ptr.x - d.x;
      const dy = ptr.y - d.y;
      if (!d.moved && Math.hypot(dx, dy) < 8) return;
      d.moved = true;
      document.getElementById('game')?.classList.add('panning');
      this.world.panByPixels(dx, dy);
      d.x = ptr.x;
      d.y = ptr.y;
    });
    const endDrag = (): void => {
      this.drag = null;
      document.getElementById('game')?.classList.remove('panning');
    };
    this.input.on('pointerup', (ptr: PointerLike) => {
      const d = this.drag;
      endDrag();
      // Un toque o clic corto (sin arrastrar) es una orden sobre la casilla pulsada.
      if (d && !d.moved && (ptr.button ?? 0) === 0) this.onTap(this.world.screenToTile(ptr.x, ptr.y));
    });
    this.input.on('pointerupoutside', endDrag);
    this.input.on('gameout', () => {
      this.hoverTile = null;
    });
    this.scale.on('resize', () => this.rebuildTexture());
    this.events.on('update', () => this.tick());
    this.hud.onAction = (a) => this.perform(a);
    this.choice.onChoose = (npcId, optionId) => void this.dispatch({ type: 'Choose', npcId, optionId });
    this.forge.onUpgrade = (npcId, weaponId, pay) => void this.dispatch({ type: 'Upgrade', npcId, weaponId, pay });
    this.forge.onPurify = (npcId, itemId) => void this.dispatch({ type: 'Purify', npcId, itemId });
    this.shop.onBuy = (npcId, offerId) => void this.dispatch({ type: 'Buy', npcId, offerId });
    this.affinityBox.onChoose = (affinity) => void this.dispatch({ type: 'ChooseAffinity', affinity });
    this.menu.onRestart = () => this.requestRestart();
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

  /** Un fotograma: dibuja el mundo en el lienzo y lo sube a la textura. */
  private tick(): void {
    if (!this.ctx || !this.tex || !this.state) return;
    // La elección de afinidad espera a que acabe el diálogo del jefe.
    if (!this.dialogue.isOpen || !this.state.affinityOffer) this.affinityBox.sync(this.state);
    if (this.travel && now() >= this.travel.nextAt) this.stepTravel();
    this.updateHover();
    this.world.render(this.ctx, now(), this.overlay());
    this.tex.refresh();
    const panned = this.world.isPanned;
    if (panned !== this.panShown) {
      this.panShown = panned;
      const hint = document.getElementById('pan-hint');
      if (hint) hint.hidden = !panned;
    }
  }

  private startRun(seed: number): void {
    this.state = createGame({ seed });
    this.aim = null;
    this.travel = null;
    this.hoverFor = null;
    this.world.setHover(null);
    this.chords.clear();
    this.confirm.close();
    this.hud.notice('');
    this.world.reset(this.state, now());
    this.menu.close();
    this.choice.close();
    this.forge.close();
    this.shop.close();
    this.affinityBox.close();
    this.world.resetPan();
    this.dialogue.clear();
    this.refreshHud();
    if (!this.introShown) {
      this.introShown = true;
      this.dialogue.show('prologo');
    }
  }

  // ---------- Entrada ----------

  /** Nombre de la tecla en minúsculas; el teclado numérico va aparte (`np1`…) para que 1-6 sigan siendo las técnicas. */
  private keyOf(e: KeyboardEvent): string {
    if (e.code.startsWith('Numpad') && /^[0-9]$/.test(e.code.slice(6))) return `np${e.code.slice(6)}`;
    return e.key.toLowerCase();
  }

  private onKey(e: KeyboardEvent): void {
    const key = this.keyOf(e);
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'tab', 'home', 'end', 'pageup', 'pagedown'].includes(key)) e.preventDefault();
    // Dos flechas casi a la vez forman UNA diagonal (un solo turno). Solo en juego: en menús las flechas no esperan.
    const dir = KEY_DIRS[key];
    if (dir && isCardinal(dir) && this.state.status === 'playing' && !this.modalOpen) {
      this.chords.press(key, dir, e.repeat);
      return;
    }
    this.chords.flush();
    this.handleKey(key);
  }

  /** ¿Hay una ventana encima del mapa (menú, diálogo, tienda...)? */
  private get modalOpen(): boolean {
    return this.menu.isOpen || this.dialogue.isOpen || this.affinityBox.isOpen || this.choice.isOpen || this.forge.isOpen || this.shop.isOpen || this.confirm.isOpen;
  }

  /** Reiniciar: si hay una expedición en marcha pregunta antes de abandonarla; sin nada que perder (turno 0 o ya terminada) reinicia sin más. */
  private requestRestart(): void {
    if (this.state.status !== 'playing' || this.state.turn === 0) {
      this.startRun((Date.now() >>> 0) || 1);
      return;
    }
    this.menu.close();
    this.confirm.open({
      title: '¿Reiniciar la expedición?',
      text: `Perderás el progreso de esta partida (sector ${this.state.floor}, nivel ${this.state.player.level}, turno ${this.state.turn}).`,
      yes: 'Sí, reiniciar',
      no: 'No, seguir',
      onYes: () => this.startRun((Date.now() >>> 0) || 1),
    });
  }

  /** Una tecla (física o de la cruceta táctil) ya en minúsculas. */
  private handleKey(key: string): void {
    if (this.confirm.onKey(key)) return;
    this.cancelTravel();
    if (this.dialogue.onKey(key)) return;
    if (this.affinityBox.onKey(key)) return;
    if (this.choice.onKey(key)) return;
    if (this.forge.onKey(key)) return;
    if (this.shop.onKey(key)) return;
    if (this.menu.onKey(key)) return;

    if (key === 'r') {
      this.requestRestart();
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

    this.world.resetPan();
    const dir = KEY_DIRS[key];
    const slot = TECHNIQUE_SLOT_KEYS.indexOf(key);
    if (dir) {
      this.moveOrAct(dir);
    } else if (key === ' ' || key === 'np5') {
      this.dispatch({ type: 'Wait' });
    } else if (key === 'x' || key === 'enter') {
      this.interact();
    } else if (key === 'f') {
      this.startReach();
    } else if (key === 'g') {
      this.startThrow();
    } else if (key === 'v') {
      this.cycleThrowable();
    } else if (key === 'b') {
      this.cycleWeapon();
    } else if (slot >= 0) {
      this.castSlot(slot);
    }
  }

  /** Un paso hacia `dir`: ataca si hay un enemigo, interactúa si hay un cofre, PNJ o puerta con candado, y si no, camina. */
  private moveOrAct(dir: Vec): boolean {
    this.facing = dir;
    const to = { x: this.state.player.pos.x + dir.x, y: this.state.player.pos.y + dir.y };
    const enemy = this.state.enemies.find((en) => equals(en.pos, to));
    if (enemy) return this.dispatch({ type: 'BasicAttack', target: to });
    if (this.bumpTarget(to)) return this.dispatch({ type: 'Interact', target: to });
    return this.dispatch({ type: 'Move', dx: dir.x, dy: dir.y });
  }

  /** Órdenes dadas con el ratón o el dedo desde el panel: equivalen a su tecla. */
  private perform(a: UiAction): void {
    if (a.type === 'key') return this.handleKey(a.key);
    this.cancelTravel();
    if (this.state.status !== 'playing' || this.modalOpen) return;
    if (this.aim) {
      this.aim = null;
      this.refreshHud();
    }
    switch (a.type) {
      case 'technique':
        return this.castSlot(a.slot);
      case 'throw':
        return this.startThrow();
      case 'cycleThrow':
        return this.cycleThrowable();
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
    const potion = itemId && isPotion(itemId) && (inv[itemId] ?? 0) > 0;
    if (have.length === 0 && !potion) {
      this.hud.notice('No llevas armas arrojadizas.');
      return;
    }
    const pick = potion ? (itemId as string) : itemId && have.includes(itemId) ? itemId : have.includes(this.throwSel) ? this.throwSel : have[0];
    if (!potion) this.throwSel = pick;
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
    const p = this.state.player;
    // Puños, y las armas que tienes con fuerza suficiente: pasa a la siguiente de la lista.
    const options = [FISTS_ID, ...p.weapons.filter((w) => canWield(p, w))];
    if (options.length < 2) {
      this.hud.notice(p.weapons.length > 0 ? 'Tus armas pesan demasiado: necesitas más Fuerza o mejorarlas en la forja.' : 'No tienes ninguna arma: peleas a puños.');
      return;
    }
    const next = options[(options.indexOf(p.equipment.weapon ?? FISTS_ID) + 1) % options.length];
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
    } else if (a.kind === 'throw' && (key === 'tab' || key === 'v')) {
      this.cycleThrowable();
    } else if (key === 'escape' || (a.kind === 'technique' && TECHNIQUE_SLOT_KEYS.includes(key)) || (a.kind === 'throw' && key === 'g') || (a.kind === 'reach' && key === 'f')) {
      this.aim = null;
      this.hud.notice('');
      this.refreshHud();
    }
  }

  /** Cambia la arrojadiza elegida (también durante el apuntado). No gasta turno. */
  private cycleThrowable(): void {
    const inv = this.state.player.inventory;
    const have = Object.keys(THROWABLES).filter((id) => (inv[id] ?? 0) > 0);
    if (have.length === 0) {
      this.hud.notice('No llevas armas arrojadizas.');
      return;
    }
    if (have.length < 2) {
      this.hud.notice(`Solo tienes ${THROWABLES[have[0]]?.name ?? have[0]}.`);
      return;
    }
    const cur = this.aim?.kind === 'throw' ? this.aim.itemId : this.throwSel;
    const next = have[(have.indexOf(cur) + 1) % have.length]; // desde una poción (índice -1) pasa a la primera arrojadiza
    this.throwSel = next;
    if (this.aim?.kind === 'throw') this.aim.itemId = next;
    this.hud.notice(`Arrojadiza: ${THROWABLES[next]?.name ?? next} (×${inv[next]}).`);
    this.refreshHud();
  }

  private aimCommand(a: Aim): Command {
    if (a.kind === 'technique') return { type: 'UseTechnique', techniqueId: a.techniqueId, target: a.cursor };
    if (a.kind === 'throw') return { type: 'Throw', itemId: a.itemId, target: a.cursor };
    return { type: 'BasicAttack', target: a.cursor };
  }

  /** ¿Hay algo contra lo que chocar que se use con solo caminar hacia ello? (cofre sin abrir, puerta con candado, PNJ o mesa) */
  private bumpTarget(to: Vec): boolean {
    const { chests, npcs, map } = this.state;
    return chests.some((c) => equals(c.pos, to) && !c.opened) || npcs.some((n) => equals(n.pos, to)) || terrainAt(map, to) === 'locked';
  }

  /** Inspeccionar/Interactuar: habla con un maestro o altar, abre un cofre o cruza la escalera (casilla propia o adyacentes). */
  private interact(): void {
    const { player, map, chests, npcs } = this.state;
    const candidates = [player.pos, ...DIRS8.map((d) => ({ x: player.pos.x + d.x, y: player.pos.y + d.y }))];
    const target =
      candidates.find((c) => npcs.some((n) => equals(n.pos, c))) ??
      candidates.find((c) => chests.some((ch) => equals(ch.pos, c) && !ch.opened)) ??
      candidates.find((c) => terrainAt(map, c) === 'locked') ??
      candidates.find((c) => terrainAt(map, c) === 'exit');
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
    this.lastEvents = result.events as GameEvent[];
    this.world.resetPan();
    this.hud.notice('');
    this.world.setState(this.state, result.events as GameEvent[], now());
    this.refreshHud();
    this.showStory(result.events as GameEvent[]);
    return true;
  }

  /** Diálogos y decisiones que han salido de la acción: se muestran tras empezar las animaciones. */
  private showStory(events: GameEvent[]): void {
    const talked = events.find((e): e is Extract<GameEvent, { type: 'NpcTalked' }> => e.type === 'NpcTalked');
    const talkedKind = talked ? this.state.npcs.find((n) => n.id === talked.npcId)?.kind : undefined;
    if (talked && talkedKind === 'mesa_forja') {
      this.forge.open(this.state, talked.npcId);
      return;
    }
    if (talked && talkedKind === MERCHANT_KIND) {
      const open = (): void => this.shop.open(this.state, talked.npcId);
      const lines = events.filter((ev): ev is Extract<GameEvent, { type: 'Dialogue' }> => ev.type === 'Dialogue');
      if (lines.length === 0) open();
      lines.forEach((ev, i) => this.dialogue.show(ev.id, i === lines.length - 1 ? open : undefined));
      return;
    }
    for (const ev of events) {
      if (ev.type !== 'Dialogue') continue;
      const open = talked && !this.state.npcs.find((n) => n.id === talked.npcId)?.used ? () => this.choice.open(this.state, talked.npcId) : undefined;
      this.dialogue.show(ev.id, talked ? open : undefined);
    }
    // Una técnica aprendida sin ranura libre: se ofrece cambiarla por una equipada.
    const learned = events.find((e): e is Extract<GameEvent, { type: 'TechniqueLearned' }> => e.type === 'TechniqueLearned' && !e.equipped);
    if (learned && getTechnique(learned.techniqueId)?.learnable && !this.dialogue.isOpen) {
      this.menu.open(this.state, 'tecnicas', learned.techniqueId);
    }
  }

  // ---------- Ratón y toque ----------

  /** Enemigo que el jugador ve en `tile` (los que están en la niebla no se delatan al señalarlos). */
  private visibleEnemyAt(tile: Vec): GameState['enemies'][number] | undefined {
    const visible = visibleCells(this.state);
    return this.state.enemies.find((e) => equals(e.pos, tile) && canSeeEntity(this.state, visible, e.pos));
  }

  /**
   * Clic o toque corto sobre una casilla. Con el modo de apuntado activo sirve para elegir objetivo (un segundo clic en
   * el mismo sitio confirma); si no, es la orden «ve ahí»: junto a ti es un paso (o ataque, o interacción) como con
   * las flechas, y lejos es un viaje automático por lo ya explorado.
   */
  private onTap(tile: Vec): void {
    if (this.state.status !== 'playing' || this.modalOpen) return;
    if (!inBounds(this.state.map, tile)) return;
    if (this.aim) {
      this.tapAim(tile);
      return;
    }
    const { player, map } = this.state;
    this.world.resetPan();
    if (equals(tile, player.pos)) {
      // Tocarte a ti mismo: usa lo que haya bajo tus pies (la escalera) o espera un turno.
      if (terrainAt(map, tile) === 'exit') void this.dispatch({ type: 'Interact', target: tile });
      else void this.dispatch({ type: 'Wait' });
      return;
    }
    const enemy = this.visibleEnemyAt(tile);
    // Arma de alcance (látigo, lanza) con el enemigo a tiro: se ataca desde donde estás.
    if (enemy && chebyshev(tile, player.pos) > 1 && previewAttack(this.state, tile).valid) {
      this.facing = { x: Math.sign(tile.x - player.pos.x), y: Math.sign(tile.y - player.pos.y) };
      void this.dispatch({ type: 'BasicAttack', target: tile });
      return;
    }
    if (chebyshev(tile, player.pos) === 1 && stepOk(map, player.pos, tile)) {
      void this.moveOrAct({ x: tile.x - player.pos.x, y: tile.y - player.pos.y });
      return;
    }
    const path = knownPath(this.state, tile);
    if (!path || path.length === 0) {
      this.hud.notice(this.state.explored[tile.y * map.width + tile.x] ? 'No hay un camino conocido hasta ahí.' : 'Esa zona aún no la has explorado.');
      return;
    }
    this.travel = { goal: tile, enemyId: enemy?.id, nextAt: 0 };
    this.stepTravel();
  }

  /** En el modo de apuntado, un clic mueve el cursor; repetirlo sobre el mismo objetivo lo confirma. */
  private tapAim(tile: Vec): void {
    const a = this.aim as Aim;
    const pos = this.state.player.pos;
    const def = a.kind === 'technique' ? getTechnique(a.techniqueId) : undefined;
    const lineLike = a.kind === 'reach' || def?.target.kind === 'line';
    let cursor = tile;
    if (lineLike) {
      // En las de línea el clic elige la dirección (la más cercana de las ocho) desde el jugador.
      if (equals(tile, pos)) return;
      const ang = Math.atan2(tile.y - pos.y, tile.x - pos.x);
      const k = ((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8;
      const dir = [E, SE, S, SW, W, NW, N, NE][k];
      this.facing = dir;
      cursor = this.step(pos, dir);
    }
    if (equals(cursor, a.cursor)) {
      if (this.dispatch(this.aimCommand(a))) this.aim = null;
    } else {
      a.cursor = cursor;
    }
    this.refreshHud();
  }

  /** Da el siguiente paso del viaje, o lo termina si ya llegaste o algo cambió. */
  private stepTravel(): void {
    const t = this.travel;
    if (!t) return;
    if (this.modalOpen || this.aim || this.state.status !== 'playing') return this.cancelTravel();
    const chased = t.enemyId ? this.state.enemies.find((e) => e.id === t.enemyId) : undefined;
    if (t.enemyId && !chased) return this.cancelTravel();
    const goal = chased ? chased.pos : t.goal;
    const path = knownPath(this.state, goal);
    if (!path || path.length === 0) return this.cancelTravel();
    const next = path[0];
    // Pegado al enemigo perseguido (o a uno que se ha puesto en el destino): ya basta, atacar lo decides tú.
    if (path.length === 1 && this.state.enemies.some((e) => equals(e.pos, next))) return this.cancelTravel();
    const before = this.state;
    const pos = before.player.pos;
    if (!this.moveOrAct({ x: next.x - pos.x, y: next.y - pos.y })) return this.cancelTravel();
    const arrived = equals(this.state.player.pos, goal);
    if (arrived || travelInterrupted(before, this.state, this.lastEvents, t.enemyId)) {
      this.cancelTravel();
      if (!arrived && this.state.status === 'playing') this.hud.notice('Te detienes: ha cambiado algo.');
      return;
    }
    t.nextAt = now() + TRAVEL_STEP;
  }

  private cancelTravel(): void {
    this.travel = null;
  }

  /** Previsualiza (solo con ratón) el camino hasta la casilla señalada, con marco rojo si es un enemigo. */
  private updateHover(): void {
    const tile = this.hoverTile;
    const show = tile && !this.travel && !this.aim && !this.modalOpen && this.state.status === 'playing' && inBounds(this.state.map, tile) && !equals(tile, this.state.player.pos);
    if (!show || !tile) {
      if (this.hoverFor) {
        this.hoverFor = null;
        this.world.setHover(null);
      }
      return;
    }
    // Solo se recalcula si cambió la casilla señalada o el estado del juego.
    if (this.hoverFor && this.hoverFor.state === this.state && equals(this.hoverFor.tile, tile)) return;
    this.hoverFor = { state: this.state, tile };
    const enemy = this.visibleEnemyAt(tile);
    const pos = this.state.player.pos;
    if (enemy && chebyshev(tile, pos) > 1 && previewAttack(this.state, tile).valid) {
      this.world.setHover({ path: [tile], goal: tile, color: '#ff7a7a' });
      return;
    }
    const path = chebyshev(tile, pos) === 1 && stepOk(this.state.map, pos, tile) ? [tile] : knownPath(this.state, tile);
    if (!path || path.length === 0) {
      this.world.setHover(null);
      return;
    }
    const color = enemy ? '#ff7a7a' : this.bumpTarget(tile) ? '#ffd166' : '#ffffff';
    this.world.setHover({ path, goal: tile, color });
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
      return { cells: [...pv.cells, ...pv.area], cursor: a.cursor, valid: pv.valid, color: isPotion(a.itemId) ? '#ffb86a' : '#d8e4ff' };
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
      const potionAim = isPotion(a.itemId);
      return { title: `Lanzar ${potionAim ? itemName(a.itemId, this.state) : (THROWABLES[a.itemId]?.name ?? a.itemId)}`, detail: potionAim ? `El frasco se rompe donde cae y afecta un área de radio ${BALANCE.potionThrow.radius} (también a ti si estás cerca)` : `V o Tab: cambiar de arrojadiza · Quedan ${this.state.player.inventory[a.itemId] ?? 0}`, valid: pv.valid, message: pv.message, canCycle: Object.keys(THROWABLES).filter((id) => (this.state.player.inventory[id] ?? 0) > 0).length > 1 };
    }
    const pv = previewAttack(this.state, a.cursor);
    const w = getWeapon(this.state.player.equipment.weapon);
    return { title: `Atacar con ${w?.name ?? 'arma'}`, detail: 'Flechas o Q E Z C: dirección', valid: pv.valid, message: pv.message };
  }

  private refreshHud(): void {
    this.hud.throwSel = this.throwSel;
    this.hud.update(this.state, this.aimInfo());
    this.menu.refresh(this.state);
    this.choice.refresh(this.state);
    this.forge.refresh(this.state);
    this.shop.refresh(this.state);
  }
}
