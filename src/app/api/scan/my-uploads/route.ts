import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireScanAccess } from "@/lib/scan-access";
import { removeChapterUploadDir } from "@/lib/scan-storage";

export const runtime = "nodejs";

export async function GET() {
  const gate = await requireScanAccess(await headers());
  if (!gate.ok) return gate.response;

  const uploads = await prisma.chapterUpload.findMany({
    where: { uploaderId: gate.user.id },
    orderBy: { submittedAt: "desc" },
    select: {
      id: true,
      status: true,
      submittedAt: true,
      chapter: {
        select: {
          id: true,
          number: true,
          title: true,
          locale: true,
          language: true,
          status: true,
          manga: {
            select: { id: true, title: true, slug: true },
          },
        },
      },
    },
  });

  return NextResponse.json({
    uploads: uploads.map((u) => ({
      uploadId: u.id,
      uploadStatus: u.status,
      submittedAt: u.submittedAt.toISOString(),
      chapterId: u.chapter.id,
      chapterNumber: u.chapter.number,
      chapterTitle: u.chapter.title,
      chapterLocale: u.chapter.locale,
      chapterLanguage: u.chapter.language,
      chapterStatus: u.chapter.status,
      mangaTitle: u.chapter.manga.title,
      mangaSlug: u.chapter.manga.slug,
    })),
  });
}

export async function DELETE(request: Request) {
  const gate = await requireScanAccess(request.headers);
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const uploadId = (searchParams.get("id") ?? "").trim();
  if (!uploadId) {
    return NextResponse.json({ error: "ID_REQUIRED" }, { status: 400 });
  }

  const upload = await prisma.chapterUpload.findFirst({
    where: { id: uploadId, uploaderId: gate.user.id },
    select: { chapterId: true },
  });

  if (!upload) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const chapterId = upload.chapterId;

  await prisma.chapter.delete({ where: { id: chapterId } });
  await removeChapterUploadDir(chapterId);

  return NextResponse.json({ ok: true });
}
