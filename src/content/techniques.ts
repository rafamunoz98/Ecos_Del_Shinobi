import type { Affinity, StatusId } from '../core/types';

/**
 * Forma de la técnica (cómo se apunta y qué casillas afecta):
 *  area     centrada en una casilla visible dentro del alcance; areaRadius 0 = una casilla.
 *  line     desde el jugador en línea recta (cardinal o diagonal), hasta `length`, parando en obstáculos.
 *  burst    explosión alrededor del jugador, sin apuntar.
 *  self     solo el jugador, sin apuntar.
 *  blink    desplazamiento instantáneo del jugador a una casilla libre visible.
 *  barrier  tres casillas en perpendicular a la dirección de lanzamiento, alrededor del objetivo.
 *  dash     carrera en línea recta hasta `length` casillas: te detienes ante el primer enemigo u obstáculo y lo golpeas.
 * `shape` (area y burst): 'diamond' (distancia en cruz, por defecto) o 'square' (incluye las diagonales).
 */
export type TechniqueShape = 'diamond' | 'square';
export type TechniqueTarget =
  | { kind: 'area'; range: number; areaRadius: number; lineOfSight: boolean; shape?: TechniqueShape }
  | { kind: 'line'; length: number }
  | { kind: 'burst'; radius: number; shape?: TechniqueShape }
  | { kind: 'self' }
  | { kind: 'blink'; range: number }
  | { kind: 'barrier'; range: number }
  | { kind: 'dash'; length: number };

export interface TechniqueDef {
  id: string;
  name: string;
  /** null = técnica común a todos los shinobi (solo se aprende, no se desbloquea por nivel). */
  affinity: Affinity | null;
  /** Nivel del jugador al que se desbloquea solo (1-5). Las aprendibles llevan 99: se encuentran en manuales o las enseña un maestro. */
  minLevel: number;
  /** Se aprende con un manual o un maestro (no por nivel). */
  learnable?: boolean;
  /** Fusión de dos afinidades: solo la aprende (y usa) quien domina las dos. */
  fusion?: readonly [Affinity, Affinity];
  /** Derriba los muros agrietados pegados a la zona que alcanza. */
  breaksWalls?: boolean;
  kiroCost: number;
  target: TechniqueTarget;
  /** Daño = max(1, power + bonus de nivel - defensa); con ignoreDefense no resta defensa. */
  damage?: { power: number; ignoreDefense?: boolean };
  /** Estado que reciben los enemigos alcanzados. */
  inflict?: { status: StatusId; turns: number };
  /** Estado que recibe el jugador al lanzarla. */
  selfStatus?: { status: StatusId; turns: number };
  /** Casillas que empuja a los alcanzados, alejándolos del jugador. */
  push?: number;
  /** Casillas que arrastra a los alcanzados hacia el jugador. */
  pull?: number;
  /** Vida y kiro que recuperas, y vida que pagas al lanzarla. */
  heal?: number;
  restoreKiro?: number;
  selfDamage?: number;
  /** Deja un tronco señuelo en la casilla que abandonas (sustitución): los enemigos que te persiguen lo atacan a él. */
  leaveDecoy?: { turns: number };
  /** Invoca aliados (clones de sombra...) a tu lado. */
  summon?: { kind: string; count: number; turns: number };
  /** Turnos que dura cada casilla de barrera. */
  barrierTurns?: number;
  description: string;
}

/*
 * Cada afinidad tiene CINCO técnicas que se desbloquean por nivel (1 al 5: se obtienen al despejar sectores) y TRES más que hay
 * que aprender (manuales, maestros o jefes). Solo se pueden llevar equipadas BALANCE.techniqueSlots; las demás quedan en el
 * grimorio y se cambian por una equipada (gasta un turno).
 *  Ascua    daño y zonas persistentes   · Marea    control, protección y curación
 *  Vendaval alcance y movilidad         · Piedra   defensa, terreno y aturdimiento
 *  Rayo     precisión e interrupción
 * Además hay técnicas comunes (afinidad null) que cualquiera puede aprender.
 */
export const TECHNIQUES: Record<string, TechniqueDef> = {};

/** Registra una lista de técnicas (más cómodo de escribir que un objeto con el id repetido). */
function define(defs: TechniqueDef[]): void {
  for (const d of defs) TECHNIQUES[d.id] = d;
}

const L = 99; // nivel de las técnicas que solo se aprenden

define([
  // ---------- Ascua ----------
  {
    id: 'brasa_circular', name: 'Brasa Circular', affinity: 'ascua', minLevel: 1, kiroCost: 3,
    target: { kind: 'area', range: 4, areaRadius: 1, lineOfSight: true },
    damage: { power: 6 }, inflict: { status: 'quemadura', turns: 3 },
    description: 'Estalla una brasa en la casilla elegida y a su alrededor; los alcanzados arden.',
  },
  {
    id: 'aliento_ardiente', name: 'Aliento Ardiente', affinity: 'ascua', minLevel: 2, kiroCost: 2,
    target: { kind: 'line', length: 3 },
    damage: { power: 4 }, inflict: { status: 'quemadura', turns: 2 },
    description: 'Un soplo de fuego corto en línea recta: barato, y deja a los alcanzados ardiendo.',
  },
  {
    id: 'lengua_de_fuego', name: 'Lengua de Fuego', affinity: 'ascua', minLevel: 3, kiroCost: 4,
    target: { kind: 'line', length: 5 },
    damage: { power: 8 }, inflict: { status: 'quemadura', turns: 2 },
    description: 'Una ráfaga de llamas recorre una línea recta y prende a todo lo que toca.',
  },
  {
    id: 'lluvia_de_chispas', name: 'Lluvia de Chispas', affinity: 'ascua', minLevel: 4, kiroCost: 5,
    target: { kind: 'area', range: 5, areaRadius: 2, lineOfSight: true },
    damage: { power: 5 }, inflict: { status: 'quemadura', turns: 2 },
    description: 'Una lluvia de chispas cubre un área de radio 2: ideal contra grupos.',
  },
  {
    id: 'pulso_del_crater', breaksWalls: true, name: 'Pulso del Cráter', affinity: 'ascua', minLevel: 5, kiroCost: 6,
    target: { kind: 'burst', radius: 2 },
    damage: { power: 9 }, inflict: { status: 'quemadura', turns: 3 },
    description: 'Una explosión de brasas a tu alrededor (radio 2): mucho daño y quemadura larga.',
  },
  {
    id: 'pira_del_condenado', name: 'Pira del Condenado', affinity: 'ascua', minLevel: L, learnable: true, kiroCost: 3,
    target: { kind: 'area', range: 4, areaRadius: 1, lineOfSight: true },
    damage: { power: 4 }, inflict: { status: 'vulnerable', turns: 4 },
    description: 'Marca a los alcanzados con una pira: reciben daño y su defensa baja 2 durante 4 rondas.',
  },
  {
    id: 'furia_ardiente', name: 'Furia Ardiente', affinity: 'ascua', minLevel: L, learnable: true, kiroCost: 3,
    target: { kind: 'self' }, selfStatus: { status: 'potenciado', turns: 5 },
    description: 'Tu kiro arde en las manos: +2 de poder durante 5 rondas.',
  },
  {
    id: 'aliento_del_dragon', breaksWalls: true, name: 'Aliento del Dragón de Ceniza', affinity: 'ascua', minLevel: L, learnable: true, kiroCost: 8,
    target: { kind: 'burst', radius: 3 },
    damage: { power: 7 }, inflict: { status: 'quemadura', turns: 3 },
    description: 'Tu técnica más devastadora: un halo de fuego de radio 3 que prende a todo lo que te rodea.',
  },

  // ---------- Marea ----------
  {
    id: 'velo_de_corriente', name: 'Velo de Corriente', affinity: 'marea', minLevel: 1, kiroCost: 2,
    target: { kind: 'self' }, selfStatus: { status: 'protegido', turns: 4 },
    description: 'Una corriente fina te envuelve: +2 de defensa durante 3 rondas.',
  },
  {
    id: 'aguja_de_agua', name: 'Aguja de Agua', affinity: 'marea', minLevel: 2, kiroCost: 2,
    target: { kind: 'area', range: 5, areaRadius: 0, lineOfSight: true },
    damage: { power: 4, ignoreDefense: true }, inflict: { status: 'ralentizado', turns: 3 },
    description: 'Un hilo de agua a presión que ignora la defensa y ralentiza al objetivo (actúa una de cada dos rondas).',
  },
  {
    id: 'ola_empujadora', name: 'Ola Empujadora', affinity: 'marea', minLevel: 3, kiroCost: 3,
    target: { kind: 'line', length: 4 },
    damage: { power: 3 }, push: 2,
    description: 'Una ola golpea en línea y empuja 2 casillas; chocar con un obstáculo duele más.',
  },
  {
    id: 'rocio_restaurador', name: 'Rocío Restaurador', affinity: 'marea', minLevel: 4, kiroCost: 4,
    target: { kind: 'self' }, heal: 8,
    description: 'Un rocío tibio cierra tus heridas: recuperas 8 de vida.',
  },
  {
    id: 'torrente', name: 'Torrente', affinity: 'marea', minLevel: 5, kiroCost: 5,
    target: { kind: 'line', length: 5 },
    damage: { power: 6 }, push: 3,
    description: 'Un torrente arrasa una línea de 5 casillas y empuja 3 a quien alcanza.',
  },
  {
    id: 'carcel_de_agua', name: 'Cárcel de Agua', affinity: 'marea', minLevel: L, learnable: true, kiroCost: 3,
    target: { kind: 'area', range: 4, areaRadius: 1, lineOfSight: true },
    inflict: { status: 'atado', turns: 3 },
    description: 'Esferas de agua atrapan a los alcanzados: no pueden moverse durante 3 rondas (aún atacan lo que tengan al lado).',
  },
  {
    id: 'niebla_densa', name: 'Niebla Densa', affinity: 'marea', minLevel: L, learnable: true, kiroCost: 3,
    target: { kind: 'self' }, selfStatus: { status: 'sigilo', turns: 5 },
    description: 'Una niebla te cubre: los enemigos no te notan (salvo que estén pegados a ti) durante 5 rondas.',
  },
  {
    id: 'diluvio', name: 'Diluvio', affinity: 'marea', minLevel: L, learnable: true, kiroCost: 6,
    target: { kind: 'burst', radius: 2, shape: 'square' },
    damage: { power: 4 }, push: 2, inflict: { status: 'ralentizado', turns: 3 },
    description: 'Una crecida a tu alrededor: daña, empuja y ralentiza a todos los que te rodean.',
  },

  // ---------- Vendaval ----------
  {
    id: 'corte_de_aire', name: 'Corte de Aire', affinity: 'vendaval', minLevel: 1, kiroCost: 2,
    target: { kind: 'line', length: 6 },
    damage: { power: 5 },
    description: 'Un tajo de viento recorre una línea larga y hiere a todos los que encuentra.',
  },
  {
    id: 'paso_de_rafaga', name: 'Paso de Ráfaga', affinity: 'vendaval', minLevel: 2, kiroCost: 2,
    target: { kind: 'blink', range: 4 },
    description: 'Una ráfaga te lleva al instante a una casilla libre que veas, hasta 4 de distancia.',
  },
  {
    id: 'lanzada_de_viento', name: 'Lanzada de Viento', affinity: 'vendaval', minLevel: 3, kiroCost: 3,
    target: { kind: 'dash', length: 4 },
    damage: { power: 6 },
    description: 'Te lanzas en línea recta hasta 4 casillas y golpeas al primer enemigo que encuentres.',
  },
  {
    id: 'ciclon', name: 'Ciclón', affinity: 'vendaval', minLevel: 4, kiroCost: 3,
    target: { kind: 'burst', radius: 1, shape: 'square' },
    damage: { power: 4 }, push: 2,
    description: 'Giras sobre ti mismo: los ocho vecinos reciben daño y salen despedidos 2 casillas.',
  },
  {
    id: 'tajo_del_torbellino', name: 'Tajo del Torbellino', affinity: 'vendaval', minLevel: 5, kiroCost: 5,
    target: { kind: 'burst', radius: 2, shape: 'square' },
    damage: { power: 7 },
    description: 'Un torbellino de cortes con radio 2 (incluye las diagonales).',
  },
  {
    id: 'vuelo_de_cuervo', name: 'Vuelo de Cuervo', affinity: 'vendaval', minLevel: L, learnable: true, kiroCost: 3,
    target: { kind: 'blink', range: 7 },
    description: 'Planeas hasta una casilla libre que veas, hasta 7 de distancia.',
  },
  {
    id: 'viento_cortante', name: 'Viento Cortante', affinity: 'vendaval', minLevel: L, learnable: true, kiroCost: 4,
    target: { kind: 'area', range: 6, areaRadius: 1, lineOfSight: true },
    damage: { power: 5 }, inflict: { status: 'vulnerable', turns: 3 },
    description: 'Cuchillas de aire que dañan y dejan a los alcanzados con 2 menos de defensa durante 3 rondas.',
  },
  {
    id: 'remolino', name: 'Remolino', affinity: 'vendaval', minLevel: L, learnable: true, kiroCost: 4,
    target: { kind: 'burst', radius: 3 },
    damage: { power: 2 }, pull: 2,
    description: 'Un remolino arrastra a los enemigos cercanos (radio 3) dos casillas hacia ti.',
  },

  // ---------- Piedra ----------
  {
    id: 'muro_de_pizarra', name: 'Muro de Pizarra', affinity: 'piedra', minLevel: 1, kiroCost: 3,
    target: { kind: 'barrier', range: 4 }, barrierTurns: 6,
    description: 'Alza un muro de tres casillas durante 6 rondas. Nadie pasa, tampoco los enemigos.',
  },
  {
    id: 'piel_de_roca', name: 'Piel de Roca', affinity: 'piedra', minLevel: 2, kiroCost: 3,
    target: { kind: 'self' }, selfStatus: { status: 'protegido', turns: 8 },
    description: 'Tu piel se endurece como la roca: +2 de defensa durante 7 rondas.',
  },
  {
    id: 'golpe_sismico', breaksWalls: true, name: 'Golpe Sísmico', affinity: 'piedra', minLevel: 3, kiroCost: 4,
    target: { kind: 'burst', radius: 1 },
    damage: { power: 5 }, inflict: { status: 'aturdido', turns: 1 },
    description: 'Pisas con fuerza: los adyacentes reciben daño y pierden su próxima acción.',
  },
  {
    id: 'lanza_de_roca', name: 'Lanza de Roca', affinity: 'piedra', minLevel: 4, kiroCost: 4,
    target: { kind: 'line', length: 4 },
    damage: { power: 7 }, inflict: { status: 'atado', turns: 2 },
    description: 'Una lanza de roca brota del suelo en línea: daña y clava a los alcanzados al suelo 2 rondas.',
  },
  {
    id: 'derrumbe', breaksWalls: true, name: 'Derrumbe', affinity: 'piedra', minLevel: 5, kiroCost: 6,
    target: { kind: 'area', range: 5, areaRadius: 2, lineOfSight: true },
    damage: { power: 7 }, inflict: { status: 'aturdido', turns: 1 },
    description: 'El techo se viene abajo sobre un área de radio 2: daño fuerte y aturdimiento.',
  },
  {
    id: 'lanzar_roca', name: 'Lanzar Roca', affinity: 'piedra', minLevel: L, learnable: true, kiroCost: 3,
    target: { kind: 'area', range: 6, areaRadius: 0, lineOfSight: true },
    damage: { power: 8 }, push: 1,
    description: 'Arrancas una roca del suelo y la lanzas contra un objetivo a la vista (hasta 6 casillas): mucho daño y lo empuja una casilla.',
  },
  {
    id: 'puno_de_granito', breaksWalls: true, name: 'Puño de Granito', affinity: 'piedra', minLevel: L, learnable: true, kiroCost: 4,
    target: { kind: 'burst', radius: 1, shape: 'square' },
    damage: { power: 9 }, push: 1,
    description: 'Un puñetazo de roca que golpea a los ocho vecinos con mucha fuerza y los aparta una casilla.',
  },
  {
    id: 'temblor_profundo', breaksWalls: true, name: 'Temblor Profundo', affinity: 'piedra', minLevel: L, learnable: true, kiroCost: 5,
    target: { kind: 'burst', radius: 3 },
    damage: { power: 3 }, inflict: { status: 'ralentizado', turns: 3 },
    description: 'El suelo tiembla en radio 3: daña a todos y los ralentiza.',
  },

  // ---------- Rayo ----------
  {
    id: 'aguja_resonante', name: 'Aguja Resonante', affinity: 'rayo', minLevel: 1, kiroCost: 3,
    target: { kind: 'area', range: 5, areaRadius: 0, lineOfSight: true },
    damage: { power: 5, ignoreDefense: true }, inflict: { status: 'aturdido', turns: 1 },
    description: 'Un pinchazo preciso que ignora la defensa e interrumpe la próxima acción del objetivo.',
  },
  {
    id: 'chispazo', name: 'Chispazo', affinity: 'rayo', minLevel: 2, kiroCost: 2,
    target: { kind: 'burst', radius: 1, shape: 'square' },
    damage: { power: 4, ignoreDefense: true },
    description: 'Una chispa salta a los ocho vecinos: barata, y no la frena la defensa.',
  },
  {
    id: 'descarga_estatica', name: 'Descarga Estática', affinity: 'rayo', minLevel: 3, kiroCost: 4,
    target: { kind: 'burst', radius: 2 },
    damage: { power: 4, ignoreDefense: true },
    description: 'Un estallido de chispas a tu alrededor (radio 2) que ignora la defensa.',
  },
  {
    id: 'relampago', name: 'Relámpago', affinity: 'rayo', minLevel: 4, kiroCost: 5,
    target: { kind: 'line', length: 8 },
    damage: { power: 7, ignoreDefense: true },
    description: 'Un rayo cruza hasta 8 casillas en línea recta e ignora la defensa de todo lo que toca.',
  },
  {
    id: 'tormenta_cercana', name: 'Tormenta Cercana', affinity: 'rayo', minLevel: 5, kiroCost: 7,
    target: { kind: 'burst', radius: 3 },
    damage: { power: 6, ignoreDefense: true }, inflict: { status: 'aturdido', turns: 1 },
    description: 'Una tormenta eléctrica de radio 3: daña, ignora la defensa y aturde a todos.',
  },
  {
    id: 'paso_relampago', name: 'Paso Relámpago', affinity: 'rayo', minLevel: L, learnable: true, kiroCost: 3,
    target: { kind: 'blink', range: 5 }, selfStatus: { status: 'potenciado', turns: 3 },
    description: 'Te desplazas como un rayo hasta 5 casillas y tu siguiente golpe (3 rondas) llega con +2 de poder.',
  },
  {
    id: 'red_de_rayos', name: 'Red de Rayos', affinity: 'rayo', minLevel: L, learnable: true, kiroCost: 4,
    target: { kind: 'area', range: 5, areaRadius: 1, lineOfSight: true },
    damage: { power: 4, ignoreDefense: true }, inflict: { status: 'atado', turns: 3 },
    description: 'Una red de rayos cae sobre un área de radio 1: daña ignorando defensa e inmoviliza 3 rondas.',
  },
  {
    id: 'carga_interior', name: 'Carga Interior', affinity: 'rayo', minLevel: L, learnable: true, kiroCost: 0,
    target: { kind: 'self' }, restoreKiro: 6, selfDamage: 3,
    description: 'Conviertes tu propia vitalidad en energía: pagas 3 de vida y recuperas 6 de kiro.',
  },

  // ---------- Comunes ----------
  {
    id: 'clon_de_sombra', name: 'Clon de Sombra', affinity: null, minLevel: L, learnable: true, kiroCost: 4,
    target: { kind: 'self' }, summon: { kind: 'clon_de_sombra', count: 1, turns: 10 },
    description: 'Creas un clon de humo que lucha a tu lado durante 10 rondas.',
  },
  {
    id: 'sustitucion', name: 'Sustitución', affinity: null, minLevel: L, learnable: true, kiroCost: 4,
    target: { kind: 'blink', range: 4 }, leaveDecoy: { turns: 8 },
    description: 'Dejas un tronco en tu lugar y reapareces hasta 4 casillas más allá: los enemigos que te persiguen se ensañan con el tronco (8 rondas o 10 de vida).',
  },
]);

export function getTechnique(id: string): TechniqueDef | undefined {
  return Object.hasOwn(TECHNIQUES, id) ? TECHNIQUES[id] : undefined;
}

/** Afinidades que domina un jugador: la de partida y, tras el primer jefe, la segunda. */
export function affinitiesOf(p: { affinity: Affinity; affinity2: Affinity | null }): Affinity[] {
  return p.affinity2 ? [p.affinity, p.affinity2] : [p.affinity];
}

/** Técnicas de una afinidad que se desbloquean por nivel hasta un nivel dado, en orden de definición. */
export function techniquesFor(affinity: Affinity, level: number): string[] {
  return Object.values(TECHNIQUES)
    .filter((t) => t.affinity === affinity && !t.learnable && t.minLevel <= level)
    .map((t) => t.id);
}

/** Técnicas que hay que aprender (manuales, maestros, jefes) para una afinidad (o varias), incluidas las comunes. */
export function learnableFor(affinity: Affinity | readonly Affinity[]): string[] {
  const list = typeof affinity === 'string' ? [affinity] : affinity;
  return Object.values(TECHNIQUES)
    .filter((t) => t.learnable && (t.affinity === null || list.includes(t.affinity)))
    .map((t) => t.id);
}

/** ¿Hay que elegir una casilla antes de lanzarla? */
export function needsAim(def: TechniqueDef): boolean {
  return def.target.kind === 'area' || def.target.kind === 'line' || def.target.kind === 'blink' || def.target.kind === 'barrier' || def.target.kind === 'dash';
}
