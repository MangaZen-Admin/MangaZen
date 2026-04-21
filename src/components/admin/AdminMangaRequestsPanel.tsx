"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export type MangaRequestAdminRow = {
  id: string;
  createdAt: string;
  title: string;
  author: string | null;
  notes: string | null;
  requesterLabel: string;
  requesterEmail: string | null;
};

type Props = {
  initialRows: MangaRequestAdminRow[];
};

export function AdminMangaRequestsPanel({ initialRows }: Props) {
  const t = useTranslations("mangaRequest");
  const [rows, setRows] = useState(initialRows);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  async function approve(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/manga-requests/${encodeURIComponent(id)}/approve`, {
        method: "POST",
      });
      if (!res.ok) {
        toast.error(t("adminToastError"));
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success(t("adminToastApproved"));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmReject(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/manga-requests/${encodeURIComponent(id)}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() || undefined }),
      });
      if (!res.ok) {
        toast.error(t("adminToastError"));
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      setRejectingId(null);
      setRejectReason("");
      toast.success(t("adminToastRejected"));
    } finally {
      setBusyId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-base font-semibold text-foreground">{t("adminSectionTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("adminEmpty")}</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="text-base font-semibold text-foreground">{t("adminSectionTitle")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("adminSubtitle")}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-2 py-2">{t("adminColRequester")}</th>
              <th className="px-2 py-2">{t("adminColTitle")}</th>
              <th className="px-2 py-2">{t("adminColAuthor")}</th>
              <th className="px-2 py-2">{t("adminColNotes")}</th>
              <th className="px-2 py-2">{t("adminColActions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="px-2 py-3 text-foreground">
                  <div className="font-medium">{r.requesterLabel}</div>
                  <div className="text-xs text-muted-foreground">{r.requesterEmail ?? ""}</div>
                </td>
                <td className="px-2 py-3 font-medium text-foreground">{r.title}</td>
                <td className="px-2 py-3 text-muted-foreground">{r.author ?? "—"}</td>
                <td className="max-w-xs whitespace-pre-wrap px-2 py-3 text-muted-foreground">
                  {r.notes ?? "—"}
                </td>
                <td className="px-2 py-3">
                  {rejectingId === r.id ? (
                    <div className="flex min-w-[12rem] flex-col gap-2">
                      <label className="text-xs text-muted-foreground" htmlFor={`rej-${r.id}`}>
                        {t("adminRejectReasonLabel")}
                      </label>
                      <textarea
                        id={`rej-${r.id}`}
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={2}
                        className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
                      />
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          onClick={() => void confirmReject(r.id)}
                          className="rounded border border-destructive bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive"
                        >
                          {t("adminConfirmReject")}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          onClick={() => {
                            setRejectingId(null);
                            setRejectReason("");
                          }}
                          className="rounded border border-border px-2 py-1 text-xs"
                        >
                          {t("adminCancelReject")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busyId != null}
                        onClick={() => void approve(r.id)}
                        className="rounded border border-primary bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                      >
                        {t("adminApprove")}
                      </button>
                      <button
                        type="button"
                        disabled={busyId != null}
                        onClick={() => {
                          setRejectingId(r.id);
                          setRejectReason("");
                        }}
                        className="rounded border border-border px-2 py-1 text-xs font-medium"
                      >
                        {t("adminReject")}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
