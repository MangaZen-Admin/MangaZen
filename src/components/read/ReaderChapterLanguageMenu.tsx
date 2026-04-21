"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getLocaleFlagIconUrl } from "@/lib/locale-flags";
import { cn } from "@/lib/utils";

export type ChapterLanguageOption = {
  locale: string;
  chapterId: string | null;
};

/** Nombres para UI (alineado con LanguageSwitcher). */
const LOCALE_DISPLAY_NAME: Record<string, string> = {
  "es-ar": "Español (Argentina)",
  "es-es": "Español (España)",
  "en-us": "English (US)",
  "en-gb": "English (UK)",
  "pt-br": "Português (Brasil)",
  "ja-jp": "日本語",
  "ko-kr": "한국어",
  "zh-cn": "中文",
};

export function getReaderLocaleDisplayName(locale: string): string {
  return LOCALE_DISPLAY_NAME[locale] ?? locale;
}

type ReaderChapterLanguageMenuProps = {
  chapterLocale: string;
  options: ChapterLanguageOption[];
  currentPage: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ReaderChapterLanguageMenu({
  chapterLocale,
  options,
  currentPage,
  open,
  onOpenChange,
}: ReaderChapterLanguageMenuProps) {
  const t = useTranslations("reader");
  const router = useRouter();
  const currentLower = chapterLocale.toLowerCase();
  const codeShort = currentLower.split("-")[0]?.toUpperCase() ?? "?";

  function navigateToLocale(locale: string, id: string) {
    const q = currentPage > 1 ? `?page=${currentPage}` : "";
    router.push(`/${locale}/read/${id}${q}`);
    onOpenChange(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t("chapterLanguageAria")}
        onClick={() => onOpenChange(!open)}
        className={cn(
          "flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border/50 bg-muted px-2 text-xs font-medium text-muted-foreground transition-colors",
          "hover:bg-muted/80 hover:text-foreground"
        )}
      >
        <Image
          src={getLocaleFlagIconUrl(chapterLocale)}
          alt=""
          width={18}
          height={18}
          className="h-[18px] w-[18px] rounded-[2px]"
        />
        <span className="max-w-[2.25rem] truncate tabular-nums sm:max-w-none">{codeShort}</span>
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[38] cursor-default bg-transparent"
            aria-hidden
            tabIndex={-1}
            onClick={() => onOpenChange(false)}
          />
          <ul
            className="absolute right-0 top-full z-[39] mt-1 max-h-[min(70vh,22rem)] min-w-[240px] overflow-y-auto rounded-md border border-border/50 bg-background/95 py-1 shadow-lg backdrop-blur-md"
            role="listbox"
            aria-label={t("chapterLanguageMenuTitle")}
          >
            {options.map((opt) => {
              const active = opt.locale.toLowerCase() === currentLower;
              const disabled = opt.chapterId == null;
              const label = getReaderLocaleDisplayName(opt.locale);
              return (
                <li key={opt.locale} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    disabled={disabled}
                    title={disabled ? t("languageNotAvailable") : undefined}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors",
                      disabled
                        ? "cursor-not-allowed opacity-50"
                        : "cursor-pointer hover:bg-muted/80",
                      active && !disabled && "bg-primary/10 text-foreground"
                    )}
                    onClick={() => {
                      if (disabled || !opt.chapterId) return;
                      navigateToLocale(opt.locale, opt.chapterId);
                    }}
                  >
                    <Image
                      src={getLocaleFlagIconUrl(opt.locale)}
                      alt=""
                      width={20}
                      height={20}
                      className="h-5 w-5 shrink-0 rounded-[2px]"
                    />
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    {active ? (
                      <span className="shrink-0 text-xs font-medium text-primary" aria-current="true">
                        {t("languageCurrent")}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
}
