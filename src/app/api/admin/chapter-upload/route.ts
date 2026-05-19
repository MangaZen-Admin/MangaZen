import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { requireAdminAccess } from "@/lib/admin-access";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const gate = await requireAdminAccess(await headers());
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const chapterId = searchParams.get("chapterId")?.trim() ?? "";

  if (!chapterId) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });

  const upload = await prisma.chapterUpload.findFirst({
    where: { chapterId },
    select: { id: true },
  });

  return NextResponse.json({ uploadId: upload?.id ?? null });
}
