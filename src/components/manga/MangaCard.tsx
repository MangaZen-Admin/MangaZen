/**
 * src/components/manga/MangaCard.tsx
 *
 * Tarjeta de manga para la grilla del catálogo y homepage.
 */

"use client";

import Link from "next/link";
import Image from "next/image";
import { BookOpen, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { getCardLocalesForLocale, getLocaleFlagIconUrl } from "@/lib/locale-flags";
import { translateCatalogTagName } from "@/lib/catalog-tag-i18n";

export type MangaCardData = {
  id: string;
  slug: string;
  title: string;
  coverImage: string | null;
  type: string;
  demographic: string | null;
  contentRating: string;
  status: string;
  scoreAvg: number;
  scoreCount: number;
  tags: {
    tag: {
      name: string;
    };
  }[];
  chapters: {
    id: string;
    number: number;
    createdAt: Date;
    locale?: string;
  }[];
};

const STATUS_STYLES: Record<string, string> = {
  ONGOING: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  COMPLETED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  HIATUS: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const RATING_STYLES: Record<string, string> = {
  EVERYONE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  TEEN: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
  MATURE_SUGGESTIVE: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
};

interface MangaCardProps {
  manga: MangaCardData;
  userLocale?: string;
  variant?: "grid" | "featured";
}

export function MangaCard({ manga, userLocale = "es-ar", variant = "grid" }: MangaCardProps) {
  const tHome = useTranslations("home");
  const tCat = useTranslations("catalog");
  const tStatus = useTranslations("scanPanel.mangaStatus");
  const tType = useTranslations("scanPanel.mangaType");
  const tDemo = useTranslations("scanPanel.demographic");
  const tRating = useTranslations("scanPanel.contentRating");

  const latestChapter = manga.chapters[0] ?? null;
  const mainTags = manga.tags
    .slice(0, 2)
    .map((rel) => translateCatalogTagName(rel.tag.name, (key) => tCat(key)));
  const chapterLocales = manga.chapters
    .map((chapter) => chapter.locale)
    .filter((value): value is string => typeof value === "string");
  const cardLocales = getCardLocalesForLocale(userLocale, chapterLocales);

  const statusLabel =
    manga.status && tStatus.has(manga.status) ? tStatus(manga.status) : manga.status;
  const ratingLabel =
    manga.contentRating && tRating.has(manga.contentRating)
      ? tRating(manga.contentRating)
      : manga.contentRating;
  const typeLabel = manga.type && tType.has(manga.type) ? tType(manga.type) : manga.type;
  const demoLabel =
    manga.demographic && tDemo.has(manga.demographic) ? tDemo(manga.demographic) : manga.demographic;

  return (
    <Link
      href={`/manga/${manga.slug}`}
      className="group block rounded-lg overflow-hidden border border-border bg-card transition-all duration-200 hover:border-border/80 hover:shadow-sm"
    >
      <div
        className={cn(
          "relative overflow-hidden bg-muted",
          variant === "featured" ? "aspect-[2/3]" : "aspect-[3/4]"
        )}
      >
        {manga.coverImage ? (
          <Image
            src={manga.coverImage}
            alt={tCat("coverAlt", { title: manga.title })}
            fill
            sizes="(max-width: 640px) 182px, (max-width: 1024px) 220px, 256px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}

        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <div className="inline-flex w-fit items-center gap-1 rounded bg-black/55 px-1.5 py-1 backdrop-blur-sm">
            {cardLocales.map((chapterLocale) => (
              <Image
                key={`${manga.id}-${chapterLocale}`}
                src={getLocaleFlagIconUrl(chapterLocale)}
                alt={chapterLocale}
                width={14}
                height={14}
                className="h-3.5 w-3.5 rounded-[2px]"
              />
            ))}
          </div>
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-medium leading-none",
              RATING_STYLES[manga.contentRating] ?? "bg-muted text-muted-foreground"
            )}
          >
            {ratingLabel}
          </span>
        </div>

        {manga.scoreAvg > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-0.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
            <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
            <span>{manga.scoreAvg.toFixed(1)}</span>
          </div>
        )}

        <div className="absolute bottom-2 left-2">
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-medium leading-none",
              STATUS_STYLES[manga.status] ?? "bg-muted text-muted-foreground"
            )}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="space-y-1.5 p-2.5">
        <h3
          className={cn(
            "line-clamp-2 font-medium leading-tight text-card-foreground",
            variant === "featured" ? "text-sm" : "text-xs"
          )}
        >
          {manga.title}
        </h3>

        <p className="text-[11px] text-muted-foreground">
          {typeLabel}
          {demoLabel ? ` · ${demoLabel}` : ""}
        </p>

        {mainTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {mainTags.map((label, i) => (
              <span
                key={`${manga.id}-tag-${i}-${manga.tags[i]?.tag.name ?? i}`}
                className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {label}
              </span>
            ))}
          </div>
        )}

        {latestChapter && (
          <p className="border-t border-border/50 pt-0.5 text-[11px] text-muted-foreground">
            {tHome("chapterLine", { number: latestChapter.number })}
          </p>
        )}
      </div>
    </Link>
  );
}
