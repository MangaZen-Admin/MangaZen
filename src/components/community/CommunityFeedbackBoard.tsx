"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import type { Locale } from "date-fns";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Heart,
  Lightbulb,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { getPublicProfileUrlKey } from "@/lib/public-profile-url";
import { dateFnsLocaleFromAppLocale } from "@/lib/date-fns-locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FeedbackCategory, FeedbackStatus } from "@prisma/client";

export type FeedbackListItem = {
  id: string;
  title: string;
  body: string;
  category: FeedbackCategory;
  status: FeedbackStatus;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    username: string | null;
  };
  upvotes: number;
  downvotes: number;
  netScore: number;
  myVote: number | null;
};

type FilterKey = "ALL" | FeedbackCategory;

type Props = {
  isLoggedIn: boolean;
};

export function CommunityFeedbackBoard({ isLoggedIn }: Props) {
  const t = useTranslations("feedback");
  const locale = useLocale();
  const dfLocale = dateFnsLocaleFromAppLocale(locale);

  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [items, setItems] = useState<FeedbackListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<FeedbackCategory>("SUGGESTION");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter !== "ALL") params.set("category", filter);
      params.set("page", "0");
      const qs = params.toString();
      const res = await fetch(`/api/feedback${qs ? `?${qs}` : ""}`);
      if (!res.ok) {
        setError(t("loadError"));
        return;
      }
      const data = (await res.json()) as {
        feedbacks: FeedbackListItem[];
        hasMore?: boolean;
        nextCursor?: string | null;
      };
      setItems(data.feedbacks);
      setHasMore(data.hasMore ?? false);
      setNextCursor(data.nextCursor ?? null);
    } catch {
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [filter, t]);

  const loadMore = useCallback(async () => {
    if (nextCursor == null || loadingMore) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "ALL") params.set("category", filter);
      params.set("cursor", nextCursor);
      const res = await fetch(`/api/feedback?${params.toString()}`);
      if (!res.ok) {
        setError(t("loadMoreError"));
        return;
      }
      const data = (await res.json()) as {
        feedbacks: FeedbackListItem[];
        hasMore?: boolean;
        nextCursor?: string | null;
      };
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const merged = [...prev];
        for (const f of data.feedbacks) {
          if (!seen.has(f.id)) {
            seen.add(f.id);
            merged.push(f);
          }
        }
        return merged;
      });
      setHasMore(data.hasMore ?? false);
      setNextCursor(data.nextCursor ?? null);
    } finally {
      setLoadingMore(false);
    }
  }, [filter, nextCursor, loadingMore, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmitFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoggedIn) return;
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          category: filter !== "ALL" ? filter : category,
        }),
      });
      if (res.status === 401) {
        setFormError(t("formUnauthorized"));
        return;
      }
      if (!res.ok) {
        setFormError(t("formError"));
        return;
      }
      const data = (await res.json()) as { feedback: FeedbackListItem };
      setItems((prev) => {
        if (filter !== "ALL" && data.feedback.category !== filter) return prev;
        return [data.feedback, ...prev];
      });
      setTitle("");
      setBody("");
      setCategory(filter !== "ALL" ? filter : "SUGGESTION");
    } finally {
      setSubmitting(false);
    }
  }

  async function vote(feedbackId: string, value: 1 | -1) {
    if (!isLoggedIn) return;
    const res = await fetch(`/api/feedback/${feedbackId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as {
      upvotes: number;
      downvotes: number;
      netScore: number;
      myVote: number | null;
    };
    setItems((prev) =>
      prev.map((it) =>
        it.id === feedbackId
          ? {
              ...it,
              upvotes: data.upvotes,
              downvotes: data.downvotes,
              netScore: data.netScore,
              myVote: data.myVote,
            }
          : it
      )
    );
  }

  const filters: { key: FilterKey; label: string }[] = useMemo(
    () => [
      { key: "ALL", label: t("filterAll") },
      { key: "BUG", label: t("filterBugs") },
      { key: "SUGGESTION", label: t("filterSuggestions") },
      { key: "PRAISE", label: t("filterPraise") },
    ],
    [t]
  );

  return (
    <section className="mt-10 rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">{t("boardTitle")}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("boardSubtitle")}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground/90">{t("boardScopeHint")}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              filter === f.key
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-background/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoggedIn && (
        <form onSubmit={onSubmitFeedback} className="mt-6 space-y-3 rounded-lg border border-border bg-background/40 p-4">
          <p className="text-sm font-medium text-foreground">{t("formTitle")}</p>
          {filter === "ALL" && (
            <div>
              <label className="block text-xs text-muted-foreground" htmlFor="fb-cat">
                {t("formCategory")}
              </label>
              <Select value={category} onValueChange={(v) => setCategory(v as FeedbackCategory)}>
                <SelectTrigger id="fb-cat" className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUG">{t("categoryBUG")}</SelectItem>
                  <SelectItem value="SUGGESTION">{t("categorySUGGESTION")}</SelectItem>
                  <SelectItem value="PRAISE">{t("categoryPRAISE")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <label className="block text-xs text-muted-foreground" htmlFor="fb-title">
              {t("formFieldTitle")}
            </label>
            <input
              id="fb-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              required
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground" htmlFor="fb-body">
              {t("formFieldBody")}
            </label>
            <textarea
              id="fb-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={1000}
              required
              rows={4}
              className="mt-1 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            />
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {t("formSubmit")}
          </button>
        </form>
      )}

      {!isLoggedIn && (
        <p className="mt-6 text-sm text-muted-foreground">
          <Link
            href={`/${locale}/login?next=/${locale}/community`}
            className="font-medium text-primary underline"
          >
            {t("loginToPost")}
          </Link>
        </p>
      )}

      {loading && (
        <ul className="mt-6 space-y-4" aria-busy aria-label={t("loading")}>
          {Array.from({ length: 4 }).map((_, i) => (
            <li
              key={i}
              className="rounded-xl border border-border bg-background/40 p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
              </div>
              <div className="mt-2 h-5 max-w-md animate-pulse rounded bg-muted" />
              <div className="mt-2 space-y-1.5">
                <div className="h-3 w-full animate-pulse rounded bg-muted" />
                <div className="h-3 w-[92%] animate-pulse rounded bg-muted" />
              </div>
              <div className="mt-3 h-3 w-44 animate-pulse rounded bg-muted" />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
                <div className="h-8 w-10 animate-pulse rounded-lg bg-muted" />
                <div className="flex items-center gap-2">
                  <div className="h-3 w-8 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-8 animate-pulse rounded bg-muted" />
                  <div className="h-7 w-16 animate-pulse rounded-md bg-muted" />
                  <div className="h-7 w-20 animate-pulse rounded-md bg-muted" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {!loading && error && <p className="mt-6 text-sm text-destructive">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">{t("empty")}</p>
      )}

      {!loading && (
        <ul className="mt-6 space-y-4">
          {items.map((item) => (
            <FeedbackCard
              key={item.id}
              item={item}
              isLoggedIn={isLoggedIn}
              dfLocale={dfLocale}
              locale={locale}
              onVote={vote}
              t={t}
            />
          ))}
        </ul>
      )}

      {!loading && !error && hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => void loadMore()}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/40 hover:bg-muted/50 disabled:opacity-50"
          >
            {loadingMore ? t("loading") : t("loadMore")}
          </button>
        </div>
      )}
    </section>
  );
}

function FeedbackCard({
  item,
  isLoggedIn,
  dfLocale,
  locale,
  onVote,
  t,
}: {
  item: FeedbackListItem;
  isLoggedIn: boolean;
  dfLocale: Locale;
  locale: string;
  onVote: (id: string, v: 1 | -1) => void;
  t: (key: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const longBody = item.body.length > 140 || item.body.split("\n").length > 2;

  const categoryIcon =
    item.category === "BUG" ? (
      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
    ) : item.category === "SUGGESTION" ? (
      <Lightbulb className="h-4 w-4 text-violet-600 dark:text-violet-400" />
    ) : (
      <Heart className="h-4 w-4 text-rose-600 dark:text-rose-400" />
    );

  const authorLabel = item.author.name || item.author.email || t("anonymousAuthor");
  const profileKey = getPublicProfileUrlKey({
    id: item.author.id,
    username: item.author.username,
  });
  const authorHref = `/${locale}/user/${encodeURIComponent(profileKey)}`;

  return (
    <li className="rounded-xl border border-border bg-background/40 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {categoryIcon}
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t(`category${item.category}`)}
          </span>
        </div>
        <StatusBadge status={item.status} t={t} />
      </div>

      <h3 className="mt-2 text-base font-semibold text-foreground">{item.title}</h3>

      <div
        className={cn(
          "mt-2 text-sm leading-relaxed text-foreground/90",
          !expanded && longBody && "line-clamp-2"
        )}
      >
        {item.body}
      </div>
      {longBody && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              {t("collapse")}
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              {t("expand")}
            </>
          )}
        </button>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        <Link href={authorHref} className="font-medium text-foreground hover:text-primary hover:underline">
          {authorLabel}
        </Link>{" "}
        ·{" "}
        {formatDistanceToNow(new Date(item.createdAt), {
          addSuffix: true,
          locale: dfLocale,
        })}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
        <div className="flex items-center gap-1 rounded-lg border border-primary/25 bg-primary/5 px-2.5 py-1 text-sm font-semibold tabular-nums text-primary">
          {item.netScore > 0 ? "+" : ""}
          {item.netScore}
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <ThumbsUp className="h-3.5 w-3.5" aria-hidden />
            {item.upvotes}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <ThumbsDown className="h-3.5 w-3.5" aria-hidden />
            {item.downvotes}
          </span>
          <button
            type="button"
            disabled={!isLoggedIn}
            title={!isLoggedIn ? t("voteLoginTooltip") : undefined}
            onClick={() => void onVote(item.id, 1)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
              item.myVote === 1
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-card text-foreground hover:border-primary/40",
              !isLoggedIn && "cursor-not-allowed opacity-50"
            )}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            {t("upvote")}
          </button>
          <button
            type="button"
            disabled={!isLoggedIn}
            title={!isLoggedIn ? t("voteLoginTooltip") : undefined}
            onClick={() => void onVote(item.id, -1)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
              item.myVote === -1
                ? "border-destructive/60 bg-destructive/10 text-destructive"
                : "border-border bg-card text-foreground hover:border-destructive/40",
              !isLoggedIn && "cursor-not-allowed opacity-50"
            )}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
            {t("downvote")}
          </button>
        </div>
      </div>
    </li>
  );
}

function StatusBadge({
  status,
  t,
}: {
  status: FeedbackStatus;
  t: (key: string) => string;
}) {
  const styles: Record<FeedbackStatus, string> = {
    OPEN: "border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-200",
    IN_PROGRESS: "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200",
    RESOLVED: "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200",
    CLOSED: "border-border bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        styles[status]
      )}
    >
      {t(`status${status}`)}
    </span>
  );
}
