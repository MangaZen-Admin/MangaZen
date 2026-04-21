export const LOCALE_TO_FLAG: Record<string, string> = {
  "es-ar": "🇦🇷",
  "es-es": "🇪🇸",
  "en-us": "🇺🇸",
  "en-gb": "🇬🇧",
  "pt-br": "🇧🇷",
  "ja-jp": "🇯🇵",
  "ko-kr": "🇰🇷",
  "zh-cn": "🇨🇳",
};

const LOCALE_TO_TWEMOJI: Record<string, string> = {
  "es-ar": "1f1e6-1f1f7",
  "es-es": "1f1ea-1f1f8",
  "en-us": "1f1fa-1f1f8",
  "en-gb": "1f1ec-1f1e7",
  "pt-br": "1f1e7-1f1f7",
  "ja-jp": "1f1ef-1f1f5",
  "ko-kr": "1f1f0-1f1f7",
  "zh-cn": "1f1e8-1f1f3",
};

const ES_ORDER = ["es-ar", "es-es"] as const;
const EN_ORDER = ["en-us", "en-gb"] as const;
const PT_ORDER = ["pt-br"] as const;

function getFamily(locale: string): "es" | "en" | "pt" | "other" {
  if (locale.startsWith("es-")) return "es";
  if (locale.startsWith("en-")) return "en";
  if (locale.startsWith("pt-")) return "pt";
  return "other";
}

function orderedForFamily(family: "es" | "en" | "pt") {
  if (family === "es") return ES_ORDER;
  if (family === "en") return EN_ORDER;
  return PT_ORDER;
}

export function getLocaleFlag(locale: string): string {
  return LOCALE_TO_FLAG[locale.toLowerCase()] ?? "🌐";
}

export function getLocaleFlagIconUrl(locale: string): string {
  const code = LOCALE_TO_TWEMOJI[locale.toLowerCase()];
  if (!code) return "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f310.svg";
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${code}.svg`;
}

export function getCardFlagsForLocale(currentLocale: string, chapterLocales: string[]): string[] {
  return getCardLocalesForLocale(currentLocale, chapterLocales).map((locale) => getLocaleFlag(locale));
}

export function getCardLocalesForLocale(currentLocale: string, chapterLocales: string[]): string[] {
  const normalized = Array.from(new Set(chapterLocales.map((l) => l.toLowerCase())));
  const userLocale = currentLocale.toLowerCase();
  const userFamily = getFamily(userLocale);

  const result: string[] = [];
  const pushFamilyFlags = (family: "es" | "en" | "pt") => {
    const ordered = orderedForFamily(family);
    ordered.forEach((loc) => {
      if (normalized.includes(loc)) {
        result.push(loc);
      }
    });
  };

  if (userFamily === "es" || userFamily === "en" || userFamily === "pt") {
    pushFamilyFlags(userFamily);
  }

  const hasSpanish = normalized.some((l) => l.startsWith("es-"));
  const hasEnglish = normalized.some((l) => l.startsWith("en-"));

  // If mixed catalog (es + en), surface both language families.
  if (hasSpanish && hasEnglish) {
    if (!result.some((f) => f.startsWith("es-"))) {
      pushFamilyFlags("es");
    }
    if (!result.some((f) => f.startsWith("en-"))) {
      pushFamilyFlags("en");
    }
  }

  if (result.length === 0) {
    normalized.slice(0, 3).forEach((loc) => result.push(loc));
  }

  return Array.from(new Set(result)).slice(0, 4);
}

export function isSameLocale(currentLocale: string, chapterLocale: string): boolean {
  return currentLocale.toLowerCase() === chapterLocale.toLowerCase();
}
