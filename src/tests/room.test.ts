import { describe, expect, it } from 'vitest';
import { PROTOTYPE_ROOM } from '../content/rooms';
import { applyCommand } from '../core/engine';
import { findPath, manhattan } from '../core/grid';
import { createGame } from '../core/newGame';
import type { Command, Vec } from '../core/types';
import { parseRoom } from '../dungeon/ascii';

describe('parser de salas', () => {
  it('rechaza filas de distinta longitud, caracteres desconocidos y salas sin jugador', () => {
    expect(() => parseRoom(['###', '#@'])).toThrow();
    expect(() => parseRoom(['#@?#'])).toThrow();
    expect(() => parseRoom(['####', '#..#'])).toThrow();
    expect(() => parseRoom(['#@@#'])).toThrow();
  });
});

describe('sala del prototipo', () => {
  const room = parseRoom(PROTOTYPE_ROOM);
  const exit = (() => {
    const i = room.map.tiles.indexOf('exit');
    return { x: i % room.map.width, y: Math.floor(i / room.map.width) };
  })();

  it('tiene dimensiones válidas y salida', () => {
    expect(room.map.width).toBe(17);
    expect(room.map.height).toBe(10);
    expect(room.map.tiles.filter((t) => t === 'exit')).toHaveLength(1);
  });

  it('entrada, salida, cofres y enemigos son alcanzables', () => {
    const targets = [exit, ...room.chestStarts, ...room.enemyStarts];
    for (const t of targets) {
      expect(findPath(room.map, room.playerStart, t, () => false)).not.toBeNull();
    }
  });

  it('se puede completar la expedición simulando a un jugador (bucle completo)', () => {
    let s = createGame({ seed: 7, room: PROTOTYPE_ROOM, affinity: 'ascua' });
    for (let i = 0; i < 300 && s.status === 'playing'; i++) {
      const p = s.player.pos;
      const adjacent = s.enemies.find((e) => manhattan(e.pos, p) === 1);
      let cmd: Command;
      if (adjacent) {
        cmd = { type: 'BasicAttack', target: adjacent.pos };
      } else if (manhattan(exit, p) <= 1) {
        cmd = { type: 'Interact', target: exit };
      } else {
        const blocked = (q: Vec) =>
          s.enemies.some((e) => e.pos.x === q.x && e.pos.y === q.y) || s.chests.some((c) => c.pos.x === q.x && c.pos.y === q.y);
        const path = findPath(s.map, p, exit, blocked);
        expect(path).not.toBeNull();
        const next = (path as Vec[])[0];
        cmd = { type: 'Move', dx: next.x - p.x, dy: next.y - p.y };
      }
      const r = applyCommand(s, cmd);
      expect(r.ok).toBe(true);
      s = r.state;
    }
    expect(s.status).toBe('won');
  });
});
