import { mixSeed, Rng } from '../core/rng';

/*
 * Joyas: anillos y colgantes. Cada uno ocupa un hueco propio (un anillo y un colgante a la vez) y da efectos pasivos mientras
 * lo llevas puesto. Como el resto del equipo, vienen SIN IDENTIFICAR: se ven por su aspecto («Anillo de jade (?)», distinto en cada
 * partida) hasta que te lo pones. Algunas están MALDITAS: tienen una parte buena y otra mala, y se quedan pegadas al cuerpo hasta
 * que se purifican (Sello de Purificación o forja); purificada, pierde la parte mala y se conserva la buena.
 */
export type TrinketSlot = 'ring' | 'pendant';

/** Efectos numéricos (se suman entre sí) y una bandera. */
export interface TrinketEffects {
  maxHp?: number;
  maxKiro?: number;
  power?: number;
  defense?: number;
  strength?: number;
  /** +1 de vida cada N rondas. */
  regenEvery?: number;
  /** −1 de vida cada N rondas (nunca mata). */
  drainEvery?: number;
  kiroRegenBonus?: number;
  /** Casillas de visión que suma (o resta). */
  vision?: number;
  /** Fracción extra de monedas que recoges. */
  coinBonus?: number;
  /** Daño extra que recibes de cada golpe. */
  damageTaken?: number;
  /** Los golpes de quien te vence por afinidad pegan la mitad de ese extra (×1,5 pasa a ×1,25). */
  weakCover?: boolean;
}

export interface TrinketDef {
  id: string;
  name: string;
  slot: TrinketSlot;
  description: string;
  good: TrinketEffects;
  /** Parte mala de una joya maldita: desaparece al purificarla. */
  curse?: TrinketEffects;
}

const list: TrinketDef[] = [
  // ----- Anillos -----
  { id: 'anillo_vigor', name: 'Anillo del Vigor', slot: 'ring', description: '+5 de vida máxima.', good: { maxHp: 5 } },
  { id: 'anillo_filo', name: 'Anillo del Filo', slot: 'ring', description: '+1 de poder.', good: { power: 1 } },
  { id: 'anillo_guarda', name: 'Anillo de la Guarda', slot: 'ring', description: '+1 de defensa.', good: { defense: 1 } },
  { id: 'anillo_savia', name: 'Anillo de Savia', slot: 'ring', description: 'Recuperas 1 de vida cada 8 rondas.', good: { regenEvery: 8 } },
  { id: 'anillo_mercader', name: 'Anillo del Mercader', slot: 'ring', description: '+50 % de monedas al recogerlas.', good: { coinBonus: 0.5 } },
  { id: 'anillo_hambre', name: 'Anillo del Hambre', slot: 'ring', description: 'Maldito: +2 de poder, pero pierdes 1 de vida cada 6 rondas (sin llegar a matarte).', good: { power: 2 }, curse: { drainEvery: 6 } },
  { id: 'anillo_vacio', name: 'Anillo Vacío', slot: 'ring', description: 'Maldito: +1 de defensa, pero −3 de kiro máximo.', good: { defense: 1 }, curse: { maxKiro: -3 } },
  { id: 'anillo_presa', name: 'Anillo de la Presa', slot: 'ring', description: 'Maldito: +4 de vida máxima, pero cada golpe que recibes duele 1 más.', good: { maxHp: 4 }, curse: { damageTaken: 1 } },
  // ----- Colgantes -----
  { id: 'colgante_toro', name: 'Colgante del Toro', slot: 'pendant', description: '+1 de Fuerza.', good: { strength: 1 } },
  { id: 'colgante_iman', name: 'Colgante de Imán', slot: 'pendant', description: 'Los golpes de quien te vence por afinidad pegan menos (×1,25 en vez de ×1,5).', good: { weakCover: true } },
  { id: 'colgante_luz', name: 'Colgante de Luz', slot: 'pendant', description: '+1 casilla de visión.', good: { vision: 1 } },
  { id: 'colgante_rocio', name: 'Colgante de Rocío', slot: 'pendant', description: 'Recuperas 1 de kiro extra cuando el kiro se regenera con el tiempo.', good: { kiroRegenBonus: 1 } },
  { id: 'colgante_venda', name: 'Colgante de la Venda', slot: 'pendant', description: 'Maldito: +4 de kiro máximo, pero ves 2 casillas menos.', good: { maxKiro: 4 }, curse: { vision: -2 } },
  { id: 'colgante_lastre', name: 'Colgante de Lastre', slot: 'pendant', description: 'Maldito: +2 de poder, pero −1 de Fuerza.', good: { power: 2 }, curse: { strength: -1 } },
];

export const TRINKETS: Record<string, TrinketDef> = Object.fromEntries(list.map((t) => [t.id, t]));

/** Sufijo de una joya maldita ya purificada: conserva lo bueno y pierde lo malo. */
export const CLEAN_SUFFIX = '~limpio';
/** Id del botín «joya sin identificar»: al recogerla se convierte en una joya concreta. */
export const RANDOM_TRINKET = 'joya_azar';

export const isPurifiedTrinket = (id: string): boolean => id.endsWith(CLEAN_SUFFIX);
export const baseTrinketId = (id: string): string => (isPurifiedTrinket(id) ? id.slice(0, -CLEAN_SUFFIX.length) : id);

export function getTrinket(id: string | null | undefined): TrinketDef | undefined {
  const base = id ? baseTrinketId(id) : '';
  return base && Object.hasOwn(TRINKETS, base) ? TRINKETS[base] : undefined;
}

export const isTrinket = (id: string): boolean => getTrinket(id) !== undefined;
export const isCursedTrinket = (id: string | null | undefined): boolean => Boolean(id && !isPurifiedTrinket(id) && getTrinket(id)?.curse);
export const trinketSlotOf = (id: string): TrinketSlot | undefined => getTrinket(id)?.slot;

/** Pasa a su versión purificada (si estaba maldita). */
export const purifiedTrinket = (id: string): string => (isCursedTrinket(id) ? id + CLEAN_SUFFIX : id);

/** Efectos de una joya: lo bueno y, si sigue maldita, lo malo (los números se suman). */
export function trinketEffects(id: string | null | undefined): TrinketEffects {
  const def = getTrinket(id);
  if (!def || !id) return {};
  const out: TrinketEffects = { ...def.good };
  if (def.curse && !isPurifiedTrinket(id)) {
    for (const [k, v] of Object.entries(def.curse) as [keyof TrinketEffects, number | boolean][]) {
      if (typeof v === 'number') (out as Record<string, number | boolean>)[k] = ((out[k] as number | undefined) ?? 0) + v;
      else (out as Record<string, number | boolean>)[k] = v;
    }
  }
  return out;
}

/** Suma de los efectos de lo que lleva puesto (anillo y colgante). */
export function wornEffects(equipment: { ring?: string | null; pendant?: string | null }): TrinketEffects {
  const a = trinketEffects(equipment.ring);
  const b = trinketEffects(equipment.pendant);
  const num = (k: keyof TrinketEffects): number => ((a[k] as number | undefined) ?? 0) + ((b[k] as number | undefined) ?? 0);
  const regen = [a.regenEvery, b.regenEvery].filter((n): n is number => typeof n === 'number');
  const drain = [a.drainEvery, b.drainEvery].filter((n): n is number => typeof n === 'number');
  return {
    maxHp: num('maxHp'),
    maxKiro: num('maxKiro'),
    power: num('power'),
    defense: num('defense'),
    strength: num('strength'),
    regenEvery: regen.length ? Math.min(...regen) : undefined,
    drainEvery: drain.length ? Math.min(...drain) : undefined,
    kiroRegenBonus: num('kiroRegenBonus'),
    vision: num('vision'),
    coinBonus: num('coinBonus'),
    damageTaken: num('damageTaken'),
    weakCover: Boolean(a.weakCover || b.weakCover),
  };
}

/** Nombre verdadero («Anillo del Hambre», «Anillo del Hambre (purificado)»). */
export function trinketTrueName(id: string): string {
  const def = getTrinket(id);
  if (!def) return id;
  return isPurifiedTrinket(id) ? `${def.name} (purificado)` : def.name;
}

/** Descripción con lo que hace ahora mismo (una maldita purificada ya no tiene su parte mala). */
export function trinketDescription(id: string): string {
  const def = getTrinket(id);
  if (!def) return '';
  if (!isPurifiedTrinket(id) || !def.curse) return def.description;
  return `Purificado: se queda solo con lo bueno (${describeEffects(def.good)}).`;
}

function describeEffects(fx: TrinketEffects): string {
  const parts: string[] = [];
  if (fx.maxHp) parts.push(`+${fx.maxHp} de vida máxima`);
  if (fx.maxKiro) parts.push(`+${fx.maxKiro} de kiro máximo`);
  if (fx.power) parts.push(`+${fx.power} de poder`);
  if (fx.defense) parts.push(`+${fx.defense} de defensa`);
  if (fx.strength) parts.push(`+${fx.strength} de Fuerza`);
  return parts.join(', ');
}

// ---------- Aspecto por partida ----------

const RING_LOOKS = ['de jade', 'de plata', 'de hueso', 'de cobre', 'de ónice', 'de coral', 'de ámbar', 'de marfil'];
const PENDANT_LOOKS = ['de colmillo', 'de concha', 'de vidrio', 'de madera', 'de pluma', 'de hierro'];

/** Aspecto de cada joya en esta partida: «trinket:anillo_vigor» → «Anillo de jade». No toca el generador de la partida. */
export function trinketAppearances(seed: number): Record<string, string> {
  const rng = new Rng(mixSeed(seed >>> 0, 0, 5150));
  const out: Record<string, string> = {};
  for (const slot of ['ring', 'pendant'] as const) {
    const looks = rng.shuffle([...(slot === 'ring' ? RING_LOOKS : PENDANT_LOOKS)]);
    list.filter((t) => t.slot === slot).forEach((t, i) => {
      out[`trinket:${t.id}`] = `${slot === 'ring' ? 'Anillo' : 'Colgante'} ${looks[i % looks.length]}`;
    });
  }
  return out;
}

/** Sortea una joya (`u` ∈ [0,1)): un 30 % maldita; entre las que no se tienen ya. Null si ya las tienes todas. */
export function rollTrinket(u: number, owned: readonly string[], cursedChance = 0.3): string | null {
  const have = new Set(owned.map(baseTrinketId));
  const pool = list.filter((t) => !have.has(t.id));
  if (pool.length === 0) return null;
  const cursed = pool.filter((t) => t.curse);
  const good = pool.filter((t) => !t.curse);
  const pickFrom = (arr: TrinketDef[], v: number): TrinketDef => arr[Math.min(arr.length - 1, Math.floor(v * arr.length))];
  if (cursed.length > 0 && (good.length === 0 || u < cursedChance)) return pickFrom(cursed, cursedChance > 0 ? u / cursedChance : 0).id;
  return pickFrom(good, good.length === 0 ? 0 : (u - cursedChance) / (1 - cursedChance)).id;
}

export const ALL_TRINKET_IDS: readonly string[] = list.map((t) => t.id);
