/**
 * Presencia en memoria (un solo proceso Node).
 *
 * En producción con varias instancias o serverless, migrar a Redis u otro store
 * compartido; el Map local no se sincroniza entre réplicas.
 */

const TTL_MS = 5 * 60 * 1000;

export type PresenceEntry = {
  lastSeen: number;
  /** Manga activo; undefined = no cambiar el valor previo (heartbeat global). */
  mangaSlug?: string | null;
};

const presence = new Map<string, PresenceEntry>();

function isFresh(entry: PresenceEntry, now: number): boolean {
  return now - entry.lastSeen <= TTL_MS;
}

/**
 * Registra o renueva presencia. `mangaSlug === undefined` mantiene la asociación
 * anterior (útil para heartbeats sin contexto de manga).
 */
export function registerPresence(visitorKey: string, mangaSlug?: string | null): void {
  const prev = presence.get(visitorKey);
  const next: PresenceEntry = {
    lastSeen: Date.now(),
    mangaSlug:
      mangaSlug === undefined ? prev?.mangaSlug : mangaSlug === null ? null : mangaSlug,
  };
  presence.set(visitorKey, next);
}

export function cleanExpired(): void {
  const now = Date.now();
  for (const [key, entry] of presence) {
    if (!isFresh(entry, now)) {
      presence.delete(key);
    }
  }
}

export function getOnlineCount(): number {
  const now = Date.now();
  let n = 0;
  for (const entry of presence.values()) {
    if (isFresh(entry, now)) n += 1;
  }
  return n;
}

export function getMangaReaderCount(mangaSlug: string): number {
  const now = Date.now();
  let n = 0;
  for (const entry of presence.values()) {
    if (!isFresh(entry, now)) continue;
    if (entry.mangaSlug === mangaSlug) n += 1;
  }
  return n;
}
