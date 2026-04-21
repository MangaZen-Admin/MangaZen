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
      select: { script: true, isActive: true },
    }),
    prisma.adScript.findUnique({
      where: { slotId: "global" },
      select: { script: true, isActive: true },
    }),
  ]);

  const adScript =
    (specificAd?.isActive ? specificAd.script : null) ??
    (globalAd?.isActive ? globalAd.script : null) ??
    null;

  return <AdSlot slotId={slotId} className={className} height={height} adScript={adScript} />;
}
