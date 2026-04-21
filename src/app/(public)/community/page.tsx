import type { UserRole } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import CommunityPageClient from "./CommunityPageClient";
import { getAuthenticatedUserIdServer } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

export async function generateMetadata() {
  const t = await getTranslations("community");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function CommunityPage() {
  const userId = await getAuthenticatedUserIdServer();

  let userRole: UserRole | null = null;
  let hasPendingRequest = false;

  let showAds = true;
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, isPro: true },
    });
    userRole = user?.role ?? null;
    showAds = !user?.isPro;
    if (user?.role === "USER") {
      const pending = await prisma.creatorRoleRequest.findFirst({
        where: { userId, status: "PENDING" },
        select: { id: true },
      });
      hasPendingRequest = !!pending;
    }
  }

  return (
    <CommunityPageClient
      isLoggedIn={!!userId}
      userRole={userRole}
      hasPendingRequest={hasPendingRequest}
      showAds={showAds}
    />
  );
}
