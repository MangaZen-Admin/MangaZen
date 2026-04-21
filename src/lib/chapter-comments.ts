import { routing } from "@/i18n/routing";

export const COMMENT_MAX_LENGTH = 4000;

export type AppLocale = (typeof routing.locales)[number];

export function isAppLocale(value: string): value is AppLocale {
  return (routing.locales as readonly string[]).includes(value);
}

export const COMMENT_LOCALE_FILTERS = ["ALL", ...routing.locales] as const;

export type CommentLocaleFilter = (typeof COMMENT_LOCALE_FILTERS)[number];
