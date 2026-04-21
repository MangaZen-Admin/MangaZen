"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2, Pencil, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DONATION_PLATFORMS, getPlatform } from "@/lib/donation-platforms";
import { cn } from "@/lib/utils";

type DonationLink = {
  id: string;
  platform: string;
  url: string;
  order: number;
};

const MAX_LINKS = 5;

export function DonationLinksEditor() {
  const t = useTranslations("donationLinks");
  const [links, setLinks] = useState<DonationLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [urlDraft, setUrlDraft] = useState("");
  const [editUrlDraft, setEditUrlDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/donation-links");
      if (!res.ok) return;
      const data = (await res.json()) as { links: DonationLink[] };
      setLinks(data.links);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addLink() {
    if (!selectedPlatform || !urlDraft.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/user/donation-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: selectedPlatform, url: urlDraft.trim() }),
      });
      const data = (await res.json()) as { link?: DonationLink; error?: string };
      if (!res.ok) {
        if (data.error === "MAX_LINKS_REACHED") toast.error(t("errorMaxLinks", { max: MAX_LINKS }));
        else if (data.error === "PLATFORM_ALREADY_EXISTS") toast.error(t("errorPlatformExists"));
        else if (data.error === "INVALID_URL") toast.error(t("errorInvalidUrl"));
        else toast.error(t("errorGeneric"));
        return;
      }
      if (data.link) setLinks((prev) => [...prev, data.link!]);
      setAdding(false);
      setSelectedPlatform("");
      setUrlDraft("");
      toast.success(t("added"));
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id: string) {
    if (!editUrlDraft.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/user/donation-links", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, url: editUrlDraft.trim() }),
      });
      const data = (await res.json()) as { link?: DonationLink; error?: string };
      if (!res.ok) {
        toast.error(data.error === "INVALID_URL" ? t("errorInvalidUrl") : t("errorGeneric"));
        return;
      }
      if (data.link) {
        setLinks((prev) => prev.map((l) => (l.id === id ? data.link! : l)));
      }
      setEditId(null);
      toast.success(t("updated"));
    } finally {
      setBusy(false);
    }
  }

  async function deleteLink(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/user/donation-links?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error(t("errorGeneric"));
        return;
      }
      setLinks((prev) => prev.filter((l) => l.id !== id));
      toast.success(t("deleted"));
    } finally {
      setDeletingId(null);
    }
  }

  const availablePlatforms = DONATION_PLATFORMS.filter((p) => !links.some((l) => l.platform === p.id));

  return (
    <div className="mt-4 rounded-xl border border-border bg-background/60 p-4 dark:bg-card/40">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("sectionTitle")}</p>
        {!adding && links.length < MAX_LINKS && availablePlatforms.length > 0 && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground transition hover:border-primary/40 hover:bg-primary/5"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            {t("addButton")}
          </button>
        )}
      </div>

      {adding && (
        <div className="mt-3 space-y-3 rounded-lg border border-border bg-background p-3">
          <div className="flex flex-wrap gap-2">
            {availablePlatforms.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSelectedPlatform(p.id);
                  setUrlDraft("");
                }}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                  selectedPlatform === p.id
                    ? cn(p.color, p.textColor)
                    : "border-border bg-background text-muted-foreground hover:border-primary/40"
                )}
              >
                {p.name}
              </button>
            ))}
          </div>
          {selectedPlatform && (
            <div className="space-y-2">
              <input
                type="url"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                placeholder={getPlatform(selectedPlatform)?.placeholder ?? "https://..."}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25"
              />
              <div className="flex gap-2">
                <Button type="button" size="sm" disabled={busy || !urlDraft.trim()} onClick={() => void addLink()}>
                  {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                  {t("saveButton")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAdding(false);
                    setSelectedPlatform("");
                    setUrlDraft("");
                  }}
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  {t("cancelButton")}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <p className="mt-3 text-xs text-muted-foreground">{t("loading")}</p>
      ) : links.length === 0 && !adding ? (
        <p className="mt-3 text-xs text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {links.map((link) => {
            const platform = getPlatform(link.platform);
            const isEditing = editId === link.id;
            return (
              <li
                key={link.id}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm",
                  platform ? cn(platform.color) : "border-border bg-background/40"
                )}
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="url"
                      value={editUrlDraft}
                      onChange={(e) => setEditUrlDraft(e.target.value)}
                      className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm outline-none"
                    />
                    <div className="flex gap-2">
                      <Button type="button" size="sm" disabled={busy} onClick={() => void saveEdit(link.id)}>
                        {t("saveButton")}
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setEditId(null)}>
                        {t("cancelButton")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={cn("shrink-0 font-medium", platform?.textColor)}>
                      {platform?.name ?? link.platform}
                    </span>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 flex-1 truncate text-xs text-muted-foreground hover:underline"
                    >
                      {link.url}
                    </a>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditId(link.id);
                          setEditUrlDraft(link.url);
                        }}
                        className="rounded p-1 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === link.id}
                        onClick={() => void deleteLink(link.id)}
                        className="rounded p-1 text-destructive hover:bg-destructive/10 disabled:opacity-40"
                      >
                        {deletingId === link.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-2 text-[10px] text-muted-foreground">{t("hint", { max: MAX_LINKS, current: links.length })}</p>
    </div>
  );
}
