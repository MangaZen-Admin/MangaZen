import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequestWithRotation, jsonIfUnauthenticated } from "@/lib/auth-session";

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const auth = await authenticateRequestWithRotation(cookieStore, request.headers);
  const unauth = jsonIfUnauthenticated(auth);
  if (unauth) return unauth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const o = body as Record<string, unknown>;
  const data: {
    requirePasswordForPoints?: boolean;
    requireEmailCodeForPoints?: boolean;
    hideFromRankings?: boolean;
    isProfilePublic?: boolean;
    hideZenFromPublic?: boolean;
    hideFavoritesFromPublic?: boolean;
    hideReadingStatsFromPublic?: boolean;
  } = {};
  if (typeof o.requirePasswordForPoints === "boolean") {
    data.requirePasswordForPoints = o.requirePasswordForPoints;
  }
  if (typeof o.requireEmailCodeForPoints === "boolean") {
    data.requireEmailCodeForPoints = o.requireEmailCodeForPoints;
  }
  if (typeof o.hideFromRankings === "boolean") {
    data.hideFromRankings = o.hideFromRankings;
  }
  if (typeof o.isProfilePublic === "boolean") {
    data.isProfilePublic = o.isProfilePublic;
  }
  if (typeof o.hideZenFromPublic === "boolean") {
    data.hideZenFromPublic = o.hideZenFromPublic;
  }
  if (typeof o.hideFavoritesFromPublic === "boolean") {
    data.hideFavoritesFromPublic = o.hideFavoritesFromPublic;
  }
  if (typeof o.hideReadingStatsFromPublic === "boolean") {
    data.hideReadingStatsFromPublic = o.hideReadingStatsFromPublic;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: auth.userId! },
    data,
    select: {
      requirePasswordForPoints: true,
      requireEmailCodeForPoints: true,
      hideFromRankings: true,
      isProfilePublic: true,
      hideZenFromPublic: true,
      hideFavoritesFromPublic: true,
      hideReadingStatsFromPublic: true,
    },
  });

  return NextResponse.json({ ok: true, ...updated });
}
