"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Coins, Crown, ExternalLink, Gem, Mail, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { ProfileAdblockBanner } from "@/components/profile/ProfileAdblockBanner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { USERNAME_PATTERN } from "@/lib/validation/username-profile";

type ProfileAccountCardProps = {
  userId: string;
  initialUsername: string | null;
  displayName: string;
  hasWhitelistBadge: boolean;
  initialZenCoins: number;
  initialZenShards: number;
  /** Ignorado en UI; los links se gestionan con DonationLinksEditor. */
  initialExternalDonationLink?: string | null;
  isPro: boolean;
  proExpiresAt: string | null;
  email: string | null;
  role: string;
  imageUrl: string | null;
  labels: {
    title: string;
    email: string;
    role: string;
    zenCoins: string;
    zenShards: string;
  };
};

export function ProfileAccountCard({
  userId,
  initialUsername,
  displayName,
  hasWhitelistBadge,
  initialZenCoins,
  initialZenShards,
  isPro,
  proExpiresAt,
  email,
  role,
  imageUrl,
  labels,
}: ProfileAccountCardProps) {
  const t = useTranslations("profile");
  const locale = useLocale();
  const router = useRouter();
  const [zenCoins, setZenCoins] = useState(initialZenCoins);
  const [zenShards, setZenShards] = useState(initialZenShards);
  const [username, setUsername] = useState(initialUsername);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialUsername ?? "");
  const [busy, setBusy] = useState(false);
  const [previewHost, setPreviewHost] = useState("mangazen.com");

  useEffect(() => {
    setUsername(initialUsername);
    if (!editing) {
      setDraft(initialUsername ?? "");
    }
  }, [initialUsername, editing]);

  useEffect(() => {
    setZenCoins(initialZenCoins);
    setZenShards(initialZenShards);
  }, [initialZenCoins, initialZenShards]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPreviewHost(window.location.host || "mangazen.com");
    }
  }, []);

  const previewSlug =
    draft.trim().length >= 3 && USERNAME_PATTERN.test(draft.trim())
      ? draft.trim().toLowerCase()
      : userId;

  const previewPath = `/${locale}/user/${encodeURIComponent(previewSlug)}`;
  const normalizedDraft = draft.trim().toLowerCase();
  const canSave =
    draft.trim().length >= 3 &&
    USERNAME_PATTERN.test(draft.trim()) &&
    normalizedDraft !== (username ?? "").toLowerCase();

  const startEdit = useCallback(() => {
    setDraft(username ?? "");
    setEditing(true);
  }, [username]);

  const cancelEdit = useCallback(() => {
    setDraft(username ?? "");
    setEditing(false);
  }, [username]);

  const save = useCallback(async () => {
    const trimmed = draft.trim();
    if (!USERNAME_PATTERN.test(trimmed)) {
      toast.error(t("usernameError.USERNAME_INVALID"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed }),
      });
      const data = (await res.json()) as { error?: string; user?: { username: string | null } };
      if (!res.ok) {
        const code = data.error ?? "GENERIC";
        if (code === "USERNAME_TAKEN") toast.error(t("usernameError.USERNAME_TAKEN"));
        else if (code === "USERNAME_INVALID") toast.error(t("usernameError.USERNAME_INVALID"));
        else toast.error(t("usernameError.GENERIC"));
        return;
      }
      if (data.user?.username != null) {
        setUsername(data.user.username);
      }
      toast.success(t("usernameSaved"));
      setEditing(false);
      router.refresh();
    } catch {
      toast.error(t("usernameError.GENERIC"));
    } finally {
      setBusy(false);
    }
  }, [draft, router, t]);

  return (
    <div className="rounded-2xl border border-primary/20 bg-card p-6 shadow-sm dark:border-border dark:shadow-none">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-border bg-background">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-lg font-semibold text-muted-foreground">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{labels.title}</h1>
          <p className="text-base text-foreground">{displayName}</p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-border bg-background/60 p-4 dark:bg-card/40">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("usernameLabel")}</p>
          {!editing && (
            <button
              type="button"
              onClick={startEdit}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground transition hover:border-primary/40 hover:bg-primary/5"
              aria-label={t("usernameEdit")}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              {t("usernameEdit")}
            </button>
          )}
        </div>

        {!username && !editing && (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t("usernameInvite")}</p>
        )}

        {!editing ? (
          <p className="mt-2 font-mono text-sm text-foreground">{username ?? "—"}</p>
        ) : (
          <div className="mt-3 space-y-3">
            <div>
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value.replace(/\s/g, ""))}
                maxLength={20}
                autoComplete="username"
                placeholder={t("usernamePlaceholder")}
                className="w-full max-w-md rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t("usernameCharCount", { count: draft.length })}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t("usernameHint")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={busy || !canSave} onClick={() => void save()}>
                {t("usernameSave")}
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={cancelEdit}>
                <X className="mr-1 h-3.5 w-3.5" aria-hidden />
                {t("usernameCancel")}
              </Button>
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center gap-1.5">
          <span className="shrink-0 text-xs text-muted-foreground">
            {t("usernamePreviewLabel")}
          </span>
          <a
            href={`https://${previewHost}${previewPath}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-w-0 items-center gap-1 truncate rounded-md border border-border/60 bg-background px-2 py-0.5 font-mono text-xs text-primary transition hover:border-primary/40 hover:bg-primary/5"
          >
            <span className="truncate">
              {previewHost}
              {previewPath}
            </span>
            <ExternalLink className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
          </a>
        </div>
      </div>

      <ProfileAdblockBanner
        hasWhitelistBadge={hasWhitelistBadge}
        displayName={displayName}
        onZenBalanceUpdate={setZenShards}
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <div className="rounded-xl border border-border bg-background p-3">
          <p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
            {labels.email}
          </p>
          <p className="truncate text-sm text-foreground">{email ?? "-"}</p>
        </div>

        <div className="rounded-xl border border-border bg-background p-3">
          <p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Crown className="h-3.5 w-3.5" />
            {labels.role}
          </p>
          <p className="text-sm font-medium text-foreground">{role}</p>
        </div>

        <div
          className={cn(
            "rounded-xl border p-3",
            isPro ? "border-amber-500/40 bg-amber-500/10" : "border-border bg-background"
          )}
        >
          <p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Crown className="h-3.5 w-3.5 text-amber-500" />
            {t("proStatus")}
          </p>
          {isPro ? (
            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                {t("proActive")}
              </p>
              {proExpiresAt && (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {t("proExpires", {
                    date: new Date(proExpiresAt).toLocaleDateString(locale.replace("_", "-")),
                  })}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("proInactive")}</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-background p-3">
          <div className="mb-1 flex items-center justify-between gap-1">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Coins className="h-3.5 w-3.5 text-yellow-500" />
              {labels.zenCoins}
            </p>
            <Link
              href={`/${locale}/billing`}
              className="inline-flex items-center gap-0.5 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary transition hover:bg-primary/20"
            >
              + {t("buyMore")}
            </Link>
          </div>
          <p className="text-xl font-semibold text-foreground">
            {zenCoins.toLocaleString(locale.replace("_", "-"))}
          </p>
        </div>

        <div className="rounded-xl border border-primary/45 bg-primary/15 p-3">
          <p className="mb-1 flex items-center gap-1 text-xs text-primary">
            <Gem className="h-3.5 w-3.5" />
            {labels.zenShards}
          </p>
          <p className="text-xl font-semibold text-foreground">
            {zenShards.toLocaleString(locale.replace("_", "-"))}
          </p>
        </div>
      </div>
    </div>
  );
}
