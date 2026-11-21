import type { Affinity } from '../core/types';

/**
 * Protagonistas: cada afinidad inicial trae un shinobi distinto. Son personajes ORIGINALES del universo de Ecos del
 * Shinobi (nombres, ropa y rasgos propios); lo único que comparten con el estilo clásico del género es el color del pelo.
 */

export type HairStyle = 'spiky' | 'long' | 'swept' | 'wave' | 'buns';
export type HeroAccessory = 'goggles' | 'tie' | 'bolt' | 'pearl' | 'beads';

export interface HeroPalette {
  main: string;
  light: string;
  dark: string;
}

export interface Hero {
  id: Affinity;
  name: string;
  /** Apodo que se usa en el menú y en el registro. */
  epithet: string;
  /** Una línea de presentación. */
  blurb: string;
  female: boolean;
  hairStyle: HairStyle;
  hair: HeroPalette;
  tunic: HeroPalette;
  /** Bufanda, cinturón y adornos. */
  trim: { main: string; dark: string };
  eyes: string;
  accessory: HeroAccessory;
}

export const HEROES: Record<Affinity, Hero> = {
  vendaval: {
    id: 'vendaval',
    name: 'Ren Sorae',
    epithet: 'el Viento Inquieto',
    blurb: 'Rubio, travieso y incapaz de quedarse quieto. Corre por los tejados con las gafas de vuelo siempre en la frente.',
    female: false,
    hairStyle: 'spiky',
    hair: { main: '#f6d557', light: '#fff2a6', dark: '#c99a22' },
    tunic: { main: '#1f8a8a', light: '#3fbfb5', dark: '#0f4f55' },
    trim: { main: '#f3efe0', dark: '#b9b29a' },
    eyes: '#3a9bdc',
    accessory: 'goggles',
  },
  ascua: {
    id: 'ascua',
    name: 'Jūrō Kurobane',
    epithet: 'la Brasa Callada',
    blurb: 'Moreno, de melena larga recogida en una coleta. Habla poco; su fuego, mucho.',
    female: false,
    hairStyle: 'long',
    hair: { main: '#1b1620', light: '#4a3b52', dark: '#0b090e' },
    tunic: { main: '#9c2a2a', light: '#c84a3a', dark: '#541414' },
    trim: { main: '#e8803a', dark: '#a04a14' },
    eyes: '#7a3a22',
    accessory: 'tie',
  },
  rayo: {
    id: 'rayo',
    name: 'Tōma Shirasagi',
    epithet: 'el Relámpago Blanco',
    blurb: 'Pelo blanco desde niño, mirada serena y un pulso que no tiembla. Golpea antes de que oigas el trueno.',
    female: false,
    hairStyle: 'swept',
    hair: { main: '#eef1fb', light: '#ffffff', dark: '#a8b1d2' },
    tunic: { main: '#3b3470', light: '#5d56a8', dark: '#1d1a3d' },
    trim: { main: '#ffd23f', dark: '#b8901a' },
    eyes: '#d9b94a',
    accessory: 'bolt',
  },
  marea: {
    id: 'marea',
    name: 'Mizuna Aoyagi',
    epithet: 'la Calma del Oleaje',
    blurb: 'Pelo azul y larga trenza lateral. Cura, protege y empuja: el agua nunca tiene prisa, pero siempre llega.',
    female: true,
    hairStyle: 'wave',
    hair: { main: '#3f8fe0', light: '#86ccff', dark: '#1f5fa8' },
    tunic: { main: '#1f4f8f', light: '#3d7dc8', dark: '#10294f' },
    trim: { main: '#d8f3ff', dark: '#7bb6cc' },
    eyes: '#2a6fa0',
    accessory: 'pearl',
  },
  piedra: {
    id: 'piedra',
    name: 'Momoka Iwase',
    epithet: 'el Muro Florecido',
    blurb: 'Pelo rosa recogido en dos moños y puños de granito. Donde ella planta los pies, el suelo obedece.',
    female: true,
    hairStyle: 'buns',
    hair: { main: '#f58fb3', light: '#ffc6d9', dark: '#c55a85' },
    tunic: { main: '#a8793a', light: '#cfa05a', dark: '#5e4020' },
    trim: { main: '#6aa84f', dark: '#3d6b2c' },
    eyes: '#3a8a5a',
    accessory: 'beads',
  },
};

/** El protagonista que corresponde a la afinidad con la que empieza la expedición. */
export function heroFor(affinity: Affinity): Hero {
  return HEROES[affinity];
}
