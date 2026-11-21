import type { Affinity } from '../../core/types';
import { isCaptiveKind } from '../../content/story';
import { HEROES } from '../../content/heroes';
import { drawNinja } from './actors';
import { drawNpc } from './bosses';
import { type Ctx, INK } from './draw';

/** Prisionero atado: el protagonista de otra casa con cuerdas cruzadas sobre el pecho y las manos a la espalda. */
export function drawCaptive(ctx: Ctx, affinity: Affinity, t: number, freed = false): void {
  drawNinja(ctx, { t: t * 0.5, walk: 0, phase: 0, dir: 'down', hero: HEROES[affinity] });
  if (freed) return;
  ctx.save();
  ctx.lineCap = 'round';
  for (const [x0, y0, x1, y1] of [
    [-0.2, -0.02, 0.2, 0.1],
    [-0.2, 0.1, 0.2, -0.02],
    [-0.19, 0.2, 0.19, 0.2],
  ] as const) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.075;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.strokeStyle = '#c9a56a';
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  ctx.restore();
}

/** Figura de un PNJ: los prisioneros se dibujan con el arte de los protagonistas; el resto, con el de siempre. */
export function drawNpcFigure(ctx: Ctx, kind: string, t: number, used: boolean): void {
  if (isCaptiveKind(kind)) drawCaptive(ctx, kind.slice('cautivo_'.length) as Affinity, t, used);
  else drawNpc(ctx, kind, t, used);
}
