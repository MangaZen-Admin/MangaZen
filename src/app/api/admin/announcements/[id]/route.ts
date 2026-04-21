import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authenticateRequestWithRotation } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

type RouteParams = { params: Promise<{ id: string }> };

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
  const { id } = await context.params;
  const adminId = await requireAdmin(request);
  if (!adminId) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (typeof o.title === "string") data.title = o.title.trim();
  if (typeof o.body === "string") data.body = o.body.trim();
  if ("imageUrl" in o) {
    data.imageUrl =
      typeof o.imageUrl === "string" && o.imageUrl.trim() ? o.imageUrl.trim() : null;
  }
  if (typeof o.isPinned === "boolean") data.isPinned = o.isPinned;

  const announcement = await prisma.announcement.update({
    where: { id },
    data,
  });

  return NextResponse.json({ announcement });
}

export async function DELETE(request: Request, context: RouteParams) {
  const { id } = await context.params;
  const adminId = await requireAdmin(request);
  if (!adminId) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  await prisma.announcement.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
