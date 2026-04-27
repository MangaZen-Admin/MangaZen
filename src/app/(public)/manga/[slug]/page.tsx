import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { translateCatalogTagName } from "@/lib/catalog-tag-i18n";
import { appLocaleToBcp47 } from "@/lib/app-locale-bcp47";
import { prisma } from "@/lib/db";
import { MangaReactions } from "@/components/manga/MangaReactions";
import { MangaReadingStatus } from "@/components/manga/MangaReadingStatus";
import { MangaPrimaryReadCta } from "@/components/manga/MangaPrimaryReadCta";
import { MangaChaptersWithComments } from "@/components/manga/MangaChaptersWithComments";
import { MangaReaderCounter } from "@/components/manga/MangaReaderCounter";
import { getAuthenticatedUserIdServer } from "@/lib/auth-session";
import { canViewMangaInCatalog } from "@/lib/manga-visibility";
import { pickStartChapter } from "@/lib/manga-read-path";
import { getPlatform } from "@/lib/donation-platforms";
import { cn } from "@/lib/utils";
import { getServerRequestTimeMs } from "@/lib/server-request-time";
import { Heart } from "lucide-react";
import { AdSlotShell } from "@/components/AdSlotShell";

/** Modo claro: fondo y texto sólidos con buen contraste. */
const MANGA_PUBLICATION_LIGHT: Record<string, string> = {
  ONGOING: "border border-emerald-700/30 bg-emerald-100 text-emerald-950",
  COMPLETED: "border border-sky-700/30 bg-sky-100 text-sky-950",
  HIATUS: "border border-amber-600/40 bg-amber-100 text-amber-950",
  CANCELLED: "border border-red-700/30 bg-red-100 text-red-950",
};

/**
 * Modo oscuro: ONGOING conserva el estilo previo (trazo verde); el resto alineado con tonos semánticos.
 */
const MANGA_PUBLICATION_DARK: Record<string, string> = {
  ONGOING: "dark:border-transparent dark:bg-green-500/15 dark:text-green-300",
  COMPLETED: "dark:border-transparent dark:bg-blue-900 dark:text-blue-200",
  HIATUS: "dark:border-transparent dark:bg-yellow-900 dark:text-yellow-200",
  CANCELLED: "dark:border-transparent dark:bg-red-900 dark:text-red-200",
};

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

async function getMangaBySlug(slug: string) {
  return prisma.manga.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      uploaderId: true,
      uploader: {
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          role: true,
          externalDonationLink: true,
          donationLinks: {
            orderBy: { order: "asc" },
            select: { id: true, platform: true, url: true },
          },
        },
      },
      reviewStatus: true,
      title: true,
      description: true,
      coverImage: true,
      type: true,
      status: true,
      demographic: true,
      scoreAvg: true,
      scoreCount: true,
      chapters: {
        where: { status: "APPROVED" },
        orderBy: { number: "desc" },
        select: {
          id: true,
          number: true,
          title: true,
          createdAt: true,
          language: true,
          locale: true,
          isEarlyAccess: true,
          earlyAccessUntil: true,
          earlyAccessPrice: true,
          pages: {
            orderBy: { pageNumber: "asc" },
            select: { imageUrl: true },
          },
          _count: {
            select: {
              pages: true,
            },
          },
        },
      },
      tags: {
        select: {
          tag: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const manga = await prisma.manga.findUnique({
    where: { slug },
    select: {
      title: true,
      description: true,
      coverImage: true,
      scoreAvg: true,
      reviewStatus: true,
      uploaderId: true,
    },
  });

  if (!manga) {
    return {
      title: "Manga no encontrado | MangaZen",
      description: "El manga solicitado no existe o fue eliminado.",
    };
  }

  const sessionUserId = await getAuthenticatedUserIdServer();
  const viewer =
    sessionUserId != null
      ? await prisma.user.findUnique({
          where: { id: sessionUserId },
          select: { id: true, role: true },
        })
      : null;
  if (
    !canViewMangaInCatalog({
      reviewStatus: manga.reviewStatus,
      mangaUploaderId: manga.uploaderId,
      viewerUserId: viewer?.id ?? null,
      viewerRole: viewer?.role ?? null,
    })
  ) {
    return {
      title: "Manga no encontrado | MangaZen",
      description: "El manga solicitado no existe o fue eliminado.",
    };
  }

  return {
    title: `${manga.title} | MangaZen`,
    description:
      manga.description ??
      `Leé ${manga.title} en MangaZen. Puntuación ${manga.scoreAvg.toFixed(1)}.`,
    openGraph: {
      title: `${manga.title} | MangaZen`,
      description:
        manga.description ??
        `Leé ${manga.title} en MangaZen. Puntuación ${manga.scoreAvg.toFixed(1)}.`,
      images: manga.coverImage ? [{ url: manga.coverImage }] : [],
    },
  };
}

export default async function MangaDetailPage({ params }: PageProps) {
  const locale = await getLocale();
  const intlLocale = appLocaleToBcp47(locale);
  const tCat = await getTranslations("catalog");
  const tDon = await getTranslations("donation");
  const tStatus = await getTranslations("scanPanel.mangaStatus");
  const tType = await getTranslations("scanPanel.mangaType");
  const tDemo = await getTranslations("scanPanel.demographic");
  const translateTag = (name: string) => translateCatalogTagName(name, (k) => tCat(k));
  const { slug } = await params;
  const manga = await getMangaBySlug(slug);

  if (!manga) notFound();
  const sessionUserId = await getAuthenticatedUserIdServer();

  const [favoriteCount, likeCount, dislikeCount, currentUser] = await Promise.all([
    prisma.userFavorite.count({
      where: { mangaId: manga.id },
    }),
    prisma.vote.count({
      where: {
        mangaId: manga.id,
        targetType: "MANGA",
        value: 1,
      },
    }),
    prisma.vote.count({
      where: {
        mangaId: manga.id,
        targetType: "MANGA",
        value: -1,
      },
    }),
    sessionUserId
      ? prisma.user.findUnique({
          where: { id: sessionUserId },
          select: { id: true, isPro: true, role: true },
        })
      : Promise.resolve(null),
  ]);

  if (
    !canViewMangaInCatalog({
      reviewStatus: manga.reviewStatus,
      mangaUploaderId: manga.uploaderId,
      viewerUserId: currentUser?.id ?? null,
      viewerRole: currentUser?.role ?? null,
    })
  ) {
    notFound();
  }

  const isAuthenticated = !!currentUser;

  const chapterIds = manga.chapters.map((c) => c.id);
  let unlockIdSet = new Set<string>();
  if (isAuthenticated && currentUser) {
    const unlocked = await prisma.chapterUnlock.findMany({
      where: { userId: currentUser.id, chapterId: { in: chapterIds } },
      select: { chapterId: true },
    });
    unlockIdSet = new Set(unlocked.map((u) => u.chapterId));
  }

  const [userFavorite, userVote, userProgress] = isAuthenticated
    ? await Promise.all([
        prisma.userFavorite.findUnique({
          where: {
            userId_mangaId: {
              userId: currentUser.id,
              mangaId: manga.id,
            },
          },
          select: { userId: true },
        }),
        prisma.vote.findFirst({
          where: {
            userId: currentUser.id,
            targetType: "MANGA",
            mangaId: manga.id,
          },
          select: { value: true },
        }),
        prisma.mangaProgress.findUnique({
          where: {
            userId_mangaId: {
              userId: currentUser.id,
              mangaId: manga.id,
            },
          },
          select: {
            status: true,
            lastChapterId: true,
            lastPageNumber: true,
            lastChapter: { select: { number: true } },
          },
        }),
      ])
    : [null, null, null];

  const chapterCount = manga.chapters.length;

  const startChapter = pickStartChapter(
    manga.chapters.map((c) => ({ id: c.id, number: c.number, locale: c.locale })),
    locale
  );

  const formatChapterLabel = (n: number) =>
    Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");

  const progressChapter = userProgress?.lastChapter;
  const canContinueFromProgress =
    isAuthenticated &&
    !!userProgress?.lastChapterId &&
    progressChapter != null;

  const continueHref =
    canContinueFromProgress && userProgress.lastChapterId
      ? `/${locale}/read/${userProgress.lastChapterId}?page=${userProgress.lastPageNumber}`
      : null;

  const continueLabel =
    canContinueFromProgress && progressChapter
      ? tCat("mangaContinueReading", {
          chapter: formatChapterLabel(progressChapter.number),
          page: String(userProgress.lastPageNumber),
        })
      : null;

  const startHref = startChapter ? `/${locale}/read/${startChapter.id}?page=1` : null;
  const primaryHref = continueHref ?? startHref;
  const primaryLabel =
    continueLabel ??
    (startChapter
      ? tCat("mangaReadChapter", { chapter: formatChapterLabel(startChapter.number) })
      : tCat("mangaNoChaptersShort"));
  const primaryEmpty = chapterCount === 0 ? tCat("mangaNoChaptersYet") : null;

  const nowMs = getServerRequestTimeMs();

  const donationLinks =
    manga.uploader.role === "SCAN" || manga.uploader.role === "CREATOR"
      ? (manga.uploader.donationLinks ?? [])
      : [];

  const legacyLink =
    donationLinks.length === 0 && manga.uploader.externalDonationLink
      ? manga.uploader.externalDonationLink
      : null;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="w-full sm:w-[170px]">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-border bg-muted">
              {manga.coverImage ? (
                <Image
                  src={manga.coverImage}
                  alt={tCat("coverAlt", { title: manga.title })}
                  fill
                  sizes="(max-width: 640px) 50vw, 170px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  {tCat("coverFallbackShort")}
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">{manga.title}</h1>
            {manga.uploader && (
              <div className="mt-2 flex items-center gap-2">
                <Link
                  href={`/${locale}/user/${manga.uploader.username ?? manga.uploader.id}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-background/50 px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/40 hover:bg-primary/5"
                >
                  {manga.uploader.image ? (
                    <Image
                      src={manga.uploader.image}
                      alt=""
                      width={18}
                      height={18}
                      className="h-4 w-4 rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-[9px] font-bold text-primary">
                      {(manga.uploader.name ?? manga.uploader.username ?? "?").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <span className="max-w-[160px] truncate">
                    {manga.uploader.name ?? manga.uploader.username ?? tCat("unknownUploader")}
                  </span>
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    {manga.uploader.role === "SCAN"
                      ? "Scan"
                      : manga.uploader.role === "CREATOR"
                        ? "Creator"
                        : manga.uploader.role === "ADMIN"
                          ? "Admin"
                          : "MangaZen"}
                  </span>
                </Link>
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {manga.demographic && (
                <span className="rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  {tDemo.has(manga.demographic) ? tDemo(manga.demographic) : manga.demographic}
                </span>
              )}
              <span className="rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {tType.has(manga.type) ? tType(manga.type) : manga.type}
              </span>
              {manga.tags.slice(0, 4).map((relation) => (
                <span
                  key={relation.tag.name}
                  className="rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  {translateTag(relation.tag.name)}
                </span>
              ))}
              <span
                className={cn(
                  "rounded px-2 py-0.5 text-[11px] font-medium",
                  MANGA_PUBLICATION_LIGHT[manga.status] != null && MANGA_PUBLICATION_DARK[manga.status] != null
                    ? cn(MANGA_PUBLICATION_LIGHT[manga.status], MANGA_PUBLICATION_DARK[manga.status])
                    : "border border-border bg-muted text-foreground dark:bg-muted dark:text-muted-foreground"
                )}
              >
                {tStatus.has(manga.status) ? tStatus(manga.status) : manga.status}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-background/50 p-2.5">
                <p className="text-lg font-semibold">★ {manga.scoreAvg.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">{tCat("mangaDetailScore")}</p>
              </div>
              <div className="rounded-lg border border-border bg-background/50 p-2.5">
                <p className="text-lg font-semibold">{chapterCount}</p>
                <p className="text-xs text-muted-foreground">{tCat("mangaDetailChapterCount")}</p>
              </div>
              <div className="rounded-lg border border-border bg-background/50 p-2.5">
                <p className="text-lg font-semibold">{manga.scoreCount.toLocaleString(intlLocale)}</p>
                <p className="text-xs text-muted-foreground">{tCat("mangaDetailVotes")}</p>
              </div>
              <div className="rounded-lg border border-border bg-background/50 p-2.5">
                <p className="text-lg font-semibold">MangaZen</p>
                <p className="text-xs text-muted-foreground">{tCat("mangaDetailSource")}</p>
              </div>
            </div>

            <div className="mt-2">
              <MangaReaderCounter mangaSlug={manga.slug} />
            </div>

            <div className="mt-3">
              <MangaPrimaryReadCta
                href={primaryHref}
                label={primaryLabel}
                emptyLabel={primaryEmpty ?? tCat("mangaNoChaptersCta")}
              />
            </div>

            <div className="mt-3 flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                <MangaReactions
                  mangaSlug={manga.slug}
                  initialFavoriteCount={favoriteCount}
                  initialLikeCount={likeCount}
                  initialDislikeCount={dislikeCount}
                  initialFavorited={!!userFavorite}
                  initialVoteChoice={
                    userVote?.value === 1 ? "like" : userVote?.value === -1 ? "dislike" : null
                  }
                  isAuthenticated={isAuthenticated}
                />
                {donationLinks.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {donationLinks.map((link) => {
                      const platform = getPlatform(link.platform);
                      return (
                        <a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-medium text-foreground transition hover:bg-primary/15"
                        >
                          <Heart className="h-4 w-4 text-rose-500" aria-hidden />
                          {platform?.name ?? link.platform}
                        </a>
                      );
                    })}
                  </div>
                ) : legacyLink ? (
                  <a
                    href={legacyLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-medium text-foreground transition hover:bg-primary/15"
                  >
                    <Heart className="h-4 w-4 text-rose-500" aria-hidden />
                    {tDon("supportTeamButton")}
                  </a>
                ) : null}
              </div>
              <MangaReadingStatus
                mangaSlug={manga.slug}
                initialStatus={userProgress?.status ?? null}
                isAuthenticated={isAuthenticated}
              />
            </div>
          </div>
        </div>

        <section className="mt-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {tCat("mangaDetailSynopsis")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-foreground/90">
            {manga.description ?? tCat("mangaDetailSynopsisEmpty")}
          </p>
        </section>

        <AdSlotShell slotId="manga-detail-before-chapters" height="h-20" />

        <MangaChaptersWithComments
          userLocale={locale}
          mangaSlug={manga.slug}
          isAuthenticated={isAuthenticated}
          currentUserId={currentUser?.id ?? null}
          chapters={manga.chapters.map((chapter) => {
            const until = chapter.earlyAccessUntil;
            const eaActive =
              chapter.isEarlyAccess && until != null && until.getTime() > nowMs;
            const userHasAccess =
              !eaActive ||
              !!currentUser?.isPro ||
              unlockIdSet.has(chapter.id);
            return {
              id: chapter.id,
              number: chapter.number,
              title: chapter.title,
              createdAt: chapter.createdAt.toISOString(),
              locale: chapter.locale,
              pagesCount: chapter._count.pages,
              pageUrls: chapter.pages.map((p) => p.imageUrl),
              eaActive: !!eaActive,
              earlyAccessUntil: until?.toISOString() ?? null,
              userHasAccess,
            };
          })}
        />
      </section>
    </main>
  );
}
