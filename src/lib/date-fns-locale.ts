import type { Locale } from "date-fns";
import { enGB, enUS, es, ja, ko, ptBR, zhCN } from "date-fns/locale";

/** Maps next-intl app locale (`es-ar`, `en-us`, …) to date-fns `Locale`. */
export function dateFnsLocaleFromAppLocale(appLocale: string): Locale {
  const map: Record<string, Locale> = {
    "es-ar": es,
    "es-es": es,
    "en-us": enUS,
    "en-gb": enGB,
    "pt-br": ptBR,
    "ja-jp": ja,
    "ko-kr": ko,
    "zh-cn": zhCN,
  };
  return map[appLocale] ?? enUS;
}
