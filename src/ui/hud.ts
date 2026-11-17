import { AFFINITY_NAMES } from '../content/affinities';
import { getEquipment, getItem } from '../content/items';
import { getTechnique } from '../content/techniques';
import { xpToNext } from '../core/combat';
import type { TechniquePreview } from '../core/engine';
import type { GameState } from '../core/types';

const STATUS_NAMES: Record<string, string> = { quemadura: 'Quemadura', aturdido: 'Aturdido', protegido: 'Protegido' };
export const TECHNIQUE_KEYS = ['Z', 'X', 'C'] as const;
export const ITEM_SLOTS: readonly { key: string; itemId: string }[] = [
  { key: '1', itemId: 'tonico_kiro' },
  { key: '2', itemId: 'unguento_musgo' },
];

function el(id: string): HTMLElement {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Falta el elemento #${id} en index.html`);
  return node;
}

function lines(container: HTMLElement, texts: string[], tag: 'div' | 'p' = 'div'): void {
  container.replaceChildren(
    ...texts.map((t) => {
      const d = document.createElement(tag);
      d.textContent = t;
      return d;
    }),
  );
}

/** HUD en DOM: recursos, estados, acciones, minimapa, aviso de coste, registro y pantalla de resultado. */
export class Hud {
  update(state: GameState, targeting: { techniqueId: string; preview: TechniquePreview } | null): void {
    const p = state.player;
    el('hp-text').textContent = `${p.hp}/${p.maxHp}`;
    el('hp-fill').style.width = `${(p.hp / p.maxHp) * 100}%`;
    el('kiro-text').textContent = `${p.kiro}/${p.maxKiro}`;
    el('kiro-fill').style.width = `${(p.kiro / p.maxKiro) * 100}%`;
    const need = xpToNext(p.level);
    el('xp-text').textContent = `Nv ${p.level} · ${p.xp}/${need}`;
    el('xp-fill').style.width = `${(p.xp / need) * 100}%`;

    const weapon = getEquipment(p.equipment.weapon);
    const armor = getEquipment(p.equipment.armor);
    el('meta').textContent = [
      `Sector ${state.floor}/${state.maxFloor} · Turno ${state.turn} · ${AFFINITY_NAMES[p.affinity]}`,
      `Arma: ${weapon ? `${weapon.name} (+${weapon.bonus})` : '—'}`,
      `Vestimenta: ${armor ? `${armor.name} (+${armor.bonus})` : '—'}`,
      `Semilla ${state.seed}`,
    ].join('\n');
    el('statuses').textContent = p.statuses.map((s) => `${STATUS_NAMES[s.id] ?? s.id} (${s.turns})`).join(' · ');

    const out: string[] = [];
    if (targeting) {
      const def = getTechnique(targeting.techniqueId);
      const pv = targeting.preview;
      out.push(`Apuntando: ${def?.name ?? targeting.techniqueId}`);
      out.push(`Coste: ${pv.kiroCost} kiro · Casillas: ${pv.cells.length}`);
      out.push(pv.valid ? 'Enter: confirmar · Esc: cancelar' : `✗ ${pv.message ?? 'No válido'}`);
    } else {
      out.push('Flechas/WASD: mover o atacar · Espacio: esperar');
      out.push('E: interactuar (cofre, escalera)');
      p.techniques.slice(0, TECHNIQUE_KEYS.length).forEach((id, i) => {
        const d = getTechnique(id);
        if (d) out.push(`[${TECHNIQUE_KEYS[i]}] ${d.name} — ${d.kiroCost} kiro${p.kiro < d.kiroCost ? ' (sin kiro)' : ''}`);
      });
      for (const slot of ITEM_SLOTS) {
        const item = getItem(slot.itemId);
        out.push(`[${slot.key}] ${item?.name ?? slot.itemId} ×${p.inventory[slot.itemId] ?? 0}`);
      }
    }
    lines(el('actions'), out);

    const log = el('log');
    lines(log, state.log.slice(-14), 'p');
    log.scrollTop = log.scrollHeight;

    el('help').textContent = 'Rueda o +/−: zoom · R: nueva expedición';
    this.drawMinimap(state);

    const result = el('result');
    if (state.status === 'playing') {
      result.hidden = true;
    } else {
      result.hidden = false;
      el('result-title').textContent = state.status === 'won' ? 'Expedición completada' : 'Has caído';
      el('result-text').textContent = `Sector ${state.floor}/${state.maxFloor} · Nivel ${p.level} · Turnos: ${state.turn}`;
    }
  }

  notice(text: string): void {
    el('notice').textContent = text;
  }

  /** Minimapa de lo explorado: un bloque de color por casilla, ajustado al tamaño del mapa. */
  private drawMinimap(state: GameState): void {
    const canvas = el('minimap') as HTMLCanvasElement;
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
        const kind = map.tiles[i];
        ctx.fillStyle = kind === 'wall' ? '#25253a' : kind === 'exit' ? '#9b6bff' : '#5a5a7a';
        ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
      }
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ox + state.player.pos.x * scale - 1, oy + state.player.pos.y * scale - 1, scale + 2, scale + 2);
  }
}
