import { CURRENCY, KEYS, getEquipment, getItem } from './items';
import { getTechnique } from './techniques';
import { getThrowable, getWeapon } from './weapons';

/** Nombre en español de cualquier objeto (consumible, arrojadiza, arma, vestimenta, moneda, llave). */
export function itemName(id: string): string {
  if (id.startsWith('manual:')) return `Manual: ${getTechnique(id.slice(7))?.name ?? id.slice(7)}`;
  if (id === 'manual_tecnica') return 'Manual de técnica';
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
