/**
 * Búsquedas vía Prisma `contains` (parámetros preparados; no usar $queryRaw con texto libre).
 * Normalización del término en el servidor antes de tocar la BD.
 */
export const MAX_SEARCH_QUERY_LENGTH = 100;

/** Quita caracteres de control, recorta y limita longitud. */
export function sanitizeSearchQuery(raw: string): string {
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, MAX_SEARCH_QUERY_LENGTH);
}
