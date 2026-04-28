import { prisma } from "@/lib/db";

const publicProfileUserSelect = {
  id: true,
  username: true,
  name: true,
  image: true,
  bannerImage: true,
  role: true,
  createdAt: true,
  zenCoins: true,
  zenShards: true,
  isPro: true,
  isProfilePublic: true,
  externalDonationLink: true,
  hideZenFromPublic: true,
  hideFavoritesFromPublic: true,
  hideReadingStatsFromPublic: true,
  badges: {
    select: {
      id: true,
      name: true,
      description: true,
      iconUrl: true,
      iconKey: true,
      isHighlighted: true,
    },
  },
} as const;

export type PublicProfileUser = NonNullable<Awaited<ReturnType<typeof findUserForPublicProfile>>>;

/**
 * Usuario para perfil público por segmento de URL: id (cuid) o username (minúsculas en BD).
 */
export async function findUserForPublicProfile(param: string) {
  const p = param.trim();
  if (!p) return null;

  return prisma.user.findFirst({
    where: {
      OR: [{ id: p }, { username: p.toLowerCase() }],
    },
    select: publicProfileUserSelect,
  });
}
