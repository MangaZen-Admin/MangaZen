"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Megaphone, Loader2, X, AlertTriangle, Info, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BannerData = {
  id: string;
  message: string;
  type: string;
  isDismissible: boolean;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
};

export function AdminGlobalBannerPanel() {
  const t = useTranslations("admin.globalBanner");
  const [current, setCurrent] = useState<BannerData | null>(null);
  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [type, setType] = useState<"info" | "warning" | "urgent">("info");
  const [isDismissible, setIsDismissible] = useState(true);
  const [expiresAt, setExpiresAt] = useState("");
  const [formBusy, setFormBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deactivateBusy, setDeactivateBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/global-banner");
        if (!res.ok) return;
        const data = (await res.json()) as { banner: BannerData | null };
        setCurrent(data.banner);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function sendBanner() {
    if (!message.trim()) {
      toast.error(t("missingMessage"));
      return;
    }
    setFormBusy(true);
    try {
      const res = await fetch("/api/admin/global-banner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          type,
          isDismissible,
          expiresAt: expiresAt || null,
        }),
      });
      if (!res.ok) {
        toast.error(t("sendError"));
        return;
      }
      const data = (await res.json()) as { banner: BannerData };
      setCurrent(data.banner);
      setMessage("");
      setExpiresAt("");
      setConfirmOpen(false);
      toast.success(t("sent"));
    } catch {
      toast.error(t("sendError"));
    } finally {
      setFormBusy(false);
    }
  }

  async function deactivate() {
    setDeactivateBusy(true);
    try {
      const res = await fetch("/api/admin/global-banner", { method: "DELETE" });
      if (!res.ok) {
        toast.error(t("deactivateError"));
        return;
      }
      setCurrent((prev) => (prev ? { ...prev, isActive: false } : null));
      toast.success(t("deactivated"));
    } catch {
      toast.error(t("deactivateError"));
    } finally {
      setDeactivateBusy(false);
    }
  }

  const typeOptions: {
    value: "info" | "warning" | "urgent";
    label: string;
    icon: React.ReactNode;
    className: string;
  }[] = [
    {
      value: "info",
      label: t("typeInfo"),
      icon: <Info className="h-4 w-4" />,
      className: "border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-200",
    },
    {
      value: "warning",
      label: t("typeWarning"),
      icon: <AlertTriangle className="h-4 w-4" />,
      className: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200",
    },
    {
      value: "urgent",
      label: t("typeUrgent"),
      icon: <Zap className="h-4 w-4" />,
      className: "border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-200",
    },
  ];

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Megaphone className="h-5 w-5 text-primary" aria-hidden />
        <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>

      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("loading")}</p>
      ) : current?.isActive ? (
        <div
          className={cn(
            "mt-4 rounded-lg border p-3",
            current.type === "info" && "border-sky-500/40 bg-sky-500/10",
            current.type === "warning" && "border-amber-500/40 bg-amber-500/10",
            current.type === "urgent" && "border-red-500/40 bg-red-500/10"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("activeBanner")}
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">{current.message}</p>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{t(`type${current.type.charAt(0).toUpperCase() + current.type.slice(1)}`)}</span>
                <span>·</span>
                <span>{current.isDismissible ? t("dismissible") : t("notDismissible")}</span>
                {current.expiresAt && (
                  <>
                    <span>·</span>
                    <span>{t("expiresAt", { date: new Date(current.expiresAt).toLocaleString() })}</span>
                  </>
                )}
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={deactivateBusy}
              onClick={() => void deactivate()}
            >
              {deactivateBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              {t("deactivate")}
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {t("noBanner")}
        </p>
      )}

      <div className="mt-6 space-y-4 rounded-lg border border-border bg-background/40 p-4">
        <p className="text-sm font-medium text-foreground">{t("newBanner")}</p>

        <div className="flex flex-wrap gap-2">
          {typeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setType(opt.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                type === opt.value
                  ? opt.className
                  : "border-border bg-background text-muted-foreground hover:border-primary/40"
              )}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>

        <textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("messagePlaceholder")}
          maxLength={500}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
        />
        <p className="text-right text-xs text-muted-foreground">{message.length}/500</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={isDismissible}
              onChange={(e) => setIsDismissible(e.target.checked)}
            />
            {t("isDismissible")}
          </label>
          <div>
            <label className="block text-xs text-muted-foreground">{t("expiresAtLabel")}</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            />
          </div>
        </div>

        {!confirmOpen ? (
          <Button
            type="button"
            disabled={!message.trim() || formBusy}
            onClick={() => setConfirmOpen(true)}
          >
            <Megaphone className="mr-1.5 h-4 w-4" aria-hidden />
            {t("send")}
          </Button>
        ) : (
          <div className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              {t("confirmQuestion")}
            </p>
            <p className="text-xs italic text-amber-800 dark:text-amber-200">
              &ldquo;{message.trim()}&rdquo;
            </p>
            <div className="flex gap-2">
              <Button type="button" disabled={formBusy} onClick={() => void sendBanner()}>
                {formBusy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                {t("confirmSend")}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={formBusy}
                onClick={() => setConfirmOpen(false)}
              >
                {t("confirmCancel")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
