// Números provisionales: se ajustarán con pruebas de juego.
export const BALANCE = {
  player: { maxHp: 20, maxKiro: 10, power: 4, defense: 1, strength: 3 },
  /** Alcance de las pociones lanzadas (distancia Manhattan) y radio de su efecto. */
  potionThrow: { range: 5, radius: 1 },
  /** Caer por un precipicio: fracción de la vida máxima que cuesta (nunca mata: deja al menos 1 de vida). */
  fallDamageFraction: 0.5,
  /** Peligros del suelo: duración (rondas) del fuego sobre terreno que arde, sobre suelo desnudo y de un charco; y la descarga eléctrica. */
  hazard: { fireOnFuel: 3, fireOnFloor: 2, water: 10, burnTurns: 3 },
  shock: { enemy: 6, player: 3, stunTurns: 2 },
  /** Buscar: alcance seguro y alcance con probabilidad; probabilidad de dar con una puerta secreta pegada al caminar. */
  search: { sure: 2, far: 3, farChance: 0.5, passiveChance: 0.2, hintRange: 3, turns: 5 },
  /** Probabilidad por sector de cámara oculta, de parche de precipicio y de minidesafío (los sectores de jefe no tienen). */
  secretRoomChance: 0.65,
  chasmChance: 0.7,
  /** Kiro que se recupera al esperar (el documento lo deja "si se aprueba en balance"). */
  waitKiro: 2,
  /** El kiro vuelve solo: 1 cada N rondas (la vida, más despacio). */
  kiroRegenEvery: 3,
  visionRadius: 7,
  /** Daño por turno de quemadura (ignora defensa). */
  burnDamage: 1,
  /** Regeneración natural: 1 de vida cada N rondas (sin ella, la expedición es una sangría sin remedio). */
  hpRegenEvery: 10,
  /** Poder extra mientras dura el estado "potenciado". */
  potentiatedPower: 2,
  /** Defensa que pierde un enemigo "vulnerable". */
  vulnerableDefense: 2,
  /** Defensa extra mientras dura el estado "protegido". */
  protectedDefense: 2,
  /** Daño extra al estrellar a un enemigo empujado contra un obstáculo (ignora defensa). */
  slamDamage: 2,
  logLimit: 60,
  /** Rondas que un enemigo sigue alerta tras perderte de vista. */
  alertTurns: 12,
  /** Un enemigo alertado te sigue desde hasta esta distancia de camino, y rastrea tu posición real hasta esta distancia tras perderte. */
  chaseLimit: 40,
  scentRange: 18,
  /** Radio de visión del jugador mientras está dentro de un arbusto (esconderse cuesta ver menos). */
  bushVision: 3,
  /** Multiplicador del golpe a un enemigo que no sabe de ti. */
  sneakMultiplier: 2,
  /** Sectores de una expedición (el último se completa cruzando su salida). */
  maxFloors: 6,
  /** Experiencia necesaria para subir del nivel N: xpBase * N. */
  xpBase: 8,
  levelUp: { hp: 4, kiro: 1, powerEvery: 2 },
  /** Técnicas que se pueden llevar equipadas a la vez (el resto queda en el grimorio). Hasta llenarlas no hay que sustituir ninguna. */
  techniqueSlots: 6,
  /** Rondas con una pieza de equipo puesta hasta descubrir qué esconde (las malditas se revelan al instante). */
  identifyTurns: 20,
  /** Mapas grandes al estilo Pixel Dungeon; el tamaño de casilla en pantalla es independiente. */
  level: {
    width: 64,
    height: 44,
    targetRooms: 12,
    minEnemies: 4,
    maxEnemies: 9,
    /** Tope de enemigos por sector (el primero es más suave: hay que despejarlo entero para subir de nivel). */
    maxEnemiesByFloor: [5, 7, 8, 9, 9, 9],
    /** Cofres de madera por sector (el cofre lacado de la llave de laca va aparte). */
    maxChests: 2,
    /** Grupos de arbustos por sector (+2 desde el sector 2). */
    bushClusters: 7,
    /** Arbustos sueltos en los pasillos rectos de cada sector. */
    corridorBushes: 7,
    maxDoors: 8,
    /** Objetos sueltos por el suelo (monedas, esquirlas, consumibles, arrojadizas). */
    groundItems: { min: 6, max: 9 },
    /** Probabilidad de cámara sellada (llave de hierro) y de cofre lacado (llave de laca) en cada sector. */
    vaultChance: 0.75,
    lacquerChance: 0.6,
  },
  /** Mesas de forja: solo aparecen en estos sectores. */
  forgeFloors: [2, 3, 5],
  /** Probabilidad de que un arma o vestimenta nueva venga maldita o encantada (el resto, corriente). */
  gear: { curseChance: 0.2, enchantChance: 0.28 },
  /** Monedas que cuesta purificar una pieza maldita en la forja. */
  purifyCost: 10,
  /** Mejora de armas: +1 de poder por nivel. Cada nivel se paga con monedas O con esquirlas. */
  forge: { maxLevel: 3, bonusPerLevel: 1, coins: [12, 20, 30], shards: [2, 3, 4] },
  /** Monedas que sueltan los enemigos al caer, y botín fijo del jefe. */
  enemyCoins: { chance: 0.35, min: 1, max: 2, perFloor: 0 },
  bossLoot: { coins: 15, shards: 3 },
  /** Los enemigos mejoran con el sector: +hp por sector y +poder cada N sectores. */
  enemyScale: { hpPerFloor: 2, powerEvery: 2 },
} as const;
