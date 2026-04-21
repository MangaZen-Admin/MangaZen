import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authenticateRequestWithRotation } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const { userId } = await authenticateRequestWithRotation(
    cookieStore,
    request.headers
  );
  if (!userId) {
    return NextResponse.json({ isBanned: false, suspendedUntil: null });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      isBanned: true,
      bannedAt: true,
      banReason: true,
      suspendedUntil: true,
      suspendReason: true,
    },
  });

  if (!user) {
    return NextResponse.json({ isBanned: false, suspendedUntil: null });
  }

  return NextResponse.json({
    isBanned: user.isBanned,
    banReason: user.banReason,
    suspendedUntil: user.suspendedUntil?.toISOString() ?? null,
    suspendReason: user.suspendReason,
  });
}
