import { getNpc, isCaptiveKind } from '../content/story';
import { optionBlocker } from '../core/engine';
import type { GameState } from '../core/types';
import { iconDataUrl } from '../presentation/art/icons';

function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

/** Menú de decisión de un maestro o evento: cada opción muestra su coste y sus ganancias. */
export class ChoiceBox {
  private readonly root: HTMLElement;
  private npcId: string | null = null;
  private state: GameState | null = null;
  onChoose: (npcId: string, optionId: string) => void = () => undefined;

  constructor() {
    const root = document.getElementById('choice');
    if (!root) throw new Error('Falta el elemento #choice en index.html');
    this.root = root;
    root.addEventListener('click', (ev) => {
      if (ev.target === root) this.close();
    });
  }

  get isOpen(): boolean {
    return this.npcId !== null;
  }

  open(state: GameState, npcId: string): void {
    this.npcId = npcId;
    this.state = state;
    this.render();
  }

  close(): void {
    this.npcId = null;
    this.root.hidden = true;
  }

  refresh(state: GameState): void {
    this.state = state;
    if (this.isOpen) this.render();
  }

  onKey(key: string): boolean {
    if (!this.isOpen) return false;
    if (key === 'escape' || key === 'e') {
      this.close();
      return true;
    }
    const n = Number(key);
    if (Number.isInteger(n) && n >= 1) this.pick(n - 1);
    return true;
  }

  private pick(index: number): void {
    const s = this.state;
    const npc = s?.npcs.find((x) => x.id === this.npcId);
    const def = npc ? getNpc(npc.kind) : undefined;
    const opt = def?.options[index];
    if (!s || !npc || !opt || npc.used || optionBlocker(s, opt)) return;
    const id = npc.id;
    this.close();
    this.onChoose(id, opt.id);
  }

  private render(): void {
    const s = this.state;
    const npc = s?.npcs.find((x) => x.id === this.npcId);
    const def = npc ? getNpc(npc.kind) : undefined;
    if (!s || !npc || !def) {
      this.close();
      return;
    }
    const panel = h('div', 'choice-panel');
    const head = h('div', 'choice-head');
    const ico = h('img', 'ico');
    ico.src = iconDataUrl(npc.kind === 'altar_eco_roto' ? 'campana' : isCaptiveKind(npc.kind) ? npc.kind.slice('cautivo_'.length) : 'pergamino', 48);
    ico.alt = '';
    const t = h('div');
    t.append(h('b', undefined, def.name), h('span', 'muted', `${def.kindLabel} · elige una sola opción`));
    head.append(ico, t);
    const close = h('button', 'close', '✕');
    close.type = 'button';
    close.addEventListener('click', () => this.close());
    head.append(close);
    panel.append(head);

    const list = h('div', 'choice-list');
    def.options.forEach((opt, i) => {
      const blocker = npc.used ? 'Ya elegiste aquí.' : optionBlocker(s, opt);
      const b = h('button', 'choice-opt');
      b.type = 'button';
      b.disabled = !!blocker;
      b.append(h('kbd', undefined, String(i + 1)));
      const txt = h('span', 'txt');
      txt.append(h('b', undefined, opt.label), h('i', undefined, opt.description));
      if (blocker) txt.append(h('em', undefined, `✗ ${blocker}`));
      b.append(txt);
      b.addEventListener('click', () => this.pick(i));
      list.append(b);
    });
    panel.append(list, h('div', 'menu-foot', '1-4 o clic: elegir · Esc: cerrar sin elegir (puedes volver más tarde)'));
    this.root.replaceChildren(panel);
    this.root.hidden = false;
  }
}
