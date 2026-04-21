/**
 * Tipos de umbral para insignias configurables en BD (Admin → Insignias).
 * MANUAL = sin evaluación automática por trigger (solo asignación admin u otras rutas).
 */
export const BADGE_TRIGGER_TYPES = [
  "ZEN_POINTS_TOTAL",
  "ZEN_POINTS_SPENT",
  "CHAPTERS_READ",
  "COMMENTS_POSTED",
  "SCAN_UPLOADS",
  "FAVORITES_ADDED",
  "MANUAL",
] as const;

export type BadgeTriggerType = (typeof BADGE_TRIGGER_TYPES)[number];

export function isBadgeTriggerType(v: string | null | undefined): v is BadgeTriggerType {
  return v != null && (BADGE_TRIGGER_TYPES as readonly string[]).includes(v);
}

/** Muestra campo numérico de umbral solo si hay tipo automático (no MANUAL ni vacío). */
export function badgeTriggerShowsThreshold(triggerType: string | null | undefined): boolean {
  return !!triggerType && triggerType !== "MANUAL";
}
