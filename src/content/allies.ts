/** Aliados invocables (técnica Clon de Sombra, pergaminos de invocación): luchan unas rondas y desaparecen. */
export interface AllyDef {
  id: string;
  name: string;
  maxHp: number;
  power: number;
  /** Acciones por ronda. */
  actions: number;
  description: string;
}

export const ALLY_KINDS: Record<string, AllyDef> = {
  clon_de_sombra: { id: 'clon_de_sombra', name: 'Clon de sombra', maxHp: 8, power: 3, actions: 1, description: 'Un doble de humo que golpea a tu lado.' },
  sapo_de_piedra: { id: 'sapo_de_piedra', name: 'Sapo de piedra', maxHp: 16, power: 4, actions: 1, description: 'Un sapo enorme y duro como la roca: aguanta y golpea fuerte.' },
  cuervo_aliado: { id: 'cuervo_aliado', name: 'Cuervo mensajero', maxHp: 6, power: 3, actions: 2, description: 'Un cuervo veloz que se lanza dos veces por ronda.' },
};

export function getAllyDef(id: string): AllyDef | undefined {
  return Object.hasOwn(ALLY_KINDS, id) ? ALLY_KINDS[id] : undefined;
}
