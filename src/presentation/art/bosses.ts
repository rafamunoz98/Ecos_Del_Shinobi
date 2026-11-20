import type { ActorPose } from './actors';
import { type Ctx, INK, circle, ellipse, radial, roundRectPath, vGrad } from './draw';
import { drawShinobiFigure } from './shinobi';

/**
 * Enemigos del Hito 6 (Monje Hueco, Eco Menor) y personajes fijos (Maestra Sayoko,
 * Altar del Eco Roto). Mismas convenciones que actors.ts: 1 unidad = 1 casilla, pies en y ≈ +0.34.
 */

export interface ChargePose extends ActorPose {
  /** Está cargando un ataque anunciado: brilla y vibra. */
  charging?: boolean;
  /** Fase del jefe (1-3): más grietas y luz cuanto más avanza. */
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

function glow(ctx: Ctx, x: number, y: number, r: number, color: string, a: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = radial(ctx, x, y, 0, r, `rgba(${color},${a})`, `rgba(${color},0)`);
  circle(ctx, x, y, r);
  ctx.fill();
  ctx.restore();
}

/** Campana pequeña de bronce (colgante). */
function smallBell(ctx: Ctx, x: number, y: number, s: number, swing: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(swing);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(-0.05, 0);
  ctx.quadraticCurveTo(-0.1, 0.1, -0.15, 0.18);
  ctx.lineTo(0.15, 0.18);
  ctx.quadraticCurveTo(0.1, 0.1, 0.05, 0);
  ctx.closePath();
  ctx.fillStyle = vGrad(ctx, 0, 0.18, '#e0a850', '#8a5a1e');
  ctx.fill();
  stroke(ctx, 0.05);
  circle(ctx, 0, 0.2, 0.035);
  ctx.fillStyle = '#4a2c0c';
  ctx.fill();
  ctx.restore();
}

// ---------- Monje Hueco ----------

export function hollowMonk(ctx: Ctx, { t, walk, phase, charging }: ChargePose): void {
  shadow(ctx, 0.27, 0.08, 0.4);
  const float = Math.sin(t * 2.2) * 0.02 - Math.abs(Math.sin(phase)) * 0.035 * walk;
  ctx.save();
  ctx.translate(0, float);

  // Túnica con dobladillo de jirones.
  ctx.beginPath();
  ctx.moveTo(-0.15, -0.12);
  ctx.lineTo(0.15, -0.12);
  ctx.lineTo(0.3, 0.33);
  for (let i = 0; i < 6; i++) ctx.lineTo(0.3 - (i + 0.5) * 0.1, 0.27 + (i % 2) * 0.07);
  ctx.lineTo(-0.3, 0.33);
  ctx.closePath();
  ctx.fillStyle = vGrad(ctx, -0.12, 0.34, '#7d79aa', '#27243f');
  ctx.fill();
  stroke(ctx, 0.05);
  // Pliegues.
  ctx.strokeStyle = 'rgba(20,16,40,0.45)';
  ctx.lineWidth = 0.025;
  for (const x of [-0.1, 0, 0.1]) {
    ctx.beginPath();
    ctx.moveTo(x * 0.6, -0.06);
    ctx.quadraticCurveTo(x * 1.8, 0.1, x * 2.2, 0.3);
    ctx.stroke();
  }
  // Faja y campanilla.
  ctx.fillStyle = '#b8a0e8';
  ctx.fillRect(-0.19, 0.07, 0.38, 0.045);
  smallBell(ctx, 0.1, 0.1, 0.45, Math.sin(t * 3 + phase * 0.3) * 0.25);

  // Halo de energía entre las manos.
  const pulse = charging ? 0.6 + 0.4 * Math.sin(t * 12) : 0.45 + 0.15 * Math.sin(t * 2.4);
  glow(ctx, 0, 0.1, charging ? 0.42 : 0.28, '170,130,255', 0.5 * pulse);
  ctx.save();
  ctx.translate(0, 0.1);
  ctx.rotate(t * (charging ? 5 : 1.4));
  ctx.strokeStyle = `rgba(205,180,255,${0.55 + 0.4 * pulse})`;
  ctx.lineWidth = 0.03;
  ctx.beginPath();
  ctx.ellipse(0, 0, charging ? 0.2 : 0.14, charging ? 0.2 : 0.14, 0, 0, Math.PI * 1.6);
  ctx.stroke();
  ctx.restore();

  // Mangas y manos.
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sx * 0.14, -0.08);
    ctx.quadraticCurveTo(sx * 0.3, 0.0, sx * 0.14, 0.12);
    ctx.lineTo(sx * 0.07, 0.07);
    ctx.closePath();
    ctx.fillStyle = '#5d5990';
    ctx.fill();
    stroke(ctx, 0.04);
    ctx.fillStyle = '#d9d2e6';
    circle(ctx, sx * 0.11, 0.1, 0.035);
    ctx.fill();
  }

  // Capucha con rostro vacío.
  ctx.beginPath();
  ctx.moveTo(-0.2, -0.04);
  ctx.quadraticCurveTo(-0.24, -0.34, 0, -0.38);
  ctx.quadraticCurveTo(0.24, -0.34, 0.2, -0.04);
  ctx.quadraticCurveTo(0, 0.04, -0.2, -0.04);
  ctx.closePath();
  ctx.fillStyle = vGrad(ctx, -0.38, 0, '#8e89bf', '#3b3763');
  ctx.fill();
  stroke(ctx, 0.05);
  ctx.beginPath();
  ctx.ellipse(0, -0.17, 0.115, 0.13, 0, 0, Math.PI * 2);
  ctx.fillStyle = radial(ctx, 0, -0.17, 0.01, 0.14, '#0a0712', '#020104');
  ctx.fill();
  for (const ex of [-0.045, 0.045]) {
    glow(ctx, ex, -0.19, 0.075, '190,160,255', charging ? 0.95 : 0.7);
    ctx.fillStyle = '#efe6ff';
    ellipse(ctx, ex, -0.19, 0.018, 0.026);
    ctx.fill();
  }
  // El "hueco": un aro en la frente.
  ctx.strokeStyle = '#b8a0e8';
  ctx.lineWidth = 0.02;
  ctx.beginPath();
  ctx.arc(0, -0.3, 0.035, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// ---------- Eco Menor ----------

export function echoWisp(ctx: Ctx, { t, walk, phase }: ChargePose): void {
  shadow(ctx, 0.16, 0.045, 0.2, 0.36);
  const bob = Math.sin(t * 3.4) * 0.03 - Math.abs(Math.sin(phase)) * 0.03 * walk;
  ctx.save();
  ctx.translate(0, bob - 0.04);
  glow(ctx, 0, 0.02, 0.34, '150,190,255', 0.35);
  // Cola ondulante.
  ctx.beginPath();
  ctx.moveTo(-0.17, 0.05);
  for (let i = 0; i <= 5; i++) {
    const y = 0.05 + i * 0.058;
    ctx.lineTo((i % 2 ? 0.07 : -0.07) * (1 - i / 6) + Math.sin(t * 5 + i) * 0.03 - 0.0, y + 0.02);
  }
  ctx.lineTo(0.17, 0.05);
  ctx.quadraticCurveTo(0.17, -0.2, 0, -0.2);
  ctx.quadraticCurveTo(-0.17, -0.2, -0.17, 0.05);
  ctx.closePath();
  ctx.fillStyle = radial(ctx, -0.04, -0.08, 0.01, 0.3, 'rgba(230,242,255,0.95)', 'rgba(110,130,255,0.35)');
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,70,160,0.7)';
  ctx.lineWidth = 0.03;
  ctx.stroke();
  // Campanilla en la cabeza.
  smallBell(ctx, 0, -0.27, 0.42, Math.sin(t * 6) * 0.3);
  // Ojos.
  ctx.fillStyle = '#1a1840';
  for (const ex of [-0.06, 0.06]) {
    ellipse(ctx, ex, -0.06, 0.022, 0.034);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, 0.0, 0.03, 0.1, Math.PI - 0.1);
  ctx.strokeStyle = '#1a1840';
  ctx.lineWidth = 0.02;
  ctx.stroke();
  ctx.restore();
}

// ---------- Tablilla de sello (escudo de Sōkan) ----------

/** Tablilla de madera sellada que flota y gira despacio: mientras haya alguna en pie, el jefe es invulnerable. */
export function sealTablet(ctx: Ctx, { t, walk, phase }: ChargePose): void {
  shadow(ctx, 0.15, 0.04, 0.22, 0.36);
  const bob = Math.sin(t * 2.6 + phase * 0.1) * 0.04 - Math.abs(Math.sin(phase)) * 0.02 * walk;
  ctx.save();
  ctx.translate(0, bob - 0.06);
  glow(ctx, 0, 0, 0.4, '255,120,90', 0.28 + Math.sin(t * 4) * 0.06);
  ctx.rotate(Math.sin(t * 1.8) * 0.08);
  // Tablilla.
  roundRectPath(ctx, -0.13, -0.26, 0.26, 0.5, 0.04);
  ctx.fillStyle = vGrad(ctx, -0.26, 0.24, '#d9b979', '#8f6a3a');
  ctx.fill();
  stroke(ctx, 0.045);
  // Veta y borde.
  ctx.strokeStyle = 'rgba(90,58,24,0.5)';
  ctx.lineWidth = 0.014;
  for (const y of [-0.16, -0.02, 0.12]) {
    ctx.beginPath();
    ctx.moveTo(-0.1, y);
    ctx.quadraticCurveTo(0, y + 0.025, 0.1, y - 0.01);
    ctx.stroke();
  }
  // Sello rojo: un círculo roto con un trazo central.
  ctx.strokeStyle = '#c4241f';
  ctx.lineWidth = 0.035;
  ctx.beginPath();
  ctx.arc(0, -0.01, 0.075, 0.5, Math.PI * 2 - 0.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-0.045, 0.03);
  ctx.lineTo(0.05, -0.05);
  ctx.stroke();
  // Cinta de papel colgando.
  ctx.fillStyle = '#f2ead3';
  ctx.beginPath();
  ctx.moveTo(-0.04, 0.24);
  ctx.lineTo(0.04, 0.24);
  ctx.lineTo(0.05 + Math.sin(t * 5) * 0.015, 0.36);
  ctx.lineTo(-0.03 + Math.sin(t * 5) * 0.015, 0.36);
  ctx.closePath();
  ctx.fill();
  stroke(ctx, 0.02);
  ctx.restore();
}

// ---------- Marioneta explosiva (Yūgiri) ----------

/** Muñeco de madera y paja con un fardo de pólvora y una mecha encendida: estalla al cargar. */
export function explosiveDoll(ctx: Ctx, { t, walk, phase, charging }: ChargePose): void {
  shadow(ctx, 0.2, 0.06, 0.3, 0.35);
  const bob = -Math.abs(Math.sin(phase)) * 0.04 * walk + Math.sin(t * 3) * 0.008;
  const jitter = charging ? Math.sin(t * 60) * 0.015 : 0;
  ctx.save();
  ctx.translate(jitter, bob);
  if (charging) glow(ctx, 0, 0, 0.5, '255,150,60', 0.45 + Math.sin(t * 24) * 0.15);
  // Piernas de palo.
  ctx.strokeStyle = '#6b4a2a';
  ctx.lineWidth = 0.05;
  ctx.lineCap = 'round';
  const step = Math.sin(phase) * 0.05 * walk;
  for (const [x, o] of [[-0.08, 1], [0.08, -1]] as const) {
    ctx.beginPath();
    ctx.moveTo(x, 0.16);
    ctx.lineTo(x + step * o, 0.33);
    ctx.stroke();
  }
  // Cuerpo: fardo de paja atado.
  ctx.beginPath();
  ctx.ellipse(0, 0.04, 0.2, 0.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = vGrad(ctx, -0.16, 0.24, '#e2c477', '#a07c3c');
  ctx.fill();
  stroke(ctx, 0.045);
  ctx.strokeStyle = '#7a5a28';
  ctx.lineWidth = 0.016;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 0.05, -0.12);
    ctx.lineTo(i * 0.06, 0.2);
    ctx.stroke();
  }
  // Cuerda y tag rojo de pólvora.
  ctx.strokeStyle = '#c4241f';
  ctx.lineWidth = 0.035;
  ctx.beginPath();
  ctx.moveTo(-0.19, 0.04);
  ctx.lineTo(0.19, 0.04);
  ctx.stroke();
  // Cabeza de madera con cara pintada.
  circle(ctx, 0, -0.2, 0.12);
  ctx.fillStyle = vGrad(ctx, -0.32, -0.08, '#e9cfa0', '#b48a55');
  ctx.fill();
  stroke(ctx, 0.04);
  ctx.fillStyle = charging ? '#ff5a2a' : INK;
  for (const ex of [-0.045, 0.045]) {
    ellipse(ctx, ex, -0.21, 0.018, 0.03);
    ctx.fill();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.02;
  ctx.beginPath();
  ctx.moveTo(-0.04, -0.14);
  ctx.lineTo(0.04, -0.14);
  ctx.stroke();
  // Mecha encendida en lo alto.
  ctx.strokeStyle = '#3a2a1c';
  ctx.lineWidth = 0.025;
  ctx.beginPath();
  ctx.moveTo(0, -0.31);
  ctx.quadraticCurveTo(0.05, -0.38, 0.1, -0.36);
  ctx.stroke();
  const flick = 0.8 + Math.sin(t * 22) * 0.2;
  glow(ctx, 0.1, -0.37, 0.12 * flick * (charging ? 1.6 : 1), '255,170,70', 0.9);
  ctx.fillStyle = '#fff2b0';
  circle(ctx, 0.1, -0.37, 0.025 * flick);
  ctx.fill();
  ctx.restore();
}

// ---------- Personajes fijos ----------

export function drawNpc(ctx: Ctx, kind: string, t: number, used: boolean): void {
  if (kind === 'altar_eco_roto') altar(ctx, t, used);
  else if (kind === 'mesa_forja') forja(ctx, t);
  else if (kind === 'mercader') mercader(ctx, t);
  else if (kind === 'maestro_tobari') {
    drawShinobiFigure(ctx, { t, walk: 0, phase: 0 }, { robe: ['#8a7a58', '#4c4130'], trim: '#c9a24a', head: 'bald', weapon: 'staff', glow: '#9cff6a', scarf: used ? undefined : '#5d8a4a' });
  } else maestra(ctx, t, used);
}

/** Mercader ambulante: fardo enorme a la espalda, sombrero de paja y un farolillo que se balancea. */
function mercader(ctx: Ctx, t: number): void {
  shadow(ctx, 0.4, 0.1, 0.45, 0.36);
  // Fardo: tres bultos atados con cuerda.
  ctx.save();
  ctx.translate(-0.2, 0.02);
  for (const [x, y, w, h, c0, c1] of [
    [-0.16, -0.26, 0.34, 0.26, '#9a6a3a', '#6a4424'],
    [-0.2, -0.02, 0.4, 0.3, '#b4452d', '#74241a'],
    [0.06, -0.38, 0.22, 0.2, '#d8c690', '#9a8a58'],
  ] as const) {
    roundRectPath(ctx, x, y, w, h, 0.06);
    ctx.fillStyle = vGrad(ctx, y, y + h, c0, c1);
    ctx.fill();
    stroke(ctx, 0.04);
  }
  ctx.strokeStyle = '#e8d8a8';
  ctx.lineWidth = 0.025;
  ctx.beginPath();
  ctx.moveTo(-0.2, -0.12);
  ctx.lineTo(0.2, -0.12);
  ctx.moveTo(0.0, -0.4);
  ctx.lineTo(0.0, 0.28);
  ctx.stroke();
  ctx.restore();
  drawShinobiFigure(ctx, { t, walk: 0, phase: 0 }, { robe: ['#7d6a4a', '#463a28'], trim: '#e0b84a', head: 'hat', gear: '#e6c984', weapon: 'none', scarf: '#9a3a2a', scale: 0.95 });
  // Farolillo.
  ctx.save();
  ctx.translate(0.3, -0.18);
  ctx.rotate(Math.sin(t * 2) * 0.12);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.02;
  ctx.beginPath();
  ctx.moveTo(0, -0.14);
  ctx.lineTo(0, 0);
  ctx.stroke();
  ctx.fillStyle = radial(ctx, 0, 0.06, 0.01, 0.2, 'rgba(255,214,120,0.7)', 'rgba(255,214,120,0)');
  circle(ctx, 0, 0.06, 0.2);
  ctx.fill();
  roundRectPath(ctx, -0.06, 0.0, 0.12, 0.14, 0.05);
  ctx.fillStyle = '#ff9a3a';
  ctx.fill();
  stroke(ctx, 0.025);
  ctx.restore();
}

/** Mesa de forja: yunque sobre un bloque de piedra, brasas encendidas y un martillo apoyado. */
function forja(ctx: Ctx, t: number): void {
  shadow(ctx, 0.36, 0.09, 0.45, 0.36);
  // Brasero detrás.
  glow(ctx, -0.22, 0.02, 0.3, '255,130,40', 0.35 + 0.15 * Math.sin(t * 7));
  // Bloque de piedra.
  roundRectPath(ctx, -0.28, 0.12, 0.56, 0.24, 0.04);
  ctx.fillStyle = vGrad(ctx, 0.12, 0.36, '#8a8497', '#4a4658');
  ctx.fill();
  stroke(ctx, 0.05);
  // Yunque.
  ctx.beginPath();
  ctx.moveTo(-0.3, -0.1);
  ctx.lineTo(0.2, -0.1);
  ctx.quadraticCurveTo(0.34, -0.08, 0.38, 0.0);
  ctx.lineTo(0.14, 0.03);
  ctx.lineTo(0.1, 0.14);
  ctx.lineTo(-0.1, 0.14);
  ctx.lineTo(-0.08, 0.03);
  ctx.lineTo(-0.3, 0.0);
  ctx.closePath();
  ctx.fillStyle = vGrad(ctx, -0.1, 0.14, '#98a2b6', '#3f4557');
  ctx.fill();
  stroke(ctx, 0.05);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(-0.26, -0.085, 0.44, 0.025);
  // Hierro al rojo sobre el yunque.
  const heat = 0.6 + 0.4 * Math.sin(t * 3);
  glow(ctx, 0.0, -0.12, 0.2, '255,150,60', 0.6 * heat);
  roundRectPath(ctx, -0.1, -0.15, 0.22, 0.05, 0.02);
  ctx.fillStyle = `rgb(255,${Math.floor(130 + 60 * heat)},70)`;
  ctx.fill();
  stroke(ctx, 0.03);
  // Martillo apoyado a la derecha.
  ctx.save();
  ctx.translate(0.3, 0.1);
  ctx.rotate(0.35);
  ctx.fillStyle = '#7b5233';
  ctx.fillRect(-0.02, -0.18, 0.04, 0.34);
  stroke(ctx, 0.025);
  ctx.fillStyle = vGrad(ctx, -0.22, -0.1, '#b8bfcd', '#4a5064');
  roundRectPath(ctx, -0.09, -0.24, 0.18, 0.1, 0.02);
  ctx.fill();
  stroke(ctx, 0.035);
  ctx.restore();
  // Chispas.
  for (let i = 0; i < 4; i++) {
    const ph = (t * 1.4 + i * 0.27) % 1;
    glow(ctx, -0.06 + i * 0.05 + Math.sin(i * 3 + t) * 0.03, -0.14 - ph * 0.3, 0.035, '255,210,120', 0.9 * (1 - ph));
  }
}

function maestra(ctx: Ctx, t: number, used: boolean): void {
  shadow(ctx, 0.27, 0.08, 0.4);
  if (!used) glow(ctx, 0, 0.3, 0.45, '255,226,150', 0.16 + 0.06 * Math.sin(t * 2));
  const breathe = Math.sin(t * 1.8) * 0.01;
  ctx.save();
  ctx.translate(0, breathe);
  // Bastón con campanilla y calabaza.
  ctx.beginPath();
  ctx.moveTo(0.24, -0.38);
  ctx.lineTo(0.26, 0.34);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.065;
  ctx.stroke();
  ctx.strokeStyle = '#a07a4a';
  ctx.lineWidth = 0.04;
  ctx.stroke();
  smallBell(ctx, 0.24, -0.36, 0.4, Math.sin(t * 2.2) * 0.2);
  ctx.beginPath();
  ctx.ellipse(0.27, -0.08, 0.05, 0.065, 0.1, 0, Math.PI * 2);
  ctx.fillStyle = '#c9a24a';
  ctx.fill();
  stroke(ctx, 0.03);
  // Túnica.
  ctx.beginPath();
  ctx.moveTo(-0.14, -0.1);
  ctx.lineTo(0.14, -0.1);
  ctx.lineTo(0.27, 0.33);
  ctx.lineTo(-0.27, 0.33);
  ctx.closePath();
  ctx.fillStyle = vGrad(ctx, -0.1, 0.34, '#3d9a8c', '#17453f');
  ctx.fill();
  stroke(ctx, 0.05);
  ctx.fillStyle = '#e6d6a8';
  ctx.fillRect(-0.27, 0.29, 0.54, 0.04);
  ctx.fillStyle = '#b3532f';
  ctx.fillRect(-0.15, 0.04, 0.3, 0.06);
  // Mangas y manos.
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sx * 0.13, -0.07);
    ctx.quadraticCurveTo(sx * 0.3, 0.02, sx * 0.2, 0.14);
    ctx.lineTo(sx * 0.1, 0.06);
    ctx.closePath();
    ctx.fillStyle = '#2f7e72';
    ctx.fill();
    stroke(ctx, 0.04);
  }
  ctx.fillStyle = '#e9c39b';
  circle(ctx, 0.23, 0.1, 0.035);
  ctx.fill();
  // Cabeza, pelo canoso con moño.
  circle(ctx, 0, -0.19, 0.13);
  ctx.fillStyle = vGrad(ctx, -0.32, -0.06, '#ecc9a4', '#c99f74');
  ctx.fill();
  stroke(ctx, 0.045);
  ctx.beginPath();
  ctx.moveTo(-0.14, -0.2);
  ctx.quadraticCurveTo(-0.15, -0.36, 0, -0.35);
  ctx.quadraticCurveTo(0.15, -0.36, 0.14, -0.2);
  ctx.quadraticCurveTo(0.08, -0.29, 0, -0.27);
  ctx.quadraticCurveTo(-0.08, -0.29, -0.14, -0.2);
  ctx.fillStyle = '#d9dde6';
  ctx.fill();
  stroke(ctx, 0.04);
  circle(ctx, 0, -0.4, 0.06);
  ctx.fillStyle = '#d9dde6';
  ctx.fill();
  stroke(ctx, 0.035);
  ctx.fillStyle = '#b3532f';
  ctx.fillRect(-0.025, -0.35, 0.05, 0.025);
  // Ojos cerrados y sonrisa leve.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.02;
  for (const ex of [-0.05, 0.05]) {
    ctx.beginPath();
    ctx.arc(ex, -0.19, 0.022, 0.15, Math.PI - 0.15);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, -0.145, 0.03, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.restore();
}

function altar(ctx: Ctx, t: number, used: boolean): void {
  shadow(ctx, 0.34, 0.09, 0.45, 0.34);
  // Anillo rúnico en el suelo.
  ctx.save();
  ctx.translate(0, 0.28);
  ctx.scale(1, 0.32);
  ctx.strokeStyle = used ? 'rgba(120,110,140,0.5)' : `rgba(190,150,255,${0.5 + 0.25 * Math.sin(t * 2)})`;
  ctx.lineWidth = 0.035;
  circle(ctx, 0, 0, 0.42);
  ctx.stroke();
  ctx.lineWidth = 0.02;
  circle(ctx, 0, 0, 0.32);
  ctx.stroke();
  ctx.restore();
  // Pedestal.
  roundRectPath(ctx, -0.22, 0.08, 0.44, 0.24, 0.04);
  ctx.fillStyle = vGrad(ctx, 0.08, 0.32, '#8f8aa0', '#4e4a5e');
  ctx.fill();
  stroke(ctx, 0.05);
  roundRectPath(ctx, -0.17, -0.06, 0.34, 0.16, 0.04);
  ctx.fillStyle = vGrad(ctx, -0.06, 0.1, '#a6a1b8', '#6a657c');
  ctx.fill();
  stroke(ctx, 0.045);
  ctx.strokeStyle = 'rgba(30,24,44,0.6)';
  ctx.lineWidth = 0.02;
  for (const x of [-0.1, 0, 0.1]) {
    ctx.beginPath();
    ctx.moveTo(x, 0.12);
    ctx.lineTo(x, 0.28);
    ctx.stroke();
  }
  // Fragmento de campana flotando.
  const bob = Math.sin(t * 2.1) * 0.025;
  const a = used ? 0.2 : 0.7 + 0.2 * Math.sin(t * 3);
  glow(ctx, 0, -0.18 + bob, 0.34, '190,140,255', a * 0.6);
  ctx.save();
  ctx.translate(0, -0.18 + bob);
  ctx.rotate(Math.sin(t * 1.3) * 0.08);
  ctx.beginPath();
  ctx.moveTo(-0.14, 0.12);
  ctx.quadraticCurveTo(-0.16, -0.02, -0.06, -0.14);
  ctx.lineTo(0.02, -0.07);
  ctx.lineTo(0.05, -0.15);
  ctx.quadraticCurveTo(0.16, -0.04, 0.15, 0.12);
  ctx.lineTo(0.06, 0.06);
  ctx.lineTo(0.0, 0.13);
  ctx.closePath();
  ctx.fillStyle = vGrad(ctx, -0.15, 0.13, '#f0c474', '#8a5a1e');
  ctx.fill();
  stroke(ctx, 0.045);
  ctx.strokeStyle = `rgba(210,170,255,${a})`;
  ctx.lineWidth = 0.02;
  ctx.beginPath();
  ctx.moveTo(-0.02, -0.1);
  ctx.lineTo(0.0, -0.02);
  ctx.lineTo(-0.04, 0.05);
  ctx.stroke();
  ctx.restore();
}
