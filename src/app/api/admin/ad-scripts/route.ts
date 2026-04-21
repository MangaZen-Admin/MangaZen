import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authenticateRequestWithRotation } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

async function requireAdmin(request: Request) {
  const cookieStore = await cookies();
  const auth = await authenticateRequestWithRotation(cookieStore, request.headers);
  const userId = auth.userId;
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
  const scripts = await prisma.adScript.findMany({
    orderBy: { slotId: "asc" },
  });
  return NextResponse.json({ scripts });
}

export async function POST(request: Request) {
  const adminId = await requireAdmin(request);
  if (!adminId) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const body = (await request.json()) as Record<string, unknown>;
  const slotId = typeof body.slotId === "string" ? body.slotId.trim() : "";
  const script = typeof body.script === "string" ? body.script.trim() : "";
  const label = typeof body.label === "string" ? body.label.trim() : "";
  const isActive = body.isActive !== false;
  if (!slotId || !script) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }
  const ad = await prisma.adScript.upsert({
    where: { slotId },
    create: { slotId, script, label: label || null, isActive },
    update: { script, label: label || null, isActive },
  });
  return NextResponse.json({ ad });
}

export async function DELETE(request: Request) {
  const adminId = await requireAdmin(request);
  if (!adminId) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const slotId = searchParams.get("slotId");
  if (!slotId) return NextResponse.json({ error: "MISSING_SLOT_ID" }, { status: 400 });
  await prisma.adScript.deleteMany({ where: { slotId } });
  return NextResponse.json({ ok: true });
}
