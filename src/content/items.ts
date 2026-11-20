import type { EquipSlot } from '../core/types';

export type ItemEffect =
  | { kind: 'restoreKiro'; amount: number }
  | { kind: 'restoreHp'; amount: number };

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  effect: ItemEffect;
}

export const ITEMS: Record<string, ItemDef> = {
  tonico_kiro: {
    id: 'tonico_kiro',
    name: 'Tónico de Kiro',
    description: 'Recupera 5 de kiro.',
    effect: { kind: 'restoreKiro', amount: 5 },
  },
  unguento_musgo: {
    id: 'unguento_musgo',
    name: 'Ungüento de Musgo',
    description: 'Recupera 8 de vida.',
    effect: { kind: 'restoreHp', amount: 8 },
  },
};

export function getItem(id: string): ItemDef | undefined {
  return Object.hasOwn(ITEMS, id) ? ITEMS[id] : undefined;
}

// ---------- Equipo (vestimenta) ----------

export interface EquipmentDef {
  id: string;
  name: string;
  slot: EquipSlot;
  /** Vestimenta: suma a la defensa. */
  bonus: number;
  description: string;
}

export const EQUIPMENT: Record<string, EquipmentDef> = {
  chaleco_acolchado: { id: 'chaleco_acolchado', name: 'Chaleco acolchado', slot: 'armor', bonus: 1, description: '+1 de defensa.' },
  cota_de_laminas: { id: 'cota_de_laminas', name: 'Cota de láminas', slot: 'armor', bonus: 2, description: '+2 de defensa.' },
  coraza_de_pizarra: { id: 'coraza_de_pizarra', name: 'Coraza de pizarra', slot: 'armor', bonus: 3, description: '+3 de defensa.' },
};

export function getEquipment(id: string | null | undefined): EquipmentDef | undefined {
  return id && Object.hasOwn(EQUIPMENT, id) ? EQUIPMENT[id] : undefined;
}

// ---------- Moneda, materiales y llaves ----------

/** Monedas y esquirlas: se acumulan en el jugador (no ocupan mochila) y pagan las mejoras de la forja. */
export const CURRENCY: Record<string, { id: string; name: string; description: string }> = {
  moneda: { id: 'moneda', name: 'Monedas', description: 'Moneda de bronce de los Custodios. Sirve para mejorar armas en una mesa de forja.' },
  esquirla: { id: 'esquirla', name: 'Esquirlas de campana', description: 'Fragmentos de bronce vivo. En la forja valen más que las monedas.' },
};

/** Llaves de un solo sector: se deshacen al cruzar la escalera (como en Pixel Dungeon). */
export const KEYS: Record<string, { id: string; name: string; description: string }> = {
  llave_hierro: { id: 'llave_hierro', name: 'Llave de hierro', description: 'Abre una cámara sellada de este sector.' },
  llave_laca: { id: 'llave_laca', name: 'Llave de laca', description: 'Abre un cofre lacado de este sector.' },
};

export const isKey = (id: string): boolean => Object.hasOwn(KEYS, id);
export const isCurrency = (id: string): boolean => Object.hasOwn(CURRENCY, id);

// ---------- Botín ----------

export interface LootEntry {
  kind: 'item' | 'equipment' | 'weapon' | 'throwable' | 'coins' | 'shards';
  id: string;
  weight: number;
  /** Primer sector en el que puede aparecer (lo raro no es obligatorio para avanzar). */
  minFloor: number;
  /** Unidades (arrojadizas, consumibles apilados) o cantidad base (monedas y esquirlas; las monedas crecen con el sector). */
  amount?: number;
}

/**
 * Objetos sueltos por el suelo de los sectores: consumibles, arrojadizas, monedas y esquirlas.
 * Lo potente (armas, vestimenta) vive en cofres y cámaras selladas.
 */
export const GROUND_LOOT: readonly LootEntry[] = [
  { kind: 'coins', id: 'moneda', weight: 5, minFloor: 1, amount: 2 },
  { kind: 'shards', id: 'esquirla', weight: 2, minFloor: 1, amount: 1 },
  { kind: 'item', id: 'tonico_kiro', weight: 3, minFloor: 1 },
  { kind: 'item', id: 'unguento_musgo', weight: 3, minFloor: 1 },
  { kind: 'throwable', id: 'shuriken', weight: 2, minFloor: 1, amount: 2 },
  { kind: 'throwable', id: 'senbon', weight: 1, minFloor: 1, amount: 2 },
  { kind: 'throwable', id: 'kunai_arrojadizo', weight: 1, minFloor: 2, amount: 1 },
];

/** Cofre de madera: equipo y reservas generosas. */
export const CHEST_LOOT: readonly LootEntry[] = [
  { kind: 'weapon', id: 'kunai_de_hierro', weight: 1, minFloor: 1 },
  { kind: 'weapon', id: 'latigo_de_cadena', weight: 1, minFloor: 1 },
  { kind: 'weapon', id: 'hoja_afilada', weight: 2, minFloor: 2 },
  { kind: 'weapon', id: 'lanza_de_bambu', weight: 1, minFloor: 2 },
  { kind: 'weapon', id: 'hoja_de_ceniza', weight: 1, minFloor: 3 },
  { kind: 'equipment', id: 'chaleco_acolchado', weight: 1, minFloor: 1 },
  { kind: 'equipment', id: 'cota_de_laminas', weight: 2, minFloor: 2 },
  { kind: 'equipment', id: 'coraza_de_pizarra', weight: 1, minFloor: 3 },
  { kind: 'item', id: 'unguento_musgo', weight: 3, minFloor: 1, amount: 2 },
  { kind: 'item', id: 'tonico_kiro', weight: 3, minFloor: 1, amount: 2 },
  { kind: 'throwable', id: 'shuriken', weight: 1, minFloor: 1, amount: 3 },
  { kind: 'throwable', id: 'senbon', weight: 1, minFloor: 1, amount: 3 },
  { kind: 'throwable', id: 'kunai_arrojadizo', weight: 1, minFloor: 2, amount: 2 },
];

/** Cofre lacado (exige llave de laca): siempre equipo bueno. */
export const LACQUER_LOOT: readonly LootEntry[] = [
  { kind: 'weapon', id: 'hoja_afilada', weight: 3, minFloor: 1 },
  { kind: 'weapon', id: 'lanza_de_bambu', weight: 3, minFloor: 1 },
  { kind: 'weapon', id: 'hoja_de_ceniza', weight: 3, minFloor: 2 },
  { kind: 'equipment', id: 'cota_de_laminas', weight: 3, minFloor: 1 },
  { kind: 'equipment', id: 'coraza_de_pizarra', weight: 3, minFloor: 2 },
];

/** Cámara sellada (exige llave de hierro): una pieza de equipo y varias reservas. */
export const VAULT_GEAR: readonly LootEntry[] = LACQUER_LOOT;
export const VAULT_EXTRAS: readonly LootEntry[] = [
  { kind: 'item', id: 'unguento_musgo', weight: 3, minFloor: 1, amount: 2 },
  { kind: 'item', id: 'tonico_kiro', weight: 3, minFloor: 1, amount: 2 },
  { kind: 'throwable', id: 'kunai_arrojadizo', weight: 1, minFloor: 1, amount: 3 },
  { kind: 'throwable', id: 'senbon', weight: 1, minFloor: 1, amount: 3 },
  { kind: 'shards', id: 'esquirla', weight: 3, minFloor: 1, amount: 2 },
  { kind: 'coins', id: 'moneda', weight: 3, minFloor: 1, amount: 6 },
];

export const ALL_LOOT_TABLES: readonly (readonly LootEntry[])[] = [GROUND_LOOT, CHEST_LOOT, LACQUER_LOOT, VAULT_EXTRAS];

export function lootTableFor(floor: number, table: readonly LootEntry[] = CHEST_LOOT): LootEntry[] {
  return table.filter((e) => e.minFloor <= floor);
}

/** Monedas de una entrada: la cantidad base crece con el sector. */
export const coinAmount = (base: number, floor: number): number => base + (floor - 1);
