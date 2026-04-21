import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequestWithRotation, jsonIfUnauthenticated } from "@/lib/auth-session";
import { feedbackVoteBodySchema } from "@/lib/validation/feedback";

type RouteParams = { params: Promise<{ id: string }> };

const LAST_FEEDBACK_VOTE = new Map<string, number>();
const VOTE_COOLDOWN_MS = 400;

export async function POST(request: Request, context: RouteParams) {
  const { id: feedbackId } = await context.params;
  if (!feedbackId) {
    return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const auth = await authenticateRequestWithRotation(cookieStore, request.headers);
  const unauth = jsonIfUnauthenticated(auth);
  if (unauth) return unauth;
  const userId = auth.userId!;

  const now = Date.now();
  const prev = LAST_FEEDBACK_VOTE.get(userId) ?? 0;
  if (now - prev < VOTE_COOLDOWN_MS) {
    return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  }
  LAST_FEEDBACK_VOTE.set(userId, now);

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = feedbackVoteBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const { value } = parsed.data;

  const feedback = await prisma.feedback.findUnique({
    where: { id: feedbackId },
    select: { id: true },
  });
  if (!feedback) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const existing = await prisma.feedbackVote.findUnique({
    where: {
      feedbackId_userId: { feedbackId, userId },
    },
  });

  if (existing) {
    if (existing.value === value) {
      await prisma.feedbackVote.delete({ where: { id: existing.id } });
    } else {
      await prisma.feedbackVote.update({
        where: { id: existing.id },
        data: { value },
      });
    }
  } else {
    await prisma.feedbackVote.create({
      data: { feedbackId, userId, value },
    });
  }

  const votes = await prisma.feedbackVote.findMany({
    where: { feedbackId },
    select: { value: true },
  });
  let upvotes = 0;
  let downvotes = 0;
  for (const v of votes) {
    if (v.value === 1) upvotes += 1;
    else if (v.value === -1) downvotes += 1;
  }
  const netScore = upvotes - downvotes;

  const myVoteRow = await prisma.feedbackVote.findUnique({
    where: { feedbackId_userId: { feedbackId, userId } },
    select: { value: true },
  });

  return NextResponse.json({
    ok: true,
    upvotes,
    downvotes,
    netScore,
    myVote: myVoteRow?.value ?? null,
  });
}
