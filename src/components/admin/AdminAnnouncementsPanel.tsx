"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Megaphone, Pin, PinOff, Pencil, Trash2, Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { routing } from "@/i18n/routing";

const LOCALES = routing.locales;

type TranslationRow = {
  locale: string;
  title: string;
  body: string;
  imageUrl: string | null;
};

type Announcement = {
  id: string;
  isPinned: boolean;
  publishedAt: string;
  createdAt: string;
  translations: TranslationRow[];
};

type FormRow = { title: string; body: string; imageUrl: string };

function makeEmptyForm(): Record<string, FormRow> {
  const o: Record<string, FormRow> = {};
  for (const loc of LOCALES) {
    o[loc] = { title: "", body: "", imageUrl: "" };
  }
  return o;
}

function formFromAnnouncement(a: Announcement): Record<string, FormRow> {
  const base = makeEmptyForm();
  for (const tr of a.translations) {
    if (base[tr.locale]) {
      base[tr.locale] = {
        title: tr.title,
        body: tr.body,
        imageUrl: tr.imageUrl ?? "",
      };
    }
  }
  return base;
}

function displayTitle(a: Announcement) {
  return (
    a.translations.find((t) => t.locale === "es-ar")?.title ??
    a.translations[0]?.title ??
    ""
  );
}

function displayBody(a: Announcement) {
  return (
    a.translations.find((t) => t.locale === "es-ar")?.body ?? a.translations[0]?.body ?? ""
  );
}

function displayImage(a: Announcement) {
  return (
    a.translations.find((t) => t.locale === "es-ar")?.imageUrl ??
    a.translations[0]?.imageUrl ??
    null
  );
}

export function AdminAnnouncementsPanel() {
  const t = useTranslations("admin.announcements");
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [formByLoc, setFormByLoc] = useState<Record<string, FormRow>>(() => makeEmptyForm());
  const [formPinned, setFormPinned] = useState(false);
  const [formBusy, setFormBusy] = useState(false);
  const [langTab, setLangTab] = useState<string>(LOCALES[0]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/announcements");
      if (!res.ok) {
        toast.error(t("loadError"));
        return;
      }
      const data = (await res.json()) as { announcements: Announcement[] };
      setItems(data.announcements);
    } catch {
      toast.error(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditId(null);
    setFormByLoc(makeEmptyForm());
    setFormPinned(false);
    setLangTab(LOCALES[0]);
    setCreating(true);
  }

  function openEdit(a: Announcement) {
    setCreating(false);
    setEditId(a.id);
    setFormByLoc(formFromAnnouncement(a));
    setFormPinned(a.isPinned);
    setLangTab(LOCALES[0]);
  }

  function closeForm() {
    setCreating(false);
    setEditId(null);
  }

  function setField(loc: string, key: keyof FormRow, value: string) {
    setFormByLoc((prev) => ({
      ...prev,
      [loc]: { ...prev[loc], [key]: value },
    }));
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    const translations = LOCALES.map((loc) => {
      const row = formByLoc[loc];
      const title = row.title.trim();
      const body = row.body.trim();
      const imageUrl = row.imageUrl.trim() || null;
      if (!title || !body) return null;
      return { locale: loc, title, body, imageUrl };
    }).filter((x): x is NonNullable<typeof x> => x != null);

    if (translations.length === 0) {
      toast.error(t("missingFields"));
      return;
    }
    setFormBusy(true);
    try {
      const payload: Record<string, unknown> = {
        isPinned: formPinned,
        translations,
      };
      const res = editId
        ? await fetch(`/api/admin/announcements/${editId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/announcements", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) {
        toast.error(t("saveError"));
        return;
      }
      const data = (await res.json()) as { announcement: Announcement };
      if (editId) {
        setItems((prev) => prev.map((a) => (a.id === editId ? data.announcement : a)));
        toast.success(t("updated"));
      } else {
        setItems((prev) => [data.announcement, ...prev]);
        toast.success(t("created"));
      }
      closeForm();
    } catch {
      toast.error(t("saveError"));
    } finally {
      setFormBusy(false);
    }
  }

  async function togglePin(a: Announcement) {
    setBusy(a.id);
    try {
      const res = await fetch(`/api/admin/announcements/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !a.isPinned }),
      });
      if (!res.ok) {
        toast.error(t("saveError"));
        return;
      }
      const data = (await res.json()) as { announcement: Announcement };
      setItems((prev) => prev.map((x) => (x.id === a.id ? data.announcement : x)));
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
      const res = await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error(t("deleteError"));
        return;
      }
      setItems((prev) => prev.filter((a) => a.id !== id));
      toast.success(t("deleted"));
    } catch {
      toast.error(t("deleteError"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
        </div>
        <Button type="button" size="sm" onClick={openCreate} disabled={creating}>
          <Plus className="mr-1.5 h-4 w-4" aria-hidden />
          {t("new")}
        </Button>
      </div>

      {(creating || editId) && (
        <form onSubmit={submitForm} className="mt-4 space-y-3 rounded-lg border border-border bg-background/40 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              {editId ? t("editForm") : t("createForm")}
            </p>
            <button
              type="button"
              onClick={closeForm}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={formPinned}
              onChange={(e) => setFormPinned(e.target.checked)}
            />
            {t("fieldPinned")}
          </label>

          <Tabs value={langTab} onValueChange={setLangTab} className="w-full">
            <TabsList className="mb-2 flex h-auto w-full flex-wrap justify-start gap-1 overflow-x-auto p-1">
              {LOCALES.map((loc) => (
                <TabsTrigger key={loc} value={loc} className="shrink-0 text-xs">
                  {loc}
                </TabsTrigger>
              ))}
            </TabsList>
            {LOCALES.map((loc) => (
              <TabsContent key={loc} value={loc} className="space-y-2 pt-0">
                <input
                  value={formByLoc[loc]?.title ?? ""}
                  onChange={(e) => setField(loc, "title", e.target.value)}
                  placeholder={t("fieldTitle")}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                />
                <textarea
                  rows={4}
                  value={formByLoc[loc]?.body ?? ""}
                  onChange={(e) => setField(loc, "body", e.target.value)}
                  placeholder={t("fieldBody")}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                />
                <input
                  type="url"
                  value={formByLoc[loc]?.imageUrl ?? ""}
                  onChange={(e) => setField(loc, "imageUrl", e.target.value)}
                  placeholder={t("fieldImageUrl")}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                />
              </TabsContent>
            ))}
          </Tabs>

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={formBusy}>
              {formBusy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              {t("save")}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={closeForm}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("loading")}</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((a) => {
            const img = displayImage(a);
            return (
              <li
                key={a.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3",
                  a.isPinned ? "border-primary/30 bg-primary/5" : "border-border bg-background/40"
                )}
              >
                {img && (
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded border border-border bg-muted">
                    <Image src={img} alt="" fill className="object-cover" sizes="48px" unoptimized />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {a.isPinned && <Pin className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />}
                    <p className="text-sm font-semibold text-foreground">{displayTitle(a)}</p>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                    {displayBody(a)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    disabled={busy === a.id}
                    onClick={() => void togglePin(a)}
                    title={a.isPinned ? t("unpin") : t("pin")}
                    className="rounded-md border border-border p-1.5 text-muted-foreground hover:border-primary/40 hover:text-primary disabled:opacity-40"
                  >
                    {a.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    disabled={busy === a.id}
                    onClick={() => openEdit(a)}
                    className="rounded-md border border-border p-1.5 text-muted-foreground hover:border-primary/40 hover:text-foreground disabled:opacity-40"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={busy === a.id}
                    onClick={() => void deleteAnnouncement(a.id)}
                    className="rounded-md border border-destructive/40 p-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
