import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ userId: string }> };

export async function GET(_request: Request, context: RouteParams) {
  const { userId } = await context.params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isProfilePublic: true, role: true },
  });

  if (!user || !user.isProfilePublic) {
    return NextResponse.json({ links: [] });
  }

  if (!["SCAN", "CREATOR", "ADMIN"].includes(user.role)) {
    return NextResponse.json({ links: [] });
  }

  const links = await prisma.donationLink.findMany({
    where: { userId },
    orderBy: { order: "asc" },
    select: { id: true, platform: true, url: true },
  });

  return NextResponse.json({ links });
}
