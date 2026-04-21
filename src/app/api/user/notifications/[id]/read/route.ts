import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authenticateRequestWithRotation, jsonIfUnauthenticated } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, context: RouteCtx) {
  const { id } = await context.params;
  const cookieStore = await cookies();
  const auth = await authenticateRequestWithRotation(cookieStore, _request.headers);
  const unauth = jsonIfUnauthenticated(auth);
  if (unauth) return unauth;

  const existing = await prisma.notification.findFirst({
    where: { id, userId: auth.userId! },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  await prisma.notification.update({
    where: { id },
    data: { read: true },
  });

  return NextResponse.json({ ok: true });
}
