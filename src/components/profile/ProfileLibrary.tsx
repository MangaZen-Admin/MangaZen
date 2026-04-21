"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ReadingStatus } from "@prisma/client";
import {
  BookOpen,
  Bookmark,
  CheckCircle2,
  Library,
  PlayCircle,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export type LibraryEntry = {
  id: string;
  status: ReadingStatus;
  updatedAt: string;
  lastChapterId: string | null;
  lastPageNumber: number;
  lastChapterNumber: number | null;
  chapterCount: number;
  manga: {
    slug: string;
    title: string;
    coverImage: string | null;
    scoreAvg: number;
  };
};

type TabKey = "ALL" | "IN_PROGRESS" | ReadingStatus;

type TabLabelKey = "all" | "inProgress" | "reading" | "completed" | "dropped" | "planToRead";

const TAB_CONFIG: {
  key: TabKey;
  labelKey: TabLabelKey;
  icon: typeof BookOpen;
}[] = [
  { key: "ALL", labelKey: "all", icon: Library },
  { key: "IN_PROGRESS", labelKey: "inProgress", icon: PlayCircle },
  { key: "READING", labelKey: "reading", icon: BookOpen },
  { key: "COMPLETED", labelKey: "completed", icon: CheckCircle2 },
  { key: "DROPPED", labelKey: "dropped", icon: XCircle },
  { key: "PLAN_TO_READ", labelKey: "planToRead", icon: Bookmark },
];

type ProfileLibraryProps = {
  locale: string;
  entries: LibraryEntry[];
  title: string;
  subtitle: string;
  tabs: {
    all: string;
    inProgress: string;
    reading: string;
    completed: string;
    dropped: string;
    planToRead: string;
  };
  /** Empty copy for each tab (same keys as `tabs`). */
  emptyTabs: {
    all: string;
    inProgress: string;
    reading: string;
    completed: string;
    dropped: string;
    planToRead: string;
  };
};

function formatChapterNum(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
}

function entryHref(locale: string, entry: LibraryEntry) {
  if (entry.lastChapterId) {
    return `/${locale}/read/${entry.lastChapterId}?page=${entry.lastPageNumber}`;
  }
  return `/${locale}/manga/${entry.manga.slug}`;
}

const TAB_TO_EMPTY_KEY: Record<TabKey, keyof ProfileLibraryProps["emptyTabs"]> = {
  ALL: "all",
  IN_PROGRESS: "inProgress",
  READING: "reading",
  COMPLETED: "completed",
  DROPPED: "dropped",
  PLAN_TO_READ: "planToRead",
};

export function ProfileLibrary({
  locale,
  entries,
  title,
  subtitle,
  tabs,
  emptyTabs,
}: ProfileLibraryProps) {
  const tReading = useTranslations("publicProfile.readingStatus");
  const tCat = useTranslations("catalog");
  const [tab, setTab] = useState<TabKey>("ALL");

  const counts = useMemo(() => {
    const c = {
      ALL: entries.length,
      IN_PROGRESS: 0,
      READING: 0,
      COMPLETED: 0,
      DROPPED: 0,
      PLAN_TO_READ: 0,
    } as Record<TabKey, number>;
    for (const e of entries) {
      c[e.status] += 1;
      if (e.lastChapterId) c.IN_PROGRESS += 1;
    }
    return c;
  }, [entries]);

  const filtered = useMemo(() => {
    if (tab === "ALL") return entries;
    if (tab === "IN_PROGRESS") return entries.filter((e) => e.lastChapterId);
    return entries.filter((e) => e.status === tab);
  }, [entries, tab]);

  const emptyDescription = emptyTabs[TAB_TO_EMPTY_KEY[tab]];

  const translatedTabConfig = TAB_CONFIG.map((row) => ({
    ...row,
    label: tabs[row.labelKey],
  }));

  return (
    <section className="mt-8 rounded-xl border border-primary/20 bg-card p-5 shadow-sm dark:border-border dark:shadow-none">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-b border-border pb-3">
        {translatedTabConfig.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition",
              tab === key
                ? "border-primary/60 bg-primary/20 text-foreground"
                : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
            <span className="ml-0.5 tabular-nums text-xs opacity-70">({counts[key]})</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={BookOpen}
          title={tabs[TAB_TO_EMPTY_KEY[tab]]}
          description={emptyDescription}
        />
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {filtered.map((entry) => {
            const href = entryHref(locale, entry);
            const showBar =
              Boolean(entry.lastChapterId) &&
              entry.chapterCount > 0 &&
              entry.lastChapterNumber != null;
            const pct = showBar
              ? Math.min(100, Math.round((entry.lastChapterNumber! / entry.chapterCount) * 100))
              : 0;

            return (
              <li key={entry.id}>
                <Link
                  href={href}
                  className="flex gap-3 rounded-lg border border-border bg-background p-3 transition hover:bg-muted/40"
                >
                  <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-card">
                    {entry.manga.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={entry.manga.coverImage}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                        —
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-medium leading-snug text-foreground">{entry.manga.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {tReading(entry.status)} · ★ {entry.manga.scoreAvg.toFixed(1)}
                    </p>
                    {showBar && (
                      <div className="mt-2 space-y-1">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
                          <div
                            className="h-full rounded-full bg-primary/90 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[10px] leading-tight text-muted-foreground">
                          {tCat("profileLibraryChapterProgress", {
                            current: formatChapterNum(entry.lastChapterNumber!),
                            total: String(entry.chapterCount),
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
