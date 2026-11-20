import { baseGearId } from './enchants';

/*
 * Armas. Dos familias:
 *  - Cuerpo a cuerpo (WEAPONS): una equipada cada vez, no se gastan. El tipo decide a qué casillas llega.
 *      blade  golpea a un enemigo adyacente (se ataca al caminar hacia él).
 *      whip   alcanza hasta `reach` casillas en línea recta y golpea al primer enemigo que encuentra.
 *      spear  ataca `reach` casillas en línea y atraviesa: golpea a todos los que haya.
 *  - Arrojadizas (THROWABLES): se llevan en el inventario por unidades y se lanzan a una casilla visible.
 *    Al acertar se clavan en el enemigo y caen al suelo cuando muere (salvo que se rompan); si fallan, caen donde llegan.
 */
export type WeaponKind = 'blade' | 'whip' | 'spear';

export interface WeaponDef {
  id: string;
  name: string;
  kind: WeaponKind;
  /** Suma al poder de ataque. */
  bonus: number;
  /** Alcance en casillas (1 = adyacente). */
  reach: number;
  description: string;
}

export const WEAPONS: Record<string, WeaponDef> = {
  tanto_gastado: { id: 'tanto_gastado', name: 'Tanto gastado', kind: 'blade', bonus: 0, reach: 1, description: 'Tu hoja de entrenamiento. Golpea a un enemigo adyacente.' },
  kunai_de_hierro: { id: 'kunai_de_hierro', name: 'Kunai de hierro', kind: 'blade', bonus: 1, reach: 1, description: 'Hoja corta y equilibrada. +1 de poder.' },
  hoja_afilada: { id: 'hoja_afilada', name: 'Hoja afilada', kind: 'blade', bonus: 2, reach: 1, description: 'Una espada corta bien cuidada. +2 de poder.' },
  hoja_de_ceniza: { id: 'hoja_de_ceniza', name: 'Hoja de ceniza', kind: 'blade', bonus: 3, reach: 1, description: 'Acero ennegrecido por el fuego del santuario. +3 de poder.' },
  latigo_de_cadena: { id: 'latigo_de_cadena', name: 'Látigo de cadena', kind: 'whip', bonus: 0, reach: 2, description: 'Alcanza hasta 2 casillas en línea recta y golpea al primer enemigo que encuentra.' },
  lanza_de_bambu: { id: 'lanza_de_bambu', name: 'Lanza de bambú', kind: 'spear', bonus: 1, reach: 2, description: 'Ataca 2 casillas en línea y atraviesa: golpea a todos los que haya. +1 de poder.' },
};

/** Acepta ids con modificador («hoja_afilada~llama»): devuelve la definición del arma base. */
export function getWeapon(id: string | null | undefined): WeaponDef | undefined {
  const base = id ? baseGearId(id) : '';
  return base && Object.hasOwn(WEAPONS, base) ? WEAPONS[base] : undefined;
}

/** Nombre con el nivel de mejora de la forja: «Hoja afilada +2». */
export function weaponLabel(id: string, level = 0): string {
  const name = getWeapon(id)?.name ?? id;
  return level > 0 ? `${name} +${level}` : name;
}

export interface ThrowableDef {
  id: string;
  name: string;
  damage: number;
  /** No resta la defensa del objetivo. */
  ignoreDefense?: boolean;
  /** Alcance máximo (distancia Manhattan). */
  range: number;
  /** Probabilidad de que se rompa o pierda al lanzarla (1 = siempre se gasta). */
  breakChance: number;
  description: string;
}

export const THROWABLES: Record<string, ThrowableDef> = {
  shuriken: { id: 'shuriken', name: 'Shuriken', damage: 3, range: 5, breakChance: 0.25, description: 'Estrella de acero. Se lanza hasta 5 casillas, se clava en el enemigo y cae al suelo cuando muere.' },
  kunai_arrojadizo: { id: 'kunai_arrojadizo', name: 'Kunai arrojadizo', damage: 4, range: 4, breakChance: 0.15, description: 'Más pesado: 4 de daño hasta 4 casillas. Casi siempre se recupera tras abatir al enemigo.' },
  senbon: { id: 'senbon', name: 'Senbon', damage: 4, ignoreDefense: true, range: 6, breakChance: 0.4, description: 'Aguja finísima que ignora la defensa: 4 de daño hasta 6 casillas. Se clava en el enemigo; se pierde el 40 % de las veces.' },
};

export function getThrowable(id: string): ThrowableDef | undefined {
  return Object.hasOwn(THROWABLES, id) ? THROWABLES[id] : undefined;
}
