import type { Hero } from '../../content/heroes';
import { type Ctx, INK, circle, ellipse, roundRectPath, vGrad } from './draw';

/**
 * Cabezas y pelo de los cinco protagonistas. Se dibujan en el mismo sistema de coordenadas que `drawNinja`
 * (1 unidad = 1 casilla, la cabeza en (0, hy)). La vista lateral mira siempre hacia +x: el que llama ya espeja la escena.
 */

export type HeroView = 'front' | 'side' | 'back';

const SKIN_M = '#f0cfae';
const SKIN_F = '#f6dcc4';
const SKIN_SHADE = 'rgba(150,90,60,0.22)';

function outline(ctx: Ctx, w = 0.035): void {
  ctx.strokeStyle = INK;
  ctx.lineWidth = w;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

function hairPaint(ctx: Ctx, hero: Hero, y0: number, y1: number): void {
  ctx.fillStyle = vGrad(ctx, y0, y1, hero.hair.light, hero.hair.dark);
  ctx.fill();
  outline(ctx);
}

/** Puntos de una corona de pinchos sobre un arco centrado en (0, hy). */
function crown(hy: number, from: number, to: number, count: number, base: number, tip: number, lean: number): [number, number][] {
  const pts: [number, number][] = [];
  const step = (to - from) / count;
  for (let k = 0; k <= count; k++) {
    const a = from + k * step;
    pts.push([Math.cos(a) * base, hy + Math.sin(a) * base]);
    if (k < count) {
      const m = a + step / 2 + lean;
      const r = tip * (0.88 + 0.12 * Math.sin(k * 2.1 + 1));
      pts.push([Math.cos(m) * r, hy + Math.sin(m) * r]);
    }
  }
  return pts;
}

function poly(ctx: Ctx, pts: [number, number][]): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

/**
 * Pelo que cuelga DETRÁS del cuerpo (melenas largas). Se dibuja antes que el torso en las vistas frontal y lateral;
 * en la vista trasera la melena tapa la espalda y se dibuja con la cabeza.
 */
export function drawHeroHairBehind(ctx: Ctx, hero: Hero, view: HeroView, t: number, walk: number): void {
  if (view === 'back' || (hero.hairStyle !== 'long' && hero.hairStyle !== 'wave')) return;
  const hy = -0.15;
  const sway = Math.sin(t * 3) * 0.012 + walk * 0.03;
  const len = hero.hairStyle === 'long' ? 0.27 : 0.2;
  if (view === 'front') {
    ctx.beginPath();
    ctx.moveTo(-0.22, hy);
    ctx.bezierCurveTo(-0.27, hy + 0.2, -0.24 - sway, len + 0.1, -0.17 - sway, len + 0.18);
    ctx.lineTo(0.17 + sway, len + 0.18);
    ctx.bezierCurveTo(0.24 + sway, len + 0.1, 0.27, hy + 0.2, 0.22, hy);
    ctx.closePath();
  } else {
    // De lado: la melena cae hacia atrás (-x) y se mece al caminar.
    ctx.beginPath();
    ctx.moveTo(0.0, hy - 0.18);
    ctx.bezierCurveTo(-0.26, hy - 0.14, -0.3 - sway * 2, hy + 0.12, -0.24 - sway * 3, len + 0.16);
    ctx.lineTo(-0.08 - sway, len + 0.12);
    ctx.bezierCurveTo(-0.06, 0.1, 0.0, hy + 0.15, 0.06, hy + 0.1);
    ctx.closePath();
  }
  hairPaint(ctx, hero, hy - 0.1, len + 0.18);
}

function eye(ctx: Ctx, hero: Hero, x: number, y: number, side: boolean): void {
  const big = hero.female ? 1.12 : 1;
  ctx.fillStyle = '#ffffff';
  ellipse(ctx, x, y, 0.04 * big, 0.049 * big);
  ctx.fill();
  outline(ctx, 0.016);
  ctx.fillStyle = hero.eyes;
  ellipse(ctx, x + (side ? 0.01 : 0), y + 0.004, 0.027 * big, 0.037 * big);
  ctx.fill();
  ctx.fillStyle = INK;
  circle(ctx, x + (side ? 0.012 : 0), y + 0.006, 0.014);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  circle(ctx, x + (side ? 0.02 : 0.009), y - 0.012, 0.008);
  ctx.fill();
  if (hero.female) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    ctx.moveTo(x - 0.04, y - 0.01);
    ctx.lineTo(x - 0.05, y - 0.03);
    ctx.stroke();
  }
}

function face(ctx: Ctx, hero: Hero, view: HeroView, hy: number): void {
  const skin = hero.female ? SKIN_F : SKIN_M;
  const side = view === 'side';
  ctx.beginPath();
  ctx.ellipse(side ? 0.015 : 0, hy + 0.012, side ? 0.185 : 0.19, 0.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = skin;
  ctx.fill();
  outline(ctx, 0.04);
  // Sombra suave bajo el flequillo.
  ctx.fillStyle = SKIN_SHADE;
  ellipse(ctx, side ? 0.03 : 0, hy - 0.035, side ? 0.15 : 0.16, 0.05);
  ctx.fill();
  // Ojos, cejas y boca.
  ctx.strokeStyle = hero.hair.dark;
  ctx.lineWidth = 0.025;
  ctx.lineCap = 'round';
  if (side) {
    eye(ctx, hero, 0.095, hy + 0.03, true);
    ctx.beginPath();
    ctx.moveTo(0.06, hy - 0.045);
    ctx.lineTo(0.13, hy - 0.04);
    ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.018;
    ctx.beginPath();
    ctx.moveTo(0.1, hy + 0.12);
    ctx.lineTo(0.14, hy + 0.115);
    ctx.stroke();
  } else {
    eye(ctx, hero, -0.075, hy + 0.03, false);
    eye(ctx, hero, 0.075, hy + 0.03, false);
    ctx.beginPath();
    ctx.moveTo(-0.115, hy - 0.04);
    ctx.lineTo(-0.04, hy - 0.05);
    ctx.moveTo(0.04, hy - 0.05);
    ctx.lineTo(0.115, hy - 0.04);
    ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.018;
    ctx.beginPath();
    ctx.arc(0, hy + 0.1, 0.03, 0.25, Math.PI - 0.25);
    ctx.stroke();
  }
}

/** Cabello de la parte alta y flequillo según el estilo. */
function topHair(ctx: Ctx, hero: Hero, view: HeroView, hy: number): void {
  const side = view === 'side';
  const back = view === 'back';
  switch (hero.hairStyle) {
    case 'spiky':
    case 'swept': {
      const swept = hero.hairStyle === 'swept';
      const tip = swept ? 0.36 : 0.33;
      const lean = swept ? -0.16 : 0;
      if (back) {
        ctx.beginPath();
        ctx.arc(0, hy, 0.215, 0, Math.PI * 2);
        hairPaint(ctx, hero, hy - 0.2, hy + 0.2);
        poly(ctx, crown(hy, Math.PI * 1.1, Math.PI * 1.9, 6, 0.2, tip * 0.92, lean));
        hairPaint(ctx, hero, hy - 0.3, hy);
        break;
      }
      if (side) {
        const pts = crown(hy, Math.PI * 0.8, Math.PI * 1.9, 6, 0.215, tip, -0.12);
        const fringe: [number, number][] = [[0.17, hy - 0.025], [0.1, hy - 0.08], [0.045, hy - 0.03], [-0.03, hy - 0.085], [-0.1, hy - 0.01], [-0.17, hy + 0.07]];
        poly(ctx, [...pts, ...fringe]);
        hairPaint(ctx, hero, hy - 0.32, hy + 0.05);
        break;
      }
      const pts = crown(hy, Math.PI, Math.PI * 2, 6, 0.215, tip, lean);
      const fringe: [number, number][] = [
        [0.2, hy + 0.0],
        [0.165, hy - 0.075],
        [0.11, hy - 0.02],
        [0.05, hy - 0.095],
        [0.0, hy - 0.025],
        [-0.05, hy - 0.095],
        [-0.11, hy - 0.02],
        [-0.165, hy - 0.075],
        [-0.2, hy + 0.0],
      ];
      poly(ctx, [...pts, ...fringe]);
      hairPaint(ctx, hero, hy - 0.32, hy + 0.02);
      if (swept) {
        // Mechón largo que cae sobre la mitad de la frente.
        ctx.beginPath();
        ctx.moveTo(0.1, hy - 0.09);
        ctx.quadraticCurveTo(0.23, hy - 0.05, 0.205, hy + 0.12);
        ctx.quadraticCurveTo(0.165, hy + 0.0, 0.1, hy - 0.05);
        ctx.closePath();
        hairPaint(ctx, hero, hy - 0.1, hy + 0.09);
      }
      break;
    }
    case 'long':
    case 'wave': {
      const wave = hero.hairStyle === 'wave';
      if (back) {
        // Vista trasera: la melena entera cubre la espalda.
        ctx.beginPath();
        ctx.moveTo(-0.22, hy);
        ctx.bezierCurveTo(-0.3, hy + 0.2, -0.26, 0.24, -0.2, wave ? 0.3 : 0.38);
        ctx.lineTo(0.2, wave ? 0.3 : 0.38);
        ctx.bezierCurveTo(0.26, 0.24, 0.3, hy + 0.2, 0.22, hy);
        ctx.bezierCurveTo(0.2, hy - 0.2, -0.2, hy - 0.2, -0.22, hy);
        ctx.closePath();
        hairPaint(ctx, hero, hy - 0.2, 0.38);
        // Mechones y reflejos para que no sea una mancha lisa.
        ctx.strokeStyle = hero.hair.light;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 0.03;
        ctx.lineCap = 'round';
        for (const sx of [-0.11, 0.0, 0.11]) {
          ctx.beginPath();
          ctx.moveTo(sx * 1.1, hy - 0.1);
          ctx.quadraticCurveTo(sx * 1.9, hy + 0.15, sx * 1.5, wave ? 0.26 : 0.34);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        if (wave || hero.accessory === 'tie') {
          // Lazo que recoge la melena.
          ctx.fillStyle = hero.trim.main;
          roundRectPath(ctx, -0.23, 0.06, 0.46, 0.045, 0.02);
          ctx.fill();
          outline(ctx, 0.022);
        }
        break;
      }
      if (side) {
        ctx.beginPath();
        ctx.moveTo(0.19, hy - 0.07);
        ctx.bezierCurveTo(0.2, hy - 0.2, -0.2, hy - 0.26, -0.22, hy + 0.0);
        ctx.bezierCurveTo(-0.22, hy + 0.1, -0.16, hy + 0.12, -0.12, hy + 0.1);
        ctx.bezierCurveTo(-0.06, hy + 0.0, 0.08, hy - 0.1, 0.19, hy - 0.07);
        ctx.closePath();
        hairPaint(ctx, hero, hy - 0.22, hy + 0.1);
        break;
      }
      // Frontal: raya al medio (largo) o flequillo recto (ola) y mechones que enmarcan la cara.
      ctx.beginPath();
      ctx.moveTo(-0.215, hy + 0.04);
      ctx.bezierCurveTo(-0.24, hy - 0.2, 0.24, hy - 0.2, 0.215, hy + 0.04);
      if (wave) {
        ctx.lineTo(0.19, hy - 0.02);
        ctx.lineTo(0.12, hy - 0.045);
        ctx.lineTo(-0.12, hy - 0.045);
        ctx.lineTo(-0.19, hy - 0.02);
      } else {
        ctx.quadraticCurveTo(0.1, hy - 0.02, 0.0, hy - 0.085);
        ctx.quadraticCurveTo(-0.1, hy - 0.02, -0.215, hy + 0.04);
      }
      ctx.closePath();
      hairPaint(ctx, hero, hy - 0.2, hy);
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sx * 0.2, hy - 0.04);
        ctx.quadraticCurveTo(sx * 0.27, hy + 0.1, sx * (wave ? 0.2 : 0.23), hy + (wave ? 0.2 : 0.27));
        ctx.lineTo(sx * 0.17, hy + (wave ? 0.17 : 0.24));
        ctx.quadraticCurveTo(sx * 0.19, hy + 0.06, sx * 0.15, hy - 0.02);
        ctx.closePath();
        hairPaint(ctx, hero, hy - 0.04, hy + 0.27);
      }
      break;
    }
    case 'buns': {
      // Dos moños sobre una melena corta con flequillo.
      const bun = (bx: number): void => {
        circle(ctx, bx, hy - 0.2, 0.09);
        ctx.fillStyle = vGrad(ctx, hy - 0.3, hy - 0.11, hero.hair.light, hero.hair.main);
        ctx.fill();
        outline(ctx);
      };
      if (back) {
        bun(-0.15);
        bun(0.15);
        ctx.beginPath();
        ctx.arc(0, hy, 0.215, 0, Math.PI * 2);
        hairPaint(ctx, hero, hy - 0.2, hy + 0.2);
        ctx.beginPath();
        ctx.moveTo(-0.2, hy + 0.06);
        ctx.quadraticCurveTo(0, hy + 0.3, 0.2, hy + 0.06);
        ctx.lineTo(0.17, hy + 0.2);
        ctx.quadraticCurveTo(0, hy + 0.3, -0.17, hy + 0.2);
        ctx.closePath();
        hairPaint(ctx, hero, hy, hy + 0.3);
        break;
      }
      if (side) {
        bun(-0.1);
        ctx.beginPath();
        ctx.moveTo(0.19, hy - 0.07);
        ctx.bezierCurveTo(0.2, hy - 0.2, -0.2, hy - 0.26, -0.21, hy + 0.04);
        ctx.lineTo(-0.15, hy + 0.17);
        ctx.lineTo(-0.1, hy + 0.1);
        ctx.bezierCurveTo(-0.04, hy + 0.0, 0.08, hy - 0.1, 0.19, hy - 0.07);
        ctx.closePath();
        hairPaint(ctx, hero, hy - 0.22, hy + 0.17);
        break;
      }
      bun(-0.15);
      bun(0.15);
      ctx.beginPath();
      ctx.moveTo(-0.215, hy + 0.1);
      ctx.bezierCurveTo(-0.25, hy - 0.22, 0.25, hy - 0.22, 0.215, hy + 0.1);
      ctx.lineTo(0.19, hy + 0.16);
      ctx.lineTo(0.165, hy + 0.0);
      ctx.lineTo(0.12, hy - 0.04);
      ctx.lineTo(-0.12, hy - 0.04);
      ctx.lineTo(-0.165, hy + 0.0);
      ctx.lineTo(-0.19, hy + 0.16);
      ctx.closePath();
      hairPaint(ctx, hero, hy - 0.22, hy + 0.16);
      break;
    }
  }
}

function accessory(ctx: Ctx, hero: Hero, view: HeroView, hy: number): void {
  switch (hero.accessory) {
    case 'goggles': {
      // Gafas de vuelo subidas a la frente: correa y dos cristales.
      ctx.fillStyle = hero.tunic.dark;
      roundRectPath(ctx, -0.215, hy - 0.115, 0.43, 0.04, 0.02);
      ctx.fill();
      outline(ctx, 0.022);
      if (view === 'back') break;
      const lens = (x: number): void => {
        circle(ctx, x, hy - 0.115, 0.052);
        ctx.fillStyle = '#c9a24a';
        ctx.fill();
        outline(ctx, 0.025);
        circle(ctx, x, hy - 0.115, 0.036);
        ctx.fillStyle = vGrad(ctx, hy - 0.15, hy - 0.08, '#d8f6ff', '#5ec6e8');
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        circle(ctx, x - 0.012, hy - 0.128, 0.01);
        ctx.fill();
      };
      if (view === 'side') lens(0.06);
      else {
        lens(-0.075);
        lens(0.075);
      }
      break;
    }
    case 'tie': {
      if (view === 'front') break;
      const x = view === 'side' ? -0.17 : 0;
      ctx.fillStyle = hero.trim.main;
      roundRectPath(ctx, x - 0.06, hy + 0.19, 0.12, 0.05, 0.02);
      ctx.fill();
      outline(ctx, 0.025);
      break;
    }
    case 'bolt': {
      // Pasador con forma de rayo en el flequillo.
      if (view === 'back') break;
      const x = view === 'side' ? 0.05 : 0.11;
      ctx.beginPath();
      ctx.moveTo(x + 0.02, hy - 0.115);
      ctx.lineTo(x - 0.03, hy - 0.065);
      ctx.lineTo(x - 0.005, hy - 0.065);
      ctx.lineTo(x - 0.03, hy - 0.02);
      ctx.lineTo(x + 0.04, hy - 0.075);
      ctx.lineTo(x + 0.012, hy - 0.075);
      ctx.closePath();
      ctx.fillStyle = hero.trim.main;
      ctx.fill();
      outline(ctx, 0.022);
      break;
    }
    case 'pearl': {
      if (view === 'back') break;
      const x = view === 'side' ? 0.07 : -0.14;
      circle(ctx, x, hy - 0.06, 0.032);
      ctx.fillStyle = '#f4fbff';
      ctx.fill();
      outline(ctx, 0.02);
      ctx.fillStyle = 'rgba(160,220,255,0.9)';
      circle(ctx, x - 0.008, hy - 0.07, 0.01);
      ctx.fill();
      break;
    }
    case 'beads': {
      const bun = (bx: number): void => {
        circle(ctx, bx, hy - 0.115, 0.03);
        ctx.fillStyle = hero.trim.main;
        ctx.fill();
        outline(ctx, 0.02);
      };
      if (view === 'side') bun(-0.1);
      else {
        bun(-0.15);
        bun(0.15);
      }
      break;
    }
  }
}

/** Trenza lateral de Mizuna: va por delante del hombro (vista frontal). */
function braid(ctx: Ctx, hero: Hero, hy: number, t: number): void {
  const sway = Math.sin(t * 3) * 0.01;
  for (let i = 0; i < 6; i++) {
    const y = hy + 0.2 + i * 0.045;
    ellipse(ctx, -0.17 + sway * i * 0.4, y, 0.04, 0.032);
    ctx.fillStyle = i % 2 ? hero.hair.main : hero.hair.light;
    ctx.fill();
    outline(ctx, 0.02);
  }
  circle(ctx, -0.17 + sway * 2.4, hy + 0.2 + 6 * 0.045, 0.03);
  ctx.fillStyle = hero.trim.main;
  ctx.fill();
  outline(ctx, 0.02);
}

/** Cuello alto de la túnica, para que la cabeza no flote sobre el torso. */
function collar(ctx: Ctx, hero: Hero, view: HeroView): void {
  roundRectPath(ctx, view === 'side' ? -0.07 : -0.1, 0.0, view === 'side' ? 0.16 : 0.2, 0.09, 0.04);
  ctx.fillStyle = vGrad(ctx, 0, 0.09, hero.tunic.light, hero.tunic.dark);
  ctx.fill();
  outline(ctx, 0.03);
}

/** Cabeza completa del protagonista en su vista; `hy` es la altura del centro de la cabeza. */
export function drawHeroHead(ctx: Ctx, hero: Hero, view: HeroView, t: number, hy: number): void {
  collar(ctx, hero, view);
  if (view === 'back') {
    topHair(ctx, hero, view, hy);
    accessory(ctx, hero, view, hy);
    return;
  }
  face(ctx, hero, view, hy);
  topHair(ctx, hero, view, hy);
  accessory(ctx, hero, view, hy);
  if (hero.hairStyle === 'wave' && view === 'front') braid(ctx, hero, hy, t);
}
