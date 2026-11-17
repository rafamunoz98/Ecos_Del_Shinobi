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

/** Tabla de botín configurable de los cofres. */
export const LOOT_TABLE: readonly { itemId: string; weight: number }[] = [
  { itemId: 'tonico_kiro', weight: 1 },
  { itemId: 'unguento_musgo', weight: 1 },
];
