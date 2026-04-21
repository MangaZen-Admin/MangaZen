import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { MangaReviewStatus, NotificationType } from "@prisma/client";
import { authenticateRequestWithRotation } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

type RouteParams = { params: Promise<{ slug: string }> };

function isReviewStatus(v: unknown): v is MangaReviewStatus {
  return v === "APPROVED" || v === "REJECTED";
}

export async function PATCH(request: Request, context: RouteParams) {
  const { slug } = await context.params;
  const cookieStore = await cookies();
  const { userId: adminId } = await authenticateRequestWithRotation(cookieStore, request.headers);
  if (!adminId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const admin = await prisma.user.findUnique({
    where: { id: adminId },
    select: { role: true },
  });
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const o = body as Record<string, unknown>;
  const status = o.status;
  if (!isReviewStatus(status)) {
    return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
  }

  let rejectionReason: string | null = null;
  if (status === "REJECTED") {
    const raw = o.rejectionReason;
    if (raw != null) {
      if (typeof raw !== "string") {
        return NextResponse.json({ error: "INVALID_REJECTION_REASON" }, { status: 400 });
      }
      const trimmed = raw.trim();
      rejectionReason = trimmed.length > 0 ? trimmed.slice(0, 2000) : null;
    }
  }

  const manga = await prisma.manga.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      reviewStatus: true,
      uploaderId: true,
    },
  });
  if (!manga) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (manga.reviewStatus !== "PENDING_REVIEW") {
    return NextResponse.json({ error: "INVALID_STATE" }, { status: 400 });
  }

  const notifType: NotificationType =
    status === "APPROVED" ? "MANGA_APPROVED" : "MANGA_REJECTED";

  const updated = await prisma.$transaction(async (tx) => {
    const m = await tx.manga.update({
      where: { id: manga.id },
      data: {
        reviewStatus: status,
        reviewRejectionReason: status === "REJECTED" ? rejectionReason : null,
      },
      select: {
        slug: true,
        reviewStatus: true,
        reviewRejectionReason: true,
      },
    });

    await tx.notification.create({
      data: {
        userId: manga.uploaderId,
        type: notifType,
        entityId: manga.id,
        message: rejectionReason ?? "",
        payload: {
          mangaTitle: manga.title,
          mangaSlug: manga.slug,
        },
      },
    });

    return m;
  });

  return NextResponse.json({ ok: true, manga: updated });
}
