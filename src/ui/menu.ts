import { AFFINITY_NAMES } from '../content/affinities';
import { getArcana, isArcana } from '../content/arcana';
import { BALANCE } from '../content/balance';
import { STATUS_HELP, STATUS_NAMES, WEAPON_KIND_NAMES, describeEffects, describeShape, describeWeaponPattern } from '../content/describe';
import { getMod, isCursedGear } from '../content/enchants';
import { CURRENCY, KEYS, getEquipment } from '../content/items';
import { gearLabel, iconIdFor, itemName } from '../content/names';
import { NOTES, getNote, getRelic } from '../content/story';
import { TECHNIQUES, affinitiesOf, getTechnique, techniquesFor, type TechniqueDef } from '../content/techniques';
import { THROWABLES, getWeapon } from '../content/weapons';
import { effectiveDefense, effectivePower, weaponLevel } from '../core/combat';
import type { GameState } from '../core/types';
import { drawNinja } from '../presentation/art/actors';
import { iconDataUrl } from '../presentation/art/icons';
import { drawMinimap } from './minimap';

export type MenuTab = 'estado' | 'tecnicas' | 'objetos' | 'armas' | 'notas' | 'mapa';

const TABS: { id: MenuTab; label: string; icon: string }[] = [
  { id: 'estado', label: 'Estado', icon: 'hp' },
  { id: 'tecnicas', label: 'Técnicas', icon: 'ascua' },
  { id: 'objetos', label: 'Objetos', icon: 'pocion_azar' },
  { id: 'armas', label: 'Equipo', icon: 'hoja_afilada' },
  { id: 'notas', label: 'Notas', icon: 'pergamino' },
  { id: 'mapa', label: 'Mapa', icon: 'cofre' },
];

/** Acciones que el menú pide a la escena (cada una cierra el menú). */
export interface MenuActions {
  cast(slot: number): void;
  useItem(itemId: string): void;
  throwItem(itemId: string): void;
  equipWeapon(weaponId: string): void;
  equipArmor(armorId: string): void;
  /** Cambia una técnica del grimorio por otra equipada (o la equipa si hay ranura libre). No cierra el menú. */
  equipTechnique(techniqueId: string, replace?: string): void;
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
  /** Técnica del grimorio que se está equipando (esperando elegir cuál sustituir). */
  private swapId: string | null = null;
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

  open(state: GameState, tab?: MenuTab, swapId?: string): void {
    if (tab) this.tab = tab;
    if (swapId !== undefined) this.swapId = swapId;
    this.state = state;
    this.root.hidden = false;
    this.render();
  }

  close(): void {
    this.root.hidden = true;
    this.swapId = null;
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
    this.swapId = null;
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
    left.append(cv, h('h3', undefined, 'Shinobi errante'), h('div', 'sub', `Nivel ${p.level} · ${AFFINITY_NAMES[p.affinity]}${p.affinity2 ? ` + ${AFFINITY_NAMES[p.affinity2]}` : ''}`));
    const aff = h('div', 'aff');
    aff.append(icon(p.affinity, 40), h('span', undefined, `Afinidad ${AFFINITY_NAMES[p.affinity]}`));
    left.append(aff);
    if (p.affinity2) {
      const aff2 = h('div', 'aff');
      aff2.append(icon(p.affinity2, 40), h('span', undefined, `Afinidad ${AFFINITY_NAMES[p.affinity2]}`));
      left.append(aff2);
    }

    const right = h('div', 'stats');
    const grid = h('div', 'statgrid');
    grid.append(
      stat('Vida', `${p.hp} / ${p.maxHp}`),
      stat('Kiro', `${p.kiro} / ${p.maxKiro}`),
      stat('Poder de ataque', String(effectivePower(p))),
      stat('Defensa', String(effectiveDefense(p))),
      stat('Enemigos del sector', s.floorCleared ? 'despejado (nivel ganado)' : `${s.floorKilled} / ${s.floorEnemies}`),
      stat('Sector', `${s.floor} / ${s.maxFloor}`),
      stat('Turno', String(s.turn)),
      stat('Semilla', String(s.seed)),
    );
    right.append(grid);

    const gear = h('div', 'gear');
    const w = getWeapon(p.equipment.weapon);
    const a = getEquipment(p.equipment.armor);
    const lvl = weaponLevel(p, p.equipment.weapon);
    const wMod = getMod(p.equipment.weapon);
    const aMod = getMod(p.equipment.armor);
    gear.append(
      this.row(
        p.equipment.weapon ?? 'tanto_gastado',
        `Arma: ${p.equipment.weapon ? gearLabel(p.equipment.weapon, lvl, s) : '—'}`,
        w ? `${WEAPON_KIND_NAMES[w.kind]} · +${w.bonus + lvl + (wMod?.power ?? 0)} de poder · alcance ${w.reach}${wMod ? ` · ${wMod.description}` : ''}` : '',
      ),
    );
    gear.append(
      this.row(
        p.equipment.armor ?? 'chaleco_acolchado',
        `Vestimenta: ${p.equipment.armor ? gearLabel(p.equipment.armor, 0, s) : 'ninguna'}`,
        a ? `+${a.bonus + (aMod?.defense ?? 0)} de defensa${aMod ? ` · ${aMod.description}` : ''}` : 'Encuentra vestimenta en los cofres.',
      ),
    );
    right.append(h('h4', undefined, 'Equipo'), gear);

    right.append(h('h4', undefined, 'Cartera y llaves'));
    right.append(this.row('moneda', `${p.coins} monedas`, CURRENCY.moneda.description));
    right.append(this.row('esquirla', `${p.shards} esquirlas de campana`, CURRENCY.esquirla.description));
    if (p.keys.length === 0) right.append(h('div', 'muted', 'Sin llaves. Búscalas en el sector: la de hierro abre las puertas con candado y la lacada, los cofres lacados. Valen solo en ese sector.'));
    for (const k of p.keys) right.append(this.row(k, KEYS[k]?.name ?? k, KEYS[k]?.description ?? ''));

    right.append(h('h4', undefined, 'Estados'));
    if (p.statuses.length === 0) right.append(h('div', 'muted', 'Sin estados activos.'));
    for (const st of p.statuses) right.append(this.row(st.id, `${STATUS_NAMES[st.id]} (${st.turns})`, STATUS_HELP[st.id]));

    right.append(h('h4', undefined, 'Reliquias'));
    if (p.relics.length === 0) right.append(h('div', 'muted', 'Aún no has conseguido ninguna. Cada jefe shinobi guarda una.'));
    for (const id of p.relics) {
      const rel = getRelic(id);
      if (rel) right.append(this.row(rel.id, rel.name, rel.description));
    }

    right.append(h('h4', undefined, 'Sigilo'));
    right.append(h('div', 'muted', 'Los arbustos y las puertas cerradas tapan la visión. Dentro de un arbusto solo te ven desde una casilla, pero tú también ves menos. Atacar a un enemigo que no te ha visto hace el doble de daño. Sube un nivel por sector, y solo si derrotas a todos sus enemigos.'));
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

  private card(def: TechniqueDef, opts: { slot?: number; kiro: number; level: number; locked?: boolean; extra?: HTMLElement[]; pick?: boolean }): HTMLElement {
    const { slot = -1, kiro, level, locked = false } = opts;
    const c = h('div', `card${locked ? ' locked' : ''}${opts.pick ? ' pick' : ''}`);
    const top = h('div', 'ctop');
    top.append(icon(def.affinity ?? 'ascua', 52));
    const t = h('div', 'rt');
    const origin = def.learnable ? 'se aprende (manual o maestro)' : `se desbloquea en el nivel ${def.minLevel}`;
    t.append(h('b', undefined, def.name), h('span', undefined, `${def.kiroCost} de kiro${locked ? ` · ${origin}` : ''}`));
    top.append(t);
    c.append(top, h('p', undefined, def.description), h('div', 'shape', describeShape(def)));
    const tags = h('div', 'tags');
    for (const e of describeEffects(def)) tags.append(h('span', 'tag', e));
    c.append(tags);
    if (slot >= 0) {
      const b = h('button', 'use', `Usar (tecla ${slot + 1})`);
      b.type = 'button';
      b.disabled = kiro < def.kiroCost;
      if (b.disabled) b.title = 'Sin kiro suficiente';
      b.addEventListener('click', () => {
        this.close();
        this.actions.cast(slot);
      });
      c.append(b);
    } else if (locked && !def.learnable) {
      c.append(h('div', 'muted', `Nivel actual: ${level}`));
    }
    for (const x of opts.extra ?? []) c.append(x);
    return c;
  }

  private tecnicas(s: GameState): HTMLElement[] {
    const p = s.player;
    const out: HTMLElement[] = [];
    out.push(
      h(
        'p',
        'lead',
        `${p.affinity2 ? `Afinidades ${AFFINITY_NAMES[p.affinity]} y ${AFFINITY_NAMES[p.affinity2]}` : `Afinidad ${AFFINITY_NAMES[p.affinity]}`}. Llevas ${p.techniques.length} de ${BALANCE.techniqueSlots} técnicas (teclas 1-${BALANCE.techniqueSlots}); no hace falta sustituir ninguna hasta llenar las ${BALANCE.techniqueSlots}. Las que no caben quedan en el grimorio: cambiar una gasta un turno. El kiro vuelve solo con el tiempo y esperando.`,
      ),
    );
    out.push(h('h4', undefined, 'Equipadas'));
    const eq = h('div', 'cards');
    p.techniques.forEach((id, slot) => {
      const def = getTechnique(id);
      if (!def) return;
      const extra: HTMLElement[] = [];
      if (this.swapId && this.swapId !== id) {
        const b = h('button', 'use', `Sustituir por ${getTechnique(this.swapId)?.name ?? '…'}`);
        b.type = 'button';
        const swap = this.swapId;
        b.addEventListener('click', () => {
          this.swapId = null;
          this.actions.equipTechnique(swap, id);
        });
        extra.push(b);
      }
      eq.append(this.card(def, { slot, kiro: p.kiro, level: p.level, extra }));
    });
    out.push(eq);

    if (p.grimoire.length > 0) {
      out.push(h('h4', undefined, 'Grimorio'));
      const gr = h('div', 'cards');
      for (const id of p.grimoire) {
        const def = getTechnique(id);
        if (!def) continue;
        const free = p.techniques.length < BALANCE.techniqueSlots;
        const b = h('button', 'use', free ? 'Equipar (gasta un turno)' : this.swapId === id ? 'Elige abajo cuál sustituir ↑' : 'Equipar en lugar de otra…');
        b.type = 'button';
        b.addEventListener('click', () => {
          if (free) this.actions.equipTechnique(id);
          else {
            this.swapId = this.swapId === id ? null : id;
            this.render();
          }
        });
        gr.append(this.card(def, { kiro: p.kiro, level: p.level, extra: [b], pick: this.swapId === id }));
      }
      out.push(gr);
    }

    const known = new Set([...p.techniques, ...p.grimoire]);
    const mine = affinitiesOf(p);
    const unlocked = new Set([...techniquesFor(p.affinity, p.level), ...(p.affinity2 ? techniquesFor(p.affinity2, p.tier2) : [])]);
    const byLevel = Object.values(TECHNIQUES).filter((t) => t.affinity !== null && mine.includes(t.affinity) && !t.learnable && !known.has(t.id) && !unlocked.has(t.id));
    if (byLevel.length > 0) {
      out.push(h('h4', undefined, 'Por desbloquear con el nivel'));
      const g = h('div', 'cards');
      for (const def of byLevel) g.append(this.card(def, { kiro: p.kiro, level: p.level, locked: true }));
      out.push(g);
    }
    const toLearn = Object.values(TECHNIQUES).filter((t) => t.learnable && (t.affinity === null || mine.includes(t.affinity)) && !known.has(t.id));
    if (toLearn.length > 0) {
      out.push(h('h4', undefined, 'Por aprender'));
      out.push(h('div', 'muted', 'Se consiguen en manuales (cofres lacados y cámaras selladas, o a la venta), enseñadas por maestros como Sayoko.'));
      const g = h('div', 'cards');
      for (const def of toLearn) g.append(this.card(def, { kiro: p.kiro, level: p.level, locked: true }));
      out.push(g);
    }
    return out;
  }

  private objetos(s: GameState): HTMLElement[] {
    const p = s.player;
    const out: HTMLElement[] = [];
    const ids = Object.keys(p.inventory).filter((id) => (p.inventory[id] ?? 0) > 0);
    const groups: { title: string; test: (id: string) => boolean; verb: (id: string) => string }[] = [
      {
        title: 'Pociones',
        test: (id) => id.startsWith('pocion:'),
        verb: (id) => (p.known.includes(id) ? 'Beber' : 'Beber (efecto desconocido)'),
      },
      {
        title: 'Pergaminos de ninjutsu',
        test: (id) => id.startsWith('pergamino:'),
        verb: (id) => (p.known.includes(id) ? 'Leer' : 'Leer (efecto desconocido)'),
      },
      { title: 'Manuales de técnica', test: (id) => id.startsWith('manual:'), verb: () => 'Estudiar (aprende la técnica)' },
    ];
    for (const g of groups) {
      const list = ids.filter(g.test);
      if (list.length === 0) continue;
      out.push(h('h4', undefined, g.title));
      const cons = h('div', 'cards');
      for (const id of list) {
        const n = p.inventory[id] ?? 0;
        const known = isArcana(id) ? p.known.includes(id) : true;
        const c = h('div', 'card');
        const top = h('div', 'ctop');
        const t = h('div', 'rt');
        t.append(h('b', undefined, itemName(id, s)), h('span', undefined, `×${n}${known ? '' : ' · sin identificar'}`));
        top.append(icon(iconIdFor(id, s), 52), t);
        let desc = '';
        if (isArcana(id)) desc = known ? (getArcana(id)?.description ?? '') : 'Nadie sabe qué hace. Pruébala con cuidado: algunas son malas. Tu afinidad ya reconoce un tipo de cada clase.';
        else if (id.startsWith('manual:')) desc = getTechnique(id.slice(7))?.description ?? '';
        c.append(top, h('p', undefined, desc));
        const b = h('button', 'use', g.verb(id));
        b.type = 'button';
        b.addEventListener('click', () => {
          this.close();
          this.actions.useItem(id);
        });
        c.append(b);
        cons.append(c);
      }
      out.push(cons);
    }
    if (out.length === 0) out.push(h('div', 'muted', 'No llevas consumibles. Los hay en el suelo, en los cofres y en la tienda que aparece tras cada jefe.'));
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
      const b = h('button', 'use', 'Lanzar esta (tecla G; V cambia de tipo)');
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
    const legend = h('div', 'muted', 'Blanco: tú · Rojo: enemigo a la vista · Dorado: cofre (rojo: lacado) · Naranja: forja · Amarillo: mercader · Blanco/rosa: llave de hierro/laca · Celeste: maestro/altar · Violeta: escalera · Verde: arbusto · Marrón: puerta · Ocre: puerta con candado');
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
    const out: HTMLElement[] = [];
    out.push(
      h(
        'p',
        'lead',
        'Un arma y una vestimenta puestas. Lo que encuentras viene sin identificar (?): al equiparlo descubres si está encantado o maldito. Lo maldito se queda pegado hasta que lo purifiques (pergamino o mesa de forja).',
      ),
    );
    const weaponCursed = isCursedGear(p.equipment.weapon);
    const armorCursed = isCursedGear(p.equipment.armor);

    out.push(h('h4', undefined, 'Armas'));
    const grid = h('div', 'cards');
    for (const id of p.weapons) {
      const w = getWeapon(id);
      if (!w) continue;
      const on = p.equipment.weapon === id;
      const known = p.identified.includes(id);
      const mod = known ? getMod(id) : undefined;
      const c = h('div', `card${on ? ' equipped' : ''}`);
      const top = h('div', 'ctop');
      const t = h('div', 'rt');
      const lvl = weaponLevel(p, id);
      t.append(h('b', mod?.kind === 'curse' ? 'cursed' : undefined, gearLabel(id, lvl, s)), h('span', undefined, `${WEAPON_KIND_NAMES[w.kind]}${on ? ' · equipada' : ''}`));
      top.append(icon(iconIdFor(id, s), 52), t);
      c.append(top, h('p', undefined, w.description), h('div', 'shape', describeWeaponPattern(w)));
      const tags = h('div', 'tags');
      tags.append(h('span', 'tag', `+${w.bonus + lvl + (mod?.power ?? 0)} de poder${lvl > 0 ? ` (mejora +${lvl})` : ''}`), h('span', 'tag', `Alcance ${w.reach}`));
      if (mod) tags.append(h('span', `tag${mod.kind === 'curse' ? ' cursed' : ''}`, mod.description));
      else if (!known) tags.append(h('span', 'tag', 'Sin identificar: ¿encantada? ¿maldita?'));
      c.append(tags);
      const b = h('button', 'use', on ? 'Equipada' : weaponCursed ? 'Tu arma está maldita' : 'Equipar (gasta un turno)');
      b.type = 'button';
      b.disabled = on || weaponCursed;
      b.addEventListener('click', () => {
        this.close();
        this.actions.equipWeapon(id);
      });
      c.append(b);
      grid.append(c);
    }
    out.push(grid);

    out.push(h('h4', undefined, 'Vestimentas'));
    const agrid = h('div', 'cards');
    for (const id of p.armors) {
      const a = getEquipment(id);
      if (!a) continue;
      const on = p.equipment.armor === id;
      const known = p.identified.includes(id);
      const mod = known ? getMod(id) : undefined;
      const c = h('div', `card${on ? ' equipped' : ''}`);
      const top = h('div', 'ctop');
      const t = h('div', 'rt');
      t.append(h('b', mod?.kind === 'curse' ? 'cursed' : undefined, gearLabel(id, 0, s)), h('span', undefined, on ? 'Puesta' : 'Vestimenta'));
      top.append(icon(iconIdFor(id, s), 52), t);
      c.append(top, h('p', undefined, a.description));
      const tags = h('div', 'tags');
      tags.append(h('span', 'tag', `+${a.bonus + (mod?.defense ?? 0)} de defensa`));
      if (mod) tags.append(h('span', `tag${mod.kind === 'curse' ? ' cursed' : ''}`, mod.description));
      else if (!known) tags.append(h('span', 'tag', 'Sin identificar: ¿encantada? ¿maldita?'));
      c.append(tags);
      const b = h('button', 'use', on ? 'Puesta' : armorCursed ? 'Tu vestimenta está maldita' : 'Ponerse (gasta un turno)');
      b.type = 'button';
      b.disabled = on || armorCursed;
      b.addEventListener('click', () => {
        this.close();
        this.actions.equipArmor(id);
      });
      c.append(b);
      agrid.append(c);
    }
    out.push(agrid);
    out.push(h('div', 'muted', 'Las mesas de forja mejoran las armas con monedas o esquirlas y purifican lo maldito. El mercader que aparece tras cada jefe vende equipo ya identificado.'));
    return out;
  }
}
