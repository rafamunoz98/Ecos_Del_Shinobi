import { AFFINITY_BLURB, AFFINITY_NAMES } from '../content/affinities';
import { TECHNIQUES, techniquesFor } from '../content/techniques';
import type { Affinity, GameState } from '../core/types';
import { iconDataUrl } from '../presentation/art/icons';

function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

/**
 * Recompensa del primer jefe: elegir entre dos afinidades al azar. No se puede cerrar sin elegir (el motor no deja actuar
 * mientras haya oferta). Teclas 1-2 o clic.
 */
export class AffinityBox {
  private readonly root: HTMLElement;
  private options: Affinity[] = [];
  onChoose: (affinity: Affinity) => void = () => undefined;

  constructor() {
    const root = document.getElementById('affinity');
    if (!root) throw new Error('Falta el elemento #affinity en index.html');
    this.root = root;
  }

  get isOpen(): boolean {
    return this.options.length > 0;
  }

  /** Abre o cierra la ventana según el estado (hay oferta pendiente o no). */
  sync(state: GameState): void {
    const offer = state.affinityOffer ?? [];
    if (offer.length === 0) {
      if (this.isOpen) this.close();
      return;
    }
    if (!this.isOpen || offer.join() !== this.options.join()) {
      this.options = [...offer];
      this.render();
    }
  }

  close(): void {
    this.options = [];
    this.root.hidden = true;
  }

  onKey(key: string): boolean {
    if (!this.isOpen) return false;
    const n = Number(key);
    if (Number.isInteger(n) && n >= 1 && n <= this.options.length) this.pick(n - 1);
    return true;
  }

  private pick(i: number): void {
    const a = this.options[i];
    if (!a) return;
    this.close();
    this.onChoose(a);
  }

  private render(): void {
    const panel = h('div', 'choice-panel');
    const head = h('div', 'choice-head');
    const t = h('div');
    t.append(h('b', undefined, 'Una afinidad nueva'), h('span', 'muted', 'El jefe caído te deja aprender una segunda afinidad. Elige una de las dos.'));
    head.append(t);
    panel.append(head);
    const list = h('div', 'choice-list');
    this.options.forEach((a, i) => {
      const b = h('button', 'choice-opt');
      b.type = 'button';
      b.append(h('kbd', undefined, String(i + 1)));
      const ico = h('img', 'ico');
      ico.src = iconDataUrl(a, 48);
      ico.alt = '';
      b.append(ico);
      const txt = h('span', 'txt');
      const first = techniquesFor(a, 1).map((id) => TECHNIQUES[id]?.name ?? id).join(', ');
      txt.append(h('b', undefined, AFFINITY_NAMES[a]), h('i', undefined, AFFINITY_BLURB[a]), h('em', undefined, `Empiezas con: ${first}. Con cada nivel desbloqueas la siguiente técnica de ${AFFINITY_NAMES[a]}.`));
      b.append(txt);
      b.addEventListener('click', () => this.pick(i));
      list.append(b);
    });
    panel.append(list, h('div', 'menu-foot', '1-2 o clic: elegir'));
    this.root.replaceChildren(panel);
    this.root.hidden = false;
  }
}
