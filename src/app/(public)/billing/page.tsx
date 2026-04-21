import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getAuthenticatedUserIdServer } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import { BillingPageClient } from "@/components/billing/BillingPageClient";
import { ZEN_PACKAGES } from "@/lib/lemon-squeezy";

export async function generateMetadata() {
  const t = await getTranslations("billing");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function BillingPage() {
  const userId = await getAuthenticatedUserIdServer();
  const locale = await getLocale();

  if (!userId) {
    redirect(`/${locale}/login?next=/${locale}/billing`);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { zenCoins: true, zenShards: true },
  });

  return (
    <main className="mx-auto min-h-[calc(100vh-5rem)] w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <BillingPageClient
        packages={ZEN_PACKAGES}
        initialZenCoins={user?.zenCoins ?? 0}
        initialZenShards={user?.zenShards ?? 0}
        locale={locale}
      />
    </main>
  );
}
