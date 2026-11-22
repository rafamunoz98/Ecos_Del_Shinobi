/*
 * Narrativa del prototipo: diálogos breves, maestros/eventos con decisiones y notas de lectura opcional.
 * Todo es original y está ligado al mundo de `03_mundo_lore_y_facciones.md` (Noche de las Mil Campanas, Ecos,
 * Custodios del Umbral, Círculo de la Campana Hueca, Peregrinos del Pulso). Los diálogos son cortos a propósito.
 */

import type { Affinity } from '../core/types';
import { AFFINITIES, AFFINITY_NAMES } from './affinities';
import { HEROES } from './heroes';

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
  eco_derrota: {
    id: 'eco_derrota',
    speaker: 'Un eco que se apaga',
    lines: ['Tenía tu paso y tu mirada. Cayó en el sector donde tú caerías.', 'Se deshace sin rencor: lo que llevaba ya es tuyo.', 'La cripta ya no lo recuerda.'],
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
  sokan_intro: {
    id: 'sokan_intro',
    speaker: 'Sōkan, Predicador Hueco',
    portrait: { kind: 'enemy', id: 'sokan_predicador' },
    lines: [
      'Otro Custodio con paso ligero. Las campanas ya te habían contado.',
      'Soy Sōkan, del Círculo de la Campana Hueca. Vacié mi nombre para que el Pulso cupiera entero en mí.',
      'El sello de abajo no se repara: se escucha. Déjame tocarlo y los Ecos serán libres.',
    ],
  },
  sokan_fase2: {
    id: 'sokan_fase2',
    speaker: 'Sōkan, Predicador Hueco',
    portrait: { kind: 'enemy', id: 'sokan_predicador' },
    lines: ['¡Mi cayado vibra! Oye cómo la cripta responde a mis campanillas...'],
  },
  sokan_fase3: {
    id: 'sokan_fase3',
    speaker: 'Sōkan, Predicador Hueco',
    portrait: { kind: 'enemy', id: 'sokan_predicador' },
    lines: ['Salid, hermanos del hueco. No hay sello que baste contra tantos ecos.'],
  },
  sokan_derrota: {
    id: 'sokan_derrota',
    speaker: 'Sōkan, Predicador Hueco',
    portrait: { kind: 'enemy', id: 'sokan_predicador' },
    lines: [
      'Silencio... qué pesado es el silencio cuando uno lo ha temido tanto.',
      'Toma el sello antiguo. Pero no te fíes de quien me envió: bajo la cripta hay un bosque que nadie plantó.',
      'Allí manda alguien que fue de los tuyos. Cuídate de sus hilos.',
    ],
  },
  yugiri_intro: {
    id: 'yugiri_intro',
    speaker: 'Yūgiri, el Hilo Roto',
    portrait: { kind: 'enemy', id: 'yugiri_hilo_roto' },
    lines: [
      'Has llegado hasta el último nudo. La Casa del Hilo Gris no enseña a rendirse, y yo fui su mejor rastreadora.',
      'Cartografié estas raíces hasta que me susurraron. Ahora no trazo mapas: tejo caminos que no tienen salida.',
      'Si quieres cruzar, tendrás que cortar todos mis hilos. Uno a uno.',
    ],
  },
  yugiri_fase2: {
    id: 'yugiri_fase2',
    speaker: 'Yūgiri, el Hilo Roto',
    portrait: { kind: 'enemy', id: 'yugiri_hilo_roto' },
    lines: ['Buen corte. Pero el suelo entero es mi telar: no pises donde brilla.'],
  },
  yugiri_fase3: {
    id: 'yugiri_fase3',
    speaker: 'Yūgiri, el Hilo Roto',
    portrait: { kind: 'enemy', id: 'yugiri_hilo_roto' },
    lines: ['Quien me sigue no ve a quién persigue. ¿Cuál de nosotras soy?'],
  },
  yugiri_derrota: {
    id: 'yugiri_derrota',
    speaker: 'Yūgiri, el Hilo Roto',
    portrait: { kind: 'enemy', id: 'yugiri_hilo_roto' },
    lines: [
      'Se rompió... el último hilo. Qué ligero.',
      'Llévate mi carrete: dibuja caminos de vuelta a casa. Yo ya no los necesito.',
      'La cripta aún respira ahí abajo. Alguien tendrá que seguir escuchando.',
    ],
  },
  mercader_intro: {
    id: 'mercader_intro',
    speaker: 'Mercader del Hilo Gris',
    portrait: { kind: 'npc', id: 'mercader' },
    lines: [
      'Los jefes caen y yo aparezco: es mi oficio. Oro por mercancía, sin preguntas.',
      'Todo lo que vendo viene identificado y sin maldiciones. Lo que encuentres por ahí... ya es cosa tuya.',
    ],
  },
  tobari_intro: {
    id: 'tobari_intro',
    speaker: 'Maestro Tobari',
    portrait: { kind: 'npc', id: 'maestro_tobari' },
    lines: [
      'Peregrino del Pulso, como mi hermana Sayoko. Ella enseña en lo alto; yo, donde la raíz se traga el sonido.',
      'Más abajo espera quien rompió el último hilo. No te enseño a ganar: te enseño a no perder lo que ya tienes.',
    ],
  },
  tobari_after: {
    id: 'tobari_after',
    speaker: 'Maestro Tobari',
    portrait: { kind: 'npc', id: 'maestro_tobari' },
    lines: ['Eso es todo lo que puedo darte. Respira hondo antes del último nudo.'],
  },
};

// ---------- Maestros y eventos con decisiones ----------

export type Gain =
  | { kind: 'power'; amount: number }
  | { kind: 'defense'; amount: number }
  | { kind: 'maxKiro'; amount: number }
  | { kind: 'maxHp'; amount: number }
  | { kind: 'healFull' }
  | { kind: 'advancedTechnique' }
  /** Revela qué esconde todo tu equipo y tus joyas sin identificar. */
  | { kind: 'identify' }
  /** Te da objetos (ya los reconoces). */
  | { kind: 'item'; id: string; count: number }
  /** Libera al prisionero: se une a ti como compañero (solo uno por expedición). */
  | { kind: 'companion' };

/** Coste de una opción. `kiro: 'all'` gasta todo el kiro actual (exige al menos `minKiro`). */
export interface Cost {
  hp?: number;
  coins?: number;
  shards?: number;
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
    // El altar muestra solo ALTAR_OFFERS de estas opciones (distintas en cada altar y en cada partida): ver `altarOffer`.
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
      {
        id: 'temple',
        label: 'Temple a fuego lento',
        description: 'Pierdes 8 de vida. Ganas +1 de poder y +1 de defensa.',
        cost: { hp: 8 },
        gains: [
          { kind: 'power', amount: 1 },
          { kind: 'defense', amount: 1 },
        ],
      },
      {
        id: 'ayuno',
        label: 'Ayuno ritual',
        description: 'Pierdes 4 de vida. Ganas +4 de kiro máximo.',
        cost: { hp: 4 },
        gains: [{ kind: 'maxKiro', amount: 4 }],
      },
      {
        id: 'pozo',
        label: 'Moneda al pozo del eco',
        description: 'Arrojas 15 monedas. Ganas +5 de vida máxima y te curas del todo.',
        cost: { coins: 15 },
        gains: [
          { kind: 'maxHp', amount: 5 },
          { kind: 'healFull' },
        ],
      },
      {
        id: 'fundicion',
        label: 'Esquirlas al fuego',
        description: 'Fundes 3 esquirlas en el altar. Ganas +1 de poder.',
        cost: { shards: 3 },
        gains: [{ kind: 'power', amount: 1 }],
      },
      {
        id: 'vision',
        label: 'Visión del eco',
        description: 'Pierdes 3 de vida. El eco te muestra qué esconde todo tu equipo y tus joyas sin identificar.',
        cost: { hp: 3 },
        gains: [{ kind: 'identify' }],
      },
      {
        id: 'limosna',
        label: 'Limosna al santuario',
        description: 'Dejas 10 monedas. Recibes dos Pociones de Sanación.',
        cost: { coins: 10 },
        gains: [{ kind: 'item', id: 'pocion:sanacion', count: 2 }],
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
  maestro_tobari: {
    id: 'maestro_tobari',
    name: 'Maestro Tobari',
    kindLabel: 'Maestro',
    introId: 'tobari_intro',
    afterId: 'tobari_after',
    options: [
      { id: 'tecnica_oculta', label: 'Técnica oculta', description: 'Aprendes una técnica de tu afinidad que no podrías conseguir por nivel (si queda alguna).', gains: [{ kind: 'advancedTechnique' }] },
      { id: 'temple', label: 'Temple de raíz', description: '+6 de vida máxima y recuperas toda la vida.', gains: [{ kind: 'maxHp', amount: 6 }, { kind: 'healFull' }] },
      { id: 'aliento', label: 'Aliento del bosque', description: '+6 de kiro máximo.', gains: [{ kind: 'maxKiro', amount: 6 }] },
      { id: 'filo_y_piel', label: 'Filo y piel', description: 'Pagas 5 de vida. +1 de poder y +1 de defensa.', cost: { hp: 5 }, gains: [{ kind: 'power', amount: 1 }, { kind: 'defense', amount: 1 }] },
    ],
  },
};

// ---------- Compañeros: los otros protagonistas, cautivos en el sector 2 ----------

/** Tipo de PNJ del prisionero cuya afinidad es `a` (el compañero que cubre tu debilidad). */
export const captiveKind = (a: Affinity): string => `cautivo_${a}`;
export const isCaptiveKind = (kind: string): boolean => kind.startsWith('cautivo_');

const CAPTIVE_LINES: Record<Affinity, string[]> = {
  ascua: ['«Los Ecos me ataron mientras dormía. No suelo pedir favores...»', '«...pero si me sueltas, mi fuego arderá a tu lado. Callado, como siempre.»'],
  marea: ['«Tranquilo, tranquila: llevo horas oyendo gotear esta cripta y ya no me asusta nada.»', '«Suéltame y te cubro la espalda. El agua sabe esperar, pero también sabe cortar.»'],
  vendaval: ['«¡Por fin alguien! Llevo una eternidad aquí atado y ni siquiera hay una ventana por la que escaparme.»', '«Suéltame y corro por los dos. ¡Prometo no salir volando sin avisar!»'],
  piedra: ['«Me dejaron aquí como una piedra más. Qué poco entienden a las piedras.»', '«Suéltame. Aguanto lo que a ti te tumba, y lo que no, lo rompo.»'],
  rayo: ['«Un golpe seco y me ataron. Fue rápido... pero yo soy más rápido.»', '«Desátame y me verás. Y si algo te cae encima, ya me encargo yo.»'],
};

for (const a of AFFINITIES) {
  const hero = HEROES[a];
  const kind = captiveKind(a);
  DIALOGUES[`${kind}_intro`] = {
    id: `${kind}_intro`,
    speaker: `${hero.name}, ${hero.epithet}`,
    portrait: { kind: 'npc', id: kind },
    lines: [`Atado a una columna hay un shinobi de otra casa. Domina ${AFFINITY_NAMES[a]}.`, ...CAPTIVE_LINES[a], 'Solo puedes llevar a un compañero en la expedición: piénsalo.'],
  };
  DIALOGUES[`${kind}_after`] = {
    id: `${kind}_after`,
    speaker: hero.name,
    portrait: { kind: 'npc', id: kind },
    lines: ['«Ya estoy contigo. Sigamos.»'],
  };
  NPCS[kind] = {
    id: kind,
    name: hero.name,
    kindLabel: 'Prisionero',
    introId: `${kind}_intro`,
    afterId: `${kind}_after`,
    options: [
      {
        id: 'liberar',
        label: 'Cortar las ataduras',
        description: `${hero.name} se une a ti: lucha a tu lado con ${AFFINITY_NAMES[a]} (más fuerte contra quien es débil a ella), te sigue de sector en sector y, si cae, se recupera al cruzar la escalera.`,
        gains: [{ kind: 'companion' }],
      },
    ],
  };
}

export function getNpc(kind: string): NpcDef | undefined {
  return Object.hasOwn(NPCS, kind) ? NPCS[kind] : undefined;
}

/** Identificador del altar y cuántas opciones ofrece cada uno (de las de su lista). */
export const ALTAR_KIND = 'altar_eco_roto';
export const ALTAR_OFFERS = 3;

/** Sortea las opciones que ofrecerá un altar: ALTAR_OFFERS de las de su lista, distintas entre sí. */
export function altarOffer(rng: { shuffle<T>(items: T[]): T[] }): string[] {
  return rng.shuffle(NPCS[ALTAR_KIND].options.map((o) => o.id)).slice(0, ALTAR_OFFERS);
}

/** Las opciones que de verdad ofrece un PNJ concreto (todas, salvo los altares, que solo muestran las suyas). */
export function npcOptions(npc: { kind: string; offer?: readonly string[] }): NpcOption[] {
  const def = getNpc(npc.kind);
  if (!def) return [];
  if (!npc.offer) return def.options;
  return npc.offer.map((id) => def.options.find((o) => o.id === id)).filter((o): o is NpcOption => o !== undefined);
}

/** Eventos/maestros que aparecen en cada sector (uno por sector, por ahora). */
export const NPC_BY_FLOOR: Record<number, string> = {
  1: 'altar_eco_roto',
  2: 'maestra_sayoko',
  4: 'altar_eco_roto',
  5: 'maestro_tobari',
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
    title: 'Último registro de un Custodio',
    text: 'Sōkan vino a la cripta como uno de los nuestros. Cada noche se quedaba más rato junto a la campana rota, oyendo. Al décimo día dejó de decir su nombre. Si encuentras esto, no te acerques a su cayado: las campanillas no suenan, responden.',
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
  mapa_sin_final: {
    id: 'mapa_sin_final',
    floor: 4,
    title: 'Mapa sin final',
    text: 'Casa del Hilo Gris, cuaderno de Yūgiri. Hoy el bosque cambió la senda otra vez. Ya no dibujo lo que veo: dibujo lo que me pide. Si algún día no regreso, quemad mis mapas. Los caminos de este sitio no llevan a ninguna parte, llevan a ella.',
  },
  carta_envenenador: {
    id: 'carta_envenenador',
    floor: 4,
    title: 'Receta manchada',
    text: 'Una gota de savia de raíz hundida en agua de pozo da una fiebre lenta. Dos gotas, un sueño sin despertar. No uses la tercera: la tercera responde. (Anotado debajo, con otra letra: «Funciona. Maldito sea el bosque.»)',
  },
  voz_de_la_raiz: {
    id: 'voz_de_la_raiz',
    floor: 5,
    title: 'Lo que dicen las raíces',
    text: 'Los viejos Peregrinos dicen que bajo las ruinas no hay cimientos, hay un árbol. Que la Noche de las Mil Campanas fue el crujido de su tronco. Que los Ecos son lo que cae de sus hojas.',
  },
  hilo_gris: {
    id: 'hilo_gris',
    floor: 5,
    title: 'Juramento del Hilo Gris',
    text: '«Seguimos el rastro hasta el final, volvemos con el mapa o no volvemos.» Yūgiri lo recitaba en voz alta cada mañana. Un día dejó de volver. Una parte de ella siguió el rastro y no encontró el final: encontró el principio.',
  },
  ultimo_nudo: {
    id: 'ultimo_nudo',
    floor: 6,
    title: 'Último nudo',
    text: 'Quien llegue hasta aquí que sepa que cada hilo tiene dos puntas. Yo ato la mía a la raíz y la otra a quien me siga. Si la tiras con fuerza, se rompe. Si la sigues con calma, ves quién tira del otro lado.',
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
  carrete_roto: {
    id: 'carrete_roto',
    name: 'Carrete del Hilo Roto',
    description: 'Un carrete de hilo gris que aún tira hacia un norte que ya no existe. Recuerdo de Yūgiri.',
  },
  sello_antiguo: {
    id: 'sello_antiguo',
    name: 'Sello antiguo',
    description: 'Tres círculos y una campana partida. Abre cámaras selladas en futuras expediciones.',
  },
};

export function getRelic(id: string): RelicDef | undefined {
  return Object.hasOwn(RELICS, id) ? RELICS[id] : undefined;
}
