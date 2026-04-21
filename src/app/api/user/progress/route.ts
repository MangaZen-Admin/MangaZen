import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequestWithRotation } from "@/lib/auth-session";
import { awardBadgeIfEarned } from "@/lib/badges/award-badge";
import { awardZenShards } from "@/lib/zen-currency";

function utcDayStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

type Body = {
  mangaId?: string;
  chapterId?: string;
  pageNumber?: number;
};

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const { userId: sessionUserId } = await authenticateRequestWithRotation(cookieStore, request.headers);

  if (!sessionUserId) {
    return NextResponse.json(
      { error: "AUTH_REQUIRED", message: "Necesitás una cuenta para guardar tu progreso." },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUserId },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json(
      { error: "AUTH_REQUIRED", message: "Tu sesión no es válida." },
      { status: 401 }
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const { mangaId, chapterId, pageNumber: rawPage } = body;
  if (typeof mangaId !== "string" || mangaId.length === 0) {
    return NextResponse.json({ error: "INVALID_MANGA_ID" }, { status: 400 });
  }
  if (typeof chapterId !== "string" || chapterId.length === 0) {
    return NextResponse.json({ error: "INVALID_CHAPTER_ID" }, { status: 400 });
  }

  const pageNumber = typeof rawPage === "number" && Number.isFinite(rawPage) ? Math.floor(rawPage) : 1;

  const chapter = await prisma.chapter.findFirst({
    where: { id: chapterId, mangaId },
    select: { id: true },
  });

  if (!chapter) {
    return NextResponse.json({ error: "CHAPTER_NOT_IN_MANGA" }, { status: 400 });
  }

  const pageCount = await prisma.page.count({ where: { chapterId } });
  const safePage = Math.min(Math.max(1, pageNumber), Math.max(1, pageCount));

  const row = await prisma.mangaProgress.upsert({
    where: {
      userId_mangaId: {
        userId: user.id,
        mangaId,
      },
    },
    create: {
      userId: user.id,
      mangaId,
      status: "READING",
      lastChapterId: chapterId,
      lastPageNumber: safePage,
    },
    update: {
      lastChapterId: chapterId,
      lastPageNumber: safePage,
    },
  });

  const now = new Date();
  const dayStart = utcDayStart(now);
  const [alreadyRewardedForChapterToday, rewardedReadsToday] = await Promise.all([
    prisma.zenTransaction.findFirst({
      where: {
        userId: user.id,
        type: "SHARD_ACTIVITY_READ",
        createdAt: { gte: dayStart },
        description: `chapter:${chapterId}`,
      },
      select: { id: true },
    }),
    prisma.zenTransaction.count({
      where: {
        userId: user.id,
        type: "SHARD_ACTIVITY_READ",
        createdAt: { gte: dayStart },
      },
    }),
  ]);

  if (!alreadyRewardedForChapterToday && rewardedReadsToday < 10) {
    await awardZenShards(user.id, 100, "SHARD_ACTIVITY_READ", `chapter:${chapterId}`);
  }

  const badgesEarned = await awardBadgeIfEarned(user.id, "PROGRESS_SAVED", {
    progressSavedAtHour: new Date().getHours(),
  });

  return NextResponse.json({
    mangaId: row.mangaId,
    chapterId: row.lastChapterId,
    pageNumber: row.lastPageNumber,
    badgesEarned,
  });
}
