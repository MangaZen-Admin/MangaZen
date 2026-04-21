import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authenticateRequestWithRotation } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

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

export async function GET(request: Request) {
  const adminId = await requireAdmin(request);
  if (!adminId) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const banner = await prisma.globalBanner.findFirst({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ banner: banner ?? null });
}

export async function POST(request: Request) {
  const adminId = await requireAdmin(request);
  if (!adminId) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const message = typeof o.message === "string" ? o.message.trim() : "";
  const type = ["info", "warning", "urgent"].includes(o.type as string)
    ? (o.type as string)
    : "info";
  const isDismissible = o.isDismissible !== false;
  const expiresAt =
    typeof o.expiresAt === "string" && o.expiresAt ? new Date(o.expiresAt) : null;

  if (!message) {
    return NextResponse.json({ error: "MISSING_MESSAGE" }, { status: 400 });
  }

  await prisma.globalBanner.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });

  const banner = await prisma.globalBanner.create({
    data: { message, type, isDismissible, expiresAt, isActive: true },
  });

  return NextResponse.json({ banner });
}

export async function DELETE(request: Request) {
  const adminId = await requireAdmin(request);
  if (!adminId) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  await prisma.globalBanner.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });

  return NextResponse.json({ ok: true });
}
