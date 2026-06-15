import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { requireScanAccess } from "@/lib/scan-access";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const gate = await requireScanAccess(await headers());
  if (!gate.ok) return gate.response;

  const userRole = gate.user.role;
  // El scan ve anuncios para su rol o para ALL_STAFF
  const roleFilter = userRole === "CREATOR" ? ["CREATOR", "ALL_STAFF"] : ["SCAN", "ALL_STAFF"];

  const announcements = await prisma.systemAnnouncement.findMany({
    where: {
      isActive: true,
      targetRole: { in: roleFilter },
      dismissals: { none: { userId: gate.user.id } },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, content: true, createdAt: true },
  });

  return NextResponse.json({ announcements });
}

export async function POST(request: Request): Promise<NextResponse> {
  const gate = await requireScanAccess(request.headers);
  if (!gate.ok) return gate.response;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const o = body as { announcementId?: string };
  if (!o.announcementId) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });

  await prisma.announcementDismissal.upsert({
    where: { announcementId_userId: { announcementId: o.announcementId, userId: gate.user.id } },
    create: { announcementId: o.announcementId, userId: gate.user.id },
    update: {},
  });

  return NextResponse.json({ ok: true });
}
