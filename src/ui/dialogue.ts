import { DIALOGUES, type DialogueDef } from '../content/story';
import { drawEnemy } from '../presentation/art/actors';
import { drawNpc } from '../presentation/art/bosses';

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

/** Retrato en un lienzo pequeño, dibujado con el mismo arte del juego. */
function portrait(def: DialogueDef): HTMLElement | null {
  const p = def.portrait;
  if (!p) return null;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 120;
  cv.className = 'portrait-cv';
  const c = cv.getContext('2d');
  if (!c) return null;
  c.translate(60, 66);
  const scale = p.kind === 'enemy' ? 96 : 110;
  c.scale(scale, scale);
  if (p.kind === 'enemy') drawEnemy(c, p.id, { t: 0.4, walk: 0, phase: 0, face: 1, bossPhase: 1 });
  else drawNpc(c, p.id, 0.4, false);
  return cv;
}

/** Cuadro de diálogo: una cola de conversaciones cortas; Espacio/Enter/E o un toque pasan de línea. */
export class DialogueBox {
  private readonly root: HTMLElement;
  private queue: { def: DialogueDef; done?: () => void }[] = [];
  private current: { def: DialogueDef; done?: () => void } | null = null;
  private line = 0;

  constructor() {
    const root = document.getElementById('dialogue');
    if (!root) throw new Error('Falta el elemento #dialogue en index.html');
    this.root = root;
    root.addEventListener('click', () => this.advance());
  }

  get isOpen(): boolean {
    return this.current !== null;
  }

  /** Encola un diálogo por id; `done` se llama al terminarlo. */
  show(id: string, done?: () => void): void {
    const def = DIALOGUES[id];
    if (!def) {
      done?.();
      return;
    }
    this.queue.push({ def, done });
    if (!this.current) this.next();
  }

  /** Devuelve true si la tecla fue para el diálogo (mientras esté abierto bloquea el resto). */
  onKey(key: string): boolean {
    if (!this.current) return false;
    if (key === 'escape') this.skipAll();
    else if (key === ' ' || key === 'enter' || key === 'e' || key === 'arrowright' || key === 'd') this.advance();
    return true;
  }

  clear(): void {
    this.queue = [];
    this.current = null;
    this.root.hidden = true;
  }

  private next(): void {
    const item = this.queue.shift();
    if (!item) {
      this.current = null;
      this.root.hidden = true;
      return;
    }
    this.current = item;
    this.line = 0;
    this.render();
  }

  private advance(): void {
    const cur = this.current;
    if (!cur) return;
    if (this.line < cur.def.lines.length - 1) {
      this.line += 1;
      this.render();
      return;
    }
    cur.done?.();
    this.next();
  }

  private skipAll(): void {
    const finished = [this.current, ...this.queue];
    this.queue = [];
    this.current = null;
    this.root.hidden = true;
    for (const f of finished) f?.done?.();
  }

  private render(): void {
    const cur = this.current;
    if (!cur) return;
    const box = el('div', 'dlg-box');
    const pic = portrait(cur.def);
    if (pic) box.append(pic);
    const col = el('div', 'dlg-col');
    col.append(el('div', 'dlg-name', cur.def.speaker));
    const text = el('p', 'dlg-text', cur.def.lines[this.line]);
    text.classList.add('fade');
    col.append(text);
    const last = this.line === cur.def.lines.length - 1;
    col.append(el('div', 'dlg-hint', `${this.line + 1}/${cur.def.lines.length} · ${last ? 'Espacio: continuar' : 'Espacio: siguiente'} · Esc: saltar`));
    box.append(col);
    this.root.replaceChildren(box);
    this.root.hidden = false;
  }
}
