import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authenticateRequestWithRotation } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

async function requireAdmin(request: Request) {
  const cookieStore = await cookies();
  const { userId } = await authenticateRequestWithRotation(cookieStore, request.headers);
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!user || user.role !== "ADMIN") return null;
  return userId;
}

export async function DELETE(request: Request) {
  const adminId = await requireAdmin(request);
  if (!adminId) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const type = o.type as string;
  const id = typeof o.id === "string" ? o.id : null;

  if (!id) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });

  if (type === "comment") {
    const comment = await prisma.comment.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!comment) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    await prisma.comment.delete({ where: { id } });
  } else if (type === "chapter") {
    const chapter = await prisma.chapter.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!chapter) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    await prisma.chapter.delete({ where: { id } });
  } else if (type === "manga") {
    const manga = await prisma.manga.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!manga) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    await prisma.manga.delete({ where: { id } });
  } else if (type === "feedback") {
    const feedback = await prisma.feedback.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!feedback) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    await prisma.feedback.delete({ where: { id } });
  } else {
    return NextResponse.json({ error: "INVALID_TYPE" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
