import type { StatusId } from '../core/types';
import type { TechniqueDef } from './techniques';
import type { WeaponDef, WeaponKind } from './weapons';

/** Textos explicativos para el menú (puros: se pueden probar sin DOM). */

export const STATUS_NAMES: Record<StatusId, string> = { quemadura: 'Quemadura', aturdido: 'Aturdido', protegido: 'Protegido' };

export const STATUS_HELP: Record<StatusId, string> = {
  quemadura: '1 de daño por ronda, ignora la defensa.',
  aturdido: 'Pierde su próxima acción.',
  protegido: '+2 de defensa mientras dura.',
};

export const WEAPON_KIND_NAMES: Record<WeaponKind, string> = { blade: 'Hoja', whip: 'Látigo', spear: 'Lanza' };

export function describeShape(def: TechniqueDef): string {
  const t = def.target;
  switch (t.kind) {
    case 'area':
      return t.areaRadius > 0
        ? `Área de radio ${t.areaRadius} sobre una casilla visible (alcance ${t.range}).`
        : `Una casilla visible (alcance ${t.range}).`;
    case 'line':
      return `Línea recta de ${t.length} casillas; se detiene en obstáculos.`;
    case 'burst':
      return `Ráfaga de radio ${t.radius} a tu alrededor.`;
    case 'self':
      return 'Se aplica sobre ti.';
    case 'blink':
      return `Te desplazas al instante a una casilla libre visible (alcance ${t.range}).`;
    case 'barrier':
      return `Tres casillas en perpendicular (alcance ${t.range}).`;
  }
}

/** Efectos en una lista corta: daño, estados, empuje, barrera. */
export function describeEffects(def: TechniqueDef): string[] {
  const out: string[] = [];
  if (def.damage) out.push(`Daño ${def.damage.power}${def.damage.ignoreDefense ? ' (ignora defensa)' : ''}`);
  if (def.inflict) out.push(`${STATUS_NAMES[def.inflict.status]} ${def.inflict.turns} turno${def.inflict.turns === 1 ? '' : 's'}`);
  if (def.selfStatus) out.push(`Tú: ${STATUS_NAMES[def.selfStatus.status]} ${def.selfStatus.turns} turnos`);
  if (def.push) out.push(`Empuja ${def.push} casillas`);
  if (def.barrierTurns) out.push(`Barrera ${def.barrierTurns} rondas`);
  if (out.length === 0) out.push('Utilidad');
  return out;
}

export function describeWeaponPattern(w: WeaponDef): string {
  switch (w.kind) {
    case 'blade':
      return 'Golpea a un enemigo adyacente (camina hacia él).';
    case 'whip':
      return `Alcanza ${w.reach} casillas en línea recta y golpea al primero que encuentre. Tecla F.`;
    case 'spear':
      return `Ataca ${w.reach} casillas en línea y atraviesa a todos. Tecla F.`;
  }
}
