import { getAuthenticatedUserIdServer } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import { GlobalAdblockBanner } from "@/components/GlobalAdblockBanner";

const PILAR_BADGE_NAME = "Pilar de la Comunidad";

export async function GlobalAdblockBannerShell() {
  const userId = await getAuthenticatedUserIdServer();
  if (!userId) return null;

  const hasPilar = await prisma.user.findFirst({
    where: {
      id: userId,
      badges: { some: { name: PILAR_BADGE_NAME } },
    },
    select: { id: true },
  });
  if (hasPilar) return null;

  return <GlobalAdblockBanner />;
}
