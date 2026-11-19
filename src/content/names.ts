import { CURRENCY, KEYS, getEquipment, getItem } from './items';
import { getThrowable, getWeapon } from './weapons';

/** Nombre en español de cualquier objeto (consumible, arrojadiza, arma, vestimenta, moneda, llave). */
export function itemName(id: string): string {
  return (
    getItem(id)?.name ??
    getThrowable(id)?.name ??
    getWeapon(id)?.name ??
    getEquipment(id)?.name ??
    CURRENCY[id]?.name ??
    KEYS[id]?.name ??
    id
  );
}
