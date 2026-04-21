"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import { notifyBadgesEarned } from "@/components/badges/notify-badges-earned";
import { useAdblockDetection } from "@/hooks/useAdblockDetection";
import { ReauthDialog } from "@/components/security/ReauthDialog";
import { Button } from "@/components/ui/button";

type ProfileAdblockBannerProps = {
  hasWhitelistBadge: boolean;
  displayName: string;
  onZenBalanceUpdate?: (nextZen: number) => void;
};

export function ProfileAdblockBanner({
  hasWhitelistBadge,
  displayName,
  onZenBalanceUpdate,
}: ProfileAdblockBannerProps) {
  const router = useRouter();
  const t = useTranslations("profile");
  const tBadges = useTranslations("badges");
  const { adblockDetected, cleanChecks, checksDone } = useAdblockDetection();
  const [badgeUnlocked, setBadgeUnlocked] = useState(hasWhitelistBadge);
  const [showPersonalizedCongrats, setShowPersonalizedCongrats] = useState(false);
  const [zenGrantedLine, setZenGrantedLine] = useState<{ amount: number } | null>(null);
  const [claimBusy, setClaimBusy] = useState(false);
  const [reauthOpen, setReauthOpen] = useState(false);
  const [reauthBusy, setReauthBusy] = useState(false);
  const [reauthMountKey, setReauthMountKey] = useState(0);
  const pendingClaimRef = useRef<{ adblockDetected: boolean; consistencyChecks: number } | null>(null);

  const applyClaimResponse = useCallback(
    (data: {
      awarded?: boolean;
      firstTimeAwarded?: boolean;
      badgesEarned?: { name: string; description: string }[];
      zenPoints?: number;
      zenPointsGranted?: number;
    }) => {
      if (data.firstTimeAwarded) {
        setShowPersonalizedCongrats(true);
      }
      if (
        data.firstTimeAwarded &&
        typeof data.zenPointsGranted === "number" &&
        data.zenPointsGranted > 0
      ) {
        setZenGrantedLine({ amount: data.zenPointsGranted });
        if (typeof data.zenPoints === "number" && onZenBalanceUpdate) {
          onZenBalanceUpdate(data.zenPoints);
        }
      }
      if (data.awarded) {
        setBadgeUnlocked(true);
      }
      if (data.firstTimeAwarded && data.badgesEarned && data.badgesEarned.length > 0) {
        notifyBadgesEarned(data.badgesEarned, tBadges);
      }
      if (data.awarded) {
        router.refresh();
      }
    },
    [onZenBalanceUpdate, router, tBadges]
  );

  const canOfferClaim =
    !badgeUnlocked && !adblockDetected && checksDone >= 3 && cleanChecks >= 3;

  async function runClaim(withPassword?: string) {
    if (badgeUnlocked || adblockDetected || !canOfferClaim) return;
    const payload = {
      adblockDetected,
      consistencyChecks: cleanChecks,
      ...(withPassword ? { reauth_password: withPassword } : {}),
    };
    pendingClaimRef.current = { adblockDetected, consistencyChecks: cleanChecks };
    setClaimBusy(true);
    try {
      const res = await fetch("/api/badges/claim-whitelist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 403) {
        const j = (await res.json()) as { error?: string; reauthType?: string };
        if (j.error === "REAUTH_REQUIRED" && j.reauthType === "password") {
          setReauthMountKey((k) => k + 1);
          setReauthOpen(true);
          return;
        }
      }
      if (!res.ok) return;
      const data = (await res.json()) as Parameters<typeof applyClaimResponse>[0];
      applyClaimResponse(data);
    } finally {
      setClaimBusy(false);
    }
  }

  async function confirmClaimReauth(password: string) {
    if (!pendingClaimRef.current) return;
    setReauthBusy(true);
    try {
      const res = await fetch("/api/badges/claim-whitelist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...pendingClaimRef.current,
          reauth_password: password,
        }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as Parameters<typeof applyClaimResponse>[0];
      applyClaimResponse(data);
      setReauthOpen(false);
    } finally {
      setReauthBusy(false);
    }
  }

  if (badgeUnlocked) {
    if (showPersonalizedCongrats) {
      return (
        <div className="mt-4 rounded-xl border-2 border-primary/50 bg-primary/15 p-4 text-sm text-foreground shadow-none transition-colors duration-200 dark:border-primary/55 dark:shadow-[0_0_24px_rgba(157,78,221,0.35)]">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1 space-y-3">
              <p className="leading-relaxed">{t("whitelistCongrats", { name: displayName })}</p>
              {zenGrantedLine ? (
                <div className="flex items-center gap-2 rounded-lg border border-primary/35 bg-primary/10 px-3 py-2 text-primary dark:border-primary/45 dark:bg-primary/15">
                  <Sparkles className="h-4 w-4 shrink-0" strokeWidth={2.25} />
                  <p className="text-sm font-semibold leading-snug">
                    {t("zenPointsGranted", { amount: zenGrantedLine.amount })}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="mt-4 flex items-center gap-2 rounded-xl border-2 border-primary/45 bg-primary/15 p-3 text-sm text-foreground shadow-none transition-colors duration-200 dark:border-primary/50 dark:shadow-[0_0_20px_rgba(157,78,221,0.25)]">
        <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
        <p>{t("whitelistBadgeActive")}</p>
      </div>
    );
  }

  if (adblockDetected) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-foreground transition-colors duration-200">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <p>{t("adblockEnabled")}</p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-4 space-y-3 rounded-xl border border-primary/40 bg-primary/10 p-3 text-sm text-foreground transition-colors duration-200">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
          <p>{t("adblockDisabled")}</p>
        </div>
        {canOfferClaim ? (
          <Button
            type="button"
            size="sm"
            disabled={claimBusy}
            onClick={() => void runClaim()}
            className="w-full sm:w-auto"
          >
            {t("claimWhitelistReward")}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">{t("claimWhitelistHint")}</p>
        )}
      </div>
      <ReauthDialog
        key={reauthMountKey}
        open={reauthOpen}
        reauthType={reauthOpen ? "password" : null}
        onClose={() => {
          setReauthOpen(false);
        }}
        onConfirm={(pwd) => void confirmClaimReauth(pwd)}
        busy={reauthBusy}
      />
    </>
  );
}
