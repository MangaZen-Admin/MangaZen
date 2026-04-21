"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { dateFnsLocaleFromAppLocale } from "@/lib/date-fns-locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export type PendingChapterUploadRow = {
  uploadId: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string | null;
  chapterLocale: string;
  chapterLanguage: string;
  mangaTitle: string;
  mangaSlug: string;
  coverImage: string | null;
  submittedAt: string;
  uploaderLabel: string;
};

type AdminPendingChaptersPanelProps = {
  initialRows: PendingChapterUploadRow[];
};

export function AdminPendingChaptersPanel({ initialRows }: AdminPendingChaptersPanelProps) {
  const t = useTranslations("admin.pendingChapters");
  const locale = useLocale();
  const dfLocale = useMemo(() => dateFnsLocaleFromAppLocale(locale), [locale]);
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [busyChapterId, setBusyChapterId] = useState<string | null>(null);
  const [rejectChapterId, setRejectChapterId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");

  async function patchReview(
    chapterId: string,
    status: "APPROVED" | "REJECTED",
    notes?: string
  ) {
    setBusyChapterId(chapterId);
    try {
      const res = await fetch(`/api/admin/chapters/${encodeURIComponent(chapterId)}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...(notes ? { notes } : {}) }),
      });
      if (!res.ok) {
        toast.error(t("toastError"));
        return;
      }
      setRows((prev) => prev.filter((r) => r.chapterId !== chapterId));
      toast.success(status === "APPROVED" ? t("toastApproved") : t("toastRejected"));
      router.refresh();
    } finally {
      setBusyChapterId(null);
      setRejectChapterId(null);
      setRejectNotes("");
    }
  }

  if (rows.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        <EmptyState
          icon={CheckCircle}
          title={t("allClearTitle")}
          description={t("allClearDescription")}
        />
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>

      <ul className="mt-4 space-y-3">
        {rows.map((row) => (
          <li
            key={row.uploadId}
            className="flex flex-col gap-3 rounded-lg border border-border bg-background/40 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 flex-1 gap-3">
              <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded border border-border bg-muted">
                {row.coverImage ? (
                  <Image src={row.coverImage} alt="" fill className="object-cover" sizes="56px" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                    —
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{row.mangaTitle}</p>
                <p className="mt-0.5 text-sm text-foreground">
                  {t("chapterLine", {
                    number: row.chapterNumber,
                    title: row.chapterTitle && row.chapterTitle.length > 0 ? row.chapterTitle : "—",
                  })}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("colLocale")}: {row.chapterLocale} · {row.chapterLanguage}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("colUploader")}: {row.uploaderLabel}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {t("colSubmitted")}:{" "}
                  {formatDistanceToNow(new Date(row.submittedAt), {
                    addSuffix: true,
                    locale: dfLocale,
                  })}
                </p>
                <Link
                  href={`/${locale}/read/${row.chapterId}`}
                  className="mt-1 inline-block text-xs text-primary hover:underline"
                >
                  {t("openChapter")}
                </Link>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={busyChapterId === row.chapterId}
                onClick={() => void patchReview(row.chapterId, "APPROVED")}
              >
                {t("approve")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busyChapterId === row.chapterId}
                onClick={() => setRejectChapterId(row.chapterId)}
              >
                {t("reject")}
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {rejectChapterId && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg">
            <h3 className="text-lg font-semibold text-foreground">{t("rejectTitle")}</h3>
            <label className="mt-3 block text-sm text-muted-foreground" htmlFor="chapter-reject-notes">
              {t("rejectNotesLabel")}
            </label>
            <textarea
              id="chapter-reject-notes"
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25"
              placeholder={t("rejectNotesPlaceholder")}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setRejectChapterId(null)}>
                {t("cancel")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={busyChapterId === rejectChapterId}
                onClick={() =>
                  void patchReview(rejectChapterId, "REJECTED", rejectNotes.trim() || undefined)
                }
              >
                {t("confirmReject")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
