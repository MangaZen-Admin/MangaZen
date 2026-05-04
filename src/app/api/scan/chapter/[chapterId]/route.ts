import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireScanAccess } from "@/lib/scan-access";
import { sanitizeScanPlainText } from "@/lib/sanitize-text";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ chapterId: string }> }) {
  const gate = await requireScanAccess(request.headers);
  if (!gate.ok) return gate.response;

  const { chapterId } = await params;

  const upload = await prisma.chapterUpload.findFirst({
    where: { chapterId, uploaderId: gate.user.id },
    select: { id: true, status: true },
  });
  if (!upload) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (upload.status === "APPROVED") {
    return NextResponse.json({ error: "ALREADY_APPROVED" }, { status: 403 });
  }

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

  return NextResponse.json({ ok: true, chapter: updated });
}
