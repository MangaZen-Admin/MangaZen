/**
 * src/app/(public)/page.tsx
 *
 * Homepage principal de MangaZen.
 * Server Component — los datos se obtienen directamente con Prisma en el servidor.
 * No hay "use client", no hay useEffect, no hay fetch al API.
 */

import Link from "next/link";
import Image from "next/image";
import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { getLocale, getTranslations } from "next-intl/server";
import { translateCatalogTagName } from "@/lib/catalog-tag-i18n";
import { prisma } from "@/lib/db";
import { getAuthenticatedUserIdServer } from "@/lib/auth-session";
import { getContinueReadingForUser } from "@/lib/get-continue-reading";
import { ContinueReadingCarousel } from "@/components/home/ContinueReadingCarousel";
import { BoostCarousel } from "@/components/home/BoostCarousel";
import { MangaCard, type MangaCardData } from "@/components/manga/MangaCard";
import { getCardLocalesForLocale, getLocaleFlagIconUrl } from "@/lib/locale-flags";
import { ChevronRight, TrendingUp, Clock, Sparkles } from "lucide-react";
import { AdSlotShell } from "@/components/AdSlotShell";

// ─── Data fetching ────────────────────────────────────────────────────────────
//
// Cada función es independiente. Next.js las ejecuta en paralelo gracias
// a Promise.all. Si una falla, no bloquea el resto de la página.

// Query compartida: selecciona exactamente los campos que MangaCard necesita.
const MANGA_CARD_SELECT = Prisma.validator<Prisma.MangaSelect>()({
  id: true,
  slug: true,
  title: true,
  coverImage: true,
  type: true,
  demographic: true,
  contentRating: true,
  status: true,
  scoreAvg: true,
  scoreCount: true,
  tags: {
    take: 2,
    select: {
      tag: { select: { name: true } },
    },
  },
  chapters: {
    where: { status: "APPROVED" },
    take: 6,
    orderBy: { number: "desc" as const },
    select: { id: true, number: true, createdAt: true, locale: true },
  },
});

async function safeMangaFindMany(
  args: Prisma.MangaFindManyArgs & { select: typeof MANGA_CARD_SELECT }
): Promise<MangaCardData[]> {
  try {
    const mangas = await prisma.manga.findMany(args);
    return mangas.map((manga) => ({
      id: manga.id,
      slug: manga.slug,
      title: manga.title,
      coverImage: manga.coverImage,
      type: manga.type,
      demographic: manga.demographic,
      contentRating: manga.contentRating,
      status: manga.status,
      scoreAvg: manga.scoreAvg,
      scoreCount: manga.scoreCount,
      tags: manga.tags
        .map((tagRelation) =>
          "tag" in tagRelation && tagRelation.tag
            ? { tag: { name: tagRelation.tag.name } }
            : null
        )
        .filter((tag): tag is { tag: { name: string } } => tag !== null),
      chapters: manga.chapters.map((chapter) => ({
        id: chapter.id,
        number: chapter.number,
        createdAt: chapter.createdAt,
        locale: chapter.locale,
      })),
    }));
  } catch (error) {
    // Permite que el prerender no falle cuando la DB local todavia no fue migrada.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      return [];
    }
    throw error;
  }
}

async function getFeaturedMangas() {
  const curated = await safeMangaFindMany({
    where: { reviewStatus: "APPROVED", isFeatured: true },
    take: 5,
    orderBy: { scoreAvg: "desc" },
    select: MANGA_CARD_SELECT,
  });

  if (curated.length >= 2) return curated.slice(0, 5);

  return safeMangaFindMany({
    where: { reviewStatus: "APPROVED" },
    take: 5,
    orderBy: [{ scoreAvg: "desc" }, { scoreCount: "desc" }],
    select: MANGA_CARD_SELECT,
  });
}

async function getLatestUpdates() {
  const latestChapters = await prisma.chapter.findMany({
    where: {
      status: "APPROVED",
      manga: { reviewStatus: "APPROVED" },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { mangaId: true },
  });

  const seen = new Set<string>();
  const orderedMangaIds: string[] = [];
  for (const chapter of latestChapters) {
    if (!seen.has(chapter.mangaId)) {
      seen.add(chapter.mangaId);
      orderedMangaIds.push(chapter.mangaId);
      if (orderedMangaIds.length >= 8) break;
    }
  }

  if (orderedMangaIds.length === 0) return [];

  const mangas = await safeMangaFindMany({
    where: {
      reviewStatus: "APPROVED",
      id: { in: orderedMangaIds },
    },
    take: orderedMangaIds.length,
    select: MANGA_CARD_SELECT,
  });

  const byId = new Map(mangas.map((manga) => [manga.id, manga]));
  return orderedMangaIds
    .map((mangaId) => byId.get(mangaId))
    .filter((manga): manga is MangaCardData => manga != null);
}

async function getTrending() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const results = await safeMangaFindMany({
    where: {
      reviewStatus: "APPROVED",
      scoreCount: { gt: 0 },
      chapters: {
        some: {
          status: "APPROVED",
          createdAt: { gte: thirtyDaysAgo },
        },
      },
    },
    take: 6,
    orderBy: [{ scoreAvg: "desc" }, { scoreCount: "desc" }],
    select: MANGA_CARD_SELECT,
  });

  if (results.length > 0) return results;

  return safeMangaFindMany({
    where: {
      reviewStatus: "APPROVED",
      scoreCount: { gt: 0 },
    },
    take: 6,
    orderBy: [{ scoreAvg: "desc" }, { scoreCount: "desc" }],
    select: MANGA_CARD_SELECT,
  });
}

const getCachedFeaturedMangas = unstable_cache(getFeaturedMangas, ["home-featured"], {
  revalidate: 300,
});

const getCachedLatestUpdates = unstable_cache(getLatestUpdates, ["home-latest"], {
  revalidate: 120,
});

const getCachedTrending = unstable_cache(getTrending, ["home-trending"], {
  revalidate: 600,
});

// ─── Sub-componentes de sección ───────────────────────────────────────────────

function SectionHeader({
  title,
  href,
  icon: Icon,
  seeAll,
}: {
  title: string;
  href: string;
  icon: React.ElementType;
  seeAll: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-base font-medium">{title}</h2>
      </div>
      <Link
        href={href}
        className="flex items-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        {seeAll}
        <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

function WelcomeBanner({ tHome }: { tHome: (key: string) => string }) {
  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6 sm:p-8">
      <div className="max-w-lg">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {tHome("welcomeTitle")}
        </h1>
        <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
          {tHome("welcomeSubtitle")}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/register"
            className="inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            {tHome("welcomeCta")}
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            {tHome("welcomeLogin")}
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Hero de destacados ───────────────────────────────────────────────────────

function FlagStrip({ manga, locale }: { manga: MangaCardData; locale: string }) {
  const locales = getCardLocalesForLocale(
    locale,
    manga.chapters
      .map((chapter) => chapter.locale)
      .filter((value): value is string => typeof value === "string")
  );

  if (locales.length === 0) return null;

  return (
    <div className="inline-flex items-center gap-1 rounded bg-black/55 px-1.5 py-1 backdrop-blur-sm">
      {locales.map((chapterLocale) => (
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
  );
}

function formatMangaTypeLine(
  type: string,
  demographic: string | null,
  tType: { has: (k: string) => boolean; (k: string): string },
  tDemo: { has: (k: string) => boolean; (k: string): string }
) {
  const typeL = tType.has(type) ? tType(type) : type;
  const demoL = demographic && tDemo.has(demographic) ? tDemo(demographic) : null;
  return demoL ? `${typeL} · ${demoL}` : typeL;
}

function FeaturedHero({
  mangas,
  locale,
  tCat,
  tType,
  tDemo,
  translateTag,
  sectionTitle,
  seeAll,
}: {
  mangas: MangaCardData[];
  locale: string;
  tCat: (key: string, values?: Record<string, string>) => string;
  tType: { has: (k: string) => boolean; (k: string): string };
  tDemo: { has: (k: string) => boolean; (k: string): string };
  translateTag: (dbName: string) => string;
  sectionTitle: string;
  seeAll: string;
}) {
  if (mangas.length === 0) return null;

  const [main, ...rest] = mangas;

  return (
    <section className="mb-8">
      <SectionHeader title={sectionTitle} href="/library" icon={Sparkles} seeAll={seeAll} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_200px]">
        {/* Tarjeta principal grande */}
        <Link
          href={`/manga/${main.slug}`}
          className="group relative overflow-hidden rounded-xl border border-border bg-card aspect-[16/7] flex items-end"
        >
          {main.coverImage && (
            <Image
              src={main.coverImage}
              alt={tCat("coverAlt", { title: main.title })}
              fill
              sizes="(max-width: 640px) 100vw, 70vw"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="relative p-4">
            <div className="mb-2">
              <FlagStrip manga={main} locale={locale} />
            </div>
            <p className="mb-1 text-xs text-white/60">
              {formatMangaTypeLine(main.type, main.demographic, tType, tDemo)}
            </p>
            <h3 className="text-lg font-medium text-white">{main.title}</h3>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {main.tags.slice(0, 3).map((rel) => (
                <span
                  key={rel.tag.name}
                  className="rounded bg-white/10 px-2 py-0.5 text-[10px] text-white/80 backdrop-blur-sm"
                >
                  {translateTag(rel.tag.name)}
                </span>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs text-white/60">
              {main.scoreCount > 0 ? (
                <span className="flex items-center gap-1">
                  <span className="text-amber-400">★</span>
                  <span>{main.scoreAvg.toFixed(1)}</span>
                </span>
              ) : null}
              {main.chapters[0] ? <span>Cap. {main.chapters[0].number}</span> : null}
            </div>
          </div>
        </Link>

        {/* Lista lateral con el resto de destacados */}
        <div className="flex flex-col gap-2">
          {rest.map((manga) => (
            <Link
              key={manga.id}
              href={`/manga/${manga.slug}`}
              className="group flex items-center gap-3 rounded-lg border border-border bg-card p-2.5 transition-colors hover:bg-muted/50"
            >
              {manga.coverImage && (
                <Image
                  src={manga.coverImage}
                  alt={manga.title}
                  width={32}
                  height={48}
                  className="h-12 w-8 rounded object-cover flex-shrink-0"
                />
              )}
              <div className="min-w-0">
                <div className="mb-1">
                  <FlagStrip manga={manga} locale={locale} />
                </div>
                <p className="truncate text-xs font-medium">{manga.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  ★ {manga.scoreAvg.toFixed(1)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Grid de últimas actualizaciones (scroll horizontal en mobile) ─────────────

function LatestUpdates({
  mangas,
  locale,
  sectionTitle,
  seeAll,
}: {
  mangas: MangaCardData[];
  locale: string;
  sectionTitle: string;
  seeAll: string;
}) {
  return (
    <section className="mb-8">
      <SectionHeader
        title={sectionTitle}
        href="/library?sort=latest"
        icon={Clock}
        seeAll={seeAll}
      />
      {/* En desktop: grilla. En mobile: scroll horizontal */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {mangas.map((manga) => (
          <MangaCard key={manga.id} manga={manga} userLocale={locale} variant="grid" />
        ))}
      </div>
    </section>
  );
}

// ─── Tendencias (lista con ranking) ──────────────────────────────────────────

function TrendingSection({
  mangas,
  locale,
  tCat,
  tType,
  tDemo,
  translateTag,
  sectionTitle,
  seeAll,
}: {
  mangas: MangaCardData[];
  locale: string;
  tCat: (key: string, values?: Record<string, string | number>) => string;
  tType: { has: (k: string) => boolean; (k: string): string };
  tDemo: { has: (k: string) => boolean; (k: string): string };
  translateTag: (dbName: string) => string;
  sectionTitle: string;
  seeAll: string;
}) {
  return (
    <section className="mb-8">
      <SectionHeader
        title={sectionTitle}
        href="/library?sort=popular"
        icon={TrendingUp}
        seeAll={seeAll}
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {mangas.map((manga, index) => (
          <Link
            key={manga.id}
            href={`/manga/${manga.slug}`}
            className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50"
          >
            {/* Número de ranking */}
            <span className="w-6 text-center text-lg font-medium text-muted-foreground/40 flex-shrink-0">
              {index + 1}
            </span>

            {/* Portada pequeña */}
            {manga.coverImage ? (
              <Image
                src={manga.coverImage}
                alt={manga.title}
                width={40}
                height={56}
                className="h-14 w-10 rounded object-cover flex-shrink-0"
              />
            ) : (
              <div className="h-14 w-10 rounded bg-muted flex-shrink-0" />
            )}

            <div className="min-w-0 flex-1">
              <div className="mb-1">
                <FlagStrip manga={manga} locale={locale} />
              </div>
              <p className="truncate text-sm font-medium">{manga.title}</p>
              <p className="text-xs text-muted-foreground">
                {formatMangaTypeLine(manga.type, manga.demographic, tType, tDemo)}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {manga.tags.slice(0, 2).map((rel) => (
                  <span
                    key={rel.tag.name}
                    className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {translateTag(rel.tag.name)}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex-shrink-0 text-right">
              <p className="text-sm font-medium text-amber-500">
                ★ {manga.scoreAvg.toFixed(1)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {tCat("votesCount", { count: manga.scoreCount })}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export async function generateMetadata() {
  const t = await getTranslations("home");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export const revalidate = 60;

export default async function HomePage() {
  const [locale, userId] = await Promise.all([
    getLocale(),
    getAuthenticatedUserIdServer(),
  ]);

  const [tHome, tCat, tType, tDemo, featured, latest, trending, continueReading] = await Promise.all([
    getTranslations("home"),
    getTranslations("catalog"),
    getTranslations("scanPanel.mangaType"),
    getTranslations("scanPanel.demographic"),
    getCachedFeaturedMangas(),
    getCachedLatestUpdates(),
    getCachedTrending(),
    userId ? getContinueReadingForUser(userId) : Promise.resolve([]),
  ]);

  const translateTag = (name: string) => translateCatalogTagName(name, (k) => tCat(k));

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {continueReading.length > 0 ? (
        <ContinueReadingCarousel items={continueReading} locale={locale} />
      ) : null}

      {!userId ? <WelcomeBanner tHome={tHome} /> : null}

      <FeaturedHero
        mangas={featured}
        locale={locale}
        tCat={tCat}
        tType={tType}
        tDemo={tDemo}
        translateTag={translateTag}
        sectionTitle={tCat("sectionFeatured")}
        seeAll={tCat("seeAll")}
      />

      <BoostCarousel />

      <LatestUpdates
        mangas={latest}
        locale={locale}
        sectionTitle={tCat("sectionLatest")}
        seeAll={tCat("seeAll")}
      />

      <AdSlotShell slotId="home-between-sections" height="h-16" />

      <TrendingSection
        mangas={trending}
        locale={locale}
        tCat={tCat}
        tType={tType}
        tDemo={tDemo}
        translateTag={translateTag}
        sectionTitle={tCat("sectionTrending")}
        seeAll={tCat("seeAll")}
      />
    </main>
  );
}
