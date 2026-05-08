"use client";

import { Fragment, useMemo, useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  FileEdit,
  Megaphone,
  Newspaper,
  Search,
  Shield,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { resolveApiErrorMessage } from "@/lib/api-error";
import { BadgeIcon } from "@/components/profile/BadgeIcon";
import { getPublicProfileUrlKey } from "@/lib/public-profile-url";
import { dateFnsLocaleFromAppLocale } from "@/lib/date-fns-locale";
import { cn } from "@/lib/utils";
import { ReauthDialog } from "@/components/security/ReauthDialog";
import { AdminProGrantPanel } from "@/components/admin/AdminProGrantPanel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TAB_VALUES = [
  "resumen",
  "usuarios",
  "scans",
  "contenido",
  "ediciones",
  "comunidad",
  "insignias",
  "novedades",
  "mensajes",
  "moderacion",
  "publicidad",
] as const;
export type AdminTabValue = (typeof TAB_VALUES)[number];

function normalizeTab(v: string | null | undefined): AdminTabValue {
  if (v && (TAB_VALUES as readonly string[]).includes(v)) return v as AdminTabValue;
  return "resumen";
}

type Badge = {
  id: string;
  name: string;
  description: string;
  iconUrl: string | null;
  iconKey: string | null;
  isHighlighted: boolean;
};

type AdminUser = {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  image?: string | null;
  proPlan?: string | null;
  role: "ADMIN" | "SCAN" | "CREATOR" | "USER";
  acceptedScanTermsAt?: Date | string | null;
  isTrusted?: boolean;
  zenCoins: number;
  zenShards: number;
  badges: Badge[];
};

type RadarEvent = {
  id: string;
  message: string;
  createdAt: string;
};

export type AdminPanelShellProps = {
  initialTab: string | null | undefined;
  users: AdminUser[];
  badges: Badge[];
  radarEvents: RadarEvent[];
  stats: {
    totalUsers: number;
    usersWithPilar: number;
    totalZenCoins: number;
    totalZenShards: number;
  };
  /** Mangas + capítulos pendientes de revisión (badge pestaña Contenido). */
  pendingContentReviewCount: number;
  /** Subidas pendientes atribuibles a usuarios SCAN/CREATOR (badge pestaña Scans). */
  pendingScanChaptersCount: number;
  pendingCreatorCount: number;
  tabScans: ReactNode;
  tabContenido: ReactNode;
  tabEdiciones: ReactNode;
  tabComunidad: ReactNode;
  tabInsignias: ReactNode;
  tabNovedades: ReactNode;
  tabMensajes: ReactNode;
  tabModeracion: ReactNode;
  tabPublicidad: ReactNode;
};

export default function AdminPanelShell({
  initialTab,
  users: initialUsers,
  badges,
  radarEvents: initialRadarEvents,
  stats,
  pendingContentReviewCount,
  pendingScanChaptersCount,
  pendingCreatorCount,
  tabScans,
  tabContenido,
  tabEdiciones,
  tabComunidad,
  tabInsignias,
  tabNovedades,
  tabMensajes,
  tabModeracion,
  tabPublicidad,
}: AdminPanelShellProps) {
  const t = useTranslations("admin.shell");
  const tBadges = useTranslations("admin.userBadges");
  const locale = useLocale();
  const dfLocale = useMemo(() => dateFnsLocaleFromAppLocale(locale), [locale]);
  const PLAN_LABELS: Record<string, string> = useMemo(
    () => ({
      none: t("proFrameNone"),
      bronze: t("proFrameBronze"),
      silver: t("proFrameSilver"),
      gold: t("proFrameGold"),
      platinum: t("proFramePlatinum"),
    }),
    [t]
  );
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<AdminTabValue>(() => normalizeTab(initialTab ?? undefined));

  useEffect(() => {
    const tabFromUrl = normalizeTab(searchParams.get("tab"));
    setTab(tabFromUrl);
  }, [searchParams]);

  function navigateToTab(next: AdminTabValue) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("tab", next);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }

  const [users, setUsers] = useState(initialUsers);
  const [pointInputs, setPointInputs] = useState<Record<string, string>>({});
  const [shardInputs, setShardInputs] = useState<Record<string, string>>({});
  const [selectedBadgeByUser, setSelectedBadgeByUser] = useState<Record<string, string>>({});
  const [radarEvents, setRadarEvents] = useState(initialRadarEvents);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [reauthOpen, setReauthOpen] = useState(false);
  const [reauthBusy, setReauthBusy] = useState(false);
  const [reauthMountKey, setReauthMountKey] = useState(0);
  const [pendingZen, setPendingZen] = useState<{ user: AdminUser; delta: number } | null>(null);
  const [pendingZenType, setPendingZenType] = useState<"coins" | "shards">("coins");
  const [revokeDialog, setRevokeDialog] = useState<{ user: AdminUser; badge: Badge } | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(1);
  const USER_PAGE_SIZE = 20;

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  useEffect(() => {
    setRadarEvents(initialRadarEvents);
  }, [initialRadarEvents]);

  useEffect(() => {
    setUserPage(1);
  }, [userSearch]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const paginatedUsers = useMemo(
    () => filteredUsers.slice(0, userPage * USER_PAGE_SIZE),
    [filteredUsers, userPage]
  );

  const hasMoreUsers = filteredUsers.length > userPage * USER_PAGE_SIZE;

  const cards = useMemo(
    () => [
      { key: "total", title: t("metricTotalUsers"), value: stats.totalUsers.toLocaleString(locale), icon: Users },
      {
        key: "pilar",
        title: t("metricPilarUsers"),
        value: stats.usersWithPilar.toLocaleString(locale),
        icon: UserCheck,
      },
      {
        key: "zenCoins",
        title: t("metricZenCoins"),
        value: stats.totalZenCoins.toLocaleString(locale),
        icon: Sparkles,
      },
      {
        key: "zenShards",
        title: t("metricZenShards"),
        value: stats.totalZenShards.toLocaleString(locale),
        icon: Sparkles,
      },
    ],
    [stats, t, locale]
  );

  function pushRadarEvent(message: string) {
    const event = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      message,
      createdAt: new Date().toISOString(),
    };
    setRadarEvents((prev) => [event, ...prev].slice(0, 5));
  }

  function updateLocalUser(nextUser: AdminUser) {
    setUsers((prev) => prev.map((u) => (u.id === nextUser.id ? nextUser : u)));
  }

  async function applyRoleChange(user: AdminUser, role: AdminUser["role"]) {
    if (user.role === role) return;
    setBusyUserId(user.id);
    try {
      const res = await fetch("/api/admin/users/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, role }),
      });
      let body: Record<string, unknown> = {};
      try {
        body = (await res.json()) as Record<string, unknown>;
      } catch {
        /* ignore */
      }
      if (!res.ok) {
        toast.error(resolveApiErrorMessage(body, t, "updateUserError", "errors"));
        return;
      }
      const data = body as { user: AdminUser };
      updateLocalUser(data.user);
      pushRadarEvent(
        t("radarRoleChange", {
          name: user.name ?? user.email ?? t("unknownUser"),
          role: data.user.role,
        })
      );
    } finally {
      setBusyUserId(null);
    }
  }

  function handleRoleChange(user: AdminUser, newRole: AdminUser["role"]) {
    if (user.role === newRole) return;
    void applyRoleChange(user, newRole);
  }

  async function postZenDelta(user: AdminUser, delta: number, reauthPassword?: string) {
    const body: Record<string, unknown> = { userId: user.id, zenPointsDelta: delta };
    if (reauthPassword) body.reauth_password = reauthPassword;
    return fetch("/api/admin/users/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function applyPoints(user: AdminUser) {
    const raw = pointInputs[user.id] ?? "";
    const delta = Number(raw);
    if (!Number.isFinite(delta) || delta === 0) return;
    setBusyUserId(user.id);
    try {
      const res = await postZenDelta(user, delta);
      let body: Record<string, unknown> = {};
      try {
        body = (await res.json()) as Record<string, unknown>;
      } catch {
        /* ignore */
      }
      if (res.status === 403) {
        const j = body as { error?: string; reauthType?: string };
        if (j.error === "REAUTH_REQUIRED" && j.reauthType === "password") {
          setPendingZenType("coins");
          setPendingZen({ user, delta });
          setReauthMountKey((k) => k + 1);
          setReauthOpen(true);
          return;
        }
      }
      if (!res.ok) {
        toast.error(resolveApiErrorMessage(body, t, "updateUserError", "errors"));
        return;
      }
      const data = body as { user: AdminUser };
      updateLocalUser(data.user);
      setPointInputs((prev) => ({ ...prev, [user.id]: "" }));
      const action = delta > 0 ? t("radarZenAdded") : t("radarZenRemoved");
      pushRadarEvent(
        t("radarZenAdjust", {
          action,
          amount: Math.abs(delta),
          name: user.name ?? user.email ?? t("unknownUser"),
        })
      );
    } finally {
      setBusyUserId(null);
    }
  }

  async function applyShards(user: AdminUser) {
    const raw = shardInputs[user.id]?.trim();
    if (!raw) return;
    const delta = Number(raw);
    if (!Number.isFinite(delta) || delta === 0) return;
    setBusyUserId(user.id);
    try {
      const res = await fetch("/api/admin/users/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, zenShardsDelta: delta }),
      });
      let body: Record<string, unknown> = {};
      try {
        body = (await res.json()) as Record<string, unknown>;
      } catch {
        /* ignore */
      }

      if (res.status === 403 && body.error === "REAUTH_REQUIRED") {
        setPendingZenType("shards");
        setPendingZen({ user, delta });
        setReauthMountKey((k) => k + 1);
        setReauthOpen(true);
        return;
      }

      if (!res.ok) {
        toast.error(t("updateUserError"));
        return;
      }
      const data = body as { user: AdminUser };
      updateLocalUser(data.user);
      const action = delta > 0 ? t("radarZenAdded") : t("radarZenRemoved");
      pushRadarEvent(
        t("radarZenAdjust", {
          action,
          amount: Math.abs(delta),
          name: user.name ?? user.email ?? t("unknownUser"),
        })
      );
      setShardInputs((prev) => ({ ...prev, [user.id]: "" }));
    } finally {
      setBusyUserId(null);
    }
  }

  async function confirmZenReauth(password: string) {
    if (!pendingZen) return;
    setReauthBusy(true);
    setBusyUserId(pendingZen.user.id);
    try {
      const res = await fetch("/api/admin/users/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: pendingZen.user.id,
          ...(pendingZenType === "coins"
            ? { zenPointsDelta: pendingZen.delta }
            : { zenShardsDelta: pendingZen.delta }),
          reauth_password: password,
        }),
      });
      let body: Record<string, unknown> = {};
      try {
        body = (await res.json()) as Record<string, unknown>;
      } catch {
        /* ignore */
      }
      if (!res.ok) {
        toast.error(resolveApiErrorMessage(body, t, "updateUserError", "errors"));
        return;
      }
      const data = body as { user: AdminUser };
      const { user, delta } = pendingZen;
      updateLocalUser(data.user);
      if (pendingZenType === "coins") {
        setPointInputs((prev) => ({ ...prev, [user.id]: "" }));
      } else {
        setShardInputs((prev) => ({ ...prev, [user.id]: "" }));
      }
      const action = delta > 0 ? t("radarZenAdded") : t("radarZenRemoved");
      pushRadarEvent(
        t("radarZenAdjust", {
          action,
          amount: Math.abs(delta),
          name: user.name ?? user.email ?? t("unknownUser"),
        })
      );
      setReauthOpen(false);
      setPendingZen(null);
    } finally {
      setReauthBusy(false);
      setBusyUserId(null);
    }
  }

  async function assignBadge(user: AdminUser, badgeId: string) {
    if (!badgeId) return;
    setBusyUserId(user.id);
    try {
      const res = await fetch("/api/admin/badges/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, badgeId }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        user: { id: string; badges: Badge[] };
      };
      setUsers((prev) =>
        prev.map((u) => (u.id === data.user.id ? { ...u, badges: data.user.badges } : u))
      );
      const badge = badges.find((b) => b.id === badgeId);
      pushRadarEvent(
        t("radarBadgeAssigned", {
          badge: badge?.name ?? t("unknownBadge"),
          name: user.name ?? user.email ?? t("unknownUser"),
        })
      );
    } finally {
      setBusyUserId(null);
    }
  }

  async function confirmRevokeBadge() {
    if (!revokeDialog) return;
    const { user, badge } = revokeDialog;
    setBusyUserId(user.id);
    try {
      const res = await fetch("/api/admin/badges/revoke", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, badgeId: badge.id }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        user: { id: string; badges: Badge[] };
      };
      setUsers((prev) =>
        prev.map((u) => (u.id === data.user.id ? { ...u, badges: data.user.badges } : u))
      );
      pushRadarEvent(
        t("radarBadgeRevoked", {
          badge: badge.name,
          name: user.name ?? user.email ?? t("unknownUser"),
        })
      );
      setRevokeDialog(null);
    } finally {
      setBusyUserId(null);
    }
  }

  async function setProFrame(user: AdminUser, proPlan: string | null) {
    setBusyUserId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/pro-frame`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proPlan }),
      });
      if (!res.ok) {
        toast.error(t("proFrameError"));
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, proPlan } : u))
      );
      toast.success(t("proFrameSuccess"));
    } catch {
      toast.error(t("proFrameError"));
    } finally {
      setBusyUserId(null);
    }
  }

  function TabBadge({ count }: { count: number }) {
    if (count <= 0) return null;
    return (
      <span className="min-w-[1.1rem] rounded-full bg-destructive px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none text-destructive-foreground">
        {count > 99 ? "99+" : count}
      </span>
    );
  }

  return (
    <div className="space-y-5">
      <Tabs value={tab} onValueChange={(v) => navigateToTab(normalizeTab(v))} className="w-full">
        <TabsList className="flex h-auto min-h-10 w-full flex-wrap justify-start gap-1 p-1 sm:flex-nowrap">
          <TabsTrigger value="resumen" className="gap-1.5">
            {t("tabResumen")}
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="gap-1.5">
            {t("tabUsuarios")}
          </TabsTrigger>
          <TabsTrigger value="scans" className="gap-1.5">
            {t("tabScans")}
            <TabBadge count={pendingScanChaptersCount} />
          </TabsTrigger>
          <TabsTrigger value="contenido" className="gap-1.5">
            {t("tabContenido")}
            <TabBadge count={pendingContentReviewCount} />
          </TabsTrigger>
          <TabsTrigger value="ediciones" className="gap-1.5">
            <FileEdit className="h-3.5 w-3.5" aria-hidden />
            {t("tabEdiciones")}
          </TabsTrigger>
          <TabsTrigger value="comunidad" className="gap-1.5">
            {t("tabComunidad")}
            <TabBadge count={pendingCreatorCount} />
          </TabsTrigger>
          <TabsTrigger value="insignias" className="gap-1.5">
            {t("tabInsignias")}
          </TabsTrigger>
          <TabsTrigger value="novedades" className="gap-1.5">
            <Newspaper className="h-3.5 w-3.5" aria-hidden />
            {t("tabNovedades")}
          </TabsTrigger>
          <TabsTrigger value="mensajes" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" aria-hidden />
            {t("tabMensajes")}
          </TabsTrigger>
          <TabsTrigger value="moderacion" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" aria-hidden />
            {t("tabModeracion")}
          </TabsTrigger>
          <TabsTrigger value="publicidad" className="gap-1.5">
            <Megaphone className="h-3.5 w-3.5" aria-hidden />
            {t("tabPublicidad")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-5 space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {cards.map(({ key, title, value, icon: Icon }) => (
              <div
                key={key}
                className="rounded-xl border border-primary/20 bg-card p-4 shadow-sm transition-colors duration-200 dark:border-border dark:shadow-none"
              >
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" />
                  {title}
                </p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </div>

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Shield className="h-4 w-4 text-primary" />
              {t("radarTitle")}
            </h2>
            <div className="mt-3 space-y-2">
              {radarEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("radarEmpty")}</p>
              ) : (
                radarEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <p className="text-foreground">{event.message}</p>
                    <time
                      dateTime={event.createdAt}
                      className="shrink-0 text-xs text-muted-foreground"
                    >
                      {formatDistanceToNow(new Date(event.createdAt), {
                        addSuffix: true,
                        locale: dfLocale,
                      })}
                    </time>
                  </div>
                ))
              )}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="usuarios" className="mt-5 space-y-6">
          <AdminProGrantPanel />

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder={t("userSearchPlaceholder")}
                  className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t("userShowingCount", {
                  shown: paginatedUsers.length,
                  total: filteredUsers.length,
                })}
              </p>
            </div>

            <ul className="mt-5 space-y-3">
              {paginatedUsers.map((user) => {
                const isOpen = detailUserId === user.id;
                return (
                  <li
                    key={user.id}
                    className="overflow-hidden rounded-xl border border-border bg-background transition-shadow hover:shadow-sm"
                  >
                    {/* Fila principal */}
                    <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                      {/* Avatar */}
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                        {user.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={user.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-primary">
                            {(user.name ?? user.email ?? "U").slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/${locale}/user/${encodeURIComponent(
                            getPublicProfileUrlKey({ id: user.id, username: user.username })
                          )}`}
                          className="text-sm font-semibold text-primary hover:underline"
                        >
                          {user.name ?? t("unknownUser")}
                        </Link>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {user.email ?? "-"}
                        </p>
                      </div>

                      {/* Rol */}
                      <div className="shrink-0">
                        <Select
                          value={user.role}
                          onValueChange={(v) => handleRoleChange(user, v as AdminUser["role"])}
                          disabled={busyUserId === user.id}
                        >
                          <SelectTrigger className="h-8 w-[120px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USER">USER</SelectItem>
                            <SelectItem value="SCAN">SCAN</SelectItem>
                            <SelectItem value="CREATOR">CREATOR</SelectItem>
                            <SelectItem value="ADMIN">ADMIN</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Zen */}
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-medium tabular-nums text-foreground">
                          {user.zenCoins.toLocaleString(locale)} ZC
                        </p>
                        <p className="text-xs tabular-nums text-muted-foreground">
                          {user.zenShards.toLocaleString(locale)} ZS
                        </p>
                      </div>

                      {/* Toggle detalle */}
                      <button
                        type="button"
                        onClick={() =>
                          setDetailUserId((prev) => (prev === user.id ? null : user.id))
                        }
                        className="shrink-0 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                      >
                        {isOpen ? tBadges("hideDetail") : tBadges("viewDetail")}
                      </button>
                    </div>

                    {/* Panel de detalle expandible */}
                    {isOpen && (
                      <div className="border-t border-border bg-muted/20 px-5 py-5">
                        {(user.role === "SCAN" || user.role === "CREATOR") &&
                          user.acceptedScanTermsAt && (
                            <p className="mb-4 text-xs text-muted-foreground">
                              {t("scanTermsAcceptedAt")}:{" "}
                              {new Date(user.acceptedScanTermsAt).toLocaleString(locale)}
                            </p>
                          )}

                        <div className="grid gap-4 sm:grid-cols-2">
                          {/* Ajustar ZC */}
                          <div className="rounded-xl border border-border bg-background p-4">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {t("zenAdjustButton")} — ZC
                            </p>
                            <div className="flex items-center gap-2">
                              <input
                                value={pointInputs[user.id] ?? ""}
                                onChange={(e) =>
                                  setPointInputs((prev) => ({
                                    ...prev,
                                    [user.id]: e.target.value,
                                  }))
                                }
                                placeholder={t("zenAdjustPlaceholder")}
                                className="h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/25"
                              />
                              <Button
                                type="button"
                                size="sm"
                                disabled={busyUserId === user.id}
                                onClick={() => void applyPoints(user)}
                              >
                                {t("zenApplyButton")}
                              </Button>
                            </div>
                          </div>

                          {/* Ajustar ZS */}
                          <div className="rounded-xl border border-border bg-background p-4">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {t("zenAdjustButton")} — ZS
                            </p>
                            <div className="flex items-center gap-2">
                              <input
                                value={shardInputs[user.id] ?? ""}
                                onChange={(e) =>
                                  setShardInputs((prev) => ({
                                    ...prev,
                                    [user.id]: e.target.value,
                                  }))
                                }
                                placeholder={t("zenAdjustPlaceholder")}
                                className="h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/25"
                              />
                              <Button
                                type="button"
                                size="sm"
                                disabled={busyUserId === user.id}
                                onClick={() => void applyShards(user)}
                              >
                                {t("zenApplyButton")}
                              </Button>
                            </div>
                          </div>

                          {/* Asignar insignia */}
                          <div className="rounded-xl border border-border bg-background p-4">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {t("badgeAssignButton")}
                            </p>
                            <div className="flex items-center gap-2">
                              <Select
                                value={selectedBadgeByUser[user.id] ?? "__none__"}
                                onValueChange={(v) =>
                                  setSelectedBadgeByUser((prev) => ({
                                    ...prev,
                                    [user.id]: v === "__none__" ? "" : v,
                                  }))
                                }
                              >
                                <SelectTrigger className="h-9 text-xs">
                                  <SelectValue placeholder={t("badgeAssignPlaceholder")} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">
                                    {t("badgeAssignPlaceholder")}
                                  </SelectItem>
                                  {badges.map((badge) => (
                                    <SelectItem key={badge.id} value={badge.id}>
                                      {badge.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                type="button"
                                size="sm"
                                disabled={
                                  busyUserId === user.id || !selectedBadgeByUser[user.id]
                                }
                                onClick={() =>
                                  void assignBadge(user, selectedBadgeByUser[user.id] ?? "")
                                }
                              >
                                {t("badgeAssignButton")}
                              </Button>
                            </div>
                          </div>

                          {/* Marco Pro */}
                          <div className="rounded-xl border border-border bg-background p-4">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {t("proFrameTitle")}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {(["none", "bronze", "silver", "gold", "platinum"] as const).map(
                                (plan) => (
                                  <button
                                    key={plan}
                                    type="button"
                                    disabled={busyUserId === user.id}
                                    onClick={() =>
                                      void setProFrame(user, plan === "none" ? null : plan)
                                    }
                                    className={cn(
                                      "rounded-full border px-3 py-1 text-xs font-medium transition",
                                      user.proPlan === (plan === "none" ? null : plan)
                                        ? "border-primary bg-primary/20 text-foreground"
                                        : "border-border text-muted-foreground hover:border-primary/40"
                                    )}
                                  >
                                    {PLAN_LABELS[plan]}
                                  </button>
                                )
                              )}
                            </div>
                          </div>

                          {/* Insignias asignadas */}
                          {user.badges.length > 0 && (
                            <div className="rounded-xl border border-border bg-background p-4 sm:col-span-2">
                              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {tBadges("sectionTitle")}
                              </p>
                              <ul className="flex flex-col gap-2">
                                {user.badges.map((badge) => (
                                  <li
                                    key={badge.id}
                                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2"
                                  >
                                    <div className="flex min-w-0 flex-1 items-center gap-3">
                                      <BadgeIcon
                                        name={badge.name}
                                        description={badge.description}
                                        iconUrl={badge.iconUrl}
                                        iconKey={badge.iconKey}
                                        isHighlighted={badge.isHighlighted}
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      disabled={busyUserId === user.id}
                                      onClick={() => setRevokeDialog({ user, badge })}
                                      className="shrink-0 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive transition hover:bg-destructive/20 disabled:opacity-40"
                                    >
                                      {tBadges("revoke")}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {hasMoreUsers && (
              <div className="mt-5 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setUserPage((p) => p + 1)}
                >
                  {t("userLoadMore")}
                </Button>
              </div>
            )}
          </section>
        </TabsContent>

        <TabsContent value="scans" className="mt-5 space-y-5">
          {tabScans}
        </TabsContent>

        <TabsContent value="contenido" className="mt-5 space-y-5">
          {tabContenido}
        </TabsContent>

        <TabsContent value="ediciones" className="mt-5 space-y-5">
          {tabEdiciones}
        </TabsContent>

        <TabsContent value="comunidad" className="mt-5 space-y-5">
          {tabComunidad}
        </TabsContent>

        <TabsContent value="insignias" className="mt-5">
          {tabInsignias}
        </TabsContent>

        <TabsContent value="novedades" className="mt-5 space-y-5">
          {tabNovedades}
        </TabsContent>

        <TabsContent value="mensajes" className="mt-5 space-y-5">
          {tabMensajes}
        </TabsContent>

        <TabsContent value="moderacion" className="mt-5 space-y-5">
          {tabModeracion}
        </TabsContent>

        <TabsContent value="publicidad" className="mt-5 space-y-5">
          {tabPublicidad}
        </TabsContent>
      </Tabs>

      <Dialog
        open={revokeDialog != null}
        onOpenChange={(open) => {
          if (!open) setRevokeDialog(null);
        }}
      >
        <DialogContent showClose={false} onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{tBadges("revokeDialogTitle")}</DialogTitle>
            <DialogDescription>
              {revokeDialog
                ? tBadges("revokeDialogDescription", { badgeName: revokeDialog.badge.name })
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setRevokeDialog(null)}>
              {t("destructiveCancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busyUserId != null}
              onClick={() => void confirmRevokeBadge()}
            >
              {t("destructiveConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReauthDialog
        key={reauthMountKey}
        open={reauthOpen}
        reauthType={reauthOpen ? "password" : null}
        onClose={() => {
          setReauthOpen(false);
          setPendingZen(null);
        }}
        onConfirm={(pwd) => confirmZenReauth(pwd)}
        busy={reauthBusy}
      />
    </div>
  );
}
