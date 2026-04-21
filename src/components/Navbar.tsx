import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Coins, Gem } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import UserMenu from "@/components/UserMenu";
import NavbarSearch from "@/components/NavbarSearch";
import { NavbarNotifications } from "@/components/NavbarNotifications";
import { getAuthenticatedUserIdServer } from "@/lib/auth-session";
import { canAccessScanPanel } from "@/lib/roles";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import { MobileNav } from "@/components/MobileNav";
import { AdultContentButton } from "@/components/AdultContentButton";

export default async function Navbar() {
  const tCat = await getTranslations("catalog");
  const userId = await getAuthenticatedUserIdServer();
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, image: true, email: true, role: true, zenCoins: true, zenShards: true },
      })
    : null;

  const [pendingMangaReviewCount, pendingChapterUploadCount, unreadNotificationsCount] = userId
    ? await Promise.all([
        user?.role === "ADMIN"
          ? prisma.manga.count({ where: { reviewStatus: "PENDING_REVIEW" } })
          : Promise.resolve(0),
        user?.role === "ADMIN"
          ? prisma.chapterUpload.count({ where: { status: "PENDING" } })
          : Promise.resolve(0),
        prisma.notification.count({ where: { userId, read: false } }),
      ])
    : [0, 0, 0];

  const adminReviewQueueCount = pendingMangaReviewCount + pendingChapterUploadCount;
  const displayName = user?.name || user?.email || tCat("defaultUserName");

  return (
    <>
      <nav className="fixed top-0 z-50 w-full border-b border-border bg-card/85 backdrop-blur-md touch-manipulation">
        <div className="container mx-auto flex h-14 items-center justify-between gap-2 px-3 sm:h-16 sm:gap-4 sm:px-4">
          {/* Logo + links desktop */}
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold tracking-tighter text-foreground sm:text-2xl">
              MANGA<span className="text-primary">ZEN</span>
            </Link>
            <div className="hidden gap-6 text-sm font-medium text-muted-foreground md:flex">
              <Link href="/library" className="transition-colors hover:text-primary">
                {tCat("browseLibrary")}
              </Link>
              <Link href="/news" className="transition-colors hover:text-primary">
                {tCat("navUpdates")}
              </Link>
              <Link href="/community" className="transition-colors hover:text-primary">
                {tCat("navCommunity")}
              </Link>
            </div>
          </div>

          {/* Buscador desktop */}
          <div className="hidden flex-1 justify-center lg:flex">
            <NavbarSearch />
          </div>

          {/* Acciones derecha */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="touch-manipulation">
              <LanguageSwitcher />
            </div>
            <div className="touch-manipulation">
              <ThemeToggle />
            </div>
            <AdultContentButton />

            {user ? (
              <div className="flex items-center gap-1.5">
                <div className="hidden items-center gap-1.5 text-xs md:flex">
                  <Link
                    href="/billing"
                    className="group inline-flex items-center gap-1.5 rounded-full border border-yellow-500/40 bg-yellow-500/10 px-2.5 py-1 text-yellow-700 transition-colors hover:border-yellow-500/70 hover:bg-yellow-500/20 dark:text-yellow-300"
                  >
                    <Coins className="h-3.5 w-3.5" />
                    <span className="tabular-nums font-medium">{user.zenCoins.toLocaleString()}</span>
                    <span className="text-yellow-600/60 transition-colors group-hover:text-yellow-600 dark:text-yellow-400/60 dark:group-hover:text-yellow-300">+</span>
                  </Link>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-primary">
                    <Gem className="h-3.5 w-3.5" />
                    <span className="tabular-nums font-medium">{user.zenShards.toLocaleString()}</span>
                  </span>
                </div>
                <NavbarNotifications initialUnread={unreadNotificationsCount} />
                <UserMenu
                  displayName={displayName}
                  image={user.image}
                  isAdmin={user.role === "ADMIN"}
                  showScanPanel={canAccessScanPanel(user.role)}
                  adminReviewQueueCount={adminReviewQueueCount}
                />
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    {tCat("navLogin")}
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="bg-primary text-primary-foreground hover:opacity-90">
                    {tCat("navRegister")}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Barra de navegación inferior — solo mobile */}
      <MobileNav isAuthenticated={!!user} />
    </>
  );
}
