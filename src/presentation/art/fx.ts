import type { Affinity, Vec } from '../../core/types';
import { type Ctx, INK, circle, ellipse, radial } from './draw';
import { drawIcon } from './icons';
import { clamp, easeOut, makeRand } from './noise';

/**
 * Efectos visuales efímeros (golpes, técnicas, proyectiles...). Se dibujan en unidades de casilla.
 * `p` es el progreso 0..1 del efecto; antes de `start` no se dibuja nada.
 */
export interface Fx {
  start: number;
  dur: number;
  draw(ctx: Ctx, p: number): void;
}

const c = (v: Vec): Vec => ({ x: v.x + 0.5, y: v.y + 0.5 });

const ELEMENT_COLORS: Record<Affinity, [string, string, string]> = {
  ascua: ['#fff1a8', '#ff9a2e', '#d6391a'],
  marea: ['#e6f6ff', '#6db8ff', '#2f6fd6'],
  vendaval: ['#ffffff', '#c9f2dc', '#6fc7a0'],
  piedra: ['#e8dcc0', '#b6a67f', '#6a5f45'],
  rayo: ['#ffffff', '#fff27a', '#f2b705'],
};

export function slashFx(start: number, at: Vec, dir: Vec, color = '#ffffff'): Fx {
  const p0 = c(at);
  const base = Math.atan2(dir.y, dir.x);
  return {
    start,
    dur: 0.26,
    draw(ctx, p) {
      const e = easeOut(clamp(p * 1.6, 0, 1));
      const a0 = base - 1.2;
      const a1 = a0 + 2.4 * e;
      ctx.save();
      ctx.translate(p0.x - dir.x * 0.28, p0.y - dir.y * 0.28);
      ctx.lineCap = 'round';
      for (const [w, col, al] of [
        [0.2, color, 0.25],
        [0.1, color, 0.85],
        [0.035, '#ffffff', 1],
      ] as const) {
        ctx.globalAlpha = al * (1 - p);
        ctx.strokeStyle = col;
        ctx.lineWidth = w * (1 - p * 0.5);
        ctx.beginPath();
        ctx.arc(0, 0, 0.5, Math.max(a0, a1 - 1.5), a1);
        ctx.stroke();
      }
      ctx.restore();
    },
  };
}

export function whipFx(start: number, from: Vec, to: Vec): Fx {
  const a = c(from);
  const b = c(to);
  return {
    start,
    dur: 0.3,
    draw(ctx, p) {
      const reach = easeOut(clamp(p * 2.2, 0, 1));
      const fade = 1 - clamp((p - 0.4) / 0.6, 0, 1);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const nx = -dy;
      const ny = dx;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const [w, col] of [
        [0.09, 'rgba(160,170,190,0.55)'],
        [0.035, '#f1f4fa'],
      ] as const) {
        ctx.strokeStyle = col;
        ctx.lineWidth = w;
        ctx.globalAlpha = fade;
        ctx.beginPath();
        for (let i = 0; i <= 14; i++) {
          const k = (i / 14) * reach;
          const wob = Math.sin(i * 1.3 + p * 14) * 0.12 * (1 - p) * Math.sin((i / 14) * Math.PI);
          const x = a.x + dx * k + nx * wob;
          const y = a.y + dy * k + ny * wob;
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
    },
  };
}

export function thrustFx(start: number, from: Vec, to: Vec): Fx {
  const a = c(from);
  const b = c(to);
  return {
    start,
    dur: 0.24,
    draw(ctx, p) {
      const e = easeOut(clamp(p * 2.4, 0, 1));
      const tail = clamp(p * 2.4 - 0.5, 0, 1);
      const x0 = a.x + (b.x - a.x) * tail;
      const y0 = a.y + (b.y - a.y) * tail;
      const x1 = a.x + (b.x - a.x) * e;
      const y1 = a.y + (b.y - a.y) * e;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.globalAlpha = 1 - clamp((p - 0.5) / 0.5, 0, 1);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 0.18;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.05;
      ctx.stroke();
      ctx.restore();
    },
  };
}

export function projectileFx(start: number, from: Vec, to: Vec, itemId: string, flight = 0.18): Fx {
  const a = c(from);
  const b = c(to);
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const dur = Math.max(0.12, flight * Math.min(2.2, 0.55 + dist * 0.3));
  return {
    start,
    dur,
    draw(ctx, p) {
      const x = a.x + (b.x - a.x) * p;
      const y = a.y + (b.y - a.y) * p - Math.sin(p * Math.PI) * 0.12;
      // Estela.
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 0.05;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(a.x + (b.x - a.x) * Math.max(0, p - 0.3), a.y + (b.y - a.y) * Math.max(0, p - 0.3));
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.restore();
      const spin = itemId === 'shuriken' ? p * 22 : Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2;
      drawIcon(ctx, itemId === 'dardo' ? 'senbon' : itemId, x, y, itemId === 'shuriken' ? 0.34 : 0.4, spin);
    },
  };
}

export function impactFx(start: number, at: Vec, color = '#ffffff', big = false): Fx {
  const p0 = c(at);
  const r = makeRand(Math.floor(at.x * 131 + at.y * 17 + start * 1000));
  const n = big ? 11 : 7;
  const rays = Array.from({ length: n }, (_, i) => ({ a: (i / n) * Math.PI * 2 + r() * 0.5, l: 0.22 + r() * 0.22 }));
  return {
    start,
    dur: 0.28,
    draw(ctx, p) {
      const e = easeOut(p);
      ctx.save();
      ctx.translate(p0.x, p0.y);
      ctx.globalAlpha = 1 - p;
      ctx.fillStyle = radial(ctx, 0, 0, 0, 0.36 * (0.5 + e), 'rgba(255,255,255,0.8)', 'rgba(255,255,255,0)');
      circle(ctx, 0, 0, 0.36 * (0.5 + e));
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.05;
      ctx.lineCap = 'round';
      for (const ray of rays) {
        ctx.beginPath();
        ctx.moveTo(Math.cos(ray.a) * ray.l * 0.4 * e, Math.sin(ray.a) * ray.l * 0.4 * e);
        ctx.lineTo(Math.cos(ray.a) * ray.l * (0.4 + e), Math.sin(ray.a) * ray.l * (0.4 + e));
        ctx.stroke();
      }
      ctx.restore();
    },
  };
}

export function puffFx(start: number, at: Vec, color = '#8c8aa0', n = 7, spread = 0.4): Fx {
  const p0 = c(at);
  const r = makeRand(Math.floor(at.x * 97 + at.y * 31 + start * 777));
  const parts = Array.from({ length: n }, () => ({ a: r() * Math.PI * 2, d: 0.1 + r() * spread, s: 0.07 + r() * 0.09 }));
  return {
    start,
    dur: 0.55,
    draw(ctx, p) {
      const e = easeOut(p);
      ctx.save();
      for (const q of parts) {
        ctx.globalAlpha = 0.55 * (1 - p);
        ctx.fillStyle = color;
        circle(ctx, p0.x + Math.cos(q.a) * q.d * e, p0.y + Math.sin(q.a) * q.d * e - e * 0.12, q.s * (0.6 + e));
        ctx.fill();
      }
      ctx.restore();
    },
  };
}

export function ringFx(start: number, at: Vec, color: string, maxR = 1.2, dur = 0.6): Fx {
  const p0 = c(at);
  return {
    start,
    dur,
    draw(ctx, p) {
      const e = easeOut(p);
      ctx.save();
      ctx.globalAlpha = (1 - p) * 0.9;
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.09 * (1 - p) + 0.01;
      ellipse(ctx, p0.x, p0.y, maxR * e, maxR * e * 0.7);
      ctx.stroke();
      ctx.restore();
    },
  };
}

export function sparkleFx(start: number, at: Vec, color = '#ffe08a', n = 12): Fx {
  const p0 = c(at);
  const r = makeRand(Math.floor(at.x * 53 + at.y * 71));
  const parts = Array.from({ length: n }, () => ({ a: r() * Math.PI * 2, d: 0.2 + r() * 0.5, s: 0.03 + r() * 0.04, w: r() * 6 }));
  return {
    start,
    dur: 0.9,
    draw(ctx, p) {
      const e = easeOut(p);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const q of parts) {
        const x = p0.x + Math.cos(q.a) * q.d * e;
        const y = p0.y + Math.sin(q.a) * q.d * e - e * 0.35;
        ctx.globalAlpha = (1 - p) * (0.6 + 0.4 * Math.sin(p * 18 + q.w));
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const rr = i % 2 ? q.s * 0.35 : q.s * 1.6;
          const ang = (i * Math.PI) / 4;
          ctx.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    },
  };
}

export function trailFx(start: number, from: Vec, to: Vec): Fx {
  const a = c(from);
  const b = c(to);
  return {
    start,
    dur: 0.4,
    draw(ctx, p) {
      ctx.save();
      ctx.globalAlpha = (1 - p) * 0.7;
      const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      g.addColorStop(0, 'rgba(200,245,225,0)');
      g.addColorStop(1, 'rgba(200,245,225,0.9)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 0.3 * (1 - p);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();
    },
  };
}

/** Efecto elemental sobre una casilla afectada por una técnica. */
export function elementFx(start: number, affinity: Affinity, at: Vec, along?: Vec): Fx {
  const p0 = c(at);
  const seed = Math.floor(at.x * 211 + at.y * 53 + start * 313);
  const [c0, c1] = ELEMENT_COLORS[affinity];
  const r = makeRand(seed);
  const bits = Array.from({ length: 9 }, () => ({ a: r() * Math.PI * 2, d: 0.1 + r() * 0.36, s: 0.025 + r() * 0.05, w: r() * 6 }));
  const bolt: Vec[] = [];
  {
    let x = (r() - 0.5) * 0.3;
    for (let i = 0; i <= 6; i++) {
      bolt.push({ x, y: -0.9 + i * 0.2 });
      x += (r() - 0.5) * 0.36;
    }
  }
  const dur = affinity === 'piedra' ? 0.6 : affinity === 'rayo' ? 0.34 : 0.55;
  return {
    start,
    dur,
    draw(ctx, p) {
      ctx.save();
      ctx.translate(p0.x, p0.y);
      const e = easeOut(p);
      if (affinity === 'ascua') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = (1 - p) * 0.95;
        ctx.fillStyle = radial(ctx, 0, 0, 0, 0.62, c0, 'rgba(255,90,20,0)');
        circle(ctx, 0, 0, 0.62 * (0.55 + e * 0.5));
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1 - p * p;
        drawIcon(ctx, 'ascua', 0, -0.05 - e * 0.1, 0.56 * (0.5 + Math.min(1, p * 3) * 0.5));
        for (const q of bits) {
          ctx.globalAlpha = (1 - p) * 0.9;
          ctx.fillStyle = q.w > 3 ? c0 : c1;
          circle(ctx, Math.cos(q.a) * q.d * e, Math.sin(q.a) * q.d * e - e * 0.4, q.s);
          ctx.fill();
        }
      } else if (affinity === 'marea') {
        ctx.globalAlpha = 0.85 * (1 - p);
        ctx.fillStyle = radial(ctx, 0, 0, 0.05, 0.5, 'rgba(120,190,255,0.5)', 'rgba(60,120,230,0)');
        circle(ctx, 0, 0, 0.5);
        ctx.fill();
        for (let i = 0; i < 2; i++) {
          const pp = clamp(p * 1.4 - i * 0.25, 0, 1);
          ctx.globalAlpha = (1 - pp) * 0.9;
          ctx.strokeStyle = i ? c1 : c0;
          ctx.lineWidth = 0.06 * (1 - pp) + 0.01;
          ellipse(ctx, 0, 0.05, 0.5 * easeOut(pp), 0.34 * easeOut(pp));
          ctx.stroke();
        }
        for (const q of bits) {
          const up = Math.sin(clamp(p * 1.2, 0, 1) * Math.PI);
          ctx.globalAlpha = (1 - p) * 0.9;
          ctx.fillStyle = q.w > 3 ? c0 : c1;
          ellipse(ctx, Math.cos(q.a) * q.d * 0.8, 0.1 - up * (0.2 + q.d), q.s * 0.7, q.s);
          ctx.fill();
        }
      } else if (affinity === 'vendaval') {
        ctx.lineCap = 'round';
        const ang = along ? Math.atan2(along.y, along.x) : 0;
        for (let i = 0; i < 3; i++) {
          const pp = clamp(p * 1.3 - i * 0.12, 0, 1);
          ctx.globalAlpha = (1 - pp) * 0.9;
          ctx.strokeStyle = i === 1 ? c1 : c0;
          ctx.lineWidth = 0.05;
          ctx.beginPath();
          ctx.arc(0, 0, 0.18 + i * 0.12, ang + pp * 5 + i, ang + pp * 5 + i + 2);
          ctx.stroke();
        }
        for (const q of bits.slice(0, 5)) {
          ctx.globalAlpha = (1 - p) * 0.8;
          ctx.fillStyle = c0;
          circle(ctx, Math.cos(q.a + p * 4) * q.d, Math.sin(q.a + p * 4) * q.d, q.s * 0.7);
          ctx.fill();
        }
      } else if (affinity === 'piedra') {
        ctx.globalAlpha = (1 - p) * 0.6;
        ctx.fillStyle = radial(ctx, 0, 0.1, 0.02, 0.5, 'rgba(190,175,140,0.7)', 'rgba(190,175,140,0)');
        circle(ctx, 0, 0.1, 0.5 * (0.6 + e * 0.5));
        ctx.fill();
        for (const q of bits.slice(0, 6)) {
          const h = Math.sin(clamp(p * 1.3, 0, 1) * Math.PI) * (0.25 + q.d * 0.5);
          ctx.globalAlpha = 1 - clamp((p - 0.6) / 0.4, 0, 1);
          ctx.save();
          ctx.translate(Math.cos(q.a) * q.d * 0.9, 0.12 + Math.sin(q.a) * q.d * 0.3 - h);
          ctx.rotate(q.a + p * 5);
          ctx.beginPath();
          ctx.moveTo(-q.s * 1.4, q.s);
          ctx.lineTo(-q.s * 0.4, -q.s * 1.4);
          ctx.lineTo(q.s * 1.5, -q.s * 0.2);
          ctx.lineTo(q.s * 0.7, q.s * 1.2);
          ctx.closePath();
          ctx.fillStyle = q.w > 3 ? c0 : c1;
          ctx.fill();
          ctx.strokeStyle = INK;
          ctx.lineWidth = 0.025;
          ctx.stroke();
          ctx.restore();
        }
      } else {
        // Rayo: descarga vertical y destello.
        ctx.globalCompositeOperation = 'lighter';
        const flash = p < 0.5 ? 1 - p * 2 : 0;
        ctx.globalAlpha = flash;
        ctx.fillStyle = radial(ctx, 0, 0, 0, 0.7, 'rgba(255,255,220,0.95)', 'rgba(255,230,80,0)');
        circle(ctx, 0, 0, 0.7);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
        ctx.lineJoin = 'round';
        for (const [w, col] of [
          [0.12, 'rgba(255,230,80,0.45)'],
          [0.05, c0],
        ] as const) {
          ctx.strokeStyle = col;
          ctx.lineWidth = w;
          ctx.beginPath();
          bolt.forEach((b, i) => (i ? ctx.lineTo(b.x, b.y) : ctx.moveTo(b.x, b.y)));
          ctx.stroke();
        }
      }
      ctx.restore();
    },
  };
}

/** Los enemigos al caer se desvanecen y se encogen en una nubecilla. */
export function deathFx(start: number, at: Vec, drawBody: (ctx: Ctx) => void): Fx {
  const p0 = c(at);
  return {
    start,
    dur: 0.5,
    draw(ctx, p) {
      ctx.save();
      ctx.translate(p0.x, p0.y);
      ctx.globalAlpha = 1 - p;
      const sc = 1 - p * 0.35;
      ctx.scale(sc * (1 + p * 0.2), sc);
      ctx.translate(0, -p * 0.1);
      drawBody(ctx);
      ctx.restore();
    },
  };
}
