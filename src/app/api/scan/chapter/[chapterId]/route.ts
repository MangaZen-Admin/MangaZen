import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireScanAccess } from "@/lib/scan-access";
import { sanitizeScanPlainText } from "@/lib/sanitize-text";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ chapterId: string }> }) {
  const gate = await requireScanAccess(request.headers);
  if (!gate.ok) return gate.response;

  const { chapterId } = await params;

  // Verificar acceso al capítulo
  const chapter_check = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: {
      id: true,
      manga: { select: { uploaderId: true } },
    },
  });
  if (!chapter_check) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  // Admin puede editar cualquier capítulo
  // SCAN/CREATOR solo puede editar capítulos de sus mangas
  if (
    gate.user.role !== "ADMIN" &&
    chapter_check.manga.uploaderId !== gate.user.id
  ) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  // needsReview crea ChangeRequest; admin/trusted aplican directo.

  const requester = await prisma.user.findUnique({
    where: { id: gate.user.id },
    select: { isTrusted: true },
  });
  const needsReview = gate.user.role !== "ADMIN" && !requester?.isTrusted;

  const currentChapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { title: true, number: true },
  });

  const previousData = {
    title: currentChapter?.title ?? null,
    number: currentChapter?.number ?? null,
  };

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const { title, number } = body as { title?: string; number?: number };

  const updated = await prisma.chapter.update({
    where: { id: chapterId },
    data: {
      ...(title !== undefined
        ? { title: sanitizeScanPlainText(String(title), 500) || null }
        : {}),
      ...(number !== undefined && Number.isFinite(number) ? { number } : {}),
    },
    select: { id: true, title: true, number: true },
  });

  if (needsReview) {
    await prisma.changeRequest.create({
      data: {
        type: "CHAPTER_EDIT",
        status: "PENDING",
        entityId: chapterId,
        previousData,
        newData: {
          title: updated.title,
          number: updated.number,
        },
        requesterId: gate.user.id,
      },
    });
  }

  return NextResponse.json({ ok: true, chapter: updated, pendingReview: needsReview });
}
