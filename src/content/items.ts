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

// ---------- Botín ----------

export interface LootEntry {
  kind: 'item' | 'equipment' | 'weapon' | 'throwable';
  id: string;
  weight: number;
  /** Primer sector en el que puede aparecer (lo raro no es obligatorio para avanzar). */
  minFloor: number;
  /** Solo arrojadizas: unidades que da el cofre. */
  amount?: number;
}

/** Tabla de botín configurable de los cofres. */
export const LOOT_TABLE: readonly LootEntry[] = [
  { kind: 'item', id: 'tonico_kiro', weight: 4, minFloor: 1 },
  { kind: 'item', id: 'unguento_musgo', weight: 4, minFloor: 1 },
  { kind: 'throwable', id: 'shuriken', weight: 3, minFloor: 1, amount: 4 },
  { kind: 'throwable', id: 'senbon', weight: 2, minFloor: 1, amount: 5 },
  { kind: 'throwable', id: 'kunai_arrojadizo', weight: 2, minFloor: 2, amount: 3 },
  { kind: 'weapon', id: 'kunai_de_hierro', weight: 2, minFloor: 1 },
  { kind: 'weapon', id: 'latigo_de_cadena', weight: 2, minFloor: 1 },
  { kind: 'weapon', id: 'hoja_afilada', weight: 2, minFloor: 2 },
  { kind: 'weapon', id: 'lanza_de_bambu', weight: 2, minFloor: 2 },
  { kind: 'weapon', id: 'hoja_de_ceniza', weight: 1, minFloor: 3 },
  { kind: 'equipment', id: 'chaleco_acolchado', weight: 2, minFloor: 1 },
  { kind: 'equipment', id: 'cota_de_laminas', weight: 2, minFloor: 2 },
  { kind: 'equipment', id: 'coraza_de_pizarra', weight: 1, minFloor: 3 },
];

export function lootTableFor(floor: number): LootEntry[] {
  return LOOT_TABLE.filter((e) => e.minFloor <= floor);
}
