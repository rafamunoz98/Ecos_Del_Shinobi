/** Utilidades de azar determinista para el arte procedural (no tocan el estado del juego). */

export function hash2(x: number, y: number, salt = 0): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(salt | 0, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Generador pequeño con semilla: devuelve números en [0,1). */
export function makeRand(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const easeOut = (t: number): number => 1 - (1 - t) * (1 - t);
export const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** Mezcla dos colores '#rrggbb' y devuelve otro '#rrggbb' (se puede encadenar). */
export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number): string =>
    Math.round(lerp((pa >> shift) & 255, (pb >> shift) & 255, t))
      .toString(16)
      .padStart(2, '0');
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}

export function rgba(hex: string, alpha: number): string {
  const p = parseInt(hex.slice(1), 16);
  return `rgba(${p >> 16},${(p >> 8) & 255},${p & 255},${alpha})`;
}
