"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { MangaRequestStatus } from "@prisma/client";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type RequestRow = {
  id: string;
  title: string;
  author: string | null;
  notes: string | null;
  status: MangaRequestStatus;
  createdAt: string;
};

type Props = {
  isLoggedIn: boolean;
};

export function CommunityMangaRequestPanel({ isLoggedIn }: Props) {
  const t = useTranslations("mangaRequest");
  const locale = useLocale();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [notes, setNotes] = useState("");
  const [requests, setRequests] = useState<RequestRow[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function onDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(
        `/api/community/manga-request?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        toast.error(t("deleteError"));
        return;
      }
      setRequests((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
      toast.success(t("deleteSuccess"));
    } catch {
      toast.error(t("deleteError"));
    } finally {
      setDeletingId(null);
    }
  }

  const load = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    setListError(null);
    try {
      const res = await fetch("/api/community/manga-request");
      if (!res.ok) {
        setListError(t("loadError"));
        return;
      }
      const data = (await res.json()) as { requests: RequestRow[] };
      setRequests(data.requests);
    } catch {
      setListError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingCount = useMemo(
    () => requests?.filter((r) => r.status === "PENDING").length ?? 0,
    [requests]
  );
  const atLimit = pendingCount >= 3;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoggedIn || atLimit) return;
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      const res = await fetch("/api/community/manga-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          author: author.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      if (res.status === 401) {
        setError(t("submitUnauthorized"));
        return;
      }
      if (res.status === 409) {
        setError(t("limitReached"));
        void load();
        return;
      }
      if (!res.ok) {
        setError(t("submitError"));
        return;
      }
      const data = (await res.json()) as { request: RequestRow };
      setRequests((prev) => (prev ? [data.request, ...prev] : [data.request]));
      setTitle("");
      setAuthor("");
      setNotes("");
      setSuccess(true);
    } catch {
      setError(t("submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  function statusLabel(s: MangaRequestStatus) {
    return t(`status${s}` as "statusPENDING" | "statusAPPROVED" | "statusREJECTED");
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm dark:shadow-none">
      <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("subtitle")}</p>

      {!isLoggedIn && (
        <p className="mt-4 text-sm text-muted-foreground">
          <Link href={`/${locale}/login?next=/${locale}/community`} className="font-medium text-primary underline">
            {t("loginCta")}
          </Link>
        </p>
      )}

      {isLoggedIn && (
        <>
          <form onSubmit={onSubmit} className="mt-4 space-y-3 rounded-lg border border-border bg-background/40 p-4">
            <div>
              <label htmlFor="mr-title" className="block text-xs text-muted-foreground">
                {t("fieldTitle")}
              </label>
              <input
                id="mr-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                required
                disabled={atLimit || submitting}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-50"
              />
            </div>
            <div>
              <label htmlFor="mr-author" className="block text-xs text-muted-foreground">
                {t("fieldAuthor")}
              </label>
              <input
                id="mr-author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                maxLength={100}
                disabled={atLimit || submitting}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-50"
              />
            </div>
            <div>
              <label htmlFor="mr-notes" className="block text-xs text-muted-foreground">
                {t("fieldNotes")}
              </label>
              <textarea
                id="mr-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                rows={3}
                disabled={atLimit || submitting}
                className="mt-1 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-50"
              />
            </div>
            {atLimit && (
              <p className="text-sm text-amber-800 dark:text-amber-200">{t("limitReached")}</p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-emerald-700 dark:text-emerald-300">{t("success")}</p>}

            {!atLimit && (
              <div
                role="alert"
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm",
                  "border-orange-500/40 bg-orange-500/10 text-orange-950",
                  "dark:border-orange-400/30 dark:bg-orange-500/10 dark:text-orange-100"
                )}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-700 dark:text-orange-300" aria-hidden />
                  <p className="leading-relaxed">
                    {t("adultRestrictionWarning")}
                  </p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || atLimit}
              className="rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {t("submit")}
            </button>
          </form>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-foreground">{t("myRequests")}</h3>
            {listError && <p className="mt-2 text-sm text-destructive">{listError}</p>}
            {loading && requests === null ? (
              <p className="mt-2 text-sm text-muted-foreground">{t("loading")}</p>
            ) : !listError && (!requests || requests.length === 0) ? (
              <p className="mt-2 text-sm text-muted-foreground">{t("emptyList")}</p>
            ) : !listError && requests && requests.length > 0 ? (
              <ul className="mt-3 space-y-3">
                {requests.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-lg border border-border bg-background/50 px-3 py-2.5 text-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <span className="font-medium text-foreground">{r.title}</span>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={cn(
                            "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                            r.status === "PENDING" && "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100",
                            r.status === "APPROVED" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
                            r.status === "REJECTED" && "border-red-500/40 bg-red-500/10 text-red-900 dark:text-red-100"
                          )}
                        >
                          {statusLabel(r.status)}
                        </span>
                        {r.status === "PENDING" && (
                          <button
                            type="button"
                            disabled={deletingId === r.id}
                            onClick={() => void onDelete(r.id)}
                            className="shrink-0 rounded-md border border-destructive/40 bg-destructive/10 p-1.5 text-destructive hover:bg-destructive/15 disabled:opacity-40"
                            aria-label={t("deleteRequest")}
                          >
                            {deletingId === r.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    {r.author ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("listAuthor")}: {r.author}
                      </p>
                    ) : null}
                    {r.notes ? (
                      <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{r.notes}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
