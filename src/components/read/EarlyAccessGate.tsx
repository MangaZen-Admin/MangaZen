"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { notifyBadgesEarned } from "@/components/badges/notify-badges-earned";
import { Button } from "@/components/ui/button";
import { SHARDS_TO_COINS_RATE } from "@/lib/zen-currency";

type Props = {
  locale: string;
  chapterId: string;
  mangaSlug: string;
  mangaTitle: string;
  coverImage: string | null;
  chapterNumber: number;
  chapterTitle: string | null;
  earlyAccessUntilIso: string;
  priceCoins: number;
  isCreatorEarlyAccess: boolean;
  isLoggedIn: boolean;
  zenCoins: number;
  zenShards: number;
};

function useRemaining(iso: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return useMemo(() => {
    const end = new Date(iso).getTime();
    const ms = Math.max(0, end - now);
    const totalMin = Math.floor(ms / 60_000);
    const days = Math.floor(totalMin / (60 * 24));
    const hours = Math.floor((totalMin % (60 * 24)) / 60);
    const minutes = totalMin % 60;
    return { days, hours, minutes, expired: ms <= 0 };
  }, [iso, now]);
}

export function EarlyAccessGate({
  locale,
  chapterId,
  mangaSlug,
  mangaTitle,
  coverImage,
  chapterNumber,
  chapterTitle,
  earlyAccessUntilIso,
  priceCoins,
  isCreatorEarlyAccess,
  isLoggedIn,
  zenCoins,
  zenShards,
}: Props) {
  const t = useTranslations("earlyAccess");
  const tCurrency = useTranslations("currency");
  const tBadges = useTranslations("badges");
  const router = useRouter();
  const remaining = useRemaining(earlyAccessUntilIso);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reauthPassword, setReauthPassword] = useState("");
  const [needPassword, setNeedPassword] = useState(false);
  const [currency, setCurrency] = useState<"coins" | "shards">("coins");
  const priceShards = priceCoins * SHARDS_TO_COINS_RATE;
  const canUseShards = !isCreatorEarlyAccess;

  const chapterLabel = useMemo(() => {
    const n = Number.isInteger(chapterNumber)
      ? String(chapterNumber)
      : chapterNumber.toFixed(1).replace(/\.0$/, "");
    return chapterTitle ? `${n} — ${chapterTitle}` : n;
  }, [chapterNumber, chapterTitle]);

  const onUnlock = useCallback(async () => {
    if (!isLoggedIn) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/chapters/${encodeURIComponent(chapterId)}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reauth_password: reauthPassword.trim() || undefined,
          currency,
        }),
      });
      const data = (await res.json()) as Record<string, unknown>;

      if (res.status === 403 && data.error === "REAUTH_REQUIRED") {
        setNeedPassword(true);
        setError(t("reauthHint"));
        return;
      }

      if (!res.ok) {
        const code = typeof data.error === "string" ? data.error : "GENERIC";
        if (code === "INSUFFICIENT_COINS") {
          setError(tCurrency("insufficientCoins"));
        } else if (code === "INSUFFICIENT_SHARDS") {
          setError(tCurrency("insufficientShards"));
        } else if (code === "SHARDS_NOT_ALLOWED_FOR_CREATOR") {
          setError(tCurrency("shardsNotAllowedCreatorEa"));
        } else if (code === "ALREADY_UNLOCKED") {
          router.refresh();
          return;
        } else {
          setError(t("unlockError"));
        }
        return;
      }

      const rawEarned = data.badgesEarned;
      if (Array.isArray(rawEarned)) {
        notifyBadgesEarned(
          rawEarned.filter(
            (x): x is { name: string; description: string } =>
              x != null &&
              typeof x === "object" &&
              typeof (x as { name?: unknown }).name === "string" &&
              typeof (x as { description?: unknown }).description === "string",
          ),
          tBadges,
        );
      }

      router.refresh();
    } catch {
      setError(t("unlockError"));
    } finally {
      setBusy(false);
    }
  }, [chapterId, currency, isLoggedIn, reauthPassword, router, t, tBadges, tCurrency]);

  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-lg flex-col items-center px-4 py-10 sm:px-6">
      <div className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="relative aspect-[21/9] w-full bg-muted">
          {coverImage ? (
            <Image
              src={coverImage}
              alt=""
              fill
              className="object-cover object-top opacity-90"
              sizes="(max-width: 640px) 100vw, 512px"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              MangaZen
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
        </div>

        <div className="space-y-4 px-5 pb-6 pt-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/30">
              <Lock className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("kicker")}
              </p>
              <h1 className="text-lg font-semibold leading-tight text-foreground">{mangaTitle}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("chapterLabel", { label: chapterLabel })}
              </p>
            </div>
          </div>

          {remaining.expired ? (
            <p className="text-sm text-muted-foreground">{t("opening")}</p>
          ) : (
            <p className="text-sm text-foreground">
              {t("countdown", {
                days: remaining.days,
                hours: remaining.hours,
                minutes: remaining.minutes,
              })}
            </p>
          )}

          {isLoggedIn ? (
            <div className="rounded-xl border border-border bg-background/60 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                {tCurrency("balanceCoins", { amount: zenCoins.toLocaleString() })}
              </p>
              <p className="text-sm text-muted-foreground">
                {tCurrency("balanceShards", { amount: zenShards.toLocaleString() })}
              </p>
              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  onClick={() => setCurrency("coins")}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                    currency === "coins"
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  {tCurrency("payWithCoins", { amount: priceCoins.toLocaleString() })}
                </button>
                {canUseShards && (
                  <button
                    type="button"
                    onClick={() => setCurrency("shards")}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                      currency === "shards"
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {tCurrency("payWithShards", { amount: priceShards.toLocaleString() })}
                  </button>
                )}
              </div>
              {needPassword && (
                <label className="mt-3 block text-xs font-medium text-muted-foreground">
                  {t("passwordLabel")}
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={reauthPassword}
                    onChange={(e) => setReauthPassword(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                  />
                </label>
              )}
              <Button
                type="button"
                className="mt-3 w-full"
                disabled={busy || remaining.expired}
                onClick={() => void onUnlock()}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("unlocking")}
                  </>
                ) : (
                  t("unlockCta", {
                    price:
                      currency === "coins"
                        ? `${priceCoins.toLocaleString()} ZC`
                        : `${priceShards.toLocaleString()} ZS`,
                  })
                )}
              </Button>
              {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("loginPrompt")}</p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <Link href={`/${locale}/manga/${mangaSlug}`}>{t("backToManga")}</Link>
            </Button>
            {!isLoggedIn && (
              <>
                <Button variant="outline" asChild className="w-full sm:w-auto">
                  <Link href={`/${locale}/login?next=/${locale}/read/${chapterId}`}>{t("login")}</Link>
                </Button>
                <Button asChild variant="secondary" className="w-full sm:w-auto">
                  <Link href={`/${locale}/register?next=/${locale}/read/${chapterId}`}>{t("register")}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
