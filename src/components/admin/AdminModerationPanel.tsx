"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  Ban,
  Clock,
  Search,
  Trash2,
  MessageSquare,
  BookOpen,
  BookMarked,
  Loader2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPublicProfileUrlKey } from "@/lib/public-profile-url";

type ModerationUser = {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  image: string | null;
  role: string;
  isBanned: boolean;
  bannedAt: string | null;
  banReason: string | null;
  suspendedUntil: string | null;
  suspendReason: string | null;
};

type ContentItem = {
  id: string;
  type: "comment" | "chapter" | "manga" | "feedback";
  label: string;
  sublabel?: string;
  authorLabel?: string;
  createdAt: string;
};

export function AdminModerationPanel() {
  const t = useTranslations("admin.moderation");
  const locale = useLocale();
  const [users, setUsers] = useState<ModerationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [actionUser, setActionUser] = useState<ModerationUser | null>(null);
  const [actionType, setActionType] = useState<"ban" | "suspend" | "delete" | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [suspendDays, setSuspendDays] = useState("7");
  const [actionBusy, setActionBusy] = useState(false);

  const [content, setContent] = useState<ContentItem[]>([]);
  const [contentLoading, setContentLoading] = useState(true);
  const [deletingContentId, setDeletingContentId] = useState<string | null>(null);
  const [contentTypeFilter, setContentTypeFilter] = useState<
    "all" | "comment" | "chapter" | "manga" | "feedback"
  >("all");
  const [contentDateFilter, setContentDateFilter] = useState<
    "all" | "today" | "week" | "month"
  >("all");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users/list");
      if (!res.ok) {
        toast.error(t("loadError"));
        return;
      }
      const data = (await res.json()) as { users: ModerationUser[] };
      setUsers(data.users);
    } catch {
      toast.error(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadContent = useCallback(async () => {
    setContentLoading(true);
    try {
      const res = await fetch("/api/admin/moderation/content-list");
      if (!res.ok) return;
      const data = (await res.json()) as { items: ContentItem[] };
      setContent(data.items);
    } catch {
      /* silencioso */
    } finally {
      setContentLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
    void loadContent();
  }, [loadUsers, loadContent]);

  const filteredUsers = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q)
    );
  });

  const filteredContent = content.filter((item) => {
    if (contentTypeFilter !== "all" && item.type !== contentTypeFilter) return false;
    if (contentDateFilter !== "all") {
      const date = new Date(item.createdAt);
      const now = new Date();
      if (contentDateFilter === "today") {
        return date.toDateString() === now.toDateString();
      }
      if (contentDateFilter === "week") {
        return date >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }
      if (contentDateFilter === "month") {
        return date >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
    }
    return true;
  });

  function openAction(user: ModerationUser, type: "ban" | "suspend" | "delete") {
    setActionUser(user);
    setActionType(type);
    setActionReason("");
    setSuspendDays("7");
  }

  function closeAction() {
    setActionUser(null);
    setActionType(null);
    setActionReason("");
  }

  async function submitAction() {
    if (!actionUser || !actionType) return;
    setActionBusy(true);
    try {
      if (actionType === "delete") {
        const res = await fetch(`/api/admin/moderation/users/${actionUser.id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          toast.error(t("actionError"));
          return;
        }
        setUsers((prev) => prev.filter((u) => u.id !== actionUser.id));
        toast.success(t("userDeleted"));
        closeAction();
        return;
      }

      const res = await fetch(`/api/admin/moderation/users/${actionUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          reason: actionReason.trim() || undefined,
          ...(actionType === "suspend" ? { days: Number(suspendDays) } : {}),
        }),
      });
      if (!res.ok) {
        toast.error(t("actionError"));
        return;
      }
      const data = (await res.json()) as { user: Partial<ModerationUser> };
      setUsers((prev) =>
        prev.map((u) => (u.id === actionUser.id ? { ...u, ...data.user } : u))
      );
      toast.success(actionType === "ban" ? t("userBanned") : t("userSuspended"));
      closeAction();
    } catch {
      toast.error(t("actionError"));
    } finally {
      setActionBusy(false);
    }
  }

  async function liftSanction(user: ModerationUser) {
    setBusyId(user.id);
    try {
      const action = user.isBanned ? "unban" : "unsuspend";
      const res = await fetch(`/api/admin/moderation/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        toast.error(t("actionError"));
        return;
      }
      const data = (await res.json()) as { user: Partial<ModerationUser> };
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...data.user } : u)));
      toast.success(t("sanctionLifted"));
    } catch {
      toast.error(t("actionError"));
    } finally {
      setBusyId(null);
    }
  }

  async function deleteContent(item: ContentItem) {
    if (!window.confirm(t("deleteContentConfirm", { label: item.label }))) return;
    setDeletingContentId(item.id);
    try {
      const res = await fetch("/api/admin/moderation/content", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: item.type, id: item.id }),
      });
      if (!res.ok) {
        toast.error(t("deleteContentError"));
        return;
      }
      setContent((prev) => prev.filter((c) => c.id !== item.id));
      toast.success(t("contentDeleted"));
    } catch {
      toast.error(t("deleteContentError"));
    } finally {
      setDeletingContentId(null);
    }
  }

  function statusBadge(user: ModerationUser) {
    if (user.isBanned) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-800 dark:text-red-200">
          <Ban className="h-3 w-3" /> {t("statusBanned")}
        </span>
      );
    }
    if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-200">
          <Clock className="h-3 w-3" /> {t("statusSuspended")}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:text-emerald-200">
        {t("statusActive")}
      </span>
    );
  }

  const contentIcon = (type: ContentItem["type"]) => {
    if (type === "comment") return <MessageSquare className="h-4 w-4 text-violet-500" />;
    if (type === "manga") return <BookOpen className="h-4 w-4 text-sky-500" />;
    if (type === "chapter") return <BookMarked className="h-4 w-4 text-primary" />;
    return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">{t("usersTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("usersSubtitle")}</p>

        <div className="relative mt-4 w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground">{t("loading")}</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {filteredUsers.map((user) => {
              const profileKey = getPublicProfileUrlKey({
                id: user.id,
                username: user.username,
              });
              const isExpanded = expandedId === user.id;
              const isSuspended =
                !!user.suspendedUntil && new Date(user.suspendedUntil) > new Date();
              return (
                <li key={user.id} className="rounded-lg border border-border bg-background/50">
                  <div className="flex flex-wrap items-center gap-3 p-3">
                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                      {user.image ? (
                        <Image
                          src={user.image}
                          alt=""
                          fill
                          sizes="36px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-primary">
                          {(user.name ?? user.email ?? "?").slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/${locale}/user/${encodeURIComponent(profileKey)}`}
                          className="text-sm font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {user.name ?? user.email ?? t("unknownUser")}
                        </Link>
                        <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {user.role}
                        </span>
                        {statusBadge(user)}
                      </div>
                      {user.email && (
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      {user.isBanned || isSuspended ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busyId === user.id}
                          onClick={() => void liftSanction(user)}
                        >
                          <RotateCcw className="mr-1 h-3.5 w-3.5" />
                          {t("liftSanction")}
                        </Button>
                      ) : (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openAction(user, "suspend")}
                          >
                            <Clock className="mr-1 h-3.5 w-3.5" />
                            {t("suspend")}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-red-500/40 text-red-700 hover:bg-red-500/10 dark:text-red-300"
                            onClick={() => openAction(user, "ban")}
                          >
                            <Ban className="mr-1 h-3.5 w-3.5" />
                            {t("ban")}
                          </Button>
                        </>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-destructive/40 text-destructive hover:bg-destructive/10"
                        onClick={() => openAction(user, "delete")}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        {t("deleteUser")}
                      </Button>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId((p) => (p === user.id ? null : user.id))
                        }
                        className="rounded-md border border-border p-1.5 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {isExpanded &&
                    (user.isBanned ||
                      user.banReason ||
                      user.suspendedUntil ||
                      user.suspendReason) && (
                      <div className="space-y-1 border-t border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
                        {user.isBanned && user.bannedAt && (
                          <p>
                            {t("bannedAtLabel")}: {new Date(user.bannedAt).toLocaleString(locale)}
                          </p>
                        )}
                        {user.banReason && (
                          <p>
                            {t("banReasonLabel")}:{" "}
                            <span className="text-foreground">{user.banReason}</span>
                          </p>
                        )}
                        {user.suspendedUntil && (
                          <p>
                            {t("suspendedUntilLabel")}:{" "}
                            {new Date(user.suspendedUntil).toLocaleString(locale)}
                          </p>
                        )}
                        {user.suspendReason && (
                          <p>
                            {t("suspendReasonLabel")}:{" "}
                            <span className="text-foreground">{user.suspendReason}</span>
                          </p>
                        )}
                      </div>
                    )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">{t("contentTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("contentSubtitle")}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {(["all", "comment", "chapter", "manga", "feedback"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setContentTypeFilter(f)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                contentTypeFilter === f
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40"
              )}
            >
              {t(`filterType.${f}`)}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["all", "today", "week", "month"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setContentDateFilter(f)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                contentDateFilter === f
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40"
              )}
            >
              {t(`filterDate.${f}`)}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {t("contentShowing", { shown: filteredContent.length, total: content.length })}
        </p>

        {contentLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">{t("loading")}</p>
        ) : content.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{t("contentEmpty")}</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {filteredContent.map((item) => (
              <li
                key={`${item.type}-${item.id}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-background/50 p-3"
              >
                <div className="shrink-0">{contentIcon(item.type)}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                  {item.sublabel && (
                    <p className="text-xs text-muted-foreground">{item.sublabel}</p>
                  )}
                  {item.authorLabel && (
                    <p className="text-xs text-muted-foreground">
                      {t("by")}: {item.authorLabel}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={deletingContentId === item.id}
                  onClick={() => void deleteContent(item)}
                  className="shrink-0 rounded-md border border-destructive/40 bg-destructive/10 p-1.5 text-destructive hover:bg-destructive/15 disabled:opacity-40"
                >
                  {deletingContentId === item.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {actionUser && actionType && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg">
            <h3 className="text-lg font-semibold text-foreground">
              {actionType === "ban" && t("confirmBanTitle")}
              {actionType === "suspend" && t("confirmSuspendTitle")}
              {actionType === "delete" && t("confirmDeleteTitle")}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("confirmTargetUser")}:{" "}
              <span className="font-medium text-foreground">
                {actionUser.name ?? actionUser.email}
              </span>
            </p>

            {actionType === "suspend" && (
              <div className="mt-3">
                <label className="text-xs text-muted-foreground">
                  {t("suspendDaysLabel")}
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={suspendDays}
                  onChange={(e) => setSuspendDays(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25"
                />
              </div>
            )}

            {actionType !== "delete" && (
              <div className="mt-3">
                <label className="text-xs text-muted-foreground">{t("reasonLabel")}</label>
                <textarea
                  rows={3}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder={t("reasonPlaceholder")}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25"
                />
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeAction}
                disabled={actionBusy}
              >
                {t("cancel")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={actionBusy}
                onClick={() => void submitAction()}
              >
                {actionBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t("confirm")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
