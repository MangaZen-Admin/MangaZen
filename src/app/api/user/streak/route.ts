import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { authenticateRequestWithRotation } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

export async function GET(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const headerList = await headers();
  const auth = await authenticateRequestWithRotation(cookieStore, headerList);

  if (!auth.userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: {
      loginStreak: true,
      badges: {
        select: { name: true, description: true },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const STREAK_MILESTONES = [7, 30, 100];
  const milestoneReached = STREAK_MILESTONES.includes(user.loginStreak)
    ? user.loginStreak
    : null;

  const streakBadgeSlugs = ["racha_7_dias", "racha_30_dias", "racha_100_dias"];
  const earnedStreakBadge = milestoneReached
    ? user.badges.find((b) => {
        if (milestoneReached === 7) return b.name === "racha_7_dias";
        if (milestoneReached === 30) return b.name === "racha_30_dias";
        if (milestoneReached === 100) return b.name === "racha_100_dias";
        return false;
      }) ?? null
    : null;

  void streakBadgeSlugs;

  return NextResponse.json({
    streak: user.loginStreak,
    milestoneReached,
    earnedBadge: earnedStreakBadge
      ? { name: earnedStreakBadge.name, description: earnedStreakBadge.description }
      : null,
  });
}
