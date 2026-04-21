import { redirect } from "next/navigation";
import ScanPanelClient from "@/components/scan/ScanPanelClient";
import { getAuthenticatedUserIdServer } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import { canUseScanPanel } from "@/lib/roles";

type ScanPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ScanPage({ params }: ScanPageProps) {
  const { locale } = await params;
  const userId = await getAuthenticatedUserIdServer();

  if (!userId) {
    redirect(`/${locale}/login?next=/${locale}/scan`);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user || !canUseScanPanel(user.role)) {
    redirect(`/${locale}`);
  }

  return <ScanPanelClient />;
}
