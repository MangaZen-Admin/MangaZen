import type { AppLocale } from "@/lib/chapter-comments";
import { isAppLocale } from "@/lib/chapter-comments";

export { isAppLocale };

/** Campo `Chapter.language` (código corto) según locale de interfaz. */
export function chapterLanguageFromLocale(locale: AppLocale): string {
  if (locale.startsWith("en")) return "EN";
  if (locale.startsWith("pt")) return "PT";
  return "ES";
}
