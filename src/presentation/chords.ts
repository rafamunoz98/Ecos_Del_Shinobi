import type { Vec } from '../core/types';

/**
 * Ventana (ms) para que dos flechas pulsadas «a la vez» cuenten como una sola diagonal. Un humano rara vez pulsa dos
 * teclas con menos de ~40 ms de diferencia salvo que quiera una diagonal; con 60 ms no se nota retraso al caminar recto.
 */
export const CHORD_WINDOW_MS = 60;

/** Tecla de diagonal (la misma que usan Q E Z C) para cada vector. */
const DIAGONAL_KEYS: Record<string, string> = { '-1,-1': 'q', '1,-1': 'e', '-1,1': 'z', '1,1': 'c' };

/** ¿Es una dirección cardinal (arriba, abajo, izquierda o derecha)? */
export const isCardinal = (d: Vec): boolean => (d.x === 0) !== (d.y === 0);

/** Dos cardinales perpendiculares forman una diagonal; si no lo son (iguales u opuestas) devuelve null. */
export function combineCardinals(a: Vec, b: Vec): Vec | null {
  if (!isCardinal(a) || !isCardinal(b)) return null;
  if ((a.x !== 0) === (b.x !== 0)) return null;
  return { x: a.x + b.x, y: a.y + b.y };
}

export interface ChordTimers {
  set(fn: () => void, ms: number): unknown;
  clear(id: unknown): void;
}

const realTimers: ChordTimers = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
};

/**
 * Convierte pulsaciones casi simultáneas de dos flechas (o WASD, o el teclado numérico) en UNA diagonal, para que
 * moverse en diagonal cueste un único turno. Sin esto, pulsar ↑ y → a la vez daba dos movimientos (y dos turnos).
 *
 * - Una flecha suelta se retiene `windowMs` por si llega la perpendicular; si no llega, se emite tal cual.
 * - Si una flecha se mantiene pulsada y se añade otra, la repetición automática de teclado sigue dando diagonales.
 * - Las teclas de diagonal directas (Q E Z C, numpad 7 9 1 3) no pasan por aquí.
 */
export class DirectionChords {
  private readonly held = new Map<string, Vec>();
  private pending: { key: string; dir: Vec; timer: unknown } | null = null;

  /** `emit` recibe la tecla ya resuelta: la original, o la de la diagonal combinada. */
  constructor(
    private readonly emit: (key: string) => void,
    private readonly windowMs: number = CHORD_WINDOW_MS,
    private readonly timers: ChordTimers = realTimers,
  ) {}

  /** Una flecha (cardinal) acaba de pulsarse. `repeat` es la repetición automática del teclado. */
  press(key: string, dir: Vec, repeat: boolean): void {
    this.held.set(key, dir);
    if (repeat) {
      // Con una tecla mantenida: si hay otra perpendicular pulsada, sigue en diagonal; si no, recto.
      let combined: Vec | null = null;
      for (const [k, d] of this.held) if (k !== key && !combined) combined = combineCardinals(d, dir);
      if (this.pending && combineCardinals(this.pending.dir, dir)) this.dropPending();
      else this.flush();
      this.emit(combined ? (DIAGONAL_KEYS[`${combined.x},${combined.y}`] as string) : key);
      return;
    }
    if (this.pending) {
      const combined = combineCardinals(this.pending.dir, dir);
      if (combined) {
        this.dropPending();
        this.emit(DIAGONAL_KEYS[`${combined.x},${combined.y}`] as string);
        return;
      }
      this.flush();
    }
    this.pending = { key, dir, timer: this.timers.set(() => this.flush(), this.windowMs) };
  }

  /** La flecha se soltó. */
  release(key: string): void {
    this.held.delete(key);
  }

  /** Emite ya la flecha retenida (por ejemplo antes de procesar otra tecla, para no desordenar las órdenes). */
  flush(): void {
    const p = this.pending;
    if (!p) return;
    this.dropPending();
    this.emit(p.key);
  }

  /** Olvida todo (el navegador pierde el foco, se abre una ventana...): evita teclas «pegadas». */
  clear(): void {
    this.dropPending();
    this.held.clear();
  }

  private dropPending(): void {
    if (this.pending) this.timers.clear(this.pending.timer);
    this.pending = null;
  }
}
