import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authenticateRequestWithRotation } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

const viewAttempts = new Map<string, { timestamps: number[] }>();

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const chapterId = (body as Record<string, unknown>).chapterId;
  if (typeof chapterId !== "string" || !chapterId) {
    return NextResponse.json({ error: "INVALID_CHAPTER_ID" }, { status: 400 });
  }

  // Auth opcional: usuarios anónimos también generan vistas.
  const cookieStore = await cookies();
  let userId: string | null = null;
  try {
    const auth = await authenticateRequestWithRotation(cookieStore, request.headers);
    userId = auth.userId ?? null;
  } catch {
    userId = null;
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const ipKey = `view_ip:${ip}`;
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const maxPerHour = 100;
  const ipRecord = viewAttempts.get(ipKey);
  if (ipRecord) {
    ipRecord.timestamps = ipRecord.timestamps.filter((t) => now - t < windowMs);
    if (ipRecord.timestamps.length >= maxPerHour) {
      return NextResponse.json({ ok: false }, { status: 429 });
    }
    ipRecord.timestamps.push(now);
  } else {
    viewAttempts.set(ipKey, { timestamps: [now] });
  }

  if (userId) {
    const userKey = `view_user:${userId}:${chapterId}`;
    const userRecord = viewAttempts.get(userKey);
    if (userRecord) {
      const recent = userRecord.timestamps.filter((t) => now - t < windowMs);
      if (recent.length > 0) {
        return NextResponse.json({ ok: true, deduplicated: true });
      }
      userRecord.timestamps = recent;
      userRecord.timestamps.push(now);
    } else {
      viewAttempts.set(userKey, { timestamps: [now] });
    }
  }

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { id: true, status: true, mangaId: true },
  });
  if (!chapter || chapter.status !== "APPROVED") {
    return NextResponse.json({ ok: false });
  }

  await prisma.chapter.update({
    where: { id: chapterId },
    data: { viewCount: { increment: 1 } },
  });

  await prisma.manga.update({
    where: { id: chapter.mangaId },
    data: { totalViews: { increment: 1 } },
  });

  return NextResponse.json({ ok: true });
}
