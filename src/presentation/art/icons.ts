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

function chest(ctx: Ctx): void {
  roundRectPath(ctx, -0.42, -0.02, 0.84, 0.44, 0.06);
  ctx.fillStyle = vGrad(ctx, -0.02, 0.42, '#9a6636', '#5f3a1a');
  ctx.fill();
  outline(ctx, 0.05);
  ctx.beginPath();
  ctx.moveTo(-0.42, 0.0);
  ctx.quadraticCurveTo(-0.42, -0.36, 0, -0.36);
  ctx.quadraticCurveTo(0.42, -0.36, 0.42, 0.0);
  ctx.closePath();
  ctx.fillStyle = vGrad(ctx, -0.36, 0, '#c58a4c', '#8a5a2e');
  ctx.fill();
  outline(ctx, 0.05);
  ctx.fillStyle = '#e6b84a';
  roundRectPath(ctx, -0.07, -0.06, 0.14, 0.2, 0.03);
  ctx.fill();
  outline(ctx, 0.035);
}

function coin(ctx: Ctx): void {
  // Moneda de bronce con agujero cuadrado (como las antiguas monedas de cuenta).
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ellipse(ctx, 0.03, 0.05, 0.4, 0.4);
  ctx.fill();
  circle(ctx, 0, 0, 0.4);
  ctx.fillStyle = vGrad(ctx, -0.4, 0.4, '#f6d675', '#a8741f');
  ctx.fill();
  outline(ctx, 0.05);
  circle(ctx, 0, 0, 0.29);
  ctx.strokeStyle = 'rgba(120,70,10,0.7)';
  ctx.lineWidth = 0.035;
  ctx.stroke();
  ctx.fillStyle = '#2a1a0a';
  ctx.fillRect(-0.075, -0.075, 0.15, 0.15);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(-0.12, -0.14, 0.2, Math.PI * 1.05, Math.PI * 1.5);
  ctx.lineWidth = 0.04;
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.stroke();
}

function shard(ctx: Ctx): void {
  // Esquirla de bronce vivo: cristal irregular con brillo cálido.
  ctx.fillStyle = radial(ctx, 0, 0, 0.02, 0.5, 'rgba(255,190,90,0.5)', 'rgba(255,150,40,0)');
  circle(ctx, 0, 0, 0.5);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-0.05, -0.42);
  ctx.lineTo(0.2, -0.08);
  ctx.lineTo(0.12, 0.4);
  ctx.lineTo(-0.16, 0.3);
  ctx.lineTo(-0.28, -0.04);
  ctx.closePath();
  ctx.fillStyle = vGrad(ctx, -0.42, 0.4, '#ffd88a', '#b4651c');
  ctx.fill();
  outline(ctx, 0.05);
  ctx.beginPath();
  ctx.moveTo(-0.05, -0.42);
  ctx.lineTo(0.0, 0.1);
  ctx.lineTo(0.12, 0.4);
  ctx.moveTo(0.0, 0.1);
  ctx.lineTo(-0.28, -0.04);
  ctx.strokeStyle = 'rgba(255,240,200,0.55)';
  ctx.lineWidth = 0.03;
  ctx.stroke();
}

function key(ctx: Ctx, head: string, shaft: string, glow: string): void {
  ctx.fillStyle = radial(ctx, 0, 0, 0.02, 0.52, glow, 'rgba(255,255,255,0)');
  circle(ctx, 0, 0, 0.52);
  ctx.fill();
  ctx.save();
  ctx.rotate(-0.6);
  // Caña y dientes.
  ctx.fillStyle = vGrad(ctx, -0.04, 0.04, shaft, '#3a3f4c');
  roundRectPath(ctx, -0.06, -0.04, 0.5, 0.08, 0.025);
  ctx.fill();
  outline(ctx, 0.035);
  ctx.fillStyle = shaft;
  ctx.fillRect(0.28, 0.03, 0.06, 0.13);
  ctx.fillRect(0.38, 0.03, 0.06, 0.1);
  outline(ctx, 0.03);
  // Aro.
  circle(ctx, -0.18, 0, 0.17);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.11;
  ctx.stroke();
  ctx.strokeStyle = head;
  ctx.lineWidth = 0.07;
  ctx.stroke();
  ctx.restore();
}

function anvil(ctx: Ctx): void {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ellipse(ctx, 0, 0.38, 0.38, 0.07);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-0.44, -0.18);
  ctx.lineTo(0.3, -0.18);
  ctx.quadraticCurveTo(0.46, -0.16, 0.5, -0.06);
  ctx.lineTo(0.2, -0.02);
  ctx.lineTo(0.12, 0.12);
  ctx.lineTo(0.22, 0.36);
  ctx.lineTo(-0.22, 0.36);
  ctx.lineTo(-0.12, 0.12);
  ctx.lineTo(-0.2, -0.02);
  ctx.lineTo(-0.44, -0.06);
  ctx.closePath();
  ctx.fillStyle = vGrad(ctx, -0.18, 0.36, '#8f98ab', '#3d4354');
  ctx.fill();
  outline(ctx, 0.05);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(-0.4, -0.16, 0.7, 0.03);
}

function arrowUp(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(0, -0.4);
  ctx.lineTo(0.3, -0.02);
  ctx.lineTo(0.12, -0.02);
  ctx.lineTo(0.12, 0.4);
  ctx.lineTo(-0.12, 0.4);
  ctx.lineTo(-0.12, -0.02);
  ctx.lineTo(-0.3, -0.02);
  ctx.closePath();
  ctx.fillStyle = vGrad(ctx, -0.4, 0.4, '#9cf0b4', '#2f9a58');
  ctx.fill();
  outline(ctx, 0.05);
}

function scroll(ctx: Ctx): void {
  roundRectPath(ctx, -0.3, -0.36, 0.6, 0.72, 0.06);
  ctx.fillStyle = vGrad(ctx, -0.36, 0.36, '#f1e3bd', '#cdb784');
  ctx.fill();
  outline(ctx, 0.05);
  ctx.strokeStyle = '#6a4a2a';
  ctx.lineWidth = 0.04;
  for (const y of [-0.18, -0.04, 0.1, 0.24]) {
    ctx.beginPath();
    ctx.moveTo(-0.18, y);
    ctx.lineTo(0.18, y);
    ctx.stroke();
  }
  for (const y of [-0.36, 0.36]) {
    roundRectPath(ctx, -0.36, y - 0.05, 0.72, 0.1, 0.05);
    ctx.fillStyle = '#8a5a2e';
    ctx.fill();
    outline(ctx, 0.035);
  }
}

function bellIcon(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(-0.1, -0.28);
  ctx.quadraticCurveTo(-0.16, -0.05, -0.28, 0.2);
  ctx.lineTo(0.28, 0.2);
  ctx.quadraticCurveTo(0.16, -0.05, 0.1, -0.28);
  ctx.closePath();
  ctx.fillStyle = vGrad(ctx, -0.28, 0.2, '#f2c474', '#8a5a1e');
  ctx.fill();
  outline(ctx, 0.05);
  circle(ctx, 0, 0.27, 0.06);
  ctx.fillStyle = '#5c3412';
  ctx.fill();
  outline(ctx, 0.03);
}

/** Sello antiguo: tres círculos y una campana partida. */
function ancientSeal(ctx: Ctx): void {
  roundRectPath(ctx, -0.34, -0.34, 0.68, 0.68, 0.14);
  ctx.fillStyle = vGrad(ctx, -0.34, 0.34, '#d8c7f5', '#6c4fa8');
  ctx.fill();
  outline(ctx, 0.05);
  ctx.strokeStyle = '#2a1850';
  ctx.lineWidth = 0.03;
  for (const [x, y] of [[0, -0.15], [-0.14, 0.04], [0.14, 0.04]] as const) {
    circle(ctx, x, y, 0.09);
    ctx.stroke();
  }
  ctx.fillStyle = '#2a1850';
  ctx.beginPath();
  ctx.moveTo(-0.1, 0.3);
  ctx.quadraticCurveTo(-0.08, 0.14, -0.02, 0.12);
  ctx.lineTo(0.0, 0.2);
  ctx.lineTo(0.03, 0.12);
  ctx.quadraticCurveTo(0.09, 0.14, 0.1, 0.3);
  ctx.closePath();
  ctx.fill();
}


// ---------- Pociones, pergaminos, manuales, estados y reliquias nuevas ----------

const POTION_COLORS: Record<string, [string, string]> = {
  sanacion: ['#d94a5a', '#ffc2c8'],
  kiro_mayor: ['#2f6fd6', '#9fd0ff'],
  sombra: ['#4a3a7a', '#a898d8'],
  regeneracion: ['#3f9a4a', '#b6f0b0'],
  piel_roca: ['#8a6a44', '#d6c0a0'],
  ojo_blanco: ['#cfd6e6', '#ffffff'],
  veneno: ['#4a7a24', '#b8e070'],
  niebla_oscura: ['#26222e', '#6a6478'],
  ignea: ['#e0561c', '#ffd070'],
  estridente: ['#e0c020', '#fff2a0'],
  fuerza: ['#c0402a', '#ffb09a'],
  levitacion: ['#7ad0e8', '#eafcff'],
};

const LOOK_COLORS: Record<string, [string, string]> = {
  turbia: ['#9c9468', '#d8d2a8'],
  ámbar: ['#d8901c', '#ffd98a'],
  carmesí: ['#b01838', '#ff8aa0'],
  jade: ['#1f9468', '#9cf0c8'],
  violeta: ['#7a38b8', '#d0a8f4'],
  marfil: ['#d8d0b4', '#fffaf0'],
  índigo: ['#2a3898', '#98a8f0'],
  ceniza: ['#767680', '#c8c8d0'],
  azafrán: ['#e8a410', '#fff0a0'],
  cobalto: ['#1858c8', '#8cbcff'],
  ébano: ['#1e1824', '#645a70'],
  coral: ['#f06a58', '#ffc0b4'],
  perla: ['#e6e0f0', '#ffffff'],
  ocre: ['#b8842c', '#f0d08a'],
};

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Puños: un guantelete cerrado, sin arma. */
function fist(ctx: Ctx): void {
  roundRectPath(ctx, -0.26, -0.2, 0.52, 0.42, 0.12);
  ctx.fillStyle = vGrad(ctx, -0.2, 0.22, '#f0cfa8', '#c79a72');
  ctx.fill();
  outline(ctx, 0.05);
  ctx.strokeStyle = '#8a5f3a';
  ctx.lineWidth = 0.035;
  for (const x of [-0.13, 0, 0.13]) {
    ctx.beginPath();
    ctx.moveTo(x, -0.2);
    ctx.lineTo(x, -0.04);
    ctx.stroke();
  }
  roundRectPath(ctx, -0.2, 0.22, 0.4, 0.12, 0.04);
  ctx.fillStyle = '#4a4a62';
  ctx.fill();
  outline(ctx, 0.04);
}

/** Pergamino cerrado con un sello de runa generado a partir de `seed` (cada aspecto lleva el suyo). */
function sealedScroll(ctx: Ctx, seed: string): void {
  const h = hashStr(seed);
  const hue = h % 360;
  roundRectPath(ctx, -0.3, -0.32, 0.6, 0.64, 0.06);
  ctx.fillStyle = vGrad(ctx, -0.32, 0.32, '#f1e3bd', '#cdb784');
  ctx.fill();
  outline(ctx, 0.05);
  for (const y of [-0.32, 0.32]) {
    roundRectPath(ctx, -0.36, y - 0.05, 0.72, 0.1, 0.05);
    ctx.fillStyle = '#8a5a2e';
    ctx.fill();
    outline(ctx, 0.035);
  }
  // Cinta con el color del aspecto.
  ctx.fillStyle = `hsl(${hue} 62% 48%)`;
  ctx.fillRect(-0.3, -0.05, 0.6, 0.1);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.03;
  ctx.strokeRect(-0.3, -0.05, 0.6, 0.1);
  // Runa: 4 trazos cuya posición sale del hash.
  ctx.strokeStyle = '#3a2410';
  ctx.lineWidth = 0.045;
  ctx.lineCap = 'round';
  let r = h;
  const next = (): number => {
    r = Math.imul(r ^ (r >>> 13), 1274126177) >>> 0;
    return (r % 1000) / 1000;
  };
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const x0 = -0.14 + next() * 0.28;
    const y0 = (i < 2 ? -0.27 : 0.09) + next() * 0.12;
    const x1 = -0.14 + next() * 0.28;
    const y1 = y0 + 0.05 + next() * 0.07;
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
  }
  ctx.stroke();
  // Sello de lacre.
  circle(ctx, 0, 0, 0.1);
  ctx.fillStyle = `hsl(${(hue + 180) % 360} 55% 38%)`;
  ctx.fill();
  outline(ctx, 0.03);
}

/** Libro de técnica. */
function manualBook(ctx: Ctx): void {
  roundRectPath(ctx, -0.28, -0.34, 0.56, 0.68, 0.05);
  ctx.fillStyle = vGrad(ctx, -0.34, 0.34, '#3f6a9a', '#1f3858');
  ctx.fill();
  outline(ctx, 0.05);
  ctx.fillStyle = '#f0dca0';
  ctx.fillRect(-0.2, -0.28, 0.44, 0.08);
  ctx.fillRect(-0.2, 0.2, 0.44, 0.08);
  ctx.strokeStyle = '#e6c96a';
  ctx.lineWidth = 0.04;
  circle(ctx, 0.02, 0, 0.1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0.02, -0.18);
  ctx.lineTo(0.02, 0.18);
  ctx.stroke();
}

function poisonDrop(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(0, -0.42);
  ctx.bezierCurveTo(0.34, 0.0, 0.3, 0.38, 0, 0.4);
  ctx.bezierCurveTo(-0.3, 0.38, -0.34, 0.0, 0, -0.42);
  ctx.fillStyle = vGrad(ctx, -0.42, 0.4, '#b8e070', '#3f7a1c');
  ctx.fill();
  outline(ctx, 0.05);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ellipse(ctx, -0.1, 0.05, 0.04, 0.1, 0.3);
  ctx.fill();
}

function snail(ctx: Ctx): void {
  circle(ctx, -0.04, -0.02, 0.26);
  ctx.fillStyle = vGrad(ctx, -0.28, 0.24, '#e6b878', '#9a6a30');
  ctx.fill();
  outline(ctx, 0.05);
  ctx.strokeStyle = '#5a3a14';
  ctx.lineWidth = 0.04;
  ctx.beginPath();
  ctx.arc(-0.04, -0.02, 0.13, 0, Math.PI * 1.6);
  ctx.stroke();
  roundRectPath(ctx, -0.36, 0.2, 0.74, 0.14, 0.07);
  ctx.fillStyle = '#9ab0c8';
  ctx.fill();
  outline(ctx, 0.04);
}

function bindKnot(ctx: Ctx): void {
  ctx.strokeStyle = '#c8a460';
  ctx.lineWidth = 0.1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-0.34, -0.2);
  ctx.bezierCurveTo(0.2, -0.4, 0.4, 0.1, -0.1, 0.12);
  ctx.bezierCurveTo(-0.4, 0.14, -0.1, 0.42, 0.34, 0.24);
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.025;
  ctx.stroke();
}

function crackedShield(ctx: Ctx): void {
  shield(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.06;
  ctx.beginPath();
  ctx.moveTo(0.02, -0.34);
  ctx.lineTo(-0.08, -0.08);
  ctx.lineTo(0.08, 0.06);
  ctx.lineTo(-0.02, 0.34);
  ctx.stroke();
}

function mend(ctx: Ctx): void {
  heart(ctx);
  ctx.strokeStyle = '#d8ffd0';
  ctx.lineWidth = 0.07;
  ctx.beginPath();
  ctx.moveTo(0, -0.1);
  ctx.lineTo(0, 0.14);
  ctx.moveTo(-0.12, 0.02);
  ctx.lineTo(0.12, 0.02);
  ctx.stroke();
}

function empower(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(0, -0.42);
  ctx.lineTo(0.3, -0.04);
  ctx.lineTo(0.12, -0.04);
  ctx.lineTo(0.12, 0.4);
  ctx.lineTo(-0.12, 0.4);
  ctx.lineTo(-0.12, -0.04);
  ctx.lineTo(-0.3, -0.04);
  ctx.closePath();
  ctx.fillStyle = vGrad(ctx, -0.42, 0.4, '#ffd070', '#e0561c');
  ctx.fill();
  outline(ctx, 0.05);
}

function cloak(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(-0.34, 0.1);
  ctx.bezierCurveTo(-0.3, -0.32, 0.3, -0.32, 0.34, 0.1);
  ctx.bezierCurveTo(0.2, 0.4, -0.2, 0.4, -0.34, 0.1);
  ctx.fillStyle = 'rgba(160,150,210,0.55)';
  ctx.fill();
  ctx.setLineDash([0.06, 0.05]);
  outline(ctx, 0.045);
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ellipse(ctx, 0, 0.08, 0.13, 0.06);
  ctx.fill();
}

function darkEye(ctx: Ctx): void {
  ellipse(ctx, 0, 0, 0.38, 0.2);
  ctx.fillStyle = '#1a1624';
  ctx.fill();
  outline(ctx, 0.05);
  ctx.strokeStyle = '#8a82a8';
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  ctx.moveTo(-0.3, -0.3);
  ctx.lineTo(0.3, 0.3);
  ctx.stroke();
}

/** Levitación: una pluma que flota. */
function feather(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(-0.3, 0.3);
  ctx.bezierCurveTo(-0.34, -0.1, 0.0, -0.4, 0.34, -0.32);
  ctx.bezierCurveTo(0.32, 0.0, 0.1, 0.3, -0.3, 0.3);
  ctx.fillStyle = vGrad(ctx, -0.35, 0.3, '#eafcff', '#7ad0e8');
  ctx.fill();
  outline(ctx, 0.05);
  ctx.strokeStyle = '#3f7f98';
  ctx.lineWidth = 0.04;
  ctx.beginPath();
  ctx.moveTo(-0.3, 0.3);
  ctx.lineTo(0.2, -0.22);
  ctx.stroke();
}

/** Anillo: aro de oro con una gema. */
function ring(ctx: Ctx): void {
  ctx.beginPath();
  ctx.ellipse(0, 0.08, 0.26, 0.28, 0, 0, Math.PI * 2);
  ctx.strokeStyle = '#d9a441';
  ctx.lineWidth = 0.11;
  ctx.stroke();
  outline(ctx, 0.03);
  ctx.beginPath();
  ctx.moveTo(0, -0.34);
  ctx.lineTo(0.12, -0.2);
  ctx.lineTo(0, -0.08);
  ctx.lineTo(-0.12, -0.2);
  ctx.closePath();
  ctx.fillStyle = vGrad(ctx, -0.34, -0.08, '#9ff0ff', '#3aa0d8');
  ctx.fill();
  outline(ctx, 0.04);
}

/** Colgante: cadena y una piedra colgando. */
function pendant(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(-0.3, -0.34);
  ctx.quadraticCurveTo(0, 0.1, 0.3, -0.34);
  ctx.strokeStyle = '#d9a441';
  ctx.lineWidth = 0.06;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 0.0);
  ctx.lineTo(0.14, 0.18);
  ctx.lineTo(0, 0.38);
  ctx.lineTo(-0.14, 0.18);
  ctx.closePath();
  ctx.fillStyle = vGrad(ctx, 0, 0.38, '#ffb0e0', '#b04aa8');
  ctx.fill();
  outline(ctx, 0.045);
}

/** Buscar: una lupa. */
function magnifier(ctx: Ctx): void {
  ctx.beginPath();
  ctx.arc(-0.06, -0.06, 0.24, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(190,235,255,0.55)';
  ctx.fill();
  ctx.strokeStyle = '#d9a441';
  ctx.lineWidth = 0.075;
  ctx.stroke();
  outline(ctx, 0.03);
  ctx.beginPath();
  ctx.moveTo(0.12, 0.12);
  ctx.lineTo(0.34, 0.34);
  ctx.strokeStyle = '#7a5a34';
  ctx.lineWidth = 0.1;
  ctx.lineCap = 'round';
  ctx.stroke();
}

function brokenSpool(ctx: Ctx): void {
  roundRectPath(ctx, -0.12, -0.3, 0.24, 0.6, 0.04);
  ctx.fillStyle = '#9a8a76';
  ctx.fill();
  outline(ctx, 0.045);
  for (const y of [-0.34, 0.3]) {
    roundRectPath(ctx, -0.3, y, 0.6, 0.08, 0.04);
    ctx.fillStyle = '#6a5a48';
    ctx.fill();
    outline(ctx, 0.04);
  }
  ctx.strokeStyle = '#c8c4d8';
  ctx.lineWidth = 0.04;
  ctx.beginPath();
  ctx.moveTo(-0.1, -0.2);
  ctx.lineTo(0.1, -0.1);
  ctx.lineTo(-0.1, 0.0);
  ctx.lineTo(0.12, 0.12);
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  ctx.moveTo(-0.16, -0.06);
  ctx.lineTo(0.16, 0.06);
  ctx.stroke();
}

function mercantile(ctx: Ctx): void {
  circle(ctx, 0, 0, 0.3);
  ctx.fillStyle = vGrad(ctx, -0.3, 0.3, '#ffe08a', '#b8801e');
  ctx.fill();
  outline(ctx, 0.05);
  roundRectPath(ctx, -0.08, -0.08, 0.16, 0.16, 0.02);
  ctx.fillStyle = INK;
  ctx.fill();
}

/** Resuelve ids dinámicos: equipo con modificador, pociones/pergaminos y sus aspectos («look:Poción ámbar»). */
function resolveIcon(id: string): ((ctx: Ctx) => void) | undefined {
  if (Object.hasOwn(ICONS, id)) return ICONS[id];
  const base = id.split('~')[0];
  if (base !== id && Object.hasOwn(ICONS, base)) return ICONS[base];
  if (id.startsWith('manual')) return manualBook;
  if (id === 'pocion_azar') return (c) => vial(c, '#8a6aa8', '#e0d0f0');
  if (id === 'pergamino_azar') return (c) => sealedScroll(c, 'azar');
  if (id.startsWith('pocion:')) {
    const k = id.slice(7);
    const col = POTION_COLORS[k] ?? ['#8a6aa8', '#e0d0f0'];
    return (c) => vial(c, col[0], col[1]);
  }
  if (id.startsWith('pergamino:')) return (c) => sealedScroll(c, id);
  if (id.startsWith('look:')) {
    const label = id.slice(5);
    if (label.startsWith('Poción ')) {
      const col = LOOK_COLORS[label.slice(7)] ?? ['#8a6aa8', '#e0d0f0'];
      return (c) => vial(c, col[0], col[1]);
    }
    return (c) => sealedScroll(c, label);
  }
  return undefined;
}

const ICONS: Record<string, (ctx: Ctx) => void> = {
  campana: bellIcon,
  sello_antiguo: ancientSeal,
  moneda: coin,
  esquirla: shard,
  llave_hierro: (c) => key(c, '#c9ced9', '#aeb4c2', 'rgba(190,210,255,0.35)'),
  llave_laca: (c) => key(c, '#ff7a6a', '#e6b84a', 'rgba(255,120,100,0.35)'),
  forja: anvil,
  mejora: arrowUp,
  cofre: chest,
  pergamino: scroll,
  shuriken,
  kunai_arrojadizo: kunai,
  senbon,
  punos: fist,
  lupa: magnifier,
  anillo: ring,
  colgante: pendant,
  joya_azar: ring,
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
  veneno: poisonDrop,
  ralentizado: snail,
  atado: bindKnot,
  vulnerable: crackedShield,
  regeneracion: mend,
  potenciado: empower,
  sigilo: cloak,
  ceguera: darkEye,
  levitando: feather,
  carrete_roto: brokenSpool,
  mercader: mercantile,
};

export const hasIcon = (id: string): boolean => resolveIcon(id) !== undefined;

/** Dibuja el icono `id` centrado en (cx, cy) con `size` de lado (en las unidades del contexto). */
export function drawIcon(ctx: Ctx, id: string, cx: number, cy: number, size: number, rot = 0): void {
  const fn = resolveIcon(id);
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
