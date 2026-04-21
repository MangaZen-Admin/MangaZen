import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authenticateRequestWithRotation } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

type RouteParams = { params: Promise<{ userId: string }> };

export const runtime = "nodejs";

async function requireAdmin(request: Request) {
  const cookieStore = await cookies();
  const { userId } = await authenticateRequestWithRotation(cookieStore, request.headers);
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!user || user.role !== "ADMIN") return null;
  return userId;
}

export async function PATCH(request: Request, context: RouteParams) {
  const { userId } = await context.params;
  const adminId = await requireAdmin(request);
  if (!adminId) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  if (adminId === userId) {
    return NextResponse.json({ error: "CANNOT_MODERATE_SELF" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const action = o.action as string;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isBanned: true },
  });
  if (!target) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (target.role === "ADMIN") {
    return NextResponse.json({ error: "CANNOT_MODERATE_ADMIN" }, { status: 400 });
  }

  let data: Record<string, unknown> = {};

  if (action === "ban") {
    const reason = typeof o.reason === "string" ? o.reason.trim() : null;
    data = {
      isBanned: true,
      bannedAt: new Date(),
      banReason: reason,
      suspendedUntil: null,
      suspendReason: null,
    };
  } else if (action === "unban") {
    data = {
      isBanned: false,
      bannedAt: null,
      banReason: null,
    };
  } else if (action === "suspend") {
    const reason = typeof o.reason === "string" ? o.reason.trim() : null;
    const days = typeof o.days === "number" && o.days > 0 ? Math.min(o.days, 365) : 1;
    const until = new Date();
    until.setDate(until.getDate() + days);
    data = {
      suspendedUntil: until,
      suspendReason: reason,
      isBanned: false,
    };
  } else if (action === "unsuspend") {
    data = {
      suspendedUntil: null,
      suspendReason: null,
    };
  } else {
    return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      isBanned: true,
      bannedAt: true,
      banReason: true,
      suspendedUntil: true,
      suspendReason: true,
    },
  });

  return NextResponse.json({ ok: true, user: updated });
}

export async function DELETE(request: Request, context: RouteParams) {
  const { userId } = await context.params;
  const adminId = await requireAdmin(request);
  if (!adminId) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  if (adminId === userId) {
    return NextResponse.json({ error: "CANNOT_DELETE_SELF" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!target) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (target.role === "ADMIN") {
    return NextResponse.json({ error: "CANNOT_DELETE_ADMIN" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: userId } });
  return NextResponse.json({ ok: true });
}
