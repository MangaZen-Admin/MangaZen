/** next-intl locale `es-ar` → BCP 47 for Intl / toLocaleString */
export function appLocaleToBcp47(locale: string): string {
  const parts = locale.split("-");
  if (parts.length < 2) return locale;
  return `${parts[0]}-${parts[1].toUpperCase()}`;
}
