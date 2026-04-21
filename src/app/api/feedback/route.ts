import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { FeedbackCategory } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  authenticateRequestWithRotation,
  jsonIfUnauthenticated,
  readOptionalSessionUserId,
} from "@/lib/auth-session";
import { createFeedbackBodySchema } from "@/lib/validation/feedback";

const CATEGORY_FILTER = new Set(["BUG", "SUGGESTION", "PRAISE"]);
const PAGE_SIZE = 50;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawCat = searchParams.get("category");
  const where =
    rawCat && CATEGORY_FILTER.has(rawCat) ? { category: rawCat as FeedbackCategory } : {};

  const pageRaw = searchParams.get("page") ?? searchParams.get("cursor") ?? "0";
  const page = Math.max(0, Math.floor(Number(pageRaw)) || 0);
  const skip = page * PAGE_SIZE;
  const take = PAGE_SIZE + 1;

  const cookieStore = await cookies();
  const sessionUserId = readOptionalSessionUserId(cookieStore);

  const idRows =
    rawCat && CATEGORY_FILTER.has(rawCat)
      ? await prisma.$queryRaw<{ id: string }[]>`
          SELECT f.id FROM Feedback f
          LEFT JOIN (
            SELECT feedbackId,
              SUM(CASE WHEN value = 1 THEN 1 WHEN value = -1 THEN -1 ELSE 0 END) AS net
            FROM FeedbackVote
            GROUP BY feedbackId
          ) v ON v.feedbackId = f.id
          WHERE f.category = ${rawCat}
          ORDER BY COALESCE(v.net, 0) DESC, f.createdAt DESC, f.id DESC
          LIMIT ${take} OFFSET ${skip}
        `
      : await prisma.$queryRaw<{ id: string }[]>`
          SELECT f.id FROM Feedback f
          LEFT JOIN (
            SELECT feedbackId,
              SUM(CASE WHEN value = 1 THEN 1 WHEN value = -1 THEN -1 ELSE 0 END) AS net
            FROM FeedbackVote
            GROUP BY feedbackId
          ) v ON v.feedbackId = f.id
          ORDER BY COALESCE(v.net, 0) DESC, f.createdAt DESC, f.id DESC
          LIMIT ${take} OFFSET ${skip}
        `;

  const hasMore = idRows.length > PAGE_SIZE;
  const ids = idRows.slice(0, PAGE_SIZE).map((r) => r.id);

  if (ids.length === 0) {
    return NextResponse.json({
      feedbacks: [],
      hasMore: false,
      nextCursor: null,
    });
  }

  const rows = await prisma.feedback.findMany({
    where: { ...where, id: { in: ids } },
    include: {
      user: { select: { id: true, name: true, email: true, image: true, username: true } },
      votes: { select: { userId: true, value: true } },
    },
  });

  const rowMap = new Map(rows.map((r) => [r.id, r]));
  const orderedRows = ids.map((id) => rowMap.get(id)).filter((r): r is NonNullable<typeof r> => r != null);

  const feedbacks = orderedRows.map((f) => {
    let upvotes = 0;
    let downvotes = 0;
    for (const v of f.votes) {
      if (v.value === 1) upvotes += 1;
      else if (v.value === -1) downvotes += 1;
    }
    const netScore = upvotes - downvotes;
    const myVote =
      sessionUserId != null ? (f.votes.find((v) => v.userId === sessionUserId)?.value ?? null) : null;
    return {
      id: f.id,
      title: f.title,
      body: f.body,
      category: f.category,
      status: f.status,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
      author: {
        id: f.user.id,
        name: f.user.name,
        email: f.user.email,
        image: f.user.image,
        username: f.user.username,
      },
      upvotes,
      downvotes,
      netScore,
      myVote,
    };
  });

  return NextResponse.json({
    feedbacks,
    hasMore,
    nextCursor: hasMore ? String(page + 1) : null,
  });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const auth = await authenticateRequestWithRotation(cookieStore, request.headers);
  const unauth = jsonIfUnauthenticated(auth);
  if (unauth) return unauth;
  const userId = auth.userId!;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = createFeedbackBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY", details: parsed.error.flatten() }, { status: 400 });
  }

  const { title, body, category } = parsed.data;

  const created = await prisma.feedback.create({
    data: {
      title,
      body,
      category,
      userId,
    },
    include: {
      user: { select: { id: true, name: true, email: true, image: true, username: true } },
      votes: { select: { userId: true, value: true } },
    },
  });

  return NextResponse.json({
    feedback: {
      id: created.id,
      title: created.title,
      body: created.body,
      category: created.category,
      status: created.status,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      author: {
        id: created.user.id,
        name: created.user.name,
        email: created.user.email,
        image: created.user.image,
        username: created.user.username,
      },
      upvotes: 0,
      downvotes: 0,
      netScore: 0,
      myVote: null as number | null,
    },
  });
}
