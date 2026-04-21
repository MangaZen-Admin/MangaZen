import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readOptionalSessionUserId } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import { sanitizeSearchQuery } from "@/lib/search-query";

const searchAttempts = new Map<string, { timestamps: number[] }>();

export async function GET(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const now = Date.now();
  const windowMs = 60 * 1000;

  // Intentar obtener rol del usuario para límite diferenciado
  let maxPerMinute = 30;
  let rateLimitKey = `search:${ip}`;
  try {
    const cookieStore = await cookies();
    const userId = readOptionalSessionUserId(cookieStore);
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (user?.role === "ADMIN" || user?.role === "SCAN" || user?.role === "CREATOR") {
        maxPerMinute = 60;
        rateLimitKey = `search:user:${userId}`;
      }
    }
  } catch {
    /* si falla auth, usar límite de anónimo */
  }

  const record = searchAttempts.get(rateLimitKey);
  if (record) {
    record.timestamps = record.timestamps.filter((t) => now - t < windowMs);
    if (record.timestamps.length >= maxPerMinute) {
      return NextResponse.json([], { status: 429 });
    }
    record.timestamps.push(now);
  } else {
    searchAttempts.set(rateLimitKey, { timestamps: [now] });
  }

  const q = sanitizeSearchQuery(new URL(request.url).searchParams.get("q") ?? "");
  if (!q) return NextResponse.json([]);

  const results = await prisma.manga.findMany({
    where: {
      reviewStatus: "APPROVED",
      title: { contains: q },
    },
    take: 5,
    select: { id: true, title: true, slug: true, coverImage: true },
    orderBy: { scoreCount: "desc" },
  });

  return NextResponse.json(results);
}
