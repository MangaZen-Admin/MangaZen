import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { ProfileLibrary } from "@/components/profile/ProfileLibrary";
import { ProfileAccountCard } from "@/components/profile/ProfileAccountCard";
import { DonationLinksEditor } from "@/components/profile/DonationLinksEditor";
import { ProfileSecurityPanel } from "@/components/profile/ProfileSecurityPanel";
import { TransactionHistory } from "@/components/profile/TransactionHistory";
import { getAuthenticatedUserIdServer } from "@/lib/auth-session";
import { BadgeIcon } from "@/components/profile/BadgeIcon";

export async function generateMetadata() {
  const t = await getTranslations("profile");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function ProfilePage() {
  const t = await getTranslations("profile");
  const tCurrency = await getTranslations("currency");
  const locale = await getLocale();
  const userId = await getAuthenticatedUserIdServer();

  if (!userId) {
    return (
      <main className="min-h-[calc(100vh-5rem)] bg-background px-4 py-8 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-5xl rounded-2xl border border-primary/20 bg-card p-6 text-center shadow-sm dark:border-border dark:shadow-none">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("loginPrompt")}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/login?next=%2Fprofile"
              className="rounded-lg border border-primary/40 bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              {t("login")}
            </Link>
            <Link
              href="/register?next=%2Fprofile"
              className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground"
            >
              {t("register")}
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      image: true,
      role: true,
      zenCoins: true,
      zenShards: true,
      isPro: true,
      proExpiresAt: true,
      externalDonationLink: true,
      requirePasswordForPoints: true,
      requireEmailCodeForPoints: true,
      hideFromRankings: true,
      isProfilePublic: true,
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
    },
  });

  if (!user) {
    return (
      <main className="min-h-[calc(100vh-5rem)] bg-background px-4 py-8 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-5xl rounded-2xl border border-primary/20 bg-card p-6 text-center shadow-sm dark:border-border dark:shadow-none">
          <p className="text-sm text-muted-foreground">{t("invalidSession")}</p>
          <Link
            href="/login?next=%2Fprofile"
            className="mt-4 inline-block text-sm text-primary hover:underline"
          >
            {t("backToLogin")}
          </Link>
        </section>
      </main>
    );
  }

  const progressRows = await prisma.mangaProgress.findMany({
    where: {
      userId,
      manga: {
        OR: [{ reviewStatus: "APPROVED" }, { uploaderId: userId }],
      },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      status: true,
      updatedAt: true,
      lastChapterId: true,
      lastPageNumber: true,
      lastChapter: { select: { number: true } },
      manga: {
        select: {
          slug: true,
          title: true,
          coverImage: true,
          scoreAvg: true,
          _count: { select: { chapters: true } },
        },
      },
    },
  });

  const entries = progressRows.map((row) => ({
    id: row.id,
    status: row.status,
    updatedAt: row.updatedAt.toISOString(),
    lastChapterId: row.lastChapterId,
    lastPageNumber: row.lastPageNumber,
    lastChapterNumber: row.lastChapter?.number ?? null,
    chapterCount: row.manga._count.chapters,
    manga: {
      slug: row.manga.slug,
      title: row.manga.title,
      coverImage: row.manga.coverImage,
      scoreAvg: row.manga.scoreAvg,
    },
  }));

  const displayName = user.name || user.email || t("anonymousName");
  const hasWhitelistBadge = user.badges.some((badge) => badge.name === "Pilar de la Comunidad");
  const [transactions, txCount] = await Promise.all([
    prisma.zenTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        currency: true,
        type: true,
        amount: true,
        balanceAfter: true,
        createdAt: true,
      },
    }),
    prisma.zenTransaction.count({ where: { userId: user.id } }),
  ]);

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-background px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-5xl space-y-6">
        <ProfileAccountCard
          userId={user.id}
          initialUsername={user.username}
          displayName={displayName}
          hasWhitelistBadge={hasWhitelistBadge}
          initialZenCoins={user.zenCoins}
          initialZenShards={user.zenShards}
          initialExternalDonationLink={user.externalDonationLink ?? null}
          isPro={user.isPro}
          proExpiresAt={user.proExpiresAt?.toISOString() ?? null}
          email={user.email}
          role={user.role}
          imageUrl={user.image}
          labels={{
            title: t("title"),
            email: t("email"),
            role: t("role"),
            zenCoins: tCurrency("coinsLabel"),
            zenShards: tCurrency("shardsLabel"),
          }}
        />

        {(user.role === "SCAN" || user.role === "CREATOR" || user.role === "ADMIN") && <DonationLinksEditor />}

        <TransactionHistory
          transactions={transactions.map((tx) => ({
            ...tx,
            createdAt: tx.createdAt.toISOString(),
          }))}
          txCount={txCount}
          locale={locale}
        />

        <ProfileSecurityPanel
          initialRequirePassword={user.requirePasswordForPoints}
          initialRequireEmailCode={user.requireEmailCodeForPoints}
          initialHideFromRankings={user.hideFromRankings}
          initialIsProfilePublic={user.isProfilePublic}
          initialHideZenFromPublic={user.hideZenFromPublic}
          initialHideFavoritesFromPublic={user.hideFavoritesFromPublic}
          initialHideReadingStatsFromPublic={user.hideReadingStatsFromPublic}
        />

        <section className="rounded-2xl border border-primary/20 bg-card p-6 shadow-sm dark:border-border dark:shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">{t("badges")}</h2>
            {user.badges.some((b) => b.isHighlighted) && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-800 dark:text-amber-200">
                ★ {t("badgesHighlightedHint")}
              </span>
            )}
          </div>
          {user.badges.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">{t("noBadges")}</p>
          ) : (
            <>
              {user.badges.some((b) => b.isHighlighted) && (
                <div className="mt-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("badgesHighlighted")}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {user.badges
                      .filter((b) => b.isHighlighted)
                      .map((badge) => (
                        <BadgeIcon
                          key={badge.id}
                          name={badge.name}
                          description={badge.description}
                          iconUrl={badge.iconUrl}
                          iconKey={badge.iconKey}
                          isHighlighted={badge.isHighlighted}
                        />
                      ))}
                  </div>
                </div>
              )}
              {user.badges.some((b) => !b.isHighlighted) && (
                <div className="mt-4">
                  {user.badges.some((b) => b.isHighlighted) && (
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("badgesAll")}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    {user.badges
                      .filter((b) => !b.isHighlighted)
                      .map((badge) => (
                        <BadgeIcon
                          key={badge.id}
                          name={badge.name}
                          description={badge.description}
                          iconUrl={badge.iconUrl}
                          iconKey={badge.iconKey}
                          isHighlighted={badge.isHighlighted}
                        />
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        <ProfileLibrary
          locale={locale}
          entries={entries}
          title={t("libraryTitle")}
          subtitle={t("librarySubtitle")}
          tabs={{
            all: t("tabs.all"),
            inProgress: t("tabs.inProgress"),
            reading: t("tabs.reading"),
            completed: t("tabs.completed"),
            dropped: t("tabs.dropped"),
            planToRead: t("tabs.planToRead"),
          }}
          emptyTabs={{
            all: t("libraryEmptyAll"),
            inProgress: t("libraryEmptyInProgress"),
            reading: t("libraryEmptyReading"),
            completed: t("libraryEmptyCompleted"),
            dropped: t("libraryEmptyDropped"),
            planToRead: t("libraryEmptyPlanToRead"),
          }}
        />
      </section>
    </main>
  );
}
