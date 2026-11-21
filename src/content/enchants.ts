/*
 * Encantamientos y maldiciones del equipo. Un arma o una vestimenta con modificador lleva su marca en el id: «hoja_afilada~llama».
 * Hasta que se equipa por primera vez está SIN IDENTIFICAR: el jugador ve el nombre base con «(?)» y no sabe si es buena, mala o corriente.
 * Al equiparla se identifica. Un objeto MALDITO se queda pegado al cuerpo hasta que se purifica (pergamino, forja).
 */
export type GearSlot = 'weapon' | 'armor';

export interface ModDef {
  id: string;
  /** Sufijo del nombre: «Hoja afilada de Llama». */
  name: string;
  slot: GearSlot;
  kind: 'enchant' | 'curse';
  description: string;
  /** Afinidad del arma encantada: sus golpes cuentan como esa afinidad contra la debilidad del enemigo. */
  affinity?: 'ascua' | 'marea' | 'vendaval' | 'piedra' | 'rayo';
  /** Poder / defensa que suma (o resta, si es negativo). */
  power?: number;
  defense?: number;
  /** Arma: estado que inflige al golpear y turnos. */
  onHitStatus?: { status: 'quemadura' | 'ralentizado' | 'aturdido' | 'veneno'; turns: number; chance: number };
  /** Arma: vida / kiro que recuperas por golpe, o vida que pierdes (maldición). */
  onHitHeal?: number;
  onHitKiro?: number;
  onHitSelfDamage?: number;
  /** Vestimenta: vida que recuperas cada N rondas. */
  regenEvery?: number;
  /** Vestimenta: daño que devuelves al enemigo que te golpea cuerpo a cuerpo. */
  thorns?: number;
  /** Vestimenta: kiro extra recuperado cada vez que el kiro se regenera con el tiempo. */
  kiroRegenBonus?: number;
  /** Maldición de vestimenta: no recuperas kiro con el tiempo. */
  noKiroRegen?: boolean;
  /** Maldición de vestimenta: daño extra que recibes de cada golpe. */
  damageTaken?: number;
}

const list: ModDef[] = [
  // ----- Armas: encantamientos -----
  { id: 'llama', name: 'de Llama', slot: 'weapon', kind: 'enchant', affinity: 'ascua', description: 'Los golpes prenden al enemigo (quemadura).', onHitStatus: { status: 'quemadura', turns: 3, chance: 0.5 } },
  { id: 'marea', name: 'de Marea', slot: 'weapon', kind: 'enchant', affinity: 'marea', description: 'Sus golpes ralentizan al enemigo.', onHitStatus: { status: 'ralentizado', turns: 3, chance: 0.5 } },
  { id: 'trueno', name: 'de Trueno', slot: 'weapon', kind: 'enchant', affinity: 'rayo', description: 'A veces aturde al enemigo con una descarga.', onHitStatus: { status: 'aturdido', turns: 1, chance: 0.25 } },
  { id: 'colmillo', name: 'del Colmillo', slot: 'weapon', kind: 'enchant', description: 'Inyecta veneno con cada golpe.', onHitStatus: { status: 'veneno', turns: 4, chance: 0.5 } },
  { id: 'filo_fino', name: 'de Filo Fino', slot: 'weapon', kind: 'enchant', description: '+2 de poder.', power: 2 },
  { id: 'sed', name: 'de la Sed Oscura', slot: 'weapon', kind: 'enchant', description: 'Cada golpe te devuelve 1 de vida.', onHitHeal: 1 },
  { id: 'eco_de_kiro', name: 'del Eco de Kiro', slot: 'weapon', kind: 'enchant', description: 'Cada golpe te devuelve 1 de kiro.', onHitKiro: 1 },
  // ----- Armas: maldiciones -----
  { id: 'oxido', name: 'Oxidada', slot: 'weapon', kind: 'curse', description: 'Maldita: −2 de poder. No puedes soltarla hasta purificarla.', power: -2 },
  { id: 'sello_de_sangre', name: 'del Sello de Sangre', slot: 'weapon', kind: 'curse', description: 'Maldita: cada golpe te cuesta 1 de vida. No puedes soltarla.', onHitSelfDamage: 1 },
  { id: 'plomo', name: 'de Plomo', slot: 'weapon', kind: 'curse', description: 'Maldita: −1 de poder y te roba 1 de kiro con cada golpe. No puedes soltarla.', power: -1, onHitKiro: -1 },
  // ----- Vestimenta: encantamientos -----
  { id: 'roca', name: 'de Roca', slot: 'armor', kind: 'enchant', description: '+1 de defensa extra.', defense: 1 },
  { id: 'corriente', name: 'de Corriente', slot: 'armor', kind: 'enchant', description: 'Recuperas 1 de vida cada 6 rondas.', regenEvery: 6 },
  { id: 'espinas', name: 'de Espinas', slot: 'armor', kind: 'enchant', description: 'Quien te golpea cuerpo a cuerpo recibe 2 de daño.', thorns: 2 },
  { id: 'pluma', name: 'de Pluma', slot: 'armor', kind: 'enchant', description: 'Recuperas 1 de kiro extra cuando el kiro se regenera.', kiroRegenBonus: 1 },
  // ----- Vestimenta: maldiciones -----
  { id: 'quebradiza', name: 'Quebradiza', slot: 'armor', kind: 'curse', description: 'Maldita: −2 de defensa. No puedes quitártela hasta purificarla.', defense: -2 },
  { id: 'cadenas', name: 'de Cadenas', slot: 'armor', kind: 'curse', description: 'Maldita: no recuperas kiro con el tiempo. No puedes quitártela.', noKiroRegen: true },
  { id: 'presa', name: 'de la Presa', slot: 'armor', kind: 'curse', description: 'Maldita: cada golpe que recibes duele 1 más. No puedes quitártela.', damageTaken: 1 },
];

export const MODS: Record<string, ModDef> = Object.fromEntries(list.map((m) => [m.id, m]));

export const GEAR_SEP = '~';

/** Separa «hoja_afilada~llama» en base y modificador. */
export function splitGear(id: string): { base: string; mod: string | null } {
  const i = id.indexOf(GEAR_SEP);
  return i < 0 ? { base: id, mod: null } : { base: id.slice(0, i), mod: id.slice(i + 1) };
}

export const baseGearId = (id: string): string => splitGear(id).base;
export const makeGearId = (base: string, mod: string | null): string => (mod ? `${base}${GEAR_SEP}${mod}` : base);

export function getMod(id: string | null | undefined): ModDef | undefined {
  if (!id) return undefined;
  const { mod } = splitGear(id);
  return mod && Object.hasOwn(MODS, mod) ? MODS[mod] : undefined;
}

export const isCursedGear = (id: string | null | undefined): boolean => getMod(id)?.kind === 'curse';

/** Modificadores posibles para una pieza, separados por tipo. */
export function modsFor(slot: GearSlot, kind: 'enchant' | 'curse'): ModDef[] {
  return list.filter((m) => m.slot === slot && m.kind === kind);
}

/** Quita la maldición (y solo la maldición): un encantamiento se conserva. */
export function purified(id: string): string {
  return isCursedGear(id) ? baseGearId(id) : id;
}
