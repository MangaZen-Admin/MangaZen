import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireScanAccess } from "@/lib/scan-access";
import { sanitizeScanPlainText } from "@/lib/sanitize-text";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ chapterId: string }> }) {
  const gate = await requireScanAccess(request.headers);
  if (!gate.ok) return gate.response;

  const { chapterId } = await params;

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

  if (
    gate.user.role !== "ADMIN" &&
    chapter_check.manga.uploaderId !== gate.user.id
  ) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const requester = await prisma.user.findUnique({
    where: { id: gate.user.id },
    select: { isTrusted: true },
  });
  const needsReview = gate.user.role !== "ADMIN" && !requester?.isTrusted;

  const currentChapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { title: true, number: true, locale: true },
  });

  const previousData = {
    title: currentChapter?.title ?? null,
    number: currentChapter?.number ?? null,
    locale: currentChapter?.locale ?? null,
  };

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const { title, number, locale, titleTranslations, pageUpdates } = o as {
    title?: string;
    number?: number;
    locale?: string;
    titleTranslations?: { locale: string; title: string }[];
    pageUpdates?: { pageId: string; isSingleInDoublePage: boolean }[];
  };

  const updated = await prisma.chapter.update({
    where: { id: chapterId },
    data: {
      ...(title !== undefined
        ? { title: sanitizeScanPlainText(String(title), 500) || null }
        : {}),
      ...(number !== undefined && Number.isFinite(number) ? { number } : {}),
      ...(locale && typeof locale === "string" ? { locale, language: locale.slice(0, 2).toUpperCase() } : {}),
    },
    select: { id: true, title: true, number: true, locale: true },
  });

  // Guardar traducciones de título
  if (Array.isArray(titleTranslations) && titleTranslations.length > 0) {
    await prisma.chapterTitleTranslation.deleteMany({ where: { chapterId } });
    await prisma.chapterTitleTranslation.createMany({
      data: titleTranslations
        .filter((t) => t.locale && t.title?.trim())
        .map((t) => ({
          chapterId,
          locale: t.locale,
          title: t.title.trim(),
        })),
      skipDuplicates: true,
    });
  }

  // Actualizar isSingleInDoublePage por página
  if (Array.isArray(pageUpdates) && pageUpdates.length > 0) {
    await Promise.all(
      pageUpdates.map((pu) =>
        prisma.page.update({
          where: { id: pu.pageId },
          data: { isSingleInDoublePage: pu.isSingleInDoublePage },
        })
      )
    );
  }

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
          locale: updated.locale,
        },
        requesterId: gate.user.id,
      },
    });
  }

  return NextResponse.json({ ok: true, chapter: updated, pendingReview: needsReview });
}
