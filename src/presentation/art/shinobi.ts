import { type Ctx, INK, circle, ellipse, radial, roundRectPath, vGrad } from './draw';

/**
 * Figura de shinobi enemigo parametrizable (túnica, tocado, arma, aura). Mira hacia la derecha (el llamador voltea con scale(-1,1)).
 * Todos los shinobi comparten esqueleto para que se lean como "de la misma especie" pero cada uno tiene su silueta.
 */
export type HeadStyle = 'hood' | 'hat' | 'bandana' | 'spiky' | 'long' | 'bald' | 'eboshi';
export type HeldWeapon = 'none' | 'kunai' | 'sword' | 'staff' | 'fan' | 'thread' | 'scroll' | 'blowgun' | 'bellstaff';

export interface ShinobiStyle {
  robe: [string, string];
  trim: string;
  head: HeadStyle;
  hair?: string;
  /** Color del tocado (capucha, sombrero, banda). */
  gear?: string;
  /** Mascarilla sobre la mitad inferior del rostro. */
  mask?: string;
  weapon: HeldWeapon;
  /** Color del brillo del arma y del aura al cargar (y aura permanente en jefes). */
  glow?: string;
  aura?: boolean;
  scale?: number;
  alpha?: number;
  /** Bufanda o capa que ondea. */
  scarf?: string;
}

export interface ShinobiPose {
  t: number;
  walk: number;
  phase: number;
  charging?: boolean;
  bossPhase?: number;
}

const SKIN = '#e9c39b';

const outline = (ctx: Ctx, w = 0.045): void => {
  ctx.strokeStyle = INK;
  ctx.lineWidth = w;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
};

export function drawShinobiFigure(ctx: Ctx, pose: ShinobiPose, st: ShinobiStyle): void {
  const { t, walk, phase, charging } = pose;
  const k = st.scale ?? 1;
  const glow = st.glow ?? '#ffd36a';
  ctx.save();
  if (st.alpha !== undefined) ctx.globalAlpha *= st.alpha;
  ctx.translate(0, 0.34 * (1 - k));
  ctx.scale(k, k);

  // Sombra y aura.
  ctx.fillStyle = 'rgba(6,4,12,0.4)';
  ellipse(ctx, 0, 0.35, 0.27, 0.08);
  ctx.fill();
  if (st.aura || charging) {
    const pulse = 0.5 + 0.5 * Math.sin(t * (charging ? 9 : 2.4));
    const a = (charging ? 0.5 : 0.22) * (0.6 + pulse * 0.4) * (st.aura ? 1 : 0.8);
    ctx.fillStyle = radial(ctx, 0, 0, 0.05, 0.6, hexA(glow, a), hexA(glow, 0));
    circle(ctx, 0, 0, 0.6);
    ctx.fill();
  }

  const bob = Math.sin(t * 2.6) * 0.012 * (1 - walk) - Math.abs(Math.sin(phase)) * 0.045 * walk;
  ctx.save();
  ctx.translate(charging ? Math.sin(t * 40) * 0.008 : 0, bob);

  // Bufanda / capa detrás.
  if (st.scarf) {
    const w1 = Math.sin(t * 3.4) * 0.04;
    ctx.beginPath();
    ctx.moveTo(-0.06, -0.1);
    ctx.quadraticCurveTo(-0.26, -0.1 + w1, -0.36, 0.0 + w1 * 2);
    ctx.quadraticCurveTo(-0.26, 0.04, -0.06, 0.02);
    ctx.closePath();
    ctx.fillStyle = st.scarf;
    ctx.fill();
    outline(ctx, 0.035);
  }

  // Piernas y pies.
  const step = Math.sin(phase) * 0.05 * walk;
  ctx.fillStyle = st.robe[1];
  for (const [x, dy] of [[-0.09, step], [0.09, -step]] as const) {
    roundRectPath(ctx, x - 0.06, 0.12 + dy, 0.12, 0.2, 0.04);
    ctx.fill();
    outline(ctx, 0.035);
  }
  ctx.fillStyle = '#2a2230';
  for (const [x, dy] of [[-0.09, step], [0.1, -step]] as const) {
    ellipse(ctx, x, 0.335 + dy * 0.2, 0.075, 0.035);
    ctx.fill();
  }

  // Túnica.
  ctx.beginPath();
  ctx.moveTo(-0.17, -0.06);
  ctx.quadraticCurveTo(0, -0.1, 0.17, -0.06);
  ctx.lineTo(0.22, 0.22);
  ctx.quadraticCurveTo(0, 0.28, -0.22, 0.22);
  ctx.closePath();
  ctx.fillStyle = vGrad(ctx, -0.1, 0.28, st.robe[0], st.robe[1]);
  ctx.fill();
  outline(ctx, 0.05);
  // Cinturón y colgante.
  ctx.fillStyle = st.trim;
  ctx.fillRect(-0.19, 0.1, 0.38, 0.045);
  ctx.fillRect(0.04, 0.13, 0.05, 0.12);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 0.02;
  ctx.beginPath();
  ctx.moveTo(-0.06, -0.04);
  ctx.lineTo(-0.1, 0.1);
  ctx.moveTo(0.02, -0.05);
  ctx.lineTo(0.02, 0.1);
  ctx.stroke();

  // Brazo trasero.
  ctx.beginPath();
  ctx.moveTo(-0.15, -0.03);
  ctx.quadraticCurveTo(-0.26, 0.06, -0.2, 0.16);
  ctx.lineTo(-0.13, 0.12);
  ctx.closePath();
  ctx.fillStyle = st.robe[1];
  ctx.fill();
  outline(ctx, 0.04);

  drawHeld(ctx, st.weapon, t, charging === true, glow, st);

  // Cabeza.
  drawHead(ctx, st, t);
  ctx.restore();
  ctx.restore();
}

function drawHeld(ctx: Ctx, w: HeldWeapon, t: number, charging: boolean, glow: string, st: ShinobiStyle): void {
  if (w === 'none') return;
  // Brazo delantero.
  ctx.beginPath();
  ctx.moveTo(0.12, -0.04);
  ctx.quadraticCurveTo(0.26, 0.0, 0.3, 0.1);
  ctx.lineTo(0.22, 0.14);
  ctx.quadraticCurveTo(0.18, 0.06, 0.1, 0.03);
  ctx.closePath();
  ctx.fillStyle = st.robe[0];
  ctx.fill();
  outline(ctx, 0.04);
  ctx.fillStyle = SKIN;
  circle(ctx, 0.28, 0.12, 0.04);
  ctx.fill();
  outline(ctx, 0.025);

  ctx.save();
  ctx.translate(0.28, 0.12);
  const lift = charging ? -0.5 + Math.sin(t * 12) * 0.05 : Math.sin(t * 2) * 0.03;
  ctx.rotate(lift);
  switch (w) {
    case 'kunai':
    case 'sword': {
      const len = w === 'sword' ? 0.46 : 0.26;
      roundRectPath(ctx, -0.02, -0.02, 0.04, 0.1, 0.015);
      ctx.fillStyle = '#4a2f1f';
      ctx.fill();
      outline(ctx, 0.02);
      ctx.beginPath();
      ctx.moveTo(-0.035, -0.02);
      ctx.lineTo(-0.025, -len);
      ctx.lineTo(0, -len - 0.05);
      ctx.lineTo(0.03, -len);
      ctx.lineTo(0.035, -0.02);
      ctx.closePath();
      ctx.fillStyle = charging ? vGrad(ctx, -len, 0, '#ffffff', glow) : vGrad(ctx, -len, 0, '#f5f8ff', '#97a0b8');
      ctx.fill();
      outline(ctx, 0.028);
      break;
    }
    case 'staff':
    case 'bellstaff': {
      ctx.strokeStyle = '#6a4a2a';
      ctx.lineWidth = 0.04;
      ctx.beginPath();
      ctx.moveTo(0, 0.2);
      ctx.lineTo(0, -0.5);
      ctx.stroke();
      outline(ctx, 0.01);
      if (w === 'bellstaff') {
        // Anillas colgantes de un shakujō.
        ctx.strokeStyle = '#d8c070';
        ctx.lineWidth = 0.025;
        ctx.beginPath();
        ctx.arc(0, -0.54, 0.075, 0, Math.PI * 2);
        ctx.stroke();
        for (const dx of [-0.08, 0.08]) {
          circle(ctx, dx, -0.46 + Math.sin(t * 5 + dx * 20) * 0.01, 0.03);
          ctx.fillStyle = '#e8d488';
          ctx.fill();
          outline(ctx, 0.015);
        }
      }
      break;
    }
    case 'fan': {
      ctx.fillStyle = '#c24a1d';
      ctx.beginPath();
      ctx.moveTo(0, 0.02);
      ctx.arc(0, 0.02, 0.26, -2.4, -0.7);
      ctx.closePath();
      ctx.fill();
      outline(ctx, 0.03);
      ctx.strokeStyle = glow;
      ctx.lineWidth = 0.02;
      for (const a of [-2.0, -1.55, -1.1]) {
        ctx.beginPath();
        ctx.moveTo(0, 0.02);
        ctx.lineTo(Math.cos(a) * 0.25, 0.02 + Math.sin(a) * 0.25);
        ctx.stroke();
      }
      break;
    }
    case 'scroll': {
      roundRectPath(ctx, -0.1, -0.08, 0.2, 0.15, 0.03);
      ctx.fillStyle = '#f3ead2';
      ctx.fill();
      outline(ctx, 0.025);
      ctx.fillStyle = '#b22a2a';
      ctx.fillRect(-0.1, -0.02, 0.2, 0.025);
      for (const x of [-0.1, 0.1]) {
        ellipse(ctx, x, -0.005, 0.02, 0.085);
        ctx.fillStyle = '#7a4a2a';
        ctx.fill();
      }
      break;
    }
    case 'thread': {
      ctx.strokeStyle = hexA(glow, 0.9);
      ctx.lineWidth = 0.012;
      ctx.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const a = -1.3 + i * 0.45 + Math.sin(t * 2 + i) * 0.05;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(Math.cos(a) * 0.2, Math.sin(a) * 0.2 - 0.04, Math.cos(a) * 0.46, Math.sin(a) * 0.46);
        ctx.stroke();
      }
      circle(ctx, 0, 0, 0.035);
      ctx.fillStyle = '#d9dde6';
      ctx.fill();
      outline(ctx, 0.02);
      break;
    }
    case 'blowgun': {
      ctx.rotate(-lift - 0.12);
      roundRectPath(ctx, -0.04, -0.025, 0.4, 0.05, 0.025);
      ctx.fillStyle = vGrad(ctx, -0.025, 0.025, '#b8d06a', '#6a8a30');
      ctx.fill();
      outline(ctx, 0.028);
      break;
    }
  }
  ctx.restore();
}

function drawHead(ctx: Ctx, st: ShinobiStyle, t: number): void {
  // Pelo largo detrás de la cabeza.
  if (st.head === 'long' || st.head === 'spiky') {
    ctx.fillStyle = st.hair ?? '#c9ccd6';
    if (st.head === 'long') {
      ctx.beginPath();
      ctx.moveTo(-0.11, -0.2);
      ctx.quadraticCurveTo(-0.24, -0.02 + Math.sin(t * 2) * 0.02, -0.2, 0.1);
      ctx.lineTo(-0.06, 0.0);
      ctx.closePath();
      ctx.fill();
      outline(ctx, 0.03);
    }
  }
  circle(ctx, 0.01, -0.12, 0.11);
  ctx.fillStyle = vGrad(ctx, -0.23, -0.01, SKIN, '#c99f74');
  ctx.fill();
  outline(ctx, 0.042);
  // Ojos.
  ctx.fillStyle = INK;
  for (const ex of [-0.01, 0.075]) {
    ellipse(ctx, ex, -0.115, 0.016, 0.024);
    ctx.fill();
  }
  if (st.mask) {
    ctx.beginPath();
    ctx.moveTo(-0.1, -0.1);
    ctx.quadraticCurveTo(0.02, -0.07, 0.12, -0.1);
    ctx.lineTo(0.1, -0.03);
    ctx.quadraticCurveTo(0.01, 0.0, -0.09, -0.03);
    ctx.closePath();
    ctx.fillStyle = st.mask;
    ctx.fill();
    outline(ctx, 0.03);
  }
  const gear = st.gear ?? '#2f3347';
  switch (st.head) {
    case 'hood':
      ctx.beginPath();
      ctx.moveTo(-0.14, -0.06);
      ctx.quadraticCurveTo(-0.17, -0.3, 0.02, -0.28);
      ctx.quadraticCurveTo(0.17, -0.27, 0.14, -0.06);
      ctx.quadraticCurveTo(0.12, -0.16, 0.0, -0.17);
      ctx.quadraticCurveTo(-0.1, -0.16, -0.14, -0.06);
      ctx.closePath();
      ctx.fillStyle = gear;
      ctx.fill();
      outline(ctx, 0.04);
      break;
    case 'hat':
      ctx.beginPath();
      ctx.moveTo(0.01, -0.4);
      ctx.lineTo(0.31, -0.15);
      ctx.quadraticCurveTo(0.01, -0.08, -0.29, -0.15);
      ctx.closePath();
      ctx.fillStyle = vGrad(ctx, -0.4, -0.1, gear, '#161420');
      ctx.fill();
      outline(ctx, 0.045);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 0.02;
      ctx.beginPath();
      ctx.moveTo(0.01, -0.4);
      ctx.lineTo(-0.12, -0.17);
      ctx.stroke();
      break;
    case 'eboshi':
      ctx.beginPath();
      ctx.moveTo(-0.1, -0.2);
      ctx.lineTo(-0.04, -0.42);
      ctx.lineTo(0.14, -0.36);
      ctx.lineTo(0.12, -0.2);
      ctx.closePath();
      ctx.fillStyle = gear;
      ctx.fill();
      outline(ctx, 0.04);
      break;
    case 'bandana':
      ctx.fillStyle = gear;
      ctx.fillRect(-0.11, -0.2, 0.24, 0.05);
      outline(ctx, 0.02);
      ctx.fillStyle = '#d6dbe8';
      ctx.fillRect(-0.04, -0.2, 0.1, 0.05);
      ctx.beginPath();
      ctx.moveTo(-0.11, -0.17);
      ctx.lineTo(-0.2, -0.12 + Math.sin(t * 4) * 0.02);
      ctx.lineTo(-0.1, -0.14);
      ctx.closePath();
      ctx.fillStyle = gear;
      ctx.fill();
      // pelo corto
      ctx.fillStyle = st.hair ?? '#2a2433';
      ctx.beginPath();
      ctx.moveTo(-0.11, -0.2);
      ctx.quadraticCurveTo(0.01, -0.34, 0.13, -0.2);
      ctx.closePath();
      ctx.fill();
      outline(ctx, 0.03);
      break;
    case 'spiky':
      ctx.fillStyle = st.hair ?? '#ffd24a';
      ctx.beginPath();
      ctx.moveTo(-0.12, -0.16);
      for (let i = 0; i < 6; i++) {
        const a = Math.PI + (i / 5) * Math.PI;
        ctx.lineTo(0.01 + Math.cos(a) * 0.16, -0.14 + Math.sin(a) * 0.2 - 0.04);
        ctx.lineTo(0.01 + Math.cos(a + 0.28) * 0.11, -0.14 + Math.sin(a + 0.28) * 0.12);
      }
      ctx.lineTo(0.13, -0.16);
      ctx.closePath();
      ctx.fill();
      outline(ctx, 0.04);
      break;
    case 'long':
      ctx.fillStyle = st.hair ?? '#c9ccd6';
      ctx.beginPath();
      ctx.moveTo(-0.12, -0.12);
      ctx.quadraticCurveTo(0.01, -0.36, 0.13, -0.12);
      ctx.quadraticCurveTo(0.04, -0.2, -0.03, -0.18);
      ctx.closePath();
      ctx.fill();
      outline(ctx, 0.035);
      break;
    case 'bald':
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 0.02;
      ctx.beginPath();
      ctx.arc(0.0, -0.15, 0.085, 3.6, 5.4);
      ctx.stroke();
      break;
  }
}

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ---------- Estilos por enemigo ----------

export const SHINOBI_STYLES: Record<string, ShinobiStyle> = {
  aprendiz_renegado: { robe: ['#8a6a4a', '#4a3524'], trim: '#c9a24a', head: 'bandana', gear: '#8b93a6', hair: '#3a2a22', weapon: 'kunai', scale: 0.92 },
  espadachin_de_laca: { robe: ['#a3263a', '#4a0f1a'], trim: '#e0b84a', head: 'hat', gear: '#26202e', weapon: 'sword', glow: '#ff9a7a' },
  rastreador_hilo_gris: { robe: ['#8b93a3', '#464c59'], trim: '#c9ced9', head: 'hood', gear: '#5c6371', mask: '#2f333d', weapon: 'thread', glow: '#dfe6f5', scarf: '#6d7482' },
  acolito_de_la_campana: { robe: ['#d3c3a3', '#85775b'], trim: '#a2382a', head: 'hood', gear: '#b8a784', mask: '#efe6d0', weapon: 'bellstaff', glow: '#ffe08a' },
  adepto_de_brasa: { robe: ['#b4481c', '#5a200c'], trim: '#ffcf6a', head: 'spiky', hair: '#ff7a2a', weapon: 'fan', glow: '#ffa24a', aura: false },
  envenenador_de_raiz: { robe: ['#5b8a55', '#27432b'], trim: '#a9d36a', head: 'hood', gear: '#365a3a', mask: '#20301f', weapon: 'blowgun', glow: '#9cff6a' },
  sellador_invocador: { robe: ['#ece6d6', '#a29984'], trim: '#b22a2a', head: 'eboshi', gear: '#2f2a3a', weapon: 'scroll', glow: '#e6b8ff' },
  maestro_del_trueno: { robe: ['#3f4f98', '#1b2250'], trim: '#ffd84a', head: 'spiky', hair: '#fff0a0', weapon: 'kunai', glow: '#fff07a', aura: true },
  clon_de_niebla: { robe: ['#9ab0c8', '#566678'], trim: '#c9d8ea', head: 'bandana', gear: '#8b9bb0', hair: '#4a5a6c', weapon: 'kunai', alpha: 0.6, scale: 0.9 },
  sokan_predicador: { robe: ['#6a3a82', '#2b1238'], trim: '#e0c46a', head: 'bald', mask: '#efe6d0', weapon: 'bellstaff', glow: '#c79cff', aura: true, scale: 1.3, scarf: '#4a2a5c' },
  yugiri_hilo_roto: { robe: ['#98a0b0', '#3f4452'], trim: '#e8ecf6', head: 'long', hair: '#d8dce8', mask: '#2a2e3a', weapon: 'thread', glow: '#7ae0d0', aura: true, scale: 1.25, scarf: '#5c6577' },
};

export function drawShinobiEnemy(ctx: Ctx, kind: string, pose: ShinobiPose): boolean {
  const st = SHINOBI_STYLES[kind];
  if (!st) return false;
  drawShinobiFigure(ctx, pose, st);
  return true;
}
