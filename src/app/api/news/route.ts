import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const [announcements, recentChapters, recentMangas, recentScans] = await Promise.all([
    prisma.announcement.findMany({
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
      take: 10,
    }),
    prisma.chapter.findMany({
      where: { status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        number: true,
        title: true,
        locale: true,
        createdAt: true,
        manga: {
          select: {
            slug: true,
            title: true,
            coverImage: true,
          },
        },
      },
    }),
    prisma.manga.findMany({
      where: { reviewStatus: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        slug: true,
        title: true,
        coverImage: true,
        type: true,
        createdAt: true,
        tags: {
          take: 2,
          select: { tag: { select: { name: true } } },
        },
      },
    }),
    prisma.user.findMany({
      where: {
        role: { in: ["SCAN", "CREATOR"] },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        role: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    announcements,
    recentChapters,
    recentMangas,
    recentScans,
  });
}
