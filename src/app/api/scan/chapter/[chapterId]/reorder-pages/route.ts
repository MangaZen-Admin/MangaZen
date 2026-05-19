import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireScanAccess } from "@/lib/scan-access";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ chapterId: string }> }) {
  const gate = await requireScanAccess(request.headers);
  if (!gate.ok) return gate.response;

  const { chapterId } = await params;

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { id: true, manga: { select: { uploaderId: true } } },
  });

  if (!chapter) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  if (gate.user.role !== "ADMIN" && chapter.manga.uploaderId !== gate.user.id) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const { pageOrder } = body as { pageOrder?: { pageId: string; pageNumber: number }[] };

  if (!Array.isArray(pageOrder) || pageOrder.length === 0) {
    return NextResponse.json({ error: "INVALID_ORDER" }, { status: 400 });
  }

  await Promise.all(
    pageOrder.map((p) =>
      prisma.page.update({
        where: { id: p.pageId },
        data: { pageNumber: p.pageNumber },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
