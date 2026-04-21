import { isSameLocale } from "@/lib/locale-flags";

export function pickStartChapter<T extends { id: string; number: number; locale: string }>(
  chapters: T[],
  userLocale: string
): T | null {
  if (chapters.length === 0) return null;
  const inLocale = chapters.filter((c) => isSameLocale(userLocale, c.locale));
  const pool = inLocale.length > 0 ? inLocale : chapters;
  return pool.reduce((best, c) => (c.number < best.number ? c : best));
}
