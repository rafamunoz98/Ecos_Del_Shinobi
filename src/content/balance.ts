// Números provisionales: se ajustarán con pruebas de juego.
export const BALANCE = {
  player: { maxHp: 20, maxKiro: 10, power: 4, defense: 1 },
  /** Kiro que se recupera al esperar (el documento lo deja "si se aprueba en balance"). */
  waitKiro: 1,
  visionRadius: 7,
  /** Daño por turno de quemadura (ignora defensa). */
  burnDamage: 1,
  logLimit: 60,
} as const;
