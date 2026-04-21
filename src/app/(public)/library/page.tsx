import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Filter } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { LibraryFilterForm } from "@/components/library/LibraryFilterForm";
import { getCardLocalesForLocale, getLocaleFlagIconUrl } from "@/lib/locale-flags";
import { translateCatalogTagName } from "@/lib/catalog-tag-i18n";
import { appLocaleToBcp47 } from "@/lib/app-locale-bcp47";
import { AdSlotShell } from "@/components/AdSlotShell";

type LibraryPageProps = {
  searchParams: Promise<{
    q?: string;
    genre?: string | string[];
    status?: string;
    order?: string;
  }>;
};

type OrderKey = "latest" | "popular" | "rating" | "title";

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const locale = await getLocale();
  const tCat = await getTranslations("catalog");
  const tStatus = await getTranslations("scanPanel.mangaStatus");
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const genreRaw = params.genre ?? "";
  const genres_filter = (
    Array.isArray(genreRaw) ? genreRaw : genreRaw ? [genreRaw] : []
  )
    .map((g) => g.trim())
    .filter(Boolean);
  const status = (params.status ?? "").trim();
  const order = (params.order ?? "latest") as OrderKey;
  const intlLocale = appLocaleToBcp47(locale);

  const translateTag = (name: string) => translateCatalogTagName(name, (k) => tCat(k));

  const [genres, mangas] = await Promise.all([
    prisma.tag.findMany({
      where: { category: "GENRE" },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
    prisma.manga.findMany({
      where: {
        reviewStatus: "APPROVED",
        ...(q
          ? {
              title: {
                contains: q,
              },
            }
          : {}),
        ...(genres_filter.length > 0
          ? {
              AND: genres_filter.map((g) => ({
                tags: { some: { tag: { name: g } } },
              })),
            }
          : {}),
        ...(status ? { status } : {}),
      },
      orderBy:
        order === "popular"
          ? { scoreCount: "desc" }
          : order === "rating"
            ? { scoreAvg: "desc" }
            : order === "title"
              ? { title: "asc" }
              : { updatedAt: "desc" },
      take: 60,
      select: {
        id: true,
        slug: true,
        title: true,
        coverImage: true,
        scoreAvg: true,
        scoreCount: true,
        status: true,
        tags: {
          take: 2,
          select: {
            tag: {
              select: { name: true },
            },
          },
        },
        chapters: {
          where: { status: "APPROVED" },
          distinct: ["locale"],
          select: {
            locale: true,
          },
        },
      },
    }),
  ]);

  const resultsLine =
    tCat("libraryResults", { count: mangas.length }) +
    (q ? tCat("libraryResultsForQuery", { q }) : "");

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">{tCat("libraryPageTitle")}</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <LibraryFilterForm
          locale={locale}
          initialQ={q}
          initialGenres={genres_filter}
          initialStatus={status}
          initialOrder={order}
          genres={genres}
        />

        <section className="rounded-xl border border-border bg-card p-4 shadow-sm dark:shadow-none">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{resultsLine}</p>
            {(q || genres_filter.length > 0 || status) && (
              <div className="flex flex-wrap gap-1.5">
                {q && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs text-primary">
                    {tCat("filterChipSearch")}: {q}
                  </span>
                )}
                {genres_filter.map((g) => (
                  <span
                    key={g}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs text-primary"
                  >
                    {translateTag(g)}
                  </span>
                ))}
                {status && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs text-primary">
                    {tStatus.has(status) ? tStatus(status) : status}
                  </span>
                )}
              </div>
            )}
          </div>

          {mangas.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {tCat("libraryNoResults")}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {(() => {
                const items: ReactNode[] = [];
                mangas.forEach((manga, index) => {
                  items.push(
                    <Link
                      key={manga.id}
                      href={`/${locale}/manga/${manga.slug}`}
                      className="group overflow-hidden rounded-lg border border-border bg-background/40 transition hover:bg-muted/30"
                    >
                      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                        <div className="absolute z-10 m-1.5 flex gap-1 rounded bg-black/55 px-1.5 py-1 text-xs backdrop-blur-sm">
                          {getCardLocalesForLocale(
                            locale,
                            manga.chapters.map((chapter) => chapter.locale)
                          ).map((chapterLocale) => (
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
                        {manga.coverImage ? (
                          <Image
                            src={manga.coverImage}
                            alt={tCat("coverAlt", { title: manga.title })}
                            width={480}
                            height={640}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                            {tCat("shelfNoCover")}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1 p-2.5">
                        <p className="line-clamp-2 text-sm font-medium leading-tight">{manga.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          ★ {manga.scoreAvg.toFixed(1)} ·{" "}
                          {manga.scoreCount.toLocaleString(intlLocale)}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {manga.tags.map((t) => (
                            <span
                              key={t.tag.name}
                              className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                            >
                              {translateTag(t.tag.name)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </Link>
                  );
                  if (index === 9) {
                    items.push(
                      <div key="ad-10" className="col-span-full">
                        <AdSlotShell slotId="library-after-10" height="h-20" />
                      </div>
                    );
                  }
                  if (index === 24) {
                    items.push(
                      <div key="ad-25" className="col-span-full">
                        <AdSlotShell slotId="library-after-25" height="h-20" />
                      </div>
                    );
                  }
                  if (index >= 49 && (index - 49) % 50 === 0) {
                    items.push(
                      <div key={`ad-50-${index}`} className="col-span-full">
                        <AdSlotShell slotId="library-after-50" height="h-20" />
                      </div>
                    );
                  }
                });
                return items;
              })()}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
