import { prisma } from "@/lib/db";
import { DEFAULT_EARLY_ACCESS_PRICE } from "@/lib/constants/early-access";

export type ChapterAccessSlice = {
  isEarlyAccess: boolean;
  earlyAccessUntil: Date | null;
  earlyAccessPrice: number | null;
};

export type CanAccessChapterResult =
  | { allowed: true }
  | { allowed: false; price: number };

export function isEarlyAccessWindowActive(chapter: ChapterAccessSlice): boolean {
  if (!chapter.isEarlyAccess || !chapter.earlyAccessUntil) return false;
  return chapter.earlyAccessUntil.getTime() > Date.now();
}

export function resolveEarlyAccessPrice(chapter: ChapterAccessSlice): number {
  return chapter.earlyAccessPrice ?? DEFAULT_EARLY_ACCESS_PRICE;
}

/**
 * Reglas Early Access para un capítulo ya visible (p. ej. APPROVED).
 * No contempla bypass de staff; resuélvelo en la página antes de llamar a esto.
 */
export async function canAccessChapter(
  userId: string | null,
  chapterId: string,
  chapter: ChapterAccessSlice,
): Promise<CanAccessChapterResult> {
  if (!isEarlyAccessWindowActive(chapter)) {
    return { allowed: true };
  }

  const price = resolveEarlyAccessPrice(chapter);

  if (!userId) {
    return { allowed: false, price };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPro: true },
  });
  if (user?.isPro) {
    return { allowed: true };
  }

  const unlock = await prisma.chapterUnlock.findUnique({
    where: {
      userId_chapterId: { userId, chapterId },
    },
    select: { id: true },
  });
  if (unlock) {
    return { allowed: true };
  }

  return { allowed: false, price };
}
