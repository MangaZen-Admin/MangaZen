"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Award, Pencil } from "lucide-react";
import { BadgeIcon } from "@/components/profile/BadgeIcon";
import { BADGE_ICON_KEYS } from "@/lib/badges/badge-icons";
import {
  BADGE_TRIGGER_TYPES,
  badgeTriggerShowsThreshold,
  isBadgeTriggerType,
} from "@/lib/badges/badge-trigger-types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type CatalogBadgeRow = {
  id: string;
  name: string;
  description: string;
  iconUrl: string | null;
  iconKey: string | null;
  isHighlighted: boolean;
  triggerType: string | null;
  triggerThreshold: number | null;
};

type Props = {
  initialBadges: CatalogBadgeRow[];
};

export function AdminBadgeCatalogPanel({ initialBadges }: Props) {
  const t = useTranslations("badges");
  const tShell = useTranslations("admin.shell");
  const router = useRouter();
  const [badges, setBadges] = useState(initialBadges);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [iconKey, setIconKey] = useState("");
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [triggerType, setTriggerType] = useState<string>("__none__");
  const [triggerThreshold, setTriggerThreshold] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    setBadges(initialBadges);
  }, [initialBadges]);

  function resetForm() {
    setName("");
    setDescription("");
    setIconUrl("");
    setIconKey("");
    setIsHighlighted(false);
    setTriggerType("__none__");
    setTriggerThreshold("");
    setEditingId(null);
  }

  function loadBadgeForEdit(b: CatalogBadgeRow) {
    setEditingId(b.id);
    setName(b.name);
    setDescription(b.description);
    setIconUrl(b.iconUrl ?? "");
    setIconKey(b.iconKey ?? "");
    setIsHighlighted(b.isHighlighted);
    setTriggerType(b.triggerType && b.triggerType.length > 0 ? b.triggerType : "__none__");
    setTriggerThreshold(
      b.triggerThreshold != null && badgeTriggerShowsThreshold(b.triggerType)
        ? String(b.triggerThreshold)
        : ""
    );
  }

  async function refreshList() {
    const res = await fetch("/api/admin/badges");
    if (!res.ok) return;
    const data = (await res.json()) as { badges: CatalogBadgeRow[] };
    setBadges(data.badges ?? []);
    router.refresh();
  }

  function buildTriggerPayload(): { triggerType: string | null; triggerThreshold: number | null } {
    if (triggerType === "__none__") {
      return { triggerType: null, triggerThreshold: null };
    }
    if (triggerType === "MANUAL") {
      return { triggerType: "MANUAL", triggerThreshold: null };
    }
    if (badgeTriggerShowsThreshold(triggerType)) {
      const n = Number(triggerThreshold);
      if (!Number.isFinite(n) || n < 0) {
        return { triggerType, triggerThreshold: null };
      }
      return { triggerType, triggerThreshold: Math.floor(n) };
    }
    return { triggerType, triggerThreshold: null };
  }

  async function submitBadge(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const tt = buildTriggerPayload();
    if (tt.triggerType && badgeTriggerShowsThreshold(tt.triggerType)) {
      if (tt.triggerThreshold == null || tt.triggerThreshold < 0) {
        return;
      }
    }
    setBusy(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/admin/badges/${encodeURIComponent(editingId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description,
            iconUrl: iconUrl.trim() || null,
            iconKey: iconKey || null,
            isHighlighted,
            triggerType: tt.triggerType,
            triggerThreshold: tt.triggerThreshold,
          }),
        });
        if (res.ok) {
          resetForm();
          await refreshList();
        }
      } else {
        const res = await fetch("/api/admin/badges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description,
            iconUrl: iconUrl.trim() || null,
            iconKey: iconKey || null,
            isHighlighted,
            triggerType: tt.triggerType,
            triggerThreshold: tt.triggerThreshold,
          }),
        });
        if (res.ok) {
          resetForm();
          await refreshList();
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function confirmRemoveBadge() {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    if (editingId === id) resetForm();
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/badges/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) return;
      await refreshList();
      setDeleteTarget(null);
    } finally {
      setBusy(false);
    }
  }

  const showThreshold =
    triggerType !== "__none__" && triggerType !== "MANUAL" && badgeTriggerShowsThreshold(triggerType);

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
        <Award className="h-4 w-4 text-primary" />
        {t("catalogTitle")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("catalogSubtitle")}</p>

      <form
        onSubmit={(e) => void submitBadge(e)}
        className="mt-4 space-y-3 rounded-lg border border-border bg-background/60 p-3"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {editingId ? t("catalogEditFormTitle") : t("catalogFormTitle")}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block text-xs text-muted-foreground">
            {t("catalogFieldName")}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              className="mt-1 w-full rounded-md border border-border bg-card px-2 py-1.5 text-sm text-foreground"
            />
          </label>
          <label className="block text-xs text-muted-foreground">
            {t("catalogFieldIconKey")}
            <Select value={iconKey || "__none__"} onValueChange={(v) => setIconKey(v === "__none__" ? "" : v)}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder={t("catalogIconKeyNone")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t("catalogIconKeyNone")}</SelectItem>
                {BADGE_ICON_KEYS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>
        <label className="block text-xs text-muted-foreground">
          {t("catalogFieldDescription")}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            minLength={4}
            rows={2}
            className="mt-1 w-full rounded-md border border-border bg-card px-2 py-1.5 text-sm text-foreground"
          />
        </label>
        <label className="block text-xs text-muted-foreground">
          {t("catalogFieldIconUrl")}
          <input
            value={iconUrl}
            onChange={(e) => setIconUrl(e.target.value)}
            placeholder="https://"
            className="mt-1 w-full rounded-md border border-border bg-card px-2 py-1.5 text-sm text-foreground"
          />
        </label>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block text-xs text-muted-foreground">
            {t("catalogFieldTriggerType")}
            <Select value={triggerType} onValueChange={setTriggerType}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t("triggerTypeNone")}</SelectItem>
                {BADGE_TRIGGER_TYPES.map((k) => (
                  <SelectItem key={k} value={k}>
                    {t(`triggerType.${k}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          {showThreshold ? (
            <label className="block text-xs text-muted-foreground">
              {t("catalogFieldTriggerThreshold")}
              <input
                type="number"
                min={0}
                required
                value={triggerThreshold}
                onChange={(e) => setTriggerThreshold(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-card px-2 py-1.5 text-sm text-foreground"
              />
            </label>
          ) : null}
        </div>

        <label className="flex items-center gap-2 text-xs text-foreground">
          <input
            type="checkbox"
            checked={isHighlighted}
            onChange={(e) => setIsHighlighted(e.target.checked)}
          />
          {t("catalogFieldHighlighted")}
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-md border border-primary bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            {editingId ? t("catalogSave") : t("catalogCreate")}
          </button>
          {editingId ? (
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => resetForm()}>
              {t("catalogCancelEdit")}
            </Button>
          ) : null}
        </div>
      </form>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-2 py-2">{t("catalogColIcon")}</th>
              <th className="px-2 py-2">{t("catalogColName")}</th>
              <th className="px-2 py-2">{t("catalogColTrigger")}</th>
              <th className="px-2 py-2">{t("catalogColDescription")}</th>
              <th className="px-2 py-2">{t("catalogColActions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {badges.map((b) => (
              <tr key={b.id} className="align-top">
                <td className="px-2 py-3">
                  <BadgeIcon
                    name={b.name}
                    description={b.description}
                    iconUrl={b.iconUrl}
                    iconKey={b.iconKey}
                    isHighlighted={b.isHighlighted}
                  />
                </td>
                <td className="px-2 py-3 font-medium text-foreground">
                  {b.name}
                  {b.isHighlighted ? (
                    <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
                      {t("catalogHighlightedTag")}
                    </span>
                  ) : null}
                </td>
                <td className="whitespace-nowrap px-2 py-3 text-xs text-muted-foreground">
                  {b.triggerType
                    ? `${isBadgeTriggerType(b.triggerType) ? t(`triggerType.${b.triggerType}`) : b.triggerType}${
                        b.triggerThreshold != null && badgeTriggerShowsThreshold(b.triggerType)
                          ? ` ≥ ${b.triggerThreshold}`
                          : ""
                      }`
                    : "—"}
                </td>
                <td className="max-w-md px-2 py-3 text-muted-foreground">{b.description}</td>
                <td className="px-2 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => loadBadgeForEdit(b)}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground hover:border-primary disabled:opacity-50"
                    >
                      <Pencil className="h-3 w-3" />
                      {t("catalogEdit")}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setDeleteTarget({ id: b.id, name: b.name })}
                      className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/15 disabled:opacity-50"
                    >
                      {t("catalogDelete")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent showClose={false} onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t("catalogDeleteDialogTitle")}</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? t("catalogDeleteDialogDescription", { name: deleteTarget.name })
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              {tShell("destructiveCancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => void confirmRemoveBadge()}
            >
              {tShell("destructiveConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
