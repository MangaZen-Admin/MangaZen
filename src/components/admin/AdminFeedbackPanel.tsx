"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { FeedbackCategory, FeedbackStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
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

export type AdminFeedbackRow = {
  id: string;
  title: string;
  body: string;
  category: FeedbackCategory;
  status: FeedbackStatus;
  createdAt: string;
  authorLabel: string;
  netScore: number;
};

type Props = {
  initialRows: AdminFeedbackRow[];
};

const STATUSES: FeedbackStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const CATEGORIES: FeedbackCategory[] = ["BUG", "SUGGESTION", "PRAISE"];

export function AdminFeedbackPanel({ initialRows }: Props) {
  const t = useTranslations("feedback");
  const tShell = useTranslations("admin.shell");
  const [rows, setRows] = useState(initialRows);
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<FeedbackCategory | "ALL">("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminFeedbackRow | null>(null);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (categoryFilter !== "ALL" && r.category !== categoryFilter) return false;
      return true;
    });
  }, [rows, statusFilter, categoryFilter]);

  async function updateStatus(id: string, status: FeedbackStatus) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        feedback: { id: string; status: FeedbackStatus; updatedAt: string };
      };
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: data.feedback.status } : r))
      );
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setRows((prev) => prev.filter((r) => r.id !== id));
      setDeleteTarget(null);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm dark:shadow-none">
      <h2 className="text-lg font-semibold text-foreground">{t("adminSectionTitle")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("adminSectionSubtitle")}</p>

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">{t("adminFilterStatus")}</label>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as FeedbackStatus | "ALL")}
          >
            <SelectTrigger className="rounded-lg text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("filterAll")}</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`status${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">{t("adminFilterCategory")}</label>
          <Select
            value={categoryFilter}
            onValueChange={(v) => setCategoryFilter(v as FeedbackCategory | "ALL")}
          >
            <SelectTrigger className="rounded-lg text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("filterAll")}</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {t(`category${c}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted-foreground">
              <th className="pb-2 pr-3">{t("adminColTitle")}</th>
              <th className="pb-2 pr-3">{t("adminColAuthor")}</th>
              <th className="pb-2 pr-3">{t("adminColCategory")}</th>
              <th className="pb-2 pr-3">{t("adminColScore")}</th>
              <th className="pb-2 pr-3">{t("adminColStatus")}</th>
              <th className="pb-2">{t("adminColActions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((row) => (
              <tr key={row.id} className="align-top">
                <td className="py-3 pr-3">
                  <p className="font-medium text-foreground">{row.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{row.body}</p>
                </td>
                <td className="py-3 pr-3 text-muted-foreground">{row.authorLabel}</td>
                <td className="py-3 pr-3">
                  <span className="text-xs">{t(`category${row.category}`)}</span>
                </td>
                <td className="py-3 pr-3 font-mono text-xs tabular-nums">{row.netScore}</td>
                <td className="py-3 pr-3">
                  <Select
                    value={row.status}
                    disabled={busyId === row.id}
                    onValueChange={(v) => void updateStatus(row.id, v as FeedbackStatus)}
                  >
                    <SelectTrigger
                      className={cn(
                        "max-w-[10rem] h-8 text-xs",
                        busyId === row.id && "opacity-50"
                      )}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {t(`status${s}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="py-3">
                  <button
                    type="button"
                    disabled={busyId === row.id}
                    onClick={() => setDeleteTarget(row)}
                    className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/15 disabled:opacity-50"
                  >
                    {t("adminDelete")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">{t("adminEmpty")}</p>
        )}
      </div>

      <Dialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent showClose={false} onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t("adminDeleteDialogTitle")}</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? t("adminDeleteDialogDescription", { title: deleteTarget.title })
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
              disabled={busyId != null}
              onClick={() => void confirmDelete()}
            >
              {tShell("destructiveConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
