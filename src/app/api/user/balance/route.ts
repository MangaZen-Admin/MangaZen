import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authenticateRequestWithRotation } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const balanceAttempts = new Map<string, { timestamps: number[] }>();

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const { userId } = await authenticateRequestWithRotation(cookieStore, request.headers);
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const key = `balance:${ip}`;
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxAttempts = 60;
  const record = balanceAttempts.get(key);
  if (record) {
    record.timestamps = record.timestamps.filter((t) => now - t < windowMs);
    if (record.timestamps.length >= maxAttempts) {
      return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
    }
    record.timestamps.push(now);
  } else {
    balanceAttempts.set(key, { timestamps: [now] });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { zenCoins: true, zenShards: true },
  });
  if (!user) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  return NextResponse.json({ zenCoins: user.zenCoins, zenShards: user.zenShards });
}
