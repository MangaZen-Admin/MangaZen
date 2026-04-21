"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Eye } from "lucide-react";

type MangaReaderCounterProps = {
  mangaSlug: string;
};

export function MangaReaderCounter({ mangaSlug }: MangaReaderCounterProps) {
  const t = useTranslations("presence");
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function ping() {
      try {
        const res = await fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mangaSlug }),
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { mangaReaderCount?: number };
        if (typeof data.mangaReaderCount === "number") {
          setCount(data.mangaReaderCount);
        }
      } catch {
        /* ignore */
      }
    }

    void ping();
    const id = window.setInterval(ping, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [mangaSlug]);

  if (count === null || count <= 1) return null;

  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Eye className="h-4 w-4 shrink-0 text-primary/80" aria-hidden />
      <span>{t("readingNow", { count })}</span>
    </div>
  );
}
