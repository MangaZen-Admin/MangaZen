"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Megaphone, X } from "lucide-react";

type Announcement = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
};

export function ScanAnnouncementsBanner() {
  const t = useTranslations("scanPanel.announcements");
  const [items, setItems] = useState<Announcement[]>([]);
  const [dismissing, setDismissing] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/scan/system-announcements")
      .then((r) => r.json())
      .then((d: { announcements?: Announcement[] }) => setItems(d.announcements ?? []))
      .catch(() => {});
  }, []);

  async function dismiss(id: string) {
    setDismissing(id);
    setItems((prev) => prev.filter((a) => a.id !== id));
    try {
      await fetch("/api/scan/system-announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ announcementId: id }),
      });
    } catch {
      // si falla, el anuncio volverá a aparecer al recargar
    } finally {
      setDismissing(null);
    }
  }

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      {items.map((a) => (
        <div key={a.id} className="relative rounded-xl border border-primary/30 bg-primary/5 p-4 pr-10">
          <div className="flex items-start gap-3">
            <Megaphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{a.title}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.content}</p>
            </div>
          </div>
          <button
            type="button"
            disabled={dismissing === a.id}
            onClick={() => void dismiss(a.id)}
            title={t("dismiss")}
            className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground transition hover:bg-background hover:text-foreground disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
