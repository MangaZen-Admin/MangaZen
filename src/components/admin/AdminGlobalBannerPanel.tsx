"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Megaphone, Loader2, X, AlertTriangle, Info, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { routing } from "@/i18n/routing";

const LOCALES = routing.locales;

type TranslationRow = { locale: string; message: string };

type BannerData = {
  id: string;
  type: string;
  isDismissible: boolean;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  translations: TranslationRow[];
};

function makeEmptyMessages(): Record<string, string> {
  const o: Record<string, string> = {};
  for (const loc of LOCALES) {
    o[loc] = "";
  }
  return o;
}

function previewMessage(b: BannerData) {
  return (
    b.translations.find((t) => t.locale === "es-ar")?.message ??
    b.translations[0]?.message ??
    ""
  );
}

export function AdminGlobalBannerPanel() {
  const t = useTranslations("admin.globalBanner");
  const [current, setCurrent] = useState<BannerData | null>(null);
  const [loading, setLoading] = useState(true);

  const [msgByLoc, setMsgByLoc] = useState<Record<string, string>>(() => makeEmptyMessages());
  const [type, setType] = useState<"info" | "warning" | "urgent">("info");
  const [isDismissible, setIsDismissible] = useState(true);
  const [expiresAt, setExpiresAt] = useState("");
  const [formBusy, setFormBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deactivateBusy, setDeactivateBusy] = useState(false);
  const [langTab, setLangTab] = useState<string>(LOCALES[0]);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/global-banner");
    if (!res.ok) return;
    const data = (await res.json()) as { banner: BannerData | null };
    setCurrent(data.banner);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await load();
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  function setMessage(loc: string, value: string) {
    setMsgByLoc((prev) => ({ ...prev, [loc]: value }));
  }

  async function sendBanner() {
    const translations: { locale: (typeof LOCALES)[number]; message: string }[] = [];
    for (const loc of LOCALES) {
      const message = (msgByLoc[loc] ?? "").trim();
      if (message) translations.push({ locale: loc, message });
    }

    if (translations.length === 0) {
      toast.error(t("missingMessage"));
      return;
    }
    setFormBusy(true);
    try {
      const res = await fetch("/api/admin/global-banner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          isDismissible,
          expiresAt: expiresAt || null,
          translations,
        }),
      });
      if (!res.ok) {
        toast.error(t("sendError"));
        return;
      }
      const data = (await res.json()) as { banner: BannerData };
      setCurrent(data.banner);
      setMsgByLoc(makeEmptyMessages());
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
              <p className="mt-1 text-sm font-medium text-foreground">{previewMessage(current)}</p>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>
                  {t(`type${current.type.charAt(0).toUpperCase() + current.type.slice(1)}`)}
                </span>
                <span>·</span>
                <span>{current.isDismissible ? t("dismissible") : t("notDismissible")}</span>
                {current.expiresAt && (
                  <>
                    <span>·</span>
                    <span>
                      {t("expiresAt", { date: new Date(current.expiresAt).toLocaleString() })}
                    </span>
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

        <Tabs value={langTab} onValueChange={setLangTab} className="w-full">
          <TabsList className="mb-2 flex h-auto w-full flex-wrap justify-start gap-1 overflow-x-auto p-1">
            {LOCALES.map((loc) => (
              <TabsTrigger key={loc} value={loc} className="shrink-0 text-xs">
                {loc}
              </TabsTrigger>
            ))}
          </TabsList>
          {LOCALES.map((loc) => (
            <TabsContent key={loc} value={loc} className="pt-0">
              <textarea
                rows={3}
                value={msgByLoc[loc] ?? ""}
                onChange={(e) => setMessage(loc, e.target.value)}
                placeholder={t("messagePlaceholder")}
                maxLength={500}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
              />
              <p className="text-right text-xs text-muted-foreground">{(msgByLoc[loc] ?? "").length}/500</p>
            </TabsContent>
          ))}
        </Tabs>

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
            disabled={formBusy}
            onClick={() => {
              const hasAny = LOCALES.some((loc) => (msgByLoc[loc] ?? "").trim().length > 0);
              if (!hasAny) {
                toast.error(t("missingMessage"));
                return;
              }
              setConfirmOpen(true);
            }}
          >
            <Megaphone className="mr-1.5 h-4 w-4" aria-hidden />
            {t("send")}
          </Button>
        ) : (
          <div className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              {t("confirmQuestion")}
            </p>
            <p className="text-xs italic text-amber-800 dark:text-amber-200 line-clamp-3">
              &ldquo;
              {(msgByLoc["es-ar"] ?? "").trim() ||
                LOCALES.map((l) => (msgByLoc[l] ?? "").trim()).find((m) => m.length > 0) ||
                ""}
              &rdquo;
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
