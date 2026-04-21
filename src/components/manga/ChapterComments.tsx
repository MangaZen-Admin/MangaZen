"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import type { Locale as DateFnsLocale } from "date-fns";
import { ChevronDown, MessageCircle, Pencil, ThumbsDown, ThumbsUp } from "lucide-react";

import { notifyBadgesEarned } from "@/components/badges/notify-badges-earned";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { routing } from "@/i18n/routing";
import {
  COMMENT_MAX_LENGTH,
  isAppLocale,
  type AppLocale,
  type CommentLocaleFilter,
} from "@/lib/chapter-comments";
import type { ChapterCommentJson } from "@/lib/chapter-comments-dto";
import { getLocaleFlagIconUrl } from "@/lib/locale-flags";
import { dateFnsLocaleFromAppLocale } from "@/lib/date-fns-locale";

function updateCommentVotes(
  list: ChapterCommentJson[],
  commentId: string,
  patch: Pick<ChapterCommentJson, "likeCount" | "dislikeCount" | "myVote">
): ChapterCommentJson[] {
  return list.map((node) => {
    if (node.id === commentId) {
      return { ...node, ...patch };
    }
    if (node.replies.length > 0) {
      return { ...node, replies: updateCommentVotes(node.replies, commentId, patch) };
    }
    return node;
  });
}

function patchCommentFields(
  list: ChapterCommentJson[],
  commentId: string,
  patch: Partial<Pick<ChapterCommentJson, "body" | "updatedAt" | "likeCount" | "dislikeCount" | "myVote">>
): ChapterCommentJson[] {
  return list.map((node) => {
    if (node.id === commentId) {
      return { ...node, ...patch };
    }
    if (node.replies.length > 0) {
      return { ...node, replies: patchCommentFields(node.replies, commentId, patch) };
    }
    return node;
  });
}

function wasCommentEdited(comment: ChapterCommentJson): boolean {
  return new Date(comment.updatedAt).getTime() - new Date(comment.createdAt).getTime() > 500;
}

type ChapterCommentsProps = {
  mangaSlug: string;
  chapterId: string | null;
  isAuthenticated: boolean;
  currentUserId: string | null;
  isMangaLevel?: boolean;
};

const LOCALE_LABEL_KEYS = {
  "es-ar": "localeFilter.es_ar",
  "es-es": "localeFilter.es_es",
  "en-us": "localeFilter.en_us",
  "en-gb": "localeFilter.en_gb",
  "pt-br": "localeFilter.pt_br",
  "ja-jp": "localeFilter.ja_jp",
  "ko-kr": "localeFilter.ko_kr",
  "zh-cn": "localeFilter.zh_cn",
} as const satisfies Record<AppLocale, string>;

const VOTE_DEBOUNCE_MS = 400;

export function ChapterComments({
  mangaSlug,
  chapterId,
  isAuthenticated,
  currentUserId,
  isMangaLevel: _isMangaLevel = false,
}: ChapterCommentsProps) {
  const t = useTranslations("chapterComments");
  const tBadges = useTranslations("badges");
  const appLocale = useLocale();
  const dateLocale = dateFnsLocaleFromAppLocale(appLocale);

  const [rawComments, setRawComments] = useState<ChapterCommentJson[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [localeFilter, setLocaleFilter] = useState<CommentLocaleFilter>("ALL");

  const [newText, setNewText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; label: string } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loginNext, setLoginNext] = useState("");

  useEffect(() => {
    setLoginNext(window.location.pathname);
  }, []);

  const voteTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const load = useCallback(
    async (opts?: { append?: boolean; cursor?: string | null }) => {
      const append = opts?.append ?? false;
      const cursor = append ? (opts?.cursor ?? null) : null;
      if (append && !cursor) return;
      if (append) setLoadingMore(true);
      else {
        setLoading(true);
      }
      setLoadError(null);
      try {
        const params = new URLSearchParams();
        if (chapterId) params.set("chapterId", chapterId);
        if (cursor) params.set("cursor", cursor);
        const res = await fetch(
          `/api/manga/${encodeURIComponent(mangaSlug)}/comments?${params.toString()}`,
          { cache: "no-store" }
        );
        if (!res.ok) {
          if (!append) {
            setLoadError(t("loadError"));
            setRawComments([]);
          }
          return;
        }
        const data = (await res.json()) as {
          comments: ChapterCommentJson[];
          hasMore?: boolean;
          nextCursor?: string | null;
        };
        const incoming = data.comments ?? [];
        if (append) {
          setRawComments((prev) => {
            const seen = new Set(prev.map((c) => c.id));
            const merged = [...prev];
            for (const c of incoming) {
              if (!seen.has(c.id)) {
                seen.add(c.id);
                merged.push(c);
              }
            }
            return merged;
          });
        } else {
          setRawComments(incoming);
        }
        setHasMore(data.hasMore ?? false);
        setNextCursor(data.nextCursor ?? null);
      } catch {
        if (!append) {
          setLoadError(t("loadError"));
          setRawComments([]);
        }
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [chapterId, mangaSlug, t]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const filteredComments = useMemo(() => {
    if (localeFilter === "ALL") return rawComments;
    return rawComments
      .filter((c) => c.locale === localeFilter)
      .map((c) => ({
        ...c,
        replies: c.replies.filter((r) => r.locale === localeFilter),
      }));
  }, [rawComments, localeFilter]);

  const postComment = async (content: string, parentId: string | null) => {
    const trimmed = content.trim();
    if (!trimmed || !isAppLocale(appLocale)) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/manga/${encodeURIComponent(mangaSlug)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(chapterId ? { chapterId } : {}),
          content: trimmed,
          parentId,
          locale: appLocale,
        }),
      });
      if (res.status === 401) return;
      if (!res.ok) return;
      const payload = (await res.json()) as {
        badgesEarned?: { name: string; description: string }[];
      };
      notifyBadgesEarned(payload.badgesEarned ?? [], tBadges);
      setNewText("");
      setReplyText("");
      setReplyTo(null);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const loadMore = useCallback(() => {
    if (nextCursor == null || loadingMore) return;
    void load({ append: true, cursor: nextCursor });
  }, [load, nextCursor, loadingMore]);

  const scheduleVote = (commentId: string, action: "like" | "dislike") => {
    const existing = voteTimers.current.get(commentId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      voteTimers.current.delete(commentId);
      void (async () => {
        try {
          const res = await fetch(`/api/comments/${encodeURIComponent(commentId)}/vote`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
          });
          if (!res.ok) return;
          const data = (await res.json()) as {
            likeCount: number;
            dislikeCount: number;
            myVote: 1 | -1 | null;
          };
          setRawComments((prev) =>
            updateCommentVotes(prev, commentId, {
              likeCount: data.likeCount,
              dislikeCount: data.dislikeCount,
              myVote: data.myVote,
            })
          );
        } catch {
          /* ignore */
        }
      })();
    }, VOTE_DEBOUNCE_MS);
    voteTimers.current.set(commentId, timer);
  };

  const applyPatchedComment = useCallback((updated: ChapterCommentJson) => {
    setRawComments((prev) =>
      patchCommentFields(prev, updated.id, {
        body: updated.body,
        updatedAt: updated.updatedAt,
        likeCount: updated.likeCount,
        dislikeCount: updated.dislikeCount,
        myVote: updated.myVote,
      })
    );
  }, []);

  return (
    <section className="space-y-4" aria-labelledby="chapter-comments-heading">
      <h2 id="chapter-comments-heading" className="text-base font-semibold text-foreground">
        {t("title")}
      </h2>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{t("filterLabel")}</span>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setLocaleFilter("ALL")}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs transition",
              localeFilter === "ALL"
                ? "border-primary/60 bg-primary/15 text-foreground"
                : "border-border bg-background/50 text-muted-foreground hover:bg-muted/60"
            )}
          >
            {t("filterAll")}
          </button>
          {routing.locales.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => setLocaleFilter(loc)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs transition",
                localeFilter === loc
                  ? "border-primary/60 bg-primary/15 text-foreground"
                  : "border-border bg-background/50 text-muted-foreground hover:bg-muted/60"
              )}
            >
              <Image
                src={getLocaleFlagIconUrl(loc)}
                alt=""
                width={14}
                height={14}
                className="h-3.5 w-3.5 rounded-[2px]"
              />
              {t(LOCALE_LABEL_KEYS[loc as AppLocale])}
            </button>
          ))}
        </div>
      </div>

      {isAuthenticated ? (
        <div className="rounded-xl border border-border bg-card/50 p-3">
          <label className="sr-only" htmlFor="new-chapter-comment">
            {t("newLabel")}
          </label>
          <textarea
            id="new-chapter-comment"
            rows={3}
            maxLength={COMMENT_MAX_LENGTH}
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder={t("placeholder")}
            className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground">
              {newText.length}/{COMMENT_MAX_LENGTH}
            </span>
            <Button
              type="button"
              size="sm"
              disabled={submitting || !newText.trim()}
              onClick={() => void postComment(newText, null)}
            >
              {t("submit")}
            </Button>
          </div>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          {t("loginPrompt")}{" "}
          <Link href={`/${appLocale}/login?next=${encodeURIComponent(loginNext)}`} className="text-primary underline">
            {t("loginLink")}
          </Link>
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : filteredComments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {rawComments.length === 0 ? t("empty") : t("emptyFiltered")}
        </p>
      ) : (
        <ul className="space-y-4">
          {filteredComments.map((c) => (
            <CommentThread
              key={c.id}
              comment={c}
              depth={0}
              appLocale={appLocale}
              dateLocale={dateLocale}
              isAuthenticated={isAuthenticated}
              currentUserId={currentUserId}
              onVote={scheduleVote}
              onPatched={applyPatchedComment}
              replyTo={replyTo}
              setReplyTo={setReplyTo}
              replyText={replyText}
              setReplyText={setReplyText}
              onReplySubmit={() => void postComment(replyText, replyTo?.id ?? null)}
              submitting={submitting}
              t={t}
            />
          ))}
        </ul>
      )}

      {!loading && !loadError && hasMore && (
        <div className="flex justify-center pt-2">
          <Button type="button" variant="outline" size="sm" disabled={loadingMore} onClick={loadMore}>
            {loadingMore ? t("loading") : t("loadMoreComments")}
          </Button>
        </div>
      )}
    </section>
  );
}

function CommentThread({
  comment,
  depth,
  appLocale,
  dateLocale,
  isAuthenticated,
  currentUserId,
  onVote,
  onPatched,
  replyTo,
  setReplyTo,
  replyText,
  setReplyText,
  onReplySubmit,
  submitting,
  t,
}: {
  comment: ChapterCommentJson;
  depth: number;
  appLocale: string;
  dateLocale: DateFnsLocale;
  isAuthenticated: boolean;
  currentUserId: string | null;
  onVote: (id: string, action: "like" | "dislike") => void;
  onPatched: (c: ChapterCommentJson) => void;
  replyTo: { id: string; label: string } | null;
  setReplyTo: (v: { id: string; label: string } | null) => void;
  replyText: string;
  setReplyText: (s: string) => void;
  onReplySubmit: () => void;
  submitting: boolean;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const [repliesOpen, setRepliesOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(comment.body);
  const [savingEdit, setSavingEdit] = useState(false);

  const author = comment.author.name?.trim() || t("anonymous");
  const when = formatDistanceToNow(new Date(comment.createdAt), {
    addSuffix: true,
    locale: dateLocale,
  });

  const isOwner = Boolean(currentUserId && comment.authorUserId === currentUserId);
  const isReplying = replyTo?.id === comment.id && depth === 0 && !editing;

  useEffect(() => {
    if (!editing) setEditDraft(comment.body);
  }, [comment.body, editing]);

  const saveEdit = async () => {
    const trimmed = editDraft.trim();
    if (!trimmed) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(comment.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { comment: ChapterCommentJson };
      onPatched(data.comment);
      setEditing(false);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <li className="rounded-xl border border-border bg-card/40 p-3">
      <div className="flex gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
          {comment.author.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={comment.author.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs font-medium text-muted-foreground">
              {author.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/${appLocale}/user/${encodeURIComponent(comment.author.profileKey ?? comment.authorUserId)}`}
              className="text-sm font-medium text-foreground hover:text-primary hover:underline"
            >
              {author}
            </Link>
            <Image
              src={getLocaleFlagIconUrl(comment.locale)}
              alt=""
              width={14}
              height={14}
              className="h-3.5 w-3.5 rounded-[2px] opacity-80"
            />
            <span className="text-xs text-muted-foreground">{when}</span>
          </div>
          {editing ? (
            <div className="space-y-2">
              <textarea
                rows={4}
                maxLength={COMMENT_MAX_LENGTH}
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted-foreground">
                  {editDraft.length}/{COMMENT_MAX_LENGTH}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={savingEdit}
                    onClick={() => {
                      setEditing(false);
                      setEditDraft(comment.body);
                    }}
                  >
                    {t("cancel")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={savingEdit || !editDraft.trim()}
                    onClick={() => void saveEdit()}
                  >
                    {t("saveEdit")}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Texto escapado por React (sin dangerouslySetInnerHTML); el HTML se elimina en el servidor al guardar. */}
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/95">{comment.body}</p>
              {wasCommentEdited(comment) ? (
                <p className="text-[10px] text-muted-foreground">
                  {t("edited", {
                    time: formatDistanceToNow(new Date(comment.updatedAt), {
                      addSuffix: true,
                      locale: dateLocale,
                    }),
                  })}
                </p>
              ) : null}
            </>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!isAuthenticated || editing}
              onClick={() => onVote(comment.id, "like")}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition",
                comment.myVote === 1
                  ? "border-primary/50 bg-primary/15 text-foreground"
                  : "border-border bg-background/60 text-muted-foreground hover:bg-muted/50",
                (!isAuthenticated || editing) && "cursor-not-allowed opacity-50"
              )}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              {comment.likeCount}
            </button>
            <button
              type="button"
              disabled={!isAuthenticated || editing}
              onClick={() => onVote(comment.id, "dislike")}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition",
                comment.myVote === -1
                  ? "border-destructive/40 bg-destructive/10 text-foreground"
                  : "border-border bg-background/60 text-muted-foreground hover:bg-muted/50",
                (!isAuthenticated || editing) && "cursor-not-allowed opacity-50"
              )}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
              {comment.dislikeCount}
            </button>
            {depth === 0 && isAuthenticated && !editing ? (
              <button
                type="button"
                onClick={() => {
                  setReplyTo(isReplying ? null : { id: comment.id, label: author });
                  setReplyText("");
                }}
                className="inline-flex items-center gap-1 rounded-md border border-transparent px-2 py-1 text-xs text-primary hover:bg-primary/10"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                {t("reply")}
              </button>
            ) : null}
            {isOwner && !editing ? (
              <button
                type="button"
                onClick={() => {
                  setReplyTo(null);
                  setEditing(true);
                  setEditDraft(comment.body);
                }}
                className="inline-flex items-center gap-1 rounded-md border border-transparent px-2 py-1 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                aria-label={t("edit")}
              >
                <Pencil className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("edit")}</span>
              </button>
            ) : null}
          </div>

          {isReplying ? (
            <div className="rounded-lg border border-primary/25 bg-background/80 p-2">
              <p className="mb-1 text-xs text-muted-foreground">
                {t("replyingTo", { name: author })}
              </p>
              <textarea
                rows={2}
                maxLength={COMMENT_MAX_LENGTH}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="w-full resize-y rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              />
              <div className="mt-1 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setReplyTo(null)}>
                  {t("cancel")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={submitting || !replyText.trim()}
                  onClick={onReplySubmit}
                >
                  {t("submitReply")}
                </Button>
              </div>
            </div>
          ) : null}

          {comment.replies.length > 0 && depth === 0 ? (
            <div className="mt-2 border-l-2 border-primary/20 pl-3">
              <button
                type="button"
                onClick={() => setRepliesOpen((o) => !o)}
                className="mb-2 flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className={cn("h-3.5 w-3.5 transition", repliesOpen ? "rotate-0" : "-rotate-90")} />
                {repliesOpen ? t("hideReplies") : t("showReplies", { count: comment.replies.length })}
              </button>
              {repliesOpen ? (
                <ul className="space-y-3">
                  {comment.replies.map((r) => (
                    <CommentThread
                      key={r.id}
                      comment={r}
                      depth={1}
                      appLocale={appLocale}
                      dateLocale={dateLocale}
                      isAuthenticated={isAuthenticated}
                      currentUserId={currentUserId}
                      onVote={onVote}
                      onPatched={onPatched}
                      replyTo={replyTo}
                      setReplyTo={setReplyTo}
                      replyText={replyText}
                      setReplyText={setReplyText}
                      onReplySubmit={onReplySubmit}
                      submitting={submitting}
                      t={t}
                    />
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}
