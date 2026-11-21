import { canSeeEntity, visibleCells } from '../core/sight';
import type { GameState } from '../core/types';

const COLORS: Record<string, string> = { wall: '#2a2a42', floor: '#6a6e88', exit: '#b48bff', bush: '#4f9a4a', door: '#b07a44', locked: '#d9a441', chasm: '#0a0716', thorns: '#9a7a3e', cracked: '#4b4b68', secret: '#2a2a42' };

/** Mapa de lo explorado: arbustos, puertas, cofres, escalera y enemigos a la vista. Ajusta la escala al lienzo. */
export function drawMinimap(canvas: HTMLCanvasElement, state: GameState): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { map } = state;
  const scale = Math.max(1, Math.floor(Math.min(canvas.width / map.width, canvas.height / map.height)));
  const ox = Math.floor((canvas.width - map.width * scale) / 2);
  const oy = Math.floor((canvas.height - map.height * scale) / 2);
  ctx.fillStyle = '#07070c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const i = y * map.width + x;
      if (!state.explored[i]) continue;
      ctx.fillStyle = COLORS[map.tiles[i]] ?? '#6a6e88';
      ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
    }
  }
  for (const n of state.npcs) {
    if (!state.explored[n.pos.y * map.width + n.pos.x]) continue;
    ctx.fillStyle = n.kind === 'mesa_forja' ? '#ff9a4a' : n.kind === 'mercader' ? '#ffe36a' : '#8fe3ff';
    ctx.fillRect(ox + n.pos.x * scale, oy + n.pos.y * scale, scale, scale);
  }
  for (const c of state.chests) {
    if (!state.explored[c.pos.y * map.width + c.pos.x]) continue;
    ctx.fillStyle = c.opened ? '#6b5a2a' : c.locked ? '#ff6b6b' : '#ffd166';
    ctx.fillRect(ox + c.pos.x * scale, oy + c.pos.y * scale, scale, scale);
  }
  for (const d of state.drops) {
    if (d.itemId !== 'llave_hierro' && d.itemId !== 'llave_laca' && !d.known) continue;
    if (!state.explored[d.pos.y * map.width + d.pos.x]) continue;
    ctx.fillStyle = d.itemId === 'llave_laca' ? '#ff9ad0' : d.known ? '#7dffb0' : '#ffffff';
    ctx.fillRect(ox + d.pos.x * scale - 1, oy + d.pos.y * scale - 1, scale + 2, scale + 2);
  }
  const vis = visibleCells(state);
  ctx.fillStyle = '#ff5a5a';
  for (const e of state.enemies) {
    if (!canSeeEntity(state, vis, e.pos)) continue;
    ctx.fillRect(ox + e.pos.x * scale - 1, oy + e.pos.y * scale - 1, scale + 2, scale + 2);
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(ox + state.player.pos.x * scale - 1, oy + state.player.pos.y * scale - 1, scale + 2, scale + 2);
}
