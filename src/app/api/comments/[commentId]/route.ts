import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequestWithRotation } from "@/lib/auth-session";
import type { ChapterCommentJson } from "@/lib/chapter-comments-dto";
import { getPublicProfileUrlKey } from "@/lib/public-profile-url";
import { sanitizeCommentBody } from "@/lib/sanitize-text";
import { patchCommentBodySchema } from "@/lib/validation/comment-body";

type RouteContext = {
  params: Promise<{ commentId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const cookieStore = await cookies();
    const { userId: sessionUserId } = await authenticateRequestWithRotation(cookieStore, request.headers);

    if (!sessionUserId) {
      return NextResponse.json(
        { error: "AUTH_REQUIRED", message: "Necesitás una cuenta para editar comentarios." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUserId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    }

    const { commentId } = await context.params;
    if (!commentId) {
      return NextResponse.json({ error: "MISSING_COMMENT_ID" }, { status: 400 });
    }

    let jsonBody: unknown;
    try {
      jsonBody = await request.json();
    } catch {
      return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
    }

    const parsed = patchCommentBodySchema.safeParse(jsonBody);
    if (!parsed.success) {
      return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
    }

    const sanitized = sanitizeCommentBody(parsed.data.content);
    if (!sanitized) {
      return NextResponse.json({ error: "EMPTY_CONTENT" }, { status: 400 });
    }

    const existing = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, userId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    if (existing.userId !== user.id) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Solo podés editar tus propios comentarios." },
        { status: 403 }
      );
    }

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { body: sanitized },
      select: {
        id: true,
        body: true,
        createdAt: true,
        updatedAt: true,
        locale: true,
        userId: true,
        user: { select: { id: true, name: true, image: true, username: true } },
      },
    });

    const [likeCount, dislikeCount, myVote] = await Promise.all([
      prisma.vote.count({
        where: { targetType: "COMMENT", commentId: updated.id, value: 1 },
      }),
      prisma.vote.count({
        where: { targetType: "COMMENT", commentId: updated.id, value: -1 },
      }),
      prisma.vote.findFirst({
        where: { userId: user.id, targetType: "COMMENT", commentId: updated.id },
        select: { value: true },
      }),
    ]);

    const comment: ChapterCommentJson = {
      id: updated.id,
      body: updated.body,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      authorUserId: updated.userId,
      locale: updated.locale,
      author: {
        name: updated.user.name,
        image: updated.user.image,
        profileKey: getPublicProfileUrlKey({ id: updated.user.id, username: updated.user.username }),
      },
      likeCount,
      dislikeCount,
      myVote: myVote?.value === 1 ? 1 : myVote?.value === -1 ? -1 : null,
      replies: [],
    };

    return NextResponse.json({ comment });
  } catch (e) {
    console.error("[PATCH /api/comments/[commentId]]", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
