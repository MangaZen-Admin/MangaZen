"use client";

import { Fragment, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import type { Locale } from "date-fns";
import { useTranslations } from "next-intl";
import { Megaphone, BookOpen, BookMarked, Users, Pin, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { dateFnsLocaleFromAppLocale } from "@/lib/date-fns-locale";
import { AdSlot } from "@/components/AdSlot";

type Announcement = {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  isPinned: boolean;
  publishedAt: string;
};

type RecentChapter = {
  id: string;
  number: number;
  title: string | null;
  locale: string;
  createdAt: string;
  manga: { slug: string; title: string; coverImage: string | null };
};

type RecentManga = {
  slug: string;
  title: string;
  coverImage: string | null;
  type: string;
  createdAt: string;
  tags: { tag: { name: string } }[];
};

type RecentScan = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  role: string;
  createdAt: string;
};

type NewsPayload = {
  announcements: Announcement[];
  recentChapters: RecentChapter[];
  recentMangas: RecentManga[];
  recentScans: RecentScan[];
};

type FeedItem =
  | { kind: "announcement"; data: Announcement; date: string }
  | { kind: "chapter"; data: RecentChapter; date: string }
  | { kind: "manga"; data: RecentManga; date: string }
  | { kind: "scan"; data: RecentScan; date: string };

type TabId = "all" | "announcements" | "chapters" | "mangas" | "scans";

type TFn = ReturnType<typeof useTranslations<"news">>;

export function NewsPageClient({ locale, showAds }: { locale: string; showAds: boolean }) {
  const t = useTranslations("news");
  const dfLocale = dateFnsLocaleFromAppLocale(locale);
  const [data, setData] = useState<NewsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/news", { headers: { "x-locale": locale } });
        if (!res.ok) {
          setError(t("loadError"));
          return;
        }
        setData((await res.json()) as NewsPayload);
      } catch {
        setError(t("loadError"));
      } finally {
        setLoading(false);
      }
    })();
  }, [t, locale]);

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "all", label: t("tabAll"), icon: BookOpen },
    { id: "announcements", label: t("tabAnnouncements"), icon: Megaphone },
    { id: "chapters", label: t("tabChapters"), icon: BookMarked },
    { id: "mangas", label: t("tabMangas"), icon: BookOpen },
    { id: "scans", label: t("tabScans"), icon: Users },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-muted/60" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-sm text-destructive">{error ?? t("loadError")}</p>;
  }

  const allFeed: FeedItem[] = [
    ...data.announcements.map((a) => ({ kind: "announcement" as const, data: a, date: a.publishedAt })),
    ...data.recentChapters.map((c) => ({ kind: "chapter" as const, data: c, date: c.createdAt })),
    ...data.recentMangas.map((m) => ({ kind: "manga" as const, data: m, date: m.createdAt })),
    ...data.recentScans.map((s) => ({ kind: "scan" as const, data: s, date: s.createdAt })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const pinnedFirst = [
    ...allFeed.filter((f) => f.kind === "announcement" && (f.data as Announcement).isPinned),
    ...allFeed.filter((f) => !(f.kind === "announcement" && (f.data as Announcement).isPinned)),
  ];

  const filterBySearch = (items: FeedItem[]) => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (item.kind === "announcement") {
        const a = item.data as Announcement;
        return a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q);
      }
      if (item.kind === "chapter") {
        const c = item.data as RecentChapter;
        return c.manga.title.toLowerCase().includes(q) || String(c.number).includes(q);
      }
      if (item.kind === "manga") {
        const m = item.data as RecentManga;
        return m.title.toLowerCase().includes(q);
      }
      if (item.kind === "scan") {
        const s = item.data as RecentScan;
        return (s.name ?? "").toLowerCase().includes(q) || (s.username ?? "").toLowerCase().includes(q);
      }
      return true;
    });
  };

  const filteredAll = filterBySearch(pinnedFirst);
  const filteredAnnouncements = filterBySearch(
    data.announcements.map((a) => ({ kind: "announcement" as const, data: a, date: a.publishedAt }))
  );
  const filteredChapters = filterBySearch(
    data.recentChapters.map((c) => ({ kind: "chapter" as const, data: c, date: c.createdAt }))
  );
  const filteredMangas = filterBySearch(
    data.recentMangas.map((m) => ({ kind: "manga" as const, data: m, date: m.createdAt }))
  );
  const filteredScans = filterBySearch(
    data.recentScans.map((s) => ({ kind: "scan" as const, data: s, date: s.createdAt }))
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              tab === id
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full rounded-lg border border-border/60 bg-card py-2 pl-8 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25"
        />
      </div>

      <div className="space-y-4">
        {tab === "all" &&
          filteredAll.map((item, i) => {
            const key = `${item.kind}-${i}`;
            const card =
              item.kind === "announcement" ? (
                <AnnouncementCard item={item.data as Announcement} dfLocale={dfLocale} t={t} />
              ) : item.kind === "chapter" ? (
                <ChapterCard item={item.data as RecentChapter} locale={locale} dfLocale={dfLocale} t={t} />
              ) : item.kind === "manga" ? (
                <MangaCard item={item.data as RecentManga} locale={locale} dfLocale={dfLocale} t={t} />
              ) : (
                <ScanCard item={item.data as RecentScan} locale={locale} dfLocale={dfLocale} t={t} />
              );
            return (
              <Fragment key={key}>
                {card}
                {showAds && i === 4 ? (
                  <AdSlot slotId="news-between-sections" height="h-20" />
                ) : null}
              </Fragment>
            );
          })}
        {tab === "announcements" &&
          filteredAnnouncements.map((f) => (
            <AnnouncementCard
              key={(f.data as Announcement).id}
              item={f.data as Announcement}
              dfLocale={dfLocale}
              t={t}
            />
          ))}
        {tab === "chapters" &&
          filteredChapters.map((f) => (
            <ChapterCard
              key={(f.data as RecentChapter).id}
              item={f.data as RecentChapter}
              locale={locale}
              dfLocale={dfLocale}
              t={t}
            />
          ))}
        {tab === "mangas" &&
          filteredMangas.map((f) => (
            <MangaCard
              key={(f.data as RecentManga).slug}
              item={f.data as RecentManga}
              locale={locale}
              dfLocale={dfLocale}
              t={t}
            />
          ))}
        {tab === "scans" &&
          filteredScans.map((f) => (
            <ScanCard
              key={(f.data as RecentScan).id}
              item={f.data as RecentScan}
              locale={locale}
              dfLocale={dfLocale}
              t={t}
            />
          ))}
      </div>
    </div>
  );
}

function AnnouncementCard({
  item,
  dfLocale,
  t,
}: {
  item: Announcement;
  dfLocale: Locale;
  t: TFn;
}) {
  return (
    <article
      className={cn(
        "rounded-xl border bg-card p-4 shadow-sm",
        item.isPinned ? "border-primary/30 bg-primary/5" : "border-border"
      )}
    >
      <div className="flex items-start gap-3">
        {item.imageUrl && (
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
            <Image src={item.imageUrl} alt="" fill className="object-cover" sizes="64px" unoptimized />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Megaphone className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            {item.isPinned && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                <Pin className="h-3 w-3" aria-hidden />
                {t("pinned")}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(item.publishedAt), { addSuffix: true, locale: dfLocale })}
            </span>
          </div>
          <h3 className="mt-1 text-sm font-semibold text-foreground">{item.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground line-clamp-3">{item.body}</p>
        </div>
      </div>
    </article>
  );
}

function ChapterCard({
  item,
  locale,
  dfLocale,
  t,
}: {
  item: RecentChapter;
  locale: string;
  dfLocale: Locale;
  t: TFn;
}) {
  return (
    <Link
      href={`/${locale}/read/${item.id}`}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm transition hover:border-primary/40 hover:bg-muted/40"
    >
      <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded border border-border bg-muted">
        {item.manga.coverImage && (
          <Image src={item.manga.coverImage} alt="" fill className="object-cover" sizes="40px" unoptimized />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <BookMarked className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          <span className="text-xs font-medium text-primary">{t("newChapter")}</span>
        </div>
        <p className="truncate text-sm font-semibold text-foreground">{item.manga.title}</p>
        <p className="text-xs text-muted-foreground">
          {t("chapterLabel", { number: item.number })}
          {item.title ? ` — ${item.title}` : ""}
        </p>
      </div>
      <time className="shrink-0 text-xs text-muted-foreground">
        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: dfLocale })}
      </time>
    </Link>
  );
}

function MangaCard({
  item,
  locale,
  dfLocale,
  t,
}: {
  item: RecentManga;
  locale: string;
  dfLocale: Locale;
  t: TFn;
}) {
  return (
    <Link
      href={`/${locale}/manga/${item.slug}`}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm transition hover:border-primary/40 hover:bg-muted/40"
    >
      <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded border border-border bg-muted">
        {item.coverImage && (
          <Image src={item.coverImage} alt="" fill className="object-cover" sizes="40px" unoptimized />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5 shrink-0 text-violet-500" aria-hidden />
          <span className="text-xs font-medium text-violet-600 dark:text-violet-400">{t("newManga")}</span>
        </div>
        <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {item.tags.slice(0, 2).map((rel) => (
            <span key={rel.tag.name} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {rel.tag.name}
            </span>
          ))}
        </div>
      </div>
      <time className="shrink-0 text-xs text-muted-foreground">
        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: dfLocale })}
      </time>
    </Link>
  );
}

function ScanCard({
  item,
  locale,
  dfLocale,
  t,
}: {
  item: RecentScan;
  locale: string;
  dfLocale: Locale;
  t: TFn;
}) {
  const profileKey = item.username ?? item.id;
  const display = item.name?.trim() || item.username || t("unknownScan");
  return (
    <Link
      href={`/${locale}/user/${encodeURIComponent(profileKey)}`}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm transition hover:border-primary/40 hover:bg-muted/40"
    >
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
        {item.image ? (
          <Image src={item.image} alt="" fill className="object-cover" sizes="40px" unoptimized />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-primary">
            {display.slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 shrink-0 text-sky-500" aria-hidden />
          <span className="text-xs font-medium text-sky-600 dark:text-sky-400">
            {item.role === "CREATOR" ? t("newCreator") : t("newScan")}
          </span>
        </div>
        <p className="truncate text-sm font-semibold text-foreground">{display}</p>
      </div>
      <time className="shrink-0 text-xs text-muted-foreground">
        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: dfLocale })}
      </time>
    </Link>
  );
}
