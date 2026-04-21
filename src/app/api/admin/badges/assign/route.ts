import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequestWithRotation } from "@/lib/auth-session";

type AssignBadgeBody = {
  userId?: string;
  badgeId?: string;
};

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const { userId: sessionUserId } = await authenticateRequestWithRotation(cookieStore, request.headers);

  if (!sessionUserId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: sessionUserId },
    select: { role: true },
  });

  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = (await request.json()) as AssignBadgeBody;
  if (!body.userId || !body.badgeId) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const [user, badge] = await Promise.all([
    prisma.user.findUnique({
      where: { id: body.userId },
      select: { id: true },
    }),
    prisma.badge.findUnique({
      where: { id: body.badgeId },
      select: { id: true },
    }),
  ]);

  if (!user || !badge) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id: body.userId },
    data: {
      badges: {
        connect: { id: body.badgeId },
      },
    },
    select: {
      id: true,
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

  return NextResponse.json({ ok: true, user: updated });
}
