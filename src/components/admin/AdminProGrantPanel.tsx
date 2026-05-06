"use client";

import { useState, type ChangeEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Crown, Search, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const inputClass =
  "flex h-9 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/30 focus:ring-2";

type UserProInfo = {
  id: string;
  name: string | null;
  email: string | null;
  username: string | null;
  isPro: boolean;
  proExpiresAt: string | null;
};

const PRESETS = [
  { key: "days7", days: 7 },
  { key: "days30", days: 30 },
  { key: "days90", days: 90 },
  { key: "year1", days: 365 },
  { key: "permanent", days: 0 },
] as const;

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function AdminProGrantPanel() {
  const router = useRouter();
  const t = useTranslations("admin.proGrant");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [user, setUser] = useState<UserProInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setUser(null);
    setNotFound(false);
    try {
      const res = await fetch("/api/admin/users/list");
      if (!res.ok) {
        setNotFound(true);
        return;
      }
      const data = (await res.json()) as {
        users?: { id: string; email: string | null; username: string | null; name: string | null }[];
      };
      const q = query.trim().toLowerCase();
      const first = data.users?.find(
        (u) =>
          u.id === query.trim() ||
          (u.email != null && u.email.toLowerCase().includes(q)) ||
          (u.username != null && u.username.toLowerCase().includes(q)) ||
          (u.name != null && u.name.toLowerCase().includes(q))
      );
      if (!first) {
        setNotFound(true);
        return;
      }

      const proRes = await fetch(`/api/admin/users/${first.id}/pro`);
      if (!proRes.ok) {
        setNotFound(true);
        return;
      }
      const proData = (await proRes.json()) as UserProInfo;
      setUser(proData);
      setExpiresAt(proData.proExpiresAt ? proData.proExpiresAt.slice(0, 10) : "");
    } finally {
      setSearching(false);
    }
  }

  async function handleTogglePro(activate: boolean) {
    if (!user) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/pro`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPro: activate,
          proExpiresAt: activate && expiresAt ? expiresAt : null,
        }),
      });
      if (!res.ok) {
        toast.error(t("errorSave"));
        return;
      }
      const updated = (await res.json()) as Partial<UserProInfo>;
      setUser((prev) => (prev ? { ...prev, ...updated } : prev));
      toast.success(activate ? t("proActivated") : t("proDeactivated"));
      router.refresh();
    } catch {
      toast.error(t("errorSave"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-5 flex items-center gap-2">
        <Crown className="h-5 w-5 text-yellow-400" />
        <h2 className="text-lg font-bold">{t("title")}</h2>
      </div>

      {/* Buscador */}
      <div className="mb-4 flex gap-2">
        <input
          type="search"
          placeholder={t("searchPlaceholder")}
          value={query}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && void handleSearch()}
          className={cn(inputClass, "flex-1")}
        />
        <Button type="button" onClick={() => void handleSearch()} disabled={searching}>
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      {notFound && <p className="text-sm text-muted-foreground">{t("notFound")}</p>}

      {user && (
        <div className="space-y-4">
          {/* Info usuario */}
          <div className="flex items-center gap-3 rounded-lg bg-muted/40 p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{user.name ?? user.username ?? t("noName")}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <span
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                user.isPro
                  ? "bg-yellow-400/20 text-yellow-400"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {user.isPro ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              {user.isPro ? t("proActive") : t("noPro")}
            </span>
          </div>

          {/* Vencimiento actual */}
          {user.isPro && (
            <p className="text-xs text-muted-foreground">
              {t("expires")}
              {user.proExpiresAt
                ? new Date(user.proExpiresAt).toLocaleDateString("es-AR")
                : t("permanent")}
            </p>
          )}

          {/* Selector de duración */}
          <div>
            <p className="mb-2 text-sm font-medium">{t("durationLabel")}</p>
            <div className="mb-2 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setExpiresAt(p.days === 0 ? "" : addDays(p.days))}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    (p.days === 0 ? expiresAt === "" : expiresAt === addDays(p.days))
                      ? "border-yellow-400 bg-yellow-400/10 text-yellow-400"
                      : "border-border hover:border-foreground"
                  )}
                >
                  {t(p.key)}
                </button>
              ))}
            </div>
            <input
              type="date"
              value={expiresAt}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setExpiresAt(e.target.value)}
              className={cn(inputClass, "w-full")}
            />
            <p className="mt-1 text-xs text-muted-foreground">{t("permanentHint")}</p>
          </div>

          {/* Acciones */}
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => void handleTogglePro(true)}
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-yellow-500 to-amber-400 font-semibold text-black"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("activate")}
            </Button>
            {user.isPro && (
              <Button
                type="button"
                onClick={() => void handleTogglePro(false)}
                disabled={saving}
                variant="destructive"
                className="flex-1"
              >
                {t("deactivate")}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
