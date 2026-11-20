import type { StatusId } from '../core/types';
import type { TechniqueDef } from './techniques';
import type { WeaponDef, WeaponKind } from './weapons';

/** Textos explicativos para el menú (puros: se pueden probar sin DOM). */

export const STATUS_NAMES: Record<StatusId, string> = {
  quemadura: 'Quemadura',
  aturdido: 'Aturdido',
  protegido: 'Protegido',
  veneno: 'Veneno',
  ralentizado: 'Ralentizado',
  atado: 'Atado',
  vulnerable: 'Vulnerable',
  regeneracion: 'Regeneración',
  potenciado: 'Potenciado',
  sigilo: 'Sigilo',
  ceguera: 'Oscuridad',
};

export const STATUS_HELP: Record<StatusId, string> = {
  quemadura: '1 de daño por ronda, ignora la defensa.',
  aturdido: 'Pierde su próxima acción.',
  protegido: '+2 de defensa mientras dura.',
  veneno: '1 de daño por ronda, ignora la defensa.',
  ralentizado: 'Solo actúa una de cada dos rondas.',
  atado: 'No puede moverse (aún ataca a quien tenga al lado).',
  vulnerable: '-2 de defensa mientras dura.',
  regeneracion: 'Recupera 1 de vida por ronda.',
  potenciado: '+2 de poder mientras dura.',
  sigilo: 'Los enemigos no te notan salvo que estén pegados a ti.',
  ceguera: 'Tu visión se reduce a 2 casillas.',
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
      return `Ráfaga de radio ${t.radius} a tu alrededor${t.shape === 'square' ? ' (incluye diagonales)' : ''}.`;
    case 'self':
      return 'Se aplica sobre ti.';
    case 'blink':
      return `Te desplazas al instante a una casilla libre visible (alcance ${t.range}).`;
    case 'barrier':
      return `Tres casillas en perpendicular (alcance ${t.range}).`;
    case 'dash':
      return `Carrera en línea recta de hasta ${t.length} casillas contra el primer enemigo.`;
  }
}

/** Efectos en una lista corta: daño, estados, empuje, barrera. */
export function describeEffects(def: TechniqueDef): string[] {
  const out: string[] = [];
  if (def.damage) out.push(`Daño ${def.damage.power}${def.damage.ignoreDefense ? ' (ignora defensa)' : ''}`);
  if (def.inflict) out.push(`${STATUS_NAMES[def.inflict.status]} ${def.inflict.turns} turno${def.inflict.turns === 1 ? '' : 's'}`);
  if (def.selfStatus) out.push(`Tú: ${STATUS_NAMES[def.selfStatus.status]} ${def.selfStatus.turns} turnos`);
  if (def.push) out.push(`Empuja ${def.push} casillas`);
  if (def.pull) out.push(`Arrastra ${def.pull} casillas hacia ti`);
  if (def.heal) out.push(`Curas ${def.heal} de vida`);
  if (def.restoreKiro) out.push(`Recuperas ${def.restoreKiro} de kiro`);
  if (def.selfDamage) out.push(`Pagas ${def.selfDamage} de vida`);
  if (def.summon) out.push(`Invoca ${def.summon.count} aliado (${def.summon.turns} rondas)`);
  if (def.leaveDecoy) out.push(`Deja un tronco señuelo (${def.leaveDecoy.turns} rondas)`);
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
