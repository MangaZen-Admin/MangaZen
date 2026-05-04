import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authenticateRequestWithRotation } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const MAX_ACTIVE_REPORTS = 5;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const cookieStore = await cookies();
  const { userId } = await authenticateRequestWithRotation(cookieStore, request.headers);
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { slug } = await params;
  const manga = await prisma.manga.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!manga) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const existing = await prisma.mangaReport.findUnique({
    where: { mangaId_userId: { mangaId: manga.id, userId } },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "ALREADY_REPORTED" }, { status: 409 });
  }

  const activeCount = await prisma.mangaReport.count({
    where: { mangaId: manga.id, status: "PENDING" },
  });
  if (activeCount >= MAX_ACTIVE_REPORTS) {
    return NextResponse.json({ error: "MAX_REPORTS_REACHED" }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const { reason, details } = body as { reason: string; details?: string };

  const validReasons = ["WRONG_INFO", "WRONG_COVER", "DUPLICATE", "INAPPROPRIATE", "OTHER"];
  if (!validReasons.includes(reason)) {
    return NextResponse.json({ error: "INVALID_REASON" }, { status: 400 });
  }

  await prisma.mangaReport.create({
    data: {
      mangaId: manga.id,
      userId,
      reason: reason as "WRONG_INFO" | "WRONG_COVER" | "DUPLICATE" | "INAPPROPRIATE" | "OTHER",
      details: details?.slice(0, 500) ?? null,
      status: "PENDING",
    },
  });

  return NextResponse.json({ ok: true });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const manga = await prisma.manga.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!manga) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const count = await prisma.mangaReport.count({
    where: { mangaId: manga.id, status: "PENDING" },
  });

  return NextResponse.json({ count, maxReached: count >= MAX_ACTIVE_REPORTS });
}
