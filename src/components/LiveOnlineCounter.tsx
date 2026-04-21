"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const hideLiveCounter =
  typeof process.env.NEXT_PUBLIC_ZEN_BRAND === "string" &&
  process.env.NEXT_PUBLIC_ZEN_BRAND.toLowerCase() === "hentaizen";

export function LiveOnlineCounter() {
  const t = useTranslations("presence");
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (hideLiveCounter) return;

    async function heartbeat() {
      try {
        await fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        const res = await fetch("/api/presence", { method: "GET" });
        if (!res.ok) return;
        const data = (await res.json()) as { onlineCount: number };
        setCount(data.onlineCount);
      } catch {
        /* ignore */
      }
    }

    void heartbeat();
    const id = window.setInterval(heartbeat, 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (hideLiveCounter) return null;

  return (
    <p className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/35" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
      </span>
      <span>
        {count === null ? t("footerLoading") : t("footerOnline", { count })}
      </span>
    </p>
  );
}
