import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AdminAnnouncementsPanel } from "@/components/admin/AdminAnnouncementsPanel";
import { AdminBadgeCatalogPanel } from "@/components/admin/AdminBadgeCatalogPanel";
import { AdminGlobalBannerPanel } from "@/components/admin/AdminGlobalBannerPanel";
import AdminPanelShell from "@/components/admin/AdminPanelShell";
import { AdminChaptersEarlyAccessPanel } from "@/components/admin/AdminChaptersEarlyAccessPanel";
import { AdminCreatorRequestsPanel } from "@/components/admin/AdminCreatorRequestsPanel";
import { AdminFeedbackPanel } from "@/components/admin/AdminFeedbackPanel";
import { AdminMangaRequestsPanel } from "@/components/admin/AdminMangaRequestsPanel";
import { AdminAdsPanel } from "@/components/admin/AdminAdsPanel";
import { AdminModerationPanel } from "@/components/admin/AdminModerationPanel";
import { AdminPendingChaptersPanel } from "@/components/admin/AdminPendingChaptersPanel";
import { AdminScanStatsTab } from "@/components/admin/AdminScanStatsTab";
import { AdminPendingMangasPanel } from "@/components/admin/AdminPendingMangasPanel";
import { getAuthenticatedUserIdServer } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

type AdminPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
};

export default async function AdminPage({ params, searchParams }: AdminPageProps) {
  const { locale } = await params;
  const sp = await searchParams;
  const tabParam = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const userId = await getAuthenticatedUserIdServer();

  if (!userId) {
    redirect(`/${locale}`);
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!currentUser || currentUser.role !== "ADMIN") {
    redirect(`/${locale}`);
  }

  const tAdmin = await getTranslations("admin");

  const [
    users,
    badges,
    zenCoinsAggregate,
    zenShardsAggregate,
    pilarUsersCount,
    recentRegisteredUsers,
    recentPilarUsers,
    pendingCreatorRequests,
    pendingMangasReview,
    pendingChapterUploads,
    feedbackList,
    pendingMangaRequests,
  ] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        image: true,
        role: true,
        acceptedScanTermsAt: true,
        zenCoins: true,
        zenShards: true,
        createdAt: true,
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
    }),
    prisma.badge.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        iconUrl: true,
        iconKey: true,
        isHighlighted: true,
        triggerType: true,
        triggerThreshold: true,
      },
    }),
    prisma.user.aggregate({
      _sum: {
        zenCoins: true,
      },
    }),
    prisma.user.aggregate({
      _sum: {
        zenShards: true,
      },
    }),
    prisma.user.count({
      where: {
        badges: {
          some: {
            name: "Pilar de la Comunidad",
          },
        },
      },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        name: true,
        email: true,
        createdAt: true,
      },
    }),
    prisma.user.findMany({
      where: {
        badges: {
          some: {
            name: "Pilar de la Comunidad",
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        name: true,
        email: true,
        updatedAt: true,
      },
    }),
    prisma.creatorRoleRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        createdAt: true,
        projectName: true,
        description: true,
        sampleLink: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.manga.findMany({
      where: { reviewStatus: "PENDING_REVIEW" },
      orderBy: { createdAt: "asc" },
      select: {
        slug: true,
        title: true,
        coverImage: true,
        isFeatured: true,
        reviewStatus: true,
        createdAt: true,
        uploader: { select: { name: true, email: true } },
      },
    }),
    prisma.chapterUpload.findMany({
      where: { status: "PENDING" },
      orderBy: { submittedAt: "asc" },
      include: {
        chapter: {
          select: {
            id: true,
            number: true,
            title: true,
            locale: true,
            language: true,
            manga: { select: { title: true, slug: true, coverImage: true } },
          },
        },
        uploader: { select: { name: true, email: true, role: true } },
      },
    }),
    prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        votes: { select: { value: true } },
      },
    }),
    prisma.mangaRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { name: true, email: true } },
      },
    }),
  ]);

  const pendingScanChaptersCount = pendingChapterUploads.filter(
    (u) => u.uploader.role === "SCAN" || u.uploader.role === "CREATOR"
  ).length;

  const adminMangaRequestRows = pendingMangaRequests.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    title: r.title,
    author: r.author,
    notes: r.notes,
    requesterLabel: r.user.name || r.user.email || "—",
    requesterEmail: r.user.email,
  }));

  const adminFeedbackRows = feedbackList.map((f) => {
    let up = 0;
    let down = 0;
    for (const v of f.votes) {
      if (v.value === 1) up += 1;
      else if (v.value === -1) down += 1;
    }
    return {
      id: f.id,
      title: f.title,
      body: f.body,
      category: f.category,
      status: f.status,
      createdAt: f.createdAt.toISOString(),
      authorLabel: f.user.name || f.user.email || "—",
      netScore: up - down,
    };
  });

  const radarEvents = [
    ...recentRegisteredUsers.map((user) => ({
      id: `register-${user.email ?? user.name ?? "usuario"}-${user.createdAt.toISOString()}`,
      message: tAdmin("radar.userRegistered", {
        name: user.name ?? user.email ?? tAdmin("radar.unknownUser"),
      }),
      createdAt: user.createdAt.toISOString(),
    })),
    ...recentPilarUsers.map((user) => ({
      id: `pilar-${user.email ?? user.name ?? "usuario"}-${user.updatedAt.toISOString()}`,
      message: tAdmin("radar.userGainedPilar", {
        name: user.name ?? user.email ?? tAdmin("radar.unknownUser"),
      }),
      createdAt: user.updatedAt.toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const chaptersEa = await prisma.chapter.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      number: true,
      status: true,
      isEarlyAccess: true,
      earlyAccessUntil: true,
      earlyAccessPrice: true,
      manga: { select: { title: true } },
    },
  });

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-background px-4 py-8 sm:px-6 lg:px-8 transition-colors duration-200">
      <section className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-xl border border-primary/20 bg-card p-5 shadow-sm dark:border-border dark:shadow-none">
          <h1 className="text-2xl font-semibold text-foreground">{tAdmin("header.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{tAdmin("header.subtitle")}</p>
        </header>

        <AdminPanelShell
          initialTab={tabParam ?? null}
          users={users}
          badges={badges}
          radarEvents={radarEvents}
          stats={{
            totalUsers: users.length,
            usersWithPilar: pilarUsersCount,
            totalZenCoins: zenCoinsAggregate._sum.zenCoins ?? 0,
            totalZenShards: zenShardsAggregate._sum.zenShards ?? 0,
          }}
          pendingContentReviewCount={
            pendingMangasReview.length + pendingChapterUploads.length
          }
          pendingScanChaptersCount={pendingScanChaptersCount}
          pendingCreatorCount={pendingCreatorRequests.length}
          tabScans={<AdminScanStatsTab />}
          tabContenido={
            <>
              <AdminPendingMangasPanel
                initialRows={pendingMangasReview.map((m) => ({
                  slug: m.slug,
                  title: m.title,
                  coverImage: m.coverImage,
                  isFeatured: m.isFeatured,
                  reviewStatus: m.reviewStatus,
                  createdAt: m.createdAt.toISOString(),
                  uploaderLabel: m.uploader.name || m.uploader.email || "—",
                }))}
              />
              <AdminPendingChaptersPanel
                initialRows={pendingChapterUploads.map((u) => ({
                  uploadId: u.id,
                  chapterId: u.chapter.id,
                  chapterNumber: u.chapter.number,
                  chapterTitle: u.chapter.title,
                  chapterLocale: u.chapter.locale,
                  chapterLanguage: u.chapter.language,
                  mangaTitle: u.chapter.manga.title,
                  mangaSlug: u.chapter.manga.slug,
                  coverImage: u.chapter.manga.coverImage,
                  submittedAt: u.submittedAt.toISOString(),
                  uploaderLabel: u.uploader.name || u.uploader.email || "—",
                }))}
              />
              <AdminChaptersEarlyAccessPanel
                initialChapters={chaptersEa.map((c) => ({
                  id: c.id,
                  number: c.number,
                  status: c.status,
                  mangaTitle: c.manga.title,
                  isEarlyAccess: c.isEarlyAccess,
                  earlyAccessUntil: c.earlyAccessUntil?.toISOString() ?? null,
                  earlyAccessPrice: c.earlyAccessPrice,
                }))}
              />
            </>
          }
          tabComunidad={
            <>
              <AdminCreatorRequestsPanel
                initialRequests={pendingCreatorRequests.map((r) => ({
                  ...r,
                  createdAt: r.createdAt.toISOString(),
                }))}
              />
              <AdminMangaRequestsPanel initialRows={adminMangaRequestRows} />
              <AdminFeedbackPanel initialRows={adminFeedbackRows} />
            </>
          }
          tabInsignias={<AdminBadgeCatalogPanel initialBadges={badges} />}
          tabNovedades={<AdminAnnouncementsPanel />}
          tabMensajes={<AdminGlobalBannerPanel />}
          tabModeracion={<AdminModerationPanel />}
          tabPublicidad={<AdminAdsPanel />}
        />
      </section>
    </main>
  );
}
