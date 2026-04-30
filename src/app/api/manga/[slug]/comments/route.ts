import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { authenticateRequestWithRotation } from "@/lib/auth-session";
import { type AppLocale, isAppLocale } from "@/lib/chapter-comments";
import type { ChapterCommentJson } from "@/lib/chapter-comments-dto";
import { sanitizeCommentBody } from "@/lib/sanitize-text";
import { postChapterCommentSchema } from "@/lib/validation/comment-body";
import { awardBadgeIfEarned } from "@/lib/badges/award-badge";
import { canViewMangaInCatalog } from "@/lib/manga-visibility";
import { getPublicProfileUrlKey } from "@/lib/public-profile-url";
import { awardZenShards } from "@/lib/zen-currency";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

const PARENT_PAGE_SIZE = 30;
const REPLY_PAGE_SIZE = 10;

const commentAttempts = new Map<string, { timestamps: number[] }>();

function utcDayStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

async function parentCommentsWhere(
  chapterId: string,
  cursorId: string | null
): Promise<Prisma.CommentWhereInput> {
  const base: Prisma.CommentWhereInput = {
    chapterId,
    targetType: "CHAPTER",
    parentId: null,
  };
  if (!cursorId) return base;
  const cur = await prisma.comment.findFirst({
    where: { id: cursorId, chapterId, targetType: "CHAPTER", parentId: null },
    select: { createdAt: true, id: true },
  });
  if (!cur) return base;
  return {
    ...base,
    OR: [{ createdAt: { lt: cur.createdAt } }, { AND: [{ createdAt: cur.createdAt }, { id: { lt: cur.id } }] }],
  };
}

async function parentMangaCommentsWhere(
  mangaId: string,
  cursorId: string | null
): Promise<Prisma.CommentWhereInput> {
  const base: Prisma.CommentWhereInput = {
    mangaId,
    targetType: "MANGA",
    parentId: null,
  };
  if (!cursorId) return base;
  const cur = await prisma.comment.findFirst({
    where: { id: cursorId, mangaId, targetType: "MANGA", parentId: null },
    select: { createdAt: true, id: true },
  });
  if (!cur) return base;
  return {
    ...base,
    OR: [{ createdAt: { lt: cur.createdAt } }, { AND: [{ createdAt: cur.createdAt }, { id: { lt: cur.id } }] }],
  };
}

type CommentAuthor = {
  name: string | null;
  image: string | null;
  profileKey: string;
  isPro: boolean;
  proPlan: "bronze" | "silver" | "gold" | "platinum" | null;
};

async function voteStatsForComments(
  commentIds: string[]
): Promise<Map<string, { likes: number; dislikes: number }>> {
  const map = new Map<string, { likes: number; dislikes: number }>();
  for (const id of commentIds) {
    map.set(id, { likes: 0, dislikes: 0 });
  }
  if (commentIds.length === 0) return map;

  const rows = await prisma.vote.groupBy({
    by: ["commentId", "value"],
    where: {
      targetType: "COMMENT",
      commentId: { in: commentIds },
    },
    _count: { id: true },
  });

  for (const row of rows) {
    if (!row.commentId) continue;
    const cur = map.get(row.commentId) ?? { likes: 0, dislikes: 0 };
    const n = row._count.id;
    if (row.value === 1) cur.likes = n;
    if (row.value === -1) cur.dislikes = n;
    map.set(row.commentId, cur);
  }
  return map;
}

async function myVotesForComments(
  userId: string,
  commentIds: string[]
): Promise<Map<string, 1 | -1>> {
  const out = new Map<string, 1 | -1>();
  if (commentIds.length === 0) return out;
  const rows = await prisma.vote.findMany({
    where: {
      userId,
      targetType: "COMMENT",
      commentId: { in: commentIds },
    },
    select: { commentId: true, value: true },
  });
  for (const row of rows) {
    if (row.commentId && (row.value === 1 || row.value === -1)) {
      out.set(row.commentId, row.value as 1 | -1);
    }
  }
  return out;
}

function toJson(
  id: string,
  body: string,
  createdAt: Date,
  updatedAt: Date,
  locale: string,
  authorUserId: string,
  author: CommentAuthor,
  stats: Map<string, { likes: number; dislikes: number }>,
  myVotes: Map<string, 1 | -1>,
  replies: ChapterCommentJson[]
): ChapterCommentJson {
  const s = stats.get(id) ?? { likes: 0, dislikes: 0 };
  const mv = myVotes.get(id);
  return {
    id,
    body,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    authorUserId,
    locale,
    author,
    likeCount: s.likes,
    dislikeCount: s.dislikes,
    myVote: mv ?? null,
    replies,
  } as ChapterCommentJson;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const url = new URL(request.url);
    const chapterId = url.searchParams.get("chapterId");
    const isMangaLevel = !chapterId;

    const manga = await prisma.manga.findUnique({
      where: { slug },
      select: { id: true, reviewStatus: true, uploaderId: true },
    });
    if (!manga) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const cookieStore = await cookies();
    const { userId: sessionUserId } = await authenticateRequestWithRotation(cookieStore, request.headers);
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
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    if (isMangaLevel) {
      const cursorParam = url.searchParams.get("cursor");
      const parentWhere = await parentMangaCommentsWhere(manga.id, cursorParam);

      const parentBatch = await prisma.comment.findMany({
        where: parentWhere,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: PARENT_PAGE_SIZE + 1,
        select: {
          id: true,
          body: true,
          locale: true,
          createdAt: true,
          updatedAt: true,
          userId: true,
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              username: true,
              isPro: true,
              proPlan: true,
            },
          },
        },
      });

      const hasMoreM = parentBatch.length > PARENT_PAGE_SIZE;
      const parents = parentBatch.slice(0, PARENT_PAGE_SIZE);
      const nextCursorM =
        hasMoreM && parents.length > 0 ? parents[parents.length - 1]!.id : null;

      const parentIds = parents.map((p) => p.id);
      const repliesRaw =
        parentIds.length === 0
          ? []
          : (
              await Promise.all(
                parentIds.map((pid) =>
                  prisma.comment.findMany({
                    where: { parentId: pid, targetType: "MANGA", mangaId: manga.id },
                    orderBy: { createdAt: "asc" },
                    take: REPLY_PAGE_SIZE + 1,
                    select: {
                      id: true,
                      body: true,
                      locale: true,
                      createdAt: true,
                      updatedAt: true,
                      userId: true,
                      parentId: true,
                      user: {
                        select: {
                          id: true,
                          name: true,
                          image: true,
                          username: true,
                          isPro: true,
                          proPlan: true,
                        },
                      },
                    },
                  })
                )
              )
            ).flat();

      const allIds = [...parentIds, ...repliesRaw.map((r) => r.id)];
      const [stats, myVotesMap] = await Promise.all([
        voteStatsForComments(allIds),
        sessionUserId
          ? myVotesForComments(sessionUserId, allIds)
          : Promise.resolve(new Map<string, 1 | -1>()),
      ]);

      const repliesByParent = new Map<string, typeof repliesRaw>();
      for (const r of repliesRaw) {
        if (!r.parentId) continue;
        const list = repliesByParent.get(r.parentId) ?? [];
        list.push(r);
        repliesByParent.set(r.parentId, list);
      }

      const comments: ChapterCommentJson[] = parents.map((p) => {
        const childRows = (repliesByParent.get(p.id) ?? []).slice(0, REPLY_PAGE_SIZE);
        const replies: ChapterCommentJson[] = childRows.map((r) =>
          toJson(
            r.id,
            r.body,
            r.createdAt,
            r.updatedAt,
            r.locale,
            r.userId,
            {
              name: r.user.name,
              image: r.user.image,
              profileKey: getPublicProfileUrlKey({
                id: r.userId,
                username: r.user.username,
              }),
              isPro: r.user.isPro,
              proPlan: r.user.isPro && r.user.proPlan ? (r.user.proPlan as "bronze" | "silver" | "gold" | "platinum") : null,
            },
            stats,
            myVotesMap,
            []
          )
        );
        return toJson(
          p.id,
          p.body,
          p.createdAt,
          p.updatedAt,
          p.locale,
          p.userId,
          {
            name: p.user.name,
            image: p.user.image,
            profileKey: getPublicProfileUrlKey({
              id: p.userId,
              username: p.user.username,
            }),
            isPro: p.user.isPro,
            proPlan: p.user.isPro && p.user.proPlan ? (p.user.proPlan as "bronze" | "silver" | "gold" | "platinum") : null,
          },
          stats,
          myVotesMap,
          replies
        );
      });

      return NextResponse.json({ comments, hasMore: hasMoreM, nextCursor: nextCursorM });
    }

    if (!chapterId) {
      return NextResponse.json({ error: "MISSING_CHAPTER_ID" }, { status: 400 });
    }

    const chapter = await prisma.chapter.findFirst({
      where: { id: chapterId, mangaId: manga.id },
      select: { id: true },
    });
    if (!chapter) {
      return NextResponse.json({ error: "CHAPTER_NOT_FOUND" }, { status: 404 });
    }

    const cursorParam = url.searchParams.get("cursor");
    const parentWhere = await parentCommentsWhere(chapter.id, cursorParam);

    const parentBatch = await prisma.comment.findMany({
      where: parentWhere,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PARENT_PAGE_SIZE + 1,
      select: {
        id: true,
        body: true,
        locale: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            username: true,
            isPro: true,
            proPlan: true,
          },
        },
      },
    });

    const hasMore = parentBatch.length > PARENT_PAGE_SIZE;
    const parents = parentBatch.slice(0, PARENT_PAGE_SIZE);
    const nextCursor = hasMore && parents.length > 0 ? parents[parents.length - 1]!.id : null;

    const parentIds = parents.map((p) => p.id);
    const repliesRaw =
      parentIds.length === 0
        ? []
        : (
            await Promise.all(
              parentIds.map((pid) =>
                prisma.comment.findMany({
                  where: {
                    parentId: pid,
                    targetType: "CHAPTER",
                    chapterId: chapter.id,
                  },
                  orderBy: { createdAt: "asc" },
                  take: REPLY_PAGE_SIZE + 1,
                  select: {
                    id: true,
                    body: true,
                    locale: true,
                    createdAt: true,
                    updatedAt: true,
                    userId: true,
                    parentId: true,
                    user: {
                      select: {
                        id: true,
                        name: true,
                        image: true,
                        username: true,
                        isPro: true,
                        proPlan: true,
                      },
                    },
                  },
                })
              )
            )
          ).flat();

    const allIds = [...parentIds, ...repliesRaw.map((r) => r.id)];
    const [stats, myVotesMap] = await Promise.all([
      voteStatsForComments(allIds),
      sessionUserId ? myVotesForComments(sessionUserId, allIds) : Promise.resolve(new Map<string, 1 | -1>()),
    ]);

    const repliesByParent = new Map<string, typeof repliesRaw>();
    for (const r of repliesRaw) {
      if (!r.parentId) continue;
      const list = repliesByParent.get(r.parentId) ?? [];
      list.push(r);
      repliesByParent.set(r.parentId, list);
    }

    const comments: ChapterCommentJson[] = parents.map((p) => {
      const childRows = (repliesByParent.get(p.id) ?? []).slice(0, REPLY_PAGE_SIZE);
      const replies: ChapterCommentJson[] = childRows.map((r) =>
        toJson(
          r.id,
          r.body,
          r.createdAt,
          r.updatedAt,
          r.locale,
          r.userId,
          {
            name: r.user.name,
            image: r.user.image,
            profileKey: getPublicProfileUrlKey({ id: r.userId, username: r.user.username }),
            isPro: r.user.isPro,
            proPlan: r.user.isPro && r.user.proPlan ? (r.user.proPlan as "bronze" | "silver" | "gold" | "platinum") : null,
          },
          stats,
          myVotesMap,
          []
        )
      );
      return toJson(
        p.id,
        p.body,
        p.createdAt,
        p.updatedAt,
        p.locale,
        p.userId,
        {
          name: p.user.name,
          image: p.user.image,
          profileKey: getPublicProfileUrlKey({ id: p.userId, username: p.user.username }),
          isPro: p.user.isPro,
          proPlan: p.user.isPro && p.user.proPlan ? (p.user.proPlan as "bronze" | "silver" | "gold" | "platinum") : null,
        },
        stats,
        myVotesMap,
        replies
      );
    });

    return NextResponse.json({ comments, hasMore, nextCursor });
  } catch (e) {
    console.error("[GET /api/manga/.../comments]", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const cookieStore = await cookies();
    const { userId: sessionUserId } = await authenticateRequestWithRotation(cookieStore, request.headers);

    if (!sessionUserId) {
      return NextResponse.json(
        { error: "AUTH_REQUIRED", message: "Necesitás una cuenta para comentar." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUserId },
      select: { id: true, role: true },
    });
    if (!user) {
      return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    }

    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minuto
    const maxPerMinute = 10;
    const rlKey = `comment:${user.id}`;
    const rlRecord = commentAttempts.get(rlKey);
    if (rlRecord) {
      rlRecord.timestamps = rlRecord.timestamps.filter((t) => now - t < windowMs);
      if (rlRecord.timestamps.length >= maxPerMinute) {
        return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
      }
      rlRecord.timestamps.push(now);
    } else {
      commentAttempts.set(rlKey, { timestamps: [now] });
    }

    const { slug } = await context.params;
    let jsonBody: unknown;
    try {
      jsonBody = await request.json();
    } catch {
      return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
    }

    const parsed = postChapterCommentSchema.safeParse(jsonBody);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      if (first.content?.length) {
        const msg = first.content[0];
        if (msg === "EMPTY") {
          return NextResponse.json({ error: "EMPTY_CONTENT" }, { status: 400 });
        }
      }
      return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
    }

    const { chapterId, content, parentId, locale: localeRaw } = parsed.data;
    const sanitized = sanitizeCommentBody(content);
    if (!sanitized) {
      return NextResponse.json({ error: "EMPTY_CONTENT" }, { status: 400 });
    }
    if (!isAppLocale(localeRaw)) {
      return NextResponse.json({ error: "INVALID_LOCALE" }, { status: 400 });
    }
    const locale: AppLocale = localeRaw;

    const manga = await prisma.manga.findUnique({
      where: { slug },
      select: { id: true, reviewStatus: true, uploaderId: true },
    });
    if (
      !manga ||
      !canViewMangaInCatalog({
        reviewStatus: manga.reviewStatus,
        mangaUploaderId: manga.uploaderId,
        viewerUserId: user.id,
        viewerRole: user.role,
      })
    ) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const isMangaComment = !chapterId;

    if (isMangaComment) {
      const resolvedParentId = parentId === undefined || parentId === null ? null : parentId;

      if (resolvedParentId) {
        const parent = await prisma.comment.findFirst({
          where: {
            id: resolvedParentId,
            mangaId: manga.id,
            targetType: "MANGA",
            parentId: null,
          },
          select: { id: true },
        });
        if (!parent) {
          return NextResponse.json({ error: "INVALID_PARENT" }, { status: 400 });
        }
      }

      const created = await prisma.comment.create({
        data: {
          body: sanitized,
          locale,
          userId: user.id,
          targetType: "MANGA",
          mangaId: manga.id,
          parentId: resolvedParentId,
        },
        select: {
          id: true,
          body: true,
          locale: true,
          createdAt: true,
          updatedAt: true,
          userId: true,
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              username: true,
              isPro: true,
              proPlan: true,
            },
          },
        },
      });

      const dayStart = utcDayStart(new Date());
      const commentsRewardedToday = await prisma.zenTransaction.count({
        where: {
          userId: user.id,
          type: "SHARD_ACTIVITY_COMMENT",
          createdAt: { gte: dayStart },
        },
      });
      if (commentsRewardedToday < 5) {
        await awardZenShards(
          user.id,
          500,
          "SHARD_ACTIVITY_COMMENT",
          `comment:${created.id}`
        );
      }

      const badgesEarned = await awardBadgeIfEarned(user.id, "COMMENT_POSTED");

      return NextResponse.json({
        comment: toJson(
          created.id,
          created.body,
          created.createdAt,
          created.updatedAt,
          created.locale,
          created.userId,
          {
            name: created.user.name,
            image: created.user.image,
            profileKey: getPublicProfileUrlKey({
              id: created.user.id,
              username: created.user.username,
            }),
            isPro: created.user.isPro,
            proPlan: created.user.isPro && created.user.proPlan ? (created.user.proPlan as "bronze" | "silver" | "gold" | "platinum") : null,
          },
          new Map([[created.id, { likes: 0, dislikes: 0 }]]),
          new Map(),
          []
        ),
        badgesEarned,
      });
    }

    if (!chapterId) {
      return NextResponse.json({ error: "MISSING_CHAPTER_ID" }, { status: 400 });
    }

    const chapter = await prisma.chapter.findFirst({
      where: { id: chapterId, mangaId: manga.id },
      select: { id: true },
    });
    if (!chapter) {
      return NextResponse.json({ error: "CHAPTER_NOT_FOUND" }, { status: 404 });
    }

    const resolvedParentId = parentId === undefined ? null : parentId;

    if (resolvedParentId) {
      const parent = await prisma.comment.findFirst({
        where: {
          id: resolvedParentId,
          chapterId: chapter.id,
          targetType: "CHAPTER",
          parentId: null,
        },
        select: { id: true },
      });
      if (!parent) {
        return NextResponse.json({ error: "INVALID_PARENT" }, { status: 400 });
      }
    }

    const created = await prisma.comment.create({
      data: {
        body: sanitized,
        locale,
        userId: user.id,
        targetType: "CHAPTER",
        chapterId: chapter.id,
        parentId: resolvedParentId,
      },
      select: {
        id: true,
        body: true,
        locale: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            username: true,
            isPro: true,
            proPlan: true,
          },
        },
      },
    });

    const dayStart = utcDayStart(new Date());
    const commentsRewardedToday = await prisma.zenTransaction.count({
      where: {
        userId: user.id,
        type: "SHARD_ACTIVITY_COMMENT",
        createdAt: { gte: dayStart },
      },
    });
    if (commentsRewardedToday < 5) {
      await awardZenShards(user.id, 500, "SHARD_ACTIVITY_COMMENT", `comment:${created.id}`);
    }

    const badgesEarned = await awardBadgeIfEarned(user.id, "COMMENT_POSTED");

    return NextResponse.json({
      comment: toJson(
        created.id,
        created.body,
        created.createdAt,
        created.updatedAt,
        created.locale,
        created.userId,
        {
          name: created.user.name,
          image: created.user.image,
          profileKey: getPublicProfileUrlKey({ id: created.user.id, username: created.user.username }),
          isPro: created.user.isPro,
          proPlan: created.user.isPro && created.user.proPlan ? (created.user.proPlan as "bronze" | "silver" | "gold" | "platinum") : null,
        },
        new Map([[created.id, { likes: 0, dislikes: 0 }]]),
        new Map(),
        []
      ),
      badgesEarned,
    });
  } catch (e) {
    console.error("[POST /api/manga/.../comments]", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
