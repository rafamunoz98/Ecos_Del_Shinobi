import type { Affinity } from '../../core/types';
import { HEROES, type Hero } from '../../content/heroes';
import type { WeaponKind } from '../../content/weapons';
import { echoWisp, explosiveDoll, hollowMonk, sealTablet } from './bosses';
import { drawShinobiEnemy } from './shinobi';
import { type HeroView, drawHeroHairBehind, drawHeroHead } from './heroes';
import { type Ctx, INK, circle, ellipse, radial, roundRectPath, vGrad } from './draw';

/**
 * Personajes y enemigos dibujados con formas vectoriales. El contexto llega ya trasladado al centro
 * de la casilla y escalado para que 1 unidad = 1 casilla; los pies quedan en y ≈ +0.34.
 */

export type Dir = 'down' | 'up' | 'left' | 'right';

export interface ActorPose {
  /** Tiempo en segundos (anima respiración, bufanda...). */
  t: number;
  /** 0..1: cuánto camina ahora mismo (rebote y piernas). */
  walk: number;
  /** Fase de la marcha en radianes. */
  phase: number;
  alpha?: number;
  /** Cargando un ataque anunciado (solo lo usan los enemigos que los tienen). */
  charging?: boolean;
  /** Fase del jefe (1-3). */
  bossPhase?: number;
}

const stroke = (ctx: Ctx, w = 0.045): void => {
  ctx.strokeStyle = INK;
  ctx.lineWidth = w;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
};

function shadow(ctx: Ctx, rx = 0.26, ry = 0.08, a = 0.36, y = 0.35): void {
  ctx.fillStyle = `rgba(6,4,12,${a})`;
  ellipse(ctx, 0, y, rx, ry);
  ctx.fill();
}

// ---------- Shinobi ----------

export interface NinjaOptions extends ActorPose {
  dir: Dir;
  /** Protagonista concreto (según su afinidad inicial). Sin él se dibuja el shinobi encapuchado genérico. */
  hero?: Hero;
  weapon?: WeaponKind;
  protected?: boolean;
}

const NAVY = '#2b2d4a';
const NAVY_D = '#16172a';
const NAVY_L = '#464a78';
const RED = '#d62839';
const RED_D = '#8f1522';
const SKIN = '#e9c39b';

const side0 = (d: Dir): boolean => d === 'left' || d === 'right';

export function drawNinja(ctx: Ctx, o: NinjaOptions): void {
  const { t, walk, phase } = o;
  const hero = o.hero;
  const pal = hero
    ? { main: hero.tunic.main, light: hero.tunic.light, dark: hero.tunic.dark, trim: hero.trim.main, trimDark: hero.trim.dark }
    : { main: NAVY, light: NAVY_L, dark: NAVY_D, trim: RED, trimDark: RED_D };
  const view: HeroView = o.dir === 'up' ? 'back' : side0(o.dir) ? 'side' : 'front';
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  shadow(ctx);
  const bob = Math.sin(t * 2.6) * 0.012 * (1 - walk) - Math.abs(Math.sin(phase)) * 0.045 * walk;
  const mirror = o.dir === 'left';
  const side = o.dir === 'left' || o.dir === 'right';
  if (mirror) ctx.scale(-1, 1);
  ctx.translate(0, bob);

  const swing = Math.sin(phase) * 0.05 * walk;
  const wave = (k: number, amp: number): number => Math.sin(t * 6 + k) * amp;

  // Bufanda: se dibuja detrás en frontal/lateral y delante en espalda.
  const scarf = (): void => {
    const tails = side ? [[-0.1, 0.0]] : [[-0.1, 0.02], [0.1, 0.02]];
    tails.forEach(([sx, sy], i) => {
      const dirX = side ? -1 : sx < 0 ? -1 : 1;
      const lag = walk * 0.1 + 0.05;
      ctx.beginPath();
      ctx.moveTo(sx, -0.02 + sy);
      ctx.bezierCurveTo(sx + dirX * 0.1, -0.02 + wave(i, 0.03), sx + dirX * 0.2, 0.0 + wave(i + 1, 0.04), sx + dirX * (0.28 + lag), 0.06 + wave(i + 2, 0.05));
      ctx.lineTo(sx + dirX * (0.26 + lag), 0.13 + wave(i + 3, 0.05));
      ctx.bezierCurveTo(sx + dirX * 0.16, 0.08 + wave(i + 4, 0.03), sx + dirX * 0.08, 0.06, sx, 0.05 + sy);
      ctx.closePath();
      ctx.fillStyle = vGrad(ctx, -0.04, 0.14, pal.trim, pal.trimDark);
      ctx.fill();
      stroke(ctx, 0.035);
    });
  };
  if (hero) drawHeroHairBehind(ctx, hero, view, t, walk);
  if (o.dir !== 'up') scarf();

  // Piernas.
  for (const sx of [-1, 1]) {
    const lift = sx * swing;
    roundRectPath(ctx, sx * 0.085 - 0.06, 0.18 + (lift > 0 ? -lift : 0), 0.12, 0.17 + lift * 0.4, 0.04);
    ctx.fillStyle = vGrad(ctx, 0.18, 0.35, pal.main, pal.dark);
    ctx.fill();
    stroke(ctx);
    // Botín.
    roundRectPath(ctx, sx * 0.085 - 0.07, 0.3 + (lift > 0 ? -lift : 0) * 0.5, 0.14, 0.06, 0.03);
    ctx.fillStyle = '#e8e4da';
    ctx.fill();
    stroke(ctx, 0.03);
  }

  // Arma a la espalda (solo vista trasera: espada cruzada).
  if (o.dir === 'up') {
    ctx.save();
    ctx.rotate(-0.7);
    roundRectPath(ctx, -0.02, -0.25, 0.04, 0.48, 0.02);
    ctx.fillStyle = '#c4cad8';
    ctx.fill();
    stroke(ctx, 0.03);
    ctx.fillStyle = '#5b3a24';
    ctx.fillRect(-0.03, 0.2, 0.06, 0.1);
    ctx.restore();
  }

  // Torso.
  roundRectPath(ctx, -0.17, -0.03, 0.34, 0.27, 0.08);
  ctx.fillStyle = vGrad(ctx, -0.03, 0.24, pal.light, pal.dark);
  ctx.fill();
  stroke(ctx);
  // Cinturón y nudo.
  ctx.fillStyle = pal.trim;
  ctx.fillRect(-0.17, 0.14, 0.34, 0.055);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.025;
  ctx.strokeRect(-0.17, 0.14, 0.34, 0.055);
  if (o.dir === 'down') {
    ctx.fillStyle = pal.trimDark;
    circle(ctx, 0.0, 0.167, 0.032);
    ctx.fill();
    // Solapa cruzada.
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    ctx.moveTo(-0.11, -0.02);
    ctx.lineTo(0.04, 0.14);
    ctx.stroke();
  }

  if (hero?.female) {
    // Falda corta de la túnica.
    ctx.beginPath();
    ctx.moveTo(-0.17, 0.18);
    ctx.lineTo(0.17, 0.18);
    ctx.lineTo(0.215, 0.3);
    ctx.quadraticCurveTo(0, 0.325, -0.215, 0.3);
    ctx.closePath();
    ctx.fillStyle = vGrad(ctx, 0.18, 0.32, pal.main, pal.dark);
    ctx.fill();
    stroke(ctx, 0.035);
    ctx.fillStyle = pal.trim;
    ctx.fillRect(-0.17, 0.14, 0.34, 0.055);
  }

  // Brazos.
  const armY = 0.06;
  const arm = (sx: number, ang: number): void => {
    ctx.save();
    ctx.translate(sx * 0.19, armY);
    ctx.rotate(ang);
    roundRectPath(ctx, -0.045, -0.03, 0.09, 0.17, 0.045);
    ctx.fillStyle = pal.main;
    ctx.fill();
    stroke(ctx, 0.04);
    ctx.fillStyle = SKIN;
    circle(ctx, 0, 0.15, 0.04);
    ctx.fill();
    stroke(ctx, 0.025);
    ctx.restore();
  };
  if (side) {
    arm(-1, -swing * 4);
    arm(1, swing * 4 - 0.4);
  } else {
    arm(-1, 0.12 + swing * 3);
    arm(1, -0.12 - swing * 3);
  }

  if (hero) {
    drawHeroHead(ctx, hero, view, t, -0.15);
  } else {
    // Cabeza con capucha.
    const hy = -0.15;
    ctx.beginPath();
    ctx.arc(0, hy, 0.215, 0, Math.PI * 2);
    ctx.fillStyle = radial(ctx, -0.07, hy - 0.09, 0.02, 0.26, pal.light, pal.dark);
    ctx.fill();
    stroke(ctx, 0.05);

    if (o.dir !== 'up') {
      // Abertura de la capucha con los ojos (hacia el lado al que mira).
      const fx = side ? 0.06 : 0;
      const fw = side ? 0.12 : 0.15;
      roundRectPath(ctx, fx - fw, hy - 0.075, fw * 2 + (side ? 0.07 : 0), 0.105, 0.05);
      ctx.fillStyle = SKIN;
      ctx.fill();
      stroke(ctx, 0.03);
      const eyes = side ? [0.1] : [-0.07, 0.07];
      for (const ex of eyes) {
        ctx.fillStyle = '#ffffff';
        ellipse(ctx, ex, hy - 0.022, 0.038, 0.042);
        ctx.fill();
        ctx.fillStyle = INK;
        circle(ctx, ex + (side ? 0.012 : 0), hy - 0.016, 0.024);
        ctx.fill();
        ctx.fillStyle = '#fff';
        circle(ctx, ex + (side ? 0.02 : 0.008), hy - 0.026, 0.009);
        ctx.fill();
      }
      // Máscara bajo la abertura.
      ctx.fillStyle = pal.dark;
      roundRectPath(ctx, fx - fw - 0.005, hy + 0.03, fw * 2 + (side ? 0.08 : 0.01), 0.1, 0.05);
      ctx.fill();
    }
    // Banda de la frente con placa.
    ctx.fillStyle = pal.trim;
    ctx.beginPath();
    ctx.moveTo(-0.205, hy - 0.1);
    ctx.quadraticCurveTo(0, hy - 0.16, 0.205, hy - 0.1);
    ctx.lineTo(0.2, hy - 0.06);
    ctx.quadraticCurveTo(0, hy - 0.12, -0.2, hy - 0.06);
    ctx.closePath();
    ctx.fill();
    stroke(ctx, 0.03);
    if (o.dir === 'down') {
      roundRectPath(ctx, -0.055, hy - 0.125, 0.11, 0.055, 0.015);
      ctx.fillStyle = '#d8dde8';
      ctx.fill();
      stroke(ctx, 0.025);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.02;
      ctx.beginPath();
      ctx.arc(0, hy - 0.097, 0.014, 0.4, Math.PI * 1.8);
      ctx.stroke();
    }
    // Brillo de la capucha.
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    ctx.arc(0, hy, 0.17, Math.PI * 1.1, Math.PI * 1.45);
    ctx.stroke();

  }

  if (o.dir === 'up') scarf();

  // Arma en mano (vista frontal/lateral).
  if (o.dir !== 'up' && o.weapon) drawHeldWeapon(ctx, o.weapon, side);

  ctx.restore();

  if (o.protected) {
    ctx.save();
    const pulse = 0.5 + 0.5 * Math.sin(t * 3);
    ctx.fillStyle = radial(ctx, 0, 0.02, 0.1, 0.44, 'rgba(120,180,255,0.04)', `rgba(120,180,255,${0.2 + pulse * 0.12})`);
    circle(ctx, 0, 0.02, 0.44);
    ctx.fill();
    ctx.strokeStyle = `rgba(190,225,255,${0.55 + pulse * 0.25})`;
    ctx.lineWidth = 0.025;
    ctx.stroke();
    ctx.restore();
  }
}

function drawHeldWeapon(ctx: Ctx, kind: WeaponKind, side: boolean): void {
  ctx.save();
  const hx = side ? 0.2 : 0.2;
  const hy = 0.2;
  ctx.translate(hx, hy);
  if (kind === 'blade') {
    ctx.rotate(side ? -1.15 : 0.45);
    roundRectPath(ctx, -0.02, -0.04, 0.04, 0.09, 0.015);
    ctx.fillStyle = '#5b3a24';
    ctx.fill();
    stroke(ctx, 0.025);
    ctx.fillStyle = '#c9a24a';
    ctx.fillRect(-0.05, -0.06, 0.1, 0.03);
    ctx.beginPath();
    ctx.moveTo(-0.03, -0.06);
    ctx.lineTo(-0.02, -0.3);
    ctx.lineTo(0.0, -0.34);
    ctx.lineTo(0.03, -0.3);
    ctx.lineTo(0.03, -0.06);
    ctx.closePath();
    ctx.fillStyle = vGrad(ctx, -0.34, -0.06, '#f5f8ff', '#97a0b8');
    ctx.fill();
    stroke(ctx, 0.03);
  } else if (kind === 'whip') {
    ctx.strokeStyle = '#aeb6c6';
    ctx.lineWidth = 0.03;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(0.15, 0.08, 0.2, -0.12, 0.08, -0.16);
    ctx.bezierCurveTo(-0.04, -0.2, -0.02, -0.04, 0.12, -0.06);
    ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.012;
    ctx.stroke();
    roundRectPath(ctx, -0.025, -0.02, 0.05, 0.1, 0.02);
    ctx.fillStyle = '#6a4326';
    ctx.fill();
    stroke(ctx, 0.022);
  } else {
    ctx.rotate(side ? -1.35 : 0.22);
    ctx.strokeStyle = '#8a9a52';
    ctx.lineWidth = 0.04;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0.18);
    ctx.lineTo(0, -0.46);
    ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.012;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -0.62);
    ctx.lineTo(0.045, -0.46);
    ctx.lineTo(-0.045, -0.46);
    ctx.closePath();
    ctx.fillStyle = '#e9edf5';
    ctx.fill();
    stroke(ctx, 0.025);
  }
  ctx.restore();
}

// ---------- Enemigos ----------

export interface EnemyPose extends ActorPose {
  /** 1 = mira a la derecha, -1 = a la izquierda. */
  face: 1 | -1;
}

export function drawEnemy(ctx: Ctx, kind: string, o: EnemyPose): void {
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.scale(o.face, 1);
  switch (kind) {
    case 'acechador_hollin':
      stalker(ctx, o);
      break;
    case 'cuervo_de_sal':
      crow(ctx, o);
      break;
    case 'larva_de_piedra':
      grub(ctx, o);
      break;
    case 'monje_hueco':
      hollowMonk(ctx, o);
      break;
    case 'eco_menor':
      echoWisp(ctx, o);
      break;
    case 'tablilla_sello':
      sealTablet(ctx, o);
      break;
    case 'marioneta_explosiva':
      explosiveDoll(ctx, o);
      break;
    case 'tirador_de_junco':
      reedShooter(ctx, o);
      break;
    case 'lobo_de_raiz':
      rootWolf(ctx, o);
      break;
    case 'espora_flotante':
      sporeBloom(ctx, o);
      break;
    default:
      if (kind.startsWith('eco_') && Object.hasOwn(HEROES, kind.slice(4))) echoOfHero(ctx, kind.slice(4) as Affinity, o);
      else if (!drawShinobiEnemy(ctx, kind, o)) stalker(ctx, o);
  }
  ctx.restore();
}

/** El eco de una expedición caída: el protagonista de esa afinidad, transparente, desvaído y con un halo violeta que tiembla. */
function echoOfHero(ctx: Ctx, a: Affinity, o: EnemyPose): void {
  ctx.save();
  const flick = 0.5 + Math.sin(o.t * 5) * 0.08;
  ctx.fillStyle = radial(ctx, 0, 0.0, 0.05, 0.6, 'rgba(176,120,255,0.45)', 'rgba(176,120,255,0)');
  circle(ctx, 0, 0.0, 0.6);
  ctx.fill();
  ctx.globalAlpha *= flick + 0.25;
  ctx.filter = 'grayscale(0.7) brightness(0.85)';
  drawNinja(ctx, { ...o, dir: o.face === 1 ? 'right' : 'left', hero: HEROES[a] });
  ctx.restore();
}

function stalker(ctx: Ctx, { t, walk, phase }: ActorPose): void {
  shadow(ctx, 0.3, 0.09, 0.4);
  const bob = Math.sin(t * 3.2) * 0.016 - Math.abs(Math.sin(phase)) * 0.04 * walk;
  ctx.save();
  ctx.translate(0, bob);
  // Volutas de hollín que suben.
  for (let i = 0; i < 4; i++) {
    const k = ((t * 0.7 + i * 0.27) % 1);
    ctx.fillStyle = `rgba(30,24,36,${0.4 * (1 - k)})`;
    circle(ctx, -0.14 + i * 0.1 + Math.sin(t * 2 + i) * 0.03, -0.1 - k * 0.32, 0.04 + k * 0.05);
    ctx.fill();
  }
  // Brazos largos con garras.
  for (const sx of [-1, 1]) {
    const sway = Math.sin(t * 2.4 + sx) * 0.02 + sx * Math.sin(phase) * 0.04 * walk;
    ctx.beginPath();
    ctx.moveTo(sx * 0.18, -0.02);
    ctx.quadraticCurveTo(sx * 0.36, 0.1, sx * (0.3 + sway), 0.3);
    ctx.lineWidth = 0.09;
    ctx.strokeStyle = '#1b141f';
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.strokeStyle = '#3b2c3a';
    ctx.lineWidth = 0.05;
    ctx.stroke();
    ctx.strokeStyle = '#efe6cf';
    ctx.lineWidth = 0.025;
    for (let c = -1; c <= 1; c++) {
      ctx.beginPath();
      ctx.moveTo(sx * (0.3 + sway) + c * 0.03, 0.3);
      ctx.lineTo(sx * (0.3 + sway) + c * 0.05 + sx * 0.01, 0.37);
      ctx.stroke();
    }
  }
  // Pinchos de la espalda.
  ctx.fillStyle = '#1b141f';
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * (1.12 + i * 0.15);
    const wob = Math.sin(t * 5 + i) * 0.015;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 0.2, 0.02 + Math.sin(a) * 0.2);
    ctx.lineTo(Math.cos(a) * (0.33 + wob), 0.02 + Math.sin(a) * (0.33 + wob));
    ctx.lineTo(Math.cos(a + 0.2) * 0.2, 0.02 + Math.sin(a + 0.2) * 0.2);
    ctx.fill();
  }
  // Cuerpo encorvado.
  ctx.beginPath();
  ctx.ellipse(0, 0.1, 0.25, 0.23, 0, 0, Math.PI * 2);
  ctx.fillStyle = radial(ctx, -0.08, -0.02, 0.02, 0.32, '#4a3a4a', '#150f19');
  ctx.fill();
  stroke(ctx, 0.05);
  // Cabeza.
  ctx.beginPath();
  ctx.ellipse(0.03, -0.1, 0.17, 0.14, 0, 0, Math.PI * 2);
  ctx.fillStyle = radial(ctx, -0.02, -0.16, 0.02, 0.22, '#54424f', '#1a1220');
  ctx.fill();
  stroke(ctx, 0.05);
  // Ojos de brasa.
  for (const ex of [-0.04, 0.09]) {
    ctx.fillStyle = radial(ctx, ex, -0.115, 0.005, 0.085, 'rgba(255,220,120,0.95)', 'rgba(255,90,20,0)');
    circle(ctx, ex, -0.115, 0.085);
    ctx.fill();
    ctx.fillStyle = '#ffe9a0';
    ellipse(ctx, ex, -0.115, 0.03, 0.036, 0.2 * (ex < 0 ? 1 : -1));
    ctx.fill();
    ctx.fillStyle = '#7a1a05';
    ellipse(ctx, ex + 0.004, -0.115, 0.009, 0.026);
    ctx.fill();
  }
  // Boca dentada.
  ctx.strokeStyle = '#0a060c';
  ctx.lineWidth = 0.03;
  ctx.beginPath();
  ctx.moveTo(-0.04, -0.03);
  ctx.quadraticCurveTo(0.04, 0.0, 0.12, -0.04);
  ctx.stroke();
  ctx.fillStyle = '#efe6cf';
  for (const x of [-0.01, 0.03, 0.07, 0.1]) {
    ctx.beginPath();
    ctx.moveTo(x, -0.025);
    ctx.lineTo(x + 0.012, 0.005);
    ctx.lineTo(x + 0.024, -0.03);
    ctx.fill();
  }
  ctx.restore();
}

function crow(ctx: Ctx, { t, walk, phase }: ActorPose): void {
  shadow(ctx, 0.2, 0.055, 0.24, 0.36);
  const hover = -0.13 + Math.sin(t * 4) * 0.025 - Math.abs(Math.sin(phase)) * 0.03 * walk;
  ctx.save();
  ctx.translate(0, hover);
  const flap = Math.sin(t * 15 + phase * 2);
  const wing = (back: boolean): void => {
    ctx.save();
    ctx.translate(-0.02, -0.04);
    ctx.rotate((back ? -0.5 : -0.2) + flap * (back ? -0.6 : 0.8) - 0.5);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-0.08, -0.22, -0.3, -0.34, -0.42, -0.3);
    ctx.lineTo(-0.36, -0.22);
    ctx.lineTo(-0.4, -0.15);
    ctx.lineTo(-0.3, -0.11);
    ctx.lineTo(-0.3, -0.04);
    ctx.bezierCurveTo(-0.2, 0.04, -0.08, 0.06, 0, 0);
    ctx.closePath();
    ctx.fillStyle = back ? '#14161f' : vGrad(ctx, -0.34, 0.05, '#394055', '#181b27');
    ctx.fill();
    stroke(ctx, 0.04);
    if (!back) {
      ctx.fillStyle = '#e8eef6';
      for (const [x, y] of [[-0.4, -0.29], [-0.38, -0.2], [-0.32, -0.11]]) {
        circle(ctx, x, y, 0.022);
        ctx.fill();
      }
    }
    ctx.restore();
  };
  wing(true);
  // Cola.
  ctx.fillStyle = '#14161f';
  for (const a of [-0.3, 0, 0.3]) {
    ctx.save();
    ctx.translate(-0.15, 0.04);
    ctx.rotate(Math.PI + a);
    roundRectPath(ctx, 0, -0.03, 0.2, 0.06, 0.03);
    ctx.fill();
    stroke(ctx, 0.03);
    ctx.restore();
  }
  // Cuerpo.
  ctx.beginPath();
  ctx.ellipse(0, 0.0, 0.19, 0.14, -0.2, 0, Math.PI * 2);
  ctx.fillStyle = radial(ctx, -0.04, -0.06, 0.02, 0.22, '#3a4157', '#14161f');
  ctx.fill();
  stroke(ctx, 0.05);
  ctx.fillStyle = 'rgba(232,238,246,0.92)';
  ellipse(ctx, 0.04, 0.05, 0.11, 0.07, -0.1);
  ctx.fill();
  // Cabeza, pico y cristales de sal.
  ctx.beginPath();
  ctx.arc(0.17, -0.11, 0.1, 0, Math.PI * 2);
  ctx.fillStyle = radial(ctx, 0.14, -0.15, 0.01, 0.12, '#3d445b', '#161924');
  ctx.fill();
  stroke(ctx, 0.045);
  ctx.beginPath();
  ctx.moveTo(0.25, -0.13);
  ctx.lineTo(0.38, -0.09);
  ctx.lineTo(0.25, -0.06);
  ctx.closePath();
  ctx.fillStyle = '#f0a24a';
  ctx.fill();
  stroke(ctx, 0.03);
  ctx.fillStyle = '#e8eef6';
  for (const [x, y, s] of [[0.1, -0.2, 0.035], [0.15, -0.22, 0.03], [0.2, -0.2, 0.026]] as const) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - s * 0.5, y - s * 1.6);
    ctx.lineTo(x + s * 0.5, y - s * 1.4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#fff';
  circle(ctx, 0.2, -0.13, 0.03);
  ctx.fill();
  ctx.fillStyle = INK;
  circle(ctx, 0.208, -0.128, 0.017);
  ctx.fill();
  wing(false);
  // Patas.
  ctx.strokeStyle = '#f0a24a';
  ctx.lineWidth = 0.025;
  for (const x of [-0.04, 0.05]) {
    ctx.beginPath();
    ctx.moveTo(x, 0.12);
    ctx.lineTo(x + 0.01, 0.2);
    ctx.stroke();
  }
  ctx.restore();
}

function grub(ctx: Ctx, { t, walk, phase }: ActorPose): void {
  shadow(ctx, 0.36, 0.09, 0.4, 0.33);
  const segs = [
    { x: -0.3, r: 0.12 },
    { x: -0.12, r: 0.16 },
    { x: 0.07, r: 0.18 },
    { x: 0.26, r: 0.17 },
  ];
  segs.forEach((s, i) => {
    const y = 0.12 + Math.sin(t * 2.2 - i * 0.9 + phase) * 0.03 * (0.6 + walk);
    const sy = y - s.r * 0.35;
    ctx.beginPath();
    ctx.ellipse(s.x, sy, s.r * 1.08, s.r, 0, 0, Math.PI * 2);
    ctx.fillStyle = radial(ctx, s.x - s.r * 0.35, sy - s.r * 0.5, 0.01, s.r * 1.6, i % 2 ? '#b3a684' : '#a89b78', '#4e4733');
    ctx.fill();
    stroke(ctx, 0.05);
    // Placa de roca.
    ctx.strokeStyle = 'rgba(40,30,15,0.55)';
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    ctx.arc(s.x, sy - s.r * 0.1, s.r * 0.65, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    if (i === 1 || i === 2) {
      ctx.fillStyle = 'rgba(110,170,80,0.85)';
      for (let k = 0; k < 3; k++) {
        ellipse(ctx, s.x - 0.05 + k * 0.05, sy - s.r * 0.85 + (k % 2) * 0.02, 0.03, 0.04, k - 1);
        ctx.fill();
      }
    }
    // Patitas.
    ctx.fillStyle = '#2d2618';
    ellipse(ctx, s.x - 0.04, y + s.r * 0.65 - 0.02, 0.03, 0.03);
    ctx.fill();
    ellipse(ctx, s.x + 0.05, y + s.r * 0.65 - 0.02, 0.03, 0.03);
    ctx.fill();
  });
  // Cabeza (delante, a la derecha).
  const hy = 0.12 + Math.sin(t * 2.2 - 3 * 0.9 + phase) * 0.03 * (0.6 + walk) - 0.07;
  ctx.fillStyle = '#e8e2cc';
  for (const dy of [-0.03, 0.04]) {
    ctx.beginPath();
    ctx.moveTo(0.4, hy + dy);
    ctx.lineTo(0.5, hy + dy + (dy > 0 ? 0.04 : -0.01));
    ctx.lineTo(0.4, hy + dy + 0.03);
    ctx.fill();
    stroke(ctx, 0.025);
  }
  for (const [ex, ey] of [[0.34, hy - 0.06], [0.28, hy - 0.08]] as const) {
    ctx.fillStyle = '#ffffff';
    circle(ctx, ex, ey, 0.04);
    ctx.fill();
    stroke(ctx, 0.025);
    ctx.fillStyle = INK;
    circle(ctx, ex + 0.012, ey + 0.004, 0.02);
    ctx.fill();
  }
}

function reedShooter(ctx: Ctx, { t, walk, phase }: ActorPose): void {
  shadow(ctx, 0.27, 0.08);
  const bob = Math.sin(t * 2.4) * 0.012 - Math.abs(Math.sin(phase)) * 0.04 * walk;
  ctx.save();
  ctx.translate(0, bob);
  // Capa.
  ctx.beginPath();
  ctx.moveTo(-0.15, -0.03);
  ctx.lineTo(0.15, -0.03);
  ctx.lineTo(0.26, 0.33);
  for (let i = 0; i < 5; i++) ctx.lineTo(0.26 - (i + 0.5) * 0.104, 0.28 + (i % 2) * 0.06 - 0.02);
  ctx.lineTo(-0.26, 0.33);
  ctx.closePath();
  ctx.fillStyle = vGrad(ctx, -0.03, 0.34, '#4a8a58', '#1f3d2a');
  ctx.fill();
  stroke(ctx, 0.05);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 0.03;
  for (const x of [-0.08, 0.02, 0.1]) {
    ctx.beginPath();
    ctx.moveTo(x, 0.02);
    ctx.lineTo(x * 1.6, 0.3);
    ctx.stroke();
  }
  // Cuerda.
  ctx.fillStyle = '#c9a24a';
  ctx.fillRect(-0.16, 0.12, 0.32, 0.035);
  // Cerbatana.
  ctx.save();
  ctx.translate(0.07, 0.08);
  ctx.rotate(-0.12 + Math.sin(t * 2) * 0.02);
  roundRectPath(ctx, 0, -0.025, 0.44, 0.05, 0.025);
  ctx.fillStyle = vGrad(ctx, -0.025, 0.025, '#b8d06a', '#6a8a30');
  ctx.fill();
  stroke(ctx, 0.03);
  ctx.strokeStyle = '#3f5a1c';
  ctx.lineWidth = 0.02;
  for (const x of [0.12, 0.26]) {
    ctx.beginPath();
    ctx.moveTo(x, -0.025);
    ctx.lineTo(x, 0.025);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = SKIN;
  circle(ctx, 0.1, 0.1, 0.038);
  ctx.fill();
  stroke(ctx, 0.025);
  // Cara bajo el sombrero.
  circle(ctx, 0, -0.1, 0.105);
  ctx.fillStyle = vGrad(ctx, -0.2, 0.0, '#e9c39b', '#c99f74');
  ctx.fill();
  stroke(ctx, 0.04);
  ctx.fillStyle = INK;
  for (const ex of [-0.04, 0.05]) {
    ellipse(ctx, ex, -0.09, 0.016, 0.022);
    ctx.fill();
  }
  // Sombrero cónico de junco.
  ctx.beginPath();
  ctx.moveTo(0, -0.42);
  ctx.lineTo(0.32, -0.12);
  ctx.quadraticCurveTo(0, -0.04, -0.32, -0.12);
  ctx.closePath();
  ctx.fillStyle = vGrad(ctx, -0.42, -0.08, '#f1d994', '#b38e4c');
  ctx.fill();
  stroke(ctx, 0.05);
  ctx.strokeStyle = 'rgba(110,80,30,0.55)';
  ctx.lineWidth = 0.02;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(0, -0.42);
    ctx.lineTo(i * 0.1, -0.1 + Math.abs(i) * 0.005);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-0.2, -0.22);
  ctx.quadraticCurveTo(0, -0.17, 0.2, -0.22);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 0.025;
  ctx.beginPath();
  ctx.moveTo(-0.04, -0.37);
  ctx.lineTo(-0.2, -0.17);
  ctx.stroke();
  // Pies.
  ctx.fillStyle = '#3a2a1c';
  for (const x of [-0.1, 0.1]) {
    ellipse(ctx, x, 0.34, 0.07, 0.035);
    ctx.fill();
  }
  ctx.restore();
}

// ---------- Aliados invocados ----------

export function drawAlly(ctx: Ctx, kind: string, o: EnemyPose): void {
  ctx.save();
  ctx.scale(o.face, 1);
  // Aura azulada: se les distingue de los enemigos de un vistazo.
  ctx.fillStyle = radial(ctx, 0, 0.05, 0.05, 0.5, 'rgba(120,190,255,0.35)', 'rgba(120,190,255,0)');
  circle(ctx, 0, 0.05, 0.5);
  ctx.fill();
  if (kind === 'sapo_de_piedra') stoneToad(ctx, o);
  else if (kind === 'tronco_senuelo') decoyLog(ctx, o);
  else if (kind === 'cuervo_aliado') {
    ctx.globalAlpha *= 0.9;
    crow(ctx, o);
  } else if (kind.startsWith('companero_') && Object.hasOwn(HEROES, kind.slice(10))) {
    // Tu compañero: el protagonista de otra casa, sin transparencia (no es una invocación).
    drawNinja(ctx, { ...o, dir: o.face === 1 ? 'right' : 'left', hero: HEROES[kind.slice(10) as Affinity] });
  } else {
    ctx.globalAlpha *= 0.65;
    drawNinja(ctx, { ...o, dir: o.face === 1 ? 'right' : 'left' });
  }
  ctx.restore();
}

/** Tronco con tu bufanda y una máscara pintada: el señuelo que deja la Sustitución. */
function decoyLog(ctx: Ctx, { t }: ActorPose): void {
  shadow(ctx, 0.26, 0.07);
  ctx.save();
  // Tronco de pie.
  roundRectPath(ctx, -0.17, -0.2, 0.34, 0.54, 0.07);
  ctx.fillStyle = vGrad(ctx, -0.2, 0.34, '#9a7048', '#5e4026');
  ctx.fill();
  stroke(ctx, 0.05);
  ctx.strokeStyle = 'rgba(40,24,10,0.55)';
  ctx.lineWidth = 0.02;
  for (const [x, y0, y1] of [[-0.08, -0.12, 0.2], [0.04, -0.15, 0.26], [0.11, -0.05, 0.3]] as const) {
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.quadraticCurveTo(x + 0.02, (y0 + y1) / 2, x - 0.01, y1);
    ctx.stroke();
  }
  // Tapa cortada con anillos.
  ellipse(ctx, 0, -0.2, 0.17, 0.065);
  ctx.fillStyle = '#d9b680';
  ctx.fill();
  stroke(ctx, 0.04);
  ctx.strokeStyle = 'rgba(120,80,40,0.6)';
  ctx.lineWidth = 0.014;
  for (const r of [0.05, 0.1]) {
    ellipse(ctx, 0, -0.2, r, r * 0.38);
    ctx.stroke();
  }
  // Bufanda roja y marca de ojo: se parece (de lejos) al jugador.
  ctx.fillStyle = '#d62839';
  roundRectPath(ctx, -0.18, 0.0, 0.36, 0.07, 0.03);
  ctx.fill();
  stroke(ctx, 0.03);
  const sway = Math.sin(t * 3) * 0.02;
  ctx.beginPath();
  ctx.moveTo(0.1, 0.06);
  ctx.lineTo(0.2 + sway, 0.2);
  ctx.lineTo(0.12 + sway, 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = INK;
  for (const ex of [-0.06, 0.06]) {
    ellipse(ctx, ex, -0.07, 0.022, 0.035);
    ctx.fill();
  }
  ctx.restore();
}

function stoneToad(ctx: Ctx, { t, walk, phase }: ActorPose): void {
  shadow(ctx, 0.32, 0.08);
  const hop = Math.abs(Math.sin(phase)) * 0.08 * walk;
  const breathe = Math.sin(t * 2.2) * 0.01;
  ctx.save();
  ctx.translate(0, -hop);
  ctx.beginPath();
  ctx.ellipse(0, 0.14, 0.32, 0.2 + breathe, 0, 0, Math.PI * 2);
  ctx.fillStyle = vGrad(ctx, -0.06, 0.34, '#8d9a86', '#4f5a52');
  ctx.fill();
  stroke(ctx, 0.05);
  // Bultos de roca.
  ctx.fillStyle = '#6c7568';
  for (const [x, y, r] of [[-0.14, 0.04, 0.05], [0.04, 0.0, 0.06], [0.18, 0.08, 0.045], [-0.05, 0.14, 0.04]] as const) {
    circle(ctx, x, y, r);
    ctx.fill();
    stroke(ctx, 0.02);
  }
  // Ojos grandes y boca ancha.
  for (const x of [-0.12, 0.12]) {
    circle(ctx, x, -0.04, 0.07);
    ctx.fillStyle = '#e8e6c8';
    ctx.fill();
    stroke(ctx, 0.03);
    ctx.fillStyle = INK;
    circle(ctx, x + 0.01, -0.035, 0.028);
    ctx.fill();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.03;
  ctx.beginPath();
  ctx.moveTo(-0.2, 0.14);
  ctx.quadraticCurveTo(0, 0.24, 0.2, 0.14);
  ctx.stroke();
  // Patas.
  ctx.fillStyle = '#5a6458';
  for (const x of [-0.26, 0.26]) {
    ellipse(ctx, x, 0.31, 0.09, 0.05);
    ctx.fill();
    stroke(ctx, 0.03);
  }
  ctx.restore();
}

// ---------- Monstruos de las Raíces Hundidas ----------

function rootWolf(ctx: Ctx, { t, walk, phase }: ActorPose): void {
  shadow(ctx, 0.34, 0.08);
  const bob = Math.sin(t * 3) * 0.01 - Math.abs(Math.sin(phase)) * 0.05 * walk;
  const gallop = Math.sin(phase) * 0.07 * walk;
  ctx.save();
  ctx.translate(0, bob);
  // Patas.
  ctx.fillStyle = '#3c3326';
  for (const [x, o] of [[-0.2, 1], [-0.1, -1], [0.14, -1], [0.24, 1]] as const) {
    roundRectPath(ctx, x - 0.035 + gallop * o * 0.5, 0.12, 0.07, 0.22, 0.03);
    ctx.fill();
    stroke(ctx, 0.03);
  }
  // Cola de raíces.
  ctx.strokeStyle = '#4f7a3a';
  ctx.lineWidth = 0.05;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-0.3, 0.02);
  ctx.quadraticCurveTo(-0.46, -0.1 + Math.sin(t * 4) * 0.04, -0.4, -0.22);
  ctx.stroke();
  outlineStroke(ctx);
  // Cuerpo.
  ctx.beginPath();
  ctx.ellipse(-0.02, 0.0, 0.31, 0.19, 0, 0, Math.PI * 2);
  ctx.fillStyle = vGrad(ctx, -0.2, 0.2, '#6b5a40', '#3a2f22');
  ctx.fill();
  stroke(ctx, 0.045);
  // Raíces sobre el lomo.
  ctx.strokeStyle = '#6fa04a';
  ctx.lineWidth = 0.03;
  for (const x of [-0.18, -0.05, 0.08]) {
    ctx.beginPath();
    ctx.moveTo(x, -0.16);
    ctx.quadraticCurveTo(x + 0.04, -0.3, x - 0.02 + Math.sin(t * 3 + x * 9) * 0.02, -0.34);
    ctx.stroke();
  }
  // Cabeza.
  ctx.beginPath();
  ctx.moveTo(0.22, -0.12);
  ctx.quadraticCurveTo(0.42, -0.14, 0.46, 0.0);
  ctx.lineTo(0.4, 0.07);
  ctx.quadraticCurveTo(0.3, 0.1, 0.22, 0.1);
  ctx.closePath();
  ctx.fillStyle = vGrad(ctx, -0.14, 0.1, '#7a6648', '#46392a');
  ctx.fill();
  stroke(ctx, 0.04);
  ctx.beginPath();
  ctx.moveTo(0.28, -0.12);
  ctx.lineTo(0.3, -0.26);
  ctx.lineTo(0.37, -0.13);
  ctx.closePath();
  ctx.fillStyle = '#46392a';
  ctx.fill();
  stroke(ctx, 0.03);
  ctx.fillStyle = '#c6ff7a';
  ellipse(ctx, 0.33, -0.05, 0.022, 0.016);
  ctx.fill();
  ctx.fillStyle = '#f6f2e6';
  for (const x of [0.37, 0.41]) {
    ctx.beginPath();
    ctx.moveTo(x, 0.06);
    ctx.lineTo(x + 0.015, 0.11);
    ctx.lineTo(x + 0.03, 0.06);
    ctx.fill();
  }
  ctx.restore();
}

function sporeBloom(ctx: Ctx, { t, walk }: ActorPose): void {
  shadow(ctx, 0.2, 0.06, 0.28, 0.35);
  const float = Math.sin(t * 2) * 0.04 - 0.04 - walk * 0.01;
  ctx.save();
  ctx.translate(0, float);
  // Esporas alrededor.
  for (let i = 0; i < 7; i++) {
    const a = t * 0.9 + i * 0.9;
    const r = 0.26 + Math.sin(t * 2 + i) * 0.04;
    ctx.fillStyle = `rgba(190,255,150,${0.35 + 0.25 * Math.sin(t * 3 + i)})`;
    circle(ctx, Math.cos(a) * r, 0.02 + Math.sin(a) * r * 0.7, 0.022);
    ctx.fill();
  }
  // Tallo colgante.
  ctx.strokeStyle = '#d9d2a6';
  ctx.lineWidth = 0.05;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0.0);
  ctx.quadraticCurveTo(0.05 * Math.sin(t * 2), 0.14, 0, 0.28);
  ctx.stroke();
  outlineStroke(ctx);
  // Sombrero de hongo.
  ctx.beginPath();
  ctx.moveTo(-0.3, 0.02);
  ctx.quadraticCurveTo(-0.28, -0.3, 0, -0.3);
  ctx.quadraticCurveTo(0.28, -0.3, 0.3, 0.02);
  ctx.quadraticCurveTo(0, 0.08, -0.3, 0.02);
  ctx.closePath();
  ctx.fillStyle = vGrad(ctx, -0.3, 0.08, '#9a63d6', '#4d2a8a');
  ctx.fill();
  stroke(ctx, 0.05);
  ctx.fillStyle = 'rgba(230,255,200,0.85)';
  for (const [x, y, r] of [[-0.12, -0.12, 0.035], [0.08, -0.2, 0.03], [0.16, -0.06, 0.028], [-0.02, -0.04, 0.022]] as const) {
    circle(ctx, x, y, r);
    ctx.fill();
  }
  // Ojos soñolientos.
  ctx.fillStyle = INK;
  for (const x of [-0.07, 0.07]) {
    ellipse(ctx, x, 0.0, 0.015, 0.025);
    ctx.fill();
  }
  ctx.restore();
}

function outlineStroke(ctx: Ctx): void {
  const w = ctx.lineWidth;
  const s = ctx.strokeStyle;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.014;
  ctx.stroke();
  ctx.strokeStyle = s;
  ctx.lineWidth = w;
}
