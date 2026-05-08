import { prisma } from "@/lib/db";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

export async function checkRateLimit(key: string): Promise<{ allowed: boolean; remainingMs: number }> {
  const now = new Date();
  const resetAt = new Date(Date.now() + WINDOW_MS);

  const entry = await prisma.rateLimit.findUnique({ where: { key } });

  if (!entry || entry.resetAt < now) {
    await prisma.rateLimit.upsert({
      where: { key },
      create: { key, count: 1, resetAt },
      update: { count: 1, resetAt },
    });
    return { allowed: true, remainingMs: 0 };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, remainingMs: entry.resetAt.getTime() - now.getTime() };
  }

  await prisma.rateLimit.update({
    where: { key },
    data: { count: { increment: 1 } },
  });

  return { allowed: true, remainingMs: 0 };
}

export async function clearRateLimit(key: string): Promise<void> {
  await prisma.rateLimit.deleteMany({ where: { key } }).catch(() => null);
}
