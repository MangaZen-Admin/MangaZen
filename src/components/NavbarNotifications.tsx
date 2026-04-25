"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useLocale, useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { dateFnsLocaleFromAppLocale } from "@/lib/date-fns-locale";
type NotifRow = {
  id: string;
  type: string;
  entityId: string;
  message: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
};

type NavbarNotificationsProps = {
  initialUnread: number;
};

export function NavbarNotifications({ initialUnread }: NavbarNotificationsProps) {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const dfLocale = useMemo(() => dateFnsLocaleFromAppLocale(locale), [locale]);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotifRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUnread(initialUnread);
  }, [initialUnread]);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/notifications");
      if (!res.ok) return;
      const data = (await res.json()) as { notifications: NotifRow[] };
      setItems(data.notifications);
      setUnread(data.notifications.length);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && items === null) void load();
  }, [open, items, load]);

  async function markAllRead(): Promise<void> {
    try {
      await fetch("/api/user/notifications/read-all", { method: "PATCH" });
      setItems([]);
      setUnread(0);
    } catch {
      /* ignorar */
    }
  }

  async function markRead(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/user/notifications/${encodeURIComponent(id)}/read`, {
        method: "PATCH",
      });
      if (!res.ok) return false;
      setItems((prev) => (prev ? prev.filter((n) => n.id !== id) : prev));
      setUnread((u) => Math.max(0, u - 1));
      return true;
    } catch {
      return false;
    }
  }

  function hrefFor(n: NotifRow): string {
    switch (n.type) {
      case "CHAPTER_APPROVED":
      case "CHAPTER_REJECTED":
        return `/${locale}/read/${n.entityId}`;
      case "MANGA_APPROVED":
      case "MANGA_REJECTED": {
        const slug = typeof n.payload?.mangaSlug === "string" ? n.payload.mangaSlug : null;
        return slug ? `/${locale}/manga/${slug}` : `/${locale}`;
      }
      case "MANGA_REQUEST_APPROVED":
      case "MANGA_REQUEST_REJECTED":
        return `/${locale}/community`;
      default:
        return `/${locale}`;
    }
  }

  function labelFor(n: NotifRow): string {
    const payload = n.payload ?? {};
    const mangaTitle = typeof payload.mangaTitle === "string" ? payload.mangaTitle : "";
    const chapterNumber = typeof payload.chapterNumber === "number" ? payload.chapterNumber : null;

    switch (n.type) {
      case "CHAPTER_APPROVED":
        return t("chapterApproved", {
          manga: mangaTitle,
          number: chapterNumber != null ? String(chapterNumber) : "—",
        });
      case "CHAPTER_REJECTED":
        return t("chapterRejected", {
          manga: mangaTitle,
          number: chapterNumber != null ? String(chapterNumber) : "—",
        });
      case "MANGA_APPROVED":
        return t("mangaApproved", { title: mangaTitle });
      case "MANGA_REJECTED":
        return t("mangaRejected", { title: mangaTitle });
      case "MANGA_REQUEST_APPROVED": {
        const rt = typeof payload.mangaRequestTitle === "string" ? payload.mangaRequestTitle : "";
        return t("mangaRequestApproved", { title: rt || "—" });
      }
      case "MANGA_REQUEST_REJECTED": {
        const rt = typeof payload.mangaRequestTitle === "string" ? payload.mangaRequestTitle : "";
        return t("mangaRequestRejected", { title: rt || "—" });
      }
      default:
        return t("generic");
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={t("bellAria")}
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-w-[1.1rem] justify-center rounded-full bg-primary px-1 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open && (
        <div className="fixed left-2 right-2 top-16 z-[60] rounded-xl border border-border bg-card p-0 shadow-lg dark:shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[22rem]">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-sm font-medium text-foreground">{t("dropdownTitle")}</p>
            {items && items.length > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-xs text-primary hover:underline"
              >
                {t("markAllRead")}
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto p-1">
            {loading && items === null ? (
              <ul className="space-y-2 px-2 py-2" aria-busy aria-label={t("loading")}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <li
                    key={i}
                    className="flex gap-3 rounded-lg border border-transparent px-2 py-2.5"
                  >
                    <div className="mt-0.5 h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-3.5 w-full max-w-[14rem] animate-pulse rounded bg-muted" />
                      <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                      <div className="h-2.5 w-16 animate-pulse rounded bg-muted" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : !items || items.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">{t("empty")}</p>
            ) : (
              <ul className="space-y-0.5">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => {
                        void (async () => {
                          const href = hrefFor(n);
                          await markRead(n.id);
                          setOpen(false);
                          router.push(href);
                          router.refresh();
                        })();
                      }}
                      className="block w-full rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-muted"
                    >
                      <span className="text-foreground">{labelFor(n)}</span>
                      {n.message ? (
                        <span className="mt-1 block text-xs text-muted-foreground">{n.message}</span>
                      ) : null}
                      <span className="mt-1 block text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(n.createdAt), {
                          addSuffix: true,
                          locale: dfLocale,
                        })}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
