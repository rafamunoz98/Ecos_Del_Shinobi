function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

export interface ConfirmOptions {
  title: string;
  text: string;
  yes: string;
  no: string;
  onYes: () => void;
}

/**
 * Ventana de confirmación Sí/No (por ejemplo antes de abandonar la expedición). Enter, S o Y confirman; Esc o N cancelan.
 * Por defecto el foco está en «No» para que un Enter por costumbre no borre la partida.
 */
export class ConfirmBox {
  private readonly root: HTMLElement;
  private opts: ConfirmOptions | null = null;
  private buttons: HTMLButtonElement[] = [];

  constructor() {
    const root = document.getElementById('confirm');
    if (!root) throw new Error('Falta el elemento #confirm en index.html');
    this.root = root;
  }

  get isOpen(): boolean {
    return this.opts !== null;
  }

  open(opts: ConfirmOptions): void {
    this.opts = opts;
    const panel = h('div', 'choice-panel confirm-panel');
    panel.setAttribute('role', 'alertdialog');
    panel.setAttribute('aria-modal', 'true');
    const head = h('div', 'choice-head');
    const t = h('div');
    t.append(h('b', undefined, opts.title), h('span', 'muted', opts.text));
    head.append(t);
    const row = h('div', 'confirm-row');
    const no = h('button', 'tab');
    no.type = 'button';
    no.append(opts.no);
    no.addEventListener('click', () => this.cancel());
    const yes = h('button', 'use danger');
    yes.type = 'button';
    yes.append(opts.yes);
    yes.addEventListener('click', () => this.accept());
    row.append(no, yes);
    this.buttons = [no, yes];
    panel.append(head, row, h('div', 'menu-foot', 'S / Intro: confirmar · N / Esc: cancelar'));
    this.root.replaceChildren(panel);
    this.root.hidden = false;
    no.focus();
  }

  close(): void {
    this.opts = null;
    this.buttons = [];
    this.root.hidden = true;
    this.root.replaceChildren();
  }

  /** Consume todas las teclas mientras está abierta. */
  onKey(key: string): boolean {
    if (!this.opts) return false;
    if (key === 's' || key === 'y') this.accept();
    else if (key === 'n' || key === 'escape') this.cancel();
    else if (key === 'tab' || key === 'arrowleft' || key === 'arrowright') {
      const at = this.buttons.indexOf(document.activeElement as HTMLButtonElement);
      this.buttons[at === 0 ? 1 : 0]?.focus();
    } else if (key === 'enter' || key === ' ') {
      // Enter confirma solo si el botón enfocado es «Sí»; por defecto el foco está en «No».
      const focused = document.activeElement as HTMLElement | null;
      if (focused?.classList.contains('danger')) this.accept();
      else this.cancel();
    }
    return true;
  }

  private accept(): void {
    const o = this.opts;
    this.close();
    o?.onYes();
  }

  private cancel(): void {
    this.close();
  }
}
