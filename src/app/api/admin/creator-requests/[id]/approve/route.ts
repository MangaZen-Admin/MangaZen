import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authenticateRequestWithRotation } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import { awardBadgeIfEarned } from "@/lib/badges/award-badge";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteParams) {
  const { id } = await context.params;
  const cookieStore = await cookies();
  const { userId: adminId } = await authenticateRequestWithRotation(cookieStore, request.headers);
  if (!adminId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const admin = await prisma.user.findUnique({
    where: { id: adminId },
    select: { role: true },
  });
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const req = await prisma.creatorRoleRequest.findUnique({
    where: { id },
    select: { id: true, status: true, userId: true },
  });
  if (!req || req.status !== "PENDING") {
    return NextResponse.json({ error: "INVALID_STATE" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.creatorRoleRequest.update({
      where: { id: req.id },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedById: adminId,
      },
    }),
    prisma.user.update({
      where: { id: req.userId },
      data: { role: "CREATOR" },
    }),
  ]);

  const badgesEarned = await awardBadgeIfEarned(req.userId, "CREATOR_APPROVED");

  return NextResponse.json({ ok: true, badgesEarned });
}
