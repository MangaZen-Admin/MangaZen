import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminJson } from "@/lib/admin-api-auth";
import type { AdminScanDetailResponse } from "@/types/admin-scan-stats";

export const runtime = "nodejs";

function utcDayStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

type RouteCtx = { params: Promise<{ userId: string }> };

export async function GET(request: Request, context: RouteCtx) {
  const gate = await requireAdminJson(request);
  if (!gate.ok) return gate.response;

  const { userId } = await context.params;

  const user = await prisma.user.findFirst({
    where: { id: userId, role: { in: ["SCAN", "CREATOR"] } },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      role: true,
      zenPoints: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const uploads = await prisma.chapterUpload.findMany({
    where: { uploaderId: userId },
    select: {
      id: true,
      status: true,
      submittedAt: true,
      chapterId: true,
    },
  });

  let uploaded = 0;
  let approved = 0;
  let rejected = 0;
  const chapterIds = new Set<string>();
  for (const u of uploads) {
    uploaded += 1;
    chapterIds.add(u.chapterId);
    if (u.status === "APPROVED") approved += 1;
    else if (u.status === "REJECTED") rejected += 1;
  }

  const chapterIdList = [...chapterIds];
  let totalViews = 0;
  const viewsByChapter = new Map<string, number>();

  if (chapterIdList.length > 0) {
    const grouped = await prisma.mangaProgress.groupBy({
      by: ["lastChapterId"],
      where: { lastChapterId: { in: chapterIdList } },
      _count: { _all: true },
    });
    for (const row of grouped) {
      if (row.lastChapterId) {
        viewsByChapter.set(row.lastChapterId, row._count._all);
        totalViews += row._count._all;
      }
    }
  }

  const now = new Date();
  const startToday = utcDayStart(now);
  const startWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const baseWhere =
    chapterIdList.length === 0
      ? null
      : ({
          lastChapterId: { in: chapterIdList },
        } as const);

  const [viewsToday, viewsWeek, viewsMonth] =
    baseWhere == null
      ? [0, 0, 0]
      : await Promise.all([
          prisma.mangaProgress.count({
            where: {
              ...baseWhere,
              updatedAt: { gte: startToday, lte: now },
            },
          }),
          prisma.mangaProgress.count({
            where: {
              ...baseWhere,
              updatedAt: { gte: startWeek, lte: now },
            },
          }),
          prisma.mangaProgress.count({
            where: {
              ...baseWhere,
              updatedAt: { gte: startMonth, lte: now },
            },
          }),
        ]);

  const topChapterIds = [...viewsByChapter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  const topChaptersData =
    topChapterIds.length === 0
      ? []
      : await prisma.chapter.findMany({
          where: { id: { in: topChapterIds } },
          select: {
            id: true,
            number: true,
            title: true,
            manga: { select: { title: true, slug: true } },
          },
        });

  const topChapters = topChapterIds
    .map((chapterId) => {
      const ch = topChaptersData.find((c) => c.id === chapterId);
      if (!ch) return null;
      return {
        chapterId: ch.id,
        chapterNumber: ch.number,
        chapterTitle: ch.title,
        mangaTitle: ch.manga.title,
        mangaSlug: ch.manga.slug,
        views: viewsByChapter.get(chapterId) ?? 0,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  const viewsByManga = new Map<string, { title: string; slug: string; coverImage: string | null; views: number }>();

  if (chapterIdList.length > 0) {
    const chaptersForManga = await prisma.chapter.findMany({
      where: { id: { in: chapterIdList } },
      select: {
        id: true,
        mangaId: true,
        manga: { select: { title: true, slug: true, coverImage: true } },
      },
    });

    for (const ch of chaptersForManga) {
      const v = viewsByChapter.get(ch.id) ?? 0;
      if (v === 0) continue;
      const cur = viewsByManga.get(ch.mangaId);
      if (cur) cur.views += v;
      else {
        viewsByManga.set(ch.mangaId, {
          title: ch.manga.title,
          slug: ch.manga.slug,
          coverImage: ch.manga.coverImage,
          views: v,
        });
      }
    }
  }

  const topMangas = [...viewsByManga.entries()]
    .map(([mangaId, m]) => ({
      mangaId,
      title: m.title,
      slug: m.slug,
      coverImage: m.coverImage,
      views: m.views,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 3);

  const uploadsByDay: { day: string; count: number }[] = [];
  const day0 = utcDayStart(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000));
  for (let i = 0; i < 30; i += 1) {
    const bs = new Date(day0.getTime() + i * 24 * 60 * 60 * 1000);
    const be = new Date(bs.getTime() + 24 * 60 * 60 * 1000);
    const count = uploads.filter((u) => u.submittedAt >= bs && u.submittedAt < be).length;
    uploadsByDay.push({ day: bs.toISOString().slice(0, 10), count });
  }

  const pendingUploadRows = await prisma.chapterUpload.findMany({
    where: {
      uploaderId: userId,
      status: "PENDING",
    },
    orderBy: { submittedAt: "asc" },
    include: {
      chapter: {
        select: {
          id: true,
          number: true,
          title: true,
          locale: true,
          language: true,
          status: true,
          manga: { select: { title: true, slug: true, coverImage: true } },
        },
      },
    },
  });

  const pendingChapters = pendingUploadRows
    .filter((row) => row.chapter.status === "PENDING")
    .map((row) => ({
      uploadId: row.id,
      chapterId: row.chapter.id,
      chapterNumber: row.chapter.number,
      chapterTitle: row.chapter.title,
      chapterLocale: row.chapter.locale,
      chapterLanguage: row.chapter.language,
      mangaTitle: row.chapter.manga.title,
      mangaSlug: row.chapter.manga.slug,
      coverImage: row.chapter.manga.coverImage,
      submittedAt: row.submittedAt.toISOString(),
    }));

  const body: AdminScanDetailResponse = {
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      image: user.image,
      role: user.role as "SCAN" | "CREATOR",
      zenPoints: user.zenPoints,
      createdAt: user.createdAt.toISOString(),
    },
    totals: {
      uploaded,
      approved,
      rejected,
      /** Capítulos con upload PENDING y capítulo aún en revisión (misma lista que `pendingChapters`). */
      pending: pendingChapters.length,
      totalViews,
    },
    viewsByPeriod: {
      today: viewsToday,
      week: viewsWeek,
      month: viewsMonth,
    },
    topChapters,
    topMangas,
    uploadsByDay,
    pendingChapters,
  };

  return NextResponse.json(body);
}
