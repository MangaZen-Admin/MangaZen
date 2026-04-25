import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { routing } from "@/i18n/routing";

export const runtime = "nodejs";

function isAppLocale(s: string): boolean {
  return (routing.locales as ReadonlyArray<string>).includes(s);
}

function localeFromRequest(request: Request): string {
  const x = request.headers.get("x-locale");
  if (x && isAppLocale(x)) return x;
  const ref = request.headers.get("referer");
  if (ref) {
    try {
      const first = new URL(ref).pathname.split("/").filter(Boolean)[0];
      if (first && isAppLocale(first)) return first;
    } catch {
      // ignore
    }
  }
  return "es-ar";
}

export async function GET(request: Request) {
  const locale = localeFromRequest(request);

  const [announcementRows, recentChapters, recentMangas, recentScans] = await Promise.all([
    prisma.announcement.findMany({
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
      take: 20,
      include: { translations: true },
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

  const announcements = announcementRows.map((a) => {
    const translation =
      a.translations.find((t) => t.locale === locale) ??
      a.translations.find((t) => t.locale === "es-ar") ??
      a.translations[0];
    return {
      id: a.id,
      title: translation?.title ?? "",
      body: translation?.body ?? "",
      imageUrl: translation?.imageUrl ?? null,
      isPinned: a.isPinned,
      publishedAt: a.publishedAt.toISOString(),
    };
  });

  return NextResponse.json({
    announcements,
    recentChapters,
    recentMangas,
    recentScans,
  });
}
