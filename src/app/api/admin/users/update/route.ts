import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequestWithRotation, jsonIfUnauthenticated } from "@/lib/auth-session";
import { awardBadgeIfEarned } from "@/lib/badges/award-badge";
import { requireReauth } from "@/lib/require-reauth";

type UpdateUserBody = {
  userId?: string;
  role?: "USER" | "SCAN" | "CREATOR" | "ADMIN";
  zenPointsDelta?: number;
  zenShardsDelta?: number;
  reauth_password?: string;
  reauth_code?: string;
};

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const auth = await authenticateRequestWithRotation(cookieStore, request.headers);
  const unauth = jsonIfUnauthenticated(auth);
  if (unauth) return unauth;
  const sessionUserId = auth.userId!;

  const admin = await prisma.user.findUnique({
    where: { id: sessionUserId },
    select: { role: true },
  });
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = (await request.json()) as UpdateUserBody;
  if (!body.userId) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { id: body.userId },
    select: { id: true, role: true, zenCoins: true, zenShards: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const nextRole =
    body.role &&
    (body.role === "USER" ||
      body.role === "SCAN" ||
      body.role === "CREATOR" ||
      body.role === "ADMIN")
      ? body.role
      : undefined;
  const delta =
    typeof body.zenPointsDelta === "number" && Number.isFinite(body.zenPointsDelta)
      ? Math.trunc(body.zenPointsDelta)
      : 0;
  const shardDelta =
    typeof body.zenShardsDelta === "number" && Number.isFinite(body.zenShardsDelta)
      ? Math.trunc(body.zenShardsDelta)
      : 0;

  if (delta !== 0 || shardDelta !== 0) {
    const reauthBlock = await requireReauth(sessionUserId, "SPEND_ZEN", body as Record<string, unknown>);
    if (reauthBlock) return reauthBlock;
  }

  const nextCoins = Math.max(0, existing.zenCoins + delta);

  const updated = await prisma.user.update({
    where: { id: body.userId },
    data: {
      ...(nextRole ? { role: nextRole } : {}),
      ...(delta !== 0 ? { zenCoins: nextCoins } : {}),
      ...(shardDelta !== 0
        ? { zenShards: Math.max(0, existing.zenShards + shardDelta) }
        : {}),
    },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      image: true,
      role: true,
      zenCoins: true,
      zenShards: true,
      badges: {
        select: {
          id: true,
          name: true,
          description: true,
          iconUrl: true,
          iconKey: true,
          isHighlighted: true,
        },
      },
    },
  });

  let badgesEarned: Awaited<ReturnType<typeof awardBadgeIfEarned>> = [];
  if (delta !== 0) {
    badgesEarned = await awardBadgeIfEarned(body.userId, "ZEN_POINTS_UPDATED", {
      zenCoins: updated.zenCoins,
    });
  }

  return NextResponse.json({ ok: true, user: updated, badgesEarned });
}
