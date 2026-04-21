import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authenticateRequestWithRotation, jsonIfUnauthenticated } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const auth = await authenticateRequestWithRotation(cookieStore, request.headers);
  const unauth = jsonIfUnauthenticated(auth);
  if (unauth) return unauth;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? "30") || 30));

  const rows = await prisma.notification.findMany({
    where: { userId: auth.userId!, read: false },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      entityId: true,
      message: true,
      payload: true,
      read: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    notifications: rows.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
      payload: n.payload as Record<string, unknown> | null,
    })),
  });
}
