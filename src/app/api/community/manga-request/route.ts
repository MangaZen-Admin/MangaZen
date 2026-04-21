import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authenticateRequestWithRotation, jsonIfUnauthenticated } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import { createMangaRequestBodySchema, normalizeMangaRequestBody } from "@/lib/validation/manga-request";

const requestAttempts = new Map<string, { timestamps: number[] }>();

const MAX_PENDING = 3;

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const auth = await authenticateRequestWithRotation(cookieStore, request.headers);
  const unauth = jsonIfUnauthenticated(auth);
  if (unauth) return unauth;
  const userId = auth.userId!;

  const rows = await prisma.mangaRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      author: true,
      notes: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    requests: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const auth = await authenticateRequestWithRotation(cookieStore, request.headers);
  const unauth = jsonIfUnauthenticated(auth);
  if (unauth) return unauth;
  const userId = auth.userId!;

  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hora
  const maxPerHour = 5;
  const rlKey = `manga_req:${userId}`;
  const rlRecord = requestAttempts.get(rlKey);
  if (rlRecord) {
    rlRecord.timestamps = rlRecord.timestamps.filter((t) => now - t < windowMs);
    if (rlRecord.timestamps.length >= maxPerHour) {
      return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
    }
    rlRecord.timestamps.push(now);
  } else {
    requestAttempts.set(rlKey, { timestamps: [now] });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = createMangaRequestBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY", details: parsed.error.flatten() }, { status: 400 });
  }

  const pendingCount = await prisma.mangaRequest.count({
    where: { userId, status: "PENDING" },
  });
  if (pendingCount >= MAX_PENDING) {
    return NextResponse.json({ error: "TOO_MANY_PENDING" }, { status: 409 });
  }

  const normalized = normalizeMangaRequestBody(parsed.data);

  const created = await prisma.mangaRequest.create({
    data: {
      userId,
      title: normalized.title,
      author: normalized.author ?? null,
      notes: normalized.notes ?? null,
    },
    select: {
      id: true,
      title: true,
      author: true,
      notes: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    request: {
      ...created,
      createdAt: created.createdAt.toISOString(),
    },
  });
}

export async function DELETE(request: Request) {
  const cookieStore = await cookies();
  const auth = await authenticateRequestWithRotation(cookieStore, request.headers);
  const unauth = jsonIfUnauthenticated(auth);
  if (unauth) return unauth;
  const userId = auth.userId!;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });

  const req = await prisma.mangaRequest.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true },
  });
  if (!req) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (req.userId !== userId) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  if (req.status !== "PENDING") {
    return NextResponse.json({ error: "CANNOT_DELETE_NON_PENDING" }, { status: 400 });
  }

  await prisma.mangaRequest.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
