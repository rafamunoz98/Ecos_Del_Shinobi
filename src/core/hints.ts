import type { GameState } from './types';

/** Pistas al entrar en un sector sobre las llaves y lo que abren (el jugador no las encontraba). */
export function floorHints(s: GameState): string[] {
  const out: string[] = [];
  const hasLockedDoor = s.map.tiles.includes('locked');
  const ironKey = s.drops.some((d) => d.itemId === 'llave_hierro') && !s.player.keys.includes('llave_hierro');
  if (hasLockedDoor && ironKey) out.push('Hay una cámara sellada con candado: su llave de hierro (brilla en el suelo) está en una sala con guardianes.');
  const lacquerKey = s.drops.some((d) => d.itemId === 'llave_laca') && !s.player.keys.includes('llave_laca');
  if (s.chests.some((c) => c.locked && !c.opened) && lacquerKey) out.push('Hay un cofre lacado: su llave de laca (brilla en el suelo) está en la sala más alejada de la entrada.');
  return out;
}

/** Pistas sobre el desafío del sector (zarzal, muro agrietado, isla de vacío) y el objeto asegurado que lo resuelve. */
export function terrainHints(s: GameState): string[] {
  const out: string[] = [];
  const tiles = s.map.tiles;
  const guaranteed = (id: string): boolean => s.drops.some((d) => d.itemId === id && d.known === true);
  if (tiles.includes('thorns')) {
    out.push(
      guaranteed('pocion:ignea')
        ? 'Un zarzal reseco cierra una alcoba con un cofre y arde con facilidad: una Poción Ígnea (brilla en el suelo) espera en algún rincón del sector. Lánzala contra las zarzas (Tab → Objetos → Lanzar).'
        : 'Un zarzal reseco cierra una alcoba con un cofre: el fuego lo consumiría.',
    );
  }
  if (tiles.includes('cracked')) {
    out.push(
      guaranteed('pergamino:explosivo')
        ? 'Un muro agrietado esconde una alcoba con un cofre: un Sello Explosivo (brilla en el suelo) espera en algún rincón del sector. Léelo junto al muro.'
        : 'Un muro agrietado esconde una alcoba con un cofre: una explosión lo derribaría.',
    );
  }
  if (tiles.includes('chasm')) {
    out.push(
      guaranteed('pocion:levitacion')
        ? 'Hay un cofre en una isla rodeada de vacío: una Poción de Levitación (brilla en el suelo) te permitirá cruzarlo. Caer por un precipicio lleva al sector de abajo, pero cuesta la mitad de tu vida máxima.'
        : 'Hay precipicios en este sector: caer lleva al sector de abajo, pero cuesta la mitad de tu vida máxima.',
    );
  }
  return out;
}
