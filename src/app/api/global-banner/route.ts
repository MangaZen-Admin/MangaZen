import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const now = new Date();
  const banner = await prisma.globalBanner.findFirst({
    where: {
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      message: true,
      type: true,
      isDismissible: true,
    },
  });
  return NextResponse.json({ banner: banner ?? null });
}
