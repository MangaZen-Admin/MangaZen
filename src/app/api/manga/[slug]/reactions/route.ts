import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequestWithRotation } from "@/lib/auth-session";
import { awardBadgeIfEarned } from "@/lib/badges/award-badge";
import { canViewMangaInCatalog } from "@/lib/manga-visibility";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

type ReactionAction = "toggle_favorite" | "set_like" | "set_dislike";

export async function POST(request: Request, context: RouteContext) {
  const cookieStore = await cookies();
  const { userId: sessionUserId } = await authenticateRequestWithRotation(cookieStore, request.headers);

  if (!sessionUserId) {
    return NextResponse.json(
      { error: "AUTH_REQUIRED", message: "Necesitás una cuenta para votar o guardar favoritos." },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUserId },
    select: { id: true, role: true },
  });

  if (!user) {
    return NextResponse.json(
      { error: "AUTH_REQUIRED", message: "Tu sesión no es válida. Iniciá sesión de nuevo." },
      { status: 401 }
    );
  }

  const { slug } = await context.params;
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

  const body = (await request.json()) as { action?: ReactionAction };
  const action = body?.action;

  if (!action) {
    return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
  }

  const [hadFavorite, voteBefore] = await Promise.all([
    prisma.userFavorite.findUnique({
      where: {
        userId_mangaId: {
          userId: user.id,
          mangaId: manga.id,
        },
      },
      select: { userId: true },
    }),
    prisma.vote.findFirst({
      where: {
        userId: user.id,
        targetType: "MANGA",
        mangaId: manga.id,
      },
      select: { value: true },
    }),
  ]);
  const hadLikeBefore = voteBefore?.value === 1;

  await prisma.$transaction(async (tx) => {
    if (action === "toggle_favorite") {
      const existingFavorite = await tx.userFavorite.findUnique({
        where: {
          userId_mangaId: {
            userId: user.id,
            mangaId: manga.id,
          },
        },
        select: { userId: true },
      });

      if (existingFavorite) {
        await tx.userFavorite.delete({
          where: {
            userId_mangaId: {
              userId: user.id,
              mangaId: manga.id,
            },
          },
        });
      } else {
        await tx.userFavorite.create({
          data: {
            userId: user.id,
            mangaId: manga.id,
          },
        });
      }
    }

    if (action === "set_like") {
      const existingVote = await tx.vote.findFirst({
        where: {
          userId: user.id,
          targetType: "MANGA",
          mangaId: manga.id,
        },
        select: { id: true, value: true },
      });

      if (existingVote?.value === 1) {
        await tx.vote.delete({ where: { id: existingVote.id } });
      } else if (existingVote) {
        await tx.vote.update({
          where: { id: existingVote.id },
          data: { value: 1 },
        });
      } else {
        await tx.vote.create({
          data: {
            userId: user.id,
            targetType: "MANGA",
            mangaId: manga.id,
            value: 1,
          },
        });
      }
    }

    if (action === "set_dislike") {
      const existingVote = await tx.vote.findFirst({
        where: {
          userId: user.id,
          targetType: "MANGA",
          mangaId: manga.id,
        },
        select: { id: true, value: true },
      });

      if (existingVote?.value === -1) {
        await tx.vote.delete({ where: { id: existingVote.id } });
      } else if (existingVote) {
        await tx.vote.update({
          where: { id: existingVote.id },
          data: { value: -1 },
        });
      } else {
        await tx.vote.create({
          data: {
            userId: user.id,
            targetType: "MANGA",
            mangaId: manga.id,
            value: -1,
          },
        });
      }
    }
  });

  const [favoriteCount, likeCount, dislikeCount, userFavorite, userVote] = await Promise.all([
    prisma.userFavorite.count({
      where: { mangaId: manga.id },
    }),
    prisma.vote.count({
      where: { mangaId: manga.id, targetType: "MANGA", value: 1 },
    }),
    prisma.vote.count({
      where: { mangaId: manga.id, targetType: "MANGA", value: -1 },
    }),
    prisma.userFavorite.findUnique({
      where: {
        userId_mangaId: {
          userId: user.id,
          mangaId: manga.id,
        },
      },
      select: { userId: true },
    }),
    prisma.vote.findFirst({
      where: { userId: user.id, targetType: "MANGA", mangaId: manga.id },
      select: { value: true },
    }),
  ]);

  const nowFavorite = !!userFavorite;
  const nowLike = userVote?.value === 1;

  const earnedLists = await Promise.all([
    action === "toggle_favorite" && !hadFavorite && nowFavorite
      ? awardBadgeIfEarned(user.id, "FAVORITE_ADDED")
      : Promise.resolve([]),
    action === "set_like" && !hadLikeBefore && nowLike
      ? awardBadgeIfEarned(user.id, "MANGA_LIKED")
      : Promise.resolve([]),
  ]);

  const seen = new Set<string>();
  const badgesEarned = earnedLists.flat().filter((b) => {
    if (seen.has(b.id)) return false;
    seen.add(b.id);
    return true;
  });

  return NextResponse.json({
    favoriteCount,
    likeCount,
    dislikeCount,
    isFavorited: nowFavorite,
    voteChoice: userVote?.value === 1 ? "like" : userVote?.value === -1 ? "dislike" : null,
    badgesEarned,
  });
}
