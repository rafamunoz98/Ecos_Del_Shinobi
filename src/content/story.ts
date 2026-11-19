/*
 * Narrativa del prototipo: diálogos breves, maestros/eventos con decisiones y notas de lectura opcional.
 * Todo es original y está ligado al mundo de `03_mundo_lore_y_facciones.md` (Noche de las Mil Campanas, Ecos,
 * Custodios del Umbral, Círculo de la Campana Hueca, Peregrinos del Pulso). Los diálogos son cortos a propósito.
 */

export interface DialogueDef {
  id: string;
  speaker: string;
  lines: string[];
  /** Retrato que acompaña al diálogo (un enemigo o un personaje fijo). */
  portrait?: { kind: 'enemy' | 'npc'; id: string };
}

export const DIALOGUES: Record<string, DialogueDef> = {
  prologo: {
    id: 'prologo',
    speaker: 'Cripta de los Ecos',
    lines: [
      'Siglos después de la Noche de las Mil Campanas, el Pulso aún late bajo estas ruinas.',
      'Los Custodios te han enviado a reparar un sello roto. Nadie ha vuelto de la última campana.',
      'Avanza con cuidado: lo que no te ve, no te persigue.',
    ],
  },
  altar_intro: {
    id: 'altar_intro',
    speaker: 'Altar del Eco Roto',
    portrait: { kind: 'npc', id: 'altar_eco_roto' },
    lines: ['Un fragmento de campana descansa sobre la piedra. Vibra al acercarte.', 'Pide algo a cambio de algo.'],
  },
  altar_after: {
    id: 'altar_after',
    speaker: 'Altar del Eco Roto',
    portrait: { kind: 'npc', id: 'altar_eco_roto' },
    lines: ['El fragmento calla. Ya tomó su parte.'],
  },
  sayoko_intro: {
    id: 'sayoko_intro',
    speaker: 'Maestra Sayoko',
    portrait: { kind: 'npc', id: 'maestra_sayoko' },
    lines: [
      'Peregrina del Pulso. Enseño a quien llega hasta aquí vivo; es la única prueba que pido.',
      'Más abajo toca una campana que no debería sonar. Si vas a enfrentarla, ve preparado.',
      'Puedo enseñarte una sola cosa. Elige bien.',
    ],
  },
  sayoko_after: {
    id: 'sayoko_after',
    speaker: 'Maestra Sayoko',
    portrait: { kind: 'npc', id: 'maestra_sayoko' },
    lines: ['Ya tienes mi lección. El resto es tuyo: respira, mide y golpea.'],
  },
  campanero_intro: {
    id: 'campanero_intro',
    speaker: 'El Campanero Sepultado',
    portrait: { kind: 'enemy', id: 'campanero_sepultado' },
    lines: [
      'Otra vez pasos... Hace siglos que cuento cada uno.',
      'Soy quien ató su cuerpo a la campana para que no se rompiera el último sello.',
      'Si llegas al sello, tendré que soltarlo. No me lo pidas: dame silencio.',
    ],
  },
  campanero_fase2: {
    id: 'campanero_fase2',
    speaker: 'El Campanero Sepultado',
    portrait: { kind: 'enemy', id: 'campanero_sepultado' },
    lines: ['¡La campana se resquebraja! Escucha cómo el Pulso se agita...'],
  },
  campanero_fase3: {
    id: 'campanero_fase3',
    speaker: 'El Campanero Sepultado',
    portrait: { kind: 'enemy', id: 'campanero_sepultado' },
    lines: ['Los Ecos que guardaba despiertan. No los he llamado yo.'],
  },
  campanero_derrota: {
    id: 'campanero_derrota',
    speaker: 'El Campanero Sepultado',
    portrait: { kind: 'enemy', id: 'campanero_sepultado' },
    lines: [
      'Silencio... al fin.',
      'Toma el sello antiguo. Si el Círculo llega antes que tú, la campana sonará mil veces.',
      'Sal. Y no mires atrás: todavía quedan campanas.',
    ],
  },
};

// ---------- Maestros y eventos con decisiones ----------

export type Gain =
  | { kind: 'power'; amount: number }
  | { kind: 'defense'; amount: number }
  | { kind: 'maxKiro'; amount: number }
  | { kind: 'maxHp'; amount: number }
  | { kind: 'healFull' }
  | { kind: 'advancedTechnique' };

/** Coste de una opción. `kiro: 'all'` gasta todo el kiro actual (exige al menos `minKiro`). */
export interface Cost {
  hp?: number;
  kiro?: 'all';
  minKiro?: number;
  item?: { id: string; count: number };
}

export interface NpcOption {
  id: string;
  label: string;
  description: string;
  cost?: Cost;
  gains: Gain[];
}

export interface NpcDef {
  id: string;
  name: string;
  /** Texto corto del tipo de encuentro (se muestra en el menú de decisión). */
  kindLabel: string;
  introId: string;
  afterId: string;
  options: NpcOption[];
}

export const NPCS: Record<string, NpcDef> = {
  altar_eco_roto: {
    id: 'altar_eco_roto',
    name: 'Altar del Eco Roto',
    kindLabel: 'Evento',
    introId: 'altar_intro',
    afterId: 'altar_after',
    options: [
      {
        id: 'sangre',
        label: 'Ofrenda de sangre',
        description: 'Pierdes 6 de vida. Ganas +1 de poder y +2 de kiro máximo.',
        cost: { hp: 6 },
        gains: [
          { kind: 'power', amount: 1 },
          { kind: 'maxKiro', amount: 2 },
        ],
      },
      {
        id: 'plegaria',
        label: 'Plegaria de kiro',
        description: 'Entregas todo tu kiro (mínimo 3). Recuperas toda la vida.',
        cost: { kiro: 'all', minKiro: 3 },
        gains: [{ kind: 'healFull' }],
      },
      {
        id: 'ofrenda',
        label: 'Ofrenda de acero',
        description: 'Dejas 3 shuriken sobre la piedra. Ganas +1 de defensa.',
        cost: { item: { id: 'shuriken', count: 3 } },
        gains: [{ kind: 'defense', amount: 1 }],
      },
    ],
  },
  maestra_sayoko: {
    id: 'maestra_sayoko',
    name: 'Maestra Sayoko',
    kindLabel: 'Maestra',
    introId: 'sayoko_intro',
    afterId: 'sayoko_after',
    options: [
      {
        id: 'filo',
        label: 'Filo del Maestro',
        description: '+1 de poder, de forma permanente en la expedición.',
        gains: [{ kind: 'power', amount: 1 }],
      },
      {
        id: 'respiracion',
        label: 'Respiración profunda',
        description: '+4 de kiro máximo.',
        gains: [{ kind: 'maxKiro', amount: 4 }],
      },
      {
        id: 'corteza',
        label: 'Piel de corteza',
        description: '+1 de defensa y +4 de vida máxima.',
        gains: [
          { kind: 'defense', amount: 1 },
          { kind: 'maxHp', amount: 4 },
        ],
      },
      {
        id: 'leccion',
        label: 'Lección adelantada',
        description: 'Aprendes ya la técnica avanzada de tu afinidad (si aún no la conoces).',
        gains: [{ kind: 'advancedTechnique' }],
      },
    ],
  },
};

export function getNpc(kind: string): NpcDef | undefined {
  return Object.hasOwn(NPCS, kind) ? NPCS[kind] : undefined;
}

/** Eventos/maestros que aparecen en cada sector (uno por sector, por ahora). */
export const NPC_BY_FLOOR: Record<number, string> = {
  1: 'altar_eco_roto',
  2: 'maestra_sayoko',
};

// ---------- Notas de lectura opcional ----------

export interface NoteDef {
  id: string;
  floor: number;
  title: string;
  text: string;
}

export const NOTES: Record<string, NoteDef> = {
  diario_cartografo: {
    id: 'diario_cartografo',
    floor: 1,
    title: 'Diario del cartógrafo',
    text: 'Casa del Hilo Gris, quinta jornada. Los pasillos no están donde los dibujé ayer. Las ruinas se reordenan solas, como si algo debajo respirara. Anoto una regla: si dudas, escóndete entre la maleza y deja que pase lo que sea que venga.',
  },
  tablilla_custodios: {
    id: 'tablilla_custodios',
    floor: 1,
    title: 'Tablilla de los Custodios',
    text: 'Aquí se ordena el silencio. Cuando la red de sellos se fracturó, mil campanas sonaron a la vez y los Ecos Primordiales despertaron. Los Custodios cerraron la cripta y ataron cada fragmento a un guardián vivo.',
  },
  carta_forja: {
    id: 'carta_forja',
    floor: 2,
    title: 'Carta sin enviar',
    text: 'Forja del Alba, taller bajo. Madre: el hierro de aquí no se enfría. Mis kunai salen con un zumbido dentro. Dicen que el Pulso se queda en el metal. Vuelvo en cuanto fije el último sello de la puerta... ',
  },
  canto_peregrinos: {
    id: 'canto_peregrinos',
    floor: 2,
    title: 'Canto de los Peregrinos',
    text: '«Respira, mide, golpea. Quien lleva prisa, lleva ruido. Quien lleva ruido, despierta al eco.» Los Peregrinos del Pulso lo repiten a cada discípulo antes de enseñarle nada.',
  },
  aviso_campana_hueca: {
    id: 'aviso_campana_hueca',
    floor: 2,
    title: 'Aviso del Círculo',
    text: 'Hermanos de la Campana Hueca: los guardianes duermen en lo más hondo. Cuando la última campana caiga, los Ecos serán libres. Que ningún Custodio llegue al sello. Los huecos de abajo ya nos escuchan.',
  },
  ultimo_registro: {
    id: 'ultimo_registro',
    floor: 3,
    title: 'Último registro del Campanero',
    text: 'Me ofrecí yo. Até mi cuerpo al badajo para que ninguna mano ajena lo moviera. Cuento mis latidos para no olvidar quién fui. Si lees esto, el sello aguanta. Si no, ya no recuerdo mi nombre.',
  },
  marca_del_sello: {
    id: 'marca_del_sello',
    floor: 3,
    title: 'La marca del sello',
    text: 'El sello antiguo se reconoce por tres círculos y una campana partida. Quien lo posee puede cruzar las cámaras selladas. Pero un sello no se usa: se custodia. Elige quién lo merece.',
  },
  noche_mil_campanas: {
    id: 'noche_mil_campanas',
    floor: 3,
    title: 'Nota arrugada',
    text: 'Esa noche el cielo sonó como metal golpeado. Dicen que de cada campana salió un Eco. Pero nadie cuenta que algunos eran niños que se escondieron dentro para no oír.',
  },
};

export function getNote(id: string): NoteDef | undefined {
  return Object.hasOwn(NOTES, id) ? NOTES[id] : undefined;
}

export function notesForFloor(floor: number): NoteDef[] {
  return Object.values(NOTES).filter((n) => n.floor === floor);
}

// ---------- Reliquias ----------

export interface RelicDef {
  id: string;
  name: string;
  description: string;
}

export const RELICS: Record<string, RelicDef> = {
  sello_antiguo: {
    id: 'sello_antiguo',
    name: 'Sello antiguo',
    description: 'Tres círculos y una campana partida. Abre cámaras selladas en futuras expediciones.',
  },
};

export function getRelic(id: string): RelicDef | undefined {
  return Object.hasOwn(RELICS, id) ? RELICS[id] : undefined;
}
