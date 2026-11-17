/** Fórmula inicial del documento de reglas: daño = max(1, poder + bonificación - defensa). */
export function calcDamage(power: number, bonus: number, defense: number): number {
  return Math.max(1, power + bonus - defense);
}
