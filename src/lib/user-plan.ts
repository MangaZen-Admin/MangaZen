/**
 * Plan de usuario para límites dinámicos (subidas, rate limits futuros).
 * Cuando exista monetización real, reemplazar la implementación de `getUserPlan`
 * leyendo BD / suscripción; el resto del código ya usa los helpers de este archivo.
 */
export type UserPlan = "FREE" | "PREMIUM";

/** Mínimo necesario hoy; en el futuro puede ampliarse con email, stripeCustomerId, etc. */
export type UserPlanInput = { id: string; isPro?: boolean | null };

export function getUserPlan(user: UserPlanInput): UserPlan {
  return user.isPro === true ? "PREMIUM" : "FREE";
}

/** Tamaño máximo por imagen suelta o portada (bytes). */
export function maxScanImageBytes(plan: UserPlan): number {
  return plan === "PREMIUM" ? 15 * 1024 * 1024 : 5 * 1024 * 1024;
}

/** Total máximo descomprimido permitido para un ZIP de capítulo (bytes). */
export function maxZipUncompressedBytes(plan: UserPlan): number {
  return plan === "PREMIUM" ? 500 * 1024 * 1024 : 100 * 1024 * 1024;
}

/** Cantidad máxima de páginas por capítulo (ZIP o imágenes sueltas). */
export function maxChapterPages(plan: UserPlan): number {
  return plan === "PREMIUM" ? 300 : 100;
}

/** Tamaño máximo del archivo ZIP comprimido en subida (bytes). */
export function maxZipCompressedBytes(plan: UserPlan): number {
  return plan === "PREMIUM" ? 250 * 1024 * 1024 : 60 * 1024 * 1024;
}
