import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authenticateRequestWithRotation } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type ContentItem = {
  id: string;
  type: "comment" | "chapter" | "manga" | "feedback";
  label: string;
  sublabel?: string;
  authorLabel?: string;
  createdAt: string;
};

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const { userId } = await authenticateRequestWithRotation(cookieStore, request.headers);
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const admin = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const [comments, chapters, mangas, feedbacks] = await Promise.all([
    prisma.comment.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        body: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
        chapter: {
          select: {
            number: true,
            manga: { select: { title: true } },
          },
        },
      },
    }),
    prisma.chapter.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        number: true,
        title: true,
        createdAt: true,
        manga: { select: { title: true } },
        uploads: {
          take: 1,
          select: {
            uploader: { select: { name: true, email: true } },
          },
        },
      },
    }),
    prisma.manga.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        createdAt: true,
        uploader: { select: { name: true, email: true } },
      },
    }),
    prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        category: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
    }),
  ]);

  const items: ContentItem[] = [
    ...comments.map((c) => ({
      id: c.id,
      type: "comment" as const,
      label: c.body.slice(0, 80) + (c.body.length > 80 ? "…" : ""),
      sublabel: c.chapter
        ? `${c.chapter.manga.title} — Cap. ${c.chapter.number}`
        : undefined,
      authorLabel: c.user.name ?? c.user.email ?? undefined,
      createdAt: c.createdAt.toISOString(),
    })),
    ...chapters.map((c) => ({
      id: c.id,
      type: "chapter" as const,
      label: `${c.manga.title} — Cap. ${c.number}${c.title ? ` — ${c.title}` : ""}`,
      authorLabel:
        c.uploads[0]?.uploader.name ?? c.uploads[0]?.uploader.email ?? undefined,
      createdAt: c.createdAt.toISOString(),
    })),
    ...mangas.map((m) => ({
      id: m.id,
      type: "manga" as const,
      label: m.title,
      authorLabel: m.uploader.name ?? m.uploader.email ?? undefined,
      createdAt: m.createdAt.toISOString(),
    })),
    ...feedbacks.map((f) => ({
      id: f.id,
      type: "feedback" as const,
      label: f.title,
      sublabel: f.category,
      authorLabel: f.user.name ?? f.user.email ?? undefined,
      createdAt: f.createdAt.toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50);

  return NextResponse.json({ items });
}
