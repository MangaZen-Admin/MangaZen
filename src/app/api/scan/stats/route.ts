import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireScanAccess } from "@/lib/scan-access";
import type { ScanStatsPeriod } from "@/types/scan-stats";

export const runtime = "nodejs";

function parsePeriod(raw: string | null): ScanStatsPeriod {
  if (raw === "today" || raw === "week" || raw === "month") return raw;
  return "week";
}

function utcDayStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function getPeriodRange(period: ScanStatsPeriod, now: Date): { start: Date; end: Date } {
  const end = new Date(now);
  if (period === "today") {
    const start = utcDayStart(now);
    return { start, end };
  }
  if (period === "week") {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { start, end };
  }
  const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { start, end };
}

function buildUploadChart(
  period: ScanStatsPeriod,
  uploads: { submittedAt: Date }[],
  range: { start: Date; end: Date },
  now: Date
): { bucketStartIso: string; uploads: number }[] {
  const inRange = uploads.filter((u) => u.submittedAt >= range.start && u.submittedAt <= range.end);

  if (period === "today") {
    const day0 = utcDayStart(now);
    return Array.from({ length: 24 }, (_, h) => {
      const bs = new Date(day0.getTime() + h * 3600 * 1000);
      const be = new Date(bs.getTime() + 3600 * 1000);
      const count = inRange.filter((u) => u.submittedAt >= bs && u.submittedAt < be).length;
      return { bucketStartIso: bs.toISOString(), uploads: count };
    });
  }

  if (period === "week") {
    const start0 = utcDayStart(range.start);
    return Array.from({ length: 7 }, (_, i) => {
      const bs = new Date(start0.getTime() + i * 24 * 60 * 60 * 1000);
      const be = new Date(bs.getTime() + 24 * 60 * 60 * 1000);
      const count = inRange.filter((u) => u.submittedAt >= bs && u.submittedAt < be).length;
      return { bucketStartIso: bs.toISOString(), uploads: count };
    });
  }

  const start0 = utcDayStart(range.start);
  return Array.from({ length: 30 }, (_, i) => {
    const bs = new Date(start0.getTime() + i * 24 * 60 * 60 * 1000);
    const be = new Date(bs.getTime() + 24 * 60 * 60 * 1000);
    const count = inRange.filter((u) => u.submittedAt >= bs && u.submittedAt < be).length;
    return { bucketStartIso: bs.toISOString(), uploads: count };
  });
}

export async function GET(request: Request) {
  const gate = await requireScanAccess(request.headers);
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const period = parsePeriod(searchParams.get("period"));
  const now = new Date();
  const range = getPeriodRange(period, now);

  const [userRow, myUploads] = await Promise.all([
    prisma.user.findUnique({
      where: { id: gate.user.id },
      select: { zenCoins: true, zenShards: true },
    }),
    prisma.chapterUpload.findMany({
      where: { uploaderId: gate.user.id },
      select: {
        id: true,
        status: true,
        submittedAt: true,
        chapterId: true,
        chapter: {
          select: {
            id: true,
            number: true,
            title: true,
            mangaId: true,
            manga: {
              select: {
                id: true,
                title: true,
                slug: true,
                coverImage: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const zenCoins = userRow?.zenCoins ?? 0;
  const zenShards = userRow?.zenShards ?? 0;

  const boostSpend = await prisma.zenTransaction.aggregate({
    where: {
      userId: gate.user.id,
      type: { in: ["COIN_BOOST_AD", "SHARD_BOOST_AD"] },
      createdAt: { gte: range.start, lte: range.end },
    },
    _sum: { amount: true },
  });

  const boostSpendInPeriod = Math.abs(boostSpend._sum.amount ?? 0);

  const totalUploads = myUploads.length;
  const mangaIds = new Set(myUploads.map((u) => u.chapter.mangaId));
  const totalMangas = mangaIds.size;

  let pending = 0;
  let approved = 0;
  let rejected = 0;
  for (const u of myUploads) {
    if (u.status === "PENDING") pending += 1;
    else if (u.status === "APPROVED") approved += 1;
    else if (u.status === "REJECTED") rejected += 1;
  }

  const chapterIds = [...new Set(myUploads.map((u) => u.chapterId))];

  const uploadsInPeriod = myUploads.filter(
    (u) => u.submittedAt >= range.start && u.submittedAt <= range.end
  );
  const chaptersUploadedInPeriod = uploadsInPeriod.length;

  let approximateViewsInPeriod = 0;
  if (chapterIds.length > 0) {
    const viewsAgg = await prisma.chapter.aggregate({
      where: { id: { in: chapterIds } },
      _sum: { viewCount: true },
    });
    approximateViewsInPeriod = viewsAgg._sum.viewCount ?? 0;
  }

  const chart = buildUploadChart(
    period,
    myUploads.map((u) => ({ submittedAt: u.submittedAt })),
    range,
    now
  );

  const chapterViews =
    chapterIds.length === 0
      ? []
      : await prisma.chapter.findMany({
          where: { id: { in: chapterIds } },
          select: { id: true, viewCount: true },
        });

  const viewsByChapterId = new Map<string, number>(
    chapterViews.map((c) => [c.id, c.viewCount])
  );

  const uploadByChapterId = new Map(myUploads.map((u) => [u.chapterId, u] as const));

  const topChapters = [...viewsByChapterId.entries()]
    .map(([chapterId, views]) => {
      const u = uploadByChapterId.get(chapterId);
      if (!u) return null;
      return {
        chapterId,
        chapterNumber: u.chapter.number,
        chapterTitle: u.chapter.title,
        mangaTitle: u.chapter.manga.title,
        mangaSlug: u.chapter.manga.slug,
        views,
        uploadStatus: u.status,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  const chaptersByManga = new Map<string, string[]>();
  for (const u of myUploads) {
    const mid = u.chapter.mangaId;
    if (!chaptersByManga.has(mid)) chaptersByManga.set(mid, []);
    chaptersByManga.get(mid)!.push(u.chapterId);
  }

  const topMangaResolved = await Promise.all(
    [...chaptersByManga.entries()].map(async ([mangaId, chIds]) => {
      const mangaRow = await prisma.manga.findUnique({
        where: { id: mangaId },
        select: {
          totalViews: true,
          title: true,
          slug: true,
          coverImage: true,
        },
      });
      if (!mangaRow) return null;
      return {
        mangaId,
        title: mangaRow.title,
        slug: mangaRow.slug,
        coverImage: mangaRow.coverImage,
        chaptersUploaded: chIds.length,
        totalViews: mangaRow.totalViews,
      };
    })
  );

  const topMangas = topMangaResolved
    .filter((x): x is NonNullable<typeof x> => x != null)
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, 3);

  return NextResponse.json({
    period: period as ScanStatsPeriod,
    range: { start: range.start.toISOString(), end: range.end.toISOString() },
    totals: {
      totalChaptersUploaded: totalUploads,
      totalMangasParticipated: totalMangas,
      byStatus: { PENDING: pending, APPROVED: approved, REJECTED: rejected },
      zenCoins,
      zenShards,
    },
    periodMetrics: {
      chaptersUploaded: chaptersUploadedInPeriod,
      approximateViews: approximateViewsInPeriod,
      boostSpend: boostSpendInPeriod,
    },
    chart,
    topChapters,
    topMangas,
  });
}
