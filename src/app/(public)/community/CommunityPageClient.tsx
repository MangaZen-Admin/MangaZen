"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { UserRole } from "@prisma/client";
import { CommunityFeedbackBoard } from "@/components/community/CommunityFeedbackBoard";
import { CommunityMangaRequestPanel } from "@/components/community/CommunityMangaRequestPanel";
import { CommunityRankings } from "@/components/community/CommunityRankings";
import { LiveOnlineCounter } from "@/components/LiveOnlineCounter";
import { AdSlot } from "@/components/AdSlot";

type Props = {
  isLoggedIn: boolean;
  userRole: UserRole | null;
  hasPendingRequest: boolean;
  showAds: boolean;
};

export default function CommunityPageClient({
  isLoggedIn,
  userRole,
  hasPendingRequest,
  showAds,
}: Props) {
  const t = useTranslations("community");
  const tc = useTranslations("community.creatorRequest");
  const locale = useLocale();
  const [localPendingRequest, setLocalPendingRequest] = useState(hasPendingRequest);
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [sampleLink, setSampleLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isUser = isLoggedIn && userRole === "USER";
  const isCreator = isLoggedIn && userRole === "CREATOR";
  const isStaff = isLoggedIn && (userRole === "SCAN" || userRole === "ADMIN");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isUser || localPendingRequest || done) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/community/creator-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName,
          description,
          sampleLink: sampleLink.trim() || undefined,
        }),
      });
      if (res.status === 409) {
        setError(tc("errorPending"));
        return;
      }
      if (res.status === 403) {
        setError(tc("errorForbidden"));
        return;
      }
      if (!res.ok) {
        setError(tc("errorGeneric"));
        return;
      }
      setDone(true);
      setLocalPendingRequest(true);
      setProjectName("");
      setDescription("");
      setSampleLink("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto min-h-[calc(100vh-5rem)] w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Bloque 1 — Hero */}
      <header className="w-full border-b border-border/70 pb-10">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">{t("subtitle")}</p>

        <div
          className="mt-8 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] to-transparent px-5 py-5 dark:border-primary/25 dark:from-primary/[0.12] [&_p>span:first-child]:!h-4 [&_p>span:first-child]:!w-4 [&_p>span:first-child>span:last-child]:!h-3.5 [&_p>span:first-child>span:last-child]:!w-3.5 [&_p]:!gap-3 [&_p]:!text-lg [&_p]:!font-semibold [&_p]:!leading-snug [&_p]:!text-foreground sm:[&_p]:!gap-4 sm:[&_p]:!text-xl md:[&_p]:!text-2xl"
          aria-live="polite"
        >
          <LiveOnlineCounter />
        </div>
      </header>

      {/* Comunidad — jerarquía: Discusiones + Peticiones (main), Rankings + Creator tools (side) */}
      <div className="mt-10 grid grid-cols-1 gap-10 md:mt-12 md:grid-cols-3 md:gap-8 lg:gap-10">
        <div className="min-w-0 space-y-10 md:col-span-2 [&>section]:!mt-0">
          <CommunityFeedbackBoard isLoggedIn={isLoggedIn} />
          {showAds ? <AdSlot slotId="community-between-sections" height="h-20" /> : null}
          <CommunityMangaRequestPanel isLoggedIn={isLoggedIn} />
        </div>

        <aside className="min-w-0 space-y-10 md:col-span-1 [&>section]:!mt-0">
          <CommunityRankings />
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">{tc("title")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{tc("body")}</p>

            {!isLoggedIn && (
              <p className="mt-4 text-sm text-muted-foreground">
                <Link
                  href={`/${locale}/login?next=/${locale}/community`}
                  className="font-medium text-primary underline"
                >
                  {tc("loginCta")}
                </Link>
              </p>
            )}

            {isStaff && <p className="mt-4 text-sm text-muted-foreground">{tc("staffSkip")}</p>}

            {isCreator && (
              <p className="mt-4 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-sm text-foreground">
                {tc("alreadyCreator")}
              </p>
            )}

            {isUser && localPendingRequest && (
              <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-foreground">
                {tc("pendingMessage")}
              </p>
            )}

            {isUser && !localPendingRequest && done && (
              <p className="mt-4 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground">
                {tc("successMessage")}
              </p>
            )}

            {isUser && !localPendingRequest && !done && (
              <form onSubmit={onSubmit} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="cr-project" className="block text-xs font-medium text-muted-foreground">
                    {tc("fieldProject")}
                  </label>
                  <input
                    id="cr-project"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    required
                    minLength={2}
                    maxLength={200}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                  />
                </div>
                <div>
                  <label htmlFor="cr-desc" className="block text-xs font-medium text-muted-foreground">
                    {tc("fieldDescription")}
                  </label>
                  <textarea
                    id="cr-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    minLength={10}
                    rows={4}
                    className="mt-1 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                  />
                </div>
                <div>
                  <label htmlFor="cr-link" className="block text-xs font-medium text-muted-foreground">
                    {tc("fieldLink")}
                  </label>
                  <input
                    id="cr-link"
                    type="url"
                    value={sampleLink}
                    onChange={(e) => setSampleLink(e.target.value)}
                    placeholder="https://"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                >
                  {tc("submit")}
                </button>
              </form>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
