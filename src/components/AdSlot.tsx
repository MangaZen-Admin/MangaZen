"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

type AdSlotProps = {
  slotId: string;
  className?: string;
  height?: string;
  adScripts?: string[];
};

function SingleAd({ script }: { script: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = script;
    const scripts = containerRef.current.querySelectorAll("script");
    scripts.forEach((oldScript) => {
      const newScript = document.createElement("script");
      Array.from(oldScript.attributes).forEach((attr) =>
        newScript.setAttribute(attr.name, attr.value)
      );
      newScript.textContent = oldScript.textContent;
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });
  }, [script]);

  return (
    <div
      ref={containerRef}
      className="flex flex-1 items-center justify-center overflow-hidden"
    />
  );
}

export function AdSlot({ slotId, className = "", height = "h-24", adScripts }: AdSlotProps) {
  const t = useTranslations("ads");
  const [fetchedScripts, setFetchedScripts] = useState<string[] | undefined>(undefined);

  useEffect(() => {
    if (adScripts !== undefined) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/ad-scripts?slotId=${encodeURIComponent(slotId)}`);
        const data = (await res.json()) as { scripts?: string[] };
        if (cancelled) return;
        if (data.scripts && data.scripts.length > 0) {
          setFetchedScripts(data.scripts);
          return;
        }
        const globalRes = await fetch(`/api/ad-scripts?slotId=global`);
        const globalData = (await globalRes.json()) as { scripts?: string[] };
        if (!cancelled) setFetchedScripts(globalData.scripts ?? []);
      } catch {
        if (!cancelled) setFetchedScripts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slotId, adScripts]);

  const resolvedScripts = adScripts !== undefined ? adScripts : fetchedScripts;

  // Cargando
  if (resolvedScripts === undefined) {
    return (
      <div className={`my-4 ${className}`}>
        <div className={`${height} animate-pulse rounded-lg border border-dashed border-border bg-muted/20`} />
        <p className="mt-0.5 text-right text-[10px] text-foreground/60">{t("label")}</p>
      </div>
    );
  }

  // Con anuncios
  if (resolvedScripts.length > 0) {
    return (
      <div className={`my-4 ${className}`}>
        <div className="flex items-center justify-center gap-3">
          {resolvedScripts.map((script, i) => (
            <SingleAd key={i} script={script} />
          ))}
        </div>
        <p className="mt-0.5 text-right text-[10px] text-foreground/60">{t("label")}</p>
      </div>
    );
  }

  // Sin anuncios — placeholder
  return (
    <div className={`my-4 ${className}`}>
      <div className={`${height} flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/20`}>
        <span className="text-xs text-foreground/60">{t("placeholder")}</span>
      </div>
      <p className="mt-0.5 text-right text-[10px] text-foreground/60">{t("label")}</p>
    </div>
  );
}
