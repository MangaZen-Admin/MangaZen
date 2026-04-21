"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export type CreatorRequestRow = {
  id: string;
  createdAt: string;
  projectName: string;
  description: string;
  sampleLink: string | null;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
};

type Props = {
  initialRequests: CreatorRequestRow[];
};

export function AdminCreatorRequestsPanel({ initialRequests }: Props) {
  const t = useTranslations("admin.creatorRequests");
  const [requests, setRequests] = useState(initialRequests);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function approve(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/creator-requests/${id}/approve`, { method: "POST" });
      if (!res.ok) {
        toast.error(t("toastError"));
        return;
      }
      setRequests((prev) => prev.filter((r) => r.id !== id));
      toast.success(t("toastApproved"));
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/creator-requests/${id}/reject`, { method: "POST" });
      if (!res.ok) {
        toast.error(t("toastError"));
        return;
      }
      setRequests((prev) => prev.filter((r) => r.id !== id));
      toast.success(t("toastRejected"));
    } finally {
      setBusyId(null);
    }
  }

  if (requests.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-base font-semibold text-foreground">{t("title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("empty")}</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="text-base font-semibold text-foreground">{t("title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-2 py-2">{t("colUser")}</th>
              <th className="px-2 py-2">{t("colProject")}</th>
              <th className="px-2 py-2">{t("colDescription")}</th>
              <th className="px-2 py-2">{t("colLink")}</th>
              <th className="px-2 py-2">{t("colActions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {requests.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="px-2 py-3 text-foreground">
                  <div className="font-medium">{r.user.name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{r.user.email ?? ""}</div>
                </td>
                <td className="px-2 py-3 text-foreground">{r.projectName}</td>
                <td className="max-w-md whitespace-pre-wrap px-2 py-3 text-muted-foreground">
                  {r.description}
                </td>
                <td className="px-2 py-3">
                  {r.sampleLink ? (
                    <a
                      href={r.sampleLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      {t("linkOpen")}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-2 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => void approve(r.id)}
                      className="rounded-md border border-primary bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                    >
                      {t("approve")}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => void reject(r.id)}
                      className="rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-foreground hover:bg-muted/80 disabled:opacity-50"
                    >
                      {t("reject")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
