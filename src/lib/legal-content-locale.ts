/**
 * Legal copy exists only in `es-ar` and `en-us` message files.
 * Spanish site locales (es-*) use Argentina Spanish; all others use US English.
 */
export function resolveLegalContentLocale(appLocale: string): "es-ar" | "en-us" {
  return appLocale.startsWith("es") ? "es-ar" : "en-us";
}
