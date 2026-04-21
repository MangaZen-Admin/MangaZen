"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Coins, Gem, Zap, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ZenPackage } from "@/lib/lemon-squeezy";

type Props = {
  packages: ZenPackage[];
  initialZenCoins: number;
  initialZenShards: number;
  locale: string;
};

function getCurrencyForLocale(locale: string): keyof ZenPackage["prices"] {
  if (locale === "es-ar") return "ARS";
  if (locale === "pt-br") return "BRL";
  if (locale === "es-es") return "ARS";
  return "USD";
}

function formatPrice(
  pkg: ZenPackage,
  currency: keyof ZenPackage["prices"]
): string {
  const price = pkg.prices[currency];
  if (price == null) return "";
  const symbols: Record<string, string> = {
    USD: "US$",
    ARS: "$",
    MXN: "MX$",
    BRL: "R$",
  };
  return `${symbols[currency] ?? ""}${price.toLocaleString()}`;
}

const PACKAGE_HIGHLIGHTS: Record<string, boolean> = {
  basic: true,
  plus: true,
};

export function BillingPageClient({
  packages,
  initialZenCoins,
  initialZenShards,
  locale,
}: Props) {
  const t = useTranslations("billing");
  const currency = getCurrencyForLocale(locale);
  const [loadingPkg, setLoadingPkg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zenCoins, setZenCoins] = useState(initialZenCoins);
  const [polling, setPolling] = useState(false);

  const [isSuccess, setIsSuccess] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success") === "1";
    const cancelled = params.get("cancelled") === "1";
    if (success) setIsSuccess(true);
    if (cancelled) setIsCancelled(true);
    if (success || cancelled) {
      const clean = window.location.pathname;
      window.history.replaceState({}, "", clean);
    }
  }, []);

  useEffect(() => {
    if (!isSuccess) return;
    let attempts = 0;
    const baseCoins = initialZenCoins;
    setPolling(true);
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch("/api/user/balance");
        if (!res.ok) return;
        const data = (await res.json()) as { zenCoins: number; zenShards: number };
        if (data.zenCoins > baseCoins) {
          setZenCoins(data.zenCoins);
          setPolling(false);
          clearInterval(interval);
        }
      } catch {
        /* ignorar */
      }
      if (attempts >= 10) {
        setPolling(false);
        clearInterval(interval);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isSuccess, initialZenCoins]);

  async function handlePurchase(pkg: ZenPackage) {
    if (pkg.id === "mini" && currency !== "ARS") return;

    setError(null);
    setLoadingPkg(pkg.id);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: pkg.id }),
      });
      const data = (await res.json()) as {
        checkoutUrl?: string;
        error?: string;
      };

      if (!res.ok || !data.checkoutUrl) {
        if (data.error === "PAYMENT_NOT_CONFIGURED") {
          setError(t("errorNotConfigured"));
        } else {
          setError(t("errorGeneric"));
        }
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setLoadingPkg(null);
    }
  }

  const visiblePackages = packages.filter((pkg) => {
    if (pkg.id === "mini") return currency === "ARS";
    return pkg.prices[currency] != null;
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {t("pageTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("pageSubtitle")}</p>

        <div className="mt-4 flex flex-wrap gap-3">
          <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 shadow-sm">
            <Coins className="h-4 w-4 text-yellow-500" aria-hidden />
            <span className="text-sm font-medium text-foreground">
              {zenCoins.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">Zen Coins</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 shadow-sm">
            <Gem className="h-4 w-4 text-primary" aria-hidden />
            <span className="text-sm font-medium text-foreground">
              {initialZenShards.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">Zen Shards</span>
          </div>
        </div>
      </div>

      {isSuccess && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3">
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
              {t("successTitle")}
            </p>
            <p className="text-xs text-emerald-800 dark:text-emerald-200">
              {polling ? t("successPolling") : t("successBody")}
            </p>
          </div>
          {polling && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-emerald-600" />}
        </div>
      )}
      {isCancelled && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-muted bg-muted/30 px-4 py-3">
          <XCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("cancelledMessage")}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visiblePackages.map((pkg) => {
          const highlighted = PACKAGE_HIGHLIGHTS[pkg.id] ?? false;
          const price = formatPrice(pkg, currency);
          const isLoading = loadingPkg === pkg.id;

          return (
            <div
              key={pkg.id}
              className={cn(
                "relative flex flex-col rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-md",
                highlighted
                  ? "border-primary/40 bg-gradient-to-br from-primary/10 via-card to-primary/5"
                  : "border-border bg-card"
              )}
            >
              {highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary px-3 py-0.5 text-[11px] font-semibold text-primary-foreground shadow-sm">
                    <Zap className="h-3 w-3" aria-hidden />
                    {t("popular")}
                  </span>
                </div>
              )}

              <div className="flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t(`package.${pkg.id}`)}
                </p>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <Coins className="h-5 w-5 text-yellow-500" aria-hidden />
                  <span className="text-3xl font-bold tabular-nums text-foreground">
                    {pkg.zenCoins.toLocaleString()}
                  </span>
                  <span className="text-sm text-muted-foreground">ZC</span>
                </div>
                {price && (
                  <p className="mt-3 text-2xl font-semibold text-foreground">
                    {price}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("perCoin", {
                    rate: ((pkg.prices[currency] ?? 0) / pkg.zenCoins).toFixed(3),
                    currency,
                  })}
                </p>
              </div>

              <Button
                type="button"
                className={cn(
                  "mt-5 w-full",
                  highlighted && "bg-primary text-primary-foreground hover:opacity-90"
                )}
                variant={highlighted ? "default" : "outline"}
                disabled={isLoading || loadingPkg !== null}
                onClick={() => void handlePurchase(pkg)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("redirecting")}
                  </>
                ) : (
                  t("buyButton")
                )}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        {t("securityNote")}
      </p>
    </div>
  );
}
