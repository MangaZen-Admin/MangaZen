import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { NotificationType } from "@prisma/client";
import { authenticateRequestWithRotation, jsonIfUnauthenticated } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

const bodySchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  notes: z.string().max(2000).optional(),
});

type RouteCtx = { params: Promise<{ chapterId: string }> };

export async function PATCH(request: Request, context: RouteCtx) {
  const { chapterId } = await context.params;
  const cookieStore = await cookies();
  const auth = await authenticateRequestWithRotation(cookieStore, request.headers);
  const unauth = jsonIfUnauthenticated(auth);
  if (unauth) return unauth;

  const admin = await prisma.user.findUnique({
    where: { id: auth.userId! },
    select: { role: true },
  });
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

  const { status, notes: notesRaw } = parsed.data;
  const notesTrimmed = notesRaw?.trim() ?? "";
  const notes = notesTrimmed.length > 0 ? notesTrimmed : null;

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: {
      id: true,
      status: true,
      number: true,
      manga: { select: { id: true, title: true, slug: true } },
      uploads: {
        where: { status: "PENDING" },
        select: { id: true, uploaderId: true },
      },
    },
  });

  if (!chapter) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (chapter.status !== "PENDING" || chapter.uploads.length === 0) {
    return NextResponse.json({ error: "INVALID_STATE" }, { status: 400 });
  }

  const uploaderId = chapter.uploads[0].uploaderId;
  const notifType: NotificationType =
    status === "APPROVED" ? "CHAPTER_APPROVED" : "CHAPTER_REJECTED";

  const updated = await prisma.$transaction(async (tx) => {
    const ch = await tx.chapter.update({
      where: { id: chapterId },
      data: { status },
      select: {
        id: true,
        status: true,
        number: true,
        title: true,
        locale: true,
        language: true,
        manga: { select: { title: true, slug: true } },
      },
    });

    await tx.chapterUpload.updateMany({
      where: { chapterId, status: "PENDING" },
      data: {
        status,
        reviewedAt: new Date(),
        notes,
      },
    });

    await tx.notification.create({
      data: {
        userId: uploaderId,
        type: notifType,
        entityId: chapterId,
        message: notes ?? "",
        payload: {
          mangaTitle: chapter.manga.title,
          mangaSlug: chapter.manga.slug,
          chapterNumber: chapter.number,
        },
      },
    });

    return ch;
  });

  return NextResponse.json({ ok: true, chapter: updated });
}
