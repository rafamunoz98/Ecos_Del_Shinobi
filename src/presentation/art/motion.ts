/**
 * ¿Un cambio de casilla lógica de (dx, dy) es un teletransporte (se dibuja al instante) y no un paso animado?
 * Un paso diagonal mide √2 ≈ 1,41 y se anima como cualquier otro; se mide con la distancia real, no con la de Manhattan
 * (que daba 2 y hacía que el ninja "desapareciera" y reapareciera al moverse en diagonal).
 */
export const isTeleport = (dx: number, dy: number): boolean => Math.hypot(dx, dy) > 1.6;
