import { getItem } from '../content/items';
import { getTechnique } from '../content/techniques';
import type { TechniquePreview } from '../core/engine';
import type { GameState } from '../core/types';

const STATUS_NAMES: Record<string, string> = { quemadura: 'Quemadura' };

function el(id: string): HTMLElement {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Falta el elemento #${id} en index.html`);
  return node;
}

/** HUD en DOM: vida, kiro, estados, acciones, aviso de coste, registro y pantalla de resultado. */
export class Hud {
  update(state: GameState, targeting: { techniqueId: string; preview: TechniquePreview } | null): void {
    const p = state.player;
    el('hp-text').textContent = `${p.hp}/${p.maxHp}`;
    el('hp-fill').style.width = `${(p.hp / p.maxHp) * 100}%`;
    el('kiro-text').textContent = `${p.kiro}/${p.maxKiro}`;
    el('kiro-fill').style.width = `${(p.kiro / p.maxKiro) * 100}%`;
    el('meta').textContent = `Turno ${state.turn} · Afinidad: ${p.affinity} · Semilla ${state.seed}`;
    el('statuses').textContent = p.statuses.map((s) => `${STATUS_NAMES[s.id] ?? s.id} (${s.turns})`).join(' · ');

    const lines: string[] = [];
    if (targeting) {
      const def = getTechnique(targeting.techniqueId);
      const pv = targeting.preview;
      lines.push(`Apuntando: ${def?.name ?? targeting.techniqueId}`);
      lines.push(`Coste: ${pv.kiroCost} kiro · Casillas: ${pv.cells.length}`);
      lines.push(pv.valid ? 'Enter: confirmar · Esc: cancelar' : `✗ ${pv.message ?? 'No válido'}`);
    } else {
      lines.push('[Mover/Atacar] flechas o WASD');
      lines.push('[E] Inspeccionar/Interactuar · [Espacio] Esperar');
      const tech = p.techniques.map((id) => {
        const d = getTechnique(id);
        return d ? `${d.name} (${d.kiroCost} kiro)` : id;
      });
      lines.push(`[T] Técnica: ${tech.join(', ') || '—'}`);
      const items = Object.entries(p.inventory).map(([id, n]) => `${getItem(id)?.name ?? id} ×${n}`);
      lines.push(`[1] Tónico · [2] Ungüento — ${items.join(', ') || 'sin objetos'}`);
    }
    el('actions').replaceChildren(
      ...lines.map((t) => {
        const d = document.createElement('div');
        d.textContent = t;
        return d;
      }),
    );

    const log = el('log');
    log.replaceChildren(
      ...state.log.slice(-12).map((t) => {
        const d = document.createElement('p');
        d.textContent = t;
        return d;
      }),
    );
    log.scrollTop = log.scrollHeight;

    el('help').textContent = 'Rueda del ratón: zoom · R: nueva expedición';

    const result = el('result');
    if (state.status === 'playing') {
      result.hidden = true;
    } else {
      result.hidden = false;
      el('result-title').textContent = state.status === 'won' ? 'Expedición completada' : 'Has caído';
      el('result-text').textContent = `Turnos: ${state.turn} · Vida: ${state.player.hp}/${state.player.maxHp}`;
    }
  }

  notice(text: string): void {
    el('notice').textContent = text;
  }
}
