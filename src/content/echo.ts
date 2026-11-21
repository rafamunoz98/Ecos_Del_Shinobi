import type { Affinity, GameState } from '../core/types';
import { AFFINITIES } from './affinities';

/*
 * El eco de la expedición anterior. Cuando una expedición termina en derrota, la cripta recuerda a quien cayó: en la
 * siguiente, un sector sin jefe (2, 4 o 5, según la semilla) guarda su ECO, un mini-jefe con la afinidad y el nivel con
 * que murió. Vencerlo libera su equipo, purificado, y apaga el eco (la cripta deja de recordarlo).
 */

/** Lo que se recuerda de una expedición caída (se guarda en el navegador; ver presentation/echoStore). */
export interface EchoRecord {
  affinity: Affinity;
  affinity2: Affinity | null;
  /** Nivel con el que cayó. */
  level: number;
  /** Sector en el que cayó (solo de relato). */
  floor: number;
  /** Arma y vestimenta que llevaba (ids con su encantamiento, si lo tenían). */
  weapon: string | null;
  armor: string | null;
}

/** Sectores sin jefe donde puede esperar el eco. */
export const ECHO_FLOORS: readonly number[] = [2, 4, 5];

export const echoKind = (a: Affinity): string => `eco_${a}`;
export const isEchoKind = (kind: string): boolean => kind.startsWith('eco_') && AFFINITIES.includes(kind.slice(4) as Affinity);

/** Vida, poder y defensa del eco según el nivel con el que cayó quien fue. */
export function echoStats(rec: EchoRecord): { maxHp: number; power: number; defense: number } {
  const level = Math.max(1, Math.min(rec.level, 12));
  return { maxHp: 16 + 6 * level, power: 5 + Math.floor(level / 2), defense: 1 + Math.floor(level / 4) };
}

/** Lo que se guarda al caer. */
export function echoFromState(s: GameState): EchoRecord {
  const p = s.player;
  return { affinity: p.affinity, affinity2: p.affinity2, level: p.level, floor: s.floor, weapon: p.equipment.weapon, armor: p.equipment.armor };
}

const isAffinity = (v: unknown): v is Affinity => typeof v === 'string' && AFFINITIES.includes(v as Affinity);

/** Valida lo que llega de fuera (almacenamiento del navegador): ante cualquier duda, no hay eco. */
export function parseEcho(raw: unknown): EchoRecord | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!isAffinity(r.affinity)) return null;
  if (r.affinity2 !== null && !isAffinity(r.affinity2)) return null;
  const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  if (!num(r.level) || !num(r.floor)) return null;
  const gear = (v: unknown): string | null | undefined => (v === null ? null : typeof v === 'string' && v.length <= 80 ? v : undefined);
  const weapon = gear(r.weapon);
  const armor = gear(r.armor);
  if (weapon === undefined || armor === undefined) return null;
  return { affinity: r.affinity, affinity2: r.affinity2 as Affinity | null, level: Math.max(1, Math.min(Math.floor(r.level), 99)), floor: Math.max(1, Math.min(Math.floor(r.floor), 99)), weapon, armor };
}
