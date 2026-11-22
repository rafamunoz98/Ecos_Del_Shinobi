import { isEchoKind } from '../content/echo';
import { isCaptiveKind } from '../content/story';
import type { GameState } from './types';

/** Pistas al entrar en un sector sobre las llaves y lo que abren (el jugador no las encontraba). */
export function floorHints(s: GameState): string[] {
  const out: string[] = [];
  const hasLockedDoor = s.map.tiles.includes('locked');
  const ironKey = s.drops.some((d) => d.itemId === 'llave_hierro') && !s.player.keys.includes('llave_hierro');
  if (hasLockedDoor && ironKey) out.push('Hay una cámara sellada con candado: su llave de hierro (brilla en el suelo) está en una sala con guardianes.');
  const lacquerKey = s.drops.some((d) => d.itemId === 'llave_laca') && !s.player.keys.includes('llave_laca');
  if (s.chests.some((c) => c.locked && !c.opened) && lacquerKey) out.push('Hay un cofre lacado: su llave de laca (brilla en el suelo) está en la sala más alejada de la entrada.');
  if (s.enemies.some((e) => isEchoKind(e.kind))) out.push('Sientes un eco de ti mismo en este sector: la cripta recuerda a quien cayó antes. Vencerlo libera lo que llevaba.');
  if (s.map.tiles.includes('secret')) out.push('Este sector se siente misterioso: algo se esconde tras estas paredes. Busca con calma (tecla H) por los rincones.');
  if (s.npcs.some((n) => isCaptiveKind(n.kind))) out.push('Hay un prisionero atado en este sector. Si lo liberas, te acompañará (solo puedes llevar a un compañero).');
  return out;
}

/**
 * Pistas sobre el desafío del sector (zarzal, muro agrietado, isla de vacío). No dicen QUÉ objeto lo resuelve ni dónde está:
 * en algún rincón del sector hay dos copias de lo necesario, sin identificar, y hay que probarlo junto al obstáculo.
 */
export function terrainHints(s: GameState): string[] {
  const out: string[] = [];
  const tiles = s.map.tiles;
  if (s.challenge === 'zarzal' && tiles.includes('thorns')) {
    out.push('Un zarzal reseco cierra una alcoba con un cofre: el fuego lo consumiría. En algún rincón del sector hay con qué prenderlo (los frascos desconocidos pueden lanzarse: Tab → Objetos → Lanzar).');
  }
  if (s.challenge === 'grieta' && tiles.includes('cracked')) {
    out.push('Un muro agrietado esconde una alcoba con un cofre: una explosión lo derribaría. En algún rincón del sector hay con qué hacerlo (prueba los pergaminos desconocidos junto al muro).');
  }
  if (tiles.includes('chasm')) {
    out.push('Hay precipicios en este sector: caer lleva al sector de abajo, pero cuesta la mitad de tu vida máxima.');
    if (s.challenge === 'isla') out.push('Un cofre descansa en una isla rodeada de vacío: en algún rincón del sector hay con qué cruzar (prueba las pociones desconocidas junto al borde).');
  }
  return out;
}
