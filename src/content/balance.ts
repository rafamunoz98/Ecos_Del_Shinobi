// Números provisionales: se ajustarán con pruebas de juego.
export const BALANCE = {
  player: { maxHp: 20, maxKiro: 10, power: 4, defense: 1 },
  /** Kiro que se recupera al esperar (el documento lo deja "si se aprueba en balance"). */
  waitKiro: 1,
  visionRadius: 7,
  /** Daño por turno de quemadura (ignora defensa). */
  burnDamage: 1,
  /** Regeneración natural: 1 de vida cada N rondas (sin ella, la expedición es una sangría sin remedio). */
  hpRegenEvery: 10,
  /** Defensa extra mientras dura el estado "protegido". */
  protectedDefense: 2,
  /** Daño extra al estrellar a un enemigo empujado contra un obstáculo (ignora defensa). */
  slamDamage: 2,
  logLimit: 60,
  /** Rondas que un enemigo sigue alerta tras perderte de vista. */
  alertTurns: 8,
  /** Radio de visión del jugador mientras está dentro de un arbusto (esconderse cuesta ver menos). */
  bushVision: 3,
  /** Multiplicador del golpe a un enemigo que no sabe de ti. */
  sneakMultiplier: 2,
  /** Sectores de una expedición (el último se completa cruzando su salida). */
  maxFloors: 3,
  /** Experiencia necesaria para subir del nivel N: xpBase * N. */
  xpBase: 8,
  levelUp: { hp: 4, kiro: 1, powerEvery: 2 },
  /** Mapas grandes al estilo Pixel Dungeon; el tamaño de casilla en pantalla es independiente. */
  level: { width: 64, height: 44, targetRooms: 12, minEnemies: 4, maxEnemies: 9, maxChests: 5, bushClusters: 3, maxDoors: 8 },
  /** Los enemigos mejoran con el sector: +hp por sector y +poder cada N sectores. */
  enemyScale: { hpPerFloor: 2, powerEvery: 2 },
} as const;
