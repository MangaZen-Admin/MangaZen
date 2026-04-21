import { prisma } from "@/lib/db";
import type { UserRole } from "@prisma/client";

const mangaCatalogWhere = (profileUserId: string) => ({
  OR: [{ reviewStatus: "APPROVED" as const }, { uploaderId: profileUserId }],
});

export async function loadPublicProfileSupplemental(profileUserId: string, role: UserRole) {
  const mWhere = mangaCatalogWhere(profileUserId);

  const [favorites, progressGroups, progressRows, commentsRaw, uploadStats] = await Promise.all([
    prisma.userFavorite.findMany({
      where: { userId: profileUserId, manga: mWhere },
      orderBy: { addedAt: "desc" },
      take: 5,
      select: {
        manga: { select: { title: true, slug: true, coverImage: true } },
      },
    }),
    prisma.mangaProgress.groupBy({
      by: ["status"],
      where: { userId: profileUserId, manga: mWhere },
      _count: { _all: true },
    }),
    prisma.mangaProgress.findMany({
      where: { userId: profileUserId, manga: mWhere },
      select: {
        status: true,
        updatedAt: true,
        manga: { select: { title: true, slug: true, coverImage: true } },
        lastChapter: { select: { number: true } },
      },
    }),
    prisma.comment.findMany({
      where: {
        userId: profileUserId,
        targetType: "CHAPTER",
        parentId: null,
        manga: mWhere,
      },
      select: {
        id: true,
        body: true,
        createdAt: true,
        manga: { select: { title: true, slug: true } },
        chapter: { select: { id: true, number: true } },
        votes: { select: { value: true } },
      },
    }),
    role === "SCAN" || role === "CREATOR"
      ? Promise.all([
          prisma.chapterUpload.count({ where: { uploaderId: profileUserId } }),
          prisma.chapterUpload.count({ where: { uploaderId: profileUserId, status: "APPROVED" } }),
          prisma.chapterUpload.findMany({
            where: { uploaderId: profileUserId },
            select: { chapter: { select: { mangaId: true } } },
          }),
        ])
      : Promise.resolve(null),
  ]);

  const countsByStatus: Record<string, number> = {};
  for (const g of progressGroups) {
    countsByStatus[g.status] = g._count._all;
  }

  const totalWithProgress = progressRows.length;

  let mostRead: { title: string; slug: string; coverImage: string | null; lastChapterNumber: number } | null =
    null;
  for (const row of progressRows) {
    const num = row.lastChapter?.number ?? 0;
    if (!mostRead || num > mostRead.lastChapterNumber) {
      mostRead = {
        title: row.manga.title,
        slug: row.manga.slug,
        coverImage: row.manga.coverImage,
        lastChapterNumber: num,
      };
    }
  }

  const scored = commentsRaw
    .filter((c): c is typeof c & { manga: NonNullable<typeof c.manga>; chapter: NonNullable<typeof c.chapter> } =>
      Boolean(c.manga && c.chapter)
    )
    .map((c) => {
      const net = c.votes.reduce((s, v) => s + v.value, 0);
      return { ...c, net };
    });
  scored.sort((a, b) => b.net - a.net || b.createdAt.getTime() - a.createdAt.getTime());
  const positive = scored.filter((c) => c.net > 0).slice(0, 5);
  let topComments = positive;
  if (topComments.length < 5) {
    const used = new Set(topComments.map((c) => c.id));
    const rest = scored
      .filter((c) => !used.has(c.id))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5 - topComments.length);
    topComments = [...topComments, ...rest];
  }

  let uploadsSummary: { totalChapters: number; approvedChapters: number; distinctMangas: number } | null = null;
  if (uploadStats) {
    const [totalChapters, approvedChapters, uploadRows] = uploadStats;
    const mangaSet = new Set(uploadRows.map((r) => r.chapter.mangaId));
    uploadsSummary = {
      totalChapters,
      approvedChapters,
      distinctMangas: mangaSet.size,
    };
  }

  return {
    favorites: favorites.map((f) => f.manga),
    countsByStatus,
    totalWithProgress,
    mostRead,
    topComments: topComments.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      netScore: c.net,
      mangaTitle: c.manga.title,
      mangaSlug: c.manga.slug,
      chapterNumber: c.chapter.number,
      chapterId: c.chapter.id,
    })),
    uploadsSummary,
  };
}
