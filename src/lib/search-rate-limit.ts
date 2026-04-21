import type { UserRole } from "@prisma/client";

/** Roles con trabajo frecuente de catálogo: límites de búsqueda más altos. */
export function isElevatedSearchRole(role: UserRole | null | undefined): boolean {
  return role === "ADMIN" || role === "SCAN" || role === "CREATOR";
}

export const SEARCH_WINDOW_MS = 60_000;

/** Sugerencias navbar (público, con sesión opcional). */
export const SEARCH_SUGGESTIONS_LIMIT_DEFAULT = 30;
export const SEARCH_SUGGESTIONS_LIMIT_ELEVATED = 120;

/** Panel Scan — búsqueda de mangas (autenticado). */
export const SCAN_MANGA_SEARCH_LIMIT_DEFAULT = 40;
export const SCAN_MANGA_SEARCH_LIMIT_ELEVATED = 180;
