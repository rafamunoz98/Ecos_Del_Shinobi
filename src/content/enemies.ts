/*
 * Enemigos. Tres familias:
 *  - Monstruos y ecos: criaturas del Pulso (acechador, cuervo, larva, lobo de raíz...).
 *  - Shinobi: ninjas de las facciones (renegados, Círculo de la Campana Hueca, Casa del Hilo Gris...). Pelean con HABILIDADES
 *    propias: ataques anunciados en área, cruz o línea, saltos, disparos con veneno o invocaciones (ver SkillDef).
 *  - Jefes: shinobi con fases, más habilidades y diálogos propios.
 */

/** Forma y condición de uso de una habilidad. Las anunciadas (delay > 0) marcan casillas y se liberan unas rondas después. */
export type SkillShape =
  /** Golpe alrededor del propio enemigo (radio en distancia de Manhattan). Se usa si estás a ≤ radius. */
  | { kind: 'burst'; radius: number }
  /** Área alrededor de TI (te marca donde estás). Se usa si te ve a ≤ range. */
  | { kind: 'zone'; radius: number; range: number }
  /** Cruz centrada en ti, filas y columnas hasta `length`. */
  | { kind: 'cross'; length: number; range: number }
  /** Línea desde el enemigo hacia ti, hasta `length` casillas; solo si estás alineado (8 direcciones). */
  | { kind: 'beam'; length: number }
  /** Disparo inmediato (sin aviso) con línea de visión, hasta `range`. Si estás a ≥ minDist. */
  | { kind: 'shot'; range: number }
  /** Salto instantáneo hasta una casilla junto a ti (hasta `range`). */
  | { kind: 'dash'; range: number }
  /** Convoca enemigos que no cuentan para despejar el sector. */
  | { kind: 'summon'; enemy: string; count: number };

export interface SkillDef {
  id: string;
  name: string;
  shape: SkillShape;
  /** Daño base de la habilidad (se resta tu defensa). 0 en saltos e invocaciones. */
  power: number;
  /** Rondas de aviso antes de liberarse (0 = inmediata). */
  delay: number;
  /** Rondas que debe esperar para volver a usarla. */
  cooldown: number;
  /** Solo disponible desde esta fase del jefe. */
  minPhase?: number;
  /** Estado que deja en el jugador si acierta. */
  inflict?: { status: 'veneno' | 'ceguera' | 'quemadura' | 'atado'; turns: number };
  /** Si acierta, te lanza lejos de quien la usa (casillas; chocar con algo duele). */
  pushPlayer?: number;
  /** Si acierta, te arrastra hacia quien la usa (casillas; te detienes pegado a él). */
  pullPlayer?: number;
  /** Si acierta, te roba este kiro. */
  drainKiro?: number;
  /** Quien la usa muere al liberarla (marionetas explosivas). */
  selfDestruct?: boolean;
  /** No la usa si estás más cerca que esto (disparos, saltos). */
  minDist?: number;
  /** Texto del registro cuando la empieza a preparar o la usa. */
  flavor?: string;
}

export interface EnemyDef {
  id: string;
  name: string;
  /** Familia: decide el arte y cómo se describe en el registro. */
  family: 'monster' | 'shinobi' | 'echo';
  maxHp: number;
  power: number;
  defense: number;
  /** Distancia de camino máxima a la que empieza a perseguir. */
  aggroRange: number;
  /** Experiencia que da al caer. */
  xp: number;
  /** melee persigue y golpea; ranged dispara y mantiene la distancia; boss tiene fases. */
  behavior: 'melee' | 'ranged' | 'boss';
  /** Acciones por ronda (el Cuervo de Sal se mueve dos veces; ataca como mucho una). */
  actionsPerTurn: number;
  /** Actúa una de cada N rondas (la Larva de Piedra es lenta). */
  actEvery: number;
  /** Primer sector en el que aparece y peso relativo de aparición. */
  minFloor: number;
  weight: number;
  /** No suelta monedas al caer (p. ej. los ecos que convoca el jefe). */
  noLoot?: boolean;
  /** Convocado en combate: no cuenta para despejar el sector. */
  summoned?: boolean;
  /** No actúa nunca (tablillas de sello): solo está ahí. */
  passive?: boolean;
  /** Solo 'ranged': alcance de disparo y distancia a la que intenta retroceder. */
  range?: number;
  keepAway?: number;
  /** Habilidades, por orden de prioridad (la primera disponible se usa). */
  skills?: SkillDef[];
  /** Solo 'boss'. Inmune a aturdimiento y empuje. */
  boss?: {
    dialogues: { intro: string; phase2: string; phase3: string; defeat: string };
    /** Reliquia que deja al caer. */
    relic: string;
    /** Convoca esto al entrar en la fase 3. */
    phaseSummon?: { enemy: string; count: number; text: string };
    /** Convoca esto al entrar en la fase 3. */
    /**
     * Escudo: al notarte (y de nuevo al cambiar de fase) alza `count` objetos (+1 en la fase 3) a su alrededor. Mientras quede
     * alguno en pie, el jefe no recibe daño ni quemaduras: hay que romperlos.
     */
    shield?: { enemy: string; count: number; text: string; brokenText: string };
    /**
     * Sustitución: el primer golpe que recibiría (y luego uno cada `cooldown` rondas) lo recibe una marioneta en su lugar; él
     * reaparece lejos y la marioneta estalla si te quedas cerca. Interrumpe lo que estuviera preparando.
     */
    substitute?: { enemy: string; cooldown: number; text: string };
    /** En la fase 3 se mueve el doble y prepara sus técnicas el doble de deprisa. */
    /** Fase desde la que se enfurece: una acción extra por ronda, enfriamientos al doble y ataques anunciados 1 ronda más rápidos. */
    frenzy?: number;
    /** Avanza despacio mientras estás lejos (una de cada dos rondas). */
    slowApproach?: boolean;
    /** Línea de registro al caer. */
    defeatText: string;
  };
}

const E = (d: EnemyDef): EnemyDef => d;

export const ENEMIES: Record<string, EnemyDef> = {
  // ---------- Monstruos ----------
  acechador_hollin: E({ id: 'acechador_hollin', name: 'Acechador de Hollín', family: 'monster', maxHp: 10, power: 4, defense: 0, aggroRange: 8, xp: 4, behavior: 'melee', actionsPerTurn: 1, actEvery: 1, minFloor: 1, weight: 4 }),
  cuervo_de_sal: E({ id: 'cuervo_de_sal', name: 'Cuervo de Sal', family: 'monster', maxHp: 5, power: 3, defense: 0, aggroRange: 10, xp: 3, behavior: 'melee', actionsPerTurn: 2, actEvery: 1, minFloor: 1, weight: 3 }),
  larva_de_piedra: E({ id: 'larva_de_piedra', name: 'Larva de Piedra', family: 'monster', maxHp: 16, power: 4, defense: 2, aggroRange: 6, xp: 6, behavior: 'melee', actionsPerTurn: 1, actEvery: 2, minFloor: 2, weight: 2 }),
  lobo_de_raiz: E({ id: 'lobo_de_raiz', name: 'Lobo de Raíz', family: 'monster', maxHp: 14, power: 4, defense: 0, aggroRange: 11, xp: 8, behavior: 'melee', actionsPerTurn: 2, actEvery: 1, minFloor: 4, weight: 2 }),
  espora_flotante: E({
    id: 'espora_flotante', name: 'Espora Flotante', family: 'monster', maxHp: 8, power: 3, defense: 0, aggroRange: 8, xp: 6, behavior: 'ranged', actionsPerTurn: 1, actEvery: 1, minFloor: 4, weight: 2, range: 4, keepAway: 3,
    skills: [{ id: 'nube_cegadora', name: 'Nube Cegadora', shape: { kind: 'zone', radius: 1, range: 5 }, power: 2, delay: 2, cooldown: 4, inflict: { status: 'ceguera', turns: 8 } }],
  }),

  // ---------- Shinobi ----------
  aprendiz_renegado: E({
    id: 'aprendiz_renegado', name: 'Aprendiz Renegado', family: 'shinobi', maxHp: 9, power: 4, defense: 0, aggroRange: 9, xp: 5, behavior: 'melee', actionsPerTurn: 1, actEvery: 1, minFloor: 1, weight: 3,
    skills: [{ id: 'lanzar_kunai', name: 'Lanzar kunai', shape: { kind: 'shot', range: 4 }, power: 3, delay: 0, cooldown: 4, minDist: 2, flavor: 'lanza un kunai' }],
  }),
  tirador_de_junco: E({ id: 'tirador_de_junco', name: 'Tirador de Junco', family: 'shinobi', maxHp: 7, power: 3, defense: 0, aggroRange: 9, xp: 5, behavior: 'ranged', actionsPerTurn: 1, actEvery: 1, minFloor: 2, weight: 3, range: 5, keepAway: 2 }),
  espadachin_de_laca: E({
    id: 'espadachin_de_laca', name: 'Espadachín de Laca', family: 'shinobi', maxHp: 15, power: 5, defense: 1, aggroRange: 8, xp: 8, behavior: 'melee', actionsPerTurn: 1, actEvery: 1, minFloor: 2, weight: 2,
    skills: [{ id: 'tajo_giratorio', name: 'Tajo Giratorio', shape: { kind: 'burst', radius: 1 }, power: 6, delay: 1, cooldown: 3 }],
  }),
  rastreador_hilo_gris: E({
    id: 'rastreador_hilo_gris', name: 'Rastreador del Hilo Gris', family: 'shinobi', maxHp: 11, power: 4, defense: 0, aggroRange: 11, xp: 7, behavior: 'melee', actionsPerTurn: 1, actEvery: 1, minFloor: 2, weight: 2,
    skills: [{ id: 'paso_fantasma', name: 'Paso Fantasma', shape: { kind: 'dash', range: 5 }, power: 0, delay: 0, cooldown: 5, minDist: 3, flavor: 'se esfuma y reaparece a tu lado' }],
  }),
  monje_hueco: E({
    id: 'monje_hueco', name: 'Monje Hueco', family: 'shinobi', maxHp: 12, power: 6, defense: 1, aggroRange: 8, xp: 8, behavior: 'melee', actionsPerTurn: 1, actEvery: 1, minFloor: 2, weight: 2,
    skills: [{ id: 'pulso_hueco', name: 'Pulso Hueco', shape: { kind: 'zone', radius: 1, range: 5 }, power: 6, delay: 2, cooldown: 0 }],
  }),
  acolito_de_la_campana: E({
    id: 'acolito_de_la_campana', name: 'Acólito de la Campana', family: 'shinobi', maxHp: 12, power: 5, defense: 0, aggroRange: 9, xp: 8, behavior: 'melee', actionsPerTurn: 1, actEvery: 1, minFloor: 3, weight: 2,
    skills: [{ id: 'cruz_de_plegaria', name: 'Cruz de Plegaria', shape: { kind: 'cross', length: 3, range: 5 }, power: 5, delay: 2, cooldown: 3 }],
  }),
  adepto_de_brasa: E({
    id: 'adepto_de_brasa', name: 'Adepto de la Brasa', family: 'shinobi', maxHp: 12, power: 5, defense: 0, aggroRange: 9, xp: 9, behavior: 'melee', actionsPerTurn: 1, actEvery: 1, minFloor: 4, weight: 2,
    skills: [{ id: 'aliento_de_brasa', name: 'Aliento de Brasa', shape: { kind: 'beam', length: 5 }, power: 6, delay: 1, cooldown: 4, inflict: { status: 'quemadura', turns: 2 } }],
  }),
  envenenador_de_raiz: E({
    id: 'envenenador_de_raiz', name: 'Envenenador de Raíz', family: 'shinobi', maxHp: 10, power: 3, defense: 0, aggroRange: 9, xp: 9, behavior: 'ranged', actionsPerTurn: 1, actEvery: 1, minFloor: 4, weight: 2, range: 5, keepAway: 3,
    skills: [{ id: 'senbon_envenenadas', name: 'Senbon envenenadas', shape: { kind: 'shot', range: 5 }, power: 2, delay: 0, cooldown: 3, minDist: 2, inflict: { status: 'veneno', turns: 4 }, flavor: 'te clava unas senbon envenenadas' }],
  }),
  sellador_invocador: E({
    id: 'sellador_invocador', name: 'Sellador Invocador', family: 'shinobi', maxHp: 12, power: 3, defense: 0, aggroRange: 9, xp: 10, behavior: 'melee', actionsPerTurn: 1, actEvery: 1, minFloor: 4, weight: 1,
    skills: [{ id: 'clones_de_niebla', name: 'Clones de Niebla', shape: { kind: 'summon', enemy: 'clon_de_niebla', count: 2 }, power: 0, delay: 0, cooldown: 12, minDist: 2 }],
  }),
  maestro_del_trueno: E({
    id: 'maestro_del_trueno', name: 'Maestro del Trueno', family: 'shinobi', maxHp: 15, power: 5, defense: 1, aggroRange: 10, xp: 12, behavior: 'melee', actionsPerTurn: 1, actEvery: 1, minFloor: 5, weight: 2,
    skills: [{ id: 'relampago_en_cruz', name: 'Relámpago en Cruz', shape: { kind: 'cross', length: 4, range: 6 }, power: 7, delay: 2, cooldown: 4 }],
  }),

  // ---------- Convocados (no cuentan para despejar) ----------
  eco_menor: E({ id: 'eco_menor', name: 'Eco Menor', family: 'echo', maxHp: 6, power: 3, defense: 0, aggroRange: 12, xp: 3, behavior: 'melee', actionsPerTurn: 1, actEvery: 1, minFloor: 99, weight: 0, noLoot: true, summoned: true }),
  clon_de_niebla: E({ id: 'clon_de_niebla', name: 'Clon de Niebla', family: 'echo', maxHp: 4, power: 3, defense: 0, aggroRange: 12, xp: 2, behavior: 'melee', actionsPerTurn: 1, actEvery: 1, minFloor: 99, weight: 0, noLoot: true, summoned: true }),

  tablilla_sello: E({ id: 'tablilla_sello', name: 'Tablilla de Sello', family: 'echo', maxHp: 9, power: 0, defense: 0, aggroRange: 0, xp: 0, behavior: 'melee', actionsPerTurn: 1, actEvery: 1, minFloor: 99, weight: 0, noLoot: true, summoned: true, passive: true }),
  marioneta_explosiva: E({
    id: 'marioneta_explosiva', name: 'Marioneta Explosiva', family: 'echo', maxHp: 6, power: 0, defense: 0, aggroRange: 0, xp: 0, behavior: 'melee', actionsPerTurn: 1, actEvery: 1, minFloor: 99, weight: 0, noLoot: true, summoned: true,
    skills: [{ id: 'estallido', name: 'Estallido de la marioneta', shape: { kind: 'burst', radius: 2 }, power: 11, delay: 1, cooldown: 99, selfDestruct: true, flavor: 'se hincha y se prepara a estallar' }],
  }),

  // ---------- Jefes shinobi ----------
  sokan_predicador: E({
    id: 'sokan_predicador', name: 'Sōkan, Predicador Hueco', family: 'shinobi', maxHp: 64, power: 8, defense: 2, aggroRange: 10, xp: 30, behavior: 'boss', actionsPerTurn: 1, actEvery: 1, minFloor: 99, weight: 0,
    skills: [
      { id: 'golpe_de_cayado', name: 'Golpe de Cayado', shape: { kind: 'burst', radius: 2 }, power: 10, delay: 2, cooldown: 3, pushPlayer: 3 },
      { id: 'mantra_hueco', name: 'Mantra Hueco', shape: { kind: 'zone', radius: 2, range: 6 }, power: 5, delay: 2, cooldown: 5, drainKiro: 6 },
      { id: 'onda_de_campana', name: 'Onda de Campana', shape: { kind: 'cross', length: 4, range: 7 }, power: 8, delay: 2, cooldown: 2, minPhase: 2 },
      { id: 'sello_hueco', name: 'Sello Hueco', shape: { kind: 'zone', radius: 1, range: 6 }, power: 9, delay: 2, cooldown: 2 },
    ],
    boss: {
      dialogues: { intro: 'sokan_intro', phase2: 'sokan_fase2', phase3: 'sokan_fase3', defeat: 'sokan_derrota' },
      relic: 'sello_antiguo',
      shield: {
        enemy: 'tablilla_sello',
        count: 2,
        text: 'Sōkan clava el cayado en el suelo: unas tablillas selladas brotan a su alrededor y una cortina de humo lo protege. ¡Rompe las tablillas!',
        brokenText: 'La última tablilla se hace astillas y la cortina de humo se deshace: ¡Sōkan queda al descubierto!',
      },
      slowApproach: true,
      frenzy: 3,
      defeatText: 'El cayado cae al suelo y las campanillas callan. Obtienes el Sello antiguo y la salida se abre.',
    },
  }),
  yugiri_hilo_roto: E({
    id: 'yugiri_hilo_roto', name: 'Yūgiri, el Hilo Roto', family: 'shinobi', maxHp: 130, power: 9, defense: 2, aggroRange: 12, xp: 45, behavior: 'boss', actionsPerTurn: 1, actEvery: 1, minFloor: 99, weight: 0,
    skills: [
      { id: 'tajo_de_hilo', name: 'Tajo de Hilo', shape: { kind: 'burst', radius: 1 }, power: 12, delay: 1, cooldown: 1 },
      { id: 'hilo_atrapador', name: 'Hilo Atrapador', shape: { kind: 'beam', length: 7 }, power: 6, delay: 1, cooldown: 4, pullPlayer: 6, flavor: 'lanza un hilo hacia ti' },
      { id: 'paso_fantasma_jefe', name: 'Paso Fantasma', shape: { kind: 'dash', range: 6 }, power: 0, delay: 0, cooldown: 4, minDist: 3, flavor: 'se desvanece entre los hilos y reaparece a tu lado' },
      { id: 'corte_de_hilo', name: 'Corte de Hilo', shape: { kind: 'beam', length: 6 }, power: 12, delay: 1, cooldown: 2 },
      { id: 'red_de_hilos', name: 'Red de Hilos', shape: { kind: 'cross', length: 5, range: 7 }, power: 7, delay: 2, cooldown: 5, minPhase: 2, inflict: { status: 'atado', turns: 2 } },
      { id: 'lluvia_de_senbon', name: 'Lluvia de Senbon', shape: { kind: 'zone', radius: 1, range: 6 }, power: 7, delay: 1, cooldown: 3, minPhase: 2, inflict: { status: 'veneno', turns: 4 } },
    ],
    boss: {
      dialogues: { intro: 'yugiri_intro', phase2: 'yugiri_fase2', phase3: 'yugiri_fase3', defeat: 'yugiri_derrota' },
      relic: 'carrete_roto',
      substitute: {
        enemy: 'marioneta_explosiva',
        cooldown: 8,
        text: 'Tu golpe solo alcanza a una marioneta: Yūgiri ya no está ahí. ¡La marioneta va a estallar, apártate!',
      },
      frenzy: 2,
      defeatText: 'Los hilos se aflojan de golpe. Yūgiri cae y su carrete rueda hasta tus pies: el camino queda libre.',
    },
  }),
};

/** Jefe que guarda el final de cada zona (sector → enemigo). El sector del jefe tiene la salida sellada mientras viva. */
export const BOSS_BY_FLOOR: Record<number, string> = { 3: 'sokan_predicador', 6: 'yugiri_hilo_roto' };
export const BOSS_FLOORS: readonly number[] = Object.keys(BOSS_BY_FLOOR).map(Number);
export const BOSS_ID = BOSS_BY_FLOOR[3];
export const isBossFloor = (floor: number): boolean => Object.hasOwn(BOSS_BY_FLOOR, floor);

export function getEnemy(id: string): EnemyDef | undefined {
  return Object.hasOwn(ENEMIES, id) ? ENEMIES[id] : undefined;
}
