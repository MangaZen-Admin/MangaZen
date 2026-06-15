"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { MessageSquare, Pencil, Trash2, Plus, X, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type SystemAnnouncement = {
  id: string;
  title: string;
  content: string;
  targetRole: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const ROLE_OPTIONS = ["ALL_STAFF", "SCAN", "CREATOR"] as const;

export function AdminSystemAnnouncementsPanel() {
  const t = useTranslations("admin.systemAnnouncements");
  const [items, setItems] = useState<SystemAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formRole, setFormRole] = useState<string>("ALL_STAFF");
  const [formBusy, setFormBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/system-announcements");
      if (!res.ok) { toast.error(t("loadError")); return; }
      const data = (await res.json()) as { announcements: SystemAnnouncement[] };
      setItems(data.announcements);
    } catch {
      toast.error(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  function openCreate() {
    setEditId(null);
    setFormTitle("");
    setFormContent("");
    setFormRole("ALL_STAFF");
    setShowForm(true);
  }

  function openEdit(a: SystemAnnouncement) {
    setEditId(a.id);
    setFormTitle(a.title);
    setFormContent(a.content);
    setFormRole(a.targetRole);
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!formTitle.trim() || !formContent.trim()) {
      toast.error(t("missingFields"));
      return;
    }
    setFormBusy(true);
    try {
      const res = editId
        ? await fetch("/api/admin/system-announcements", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editId, title: formTitle, content: formContent, targetRole: formRole }),
          })
        : await fetch("/api/admin/system-announcements", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: formTitle, content: formContent, targetRole: formRole }),
          });
      if (!res.ok) { toast.error(t("saveError")); return; }
      toast.success(editId ? t("updated") : t("created"));
      setShowForm(false);
      void load();
    } catch {
      toast.error(t("saveError"));
    } finally {
      setFormBusy(false);
    }
  }

  async function toggleActive(a: SystemAnnouncement) {
    setBusy(a.id);
    try {
      const res = await fetch("/api/admin/system-announcements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: a.id, isActive: !a.isActive }),
      });
      if (!res.ok) { toast.error(t("saveError")); return; }
      void load();
    } catch {
      toast.error(t("saveError"));
    } finally {
      setBusy(null);
    }
  }

  async function deleteAnnouncement(id: string) {
    if (!window.confirm(t("deleteConfirm"))) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/system-announcements?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) { toast.error(t("deleteError")); return; }
      toast.success(t("deleted"));
      void load();
    } catch {
      toast.error(t("deleteError"));
    } finally {
      setBusy(null);
    }
  }

  const roleLabel: Record<string, string> = {
    ALL_STAFF: t("roleAllStaff"),
    SCAN: t("roleScan"),
    CREATOR: t("roleCreator"),
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
            <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
        <Button type="button" size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          {t("new")}
        </Button>
      </div>

      {showForm && (
        <div className="mt-4 rounded-lg border border-border bg-background/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{editId ? t("editForm") : t("createForm")}</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{t("fieldTitle")}</label>
            <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} maxLength={200}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{t("fieldContent")}</label>
            <textarea rows={4} value={formContent} onChange={(e) => setFormContent(e.target.value)} maxLength={2000}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{t("fieldTarget")}</label>
            <select value={formRole} onChange={(e) => setFormRole(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25">
              {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)} disabled={formBusy}>{t("cancel")}</Button>
            <Button type="button" size="sm" onClick={() => void handleSubmit()} disabled={formBusy}>
              {formBusy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              {t("save")}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((a) => (
              <li key={a.id} className={`rounded-lg border p-3 ${a.isActive ? "border-border bg-background/60" : "border-border/50 bg-background/30 opacity-60"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{a.title}</p>
                      <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">{roleLabel[a.targetRole] ?? a.targetRole}</span>
                      {!a.isActive && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{t("inactive")}</span>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">{a.content}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" disabled={busy === a.id} onClick={() => void toggleActive(a)}
                      title={a.isActive ? t("deactivate") : t("activate")}
                      className="rounded-md border border-border p-1.5 text-muted-foreground hover:border-primary/40 hover:text-primary disabled:opacity-40">
                      {a.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    <button type="button" disabled={busy === a.id} onClick={() => openEdit(a)}
                      className="rounded-md border border-border p-1.5 text-muted-foreground hover:border-primary/40 hover:text-foreground disabled:opacity-40">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" disabled={busy === a.id} onClick={() => void deleteAnnouncement(a.id)}
                      className="rounded-md border border-destructive/40 p-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-40">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
