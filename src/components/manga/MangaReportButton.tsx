"use client";

import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Props = {
  mangaSlug: string;
  isAuthenticated: boolean;
  initialReportCount: number;
};

const MAX_REPORTS = 5;

export function MangaReportButton({ mangaSlug, isAuthenticated, initialReportCount }: Props) {
  const t = useTranslations("mangaReport");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("WRONG_INFO");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [reported, setReported] = useState(false);
  const [reportCount] = useState(initialReportCount);
  const REASONS = [
    { value: "WRONG_INFO", label: t("reasonWrongInfo") },
    { value: "WRONG_COVER", label: t("reasonWrongCover") },
    { value: "DUPLICATE", label: t("reasonDuplicate") },
    { value: "INAPPROPRIATE", label: t("reasonInappropriate") },
    { value: "OTHER", label: t("reasonOther") },
  ];

  if (reportCount >= MAX_REPORTS) {
    return (
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Flag className="h-3.5 w-3.5 text-destructive" />
        {t("alreadyReportedMax")}
      </p>
    );
  }

  if (reported) {
    return (
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Flag className="h-3.5 w-3.5 text-primary" />
        {t("thankYou")}
      </p>
    );
  }

  async function handleSubmit() {
    if (!isAuthenticated) {
      toast.error(t("loginRequired"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/manga/${mangaSlug}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, details }),
      });
      if (res.status === 409) {
        const data = (await res.json()) as { error: string };
        if (data.error === "ALREADY_REPORTED") {
          toast.error(t("alreadyReported"));
        } else {
          toast.error(t("maxReached"));
        }
        return;
      }
      if (!res.ok) {
        toast.error(t("errorSubmit"));
        return;
      }
      setReported(true);
      setOpen(false);
      toast.success(t("success"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive/10"
      >
        <Flag className="h-3.5 w-3.5" />
        {t("button")}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-lg">
            <h3 className="mb-3 text-base font-semibold">{t("title")}</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">{t("reasonLabel")}</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
                >
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">{t("detailsLabel")}</label>
                <textarea
                  rows={3}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  maxLength={500}
                  placeholder={t("detailsPlaceholder")}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                {t("cancel")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void handleSubmit()}
                disabled={busy}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("submit")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
