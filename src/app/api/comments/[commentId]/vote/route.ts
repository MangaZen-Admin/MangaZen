import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequestWithRotation } from "@/lib/auth-session";

type RouteContext = {
  params: Promise<{ commentId: string }>;
};

type Body = {
  action?: "like" | "dislike";
};

const LAST_VOTE = new Map<string, number>();
const VOTE_COOLDOWN_MS = 400;

function rateLimit(userId: string): boolean {
  const now = Date.now();
  const prev = LAST_VOTE.get(userId) ?? 0;
  if (now - prev < VOTE_COOLDOWN_MS) return false;
  LAST_VOTE.set(userId, now);
  return true;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const cookieStore = await cookies();
    const { userId: sessionUserId } = await authenticateRequestWithRotation(cookieStore, request.headers);

    if (!sessionUserId) {
      return NextResponse.json(
        { error: "AUTH_REQUIRED", message: "Necesitás una cuenta para votar." },
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

    if (!rateLimit(user.id)) {
      return NextResponse.json({ error: "RATE_LIMIT", message: "Esperá un momento." }, { status: 429 });
    }

    const { commentId } = await context.params;
    if (!commentId) {
      return NextResponse.json({ error: "MISSING_COMMENT_ID" }, { status: 400 });
    }

    let body: Body;
    try {
      body = (await request.json()) as Body;
    } catch {
      return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
    }

    const action = body.action;
    if (action !== "like" && action !== "dislike") {
      return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true },
    });
    if (!comment) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const desired = action === "like" ? 1 : -1;

    const existing = await prisma.vote.findFirst({
      where: {
        userId: user.id,
        targetType: "COMMENT",
        commentId: comment.id,
      },
      select: { id: true, value: true },
    });

    if (existing) {
      if (existing.value === desired) {
        await prisma.vote.delete({ where: { id: existing.id } });
      } else {
        await prisma.vote.update({
          where: { id: existing.id },
          data: { value: desired },
        });
      }
    } else {
      await prisma.vote.create({
        data: {
          userId: user.id,
          targetType: "COMMENT",
          commentId: comment.id,
          value: desired,
        },
      });
    }

    const [likeCount, dislikeCount, myVote] = await Promise.all([
      prisma.vote.count({
        where: { targetType: "COMMENT", commentId: comment.id, value: 1 },
      }),
      prisma.vote.count({
        where: { targetType: "COMMENT", commentId: comment.id, value: -1 },
      }),
      prisma.vote.findFirst({
        where: { userId: user.id, targetType: "COMMENT", commentId: comment.id },
        select: { value: true },
      }),
    ]);

    return NextResponse.json({
      likeCount,
      dislikeCount,
      myVote: myVote?.value === 1 ? 1 : myVote?.value === -1 ? -1 : null,
    });
  } catch (e) {
    console.error("[POST /api/comments/.../vote]", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
