"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type AdSlotProps = {
  slotId: string;
  className?: string;
  height?: string;
  adScripts?: string[];
};

const ALLOWED_AD_DOMAINS = [
  "effectivecpmnetwork.com",
  "highperformanceformat.com",
  "hilltopads.net",
  "hilltopads.com",
  "monetag.com",
  "adsterra.com",
  "googlesyndication.com",
];

function isAllowedScript(script: string): boolean {
  try {
    const srcMatch = script.match(/src=["']([^"']+)["']/g);
    if (!srcMatch) return true; // script inline sin src externo
    return srcMatch.every((src) => {
      const url = src.replace(/src=["']/, "").replace(/["']$/, "");
      try {
        const { hostname } = new URL(url);
        return ALLOWED_AD_DOMAINS.some((domain) => hostname.endsWith(domain));
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

function SingleAd({ script }: { script: string }) {
  if (!isAllowedScript(script)) {
    console.warn("[AdSlot] Script bloqueado por dominio no permitido.");
    return null;
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:0;display:flex;align-items:center;justify-content:center;}</style></head><body>${script}</body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  return (
    <iframe
      src={url}
      sandbox="allow-scripts allow-same-origin"
      className="flex flex-1 items-center justify-center overflow-hidden border-0"
      style={{ minHeight: 60 }}
      onLoad={() => URL.revokeObjectURL(url)}
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
