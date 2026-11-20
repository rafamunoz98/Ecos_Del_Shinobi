import { describe, expect, it } from 'vitest';
import { findPath, hasLineOfSight } from '../core/grid';
import { nextRandom } from '../core/rng';
import { parseRoom } from '../dungeon/ascii';

describe('línea de visión', () => {
  it('ve a través de suelo libre', () => {
    const { map } = parseRoom(['#####', '#@..#', '#####']);
    expect(hasLineOfSight(map, { x: 1, y: 1 }, { x: 3, y: 1 })).toBe(true);
  });

  it('una pared intermedia la bloquea, pero la pared en sí es visible', () => {
    const { map } = parseRoom(['#######', '#@.#..#', '#######']);
    expect(hasLineOfSight(map, { x: 1, y: 1 }, { x: 4, y: 1 })).toBe(false);
    expect(hasLineOfSight(map, { x: 1, y: 1 }, { x: 3, y: 1 })).toBe(true);
  });
});

describe('búsqueda de camino', () => {
  it('encuentra un camino más corto, sin incluir el origen', () => {
    const { map } = parseRoom(['#####', '#@..#', '#.#.#', '#...#', '#####']);
    const path = findPath(map, { x: 1, y: 1 }, { x: 3, y: 3 }, () => false);
    expect(path).toHaveLength(3); // la diagonal junto a una esquina vale mientras haya hueco por un lado
    expect(path?.[path.length - 1]).toEqual({ x: 3, y: 3 });
  });

  it('devuelve null si el destino está aislado', () => {
    const { map } = parseRoom(['#####', '#@#.#', '#####']);
    expect(findPath(map, { x: 1, y: 1 }, { x: 3, y: 1 }, () => false)).toBeNull();
  });

  it('rodea casillas bloqueadas y es determinista', () => {
    const { map } = parseRoom(['#####', '#@..#', '#...#', '#####']);
    const blocked = (p: { x: number; y: number }) => p.x === 2 && p.y === 1;
    const a = findPath(map, { x: 1, y: 1 }, { x: 3, y: 1 }, blocked);
    const b = findPath(map, { x: 1, y: 1 }, { x: 3, y: 1 }, blocked);
    expect(a).toEqual(b);
    expect(a).toHaveLength(2); // rodea por la diagonal
  });
});

describe('generador pseudoaleatorio', () => {
  it('misma semilla, misma secuencia', () => {
    let a = 42;
    let b = 42;
    for (let i = 0; i < 5; i++) {
      const ra = nextRandom(a);
      const rb = nextRandom(b);
      expect(ra.value).toBe(rb.value);
      expect(ra.value).toBeGreaterThanOrEqual(0);
      expect(ra.value).toBeLessThan(1);
      a = ra.state;
      b = rb.state;
    }
  });
});
