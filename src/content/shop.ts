/** Tienda del mercader que aparece tras cada jefe (la única forma de gastar monedas, además de la forja). */
export const MERCHANT_KIND = 'mercader';
export const MERCHANT_NAME = 'Mercader de la Casa del Hilo Gris';

/** Precios fijos de lo corriente; los de pociones y pergaminos salen de su definición. */
export const SHOP_PRICES = {
  manual: 40,
  /** Equipo: base + por punto de bonificación (+10 si viene encantado). */
  weaponBase: 18,
  armorBase: 16,
  perBonus: 10,
  enchantExtra: 10,
} as const;
