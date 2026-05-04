import type { Prisma } from "@prisma/client";
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

  const { action, adminNote } = body as { action: "approve" | "reject"; adminNote?: string };

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
  }

  const cr = await prisma.changeRequest.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      status: true,
      entityId: true,
      previousData: true,
      requesterId: true,
    },
  });

  if (!cr || cr.status !== "PENDING") {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (action === "approve") {
    await prisma.changeRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        adminNote: adminNote ?? null,
        reviewedAt: new Date(),
      },
    });

    let notifPayload: Record<string, unknown> = { type: cr.type };

    if (cr.type === "MANGA_EDIT") {
      const manga = await prisma.manga.findUnique({
        where: { id: cr.entityId },
        select: { title: true, slug: true },
      });
      notifPayload = {
        ...notifPayload,
        mangaTitle: manga?.title ?? "",
        mangaSlug: manga?.slug ?? "",
      };
    } else if (cr.type === "CHAPTER_EDIT") {
      const chapter = await prisma.chapter.findUnique({
        where: { id: cr.entityId },
        select: {
          number: true,
          manga: { select: { title: true, slug: true } },
        },
      });
      notifPayload = {
        ...notifPayload,
        chapterNumber: chapter?.number ?? null,
        mangaTitle: chapter?.manga.title ?? "",
        mangaSlug: chapter?.manga.slug ?? "",
      };
    }

    await prisma.notification.create({
      data: {
        userId: cr.requesterId,
        type: "CHANGE_REQUEST_APPROVED",
        entityId: cr.entityId,
        message: adminNote ?? "",
        payload: notifPayload as Prisma.InputJsonValue,
      },
    });
  } else {
    const prev = cr.previousData as Record<string, unknown>;

    if (cr.type === "MANGA_EDIT") {
      await prisma.manga.update({
        where: { id: cr.entityId },
        data: prev as Prisma.MangaUpdateInput,
      });
    } else if (cr.type === "CHAPTER_EDIT") {
      await prisma.chapter.update({
        where: { id: cr.entityId },
        data: prev as Prisma.ChapterUpdateInput,
      });
    }

    await prisma.changeRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        adminNote: adminNote ?? null,
        reviewedAt: new Date(),
      },
    });

    let notifPayload: Record<string, unknown> = { type: cr.type };

    if (cr.type === "MANGA_EDIT") {
      const manga = await prisma.manga.findUnique({
        where: { id: cr.entityId },
        select: { title: true, slug: true },
      });
      notifPayload = {
        ...notifPayload,
        mangaTitle: manga?.title ?? "",
        mangaSlug: manga?.slug ?? "",
      };
    } else if (cr.type === "CHAPTER_EDIT") {
      const chapter = await prisma.chapter.findUnique({
        where: { id: cr.entityId },
        select: {
          number: true,
          manga: { select: { title: true, slug: true } },
        },
      });
      notifPayload = {
        ...notifPayload,
        chapterNumber: chapter?.number ?? null,
        mangaTitle: chapter?.manga.title ?? "",
        mangaSlug: chapter?.manga.slug ?? "",
      };
    }

    await prisma.notification.create({
      data: {
        userId: cr.requesterId,
        type: "CHANGE_REQUEST_REJECTED",
        entityId: cr.entityId,
        message: adminNote ?? "",
        payload: notifPayload as Prisma.InputJsonValue,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
