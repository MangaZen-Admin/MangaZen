import { notFound } from "next/navigation";
import ReaderClient from "@/components/read/ReaderClient";
import { EarlyAccessGate } from "@/components/read/EarlyAccessGate";
import { prisma } from "@/lib/db";
import { getAuthenticatedUserIdServer } from "@/lib/auth-session";
import { canAccessChapter } from "@/lib/chapter-access";
import { canViewMangaInCatalog } from "@/lib/manga-visibility";
import { routing } from "@/i18n/routing";

type ReadPageProps = {
  params: Promise<{
    locale: string;
    chapterId: string;
  }>;
  searchParams: Promise<{
    page?: string;
  }>;
};

export default async function ReadChapterPage({ params, searchParams }: ReadPageProps) {
  const { locale, chapterId } = await params;
  const query = await searchParams;
  const requestedPage = Number(query.page ?? "1");

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: {
      id: true,
      number: true,
      title: true,
      status: true,
      mangaId: true,
      isEarlyAccess: true,
      earlyAccessUntil: true,
      earlyAccessPrice: true,
      startsWithSinglePage: true,
      locale: true,
      manga: {
        select: {
          slug: true,
          title: true,
          coverImage: true,
          uploaderId: true,
          reviewStatus: true,
          uploader: {
            select: {
              role: true,
              externalDonationLink: true,
              donationLinks: {
                orderBy: { order: "asc" },
                select: { id: true, platform: true, url: true },
              },
            },
          },
        },
      },
      pages: {
        orderBy: { pageNumber: "asc" },
        select: {
          id: true,
          pageNumber: true,
          imageUrl: true,
        },
      },
    },
  });

  if (!chapter) notFound();

  const sessionUserId = await getAuthenticatedUserIdServer();
  const sessionUser = sessionUserId
    ? await prisma.user.findUnique({
        where: { id: sessionUserId },
        select: { id: true, role: true, isPro: true },
      })
    : null;

  if (
    !canViewMangaInCatalog({
      reviewStatus: chapter.manga.reviewStatus,
      mangaUploaderId: chapter.manga.uploaderId,
      viewerUserId: sessionUser?.id ?? null,
      viewerRole: sessionUser?.role ?? null,
    })
  ) {
    notFound();
  }

  const isUploader =
    sessionUserId != null
      ? !!(await prisma.chapterUpload.findFirst({
          where: { chapterId: chapter.id, uploaderId: sessionUserId },
          select: { id: true },
        }))
      : false;

  const canRead =
    chapter.status === "APPROVED" || sessionUser?.role === "ADMIN" || isUploader;

  if (!canRead) notFound();

  const bypassEarlyAccess =
    chapter.status !== "APPROVED" || sessionUser?.role === "ADMIN" || isUploader;

  if (!bypassEarlyAccess) {
    const access = await canAccessChapter(sessionUserId, chapter.id, chapter);
    if (!access.allowed) {
      const zenRow = sessionUserId
        ? await prisma.user.findUnique({
            where: { id: sessionUserId },
            select: { zenCoins: true, zenShards: true },
          })
        : null;
      if (!chapter.earlyAccessUntil) {
        notFound();
      }
      return (
        <EarlyAccessGate
          locale={locale}
          chapterId={chapter.id}
          mangaSlug={chapter.manga.slug}
          mangaTitle={chapter.manga.title}
          coverImage={chapter.manga.coverImage}
          chapterNumber={chapter.number}
          chapterTitle={chapter.title}
          earlyAccessUntilIso={chapter.earlyAccessUntil.toISOString()}
          priceCoins={access.price}
          isCreatorEarlyAccess={chapter.manga.uploader.role === "CREATOR"}
          isLoggedIn={!!sessionUserId}
          zenCoins={zenRow?.zenCoins ?? 0}
          zenShards={zenRow?.zenShards ?? 0}
        />
      );
    }
  }

  const syncProgress = !!sessionUserId;

  const siblingChapters = await prisma.chapter.findMany({
    where: {
      mangaId: chapter.mangaId,
      number: chapter.number,
      status: "APPROVED",
    },
    select: { id: true, locale: true },
  });
  const chapterIdByUiLocale = new Map<string, string>();
  for (const row of siblingChapters) {
    chapterIdByUiLocale.set(row.locale.toLowerCase(), row.id);
  }
  const chapterLanguageOptions = routing.locales.map((loc) => ({
    locale: loc,
    chapterId: chapterIdByUiLocale.get(loc) ?? null,
  }));

  const [prevChapter, nextChapter] = await Promise.all([
    prisma.chapter.findFirst({
      where: {
        mangaId: chapter.mangaId,
        number: { lt: chapter.number },
        status: "APPROVED",
      },
      orderBy: { number: "desc" },
      select: { id: true },
    }),
    prisma.chapter.findFirst({
      where: {
        mangaId: chapter.mangaId,
        number: { gt: chapter.number },
        status: "APPROVED",
      },
      orderBy: { number: "asc" },
      select: {
        id: true,
        locale: true,
        number: true,
        title: true,
        pages: {
          orderBy: { pageNumber: "asc" },
          take: 1,
          select: { imageUrl: true },
        },
      },
    }),
  ]);

  const nextChapterForReader =
    nextChapter != null
      ? {
          href: `/${locale}/read/${nextChapter.id}`,
          locale: nextChapter.locale,
          number: nextChapter.number,
          title: nextChapter.title,
          firstPageImageUrl: nextChapter.pages[0]?.imageUrl ?? null,
        }
      : null;

  const uploaderDonationLinks =
    chapter.manga.uploader.role === "SCAN" || chapter.manga.uploader.role === "CREATOR"
      ? (chapter.manga.uploader.donationLinks ?? [])
      : [];

  const uploaderLegacyDonationLink =
    uploaderDonationLinks.length === 0 && chapter.manga.uploader.externalDonationLink
      ? chapter.manga.uploader.externalDonationLink
      : null;

  return (
    <ReaderClient
      key={chapter.id}
      mangaId={chapter.mangaId}
      mangaSlug={chapter.manga.slug}
      chapterId={chapter.id}
      chapterLocale={chapter.locale}
      chapterLanguageOptions={chapterLanguageOptions}
      syncProgress={syncProgress}
      mangaTitle={chapter.manga.title}
      chapterNumber={chapter.number}
      pages={chapter.pages}
      chapterStartsWithSinglePage={chapter.startsWithSinglePage}
      initialPage={Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1}
      backHref={`/${locale}/manga/${chapter.manga.slug}`}
      prevChapterHref={prevChapter ? `/${locale}/read/${prevChapter.id}` : null}
      nextChapterHref={nextChapterForReader?.href ?? null}
      nextChapterLocale={nextChapterForReader?.locale ?? null}
      nextChapterNumber={nextChapterForReader?.number ?? null}
      nextChapterTitle={nextChapterForReader?.title ?? null}
      nextChapterPreviewImage={nextChapterForReader?.firstPageImageUrl ?? null}
      uploaderDonationLinks={uploaderDonationLinks}
      uploaderLegacyDonationLink={uploaderLegacyDonationLink}
      showAds={!sessionUser?.isPro}
    />
  );
}
