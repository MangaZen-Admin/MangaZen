import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { NotificationType } from "@prisma/client";
import { authenticateRequestWithRotation } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const o = body as Record<string, unknown>;
  let reason = "";
  if (typeof o.reason === "string") {
    reason = o.reason.trim().slice(0, 2000);
  }

  const row = await prisma.mangaRequest.findUnique({
    where: { id },
    select: { id: true, status: true, userId: true, title: true },
  });
  if (!row || row.status !== "PENDING") {
    return NextResponse.json({ error: "INVALID_STATE" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.mangaRequest.update({
      where: { id: row.id },
      data: { status: "REJECTED" },
    });
    await tx.notification.create({
      data: {
        userId: row.userId,
        type: NotificationType.MANGA_REQUEST_REJECTED,
        entityId: row.id,
        message: reason,
        payload: {
          mangaRequestTitle: row.title,
        },
      },
    });
  });

  return NextResponse.json({ ok: true });
}
