import { BALANCE } from '../content/balance';
import { WEAPON_KIND_NAMES } from '../content/describe';
import { getEquipment } from '../content/items';
import { getWeapon } from '../content/weapons';
import { isCursedGear } from '../content/enchants';
import { gearLabel, iconIdFor } from '../content/names';
import { upgradeQuote } from '../core/engine';
import type { GameState } from '../core/types';
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

/** Mesa de forja: mejora armas (+1 de poder por nivel) pagando con monedas o con esquirlas de campana. */
export class ForgeBox {
  private readonly root: HTMLElement;
  private npcId: string | null = null;
  private state: GameState | null = null;
  onUpgrade: (npcId: string, weaponId: string, pay: 'coins' | 'shards') => void = () => undefined;
  onPurify: (npcId: string, itemId: string) => void = () => undefined;

  constructor() {
    const root = document.getElementById('forge');
    if (!root) throw new Error('Falta el elemento #forge en index.html');
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
    if (key === 'escape' || key === 'x') {
      this.close();
      return true;
    }
    const n = Number(key);
    const s = this.state;
    if (s && Number.isInteger(n) && n >= 1 && n <= s.player.weapons.length) {
      const id = s.player.weapons[n - 1];
      const q = upgradeQuote(s, id);
      // Con el teclado: monedas primero; si no alcanzan, esquirlas.
      const pay = q.canCoins ? 'coins' : q.canShards ? 'shards' : null;
      if (pay && this.npcId) this.onUpgrade(this.npcId, id, pay);
    }
    return true;
  }

  private render(): void {
    const s = this.state;
    if (!s || !this.npcId) return;
    const p = s.player;
    const panel = h('div', 'choice-panel');
    const head = h('div', 'choice-head');
    const t = h('div');
    t.append(h('b', undefined, 'Mesa de forja'), h('span', 'muted', `Cada nivel da +${BALANCE.forge.bonusPerLevel} de poder al arma · máximo +${BALANCE.forge.maxLevel}`));
    const close = h('button', 'close', '✕');
    close.type = 'button';
    close.addEventListener('click', () => this.close());
    head.append(img('forja', 48), t, close);
    panel.append(head);

    const wallet = h('div', 'forge-wallet');
    const chip = (icon: string, text: string): HTMLElement => {
      const c = h('span', 'chip');
      const i = h('img');
      i.src = iconDataUrl(icon, 28);
      i.alt = '';
      c.append(i, text);
      return c;
    };
    wallet.append(chip('moneda', `${p.coins} monedas`), chip('esquirla', `${p.shards} esquirlas`));
    panel.append(wallet);

    const list = h('div', 'choice-list');
    p.weapons.forEach((id, i) => {
      const w = getWeapon(id);
      if (!w) return;
      const q = upgradeQuote(s, id);
      const row = h('div', 'forge-row');
      row.append(h('kbd', undefined, String(i + 1)), img(iconIdFor(id, s), 48));
      const txt = h('div', 'txt');
      const on = p.equipment.weapon === id;
      txt.append(
        h('b', undefined, `${gearLabel(id, q.level, s)}${on ? ' · equipada' : ''}`),
        h('i', undefined, `${WEAPON_KIND_NAMES[w.kind]} · poder +${w.bonus + q.level * BALANCE.forge.bonusPerLevel}${q.maxed ? ' · nivel máximo' : ` → +${w.bonus + (q.level + 1) * BALANCE.forge.bonusPerLevel}`}`),
      );
      row.append(txt);
      const pay = h('div', 'pay');
      const btn = (kind: 'coins' | 'shards', label: string, icon: string, ok: boolean): HTMLButtonElement => {
        const b = h('button', 'use');
        b.type = 'button';
        b.disabled = !ok;
        const im = h('img');
        im.src = iconDataUrl(icon, 24);
        im.alt = '';
        b.append(im, label);
        b.addEventListener('click', () => this.npcId && this.onUpgrade(this.npcId, id, kind));
        return b;
      };
      if (q.maxed) pay.append(h('span', 'muted', 'Al máximo'));
      else pay.append(btn('coins', String(q.coins), 'moneda', q.canCoins), btn('shards', String(q.shards), 'esquirla', q.canShards));
      row.append(pay);
      list.append(row);
    });
    panel.append(list);

    // Purificación: el herrero rompe el sello de una pieza maldita ya identificada.
    const cursed = [...p.weapons, ...p.armors].filter((id) => isCursedGear(id) && p.identified.includes(id));
    if (cursed.length > 0) {
      panel.append(h('div', 'forge-sub', `Piezas malditas: purificar cuesta ${BALANCE.purifyCost} monedas`));
      const clist = h('div', 'choice-list');
      for (const id of cursed) {
        const row = h('div', 'forge-row');
        row.append(img(iconIdFor(id, s), 48));
        const txt = h('div', 'txt');
        const worn = p.equipment.weapon === id || p.equipment.armor === id;
        txt.append(h('b', 'cursed', `${gearLabel(id, 0, s)}${worn ? ' · puesta' : ''}`), h('i', undefined, getEquipment(id)?.description ?? getWeapon(id)?.description ?? ''));
        row.append(txt);
        const pay = h('div', 'pay');
        const b = h('button', 'use');
        b.type = 'button';
        b.disabled = p.coins < BALANCE.purifyCost;
        const im = h('img');
        im.src = iconDataUrl('moneda', 24);
        im.alt = '';
        b.append(im, `Purificar ${BALANCE.purifyCost}`);
        b.addEventListener('click', () => this.npcId && this.onPurify(this.npcId, id));
        pay.append(b);
        row.append(pay);
        clist.append(row);
      }
      panel.append(clist);
    }
    panel.append(h('div', 'menu-foot', '1-9: mejorar esa arma (monedas primero) · Esc o X: cerrar · Las armas sin identificar (?) también se mejoran'));
    this.root.replaceChildren(panel);
    this.root.hidden = false;
  }
}
