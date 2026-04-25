"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { getBadgeDescI18nKey, getBadgeI18nKey } from "@/lib/badges/badge-i18n";
import { BADGE_LUCIDE_MAP } from "@/lib/badges/badge-icons";

type BadgeIconProps = {
  name: string;
  description: string;
  iconUrl: string | null;
  iconKey?: string | null;
  isHighlighted?: boolean;
};

export function BadgeIcon({
  name,
  description,
  iconUrl,
  iconKey = null,
  isHighlighted = false,
}: BadgeIconProps) {
  const t = useTranslations("badges");
  const nameKey = getBadgeI18nKey(name);
  const descKey = getBadgeDescI18nKey(name);
  const displayName = t.has(nameKey) ? t(nameKey) : name;
  const displayDesc = t.has(descKey) ? t(descKey) : description;

  const LucideIcon =
    iconKey && typeof iconKey === "string" ? (BADGE_LUCIDE_MAP[iconKey] ?? null) : null;
  const highlighted =
    isHighlighted || name.toLowerCase().includes("pilar de la comunidad");

  const wrapRef = useRef<HTMLDivElement>(null);
  const [tipPos, setTipPos] = useState<{ left: number; top: number } | null>(null);

  const showTip = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setTipPos({
      left: r.left + r.width / 2,
      top: r.top,
    });
  }, []);

  const hideTip = useCallback(() => setTipPos(null), []);

  const tipOpen = tipPos != null;
  useEffect(() => {
    if (!tipOpen) return;
    const update = () => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setTipPos({ left: r.left + r.width / 2, top: r.top });
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [tipOpen]);

  const tooltip =
    tipPos != null &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        className={cn(
          "pointer-events-none fixed z-[9999] w-56 rounded-xl border border-primary/25 bg-background/95 px-3 py-2.5 text-left text-xs text-foreground shadow-lg backdrop-blur-md dark:border-primary/35 dark:bg-card/95 dark:shadow-[0_8px_32px_rgba(0,0,0,0.45)]"
        )}
        style={{
          left: tipPos.left,
          top: tipPos.top,
          transform: "translate(-50%, calc(-100% - 8px))",
        }}
        role="tooltip"
      >
        <p className="font-semibold leading-snug text-foreground">{displayName}</p>
        <p className="mt-1.5 leading-relaxed text-muted-foreground">{displayDesc}</p>
      </div>,
      document.body
    );

  return (
    <div
      ref={wrapRef}
      className="relative flex flex-col items-center"
      onMouseEnter={showTip}
      onMouseLeave={hideTip}
      onFocus={showTip}
      onBlur={hideTip}
    >
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border-2 border-primary/45 bg-primary/10 text-primary shadow-none transition-all duration-300 dark:border-primary/40 dark:bg-card dark:shadow-[0_0_20px_rgba(157,78,221,0.2)]",
          highlighted &&
            "border-primary dark:border-primary/55 dark:shadow-[0_0_28px_rgba(157,78,221,0.5)] dark:animate-pulse",
          highlighted &&
            "ring-2 ring-primary/50 ring-offset-2 ring-offset-background dark:ring-primary/40 dark:ring-offset-background"
        )}
      >
        {iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={iconUrl} alt={displayName} className="h-full w-full object-cover" />
        ) : LucideIcon != null ? (
          <LucideIcon
            className={cn(
              "h-6 w-6",
              highlighted && "dark:drop-shadow-[0_0_10px_rgba(167,139,250,0.9)]"
            )}
            strokeWidth={2.25}
            aria-hidden
          />
        ) : (
          <span className="text-sm font-semibold text-foreground">
            {displayName.slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>

      {tooltip}
    </div>
  );
}
