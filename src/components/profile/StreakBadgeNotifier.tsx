"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { notifyBadgesEarned } from "@/components/badges/notify-badges-earned";

const STORAGE_KEY = "mz_last_streak_notified";

export function StreakBadgeNotifier() {
  const tBadges = useTranslations("badges");
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    void (async () => {
      try {
        const res = await fetch("/api/user/streak");
        if (!res.ok) return;
        const data = await res.json() as {
          streak: number;
          milestoneReached: number | null;
          earnedBadge: { name: string; description: string } | null;
        };

        if (!data.earnedBadge || !data.milestoneReached) return;

        // Evitar notificar el mismo hito más de una vez por sesión de navegador
        const storageKey = `${STORAGE_KEY}_${data.milestoneReached}`;
        if (sessionStorage.getItem(storageKey)) return;
        sessionStorage.setItem(storageKey, "1");

        notifyBadgesEarned([data.earnedBadge], tBadges);
      } catch {
        // silencioso
      }
    })();
  }, [tBadges]);

  return null;
}
