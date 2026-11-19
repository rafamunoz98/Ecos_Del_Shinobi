import { type Ctx, INK, circle, ellipse, makeCanvas, radial, roundRectPath, vGrad } from './draw';
import { makeRand, mix, rgba } from './noise';
import type { Theme } from './themes';

/** Resolución base de cada baldosa del atlas. Se reduce al dibujar, así que se ve nítida a cualquier zoom. */
export const T = 96;

const cache = new Map<string, HTMLCanvasElement>();
function cached(key: string, build: (ctx: Ctx) => void, w = T, h = T): HTMLCanvasElement {
  const hit = cache.get(key);
  if (hit) return hit;
  const [c, ctx] = makeCanvas(w, h);
  build(ctx);
  cache.set(key, c);
  return c;
}

// Bits de vecinos. En suelos: pared en esa dirección. En paredes: hueco abierto en esa dirección.
export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;
export const NE = 16;
export const SE = 32;
export const SW = 64;
export const NW = 128;

// ---------- Suelo ----------

function floorBase(ctx: Ctx, th: Theme, variant: number): void {
  const r = makeRand(variant * 7919 + 17);
  ctx.fillStyle = th.grout;
  ctx.fillRect(0, 0, T, T);
  const dx = T * (0.4 + r() * 0.2);
  const dy = T * (0.4 + r() * 0.2);
  const slabs: [number, number, number, number][] = [
    [0, 0, dx, dy],
    [dx, 0, T - dx, dy],
    [0, dy, dx, T - dy],
    [dx, dy, T - dx, T - dy],
  ];
  for (const [x, y, w, h] of slabs) {
    const g = 2.5;
    const sx = x + g;
    const sy = y + g;
    const sw = w - g * 2;
    const sh = h - g * 2;
    const base = mix(th.floorA, th.floorB, r());
    roundRectPath(ctx, sx, sy, sw, sh, 7);
    ctx.fillStyle = vGrad(ctx, sy, sy + sh, mix(base, '#ffffff', 0.1), mix(base, '#000000', 0.16));
    ctx.fill();
    // Bordes iluminados / sombreados para dar volumen a la losa.
    ctx.save();
    roundRectPath(ctx, sx, sy, sw, sh, 7);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx, sy + sh);
    ctx.lineTo(sx, sy);
    ctx.lineTo(sx + sw, sy);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.moveTo(sx + sw, sy);
    ctx.lineTo(sx + sw, sy + sh);
    ctx.lineTo(sx, sy + sh);
    ctx.stroke();
    // Granulado.
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.07)';
      circle(ctx, sx + r() * sw, sy + r() * sh, 0.8 + r() * 1.8);
      ctx.fill();
    }
    // Veta o grieta.
    if (r() < 0.45) {
      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      let cx = sx + r() * sw;
      let cy = sy + r() * sh;
      ctx.moveTo(cx, cy);
      for (let k = 0; k < 4; k++) {
        cx += (r() - 0.5) * 18;
        cy += (r() - 0.3) * 14;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}

function floorDeco(ctx: Ctx, th: Theme, variant: number): void {
  const r = makeRand(variant * 131 + 5);
  if (variant === 0 || variant === 1) return;
  if (th.deco === 'hierba') {
    // Mancha de musgo y matas de hierba.
    const mx = 20 + r() * 56;
    const my = 20 + r() * 56;
    ctx.fillStyle = radial(ctx, mx, my, 2, 30, rgba(th.accent, 0.42), rgba(th.accent, 0));
    ctx.fillRect(0, 0, T, T);
    const tufts = variant >= 3 ? 3 : 1;
    for (let t = 0; t < tufts; t++) {
      const bx = 14 + r() * 68;
      const by = 40 + r() * 46;
      for (let b = 0; b < 7; b++) {
        const a = -Math.PI / 2 + (b - 3) * 0.32 + (r() - 0.5) * 0.2;
        const len = 11 + r() * 9;
        ctx.strokeStyle = b % 2 ? th.accent : th.accent2;
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + Math.cos(a) * len * 0.4 + 2, by + Math.sin(a) * len * 0.5, bx + Math.cos(a) * len, by + Math.sin(a) * len);
        ctx.stroke();
      }
      if (r() < 0.4) {
        ctx.fillStyle = '#f4e6a0';
        circle(ctx, bx + 6, by - 12, 2.2);
        ctx.fill();
      }
    }
  } else if (th.deco === 'cristal') {
    // Veladura húmeda y cristales de sal.
    ctx.fillStyle = radial(ctx, 48, 52, 4, 44, 'rgba(160,200,255,0.16)', 'rgba(160,200,255,0)');
    ctx.fillRect(0, 0, T, T);
    const n = variant >= 3 ? 3 : 1;
    for (let k = 0; k < n; k++) {
      const cx = 18 + r() * 60;
      const cy = 30 + r() * 50;
      for (let c = 0; c < 3; c++) {
        const px = cx + (c - 1) * 6 + r() * 3;
        const h = 9 + r() * 11;
        ctx.fillStyle = mix(th.accent, th.accent2, r() * 0.6);
        ctx.beginPath();
        ctx.moveTo(px - 3.5, cy);
        ctx.lineTo(px - 2, cy - h);
        ctx.lineTo(px + 2, cy - h * 0.9);
        ctx.lineTo(px + 3.5, cy);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(40,60,100,0.55)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillRect(px - 2, cy - h + 1, 1.6, h * 0.55);
      }
    }
  } else {
    // Grietas de brasa y ceniza: tres pasadas del mismo trazo (halo, brasa, núcleo).
    const pts: [number, number][] = [];
    let px = 10 + r() * 20;
    let py = 14 + r() * 60;
    pts.push([px, py]);
    for (let i = 0; i < 6; i++) {
      px += 10 + r() * 10;
      py += (r() - 0.5) * 22;
      pts.push([px, py]);
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [w, c] of [
      [6, rgba(th.accent, 0.22)],
      [3, rgba(th.accent, 0.65)],
      [1.2, rgba(th.accent2, 0.95)],
    ] as const) {
      ctx.strokeStyle = c;
      ctx.lineWidth = w;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    }
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = 'rgba(20,14,26,0.18)';
      ellipse(ctx, r() * T, r() * T, 2 + r() * 4, 1 + r() * 2);
      ctx.fill();
    }
  }
}

/** Suelo con sombra proyectada por las paredes vecinas (`mask`: bits N/E/S/W y esquinas con pared). */
export function floorTile(th: Theme, variant: number, mask: number): HTMLCanvasElement {
  return cached(`${th.name}|f|${variant}|${mask}`, (ctx) => {
    floorBase(ctx, th, variant);
    floorDeco(ctx, th, variant);
    const shade = (x0: number, y0: number, x1: number, y1: number, a: number): void => {
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, `rgba(4,3,10,${a})`);
      g.addColorStop(1, 'rgba(4,3,10,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, T, T);
    };
    if (mask & N) shade(0, 0, 0, T * 0.5, 0.62);
    if (mask & W) shade(0, 0, T * 0.3, 0, 0.4);
    if (mask & E) shade(T, 0, T * 0.7, 0, 0.3);
    if (mask & S) shade(0, T, 0, T * 0.78, 0.22);
    const corner = (x: number, y: number, a: number): void => {
      ctx.fillStyle = radial(ctx, x, y, 0, T * 0.4, `rgba(4,3,10,${a})`, 'rgba(4,3,10,0)');
      ctx.fillRect(0, 0, T, T);
    };
    if (mask & NW && !(mask & (N | W))) corner(0, 0, 0.42);
    if (mask & NE && !(mask & (N | E))) corner(T, 0, 0.36);
    if (mask & SW && !(mask & (S | W))) corner(0, T, 0.2);
    if (mask & SE && !(mask & (S | E))) corner(T, T, 0.2);
  });
}

// ---------- Paredes ----------

function rockTexture(ctx: Ctx, th: Theme, variant: number): void {
  const r = makeRand(variant * 4243 + 3);
  ctx.fillStyle = vGrad(ctx, 0, T, th.roof, th.roofDark);
  ctx.fillRect(0, 0, T, T);
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = r() < 0.5 ? rgba(th.roofDark, 0.35) : 'rgba(255,255,255,0.045)';
    ellipse(ctx, r() * T, r() * T, 8 + r() * 16, 5 + r() * 10, r() * 3);
    ctx.fill();
  }
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    circle(ctx, r() * T, r() * T, 0.7 + r() * 1.6);
    ctx.fill();
  }
  if (th.deco === 'hierba' && variant % 2 === 0) {
    ctx.fillStyle = radial(ctx, r() * T, r() * T, 1, 24, rgba(th.accent, 0.3), rgba(th.accent, 0));
    ctx.fillRect(0, 0, T, T);
  }
}

function brickFace(ctx: Ctx, th: Theme, variant: number, y0: number): void {
  const r = makeRand(variant * 977 + 41);
  const h = T - y0;
  ctx.fillStyle = vGrad(ctx, y0, T, th.faceLight, th.faceDark);
  ctx.fillRect(0, y0, T, h);
  const rows = 3;
  const rh = h / rows;
  ctx.lineWidth = 2.4;
  for (let row = 0; row < rows; row++) {
    const y = y0 + row * rh;
    const off = row % 2 ? 0 : T * 0.25;
    const bw = T / 2;
    for (let k = -1; k < 3; k++) {
      const x = off + k * bw;
      // Tono propio de cada ladrillo.
      ctx.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.12)';
      ctx.fillRect(Math.max(0, x + 1), y + 1, Math.min(bw - 2, T - x), rh - 2);
      // Cara iluminada arriba-izquierda.
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(Math.max(0, x + 1), y + 1, Math.min(bw - 2, T - x), 2.2);
      ctx.strokeStyle = th.mortar;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + rh);
      ctx.stroke();
    }
    ctx.strokeStyle = th.mortar;
    ctx.beginPath();
    ctx.moveTo(0, y + rh);
    ctx.lineTo(T, y + rh);
    ctx.stroke();
  }
  if (th.deco === 'hierba' && variant % 2 === 1) {
    for (let i = 0; i < 3; i++) {
      const x = r() * T;
      ctx.fillStyle = rgba(th.accent, 0.35);
      roundRectPath(ctx, x, y0, 4 + r() * 4, 6 + r() * 16, 2);
      ctx.fill();
    }
  }
  // Sombra de contacto con el suelo.
  ctx.fillStyle = vGrad(ctx, T - 14, T, 'rgba(0,0,0,0)', 'rgba(0,0,0,0.5)');
  ctx.fillRect(0, T - 14, T, 14);
}

/** Pared. `mask`: bits N/E/S/W indican huecos abiertos (no pared) en esa dirección. */
export function wallTile(th: Theme, variant: number, mask: number): HTMLCanvasElement {
  return cached(`${th.name}|w|${variant}|${mask}`, (ctx) => {
    rockTexture(ctx, th, variant);
    const faceY = T * 0.4;
    if (mask & S) {
      brickFace(ctx, th, variant, faceY);
      // Labio superior iluminado + sombra bajo él.
      ctx.fillStyle = th.lip;
      ctx.fillRect(0, faceY - 3, T, 3.5);
      ctx.fillStyle = vGrad(ctx, faceY, faceY + 10, 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0)');
      ctx.fillRect(0, faceY + 0.5, T, 10);
    }
    const bottom = mask & S ? faceY : T;
    if (mask & N) {
      ctx.fillStyle = vGrad(ctx, 0, 14, rgba(th.lip, 0.55), rgba(th.lip, 0));
      ctx.fillRect(0, 0, T, 14);
      ctx.fillStyle = INK;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(0, 0, T, 2);
      ctx.globalAlpha = 1;
    }
    if (mask & W) {
      ctx.fillStyle = rgba(th.lip, 0.4);
      ctx.fillRect(0, 0, 5, bottom);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 0, 2, T);
    }
    if (mask & E) {
      ctx.fillStyle = rgba(th.lip, 0.28);
      ctx.fillRect(T - 5, 0, 5, bottom);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(T - 2, 0, 2, T);
    }
  });
}

// ---------- Puertas ----------

function planks(ctx: Ctx, x: number, y: number, w: number, h: number, seed: number): void {
  const r = makeRand(seed);
  const n = 4;
  const pw = w / n;
  for (let i = 0; i < n; i++) {
    const tone = mix('#7b5233', '#5c3b22', r());
    ctx.fillStyle = vGrad(ctx, y, y + h, mix(tone, '#ffffff', 0.08), mix(tone, '#000000', 0.18));
    ctx.fillRect(x + i * pw, y, pw, h);
    ctx.strokeStyle = 'rgba(30,16,8,0.7)';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(x + i * pw, y, pw, h);
    ctx.strokeStyle = 'rgba(30,16,8,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + i * pw + pw * 0.35, y + 4);
    ctx.lineTo(x + i * pw + pw * 0.45, y + h - 4);
    ctx.stroke();
  }
}

function ironBand(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = '#3b3f4a';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x, y, w, 1.5);
  ctx.fillStyle = '#9aa0ae';
  for (let k = 0; k < 4; k++) {
    circle(ctx, x + 5 + (k * (w - 10)) / 3, y + h / 2, 1.6);
    ctx.fill();
  }
}

/** `orient`: 'ns' = el paso va de norte a sur (paredes a E y O). */
export function doorTile(th: Theme, orient: 'ns' | 'ew', open: boolean): HTMLCanvasElement {
  return cached(`${th.name}|d|${orient}|${open}`, (ctx) => {
    floorBase(ctx, th, 0);
    if (orient === 'ns') {
      // Dintel y jambas de piedra.
      ctx.fillStyle = vGrad(ctx, 0, T, th.faceLight, th.faceDark);
      ctx.fillRect(0, 0, 11, T);
      ctx.fillRect(T - 11, 0, 11, T);
      ctx.fillStyle = th.mortar;
      ctx.fillRect(11, 0, 1.5, T);
      ctx.fillRect(T - 12.5, 0, 1.5, T);
      ctx.fillStyle = vGrad(ctx, 0, 20, th.faceLight, th.faceDark);
      ctx.fillRect(0, 0, T, 20);
      ctx.fillStyle = th.lip;
      ctx.fillRect(0, 0, T, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(11, 20, T - 22, 5);
      if (!open) {
        planks(ctx, 12, 22, T - 24, T - 22, 11);
        ironBand(ctx, 12, 36, T - 24, 8);
        ironBand(ctx, 12, 66, T - 24, 8);
        ctx.strokeStyle = '#c9ccd6';
        ctx.lineWidth = 2.4;
        circle(ctx, T / 2 + 12, 52, 4.5);
        ctx.stroke();
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(12, T - 8, T - 24, 8);
      } else {
        // Hoja abierta, pegada al marco izquierdo.
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(12, 24, T - 24, 8);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(12, 24);
        ctx.lineTo(28, 30);
        ctx.lineTo(28, T - 6);
        ctx.lineTo(12, T);
        ctx.closePath();
        ctx.clip();
        planks(ctx, 12, 24, 16, T - 24, 21);
        ctx.restore();
        ironBand(ctx, 13, 44, 14, 6);
      }
    } else {
      // Vista de canto: la hoja es una losa de madera en el centro del paso.
      ctx.fillStyle = vGrad(ctx, 0, 16, th.faceLight, th.faceDark);
      ctx.fillRect(0, 0, T, 14);
      ctx.fillRect(0, T - 14, T, 14);
      ctx.fillStyle = th.lip;
      ctx.fillRect(0, 0, T, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 14, T, 4);
      if (!open) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ellipse(ctx, T / 2 + 5, T / 2 + 6, 14, 36);
        ctx.fill();
        ctx.save();
        roundRectPath(ctx, T / 2 - 12, 10, 24, T - 20, 5);
        ctx.clip();
        planks(ctx, T / 2 - 12, 10, 24, T - 20, 33);
        ctx.restore();
        roundRectPath(ctx, T / 2 - 12, 10, 24, T - 20, 5);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.stroke();
        ironBand(ctx, T / 2 - 12, 26, 24, 7);
        ironBand(ctx, T / 2 - 12, 62, 24, 7);
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(10, 18, T - 20, 6);
        planks(ctx, 8, 18, T - 16, 12, 44);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(8, 18, T - 16, 12);
        ironBand(ctx, 12, 20, 10, 8);
      }
    }
  });
}

// ---------- Arbustos ----------

export interface BushArt {
  back: HTMLCanvasElement;
  front: HTMLCanvasElement;
}

export function bushTile(variant: number): BushArt {
  const key = `bush|${variant}`;
  const back = cached(`${key}|b`, (ctx) => drawBush(ctx, variant, 'back'));
  const front = cached(`${key}|f`, (ctx) => drawBush(ctx, variant, 'front'));
  return { back, front };
}

function drawBush(ctx: Ctx, variant: number, layer: 'back' | 'front'): void {
  const r = makeRand(variant * 337 + 11);
  const blobs: { x: number; y: number; r: number }[] = [];
  const n = 13;
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    blobs.push({ x: 48 + Math.cos(a) * d * 26, y: 50 + Math.sin(a) * d * 19, r: 13 + r() * 9 });
  }
  blobs.sort((a, b) => a.y - b.y);
  if (layer === 'back') {
    ctx.fillStyle = 'rgba(8,10,6,0.4)';
    ellipse(ctx, 48, 78, 38, 11);
    ctx.fill();
  }
  const lower = blobs.filter((b) => b.y >= 50);
  const upper = blobs.filter((b) => b.y < 50);
  const set = layer === 'back' ? [...blobs] : [...lower.slice(-4), ...upper.slice(-3), ...lower.slice(0, 2)];
  for (const b of set) {
    const dark = layer === 'back';
    const baseY = b.y / T;
    const c0 = dark ? mix('#2c6a34', '#1d4a27', baseY) : mix('#4a9a48', '#2f7a3a', baseY);
    ctx.fillStyle = radial(ctx, b.x - b.r * 0.3, b.y - b.r * 0.4, 1, b.r * 1.15, mix(c0, '#d7ff9a', dark ? 0.12 : 0.32), mix(c0, '#0e2a16', 0.35));
    circle(ctx, b.x, b.y, b.r);
    ctx.fill();
    ctx.strokeStyle = 'rgba(10,30,14,0.75)';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (!dark) {
      // Hojitas en el borde superior.
      ctx.strokeStyle = 'rgba(214,255,150,0.55)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(b.x - 1, b.y - 1, b.r * 0.7, Math.PI * 1.05, Math.PI * 1.6);
      ctx.stroke();
    }
  }
  if (layer === 'front') {
    for (let i = 0; i < 4 + (variant % 3); i++) {
      const bx = 22 + r() * 52;
      const by = 34 + r() * 30;
      ctx.fillStyle = i % 2 ? '#ff5d73' : '#ffd166';
      circle(ctx, bx, by, 2.6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(70,10,20,0.7)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

// ---------- Escalera, cofres, barrera ----------

export function stairsTile(th: Theme): HTMLCanvasElement {
  return cached(`${th.name}|stairs`, (ctx) => {
    floorBase(ctx, th, 1);
    roundRectPath(ctx, 9, 9, T - 18, T - 18, 10);
    ctx.fillStyle = th.faceDark;
    ctx.fill();
    ctx.strokeStyle = th.lip;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.save();
    roundRectPath(ctx, 15, 15, T - 30, T - 30, 6);
    ctx.clip();
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      const y = 15 + (i * (T - 30)) / steps;
      const l = 1 - i / steps;
      ctx.fillStyle = mix('#0b0814', '#8a85a8', l * 0.85);
      ctx.fillRect(15, y, T - 30, (T - 30) / steps + 1);
      ctx.fillStyle = `rgba(255,255,255,${0.25 * l})`;
      ctx.fillRect(15, y, T - 30, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(15, y + (T - 30) / steps - 2, T - 30, 2);
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(155,107,255,0.9)';
    ctx.lineWidth = 2;
    roundRectPath(ctx, 15, 15, T - 30, T - 30, 6);
    ctx.stroke();
  });
}

/** Candado de hierro centrado en (cx, cy); `s` escala el dibujo. */
function padlock(ctx: Ctx, cx: number, cy: number, s: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  // Arco.
  ctx.beginPath();
  ctx.arc(0, -4, 9, Math.PI, 0);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.strokeStyle = '#b9c0cf';
  ctx.lineWidth = 4;
  ctx.stroke();
  // Cuerpo.
  roundRectPath(ctx, -12, -4, 24, 20, 4);
  ctx.fillStyle = vGrad(ctx, -4, 16, '#e8c25a', '#a8741f');
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.fillStyle = INK;
  circle(ctx, 0, 5, 2.8);
  ctx.fill();
  ctx.fillRect(-1.2, 5, 2.4, 6);
  ctx.restore();
}

/** Puerta de una cámara sellada: la puerta cerrada con bandas cruzadas y un candado de hierro. */
export function lockedDoorTile(th: Theme, orient: 'ns' | 'ew'): HTMLCanvasElement {
  return cached(`${th.name}|ld|${orient}`, (ctx) => {
    ctx.drawImage(doorTile(th, orient, false), 0, 0);
    ctx.fillStyle = 'rgba(40,10,20,0.28)';
    ctx.fillRect(0, 0, T, T);
    if (orient === 'ns') {
      ironBand(ctx, 12, 22, T - 24, 7);
      ironBand(ctx, 12, 78, T - 24, 7);
      ctx.strokeStyle = '#2a2d36';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(14, 30);
      ctx.lineTo(T - 14, 76);
      ctx.moveTo(T - 14, 30);
      ctx.lineTo(14, 76);
      ctx.stroke();
      padlock(ctx, T / 2, 50, 1.15);
    } else {
      ironBand(ctx, T / 2 - 12, 40, 24, 6);
      padlock(ctx, T / 2, 44, 0.9);
    }
  });
}

export function chestTile(opened: boolean, locked = false): HTMLCanvasElement {
  return cached(`chest|${opened}|${locked}`, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ellipse(ctx, 48, 74, 32, 9);
    ctx.fill();
    const wood = locked ? '#a2332e' : '#8a5a2e';
    const woodD = locked ? '#4f1414' : '#5a3718';
    const metal = locked ? '#d3dae8' : '#e6b84a';
    // Cuerpo.
    roundRectPath(ctx, 16, 44, 64, 30, 5);
    ctx.fillStyle = vGrad(ctx, 44, 74, wood, woodD);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.6;
    ctx.stroke();
    // Tablas.
    ctx.strokeStyle = 'rgba(30,16,6,0.55)';
    ctx.lineWidth = 1.5;
    for (const x of [37, 58]) {
      ctx.beginPath();
      ctx.moveTo(x, 46);
      ctx.lineTo(x, 72);
      ctx.stroke();
    }
    if (!opened) {
      // Tapa abombada.
      ctx.beginPath();
      ctx.moveTo(16, 46);
      ctx.quadraticCurveTo(16, 22, 48, 22);
      ctx.quadraticCurveTo(80, 22, 80, 46);
      ctx.closePath();
      ctx.fillStyle = vGrad(ctx, 22, 46, mix(wood, '#ffffff', 0.22), wood);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.6;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,230,170,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(22, 40);
      ctx.quadraticCurveTo(26, 28, 44, 26);
      ctx.stroke();
    } else {
      // Tapa levantada hacia atrás y fondo dorado.
      ctx.fillStyle = vGrad(ctx, 36, 48, '#2a1a0c', '#ffcf66');
      roundRectPath(ctx, 18, 40, 60, 9, 3);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(18, 40);
      ctx.quadraticCurveTo(14, 14, 48, 12);
      ctx.quadraticCurveTo(82, 14, 78, 40);
      ctx.closePath();
      ctx.fillStyle = vGrad(ctx, 12, 40, woodD, '#3c2410');
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }
    // Herrajes (dorados; plateados en el cofre lacado).
    ctx.fillStyle = metal;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    for (const x of [16, 74]) {
      roundRectPath(ctx, x - 1, 44, 8, 30, 2);
      ctx.fill();
      ctx.stroke();
    }
    if (!opened) {
      roundRectPath(ctx, 42, 40, 12, 14, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = INK;
      circle(ctx, 48, 46, 2.2);
      ctx.fill();
      ctx.fillRect(47, 46, 2, 5);
      if (locked) padlock(ctx, 48, 56, 0.9);
    }
  });
}

export function barrierTile(th: Theme): HTMLCanvasElement {
  return cached(`${th.name}|barrier`, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ellipse(ctx, 48, 80, 36, 9);
    ctx.fill();
    const shards: [number, number, number, number][] = [
      [14, 80, 20, 52],
      [30, 82, 26, 70],
      [50, 82, 24, 60],
      [66, 80, 18, 46],
    ];
    for (const [x, y, w, h] of shards) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w * 0.2, y - h);
      ctx.lineTo(x + w * 0.75, y - h * 0.88);
      ctx.lineTo(x + w, y);
      ctx.closePath();
      ctx.fillStyle = vGrad(ctx, y - h, y, '#9fb0cc', '#3e4a63');
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.moveTo(x + w * 0.2, y - h);
      ctx.lineTo(x + w * 0.45, y - h * 0.9);
      ctx.lineTo(x + w * 0.35, y - h * 0.2);
      ctx.lineTo(x + 2, y - 2);
      ctx.closePath();
      ctx.fill();
    }
  });
}
