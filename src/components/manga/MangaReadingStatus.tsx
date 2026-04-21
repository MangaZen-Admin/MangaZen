"use client";

import { useState } from "react";
import {
  BookOpen,
  Bookmark,
  CheckCircle2,
  ChevronDown,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { ReadingStatus } from "@prisma/client";
import { notifyBadgesEarned } from "@/components/badges/notify-badges-earned";
import { cn } from "@/lib/utils";
import { READING_STATUS_VALUES } from "@/lib/reading-status";

type MangaReadingStatusProps = {
  mangaSlug: string;
  initialStatus: ReadingStatus | null;
  isAuthenticated: boolean;
};

const STATUS_ICONS: Record<ReadingStatus, typeof BookOpen> = {
  READING: BookOpen,
  COMPLETED: CheckCircle2,
  DROPPED: XCircle,
  PLAN_TO_READ: Bookmark,
};

export function MangaReadingStatus({
  mangaSlug,
  initialStatus,
  isAuthenticated,
}: MangaReadingStatusProps) {
  const locale = useLocale();
  const tBadges = useTranslations("badges");
  const tCat = useTranslations("catalog");
  const tProfile = useTranslations("profile");
  const tReading = useTranslations("publicProfile.readingStatus");
  const [status, setStatus] = useState<ReadingStatus | null>(initialStatus);
  const [pending, setPending] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [open, setOpen] = useState(false);

  async function persist(next: ReadingStatus | null) {
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch(`/api/manga/${mangaSlug}/reading-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: next === null ? null : next,
        }),
      });
      if (res.status === 401) {
        setShowAuthPrompt(true);
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as {
        status: ReadingStatus | null;
        badgesEarned?: { name: string; description: string }[];
      };
      notifyBadgesEarned(data.badgesEarned ?? [], tBadges);
      setStatus(data.status);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {tCat("mangaReadingSectionTitle")}
      </p>
      <div className="relative">
        <button
          type="button"
          disabled={pending}
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none transition-colors duration-200",
            "hover:border-primary hover:bg-primary/10 hover:shadow-none dark:hover:bg-card dark:hover:shadow-[0_0_14px_rgba(157,78,221,0.35)] disabled:opacity-60"
          )}
        >
          <span>
            {status ? tReading(status) : tCat("mangaReadingUnclassified")}
          </span>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition", open && "rotate-180")} />
        </button>
        {open && (
          <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg dark:shadow-2xl">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                void persist(null);
              }}
              className="block w-full px-3 py-2 text-left text-sm text-foreground transition-colors duration-200 hover:bg-primary/15 hover:text-primary"
            >
              {tCat("mangaReadingUnclassified")}
            </button>
            {READING_STATUS_VALUES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setOpen(false);
                  void persist(s);
                }}
                className="block w-full px-3 py-2 text-left text-sm text-foreground transition-colors duration-200 hover:bg-primary/15 hover:text-primary"
              >
                {tReading(s)}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {READING_STATUS_VALUES.map((s) => {
          const Icon = STATUS_ICONS[s];
          const active = status === s;
          return (
            <button
              key={s}
              type="button"
              disabled={pending}
              onClick={() => void persist(s)}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-60",
                active
                  ? "border-primary/50 bg-primary/15 text-foreground"
                  : "border-border bg-background/50 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tReading(s)}
            </button>
          );
        })}
      </div>

      {showAuthPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-4 shadow-lg dark:shadow-2xl">
            <h3 className="text-base font-semibold">{tCat("mangaAuthWallTitle")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{tCat("mangaAuthWallBody")}</p>
            <div className="mt-4 flex gap-2">
              <Link
                href={`/${locale}/login?next=${encodeURIComponent(`/manga/${mangaSlug}`)}`}
                className="inline-flex flex-1 items-center justify-center rounded-lg border border-border bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
              >
                {tProfile("login")}
              </Link>
              <Link
                href={`/${locale}/register?next=${encodeURIComponent(`/manga/${mangaSlug}`)}`}
                className="inline-flex flex-1 items-center justify-center rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground"
              >
                {tProfile("register")}
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setShowAuthPrompt(false)}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-muted/40"
            >
              {tProfile("close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
