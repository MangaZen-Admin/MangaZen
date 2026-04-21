"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { format, formatDistanceToNow } from "date-fns";
import { ChevronDown, Eye, Languages, Lock, SortAsc, SortDesc, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { getLocaleFlagIconUrl, isSameLocale } from "@/lib/locale-flags";
import { dateFnsLocaleFromAppLocale } from "@/lib/date-fns-locale";

type ChapterItem = {
  id: string;
  number: number;
  title: string | null;
  createdAt: string;
  locale: string;
  pagesCount: number;
  eaActive?: boolean;
  earlyAccessUntil?: string | null;
  userHasAccess?: boolean;
};

type LocalizedChapterListProps = {
  userLocale: string;
  chapters: ChapterItem[];
  openChapterId?: string | null;
  onOpenChapterChange?: (id: string | null) => void;
};

const STORAGE_CHAPTER_SORT = "mangazen_chapter_sort";

export function LocalizedChapterList({
  userLocale,
  chapters,
  openChapterId: controlledOpen,
  onOpenChapterChange,
}: LocalizedChapterListProps) {
  const locale = useLocale();
  const dfLocale = useMemo(() => dateFnsLocaleFromAppLocale(locale), [locale]);
  const tEa = useTranslations("earlyAccess");
  const tCat = useTranslations("catalog");
  const [onlyMyLocale, setOnlyMyLocale] = useState(true);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_CHAPTER_SORT);
      if (stored === "asc" || stored === "desc") {
        setSortOrder(stored);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const [internalOpen, setInternalOpen] = useState<string | null>(null);

  const isControlled = controlledOpen !== undefined && onOpenChapterChange !== undefined;
  const openChapterId = isControlled ? controlledOpen! : internalOpen;
  const setOpenChapterId = isControlled ? onOpenChapterChange! : setInternalOpen;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CHAPTER_SORT, sortOrder);
    } catch {
      // ignore storage failures
    }
  }, [sortOrder]);

  const filtered = useMemo(() => {
    const scoped = onlyMyLocale
      ? chapters.filter((chapter) => isSameLocale(userLocale, chapter.locale))
      : chapters;
    const sorted = [...scoped].sort((a, b) => {
      if (sortOrder === "asc") return a.number - b.number;
      return b.number - a.number;
    });
    return sorted;
  }, [chapters, onlyMyLocale, sortOrder, userLocale]);

  return (
    <section id="chapters" className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">
          {tCat("mangaChaptersTitle", { count: filtered.length })}
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
            className={`
              inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5
              backdrop-blur-md transition-all duration-200
              border-violet-300/35 bg-zinc-100/90 text-zinc-800 hover:border-violet-400/45 hover:bg-zinc-100
              dark:border-violet-300/20 dark:bg-slate-900/45 dark:text-zinc-100 dark:hover:border-violet-300/35 dark:hover:bg-slate-900/55
            `}
          >
            {sortOrder === "desc" ? <SortDesc className="h-3.5 w-3.5" /> : <SortAsc className="h-3.5 w-3.5" />}
            <span>
              {sortOrder === "desc"
                ? tCat("mangaChaptersSortDesc")
                : tCat("mangaChaptersSortAsc")}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setOnlyMyLocale(true)}
            className={`
              inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5
              backdrop-blur-md transition-all duration-200
              ${
                onlyMyLocale
                  ? "border-violet-400/45 bg-violet-200/75 text-violet-900 shadow-[0_0_16px_rgba(157,78,221,0.18)] dark:border-violet-300/40 dark:bg-primary/25 dark:text-primary-foreground dark:shadow-[0_0_16px_rgba(157,78,221,0.25)]"
                  : "border-violet-300/35 bg-zinc-100/90 text-zinc-800 hover:border-violet-400/45 hover:bg-zinc-100 dark:border-violet-300/20 dark:bg-slate-900/45 dark:text-zinc-100 dark:hover:border-violet-300/35 dark:hover:bg-slate-900/55"
              }
            `}
          >
            <Languages className="h-3.5 w-3.5" />
            {tCat("mangaChaptersOnlyMyLocale", { locale: userLocale })}
          </button>
          <button
            type="button"
            onClick={() => setOnlyMyLocale(false)}
            className={`
              inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5
              backdrop-blur-md transition-all duration-200
              ${
                !onlyMyLocale
                  ? "border-violet-400/45 bg-gradient-to-r from-violet-200/90 to-fuchsia-200/85 text-violet-900 shadow-[0_0_18px_rgba(157,78,221,0.2)] dark:border-violet-300/40 dark:bg-gradient-to-r dark:from-violet-600/45 dark:to-fuchsia-500/35 dark:text-primary-foreground dark:shadow-[0_0_20px_rgba(157,78,221,0.35)]"
                  : "border-violet-300/35 bg-zinc-100/90 text-zinc-800 hover:border-violet-400/45 hover:bg-zinc-100 dark:border-violet-300/20 dark:bg-slate-900/45 dark:text-zinc-100 dark:hover:border-violet-300/35 dark:hover:bg-slate-900/55"
              }
            `}
          >
            <Eye className="h-3.5 w-3.5" />
            {tCat("mangaChaptersShowAll")}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            {tCat("mangaChaptersEmptyLocale")}
          </div>
        ) : (
          filtered.map((chapter) => {
            const isOpen = openChapterId === chapter.id;
            const previewPages = Array.from({ length: Math.max(chapter.pagesCount || 0, 1) }, (_, i) => i + 1);
            const eaOn = chapter.eaActive === true;
            const unlockDate =
              chapter.earlyAccessUntil != null
                ? format(new Date(chapter.earlyAccessUntil), "Pp", { locale: dfLocale })
                : "";
            const eaTitle = eaOn
              ? chapter.userHasAccess
                ? tEa("listBadgeHasAccess")
                : tEa("listBadgeLocked", { date: unlockDate })
              : undefined;

            const chapterHeading = chapter.title
              ? tCat("mangaChapterWithTitle", { number: chapter.number, title: chapter.title })
              : tCat("mangaChapterHeading", { number: chapter.number });

            return (
              <article
                key={chapter.id}
                className={`rounded-xl border bg-card/70 transition-colors duration-200 ${
                  isOpen
                    ? "border-primary/55 bg-primary/[0.07] shadow-none dark:bg-card/70 dark:shadow-[0_0_20px_rgba(157,78,221,0.24)]"
                    : "border-border"
                }`}
              >
                <button
                  id={`chapter-${chapter.id}`}
                  type="button"
                  onClick={() => {
                    const next = openChapterId === chapter.id ? null : chapter.id;
                    setOpenChapterId(next);
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-sm transition-colors duration-200 ${
                    isOpen ? "bg-primary/8" : "hover:bg-muted/35"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/12"
                      title={chapter.locale.toUpperCase()}
                      aria-label={chapter.locale.toUpperCase()}
                    >
                      <Image
                        src={getLocaleFlagIconUrl(chapter.locale)}
                        alt={chapter.locale}
                        width={14}
                        height={14}
                        className="h-3.5 w-3.5 rounded-[2px]"
                      />
                    </span>
                    <span className="truncate text-left font-medium">{chapterHeading}</span>
                    {eaOn && (
                      <span
                        className="shrink-0 text-primary"
                        title={eaTitle}
                        aria-label={eaTitle}
                      >
                        {chapter.userHasAccess ? (
                          <Star className="h-4 w-4 fill-amber-400/30 text-amber-500" strokeWidth={1.5} />
                        ) : (
                          <Lock className="h-4 w-4 text-violet-500 dark:text-violet-400" strokeWidth={2} />
                        )}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(chapter.createdAt), {
                        addSuffix: true,
                        locale: dfLocale,
                      })}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180 text-primary" : ""}`}
                    />
                  </div>
                </button>

                <div
                  className={`overflow-hidden px-3 transition-all duration-300 ease-out ${
                    isOpen ? "max-h-[900px] pb-3 pt-1 opacity-100" : "max-h-0 py-0 opacity-0"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">{tCat("mangaChapterPreviewCaption")}</p>
                    <Link
                      href={`/${locale}/read/${chapter.id}?page=1`}
                      className="rounded-lg border border-primary/40 bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:opacity-90"
                    >
                      {tCat("mangaReadFromPageOne")}
                    </Link>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-8">
                    {previewPages.map((page) => (
                      <Link
                        key={`${chapter.id}-${page}`}
                        href={`/${locale}/read/${chapter.id}?page=${page}`}
                        className="group aspect-[3/4] cursor-pointer rounded border border-primary/25 bg-gradient-to-b from-secondary to-primary/15 transition-colors duration-200 hover:border-primary/50 hover:from-primary/20 hover:to-primary/25 dark:from-slate-200/15 dark:to-violet-300/20 dark:hover:from-violet-300/25 dark:hover:to-violet-500/25"
                      >
                        <div className="flex h-full items-end justify-center pb-1 text-[10px] font-medium text-foreground/85">
                          {tCat("mangaPageNumber", { page })}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
