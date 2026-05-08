import { getAuthenticatedUserIdServer } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import { AdSlot } from "@/components/AdSlot";

type AdSlotShellProps = {
  slotId: string;
  className?: string;
  height?: string;
};

export async function AdSlotShell({ slotId, className, height }: AdSlotShellProps) {
  const userId = await getAuthenticatedUserIdServer();

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isPro: true },
    });
    if (user?.isPro) return null;
  }

  const [specificAd, globalAd] = await Promise.all([
    prisma.adScript.findUnique({
      where: { slotId },
      select: { scripts: true, isActive: true },
    }),
    prisma.adScript.findUnique({
      where: { slotId: "global" },
      select: { scripts: true, isActive: true },
    }),
  ]);

  const adScripts: string[] =
    (specificAd?.isActive ? (specificAd.scripts as string[]) : null) ??
    (globalAd?.isActive ? (globalAd.scripts as string[]) : null) ??
    [];

  return <AdSlot slotId={slotId} className={className} height={height} adScripts={adScripts} />;
}
