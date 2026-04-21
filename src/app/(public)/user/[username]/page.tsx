import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  PublicProfileFull,
  PublicProfileGuestTeaser,
  PublicProfilePrivateMessage,
} from "@/components/profile/PublicProfileSections";
import { getAuthenticatedUserIdServer } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import { loadPublicProfileSupplemental } from "@/lib/load-public-profile-extras";
import { findUserForPublicProfile } from "@/lib/resolve-profile-user";

type PageProps = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const user = await findUserForPublicProfile(username);
  const t = await getTranslations("publicProfile");
  if (!user) {
    return { title: t("metaTitleFallback") };
  }
  const name = user.name?.trim() || t("anonymousName");
  return { title: `${name} · MangaZen` };
}

export default async function PublicUserPage({ params }: PageProps) {
  const { username: param } = await params;
  const locale = await getLocale();
  const t = await getTranslations("publicProfile");

  const user = await findUserForPublicProfile(param);
  if (!user) notFound();

  const displayName = user.name?.trim() || t("anonymousName");
  const viewerId = await getAuthenticatedUserIdServer();
  const returnPath = `/${locale}/user/${encodeURIComponent(param)}`;

  if (!viewerId) {
    return (
      <main className="min-h-[calc(100vh-5rem)] bg-background px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <PublicProfileGuestTeaser
            locale={locale}
            displayName={displayName}
            imageUrl={user.image}
            returnPath={returnPath}
          />
        </div>
      </main>
    );
  }

  const isSelf = viewerId === user.id;
  if (!isSelf && !user.isProfilePublic) {
    return (
      <main className="min-h-[calc(100vh-5rem)] bg-background px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <PublicProfilePrivateMessage displayName={displayName} imageUrl={user.image} />
        </div>
      </main>
    );
  }

  const supplemental = await loadPublicProfileSupplemental(user.id, user.role);

  const viewer = await prisma.user.findUnique({
    where: { id: viewerId },
    select: { isPro: true },
  });
  const showAdSlot = !isSelf && !viewer?.isPro;

  const donationLinks =
    user.role === "SCAN" || user.role === "CREATOR" || user.role === "ADMIN"
      ? await prisma.donationLink.findMany({
          where: { userId: user.id },
          orderBy: { order: "asc" },
          select: { id: true, platform: true, url: true },
        })
      : [];

  const showZen = isSelf || !user.hideZenFromPublic;
  const showFavorites = isSelf || !user.hideFavoritesFromPublic;
  const showReadingStats = isSelf || !user.hideReadingStatsFromPublic;

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <PublicProfileFull
          locale={locale}
          user={user}
          supplemental={supplemental}
          isSelf={isSelf}
          showZen={showZen}
          showFavorites={showFavorites}
          showReadingStats={showReadingStats}
          donationLinks={donationLinks}
          showAdSlot={showAdSlot}
        />
      </div>
    </main>
  );
}
