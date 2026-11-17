/**
 * Generador pseudoaleatorio con semilla (mulberry32) en forma funcional:
 * el estado vive dentro de GameState, así que es serializable y reproducible.
 * No usar Math.random() en el core.
 */
export function nextRandom(state: number): { value: number; state: number } {
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, state: next };
}

/** Envoltorio con estado mutable para código local (generación de niveles). Misma semilla, misma secuencia. */
export class Rng {
  state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    const r = nextRandom(this.state);
    this.state = r.state;
    return r.value;
  }

  /** Entero uniforme en [min, max], ambos incluidos. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    return items[this.int(0, items.length - 1)];
  }

  /** Elige según `weight`. Requiere al menos un elemento con peso positivo. */
  weighted<T extends { weight: number }>(items: readonly T[]): T {
    const total = items.reduce((sum, i) => sum + i.weight, 0);
    let roll = this.next() * total;
    for (const item of items) {
      if (roll < item.weight) return item;
      roll -= item.weight;
    }
    return items[items.length - 1];
  }

  /** Fisher-Yates in situ; devuelve el mismo array. */
  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }
}

/** Mezcla semilla, sector e intento en una semilla independiente (hash de enteros). */
export function mixSeed(seed: number, floor: number, attempt = 0): number {
  let h = (seed >>> 0) ^ Math.imul(floor + 1, 0x9e3779b1) ^ Math.imul(attempt + 1, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return (h ^ (h >>> 16)) >>> 0;
}
