import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isReadingStatus } from "@/lib/reading-status";
import { authenticateRequestWithRotation } from "@/lib/auth-session";
import { awardBadgeIfEarned } from "@/lib/badges/award-badge";
import { canViewMangaInCatalog } from "@/lib/manga-visibility";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const cookieStore = await cookies();
  const { userId: sessionUserId } = await authenticateRequestWithRotation(cookieStore, request.headers);

  if (!sessionUserId) {
    return NextResponse.json(
      { error: "AUTH_REQUIRED", message: "Necesitás una cuenta para guardar tu progreso." },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUserId },
    select: { id: true, role: true },
  });

  if (!user) {
    return NextResponse.json(
      { error: "AUTH_REQUIRED", message: "Tu sesión no es válida." },
      { status: 401 }
    );
  }

  const { slug } = await context.params;
  const manga = await prisma.manga.findUnique({
    where: { slug },
    select: { id: true, reviewStatus: true, uploaderId: true },
  });

  if (
    !manga ||
    !canViewMangaInCatalog({
      reviewStatus: manga.reviewStatus,
      mangaUploaderId: manga.uploaderId,
      viewerUserId: user.id,
      viewerRole: user.role,
    })
  ) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const body = (await request.json()) as { status?: string | null };
  const raw = body?.status;

  if (raw === null || raw === "" || raw === "NONE") {
    await prisma.mangaProgress.deleteMany({
      where: { userId: user.id, mangaId: manga.id },
    });
    return NextResponse.json({ status: null, badgesEarned: [] });
  }

  if (!isReadingStatus(raw)) {
    return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
  }

  await prisma.mangaProgress.upsert({
    where: {
      userId_mangaId: {
        userId: user.id,
        mangaId: manga.id,
      },
    },
    create: {
      userId: user.id,
      mangaId: manga.id,
      status: raw,
    },
    update: { status: raw },
  });

  const badgesEarned = await awardBadgeIfEarned(user.id, "READING_STATUS_SET");

  return NextResponse.json({ status: raw, badgesEarned });
}
