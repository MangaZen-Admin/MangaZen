import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authenticateRequestWithRotation, jsonIfUnauthenticated } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import { InsufficientBalanceError, spendZenShards } from "@/lib/zen-currency";

const LOYALTY_COST_SHARDS = 500_000;
const PRO_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const auth = await authenticateRequestWithRotation(cookieStore, request.headers);
  const unauth = jsonIfUnauthenticated(auth);
  if (unauth) return unauth;
  const userId = auth.userId!;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { zenShards: true },
  });
  if (!user) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (user.zenShards < LOYALTY_COST_SHARDS) {
    return NextResponse.json(
      { error: "INSUFFICIENT_SHARDS", required: LOYALTY_COST_SHARDS, current: user.zenShards },
      { status: 400 },
    );
  }

  const expiresAt = new Date(Date.now() + PRO_DURATION_MS);
  try {
    await spendZenShards(userId, LOYALTY_COST_SHARDS, "SHARD_UNLOCK_CHAPTER", "loyalty_redeem_pro_7d");
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        isPro: true,
        proExpiresAt: expiresAt,
      },
      select: {
        isPro: true,
        proExpiresAt: true,
        zenShards: true,
      },
    });

    return NextResponse.json({
      ok: true,
      isPro: updated.isPro,
      proExpiresAt: updated.proExpiresAt?.toISOString() ?? null,
      zenShards: updated.zenShards,
    });
  } catch (error) {
    if (error instanceof InsufficientBalanceError) {
      return NextResponse.json({ error: "INSUFFICIENT_SHARDS" }, { status: 400 });
    }
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}

