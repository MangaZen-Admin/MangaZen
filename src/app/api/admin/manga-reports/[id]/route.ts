import { NextResponse } from "next/server";
import { requireAdminJson } from "@/lib/admin-api-auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminJson(request);
  if (!gate.ok) return gate.response;

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const { status } = body as { status?: string };
  if (status !== "REVIEWED") {
    return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
  }

  const existing = await prisma.mangaReport.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (existing.status !== "PENDING") {
    return NextResponse.json({ error: "INVALID_STATE" }, { status: 409 });
  }

  await prisma.mangaReport.update({
    where: { id },
    data: { status: "REVIEWED" },
  });

  return NextResponse.json({ ok: true });
}
