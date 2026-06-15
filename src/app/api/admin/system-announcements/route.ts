import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { requireAdminAccess } from "@/lib/admin-access";
import { sanitizeScanPlainText } from "@/lib/sanitize-text";

export const runtime = "nodejs";

const VALID_ROLES = ["SCAN", "CREATOR", "ALL_STAFF"];

export async function GET(): Promise<NextResponse> {
  const gate = await requireAdminAccess(await headers());
  if (!gate.ok) return gate.response;

  const announcements = await prisma.systemAnnouncement.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ announcements });
}

export async function POST(request: Request): Promise<NextResponse> {
  const gate = await requireAdminAccess(request.headers);
  if (!gate.ok) return gate.response;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const title = typeof o.title === "string" ? sanitizeScanPlainText(o.title, 200) : "";
  const content = typeof o.content === "string" ? sanitizeScanPlainText(o.content, 2000) : "";
  const targetRole = VALID_ROLES.includes(o.targetRole as string) ? (o.targetRole as string) : "ALL_STAFF";

  if (!title.trim() || !content.trim()) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  const announcement = await prisma.systemAnnouncement.create({
    data: { title, content, targetRole, isActive: true },
  });

  return NextResponse.json({ announcement });
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const gate = await requireAdminAccess(request.headers);
  if (!gate.ok) return gate.response;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : null;
  if (!id) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof o.title === "string") data.title = sanitizeScanPlainText(o.title, 200);
  if (typeof o.content === "string") data.content = sanitizeScanPlainText(o.content, 2000);
  if (VALID_ROLES.includes(o.targetRole as string)) data.targetRole = o.targetRole;
  if (typeof o.isActive === "boolean") data.isActive = o.isActive;

  const announcement = await prisma.systemAnnouncement.update({ where: { id }, data });

  return NextResponse.json({ announcement });
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const gate = await requireAdminAccess(request.headers);
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim() ?? "";
  if (!id) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });

  await prisma.systemAnnouncement.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
