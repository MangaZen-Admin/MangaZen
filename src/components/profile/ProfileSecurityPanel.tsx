"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Shield } from "lucide-react";
import { getApiErrorMessage } from "@/lib/api-error";

type ProfileSecurityPanelProps = {
  initialRequirePassword: boolean;
  initialRequireEmailCode: boolean;
  initialHideFromRankings: boolean;
  initialIsProfilePublic: boolean;
  initialHideZenFromPublic: boolean;
  initialHideFavoritesFromPublic: boolean;
  initialHideReadingStatsFromPublic: boolean;
};

export function ProfileSecurityPanel({
  initialRequirePassword,
  initialRequireEmailCode,
  initialHideFromRankings,
  initialIsProfilePublic,
  initialHideZenFromPublic,
  initialHideFavoritesFromPublic,
  initialHideReadingStatsFromPublic,
}: ProfileSecurityPanelProps) {
  const t = useTranslations("security");
  const locale = useLocale();
  const router = useRouter();
  const [requirePassword, setRequirePassword] = useState(initialRequirePassword);
  const [requireEmailCode, setRequireEmailCode] = useState(initialRequireEmailCode);
  const [hideFromRankings, setHideFromRankings] = useState(initialHideFromRankings);
  const [isProfilePublic, setIsProfilePublic] = useState(initialIsProfilePublic);
  const [hideZenFromPublic, setHideZenFromPublic] = useState(initialHideZenFromPublic);
  const [hideFavoritesFromPublic, setHideFavoritesFromPublic] = useState(initialHideFavoritesFromPublic);
  const [hideReadingStatsFromPublic, setHideReadingStatsFromPublic] = useState(
    initialHideReadingStatsFromPublic
  );
  const [busy, setBusy] = useState(false);

  const [warnKind, setWarnKind] = useState<"password" | "email" | null>(null);
  const [revokeOpen, setRevokeOpen] = useState(false);

  async function patchSecurity(partial: {
    requirePasswordForPoints?: boolean;
    requireEmailCodeForPoints?: boolean;
    hideFromRankings?: boolean;
    isProfilePublic?: boolean;
    hideZenFromPublic?: boolean;
    hideFavoritesFromPublic?: boolean;
    hideReadingStatsFromPublic?: boolean;
  }) {
    setBusy(true);
    try {
      const res = await fetch("/api/user/security", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });
      if (!res.ok) {
        toast.error(await getApiErrorMessage(res, t, "toggleSaveError"));
        return;
      }
      const data = (await res.json()) as {
        requirePasswordForPoints?: boolean;
        requireEmailCodeForPoints?: boolean;
        hideFromRankings?: boolean;
        isProfilePublic?: boolean;
        hideZenFromPublic?: boolean;
        hideFavoritesFromPublic?: boolean;
        hideReadingStatsFromPublic?: boolean;
      };
      if (typeof data.requirePasswordForPoints === "boolean") {
        setRequirePassword(data.requirePasswordForPoints);
      }
      if (typeof data.requireEmailCodeForPoints === "boolean") {
        setRequireEmailCode(data.requireEmailCodeForPoints);
      }
      if (typeof data.hideFromRankings === "boolean") {
        setHideFromRankings(data.hideFromRankings);
      }
      if (typeof data.isProfilePublic === "boolean") {
        setIsProfilePublic(data.isProfilePublic);
      }
      if (typeof data.hideZenFromPublic === "boolean") {
        setHideZenFromPublic(data.hideZenFromPublic);
      }
      if (typeof data.hideFavoritesFromPublic === "boolean") {
        setHideFavoritesFromPublic(data.hideFavoritesFromPublic);
      }
      if (typeof data.hideReadingStatsFromPublic === "boolean") {
        setHideReadingStatsFromPublic(data.hideReadingStatsFromPublic);
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function onTogglePassword() {
    if (requirePassword) {
      setWarnKind("password");
      return;
    }
    void patchSecurity({ requirePasswordForPoints: true });
  }

  function onToggleEmailCode() {
    if (requireEmailCode) {
      setWarnKind("email");
      return;
    }
    void patchSecurity({ requireEmailCodeForPoints: true });
  }

  async function revokeAllSessions() {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/revoke-all-sessions", {
        method: "POST",
        credentials: "include",
        redirect: "manual",
      });
      if (res.type === "opaqueredirect" || res.status === 0 || res.status === 302 || res.status === 307) {
        const loc = res.headers.get("Location");
        if (loc) {
          window.location.href = loc;
          return;
        }
        window.location.href = `/${locale}/login?reason=all_sessions_revoked`;
        return;
      }
      if (res.ok) {
        window.location.href = `/${locale}/login?reason=all_sessions_revoked`;
        return;
      }
      toast.error(t("revokeAllError"));
    } finally {
      setBusy(false);
      setRevokeOpen(false);
    }
  }

  return (
    <section className="rounded-2xl border border-primary/20 bg-card p-6 shadow-sm dark:border-border dark:shadow-none">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" aria-hidden />
        <h2 className="text-lg font-semibold text-foreground">{t("sectionTitle")}</h2>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("ipRadarNote")}</p>

      <div className="mt-6 space-y-4">
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">{t("requirePasswordLabel")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("requirePasswordDescription")}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={requirePassword}
            disabled={busy}
            onClick={() => onTogglePassword()}
            className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
              requirePassword ? "bg-primary" : "bg-muted"
            } disabled:opacity-50`}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-background shadow transition-transform ${
                requirePassword ? "left-7" : "left-1"
              }`}
            />
          </button>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">{t("requireEmailCodeLabel")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("requireEmailCodeDescription")}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={requireEmailCode}
            disabled={busy}
            onClick={() => onToggleEmailCode()}
            className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
              requireEmailCode ? "bg-primary" : "bg-muted"
            } disabled:opacity-50`}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-background shadow transition-transform ${
                requireEmailCode ? "left-7" : "left-1"
              }`}
            />
          </button>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">{t("hideFromRankingsLabel")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("hideFromRankingsDescription")}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={hideFromRankings}
            disabled={busy}
            onClick={() => void patchSecurity({ hideFromRankings: !hideFromRankings })}
            className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
              hideFromRankings ? "bg-primary" : "bg-muted"
            } disabled:opacity-50`}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-background shadow transition-transform ${
                hideFromRankings ? "left-7" : "left-1"
              }`}
            />
          </button>
        </div>

        <div className="pt-2">
          <h3 className="text-sm font-semibold text-foreground">{t("privacySectionTitle")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{t("privacySectionHint")}</p>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">{t("isProfilePublicLabel")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("isProfilePublicDescription")}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isProfilePublic}
            disabled={busy}
            onClick={() => void patchSecurity({ isProfilePublic: !isProfilePublic })}
            className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
              isProfilePublic ? "bg-primary" : "bg-muted"
            } disabled:opacity-50`}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-background shadow transition-transform ${
                isProfilePublic ? "left-7" : "left-1"
              }`}
            />
          </button>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">{t("hideZenFromPublicLabel")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("hideZenFromPublicDescription")}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={hideZenFromPublic}
            disabled={busy}
            onClick={() => void patchSecurity({ hideZenFromPublic: !hideZenFromPublic })}
            className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
              hideZenFromPublic ? "bg-primary" : "bg-muted"
            } disabled:opacity-50`}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-background shadow transition-transform ${
                hideZenFromPublic ? "left-7" : "left-1"
              }`}
            />
          </button>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">{t("hideFavoritesFromPublicLabel")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("hideFavoritesFromPublicDescription")}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={hideFavoritesFromPublic}
            disabled={busy}
            onClick={() => void patchSecurity({ hideFavoritesFromPublic: !hideFavoritesFromPublic })}
            className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
              hideFavoritesFromPublic ? "bg-primary" : "bg-muted"
            } disabled:opacity-50`}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-background shadow transition-transform ${
                hideFavoritesFromPublic ? "left-7" : "left-1"
              }`}
            />
          </button>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">{t("hideReadingStatsFromPublicLabel")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("hideReadingStatsFromPublicDescription")}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={hideReadingStatsFromPublic}
            disabled={busy}
            onClick={() =>
              void patchSecurity({ hideReadingStatsFromPublic: !hideReadingStatsFromPublic })
            }
            className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
              hideReadingStatsFromPublic ? "bg-primary" : "bg-muted"
            } disabled:opacity-50`}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-background shadow transition-transform ${
                hideReadingStatsFromPublic ? "left-7" : "left-1"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="mt-6 border-t border-border pt-6">
        <button
          type="button"
          disabled={busy}
          onClick={() => setRevokeOpen(true)}
          className="w-full rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-destructive/15 disabled:opacity-50 sm:w-auto"
        >
          {t("revokeAllSessions")}
        </button>
      </div>

      {warnKind && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg">
            <h3 className="text-lg font-semibold text-foreground">{t("disableWarningTitle")}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {warnKind === "password" ? t("disablePasswordWarningBody") : t("disableEmailCodeWarningBody")}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setWarnKind(null)}
                className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium"
              >
                {t("reauthModalCancel")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  const k = warnKind;
                  setWarnKind(null);
                  if (k === "password") {
                    void patchSecurity({ requirePasswordForPoints: false });
                  }
                  if (k === "email") {
                    void patchSecurity({ requireEmailCodeForPoints: false });
                  }
                }}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground"
              >
                {t("disableWarningConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {revokeOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg">
            <h3 className="text-lg font-semibold text-foreground">{t("revokeAllConfirm")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t("revokeAllConfirmDetail")}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setRevokeOpen(false)}
                className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium"
              >
                {t("reauthModalCancel")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void revokeAllSessions()}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground"
              >
                {t("revokeAllConfirmAction")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
