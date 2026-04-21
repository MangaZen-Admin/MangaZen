"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

type AdSlotProps = {
  slotId: string;
  className?: string;
  height?: string;
  /** Desde servidor (AdSlotShell). `undefined` = obtener por API en cliente. */
  adScript?: string | null;
};

export function AdSlot({ slotId, className = "", height = "h-24", adScript }: AdSlotProps) {
  const t = useTranslations("ads");
  const containerRef = useRef<HTMLDivElement>(null);
  const [fetchedScript, setFetchedScript] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (adScript !== undefined) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/ad-scripts?slotId=${encodeURIComponent(slotId)}`);
        const data = (await res.json()) as { script: string | null };
        if (cancelled) return;
        if (data.script) {
          setFetchedScript(data.script);
          return;
        }
        const globalRes = await fetch(`/api/ad-scripts?slotId=global`);
        const globalData = (await globalRes.json()) as { script: string | null };
        if (!cancelled) setFetchedScript(globalData.script ?? null);
      } catch {
        if (!cancelled) setFetchedScript(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slotId, adScript]);

  const resolvedScript = adScript !== undefined ? adScript : fetchedScript;

  useEffect(() => {
    if (!resolvedScript || !containerRef.current) return;
    containerRef.current.innerHTML = resolvedScript;
    const scripts = containerRef.current.querySelectorAll("script");
    scripts.forEach((oldScript) => {
      const newScript = document.createElement("script");
      Array.from(oldScript.attributes).forEach((attr) =>
        newScript.setAttribute(attr.name, attr.value)
      );
      newScript.textContent = oldScript.textContent;
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });
  }, [resolvedScript, slotId]);

  if (resolvedScript === undefined) {
    return (
      <div className={`my-4 ${className}`}>
        <div
          className={`${height} animate-pulse rounded-lg border border-dashed border-border bg-muted/20`}
        />
        <p className="mt-0.5 text-right text-[10px] text-muted-foreground/40">{t("label")}</p>
      </div>
    );
  }

  if (resolvedScript) {
    return (
      <div className={`my-4 overflow-hidden ${className}`}>
        <div ref={containerRef} />
        <p className="mt-0.5 text-right text-[10px] text-muted-foreground/40">{t("label")}</p>
      </div>
    );
  }

  return (
    <div className={`my-4 ${className}`}>
      <div
        className={`${height} flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/20`}
      >
        <span className="text-xs text-muted-foreground/40">{t("placeholder")}</span>
      </div>
      <p className="mt-0.5 text-right text-[10px] text-muted-foreground/40">{t("label")}</p>
    </div>
  );
}
