"use client";

import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Star } from "lucide-react";

type RelatedManga = {
  slug: string;
  title: string;
  coverImage: string | null;
  type: string;
  scoreAvg: number;
  _count: { chapters: number };
};

type RelatedMangasProps = {
  mangas: RelatedManga[];
};

export function RelatedMangas({ mangas }: RelatedMangasProps) {
  const t = useTranslations("catalog");
  const locale = useLocale();

  if (mangas.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-4 text-base font-semibold text-foreground">
        {t("relatedMangas")}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {mangas.map((manga) => (
          <Link
            key={manga.slug}
            href={`/${locale}/manga/${manga.slug}`}
            className="group flex flex-col gap-2"
          >
            <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-border bg-muted">
              {manga.coverImage ? (
                <Image
                  src={manga.coverImage}
                  alt={manga.title}
                  fill
                  sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 15vw"
                  className="object-cover transition-transform duration-200 group-hover:scale-105"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  ?
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-white">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {manga.scoreAvg.toFixed(1)}
                </span>
              </div>
            </div>
            <div>
              <p className="line-clamp-2 text-xs font-medium leading-snug text-foreground">
                {manga.title}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {manga._count.chapters} {t("chaptersShort")}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
