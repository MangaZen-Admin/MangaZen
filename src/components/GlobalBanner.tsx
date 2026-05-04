"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { X, AlertTriangle, Info, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type BannerData = {
  id: string;
  message: string;
  type: "info" | "warning" | "urgent";
  isDismissible: boolean;
};

const STORAGE_KEY = "mangazen-dismissed-banner";

export function GlobalBanner() {
  const locale = useLocale();
  const [banner, setBanner] = useState<BannerData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/global-banner", {
          headers: { "x-locale": locale },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { banner: BannerData | null };
        if (!data.banner) return;
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored === data.banner.id) {
          setDismissed(true);
        }
        setBanner(data.banner);
      } catch {
        // ignorar
      }
    })();
  }, [locale]);

  function dismiss() {
    if (!banner) return;
    sessionStorage.setItem(STORAGE_KEY, banner.id);
    setDismissed(true);
  }

  if (!banner || dismissed) return null;

  const styles = {
    info: {
      wrapper: "border-sky-500/40 bg-sky-500/10 text-sky-900 dark:text-sky-100",
      icon: <Info className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-300" aria-hidden />,
    },
    warning: {
      wrapper: "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100",
      icon: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" aria-hidden />,
    },
    urgent: {
      wrapper: "border-red-500/40 bg-red-500/10 text-red-900 dark:text-red-100",
      icon: <Zap className="h-4 w-4 shrink-0 text-red-600 dark:text-red-300" aria-hidden />,
    },
  }[banner.type];

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn("w-full border-b px-4 py-2.5", styles.wrapper)}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {styles.icon}
          <p className="text-sm font-medium leading-snug">{banner.message}</p>
        </div>
        {banner.isDismissible && (
          <button
            type="button"
            onClick={dismiss}
            aria-label="Cerrar"
            className="shrink-0 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
