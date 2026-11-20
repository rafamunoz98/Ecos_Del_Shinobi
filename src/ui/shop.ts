import { SHOP_PRICES } from '../content/shop';
import { itemName, iconIdFor } from '../content/names';
import { getArcana } from '../content/arcana';
import { getEquipment, getItem } from '../content/items';
import { getTechnique } from '../content/techniques';
import { getWeapon } from '../content/weapons';
import { getMod } from '../content/enchants';
import type { GameState, Npc } from '../core/types';
import { iconDataUrl } from '../presentation/art/icons';

function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

function img(id: string, px: number): HTMLImageElement {
  const i = h('img', 'ico');
  i.src = iconDataUrl(id, px);
  i.alt = '';
  return i;
}

/** Descripción corta de lo que se vende (las compras se entregan ya identificadas). */
export function offerDescription(itemId: string): string {
  if (itemId.startsWith('manual:')) return getTechnique(itemId.slice(7))?.description ?? 'Enseña una técnica nueva.';
  const arcana = getArcana(itemId);
  if (arcana) return arcana.description;
  const w = getWeapon(itemId);
  if (w) return `${w.description}${getMod(itemId) ? ` ${getMod(itemId)?.description}` : ''}`;
  const e = getEquipment(itemId);
  if (e) return `+${e.bonus} de defensa. ${getMod(itemId)?.description ?? ''}`.trim();
  return getItem(itemId)?.description ?? '';
}

/** Mercader que aparece tras cada jefe: vende objetos ya identificados y sin maldición. */
export class ShopBox {
  private readonly root: HTMLElement;
  private npcId: string | null = null;
  private state: GameState | null = null;
  onBuy: (npcId: string, offerId: string) => void = () => undefined;

  constructor() {
    const root = document.getElementById('shop');
    if (!root) throw new Error('Falta el elemento #shop en index.html');
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

  private npc(): Npc | undefined {
    return this.state?.npcs.find((n) => n.id === this.npcId);
  }

  onKey(key: string): boolean {
    if (!this.isOpen) return false;
    if (key === 'escape' || key === 'x' || key === 'enter') {
      this.close();
      return true;
    }
    const n = Number(key);
    const stock = this.npc()?.stock ?? [];
    if (Number.isInteger(n) && n >= 1 && n <= stock.length && this.npcId) {
      const o = stock[n - 1];
      if (!o.sold) this.onBuy(this.npcId, o.id);
    }
    return true;
  }

  private render(): void {
    const s = this.state;
    const npc = this.npc();
    if (!s || !npc) return;
    const p = s.player;
    const panel = h('div', 'choice-panel');
    const head = h('div', 'choice-head');
    const t = h('div');
    t.append(h('b', undefined, 'Mercader de la Casa del Hilo Gris'), h('span', 'muted', 'Todo lo que vende está identificado y libre de maldiciones.'));
    const close = h('button', 'close', '✕');
    close.type = 'button';
    close.addEventListener('click', () => this.close());
    head.append(img('mercader', 48), t, close);
    panel.append(head);

    const wallet = h('div', 'forge-wallet');
    const chip = h('span', 'chip');
    chip.append(img('moneda', 28), `${p.coins} monedas`);
    wallet.append(chip);
    panel.append(wallet);

    const list = h('div', 'choice-list');
    (npc.stock ?? []).forEach((o, i) => {
      const row = h('div', `forge-row${o.sold ? ' sold' : ''}`);
      const label = (): string => {
        if (o.itemId.startsWith('manual:')) return itemName(o.itemId);
        // El mercader entrega identificado: se muestra el nombre verdadero.
        return itemName(o.itemId, { appearance: s.appearance, player: { known: [o.itemId, ...p.known], identified: [o.itemId, ...p.identified] } });
      };
      row.append(h('kbd', undefined, String(i + 1)), img(iconIdFor(o.itemId, { appearance: s.appearance, player: { known: [o.itemId, ...p.known], identified: p.identified } }), 48));
      const txt = h('div', 'txt');
      txt.append(h('b', undefined, `${label()}${o.count > 1 ? ` ×${o.count}` : ''}`), h('i', undefined, offerDescription(o.itemId)));
      row.append(txt);
      const pay = h('div', 'pay');
      if (o.sold) pay.append(h('span', 'muted', 'Vendido'));
      else {
        const b = h('button', 'use');
        b.type = 'button';
        b.disabled = p.coins < o.price;
        b.append(img('moneda', 24), String(o.price));
        b.addEventListener('click', () => this.npcId && this.onBuy(this.npcId, o.id));
        pay.append(b);
      }
      row.append(pay);
      list.append(row);
    });
    panel.append(list, h('div', 'menu-foot', `1-9: comprar ese artículo · Esc o X: cerrar · Un tónico cuesta ${SHOP_PRICES.tonico_kiro}, un ungüento ${SHOP_PRICES.unguento_musgo}`));
    this.root.replaceChildren(panel);
    this.root.hidden = false;
  }
}
