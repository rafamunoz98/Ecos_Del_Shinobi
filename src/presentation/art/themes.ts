/**
 * Paletas y ambientes. La estética depende de cuántos jefes has derrotado: todos los sectores de una zona se ven igual y el
 * aspecto cambia al caer su jefe (ver `themeFor`).
 */
export interface Theme {
  name: string;
  /** Losas del suelo (dos tonos entre los que se mezclan) y juntas. */
  floorA: string;
  floorB: string;
  grout: string;
  /** Roca de pared: cara frontal (ladrillos), cima, y masa interior. */
  faceLight: string;
  faceDark: string;
  mortar: string;
  roof: string;
  roofDark: string;
  lip: string;
  /** Acento de superficie: musgo, sal, ceniza. */
  accent: string;
  accent2: string;
  /** Color de la oscuridad (niebla) y de la luz cálida del jugador. */
  fog: string;
  glow: string;
  ambient: 'luciernagas' | 'sal' | 'brasas';
  ambientColor: string;
  /** Variante de decoración del suelo. */
  deco: 'hierba' | 'cristal' | 'grieta';
}

export const THEMES: readonly Theme[] = [
  {
    name: 'Bosque del Umbral',
    floorA: '#7a8769',
    floorB: '#8b9879',
    grout: '#3a4434',
    faceLight: '#7b7466',
    faceDark: '#4f4a42',
    mortar: '#2f2c27',
    roof: '#3d4a3a',
    roofDark: '#232c24',
    lip: '#a7a28d',
    accent: '#7bb15a',
    accent2: '#b8d96a',
    fog: '#05080a',
    glow: '#ffd9a0',
    ambient: 'luciernagas',
    ambientColor: '#e8f58a',
    deco: 'hierba',
  },
  {
    name: 'Catacumbas de Sal',
    floorA: '#7b869b',
    floorB: '#8d98ad',
    grout: '#394152',
    faceLight: '#7d869a',
    faceDark: '#505869',
    mortar: '#2b303c',
    roof: '#3a4152',
    roofDark: '#1f2430',
    lip: '#b6c0d6',
    accent: '#dfe9f5',
    accent2: '#8fb8ff',
    fog: '#04060d',
    glow: '#d8e6ff',
    ambient: 'sal',
    ambientColor: '#e6f0ff',
    deco: 'cristal',
  },
  {
    name: 'Santuario de Ceniza',
    floorA: '#6c607f',
    floorB: '#7d7194',
    grout: '#2f2640',
    faceLight: '#6e6078',
    faceDark: '#41364c',
    mortar: '#231c2a',
    roof: '#2f2539',
    roofDark: '#171120',
    lip: '#a592b8',
    accent: '#ff8a3d',
    accent2: '#ffd36a',
    fog: '#07040b',
    glow: '#ffb38a',
    ambient: 'brasas',
    ambientColor: '#ff9a4d',
    deco: 'grieta',
  },
];

/** Raíces Hundidas: la segunda zona, bajo la cripta (tierra parda, raíces y hongos luminosos: nada que ver con el bosque verde). */
const ROOTS: Theme = {
  name: 'Raíces Hundidas',
  floorA: '#8a6c4d',
  floorB: '#9b7b58',
  grout: '#3a2818',
  faceLight: '#6f4f38',
  faceDark: '#46301f',
  mortar: '#24160d',
  roof: '#3b2819',
  roofDark: '#1c110a',
  lip: '#c49a6a',
  accent: '#4fe0c0',
  accent2: '#c08cff',
  fog: '#080403',
  glow: '#ffcf9a',
  ambient: 'luciernagas',
  ambientColor: '#6ff0d4',
  deco: 'hierba',
};

/** Estética por jefes derrotados: 0 = Bosque del Umbral, 1 = Raíces Hundidas, 2 o más = Santuario de Ceniza. */
export const ZONE_THEMES: readonly Theme[] = [THEMES[0], ROOTS, THEMES[2]];
export const themeFor = (bossesDefeated: number): Theme => ZONE_THEMES[Math.min(Math.max(0, bossesDefeated), ZONE_THEMES.length - 1)];
