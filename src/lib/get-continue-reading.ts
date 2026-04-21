import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type ContinueReadingItem = {
  manga: {
    slug: string;
    title: string;
    coverImage: string | null;
  };
  lastChapterId: string;
  lastPageNumber: number;
  chapterNumber: number;
  chapterTitle: string | null;
};

const CONTINUE_READING_LIMIT = 10;

/**
 * Mangas en curso (READING) con posición guardada, para la sección "Seguir leyendo".
 */
export async function getContinueReadingForUser(userId: string): Promise<ContinueReadingItem[]> {
  try {
    const rows = await prisma.mangaProgress.findMany({
      where: {
        userId,
        status: "READING",
        lastChapterId: { not: null },
        manga: {
          OR: [{ reviewStatus: "APPROVED" }, { uploaderId: userId }],
        },
      },
      orderBy: { updatedAt: "desc" },
      take: CONTINUE_READING_LIMIT,
      select: {
        lastChapterId: true,
        lastPageNumber: true,
        manga: {
          select: {
            slug: true,
            title: true,
            coverImage: true,
          },
        },
        lastChapter: {
          select: {
            id: true,
            number: true,
            title: true,
          },
        },
      },
    });

    const out: ContinueReadingItem[] = [];
    for (const r of rows) {
      if (!r.lastChapterId || !r.lastChapter) continue;
      out.push({
        manga: {
          slug: r.manga.slug,
          title: r.manga.title,
          coverImage: r.manga.coverImage,
        },
        lastChapterId: r.lastChapterId,
        lastPageNumber: r.lastPageNumber,
        chapterNumber: r.lastChapter.number,
        chapterTitle: r.lastChapter.title,
      });
    }
    return out;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      return [];
    }
    throw error;
  }
}
