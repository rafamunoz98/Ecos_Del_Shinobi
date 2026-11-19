import { AFFINITY_NAMES } from '../content/affinities';
import { STATUS_HELP, STATUS_NAMES, WEAPON_KIND_NAMES, describeEffects, describeShape, describeWeaponPattern } from '../content/describe';
import { CURRENCY, KEYS, getEquipment, getItem } from '../content/items';
import { NOTES, getNote, getRelic } from '../content/story';
import { TECHNIQUES, type TechniqueDef } from '../content/techniques';
import { THROWABLES, getWeapon, weaponLabel } from '../content/weapons';
import { effectiveDefense, effectivePower, weaponLevel, xpToNext } from '../core/combat';
import type { GameState } from '../core/types';
import { drawNinja } from '../presentation/art/actors';
import { iconDataUrl } from '../presentation/art/icons';
import { drawMinimap } from './minimap';

export type MenuTab = 'estado' | 'tecnicas' | 'objetos' | 'armas' | 'notas' | 'mapa';

const TABS: { id: MenuTab; label: string; icon: string }[] = [
  { id: 'estado', label: 'Estado', icon: 'hp' },
  { id: 'tecnicas', label: 'Técnicas', icon: 'ascua' },
  { id: 'objetos', label: 'Objetos', icon: 'tonico_kiro' },
  { id: 'armas', label: 'Armas', icon: 'hoja_afilada' },
  { id: 'notas', label: 'Notas', icon: 'pergamino' },
  { id: 'mapa', label: 'Mapa', icon: 'cofre' },
];

/** Acciones que el menú pide a la escena (cada una cierra el menú). */
export interface MenuActions {
  cast(slot: number): void;
  useItem(itemId: string): void;
  throwItem(itemId: string): void;
  equipWeapon(weaponId: string): void;
}

function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

function icon(id: string, px = 48): HTMLImageElement {
  const i = h('img', 'ico');
  i.src = iconDataUrl(id, px);
  i.alt = '';
  return i;
}

function stat(label: string, value: string): HTMLElement {
  const d = h('div', 'stat');
  d.append(h('span', undefined, label), h('b', undefined, value));
  return d;
}

/** Menú de personaje: Estado, Técnicas, Objetos y Armas. Tab/I lo abre; Esc lo cierra. */
export class Menu {
  private tab: MenuTab = 'estado';
  private noteSel: string | null = null;
  private state: GameState | null = null;
  private readonly root: HTMLElement;
  actions: MenuActions;

  constructor(actions: MenuActions) {
    this.actions = actions;
    const root = document.getElementById('menu');
    if (!root) throw new Error('Falta el elemento #menu en index.html');
    this.root = root;
    root.addEventListener('click', (ev) => {
      if (ev.target === root) this.close();
    });
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  open(state: GameState, tab?: MenuTab): void {
    if (tab) this.tab = tab;
    this.state = state;
    this.root.hidden = false;
    this.render();
  }

  close(): void {
    this.root.hidden = true;
  }

  toggle(state: GameState): void {
    if (this.isOpen) this.close();
    else this.open(state);
  }

  /** Mantiene el contenido al día si el estado cambia con el menú abierto. */
  refresh(state: GameState): void {
    this.state = state;
    if (this.isOpen) this.render();
  }

  /** Devuelve true si la tecla fue para el menú. */
  onKey(key: string): boolean {
    if (!this.isOpen) return false;
    if (key === 'escape' || key === 'tab' || key === 'i') this.close();
    else if (key === 'arrowright' || key === 'd') this.go(1);
    else if (key === 'arrowleft' || key === 'a') this.go(-1);
    else if (['1', '2', '3', '4', '5', '6'].includes(key)) this.setTab(TABS[Number(key) - 1].id);
    return true;
  }

  private go(delta: number): void {
    const i = TABS.findIndex((t) => t.id === this.tab);
    this.setTab(TABS[(i + delta + TABS.length) % TABS.length].id);
  }

  private setTab(tab: MenuTab): void {
    this.tab = tab;
    this.render();
  }

  private render(): void {
    const s = this.state;
    if (!s) return;
    const panel = h('div', 'panel');
    const head = h('div', 'menu-head');
    const tabs = h('div', 'tabs');
    TABS.forEach((t, i) => {
      const b = h('button', `tab${t.id === this.tab ? ' on' : ''}`);
      b.type = 'button';
      b.append(icon(t.icon, 28), h('span', undefined, t.label), h('kbd', undefined, String(i + 1)));
      b.addEventListener('click', () => this.setTab(t.id));
      tabs.append(b);
    });
    const close = h('button', 'close', '✕ Cerrar');
    close.type = 'button';
    close.addEventListener('click', () => this.close());
    head.append(tabs, close);
    const body = h('div', 'menu-body');
    if (this.tab === 'estado') body.append(...this.estado(s));
    else if (this.tab === 'tecnicas') body.append(...this.tecnicas(s));
    else if (this.tab === 'objetos') body.append(...this.objetos(s));
    else if (this.tab === 'armas') body.append(...this.armas(s));
    else if (this.tab === 'notas') body.append(...this.notas(s));
    else body.append(...this.mapa(s));
    panel.append(head, body, h('div', 'menu-foot', 'Tab o Esc: cerrar · ← →: cambiar de pestaña · Equipar un arma o usar un objeto gasta un turno'));
    this.root.replaceChildren(panel);
  }

  // ---------- Pestañas ----------

  private estado(s: GameState): HTMLElement[] {
    const p = s.player;
    const left = h('div', 'portrait');
    const cv = document.createElement('canvas');
    cv.width = cv.height = 220;
    const c = cv.getContext('2d');
    if (c) {
      c.fillStyle = 'rgba(255,255,255,0.05)';
      c.beginPath();
      c.ellipse(110, 190, 70, 16, 0, 0, Math.PI * 2);
      c.fill();
      c.translate(110, 110);
      c.scale(170, 170);
      drawNinja(c, { t: 0.3, walk: 0, phase: 0, dir: 'down', weapon: getWeapon(p.equipment.weapon)?.kind, protected: p.statuses.some((x) => x.id === 'protegido') });
    }
    left.append(cv, h('h3', undefined, 'Shinobi errante'), h('div', 'sub', `Nivel ${p.level} · ${AFFINITY_NAMES[p.affinity]}`));
    const aff = h('div', 'aff');
    aff.append(icon(p.affinity, 40), h('span', undefined, `Afinidad ${AFFINITY_NAMES[p.affinity]}`));
    left.append(aff);

    const right = h('div', 'stats');
    const grid = h('div', 'statgrid');
    grid.append(
      stat('Vida', `${p.hp} / ${p.maxHp}`),
      stat('Kiro', `${p.kiro} / ${p.maxKiro}`),
      stat('Poder de ataque', String(effectivePower(p))),
      stat('Defensa', String(effectiveDefense(p))),
      stat('Experiencia', `${p.xp} / ${xpToNext(p.level)}`),
      stat('Sector', `${s.floor} / ${s.maxFloor}`),
      stat('Turno', String(s.turn)),
      stat('Semilla', String(s.seed)),
    );
    right.append(grid);

    const gear = h('div', 'gear');
    const w = getWeapon(p.equipment.weapon);
    const a = getEquipment(p.equipment.armor);
    const lvl = weaponLevel(p, w?.id);
    gear.append(this.row(w?.id ?? 'tanto_gastado', `Arma: ${w ? weaponLabel(w.id, lvl) : '—'}`, w ? `${WEAPON_KIND_NAMES[w.kind]} · +${w.bonus + lvl} de poder · alcance ${w.reach}` : ''));
    gear.append(this.row(a?.id ?? 'chaleco_acolchado', `Vestimenta: ${a?.name ?? 'ninguna'}`, a ? `+${a.bonus} de defensa` : 'Encuentra vestimenta en los cofres.'));
    right.append(h('h4', undefined, 'Equipo'), gear);

    right.append(h('h4', undefined, 'Cartera y llaves'));
    right.append(this.row('moneda', `${p.coins} monedas`, CURRENCY.moneda.description));
    right.append(this.row('esquirla', `${p.shards} esquirlas de campana`, CURRENCY.esquirla.description));
    if (p.keys.length === 0) right.append(h('div', 'muted', 'Sin llaves. Las llaves solo valen en el sector donde las encuentras.'));
    for (const k of p.keys) right.append(this.row(k, KEYS[k]?.name ?? k, KEYS[k]?.description ?? ''));

    right.append(h('h4', undefined, 'Estados'));
    if (p.statuses.length === 0) right.append(h('div', 'muted', 'Sin estados activos.'));
    for (const st of p.statuses) right.append(this.row(st.id, `${STATUS_NAMES[st.id]} (${st.turns})`, STATUS_HELP[st.id]));

    right.append(h('h4', undefined, 'Reliquias'));
    if (p.relics.length === 0) right.append(h('div', 'muted', 'Aún no has conseguido ninguna. El guardián del último sector guarda la primera.'));
    for (const id of p.relics) {
      const rel = getRelic(id);
      if (rel) right.append(this.row(rel.id, rel.name, rel.description));
    }

    right.append(h('h4', undefined, 'Sigilo'));
    right.append(h('div', 'muted', 'Los arbustos y las puertas cerradas tapan la visión. Dentro de un arbusto solo te ven desde una casilla, pero tú también ves menos. Atacar a un enemigo que no te ha visto hace el doble de daño.'));
    const wrap = h('div', 'two');
    wrap.append(left, right);
    return [wrap];
  }

  private row(iconId: string, title: string, sub: string): HTMLElement {
    const r = h('div', 'row');
    const t = h('div', 'rt');
    t.append(h('b', undefined, title), h('span', undefined, sub));
    r.append(icon(iconId, 44), t);
    return r;
  }

  private card(def: TechniqueDef, learned: boolean, level: number, slot: number, kiro: number): HTMLElement {
    const c = h('div', `card${learned ? '' : ' locked'}`);
    const top = h('div', 'ctop');
    top.append(icon(def.affinity ?? 'ascua', 52));
    const t = h('div', 'rt');
    t.append(h('b', undefined, def.name), h('span', undefined, `${def.kiroCost} de kiro · ${learned ? 'aprendida' : `se aprende en el nivel ${def.minLevel}`}`));
    top.append(t);
    c.append(top, h('p', undefined, def.description), h('div', 'shape', describeShape(def)));
    const tags = h('div', 'tags');
    for (const e of describeEffects(def)) tags.append(h('span', 'tag', e));
    c.append(tags);
    if (learned && slot >= 0) {
      const b = h('button', 'use', slot < 3 ? `Usar (tecla ${['Z', 'X', 'C'][slot]})` : 'Usar');
      b.type = 'button';
      b.disabled = kiro < def.kiroCost;
      if (b.disabled) b.title = 'Sin kiro suficiente';
      b.addEventListener('click', () => {
        this.close();
        this.actions.cast(slot);
      });
      c.append(b);
    } else if (!learned) {
      c.append(h('div', 'muted', `Nivel actual: ${level}`));
    }
    return c;
  }

  private tecnicas(s: GameState): HTMLElement[] {
    const p = s.player;
    const grid = h('div', 'cards');
    for (const def of Object.values(TECHNIQUES).filter((t) => t.affinity === p.affinity)) {
      const slot = p.techniques.indexOf(def.id);
      grid.append(this.card(def, slot >= 0, p.level, slot, p.kiro));
    }
    return [h('p', 'lead', `Afinidad ${AFFINITY_NAMES[p.affinity]}. Las técnicas gastan kiro; esperar recupera 1.`), grid];
  }

  private objetos(s: GameState): HTMLElement[] {
    const p = s.player;
    const out: HTMLElement[] = [];
    out.push(h('h4', undefined, 'Consumibles'));
    const cons = h('div', 'cards');
    for (const id of Object.keys(p.inventory)) {
      const it = getItem(id);
      const n = p.inventory[id] ?? 0;
      if (!it) continue;
      const c = h('div', 'card');
      const top = h('div', 'ctop');
      const t = h('div', 'rt');
      t.append(h('b', undefined, it.name), h('span', undefined, `×${n}`));
      top.append(icon(id, 52), t);
      c.append(top, h('p', undefined, it.description));
      const b = h('button', 'use', 'Usar');
      b.type = 'button';
      b.disabled = n === 0;
      b.addEventListener('click', () => {
        this.close();
        this.actions.useItem(id);
      });
      c.append(b);
      cons.append(c);
    }
    out.push(cons);
    out.push(h('h4', undefined, 'Armas arrojadizas'));
    const thr = h('div', 'cards');
    for (const def of Object.values(THROWABLES)) {
      const n = p.inventory[def.id] ?? 0;
      const c = h('div', `card${n === 0 ? ' locked' : ''}`);
      const top = h('div', 'ctop');
      const t = h('div', 'rt');
      t.append(h('b', undefined, def.name), h('span', undefined, `×${n}`));
      top.append(icon(def.id, 52), t);
      c.append(top, h('p', undefined, def.description));
      const tags = h('div', 'tags');
      tags.append(
        h('span', 'tag', `Daño ${def.damage}${def.ignoreDefense ? ' (ignora defensa)' : ''}`),
        h('span', 'tag', `Alcance ${def.range}`),
        h('span', 'tag', def.breakChance >= 1 ? 'Se gasta' : `Se pierde ${Math.round(def.breakChance * 100)}%`),
      );
      c.append(tags);
      const b = h('button', 'use', 'Lanzar (tecla G)');
      b.type = 'button';
      b.disabled = n === 0;
      b.addEventListener('click', () => {
        this.close();
        this.actions.throwItem(def.id);
      });
      c.append(b);
      thr.append(c);
    }
    out.push(thr);
    out.push(h('div', 'muted', 'Las arrojadizas que aciertan se clavan en el enemigo y caen al suelo cuando muere; las que fallan caen donde llegan. Pisa la casilla para recogerlas.'));
    return out;
  }

  private mapa(s: GameState): HTMLElement[] {
    const cv = document.createElement('canvas');
    cv.width = s.map.width * 8;
    cv.height = s.map.height * 8;
    cv.className = 'bigmap';
    drawMinimap(cv, s);
    const legend = h('div', 'muted', 'Blanco: tú · Rojo: enemigo a la vista · Dorado: cofre (rojo: lacado) · Naranja: forja · Celeste: maestro/altar · Violeta: escalera · Verde: arbusto · Marrón: puerta · Ocre: puerta con candado');
    return [h('p', 'lead', `Sector ${s.floor} de ${s.maxFloor}. Solo se muestra lo ya explorado.`), cv, legend];
  }

  private notas(s: GameState): HTMLElement[] {
    const found = s.player.notes;
    const total = Object.keys(NOTES).length;
    const intro = h('p', 'lead', `Pergaminos encontrados: ${found.length} / ${total}. Son opcionales: cuentan la historia de la cripta.`);
    if (found.length === 0) return [intro, h('div', 'muted', 'Todavía no has encontrado ninguno. Busca pergaminos en el suelo de cada sector (brillan en dorado).')];
    if (!this.noteSel || !found.includes(this.noteSel)) this.noteSel = found[found.length - 1];
    const list = h('div', 'note-list');
    for (const id of found) {
      const n = getNote(id);
      if (!n) continue;
      const b = h('button', `note-item${id === this.noteSel ? ' on' : ''}`);
      b.type = 'button';
      b.append(icon('pergamino', 28), h('span', undefined, n.title));
      b.addEventListener('click', () => {
        this.noteSel = id;
        this.render();
      });
      list.append(b);
    }
    const sel = getNote(this.noteSel);
    const reader = h('div', 'note-reader');
    if (sel) reader.append(h('h3', undefined, sel.title), h('p', undefined, sel.text), h('div', 'muted', `Hallado en el sector ${sel.floor}`));
    const wrap = h('div', 'notes');
    wrap.append(list, reader);
    return [intro, wrap];
  }

  private armas(s: GameState): HTMLElement[] {
    const p = s.player;
    const grid = h('div', 'cards');
    for (const id of p.weapons) {
      const w = getWeapon(id);
      if (!w) continue;
      const on = p.equipment.weapon === id;
      const c = h('div', `card${on ? ' equipped' : ''}`);
      const top = h('div', 'ctop');
      const t = h('div', 'rt');
      const lvl = weaponLevel(p, id);
      t.append(h('b', undefined, weaponLabel(id, lvl)), h('span', undefined, `${WEAPON_KIND_NAMES[w.kind]}${on ? ' · equipada' : ''}`));
      top.append(icon(id, 52), t);
      c.append(top, h('p', undefined, w.description), h('div', 'shape', describeWeaponPattern(w)));
      const tags = h('div', 'tags');
      tags.append(h('span', 'tag', `+${w.bonus + lvl} de poder${lvl > 0 ? ` (mejora +${lvl})` : ''}`), h('span', 'tag', `Alcance ${w.reach}`));
      c.append(tags);
      const b = h('button', 'use', on ? 'Equipada' : 'Equipar (gasta un turno)');
      b.type = 'button';
      b.disabled = on;
      b.addEventListener('click', () => {
        this.close();
        this.actions.equipWeapon(id);
      });
      c.append(b);
      grid.append(c);
    }
    return [h('p', 'lead', 'Una sola arma equipada. Las nuevas están en cofres y cámaras selladas; las mesas de forja (sectores 2 y 3) las mejoran con monedas o esquirlas.'), grid];
  }
}
