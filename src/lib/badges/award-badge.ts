import { prisma } from "@/lib/db";
import { SEED_BADGES } from "@/lib/badges/catalog";

export type BadgeAwardTrigger =
  | "ADBLOCK_WHITELIST"
  | "PROGRESS_SAVED"
  | "READING_STATUS_SET"
  | "COMMENT_POSTED"
  | "FAVORITE_ADDED"
  | "MANGA_LIKED"
  | "SCAN_UPLOAD_SUBMITTED"
  | "ZEN_POINTS_UPDATED"
  | "CREATOR_APPROVED";

export type AwardBadgeContext = {
  /** Hora local del servidor (0–23) al guardar progreso */
  progressSavedAtHour?: number;
  /** Saldo Zen Coins tras la operación */
  zenCoins?: number;
};

const badgeSelect = {
  id: true,
  name: true,
  description: true,
  iconUrl: true,
  iconKey: true,
  isHighlighted: true,
  triggerType: true,
  triggerThreshold: true,
} as const;

export type EarnedBadge = {
  id: string;
  name: string;
  description: string;
  iconUrl: string | null;
  iconKey: string | null;
  isHighlighted: boolean;
};

const N = {
  PILAR: "Pilar de la Comunidad",
  PRIMERA_PAGINA: "Primera página",
  EXPLORADOR: "Explorador de estanterías",
  VIAJERO: "Viajero de mundos",
  PRIMERA_VOZ: "Primera voz",
  ALMA_FORO: "Alma del foro",
  HILO: "Hilo continuo",
  CORAZON: "Corazón manga",
  PULGAR: "Pulgar arriba zen",
  VOCES: "Voces del mundo",
  PUNTERO: "Puntero Zen",
  ARCOIRIS: "Arcoíris Zen",
  PRIMERA_ENTREGA: "Primera entrega",
  MOTOR: "Motor de sala",
  BUHO: "Búho MangaZen",
  PLAN: "Plan maestro",
  FINAL: "Final feliz",
  AUTOR: "Autor en la obra",
} as const;

async function ownedBadgeNames(userId: string): Promise<Set<string>> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { badges: { select: { name: true } } },
  });
  return new Set((row?.badges ?? []).map((b) => b.name));
}

async function ensurePilarBadgeRow() {
  const seed = SEED_BADGES.find((b) => b.name === N.PILAR)!;
  return prisma.badge.upsert({
    where: { name: N.PILAR },
    create: {
      name: seed.name,
      description: seed.description,
      iconUrl: null,
      iconKey: seed.iconKey,
      isHighlighted: seed.isHighlighted,
    },
    update: {
      description: seed.description,
      iconKey: seed.iconKey,
      isHighlighted: seed.isHighlighted,
    },
    select: badgeSelect,
  });
}

async function countMangaWithProgress(userId: string): Promise<number> {
  return prisma.mangaProgress.count({
    where: { userId, lastChapterId: { not: null } },
  });
}

async function countCommentsChapter(userId: string): Promise<number> {
  return prisma.comment.count({
    where: { userId, targetType: "CHAPTER" },
  });
}

async function countCommentReplies(userId: string): Promise<number> {
  return prisma.comment.count({
    where: { userId, targetType: "CHAPTER", parentId: { not: null } },
  });
}

async function countDistinctCommentLocales(userId: string): Promise<number> {
  const rows = await prisma.comment.findMany({
    where: { userId, targetType: "CHAPTER" },
    select: { locale: true },
    distinct: ["locale"],
  });
  return rows.length;
}

async function countFavorites(userId: string): Promise<number> {
  return prisma.userFavorite.count({ where: { userId } });
}

async function countMangaLikes(userId: string): Promise<number> {
  return prisma.vote.count({
    where: { userId, targetType: "MANGA", value: 1 },
  });
}

async function countScanUploads(userId: string): Promise<number> {
  return prisma.chapterUpload.count({ where: { uploaderId: userId } });
}

async function countPlanToRead(userId: string): Promise<number> {
  return prisma.mangaProgress.count({
    where: { userId, status: "PLAN_TO_READ" },
  });
}

async function countCompleted(userId: string): Promise<number> {
  return prisma.mangaProgress.count({
    where: { userId, status: "COMPLETED" },
  });
}

function toEarnedBadge(b: {
  id: string;
  name: string;
  description: string;
  iconUrl: string | null;
  iconKey: string | null;
  isHighlighted: boolean;
}): EarnedBadge {
  return {
    id: b.id,
    name: b.name,
    description: b.description,
    iconUrl: b.iconUrl,
    iconKey: b.iconKey,
    isHighlighted: b.isHighlighted,
  };
}

/**
 * Insignias del catálogo con umbral en BD (Admin). Se evalúa en cada llamada junto a las reglas hardcodeadas.
 * ZEN_POINTS_SPENT: no hay tabla de transacciones aún; se usa el saldo actual como aproximación (mismo criterio que ZEN_POINTS_TOTAL hasta tener ledger).
 */
async function evaluateDynamicThresholdBadges(userId: string): Promise<EarnedBadge[]> {
  const owned = await ownedBadgeNames(userId);

  const candidates = await prisma.badge.findMany({
    where: {
      triggerType: { not: null },
      triggerThreshold: { not: null },
      NOT: { triggerType: "MANUAL" },
    },
    select: badgeSelect,
  });

  if (candidates.length === 0) return [];

  const [zenRow, chaptersRead, commentsPosted, scanUploads, favoritesAdded] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { zenCoins: true } }),
    prisma.mangaProgress.count({
      where: { userId, lastChapterId: { not: null } },
    }),
    prisma.comment.count({ where: { userId } }),
    prisma.chapterUpload.count({ where: { uploaderId: userId } }),
    prisma.userFavorite.count({ where: { userId } }),
  ]);

  const zenTotal = zenRow?.zenCoins ?? 0;

  const earned: EarnedBadge[] = [];

  for (const b of candidates) {
    if (owned.has(b.name)) continue;
    const t = b.triggerType;
    const th = b.triggerThreshold;
    if (t == null || th == null) continue;

    let ok = false;
    switch (t) {
      case "ZEN_POINTS_TOTAL":
        ok = zenTotal >= th;
        break;
      case "ZEN_POINTS_SPENT":
        // Aproximación hasta existir ledger de gastos reales.
        ok = zenTotal >= th;
        break;
      case "CHAPTERS_READ":
        ok = chaptersRead >= th;
        break;
      case "COMMENTS_POSTED":
        ok = commentsPosted >= th;
        break;
      case "SCAN_UPLOADS":
        ok = scanUploads >= th;
        break;
      case "FAVORITES_ADDED":
        ok = favoritesAdded >= th;
        break;
      default:
        ok = false;
    }

    if (ok) {
      earned.push(toEarnedBadge(b));
    }
  }

  return earned;
}

/**
 * Evalúa y otorga insignias automáticas según el disparador.
 * Las insignias solo manuales (p. ej. Mecenas MangaZen) no se evalúan aquí.
 */
export async function awardBadgeIfEarned(
  userId: string,
  trigger: BadgeAwardTrigger,
  context?: AwardBadgeContext
): Promise<EarnedBadge[]> {
  const owned = await ownedBadgeNames(userId);
  const toConnectNames = new Set<string>();

  const consider = (name: string, ok: boolean) => {
    if (ok && !owned.has(name)) toConnectNames.add(name);
  };

  if (trigger === "ADBLOCK_WHITELIST") {
    await ensurePilarBadgeRow();
    consider(N.PILAR, true);
  }

  if (trigger === "PROGRESS_SAVED") {
    const mangaWithProgress = await countMangaWithProgress(userId);
    consider(N.PRIMERA_PAGINA, mangaWithProgress >= 1);
    consider(N.EXPLORADOR, mangaWithProgress >= 5);
    consider(N.VIAJERO, mangaWithProgress >= 15);
    const h = context?.progressSavedAtHour;
    if (h !== undefined && h >= 0 && h <= 4) {
      consider(N.BUHO, true);
    }
  }

  if (trigger === "READING_STATUS_SET") {
    const plan = await countPlanToRead(userId);
    const done = await countCompleted(userId);
    consider(N.PLAN, plan >= 5);
    consider(N.FINAL, done >= 3);
  }

  if (trigger === "COMMENT_POSTED") {
    const total = await countCommentsChapter(userId);
    const replies = await countCommentReplies(userId);
    const locales = await countDistinctCommentLocales(userId);
    consider(N.PRIMERA_VOZ, total >= 1);
    consider(N.ALMA_FORO, total >= 10);
    consider(N.HILO, replies >= 5);
    consider(N.VOCES, locales >= 3);
  }

  if (trigger === "FAVORITE_ADDED") {
    const n = await countFavorites(userId);
    consider(N.CORAZON, n >= 1);
  }

  if (trigger === "MANGA_LIKED") {
    const n = await countMangaLikes(userId);
    consider(N.PULGAR, n >= 1);
  }

  if (trigger === "SCAN_UPLOAD_SUBMITTED") {
    const n = await countScanUploads(userId);
    consider(N.PRIMERA_ENTREGA, n >= 1);
    consider(N.MOTOR, n >= 10);
  }

  if (trigger === "ZEN_POINTS_UPDATED") {
    const z = context?.zenCoins;
    if (z !== undefined) {
      consider(N.PUNTERO, z >= 100);
      consider(N.ARCOIRIS, z >= 1000);
    }
  }

  if (trigger === "CREATOR_APPROVED") {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    consider(N.AUTOR, user?.role === "CREATOR");
  }

  const hardcodedRows =
    toConnectNames.size > 0
      ? await prisma.badge.findMany({
          where: { name: { in: [...toConnectNames] } },
          select: badgeSelect,
        })
      : [];

  const dynamicEarned = await evaluateDynamicThresholdBadges(userId);

  const byId = new Map<string, EarnedBadge>();
  for (const b of hardcodedRows) {
    byId.set(b.id, toEarnedBadge(b));
  }
  for (const e of dynamicEarned) {
    if (!byId.has(e.id)) byId.set(e.id, e);
  }

  if (byId.size === 0) return [];

  await prisma.user.update({
    where: { id: userId },
    data: {
      badges: { connect: [...byId.keys()].map((id) => ({ id })) },
    },
  });

  return [...byId.values()];
}
