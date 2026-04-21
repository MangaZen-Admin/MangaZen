import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequestWithRotation, jsonIfUnauthenticated } from "@/lib/auth-session";
import { adminFeedbackPatchSchema } from "@/lib/validation/feedback";

type RouteParams = { params: Promise<{ id: string }> };

async function requireAdmin(request: Request) {
  const cookieStore = await cookies();
  const auth = await authenticateRequestWithRotation(cookieStore, request.headers);
  const unauth = jsonIfUnauthenticated(auth);
  if (unauth) return { ok: false as const, response: unauth };
  const userId = auth.userId!;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!user || user.role !== "ADMIN") {
    return { ok: false as const, response: NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }) };
  }
  return { ok: true as const, userId };
}

export async function GET(request: Request, context: RouteParams) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });

  const row = await prisma.feedback.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      votes: { select: { userId: true, value: true } },
    },
  });
  if (!row) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  let upvotes = 0;
  let downvotes = 0;
  for (const v of row.votes) {
    if (v.value === 1) upvotes += 1;
    else if (v.value === -1) downvotes += 1;
  }

  return NextResponse.json({
    feedback: {
      id: row.id,
      title: row.title,
      body: row.body,
      category: row.category,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      author: row.user,
      upvotes,
      downvotes,
      netScore: upvotes - downvotes,
    },
  });
}

export async function PATCH(request: Request, context: RouteParams) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = adminFeedbackPatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  try {
    const updated = await prisma.feedback.update({
      where: { id },
      data: { status: parsed.data.status },
      select: { id: true, status: true, updatedAt: true },
    });
    return NextResponse.json({
      ok: true,
      feedback: {
        id: updated.id,
        status: updated.status,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
}

export async function DELETE(request: Request, context: RouteParams) {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });

  try {
    await prisma.feedback.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
}
