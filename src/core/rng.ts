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
