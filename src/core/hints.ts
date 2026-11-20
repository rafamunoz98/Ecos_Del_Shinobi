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
