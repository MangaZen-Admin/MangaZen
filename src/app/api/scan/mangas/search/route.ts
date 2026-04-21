import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/ip-rate-limit";
import { requireScanAccess } from "@/lib/scan-access";
import { sanitizeSearchQuery } from "@/lib/search-query";
import {
  isElevatedSearchRole,
  SCAN_MANGA_SEARCH_LIMIT_DEFAULT,
  SCAN_MANGA_SEARCH_LIMIT_ELEVATED,
  SEARCH_WINDOW_MS,
} from "@/lib/search-rate-limit";

export async function GET(request: Request) {
  const gate = await requireScanAccess(request.headers);
  if (!gate.ok) return gate.response;

  const ip = getClientIp(request);
  const limit = isElevatedSearchRole(gate.user.role)
    ? SCAN_MANGA_SEARCH_LIMIT_ELEVATED
    : SCAN_MANGA_SEARCH_LIMIT_DEFAULT;
  const rl = checkRateLimit(`scan-manga-search:${ip}:${gate.user.id}`, limit, SEARCH_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "RATE_LIMITED" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.max(1, Math.ceil(rl.retryAfterMs / 1000))) },
      }
    );
  }

  const q = sanitizeSearchQuery(new URL(request.url).searchParams.get("q") ?? "");
  if (q.length < 2) {
    return NextResponse.json({ mangas: [] });
  }

  const mangas = await prisma.manga.findMany({
    where: {
      title: { contains: q },
      OR: [{ reviewStatus: "APPROVED" }, { uploaderId: gate.user.id }],
    },
    take: 20,
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      slug: true,
      coverImage: true,
    },
  });

  return NextResponse.json({ mangas });
}
