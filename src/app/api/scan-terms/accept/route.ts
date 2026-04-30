import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authenticateRequestWithRotation } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const { userId } = await authenticateRequestWithRotation(cookieStore, request.headers);
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, acceptedScanTermsAt: true },
  });

  if (!user) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (user.role !== "SCAN" && user.role !== "CREATOR") {
    return NextResponse.json({ error: "NOT_SCAN" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { acceptedScanTermsAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
