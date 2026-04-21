"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { getPublicProfileUrlKey } from "@/lib/public-profile-url";
import type { CommunityRankingEntry, CommunityRankingsPayload } from "@/types/community-rankings";

type TabId = "readers" | "donors" | "scans";

function initial(name: string | null, fallback: string) {
  const s = name?.trim();
  if (!s) return fallback.charAt(0).toUpperCase();
  return s.charAt(0).toUpperCase();
}

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-600 text-xs font-bold text-amber-950 shadow-sm ring-2 ring-amber-400/40">
        <Trophy className="h-4 w-4" aria-hidden />
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-400 text-xs font-bold text-slate-800 shadow-sm ring-2 ring-slate-400/50 dark:from-slate-500 dark:to-slate-600 dark:text-slate-100">
        <Trophy className="h-4 w-4" aria-hidden />
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-300 to-orange-700 text-xs font-bold text-orange-950 shadow-sm ring-2 ring-orange-600/40">
        <Trophy className="h-4 w-4" aria-hidden />
      </span>
    );
  }
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted/60 text-sm font-semibold tabular-nums text-muted-foreground">
      {rank}
    </span>
  );
}

function RankingList({
  entries,
  unit,
  anonymousName,
  emptyMessage,
  emptyDescription,
  locale,
}: {
  entries: CommunityRankingEntry[];
  unit: string;
  anonymousName: string;
  emptyMessage: string;
  emptyDescription: string;
  locale: string;
}) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title={emptyMessage}
        description={emptyDescription}
      />
    );
  }

  return (
    <ul className="space-y-2">
      {entries.map((entry, i) => {
        const rank = i + 1;
        const display = entry.name?.trim() ? entry.name : anonymousName;
        const profileKey = getPublicProfileUrlKey({
          id: entry.userId,
          username: entry.username,
        });
        const profileHref = `/${locale}/user/${encodeURIComponent(profileKey)}`;
        const top3 = rank <= 3;
        return (
          <li
            key={entry.userId}
            className={cn(
              "flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors",
              top3 && rank === 1 && "border border-amber-500/25 bg-gradient-to-r from-amber-500/12 to-transparent dark:from-amber-500/15",
              top3 && rank === 2 && "border border-slate-400/25 bg-gradient-to-r from-slate-400/10 to-transparent dark:from-slate-500/12",
              top3 && rank === 3 && "border border-orange-600/25 bg-gradient-to-r from-orange-600/10 to-transparent dark:from-orange-600/12",
              !top3 && "hover:bg-muted/40",
            )}
          >
            <RankMedal rank={rank} />
            <Link
              href={profileHref}
              className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-border bg-muted outline-none ring-offset-background transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {entry.image ? (
                <Image
                  src={entry.image}
                  alt=""
                  fill
                  sizes="36px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-primary">
                  {initial(entry.name, anonymousName)}
                </span>
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={profileHref}
                className="block truncate text-sm font-medium text-foreground hover:text-primary hover:underline"
              >
                {display}
              </Link>
            </div>
            <p className="shrink-0 text-sm font-semibold tabular-nums text-primary">
              {entry.count.toLocaleString()} <span className="font-normal text-muted-foreground">{unit}</span>
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export function CommunityRankings() {
  const t = useTranslations("community.rankings");
  const locale = useLocale();
  const [tab, setTab] = useState<TabId>("readers");
  const [data, setData] = useState<CommunityRankingsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/community/rankings");
        if (!res.ok) {
          if (!cancelled) setError(t("loadError"));
          return;
        }
        const json = (await res.json()) as CommunityRankingsPayload;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError(t("loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const fallbackName = t("fallbackName");

  const tabs: { id: TabId; label: string }[] = [
    { id: "readers", label: t("tabReaders") },
    { id: "donors", label: t("tabDonors") },
    { id: "scans", label: t("tabScans") },
  ];

  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>

      <div className="mt-4 flex flex-wrap gap-2 border-b border-border pb-3">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              tab === id
                ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 min-h-[12rem]">
        {loading && (
          <div className="space-y-2" aria-busy aria-label={t("loading")}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg px-2 py-2.5"
              >
                <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted" />
                <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
                <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
                <div className="h-4 w-16 shrink-0 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <p className="py-6 text-center text-sm text-destructive">{error}</p>
        )}

        {!loading && !error && data && (
          <>
            {tab === "readers" && (
              <RankingList
                entries={data.topReaders}
                unit={t("unitMangas")}
                anonymousName={fallbackName}
                emptyMessage={t("empty")}
                emptyDescription={t("emptyDescription")}
                locale={locale}
              />
            )}
            {tab === "donors" && (
              <RankingList
                entries={data.topDonors}
                unit="ZC"
                anonymousName={fallbackName}
                emptyMessage={t("empty")}
                emptyDescription={t("emptyDescription")}
                locale={locale}
              />
            )}
            {tab === "scans" && (
              <RankingList
                entries={data.topScans}
                unit={t("unitChapters")}
                anonymousName={fallbackName}
                emptyMessage={t("empty")}
                emptyDescription={t("emptyDescription")}
                locale={locale}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}
