"use client";

import Confetti from "react-confetti";
import { toast } from "sonner";

export type EarnedBadgeToast = {
  name: string;
  description: string;
};

export function notifyBadgesEarned(
  earned: EarnedBadgeToast[],
  t: (key: "earnedTitle") => string
) {
  if (earned.length === 0) return;

  for (const b of earned) {
    toast.custom(
      () => (
        <div className="relative w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-primary/35 bg-card/95 p-4 shadow-xl backdrop-blur-md dark:border-primary/45 dark:shadow-[0_0_40px_rgba(157,78,221,0.25)]">
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl opacity-90">
            <Confetti
              width={360}
              height={220}
              numberOfPieces={72}
              recycle={false}
              gravity={0.22}
              colors={["#9D4EDD", "#D9C9F2", "#E9D5FF", "#FFFFFF", "#C4B5FD"]}
            />
          </div>
          <div className="relative z-10">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              {t("earnedTitle")}
            </p>
            <p className="mt-1 text-base font-bold leading-snug text-foreground">{b.name}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{b.description}</p>
          </div>
        </div>
      ),
      { duration: 6500 }
    );
  }
}
