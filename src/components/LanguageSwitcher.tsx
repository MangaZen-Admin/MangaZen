"use client";

import { useState } from "react";
import Image from "next/image";
import { Languages } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getLocaleFlagIconUrl } from "@/lib/locale-flags";
import { cn } from "@/lib/utils";

const LOCALE_NAMES: Record<string, string> = {
  "es-ar": "Español (Argentina)",
  "es-es": "Español (España)",
  "en-us": "English (US)",
  "en-gb": "English (UK)",
  "pt-br": "Português (Brasil)",
  "ja-jp": "日本語",
  "ko-kr": "한국어",
  "zh-cn": "中文",
};

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeLocale = useLocale();
  const [open, setOpen] = useState(false);

  function handleLocaleChange(nextLocale: string) {
    if (nextLocale === activeLocale) {
      setOpen(false);
      return;
    }

    const path = pathname || "/";
    const query = Object.fromEntries(searchParams.entries());
    const hasQuery = Object.keys(query).length > 0;

    if (hasQuery) {
      router.replace({ pathname: path, query }, { locale: nextLocale });
    } else {
      router.replace(path, { locale: nextLocale });
    }
    router.refresh();
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "relative flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2 text-xs font-medium text-foreground outline-none transition hover:border-primary hover:bg-primary/10 hover:shadow-none dark:hover:bg-card dark:hover:shadow-[0_0_14px_rgba(157,78,221,0.35)]",
          open && "z-[110]"
        )}
      >
        <Languages className="h-3.5 w-3.5 text-muted-foreground" />
        <Image
          src={getLocaleFlagIconUrl(activeLocale)}
          alt={activeLocale}
          width={14}
          height={14}
          className="h-3.5 w-3.5 rounded-[2px]"
        />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-[99]"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="fixed right-2 top-16 z-[100] flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1.5 shadow-lg dark:shadow-2xl sm:absolute sm:right-0 sm:top-auto sm:mt-2">
          {routing.locales.map((locale) => (
            <button
              key={locale}
              type="button"
              title={LOCALE_NAMES[locale] ?? locale}
              aria-label={LOCALE_NAMES[locale] ?? locale}
              onClick={() => handleLocaleChange(locale)}
              className="rounded-md p-1.5 transition-colors duration-200 hover:bg-primary/15"
            >
              <Image
                src={getLocaleFlagIconUrl(locale)}
                alt={locale}
                width={16}
                height={16}
                className="h-4 w-4 rounded-[2px]"
              />
            </button>
          ))}
          </div>
        </>
      )}
    </div>
  );
}
