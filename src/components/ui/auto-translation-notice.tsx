"use client";

import { Info } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

const AUTO_TRANSLATION_LOCALES = new Set(["ja-jp", "ko-kr", "zh-cn"]);

export function AutoTranslationNotice() {
  const locale = useLocale();
  const t = useTranslations("legal");

  if (!AUTO_TRANSLATION_LOCALES.has(locale)) {
    return null;
  }

  const text = t("autoTranslationNotice");
  if (!text?.trim()) {
    return null;
  }

  return (
    <div
      role="status"
      className="border-b border-border/60 bg-muted/35 px-4 py-2.5 text-muted-foreground"
    >
      <div className="mx-auto flex max-w-6xl items-start gap-2 sm:gap-2.5">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
        <p className="text-xs leading-relaxed">{text}</p>
      </div>
    </div>
  );
}
