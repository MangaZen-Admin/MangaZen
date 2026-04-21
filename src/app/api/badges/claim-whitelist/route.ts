import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequestWithRotation, jsonIfUnauthenticated } from "@/lib/auth-session";
import { awardBadgeIfEarned } from "@/lib/badges/award-badge";
import { requireReauth } from "@/lib/require-reauth";
import { awardZenShards } from "@/lib/zen-currency";

type ClaimWhitelistBody = {
  adblockDetected?: boolean;
  consistencyChecks?: number;
  reauth_password?: string;
  reauth_code?: string;
};

const WHITELIST_BADGE_NAME = "Pilar de la Comunidad";
const REQUIRED_CONSISTENCY_CHECKS = 3;
const FIRST_TIME_ZEN_REWARD = 50;

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const auth = await authenticateRequestWithRotation(cookieStore, request.headers);
  const unauth = jsonIfUnauthenticated(auth);
  if (unauth) return unauth;
  const userId = auth.userId!;

  const body = (await request.json()) as ClaimWhitelistBody;
  const adblockDetected = body.adblockDetected ?? true;
  const consistencyChecks = body.consistencyChecks ?? 0;

  if (adblockDetected || consistencyChecks < REQUIRED_CONSISTENCY_CHECKS) {
    const zenOnly = await prisma.user.findUnique({
      where: { id: userId },
      select: { zenShards: true },
    });
    return NextResponse.json({
      ok: true,
      firstTimeAwarded: false,
      awarded: false,
      reason: "CONSISTENCY_NOT_MET",
      zenPoints: zenOnly?.zenShards ?? 0,
    });
  }

  const userRow = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      badges: { where: { name: WHITELIST_BADGE_NAME }, select: { id: true } },
    },
  });

  if (!userRow) {
    return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
  }

  const hadBefore = userRow.badges.length > 0;
  const willEarnFirstTime = !hadBefore;

  if (willEarnFirstTime) {
    const reauthBlock = await requireReauth(userId, "SPEND_ZEN", body as Record<string, unknown>);
    if (reauthBlock) return reauthBlock;
  }

  const earned = await awardBadgeIfEarned(userId, "ADBLOCK_WHITELIST");
  const firstTimeAwarded = earned.length > 0;

  if (firstTimeAwarded) {
    await awardZenShards(
      userId,
      FIRST_TIME_ZEN_REWARD,
      "SHARD_ADMIN_GRANT",
      "adblock_whitelist_reward",
    );
  }

  const zenRow = await prisma.user.findUnique({
    where: { id: userId },
    select: { zenShards: true },
  });

  const pilarBadge = await prisma.badge.findUnique({
    where: { name: WHITELIST_BADGE_NAME },
    select: { id: true, name: true, description: true, iconUrl: true },
  });

  return NextResponse.json({
    ok: true,
    firstTimeAwarded,
    awarded: hadBefore || firstTimeAwarded,
    badge: pilarBadge,
    badgesEarned: earned,
    zenPoints: zenRow?.zenShards ?? 0,
    zenPointsGranted: firstTimeAwarded ? FIRST_TIME_ZEN_REWARD : 0,
  });
}
