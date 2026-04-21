import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { getTranslations } from "next-intl/server";
import { Coffee } from "lucide-react";
import { BadgeIcon } from "@/components/profile/BadgeIcon";
import { getPlatform } from "@/lib/donation-platforms";
import { cn } from "@/lib/utils";
import { dateFnsLocaleFromAppLocale } from "@/lib/date-fns-locale";
import type { findUserForPublicProfile } from "@/lib/resolve-profile-user";
import type { loadPublicProfileSupplemental } from "@/lib/load-public-profile-extras";
import { AdSlotShell } from "@/components/AdSlotShell";

type User = NonNullable<Awaited<ReturnType<typeof findUserForPublicProfile>>>;
type Supplemental = Awaited<ReturnType<typeof loadPublicProfileSupplemental>>;

function truncateBody(s: string, max: number) {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function formatChapterNum(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
}

export async function PublicProfileFull({
  locale,
  user,
  supplemental,
  isSelf,
  showZen,
  showFavorites,
  showReadingStats,
  donationLinks,
  showAdSlot = false,
}: {
  locale: string;
  user: User;
  supplemental: Supplemental;
  isSelf: boolean;
  showZen: boolean;
  showFavorites: boolean;
  showReadingStats: boolean;
  donationLinks: { id: string; platform: string; url: string }[];
  /** Slot al pie del perfil (solo visitantes no Pro viendo perfil ajeno). */
  showAdSlot?: boolean;
}) {
  const t = await getTranslations("publicProfile");
  const tDon = await getTranslations("donation");
  const displayName = user.name?.trim() || t("anonymousName");
  const roleShowsBadge = user.role === "SCAN" || user.role === "CREATOR" || user.role === "ADMIN";
  const showDonationLegacy =
    donationLinks.length === 0 &&
    (user.role === "SCAN" || user.role === "CREATOR") &&
    !!user.externalDonationLink;

  const readingKeys = ["READING", "COMPLETED", "DROPPED", "PLAN_TO_READ"] as const;

  return (
    <div className="space-y-8">
      <header className="rounded-2xl border border-primary/20 bg-card p-6 shadow-sm dark:border-border dark:shadow-none">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted">
            {user.image ? (
              <Image src={user.image} alt="" fill className="object-cover" unoptimized />
            ) : (
              <div className="flex h-full items-center justify-center text-2xl font-semibold text-primary">
                {displayName.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{displayName}</h1>
              {roleShowsBadge && (
                <span
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-xs font-medium",
                    user.role === "ADMIN" && "border-violet-500/50 bg-violet-500/15 text-violet-900 dark:text-violet-100",
                    user.role === "SCAN" && "border-sky-500/50 bg-sky-500/15 text-sky-900 dark:text-sky-100",
                    user.role === "CREATOR" && "border-fuchsia-500/50 bg-fuchsia-500/15 text-fuchsia-900 dark:text-fuchsia-100"
                  )}
                >
                  {t(`role.${user.role}`)}
                </span>
              )}
              {user.isPro && (
                <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-900 dark:text-amber-100">
                  {t("proBadge")}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("memberSince", { date: user.createdAt.toLocaleDateString(locale) })}
            </p>
            {donationLinks.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {donationLinks.map((link) => {
                  const platform = getPlatform(link.platform);
                  return (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition hover:opacity-80",
                        platform
                          ? cn(platform.color, platform.textColor)
                          : "border-border bg-muted text-foreground"
                      )}
                    >
                      {platform?.name ?? link.platform}
                    </a>
                  );
                })}
              </div>
            ) : showDonationLegacy ? (
              <a
                href={user.externalDonationLink!}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/12 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-primary/15"
              >
                <Coffee className="h-4 w-4 text-primary" aria-hidden />
                {tDon("supportButton")}
              </a>
            ) : null}
            {isSelf && (
              <Link
                href={`/${locale}/profile`}
                className="mt-4 inline-flex rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-primary/15"
              >
                {t("editPrivateProfile")}
              </Link>
            )}
          </div>
        </div>
      </header>

      {showZen && (
        <section className="rounded-2xl border border-primary/20 bg-card p-6 shadow-sm dark:border-border dark:shadow-none">
          <h2 className="text-lg font-semibold text-foreground">{t("zenTitle")}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("zenCoinsLabel")}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                {user.zenCoins.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-primary/80">
                {t("zenShardsLabel")}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                {user.zenShards.toLocaleString()}
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-primary/20 bg-card p-6 shadow-sm dark:border-border dark:shadow-none">
        <h2 className="text-lg font-semibold text-foreground">{t("badgesTitle")}</h2>
        {user.badges.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("noBadges")}</p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-3">
            {user.badges.map((badge) => (
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
        )}
      </section>

      {showFavorites && (
        <section className="rounded-2xl border border-primary/20 bg-card p-6 shadow-sm dark:border-border dark:shadow-none">
          <h2 className="text-lg font-semibold text-foreground">{t("favoritesTitle")}</h2>
          {supplemental.favorites.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">{t("favoritesEmpty")}</p>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {supplemental.favorites.map((m) => (
                <li key={m.slug}>
                  <Link
                    href={`/${locale}/manga/${m.slug}`}
                    className="flex gap-3 rounded-xl border border-border bg-background/60 p-3 transition hover:border-primary/35 hover:bg-primary/5"
                  >
                    <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                      {m.coverImage ? (
                        <Image src={m.coverImage} alt="" fill className="object-cover" sizes="48px" unoptimized />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] font-medium text-muted-foreground">
                          ?
                        </div>
                      )}
                    </div>
                    <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground line-clamp-3">
                      {m.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {showReadingStats && (
        <>
          <section className="rounded-2xl border border-primary/20 bg-card p-6 shadow-sm dark:border-border dark:shadow-none">
            <h2 className="text-lg font-semibold text-foreground">{t("readingStatusTitle")}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {readingKeys.map((key) => (
                <div
                  key={key}
                  className="rounded-xl border border-border bg-background/60 px-4 py-3 dark:bg-card/60"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t(`readingStatus.${key}`)}
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                    {supplemental.countsByStatus[key] ?? 0}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-primary/20 bg-card p-6 shadow-sm dark:border-border dark:shadow-none">
            <h2 className="text-lg font-semibold text-foreground">{t("readingStatsTitle")}</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4 rounded-lg border border-border/80 bg-background/50 px-4 py-3 dark:bg-card/40">
                <dt className="text-muted-foreground">{t("totalMangaProgress")}</dt>
                <dd className="font-semibold tabular-nums text-foreground">{supplemental.totalWithProgress}</dd>
              </div>
              {supplemental.mostRead ? (
                <div className="flex flex-col gap-2 rounded-lg border border-border/80 bg-background/50 px-4 py-3 dark:bg-card/40 sm:flex-row sm:items-center sm:justify-between">
                  <dt className="text-muted-foreground">{t("mostReadManga")}</dt>
                  <dd>
                    <Link
                      href={`/${locale}/manga/${supplemental.mostRead.slug}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {supplemental.mostRead.title}
                    </Link>
                    {supplemental.mostRead.lastChapterNumber > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({t("upToChapter", { n: formatChapterNum(supplemental.mostRead.lastChapterNumber) })})
                      </span>
                    )}
                  </dd>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("noProgressYet")}</p>
              )}
            </dl>
          </section>
        </>
      )}

      <section className="rounded-2xl border border-primary/20 bg-card p-6 shadow-sm dark:border-border dark:shadow-none">
        <h2 className="text-lg font-semibold text-foreground">{t("commentsTitle")}</h2>
        {supplemental.topComments.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("commentsEmpty")}</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {supplemental.topComments.map((c) => (
              <li key={c.id} className="rounded-xl border border-border bg-background/50 p-4 dark:bg-card/40">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Link href={`/${locale}/manga/${c.mangaSlug}`} className="font-medium text-primary hover:underline">
                    {c.mangaTitle}
                  </Link>
                  <span>·</span>
                  <Link
                    href={`/${locale}/read/${c.chapterId}`}
                    className="text-foreground/90 hover:text-primary hover:underline"
                  >
                    {t("chapterShort", { n: formatChapterNum(c.chapterNumber) })}
                  </Link>
                  <span>·</span>
                  <time dateTime={c.createdAt}>
                    {formatDistanceToNow(new Date(c.createdAt), {
                      addSuffix: true,
                      locale: dateFnsLocaleFromAppLocale(locale),
                    })}
                  </time>
                  {c.netScore !== 0 && (
                    <span className="rounded bg-muted px-1.5 py-0.5 tabular-nums text-foreground">
                      {c.netScore > 0 ? "+" : ""}
                      {c.netScore}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-foreground">{truncateBody(c.body, 320)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {supplemental.uploadsSummary && (
        <section className="rounded-2xl border border-primary/20 bg-card p-6 shadow-sm dark:border-border dark:shadow-none">
          <h2 className="text-lg font-semibold text-foreground">{t("uploadsTitle")}</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border/80 bg-background/50 px-4 py-3 dark:bg-card/40">
              <dt className="text-xs text-muted-foreground">{t("uploadsTotalChapters")}</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">{supplemental.uploadsSummary.totalChapters}</dd>
            </div>
            <div className="rounded-lg border border-border/80 bg-background/50 px-4 py-3 dark:bg-card/40">
              <dt className="text-xs text-muted-foreground">{t("uploadsApproved")}</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">{supplemental.uploadsSummary.approvedChapters}</dd>
            </div>
            <div className="rounded-lg border border-border/80 bg-background/50 px-4 py-3 dark:bg-card/40">
              <dt className="text-xs text-muted-foreground">{t("uploadsMangas")}</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">{supplemental.uploadsSummary.distinctMangas}</dd>
            </div>
          </dl>
        </section>
      )}

      {showAdSlot ? (
        <div className="pt-2">
          <AdSlotShell slotId="profile-public-bottom" height="h-20" />
        </div>
      ) : null}
    </div>
  );
}

export async function PublicProfileGuestTeaser({
  locale,
  displayName,
  imageUrl,
  returnPath,
}: {
  locale: string;
  displayName: string;
  imageUrl: string | null;
  returnPath: string;
}) {
  const t = await getTranslations("publicProfile");
  const next = encodeURIComponent(returnPath);
  return (
    <section className="mx-auto max-w-lg rounded-2xl border border-primary/20 bg-card p-8 text-center shadow-sm dark:border-border dark:shadow-none">
      <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-2xl border border-border bg-muted">
        {imageUrl ? (
          <Image src={imageUrl} alt="" fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center text-2xl font-semibold text-primary">
            {displayName.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
      <h1 className="mt-4 text-xl font-semibold text-foreground">{displayName}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("guestCtaBody")}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href={`/${locale}/login?next=${next}`}
          className="rounded-lg border border-primary/40 bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {t("guestLogin")}
        </Link>
        <Link
          href={`/${locale}/register?next=${next}`}
          className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground"
        >
          {t("guestRegister")}
        </Link>
      </div>
    </section>
  );
}

export async function PublicProfilePrivateMessage({
  displayName,
  imageUrl,
}: {
  displayName: string;
  imageUrl: string | null;
}) {
  const t = await getTranslations("publicProfile");
  return (
    <section className="mx-auto max-w-lg rounded-2xl border border-primary/20 bg-card p-8 text-center shadow-sm dark:border-border dark:shadow-none">
      <div className="mx-auto relative h-24 w-24 overflow-hidden rounded-2xl border border-border bg-muted">
        {imageUrl ? (
          <Image src={imageUrl} alt="" fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center text-2xl font-semibold text-primary">
            {displayName.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
      <h1 className="mt-4 text-xl font-semibold text-foreground">{displayName}</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t("privateBody")}</p>
    </section>
  );
}
