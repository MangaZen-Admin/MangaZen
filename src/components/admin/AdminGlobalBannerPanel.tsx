"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Megaphone, Loader2, X, AlertTriangle, Info, Zap, Pencil, Check } from "lucide-react";
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
  for (const loc of LOCALES) o[loc] = "";
  return o;
}

function previewMessage(b: BannerData) {
  return (
    b.translations.find((t) => t.locale === "es-ar")?.message ??
    b.translations[0]?.message ??
    ""
  );
}

function bannerTypeClass(type: string) {
  if (type === "warning") return "border-amber-500/40 bg-amber-500/10";
  if (type === "urgent") return "border-red-500/40 bg-red-500/10";
  return "border-sky-500/40 bg-sky-500/10";
}

export function AdminGlobalBannerPanel() {
  const t = useTranslations("admin.globalBanner");
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [msgByLoc, setMsgByLoc] = useState<Record<string, string>>(() => makeEmptyMessages());
  const [type, setType] = useState<"info" | "warning" | "urgent">("info");
  const [isDismissible, setIsDismissible] = useState(true);
  const [expiresAt, setExpiresAt] = useState("");
  const [formBusy, setFormBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [langTab, setLangTab] = useState<string>(LOCALES[0]);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/global-banner");
    if (!res.ok) return;
    const data = (await res.json()) as { banners: BannerData[] };
    setBanners(data.banners ?? []);
  }, []);

  useEffect(() => {
    void (async () => {
      try { await load(); } finally { setLoading(false); }
    })();
  }, [load]);

  function setMessage(loc: string, value: string) {
    setMsgByLoc((prev) => ({ ...prev, [loc]: value }));
  }

  async function toggleActive(banner: BannerData) {
    const res = await fetch("/api/admin/global-banner", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: banner.id, isActive: !banner.isActive }),
    });
    if (res.ok) {
      await load();
      toast.success(banner.isActive ? t("deactivated") : t("activated"));
    } else {
      toast.error(t("deactivateError"));
    }
  }

  function startEdit(banner: BannerData) {
    setEditingId(banner.id);
    const msgs = makeEmptyMessages();
    for (const tr of banner.translations) msgs[tr.locale] = tr.message;
    setMsgByLoc(msgs);
    setType(banner.type as "info" | "warning" | "urgent");
    setIsDismissible(banner.isDismissible);
    setExpiresAt(banner.expiresAt ? new Date(banner.expiresAt).toISOString().slice(0, 16) : "");
  }

  async function saveEdit() {
    if (!editingId) return;
    const translations = LOCALES
      .map((loc) => ({ locale: loc, message: (msgByLoc[loc] ?? "").trim() }))
      .filter((r) => r.message.length > 0);
    if (translations.length === 0) { toast.error(t("missingMessage")); return; }
    setFormBusy(true);
    try {
      const res = await fetch("/api/admin/global-banner", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, type, isDismissible, translations }),
      });
      if (res.ok) {
        await load();
        setEditingId(null);
        setMsgByLoc(makeEmptyMessages());
        toast.success(t("sent"));
      } else {
        toast.error(t("sendError"));
      }
    } finally {
      setFormBusy(false);
    }
  }

  async function sendBanner() {
    const translations = LOCALES
      .map((loc) => ({ locale: loc, message: (msgByLoc[loc] ?? "").trim() }))
      .filter((r) => r.message.length > 0);
    if (translations.length === 0) { toast.error(t("missingMessage")); return; }
    setFormBusy(true);
    try {
      const res = await fetch("/api/admin/global-banner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, isDismissible, expiresAt: expiresAt || null, translations }),
      });
      if (!res.ok) { toast.error(t("sendError")); return; }
      await load();
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

  const typeOptions = [
    { value: "info" as const, label: t("typeInfo"), icon: <Info className="h-4 w-4" />, className: "border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-200" },
    { value: "warning" as const, label: t("typeWarning"), icon: <AlertTriangle className="h-4 w-4" />, className: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200" },
    { value: "urgent" as const, label: t("typeUrgent"), icon: <Zap className="h-4 w-4" />, className: "border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-200" },
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
      ) : banners.length === 0 ? (
        <p className="mt-4 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">{t("noBanner")}</p>
      ) : (
        <div className="mt-4 space-y-2">
          {banners.map((banner) => (
            <div key={banner.id} className={cn("rounded-lg border p-3 transition", bannerTypeClass(banner.type), !banner.isActive && "opacity-60")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", banner.isActive ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>
                      {banner.isActive ? "Activo" : "Inactivo"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{new Date(banner.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-foreground line-clamp-2">{previewMessage(banner)}</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button type="button" size="sm" variant="outline" onClick={() => startEdit(banner)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={banner.isActive ? "destructive" : "outline"}
                    onClick={() => void toggleActive(banner)}
                  >
                    {banner.isActive ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                    {banner.isActive ? t("deactivate") : t("activate")}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 space-y-4 rounded-lg border border-border bg-background/40 p-4">
        <p className="text-sm font-medium text-foreground">
          {editingId ? "Editando banner" : t("newBanner")}
        </p>

        <div className="flex flex-wrap gap-2">
          {typeOptions.map((opt) => (
            <button key={opt.value} type="button" onClick={() => setType(opt.value)}
              className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                type === opt.value ? opt.className : "border-border bg-background text-muted-foreground hover:border-primary/40"
              )}>
              {opt.icon}{opt.label}
            </button>
          ))}
        </div>

        <Tabs value={langTab} onValueChange={setLangTab} className="w-full">
          <TabsList className="mb-2 flex h-auto w-full flex-wrap justify-start gap-1 overflow-x-auto p-1">
            {LOCALES.map((loc) => (
              <TabsTrigger key={loc} value={loc} className="shrink-0 text-xs">{loc}</TabsTrigger>
            ))}
          </TabsList>
          {LOCALES.map((loc) => (
            <TabsContent key={loc} value={loc} className="pt-0">
              <textarea rows={3} value={msgByLoc[loc] ?? ""} onChange={(e) => setMessage(loc, e.target.value)}
                placeholder={t("messagePlaceholder")} maxLength={500}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/25" />
              <p className="text-right text-xs text-muted-foreground">{(msgByLoc[loc] ?? "").length}/500</p>
            </TabsContent>
          ))}
        </Tabs>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={isDismissible} onChange={(e) => setIsDismissible(e.target.checked)} />
            {t("isDismissible")}
          </label>
          {!editingId && (
            <div>
              <label className="block text-xs text-muted-foreground">{t("expiresAtLabel")}</label>
              <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/25" />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {editingId ? (
            <>
              <Button type="button" disabled={formBusy} onClick={() => void saveEdit()}>
                {formBusy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                Guardar cambios
              </Button>
              <Button type="button" variant="outline" onClick={() => { setEditingId(null); setMsgByLoc(makeEmptyMessages()); }}>
                Cancelar
              </Button>
            </>
          ) : !confirmOpen ? (
            <Button type="button" disabled={formBusy} onClick={() => {
              const hasAny = LOCALES.some((loc) => (msgByLoc[loc] ?? "").trim().length > 0);
              if (!hasAny) { toast.error(t("missingMessage")); return; }
              setConfirmOpen(true);
            }}>
              <Megaphone className="mr-1.5 h-4 w-4" aria-hidden />{t("send")}
            </Button>
          ) : (
            <div className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 w-full">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">{t("confirmQuestion")}</p>
              <div className="flex gap-2">
                <Button type="button" disabled={formBusy} onClick={() => void sendBanner()}>
                  {formBusy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}{t("confirmSend")}
                </Button>
                <Button type="button" variant="outline" disabled={formBusy} onClick={() => setConfirmOpen(false)}>
                  {t("confirmCancel")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
