import { type EchoRecord, parseEcho } from '../content/echo';

/** Dónde guarda el navegador al eco de la última expedición caída (una sola; la cripta no recuerda más). */
const KEY = 'ecos_del_shinobi.eco.v1';

/** Todo en try/catch: el almacenamiento puede no existir (modo privado, bloqueado) y el juego debe seguir igual. */
export function loadEcho(): EchoRecord | null {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return raw ? parseEcho(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveEcho(rec: EchoRecord): void {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(rec));
  } catch {
    /* sin almacenamiento: el eco no sobrevive a esta sesión */
  }
}

export function clearEcho(): void {
  try {
    globalThis.localStorage?.removeItem(KEY);
  } catch {
    /* nada que borrar */
  }
}
