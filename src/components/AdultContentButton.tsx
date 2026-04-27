"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function AdultContentButton() {
  const t = useTranslations("adultContent");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen((p) => !p)}
        className="h-8 touch-manipulation border-primary px-2 text-xs font-bold text-violet-300 hover:bg-primary hover:text-primary-foreground dark:text-violet-200"
      >
        +18
      </Button>
      {open && (
        <div className="absolute right-0 top-10 z-[100] w-52 rounded-xl border border-border bg-card p-3 shadow-lg dark:shadow-2xl sm:left-1/2 sm:-translate-x-1/2 sm:right-auto">
          <p className="text-center text-xs font-medium text-foreground">{t("title")}</p>
          <p className="mt-1 text-center text-[11px] text-muted-foreground">{t("subtitle")}</p>
        </div>
      )}
    </div>
  );
}
