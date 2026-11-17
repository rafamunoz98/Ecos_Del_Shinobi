import { type Ctx, INK, circle, ellipse, radial, roundRectPath, vGrad } from './draw';

/**
 * Iconos vectoriales de objetos, armas, vestimenta, afinidades y estados. Se dibujan en una caja de
 * 1×1 centrada en (0,0): quien llama hace translate/scale. Los usa el mundo (objetos en el suelo)
 * y el menú (convertidos a imagen).
 */

const outline = (ctx: Ctx, w = 0.05): void => {
  ctx.strokeStyle = INK;
  ctx.lineWidth = w;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
};

function shuriken(ctx: Ctx): void {
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    ctx.lineTo(Math.cos(a) * 0.46, Math.sin(a) * 0.46);
    ctx.lineTo(Math.cos(a + Math.PI / 4) * 0.12, Math.sin(a + Math.PI / 4) * 0.12);
  }
  ctx.closePath();
  ctx.fillStyle = vGrad(ctx, -0.46, 0.46, '#e9edf5', '#7c8499');
  ctx.fill();
  outline(ctx, 0.05);
  ctx.fillStyle = INK;
  circle(ctx, 0, 0, 0.07);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.moveTo(0.05, -0.1);
  ctx.lineTo(0.34, -0.34);
  ctx.lineTo(0.12, -0.04);
  ctx.fill();
}

function blade(ctx: Ctx, len: number, width: number, c0: string, c1: string, handle = '#5b3a24'): void {
  // Empuñadura abajo, hoja hacia arriba (eje y negativo).
  roundRectPath(ctx, -0.045, 0.1, 0.09, 0.3, 0.03);
  ctx.fillStyle = handle;
  ctx.fill();
  outline(ctx, 0.04);
  ctx.fillStyle = '#c9a24a';
  ctx.fillRect(-0.15, 0.06, 0.3, 0.06);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.035;
  ctx.strokeRect(-0.15, 0.06, 0.3, 0.06);
  ctx.beginPath();
  ctx.moveTo(-width, 0.06);
  ctx.lineTo(-width, 0.06 - len * 0.8);
  ctx.lineTo(0, 0.06 - len);
  ctx.lineTo(width, 0.06 - len * 0.8);
  ctx.lineTo(width, 0.06);
  ctx.closePath();
  ctx.fillStyle = vGrad(ctx, 0.06 - len, 0.06, c0, c1);
  ctx.fill();
  outline(ctx, 0.045);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 0.025;
  ctx.beginPath();
  ctx.moveTo(-width * 0.4, 0.02);
  ctx.lineTo(-width * 0.4, 0.06 - len * 0.78);
  ctx.stroke();
}

function kunai(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(0, -0.46);
  ctx.quadraticCurveTo(0.17, -0.18, 0.05, 0.12);
  ctx.lineTo(-0.05, 0.12);
  ctx.quadraticCurveTo(-0.17, -0.18, 0, -0.46);
  ctx.fillStyle = vGrad(ctx, -0.46, 0.12, '#f0f3fa', '#7d869b');
  ctx.fill();
  outline(ctx, 0.045);
  roundRectPath(ctx, -0.045, 0.1, 0.09, 0.24, 0.03);
  ctx.fillStyle = '#3d3f52';
  ctx.fill();
  outline(ctx, 0.04);
  ctx.strokeStyle = '#c9a24a';
  ctx.lineWidth = 0.05;
  circle(ctx, 0, 0.4, 0.07);
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.02;
  circle(ctx, 0, 0.4, 0.095);
  ctx.stroke();
}

function senbon(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(0, -0.48);
  ctx.lineTo(0.04, 0.3);
  ctx.lineTo(-0.04, 0.3);
  ctx.closePath();
  ctx.fillStyle = '#dfe5ef';
  ctx.fill();
  outline(ctx, 0.03);
  ctx.fillStyle = '#d0485a';
  roundRectPath(ctx, -0.06, 0.28, 0.12, 0.16, 0.04);
  ctx.fill();
  outline(ctx, 0.03);
}

function vial(ctx: Ctx, color: string, glow: string): void {
  roundRectPath(ctx, -0.1, -0.46, 0.2, 0.14, 0.04);
  ctx.fillStyle = '#8a6a44';
  ctx.fill();
  outline(ctx, 0.04);
  ctx.beginPath();
  ctx.moveTo(-0.08, -0.34);
  ctx.lineTo(-0.08, -0.18);
  ctx.bezierCurveTo(-0.36, -0.02, -0.34, 0.4, 0, 0.42);
  ctx.bezierCurveTo(0.34, 0.4, 0.36, -0.02, 0.08, -0.18);
  ctx.lineTo(0.08, -0.34);
  ctx.closePath();
  ctx.fillStyle = 'rgba(210,230,255,0.35)';
  ctx.fill();
  outline(ctx, 0.045);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = vGrad(ctx, -0.05, 0.42, glow, color);
  ctx.fillRect(-0.4, -0.05, 0.8, 0.5);
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ellipse(ctx, -0.12, 0.06, 0.03, 0.11, 0.3);
  ctx.fill();
}

function jar(ctx: Ctx): void {
  roundRectPath(ctx, -0.3, -0.18, 0.6, 0.58, 0.12);
  ctx.fillStyle = vGrad(ctx, -0.18, 0.4, '#8bb36a', '#4d7a3c');
  ctx.fill();
  outline(ctx, 0.05);
  roundRectPath(ctx, -0.34, -0.36, 0.68, 0.2, 0.07);
  ctx.fillStyle = '#b08a5a';
  ctx.fill();
  outline(ctx, 0.05);
  ctx.fillStyle = '#e8f1cf';
  roundRectPath(ctx, -0.16, 0.02, 0.32, 0.22, 0.04);
  ctx.fill();
  outline(ctx, 0.03);
  ctx.fillStyle = '#4d7a3c';
  circle(ctx, 0, 0.13, 0.06);
  ctx.fill();
}

function whip(ctx: Ctx): void {
  roundRectPath(ctx, -0.07, 0.04, 0.14, 0.4, 0.04);
  ctx.fillStyle = '#6a4326';
  ctx.fill();
  outline(ctx, 0.045);
  ctx.strokeStyle = '#aeb6c6';
  ctx.lineWidth = 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0.04);
  ctx.bezierCurveTo(-0.4, -0.05, -0.45, -0.45, -0.1, -0.34);
  ctx.bezierCurveTo(0.2, -0.26, 0.2, -0.06, 0.34, -0.3);
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.02;
  ctx.setLineDash([0.05, 0.05]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#c9ccd6';
  ctx.beginPath();
  ctx.moveTo(0.34, -0.3);
  ctx.lineTo(0.44, -0.42);
  ctx.lineTo(0.4, -0.22);
  ctx.fill();
}

function spear(ctx: Ctx): void {
  ctx.save();
  ctx.rotate(0.55);
  ctx.strokeStyle = '#8a9a52';
  ctx.lineWidth = 0.08;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0.5);
  ctx.lineTo(0, -0.3);
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.015;
  for (const y of [0.3, 0.05, -0.2]) {
    ctx.beginPath();
    ctx.moveTo(-0.045, y);
    ctx.lineTo(0.045, y);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, -0.52);
  ctx.quadraticCurveTo(0.13, -0.34, 0.05, -0.26);
  ctx.lineTo(-0.05, -0.26);
  ctx.quadraticCurveTo(-0.13, -0.34, 0, -0.52);
  ctx.fillStyle = vGrad(ctx, -0.52, -0.26, '#f0f3fa', '#8089a0');
  ctx.fill();
  outline(ctx, 0.04);
  ctx.fillStyle = '#d0485a';
  ctx.fillRect(-0.06, -0.26, 0.12, 0.06);
  ctx.restore();
}

function armor(ctx: Ctx, c0: string, c1: string, plates: 'cloth' | 'mail' | 'slate'): void {
  ctx.beginPath();
  ctx.moveTo(-0.14, -0.4);
  ctx.lineTo(-0.44, -0.24);
  ctx.lineTo(-0.36, -0.02);
  ctx.lineTo(-0.24, -0.06);
  ctx.lineTo(-0.24, 0.42);
  ctx.lineTo(0.24, 0.42);
  ctx.lineTo(0.24, -0.06);
  ctx.lineTo(0.36, -0.02);
  ctx.lineTo(0.44, -0.24);
  ctx.lineTo(0.14, -0.4);
  ctx.quadraticCurveTo(0, -0.28, -0.14, -0.4);
  ctx.closePath();
  ctx.fillStyle = vGrad(ctx, -0.4, 0.42, c0, c1);
  ctx.fill();
  outline(ctx, 0.05);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 0.025;
  if (plates === 'cloth') {
    for (const x of [-0.1, 0.1]) {
      ctx.beginPath();
      ctx.moveTo(x, -0.2);
      ctx.lineTo(x, 0.4);
      ctx.stroke();
    }
  } else if (plates === 'mail') {
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 3; c++) {
        ctx.beginPath();
        ctx.arc(-0.14 + c * 0.14 + (r % 2) * 0.07, -0.08 + r * 0.12, 0.07, 0, Math.PI);
        ctx.stroke();
      }
  } else {
    for (let r = 0; r < 3; r++) {
      ctx.beginPath();
      ctx.moveTo(-0.24, -0.02 + r * 0.15);
      ctx.lineTo(0.24, -0.02 + r * 0.15);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.moveTo(-0.2, -0.04);
    ctx.lineTo(-0.2, 0.36);
    ctx.stroke();
  }
}

function flame(ctx: Ctx, c0 = '#ffd36a', c1 = '#ff5a1f'): void {
  ctx.beginPath();
  ctx.moveTo(0, -0.48);
  ctx.bezierCurveTo(0.14, -0.26, 0.4, -0.12, 0.3, 0.2);
  ctx.bezierCurveTo(0.24, 0.42, -0.24, 0.42, -0.3, 0.2);
  ctx.bezierCurveTo(-0.36, -0.02, -0.08, -0.1, -0.1, -0.3);
  ctx.bezierCurveTo(-0.04, -0.26, 0, -0.38, 0, -0.48);
  ctx.closePath();
  ctx.fillStyle = vGrad(ctx, -0.48, 0.42, c0, c1);
  ctx.fill();
  outline(ctx, 0.045);
  ctx.beginPath();
  ctx.moveTo(0, -0.04);
  ctx.bezierCurveTo(0.1, 0.06, 0.14, 0.16, 0.08, 0.26);
  ctx.bezierCurveTo(0.04, 0.34, -0.1, 0.32, -0.1, 0.2);
  ctx.bezierCurveTo(-0.1, 0.08, -0.02, 0.04, 0, -0.04);
  ctx.fillStyle = 'rgba(255,255,230,0.85)';
  ctx.fill();
}

function wave(ctx: Ctx): void {
  ctx.lineCap = 'round';
  for (const [y, w, c] of [
    [-0.18, 0.1, '#2f6fd6'],
    [0.04, 0.1, '#4a93f0'],
    [0.26, 0.1, '#8cc4ff'],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(-0.42, y);
    ctx.bezierCurveTo(-0.28, y - 0.2, -0.14, y - 0.2, 0, y);
    ctx.bezierCurveTo(0.14, y + 0.2, 0.28, y + 0.2, 0.42, y);
    ctx.strokeStyle = INK;
    ctx.lineWidth = w + 0.06;
    ctx.stroke();
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    ctx.stroke();
  }
}

function gust(ctx: Ctx): void {
  ctx.lineCap = 'round';
  const swirl = (y: number, len: number, curl: number): void => {
    ctx.beginPath();
    ctx.moveTo(-0.44, y);
    ctx.lineTo(len, y);
    ctx.bezierCurveTo(len + curl, y, len + curl, y - curl * 1.4, len - 0.02, y - curl * 1.3);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.12;
    ctx.stroke();
    ctx.strokeStyle = '#d9f2e2';
    ctx.lineWidth = 0.07;
    ctx.stroke();
  };
  swirl(-0.2, 0.2, 0.18);
  swirl(0.04, 0.36, 0.14);
  swirl(0.26, 0.1, 0.12);
}

function rock(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(-0.4, 0.3);
  ctx.lineTo(-0.34, -0.1);
  ctx.lineTo(-0.1, -0.4);
  ctx.lineTo(0.22, -0.32);
  ctx.lineTo(0.42, 0.02);
  ctx.lineTo(0.36, 0.3);
  ctx.closePath();
  ctx.fillStyle = vGrad(ctx, -0.4, 0.3, '#b9ad8f', '#6a6048');
  ctx.fill();
  outline(ctx, 0.05);
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 0.03;
  ctx.beginPath();
  ctx.moveTo(-0.1, -0.4);
  ctx.lineTo(-0.02, -0.02);
  ctx.lineTo(0.2, 0.12);
  ctx.moveTo(-0.02, -0.02);
  ctx.lineTo(-0.18, 0.2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.moveTo(-0.3, -0.08);
  ctx.lineTo(-0.1, -0.34);
  ctx.lineTo(-0.1, -0.1);
  ctx.fill();
}

function bolt(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(0.1, -0.48);
  ctx.lineTo(-0.28, 0.06);
  ctx.lineTo(-0.04, 0.06);
  ctx.lineTo(-0.14, 0.48);
  ctx.lineTo(0.3, -0.12);
  ctx.lineTo(0.04, -0.12);
  ctx.closePath();
  ctx.fillStyle = vGrad(ctx, -0.48, 0.48, '#fff6a8', '#f2b705');
  ctx.fill();
  outline(ctx, 0.05);
}

function stars(ctx: Ctx): void {
  for (const [x, y, r] of [
    [-0.18, 0.08, 0.2],
    [0.2, -0.12, 0.17],
    [0.12, 0.3, 0.12],
  ] as const) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = '#ffe14a';
    ctx.fill();
    outline(ctx, 0.04);
  }
}

function shield(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(0, -0.46);
  ctx.bezierCurveTo(0.2, -0.36, 0.34, -0.36, 0.4, -0.34);
  ctx.bezierCurveTo(0.42, 0.1, 0.24, 0.34, 0, 0.48);
  ctx.bezierCurveTo(-0.24, 0.34, -0.42, 0.1, -0.4, -0.34);
  ctx.bezierCurveTo(-0.34, -0.36, -0.2, -0.36, 0, -0.46);
  ctx.fillStyle = vGrad(ctx, -0.46, 0.48, '#9fd0ff', '#3f78d0');
  ctx.fill();
  outline(ctx, 0.05);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 0.03;
  ctx.beginPath();
  ctx.moveTo(0, -0.34);
  ctx.lineTo(0, 0.36);
  ctx.moveTo(-0.28, -0.08);
  ctx.lineTo(0.28, -0.08);
  ctx.stroke();
}

function heart(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(0, 0.4);
  ctx.bezierCurveTo(-0.55, 0.0, -0.4, -0.42, -0.02, -0.2);
  ctx.bezierCurveTo(0.4, -0.42, 0.55, 0.0, 0, 0.4);
  ctx.fillStyle = vGrad(ctx, -0.35, 0.4, '#ff6b7a', '#c4283c');
  ctx.fill();
  outline(ctx, 0.05);
}

function kiro(ctx: Ctx): void {
  ctx.fillStyle = radial(ctx, 0, 0, 0.02, 0.48, 'rgba(160,200,255,0.9)', 'rgba(70,120,240,0)');
  circle(ctx, 0, 0, 0.48);
  ctx.fill();
  ctx.strokeStyle = '#cfe2ff';
  ctx.lineWidth = 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i <= 22; i++) {
    const a = i * 0.4;
    const r = 0.02 + i * 0.016;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.stroke();
}

const ICONS: Record<string, (ctx: Ctx) => void> = {
  shuriken,
  kunai_arrojadizo: kunai,
  senbon,
  tonico_kiro: (c) => vial(c, '#2f6fd6', '#9fd0ff'),
  unguento_musgo: jar,
  tanto_gastado: (c) => blade(c, 0.4, 0.07, '#c9cfdb', '#7a8296'),
  kunai_de_hierro: (c) => blade(c, 0.46, 0.085, '#e4e8f2', '#8a92a6', '#3d3f52'),
  hoja_afilada: (c) => blade(c, 0.58, 0.075, '#f5f8ff', '#97a0b8'),
  hoja_de_ceniza: (c) => blade(c, 0.58, 0.085, '#8a7d9a', '#2e2438', '#2a2230'),
  latigo_de_cadena: whip,
  lanza_de_bambu: spear,
  chaleco_acolchado: (c) => armor(c, '#8d7ab0', '#52406f', 'cloth'),
  cota_de_laminas: (c) => armor(c, '#bcc4d4', '#69728a', 'mail'),
  coraza_de_pizarra: (c) => armor(c, '#8b95a8', '#3e485c', 'slate'),
  ascua: flame,
  marea: wave,
  vendaval: gust,
  piedra: rock,
  rayo: bolt,
  quemadura: flame,
  aturdido: stars,
  protegido: shield,
  hp: heart,
  kiro,
};

export const hasIcon = (id: string): boolean => Object.hasOwn(ICONS, id);

/** Dibuja el icono `id` centrado en (cx, cy) con `size` de lado (en las unidades del contexto). */
export function drawIcon(ctx: Ctx, id: string, cx: number, cy: number, size: number, rot = 0): void {
  const fn = Object.hasOwn(ICONS, id) ? ICONS[id] : undefined;
  if (!fn) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.scale(size, size);
  fn(ctx);
  ctx.restore();
}

const iconUrls = new Map<string, string>();
/** Icono como imagen (data URL) para el DOM. */
export function iconDataUrl(id: string, px = 64): string {
  const key = `${id}|${px}`;
  const hit = iconUrls.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  drawIcon(ctx, id, px / 2, px / 2, px * 0.9);
  const url = c.toDataURL('image/png');
  iconUrls.set(key, url);
  return url;
}
