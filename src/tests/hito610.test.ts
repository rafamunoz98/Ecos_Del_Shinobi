import { describe, expect, it } from 'vitest';
import { BALANCE } from '../content/balance';
import { isBossFloor } from '../content/enemies';
import { iconIdFor, gearLabel, itemName } from '../content/names';
import { floorHints } from '../core/hints';
import { createGame } from '../core/newGame';
import { generateLevel } from '../dungeon/generator';

describe('pistas de llaves y ritmo de los sectores', () => {
  it('el sector 1 es más suave que el resto: tope de enemigos por sector', () => {
    for (let seed = 1; seed <= 12; seed++) {
      for (let floor = 1; floor <= BALANCE.maxFloors; floor++) {
        const lv = generateLevel({ seed, floor, boss: isBossFloor(floor) });
        const cap = BALANCE.level.maxEnemiesByFloor[floor - 1];
        // El jefe y su guardia no cuentan contra el tope de las salas normales: solo se comprueba sin jefe.
        if (!isBossFloor(floor)) expect(lv.enemies.length).toBeLessThanOrEqual(cap);
      }
    }
  });

  it('al empezar, el registro avisa de dónde están las llaves de lo que haya cerrado', () => {
    let seen = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const g = createGame({ seed });
      const hints = floorHints(g);
      const hasDoor = g.map.tiles.includes('locked') && g.drops.some((d) => d.itemId === 'llave_hierro');
      const hasLacquer = g.chests.some((c) => c.locked) && g.drops.some((d) => d.itemId === 'llave_laca');
      const hasSecret = g.map.tiles.includes('secret');
      expect(hints.length).toBe((hasDoor ? 1 : 0) + (hasLacquer ? 1 : 0) + (hasSecret ? 1 : 0));
      for (const h of hints) expect(g.log).toContain(h);
      seen += hints.length;
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('sin la llave en el suelo no hay pista (ya la tienes)', () => {
    const g = createGame({ seed: 3 });
    g.drops = g.drops.filter((d) => !d.itemId.startsWith('llave'));
    expect(floorHints(g)).toEqual([]);
  });
});

describe('nombres e iconos de objetos sin identificar', () => {
  it('una poción desconocida usa el icono de su aspecto, no el de su efecto', () => {
    const g = createGame({ seed: 5 });
    const unknown = Object.keys(g.appearance).find((id) => id.startsWith('pocion:') && !g.player.known.includes(id)) as string;
    expect(iconIdFor(unknown, g)).toBe(`look:${g.appearance[unknown]}`);
    expect(itemName(unknown, g)).toBe(g.appearance[unknown]);
    const known = g.player.known.find((id) => id.startsWith('pocion:')) as string;
    expect(iconIdFor(known, g)).toBe(known);
  });

  it('el equipo sin identificar se muestra con (?) y el identificado con su modificador y nivel de forja', () => {
    const g = createGame({ seed: 5 });
    expect(gearLabel('hoja_afilada~llama', 0, g)).toBe('Hoja afilada (?)');
    g.player.identified.push('hoja_afilada~llama');
    expect(gearLabel('hoja_afilada~llama', 2, g)).toBe('Hoja afilada de Llama +2');
  });
});
