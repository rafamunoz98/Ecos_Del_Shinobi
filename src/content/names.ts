import { getArcana, POTION_PREFIX, RANDOM_POTION, RANDOM_SCROLL, SCROLL_PREFIX } from './arcana';
import { getMod, splitGear } from './enchants';
import { CURRENCY, KEYS, getEquipment } from './items';
import { getTechnique } from './techniques';
import { RANDOM_TRINKET, getTrinket, trinketTrueName } from './trinkets';
import { getThrowable, getWeapon } from './weapons';

/** Lo mínimo del estado que hace falta para saber qué conoce el jugador (pociones, pergaminos y equipo identificados). */
export interface NameContext {
  appearance: Record<string, string>;
  player: { known: string[]; identified: string[] };
}

/** Nombre verdadero de una pieza de equipo con su modificador: «Hoja afilada de Llama». */
export function gearTrueName(id: string): string {
  const base = getWeapon(id)?.name ?? getEquipment(id)?.name ?? splitGear(id).base;
  const mod = getMod(id);
  return mod ? `${base} ${mod.name}` : base;
}

/**
 * Nombre en español de cualquier objeto (consumible, arrojadiza, arma, vestimenta, moneda, llave).
 * Con `ctx`, lo que el jugador aún no ha identificado se muestra como lo vería él: «Poción ámbar», «Hoja afilada (?)».
 */
export function itemName(id: string, ctx?: NameContext): string {
  if (id.startsWith('manual:')) return `Manual: ${getTechnique(id.slice(7))?.name ?? id.slice(7)}`;
  if (id === 'manual_tecnica') return 'Manual de técnica';
  if (id === 'manual_fusion') return 'Manual de fusión';
  if (id === RANDOM_POTION) return 'Poción sin identificar';
  if (id === RANDOM_TRINKET) return 'Joya sin identificar';
  if (id === RANDOM_SCROLL) return 'Pergamino sin identificar';
  if (id.startsWith(POTION_PREFIX) || id.startsWith(SCROLL_PREFIX)) {
    const def = getArcana(id);
    if (!def) return id;
    if (!ctx || ctx.player.known.includes(id)) return def.name;
    return ctx.appearance[id] ?? def.name;
  }
  if (getTrinket(id)) {
    if (ctx && !ctx.player.identified.includes(id)) return `${ctx.appearance[`trinket:${getTrinket(id)?.id}`] ?? getTrinket(id)?.name} (?)`;
    return trinketTrueName(id);
  }
  if (getWeapon(id) || getEquipment(id)) {
    if (ctx && !ctx.player.identified.includes(id)) return `${getWeapon(id)?.name ?? getEquipment(id)?.name} (?)`;
    return gearTrueName(id);
  }
  return getThrowable(id)?.name ?? CURRENCY[id]?.name ?? KEYS[id]?.name ?? id;
}

/** ¿Se sabe qué es este objeto? (las pociones y pergaminos sin identificar y el equipo sin probar, no.) */
export function isIdentified(id: string, ctx: NameContext): boolean {
  if (id.startsWith(POTION_PREFIX) || id.startsWith(SCROLL_PREFIX)) return ctx.player.known.includes(id);
  if (getWeapon(id) || getEquipment(id) || getTrinket(id)) return ctx.player.identified.includes(id);
  return true;
}

/** Id del icono con que se ve un objeto: lo no identificado usa su aspecto («look:Poción ámbar») para no delatar su efecto. */
export function iconIdFor(id: string, ctx?: NameContext): string {
  if (!ctx) return id;
  if (id.startsWith(POTION_PREFIX) || id.startsWith(SCROLL_PREFIX)) {
    return ctx.player.known.includes(id) ? id : `look:${ctx.appearance[id] ?? id}`;
  }
  return id;
}

/** Nombre con modificador y nivel de forja: «Hoja afilada de Llama +2». */
export function gearLabel(id: string, level = 0, ctx?: NameContext): string {
  const name = itemName(id, ctx);
  return level > 0 ? `${name} +${level}` : name;
}
