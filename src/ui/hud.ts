import { AFFINITY_NAMES } from '../content/affinities';
import { STATUS_NAMES } from '../content/describe';
import { ENEMIES } from '../content/enemies';
import { NOTES, getRelic } from '../content/story';
import { KEYS, getEquipment, getItem } from '../content/items';
import { getTechnique } from '../content/techniques';
import { THROWABLES, getWeapon, weaponLabel } from '../content/weapons';
import { weaponLevel } from '../core/combat';
import type { GameState } from '../core/types';
import { iconDataUrl } from '../presentation/art/icons';
import { drawMinimap } from './minimap';

/** Información del modo de apuntado para mostrar en el panel. */
export interface AimInfo {
  title: string;
  detail: string;
  valid: boolean;
  message?: string;
}

/** Órdenes que se pueden dar con el ratón o el dedo desde el panel. */
export type UiAction =
  | { type: 'technique'; slot: number }
  | { type: 'item'; itemId: string }
  | { type: 'throw' }
  | { type: 'reach' }
  | { type: 'weapon' }
  | { type: 'wait' }
  | { type: 'interact' }
  | { type: 'menu' }
  | { type: 'key'; key: string };

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

interface SlotSpec {
  key: string;
  icon: string;
  name: string;
  sub: string;
  disabled?: boolean;
  action: UiAction;
}

/** HUD en DOM: recursos, estados, barra de acciones pulsable, minimapa, registro y pantalla de resultado. */
export class Hud {
  onAction: (a: UiAction) => void = () => undefined;
  private lastQuick = '';

  constructor() {
    (el('hp-icon') as HTMLImageElement).src = iconDataUrl('hp', 40);
    (el('kiro-icon') as HTMLImageElement).src = iconDataUrl('kiro', 40);
    el('dpad').addEventListener('click', (ev) => {
      const btn = (ev.target as HTMLElement).closest('button[data-key]') as HTMLElement | null;
      if (btn?.dataset.key) this.onAction({ type: 'key', key: btn.dataset.key });
    });
    el('result-new').addEventListener('click', () => this.onAction({ type: 'key', key: 'r' }));
    el('actions').addEventListener('click', (ev) => {
      const btn = (ev.target as HTMLElement).closest('button[data-i]') as HTMLElement | null;
      if (!btn) return;
      const spec = this.specs[Number(btn.dataset.i)];
      if (spec) this.onAction(spec.action);
    });
  }

  private specs: SlotSpec[] = [];

  update(state: GameState, aim: AimInfo | null): void {
    const p = state.player;
    el('hp-text').textContent = `${p.hp}/${p.maxHp}`;
    el('hp-fill').style.width = `${(p.hp / p.maxHp) * 100}%`;
    el('kiro-text').textContent = `${p.kiro}/${p.maxKiro}`;
    el('kiro-fill').style.width = `${(p.kiro / p.maxKiro) * 100}%`;
    const total = Math.max(1, state.floorEnemies);
    el('xp-text').textContent = state.floorCleared ? `Nv ${p.level} · sector despejado` : `Nv ${p.level} · enemigos ${state.floorKilled}/${state.floorEnemies}`;
    el('xp-fill').style.width = `${state.floorCleared ? 100 : (state.floorKilled / total) * 100}%`;

    const weapon = getWeapon(p.equipment.weapon);
    const armor = getEquipment(p.equipment.armor);
    el('meta').textContent = [
      `Sector ${state.floor}/${state.maxFloor} · Turno ${state.turn} · ${AFFINITY_NAMES[p.affinity]}`,
      `Arma: ${weapon ? `${weaponLabel(weapon.id, weaponLevel(p, weapon.id))} (+${weapon.bonus + weaponLevel(p, weapon.id)})` : '—'}`,
      `Vestimenta: ${armor ? `${armor.name} (+${armor.bonus})` : '—'}`,
      `Semilla ${state.seed}`,
    ].join('\n');

    el('statuses').replaceChildren(
      ...p.statuses.map((s) => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        const img = document.createElement('img');
        img.src = iconDataUrl(s.id, 28);
        img.alt = '';
        chip.append(img, `${STATUS_NAMES[s.id] ?? s.id} ${s.turns}`);
        return chip;
      }),
    );

    const wallet = el('wallet');
    const chip = (cls: string, iconId: string, text: string, title: string): HTMLElement => {
      const c = document.createElement('span');
      c.className = `chip ${cls}`;
      c.title = title;
      const im = document.createElement('img');
      im.src = iconDataUrl(iconId, 28);
      im.alt = '';
      c.append(im, text);
      return c;
    };
    wallet.replaceChildren(
      chip('coin', 'moneda', String(p.coins), 'Monedas'),
      chip('coin', 'esquirla', String(p.shards), 'Esquirlas de campana'),
      ...p.keys.map((k) => chip('key', k, KEYS[k]?.name ?? k, KEYS[k]?.description ?? '')),
    );

    this.renderActions(state, aim);

    const log = el('log');
    log.replaceChildren(
      ...state.log.slice(-14).map((t) => {
        const d = document.createElement('p');
        d.textContent = t;
        return d;
      }),
    );
    log.scrollTop = log.scrollHeight;

    el('help').textContent = 'Tab: menú · E: interactuar/hablar (o camina contra cofres, puertas y mesas) · F: ataque de alcance · G: lanzar · Q: cambiar arma · Rueda o +/−: zoom · R: nueva expedición';
    this.drawMinimap(state);

    this.renderResult(state);
  }

  /** Pantalla de resumen al terminar la expedición (victoria o derrota). */
  private renderResult(state: GameState): void {
    const result = el('result');
    if (state.status === 'playing') {
      result.hidden = true;
      return;
    }
    const st = state.stats;
    const won = state.status === 'won';
    const p = state.player;
    result.hidden = false;
    result.classList.toggle('won', won);
    el('result-title').textContent = won ? 'Expedición completada' : 'Has caído';
    const killer = st.defeatedBy ? (st.defeatedBy === 'quemadura' ? 'las quemaduras' : ENEMIES[st.defeatedBy]?.name ?? st.defeatedBy) : null;
    el('result-text').textContent = won
      ? 'El Campanero calla y el sello aguanta. Sales de la cripta con el Sello antiguo.'
      : `Caes en el sector ${state.floor} de ${state.maxFloor}${killer ? `, a manos de ${killer}` : ''}. La cripta guarda tu eco.`;
    const stat = (label: string, value: string): HTMLElement => {
      const d = document.createElement('div');
      d.className = 'stat';
      const a = document.createElement('span');
      a.textContent = label;
      const b = document.createElement('b');
      b.textContent = value;
      d.append(a, b);
      return d;
    };
    el('result-stats').replaceChildren(
      stat('Sector alcanzado', `${state.floor} / ${state.maxFloor}`),
      stat('Nivel', String(p.level)),
      stat('Turnos', String(state.turn)),
      stat('Enemigos derrotados', String(st.kills)),
      stat('Daño infligido', String(st.damageDealt)),
      stat('Daño recibido', String(st.damageTaken)),
      stat('Técnicas usadas', String(st.techniquesUsed)),
      stat('Objetos usados', String(st.itemsUsed)),
      stat('Golpes furtivos', String(st.sneakAttacks)),
      stat('Cofres abiertos', String(st.chestsOpened)),
      stat('Monedas reunidas', String(st.coinsFound)),
      stat('Armas mejoradas', String(st.upgrades)),
      stat('Decisiones tomadas', String(st.decisions)),
      stat('Pergaminos', `${p.notes.length} / ${Object.keys(NOTES).length}`),
    );
    const extra = el('result-extra');
    extra.replaceChildren();
    const chip = (iconId: string, text: string): HTMLElement => {
      const c = document.createElement('span');
      c.className = 'chip';
      const img = document.createElement('img');
      img.src = iconDataUrl(iconId, 28);
      img.alt = '';
      c.append(img, text);
      return c;
    };
    if (st.bossDefeated) extra.append(chip('campana', 'Campanero Sepultado derrotado'));
    else if (state.floor >= state.maxFloor) extra.append(chip('campana', 'Campanero Sepultado sigue en pie'));
    for (const id of p.relics) extra.append(chip(id, getRelic(id)?.name ?? id));
  }

  notice(text: string): void {
    el('notice').textContent = text;
  }

  private renderActions(state: GameState, aim: AimInfo | null): void {
    const box = el('actions');
    const p = state.player;
    if (aim) {
      this.specs = [];
      this.lastQuick = '';
      const t = document.createElement('div');
      t.className = 'aim';
      const h = document.createElement('strong');
      h.textContent = `Apuntando: ${aim.title}`;
      const d = document.createElement('div');
      d.textContent = aim.detail;
      const k = document.createElement('div');
      k.className = aim.valid ? 'ok' : 'bad';
      k.textContent = aim.valid ? 'Enter: confirmar · Esc: cancelar' : `✗ ${aim.message ?? 'No válido'}`;
      t.append(h, d, k);
      box.replaceChildren(t);
      return;
    }

    const specs: SlotSpec[] = [];
    p.techniques.slice(0, TECHNIQUE_KEYS.length).forEach((id, i) => {
      const d = getTechnique(id);
      if (!d) return;
      specs.push({
        key: TECHNIQUE_KEYS[i],
        icon: d.affinity ?? p.affinity,
        name: d.name,
        sub: `${d.kiroCost} kiro${p.kiro < d.kiroCost ? ' · sin kiro' : ''}`,
        disabled: p.kiro < d.kiroCost,
        action: { type: 'technique', slot: i },
      });
    });
    for (const slot of ITEM_SLOTS) {
      const item = getItem(slot.itemId);
      const n = p.inventory[slot.itemId] ?? 0;
      specs.push({ key: slot.key, icon: slot.itemId, name: item?.name ?? slot.itemId, sub: `×${n}`, disabled: n === 0, action: { type: 'item', itemId: slot.itemId } });
    }
    const throwables = Object.keys(THROWABLES).filter((id) => (p.inventory[id] ?? 0) > 0);
    const total = throwables.reduce((a, id) => a + (p.inventory[id] ?? 0), 0);
    const tId = throwables[0];
    specs.push({
      key: 'G',
      icon: tId ?? 'shuriken',
      name: 'Lanzar',
      sub: tId ? `${THROWABLES[tId].name} · ${total} en total` : 'sin arrojadizas',
      disabled: !tId,
      action: { type: 'throw' },
    });
    const w = getWeapon(p.equipment.weapon);
    if (w && w.reach >= 2) {
      specs.push({ key: 'F', icon: w.id, name: 'Ataque de alcance', sub: `${w.name} · ${w.reach} casillas`, action: { type: 'reach' } });
    }
    if (p.weapons.length > 1) specs.push({ key: 'Q', icon: w?.id ?? 'tanto_gastado', name: 'Cambiar arma', sub: w?.name ?? '', action: { type: 'weapon' } });
    specs.push({ key: 'E', icon: 'cofre', name: 'Interactuar', sub: 'cofre / puerta / forja / hablar', action: { type: 'interact' } });
    specs.push({ key: 'Tab', icon: 'pergamino', name: 'Menú', sub: 'inventario y técnicas', action: { type: 'menu' } });

    const sig = JSON.stringify(specs.map((s) => [s.key, s.icon, s.name, s.sub, s.disabled]));
    this.specs = specs;
    if (sig === this.lastQuick && box.querySelector('.quick')) return;
    this.lastQuick = sig;
    const grid = document.createElement('div');
    grid.className = 'quick';
    specs.forEach((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'slot';
      b.dataset.i = String(i);
      b.disabled = !!s.disabled;
      const img = document.createElement('img');
      img.src = iconDataUrl(s.icon, 44);
      img.alt = '';
      const txt = document.createElement('span');
      txt.className = 'txt';
      const n = document.createElement('b');
      n.textContent = s.name;
      const sub = document.createElement('i');
      sub.textContent = s.sub;
      txt.append(n, sub);
      const kbd = document.createElement('kbd');
      kbd.textContent = s.key;
      b.append(img, txt, kbd);
      grid.append(b);
    });
    box.replaceChildren(grid);
  }

  private drawMinimap(state: GameState): void {
    drawMinimap(el('minimap') as HTMLCanvasElement, state);
  }
}
