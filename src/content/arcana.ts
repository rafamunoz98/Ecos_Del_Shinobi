/*
 * Pociones y pergaminos sin identificar (inspirados en Pixel Dungeon, con motivos de ninjutsu).
 * En cada partida cada efecto recibe una apariencia al azar («poción ámbar», «pergamino Kan»). Hasta que usas una,
 * no sabes qué hace; al usarla se identifica ese efecto para el resto de la expedición. Además cada afinidad
 * conoce de entrada una poción y un pergamino (ver STARTING_KNOWN).
 */
import type { Affinity } from '../core/types';

export type PotionEffect =
  | { kind: 'heal'; amount: number; cleanse?: boolean }
  | { kind: 'kiro'; amount: number }
  | { kind: 'strength' }
  | { kind: 'status'; status: 'sigilo' | 'regeneracion' | 'protegido' | 'veneno' | 'ceguera' | 'quemadura' | 'levitando'; turns: number }
  | { kind: 'reveal' }
  | { kind: 'alarm' };

export type ScrollEffect =
  | { kind: 'summon'; ally: string; count: number; turns: number }
  | { kind: 'teleport' }
  | { kind: 'reveal' }
  | { kind: 'purify' }
  | { kind: 'blast'; radius: number; power: number }
  | { kind: 'bind'; turns: number }
  | { kind: 'stun'; turns: number }
  | { kind: 'upgrade' }
  | { kind: 'identify' }
  | { kind: 'alarm' };

/**
 * Qué hace una poción al LANZARLA (se rompe en la casilla de impacto y afecta a un área). Las que no tienen efecto arrojadizo
 * (las buenas) se derraman sin más y siguen sin identificar: lanzar para probar sale barato con las malas y caro con las buenas.
 */
export type ThrownEffect =
  | { kind: 'fire'; burnTurns: number }
  | { kind: 'poison'; turns: number }
  | { kind: 'blind'; turns: number }
  | { kind: 'lure' };

export interface ArcanaDef<E> {
  id: string;
  /** Nombre verdadero (cuando está identificado). */
  name: string;
  description: string;
  good: boolean;
  /** Peso de aparición. */
  weight: number;
  /** Precio base en la tienda (monedas). */
  price: number;
  effect: E;
  /** Solo pociones: efecto al lanzarla. */
  thrown?: ThrownEffect;
}

export const POTION_PREFIX = 'pocion:';
export const SCROLL_PREFIX = 'pergamino:';
/** Ids de botín que se resuelven al recoger: sortean un efecto concreto (como el manual de técnica). */
export const RANDOM_POTION = 'pocion_azar';
export const RANDOM_SCROLL = 'pergamino_azar';

export const POTIONS: Record<string, ArcanaDef<PotionEffect>> = Object.fromEntries(
  (
    [
      { id: 'sanacion', name: 'Poción de Sanación', description: 'Cierra las heridas: recuperas 15 de vida y te libras de quemaduras y venenos.', good: true, weight: 8, price: 14, effect: { kind: 'heal', amount: 15, cleanse: true } },
      { id: 'kiro_mayor', name: 'Poción de Kiro Mayor', description: 'Recuperas 12 de kiro.', good: true, weight: 6, price: 12, effect: { kind: 'kiro', amount: 12 } },
      { id: 'fuerza', name: 'Poción de Fuerza', description: 'Un brebaje espeso que endurece los músculos: +1 de Fuerza para siempre (las armas pesadas exigen Fuerza). Solo hay una por jefe, antes de llegar a él.', good: true, weight: 0, price: 60, effect: { kind: 'strength' } },
      { id: 'levitacion', name: 'Poción de Levitación', description: 'Flotas sobre el suelo durante 12 rondas: cruzas precipicios sin caer y no pisas fuego ni charcos. Si se acaba sobre un vacío, caes.', good: true, weight: 3, price: 14, effect: { kind: 'status', status: 'levitando', turns: 12 } },
      { id: 'sombra', name: 'Poción de Sombra', description: 'Durante 20 rondas los enemigos solo te notan si están pegados a ti.', good: true, weight: 3, price: 12, effect: { kind: 'status', status: 'sigilo', turns: 20 } },
      { id: 'regeneracion', name: 'Poción de Savia', description: 'Recuperas 1 de vida por ronda durante 15 rondas.', good: true, weight: 4, price: 10, effect: { kind: 'status', status: 'regeneracion', turns: 15 } },
      { id: 'piel_roca', name: 'Poción de Piel de Roca', description: 'Tu defensa sube +2 durante 25 rondas.', good: true, weight: 3, price: 10, effect: { kind: 'status', status: 'protegido', turns: 25 } },
      { id: 'ojo_blanco', name: 'Poción de Ojo Blanco', description: 'Tu mirada atraviesa las paredes: revelas todo el mapa del sector.', good: true, weight: 3, price: 12, effect: { kind: 'reveal' } },
      { id: 'veneno', name: 'Poción de Hiel', description: 'Veneno puro: si la bebes, pierdes vida cada ronda durante 6 rondas. Lánzala: envenena a todos en un área de radio 1.', good: false, weight: 3, price: 4, effect: { kind: 'status', status: 'veneno', turns: 6 }, thrown: { kind: 'poison', turns: 6 } },
      { id: 'niebla_oscura', name: 'Poción de Niebla Oscura', description: 'Una niebla negra te nubla la vista durante 15 rondas si la bebes. Lánzala: ciega a todos en un área de radio 1.', good: false, weight: 3, price: 4, effect: { kind: 'status', status: 'ceguera', turns: 15 }, thrown: { kind: 'blind', turns: 8 } },
      { id: 'ignea', name: 'Poción Ígnea', description: 'Aliento de fuego: si la bebes, prendes en llamas durante 3 rondas. Lánzala: incendia a todos en un área de radio 1.', good: false, weight: 2, price: 4, effect: { kind: 'status', status: 'quemadura', turns: 3 }, thrown: { kind: 'fire', burnTurns: 3 } },
      { id: 'estridente', name: 'Poción Estridente', description: 'Un silbido agudo: si la bebes, todos los enemigos del sector sabrán dónde estás. Lánzala lejos para atraerlos hacia donde cae.', good: false, weight: 2, price: 4, effect: { kind: 'alarm' }, thrown: { kind: 'lure' } },
    ] as ArcanaDef<PotionEffect>[]
  ).map((d) => [d.id, d]),
);

export const SCROLLS: Record<string, ArcanaDef<ScrollEffect>> = Object.fromEntries(
  (
    [
      { id: 'invocacion_sapo', name: 'Pergamino de Invocación: Sapo', description: 'Sellas con sangre y aparece un sapo de piedra que combate a tu lado 15 rondas.', good: true, weight: 4, price: 16, effect: { kind: 'summon', ally: 'sapo_de_piedra', count: 1, turns: 15 } },
      { id: 'invocacion_cuervos', name: 'Pergamino de Invocación: Cuervos', description: 'Dos cuervos veloces te acompañan 12 rondas.', good: true, weight: 4, price: 16, effect: { kind: 'summon', ally: 'cuervo_aliado', count: 2, turns: 12 } },
      { id: 'clones', name: 'Pergamino de Clones', description: 'Dos clones de sombra luchan a tu lado 8 rondas.', good: true, weight: 4, price: 14, effect: { kind: 'summon', ally: 'clon_de_sombra', count: 2, turns: 8 } },
      { id: 'sustitucion', name: 'Pergamino de Sustitución', description: 'Dejas un tronco señuelo (8 rondas) y reapareces en otro punto explorado del sector; los perseguidores se ensañan con el tronco y pierden tu rastro.', good: true, weight: 4, price: 12, effect: { kind: 'teleport' } },
      { id: 'cartografia', name: 'Pergamino de Cartografía', description: 'Un mapa dibujado por el viento: revela todo el sector.', good: true, weight: 4, price: 12, effect: { kind: 'reveal' } },
      { id: 'purificacion', name: 'Sello de Purificación', description: 'Rompe las maldiciones del arma y la vestimenta que llevas puestas.', good: true, weight: 3, price: 18, effect: { kind: 'purify' } },
      { id: 'explosivo', name: 'Sello Explosivo', description: 'Estalla a tu alrededor: 8 de daño (ignora defensa) a los enemigos a ≤3 casillas con línea de visión.', good: true, weight: 4, price: 14, effect: { kind: 'blast', radius: 3, power: 8 } },
      { id: 'inmovil', name: 'Sello de Inmovilidad', description: 'Ata las sombras de los enemigos que ves durante 5 rondas (los jefes se resisten).', good: true, weight: 3, price: 14, effect: { kind: 'bind', turns: 5 } },
      { id: 'genjutsu', name: 'Pergamino de Genjutsu', description: 'Una ilusión aturde a los enemigos que ves durante 4 rondas (los jefes se resisten).', good: true, weight: 3, price: 14, effect: { kind: 'stun', turns: 4 } },
      { id: 'refuerzo', name: 'Pergamino de Refuerzo', description: 'Tu arma equipada gana un nivel de forja gratis.', good: true, weight: 2, price: 24, effect: { kind: 'upgrade' } },
      { id: 'revelacion', name: 'Pergamino de Revelación', description: 'Identifica todo tu equipo y una poción o pergamino desconocido.', good: true, weight: 3, price: 14, effect: { kind: 'identify' } },
      { id: 'estruendo', name: 'Pergamino de Estruendo', description: 'Un trueno sin tormenta: todos los enemigos del sector sabrán dónde estás.', good: false, weight: 3, price: 4, effect: { kind: 'alarm' } },
    ] as ArcanaDef<ScrollEffect>[]
  ).map((d) => [d.id, d]),
);

const POTION_LOOKS = ['turbia', 'ámbar', 'carmesí', 'jade', 'violeta', 'marfil', 'índigo', 'ceniza', 'azafrán', 'cobalto', 'ébano', 'coral', 'perla', 'ocre'];
const SCROLL_LOOKS = ['Kan', 'Rin', 'Tō', 'Sen', 'Mei', 'Shō', 'Gen', 'Hō', 'Zan', 'Ryū', 'Kō', 'Ten'];

export const isPotion = (id: string): boolean => id.startsWith(POTION_PREFIX);
export const isScroll = (id: string): boolean => id.startsWith(SCROLL_PREFIX);
export const isArcana = (id: string): boolean => isPotion(id) || isScroll(id);

export function getPotion(id: string): ArcanaDef<PotionEffect> | undefined {
  const k = id.startsWith(POTION_PREFIX) ? id.slice(POTION_PREFIX.length) : id;
  return Object.hasOwn(POTIONS, k) ? POTIONS[k] : undefined;
}
export function getScroll(id: string): ArcanaDef<ScrollEffect> | undefined {
  const k = id.startsWith(SCROLL_PREFIX) ? id.slice(SCROLL_PREFIX.length) : id;
  return Object.hasOwn(SCROLLS, k) ? SCROLLS[k] : undefined;
}
export function getArcana(id: string): ArcanaDef<PotionEffect | ScrollEffect> | undefined {
  return isPotion(id) ? getPotion(id) : isScroll(id) ? getScroll(id) : undefined;
}

/** Lo que cada afinidad ya sabe reconocer al empezar: una poción y un pergamino. */
export const STARTING_KNOWN: Record<Affinity, readonly string[]> = {
  ascua: ['pocion:ignea', 'pergamino:explosivo'],
  marea: ['pocion:sanacion', 'pergamino:purificacion'],
  vendaval: ['pocion:sombra', 'pergamino:sustitucion'],
  piedra: ['pocion:piel_roca', 'pergamino:invocacion_sapo'],
  rayo: ['pocion:kiro_mayor', 'pergamino:inmovil'],
};

/** Lo que todo shinobi reconoce desde el principio, sea cual sea su afinidad: la Poción de Fuerza (las hay aseguradas) y la de Levitación. */
export const ALWAYS_KNOWN: readonly string[] = ['pocion:fuerza'];

/** Reparte las apariencias al azar. `random` devuelve [0,1) y avanza el generador de la partida. */
export function shuffleAppearances(random: () => number): Record<string, string> {
  const out: Record<string, string> = {};
  const deal = (ids: string[], looks: string[], prefix: string, label: (look: string) => string) => {
    const pool = [...looks];
    for (const id of ids) {
      const i = Math.floor(random() * pool.length);
      out[prefix + id] = label(pool.splice(i, 1)[0]);
    }
  };
  deal(Object.keys(POTIONS), POTION_LOOKS, POTION_PREFIX, (l) => `Poción ${l}`);
  deal(Object.keys(SCROLLS), SCROLL_LOOKS, SCROLL_PREFIX, (l) => `Pergamino «${l}»`);
  return out;
}

/** Elige un efecto según su peso. `u` ∈ [0,1). */
export function rollArcana(kind: 'potion' | 'scroll', u: number): string {
  const table = kind === 'potion' ? POTIONS : SCROLLS;
  const prefix = kind === 'potion' ? POTION_PREFIX : SCROLL_PREFIX;
  const total = Object.values(table).reduce((n, d) => n + d.weight, 0);
  let r = u * total;
  for (const d of Object.values(table)) {
    r -= d.weight;
    if (r < 0) return prefix + d.id;
  }
  return prefix + Object.keys(table)[0];
}
