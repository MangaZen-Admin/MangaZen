"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AdScriptRow = {
  id: string;
  slotId: string;
  script: string;
  label: string | null;
  isActive: boolean;
};

const SLOT_OPTIONS = [
  { id: "global", label: "🌐 Script global (todos los slots)" },
  { id: "home-between-sections", label: "Home — entre secciones" },
  { id: "manga-detail-before-chapters", label: "Ficha manga — antes de capítulos" },
  { id: "reader-end-of-chapter", label: "Lector — fin de capítulo" },
  { id: "library-after-10", label: "Biblioteca — tras 10 resultados" },
  { id: "library-after-25", label: "Biblioteca — tras 25 resultados" },
  { id: "library-after-50", label: "Biblioteca — cada 50 resultados" },
  { id: "news-between-sections", label: "Novedades — entre secciones" },
  { id: "community-between-sections", label: "Comunidad — entre secciones" },
  { id: "profile-public-bottom", label: "Perfil público — al final" },
];

export function AdminAdsPanel() {
  const t = useTranslations("admin.ads");
  const [scripts, setScripts] = useState<AdScriptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newSlotId, setNewSlotId] = useState(SLOT_OPTIONS[0]!.id);
  const [newLabel, setNewLabel] = useState("");
  const [newScript, setNewScript] = useState("");
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editScript, setEditScript] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ad-scripts");
      if (!res.ok) return;
      const data = (await res.json()) as { scripts: AdScriptRow[] };
      setScripts(data.scripts);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveNew() {
    if (!newScript.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/ad-scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: newSlotId,
          script: newScript.trim(),
          label: newLabel.trim() || SLOT_OPTIONS.find((s) => s.id === newSlotId)?.label,
          isActive: true,
        }),
      });
      if (!res.ok) {
        toast.error(t("errorSave"));
        return;
      }
      toast.success(t("saved"));
      setAdding(false);
      setNewScript("");
      setNewLabel("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(ad: AdScriptRow) {
    const res = await fetch("/api/admin/ad-scripts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slotId: ad.slotId,
        script: ad.script,
        label: ad.label,
        isActive: !ad.isActive,
      }),
    });
    if (!res.ok) {
      toast.error(t("errorSave"));
      return;
    }
    setScripts((prev) =>
      prev.map((s) => (s.id === ad.id ? { ...s, isActive: !s.isActive } : s))
    );
  }

  async function saveEdit(ad: AdScriptRow) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/ad-scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: ad.slotId,
          script: editScript.trim(),
          label: ad.label,
          isActive: ad.isActive,
        }),
      });
      if (!res.ok) {
        toast.error(t("errorSave"));
        return;
      }
      toast.success(t("saved"));
      setEditId(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function deleteAd(slotId: string) {
    if (!window.confirm(t("confirmDelete"))) return;
    const res = await fetch(`/api/admin/ad-scripts?slotId=${encodeURIComponent(slotId)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error(t("errorDelete"));
      return;
    }
    toast.success(t("deleted"));
    setScripts((prev) => prev.filter((s) => s.slotId !== slotId));
  }

  const usedSlots = new Set(scripts.map((s) => s.slotId));
  const availableSlots = SLOT_OPTIONS.filter((s) => !usedSlots.has(s.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        {!adding && availableSlots.length > 0 && (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setAdding(true);
              setNewSlotId(availableSlots[0]!.id);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            {t("addButton")}
          </Button>
        )}
      </div>

      {adding && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div>
            <label className="text-xs text-muted-foreground">{t("slotLabel")}</label>
            <select
              value={newSlotId}
              onChange={(e) => setNewSlotId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
            >
              {availableSlots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{t("scriptLabel")}</label>
            <textarea
              rows={5}
              value={newScript}
              onChange={(e) => setNewScript(e.target.value)}
              placeholder={t("scriptPlaceholder")}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/25"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={busy || !newScript.trim()}
              onClick={() => void saveNew()}
            >
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              {t("saveButton")}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setAdding(false)}>
              {t("cancelButton")}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : scripts.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="space-y-3">
          {scripts.map((ad) => (
            <li key={ad.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{ad.label ?? ad.slotId}</p>
                  <p className="text-xs text-muted-foreground">{ad.slotId}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleActive(ad)}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs font-medium transition",
                      ad.isActive
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-border bg-muted text-muted-foreground"
                    )}
                  >
                    {ad.isActive ? t("active") : t("inactive")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditId(ad.id);
                      setEditScript(ad.script);
                    }}
                    className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5 rotate-45" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteAd(ad.slotId)}
                    className="rounded-md border border-destructive/40 p-1.5 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {editId === ad.id && (
                <div className="mt-3 space-y-2">
                  <textarea
                    rows={5}
                    value={editScript}
                    onChange={(e) => setEditScript(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/25"
                  />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" disabled={busy} onClick={() => void saveEdit(ad)}>
                      {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                      {t("saveButton")}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setEditId(null)}>
                      {t("cancelButton")}
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
