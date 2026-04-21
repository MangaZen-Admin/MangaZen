"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { dateFnsLocaleFromAppLocale } from "@/lib/date-fns-locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export type PendingMangaRow = {
  slug: string;
  title: string;
  coverImage: string | null;
  createdAt: string;
  uploaderLabel: string;
  isFeatured: boolean;
  reviewStatus: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
};

type AdminPendingMangasPanelProps = {
  initialRows: PendingMangaRow[];
};

export function AdminPendingMangasPanel({ initialRows }: AdminPendingMangasPanelProps) {
  const t = useTranslations("admin.pendingMangas");
  const locale = useLocale();
  const dfLocale = useMemo(() => dateFnsLocaleFromAppLocale(locale), [locale]);
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [rejectSlug, setRejectSlug] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  async function patchReview(slug: string, status: "APPROVED" | "REJECTED", rejectionReason?: string) {
    setBusySlug(slug);
    try {
      const res = await fetch(`/api/admin/manga/${encodeURIComponent(slug)}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...(rejectionReason ? { rejectionReason } : {}) }),
      });
      if (!res.ok) {
        toast.error(t("toastError"));
        return;
      }
      setRows((prev) => prev.filter((r) => r.slug !== slug));
      toast.success(status === "APPROVED" ? t("toastApproved") : t("toastRejected"));
      router.refresh();
    } finally {
      setBusySlug(null);
      setRejectSlug(null);
      setRejectReason("");
    }
  }

  async function toggleFeatured(slug: string) {
    setBusySlug(slug);
    try {
      const res = await fetch(`/api/admin/manga/${encodeURIComponent(slug)}/featured`, {
        method: "PATCH",
      });
      if (!res.ok) {
        toast.error(t("toastError"));
        return;
      }
      const data = (await res.json()) as { manga: { isFeatured: boolean } };
      setRows((prev) =>
        prev.map((r) => (r.slug === slug ? { ...r, isFeatured: data.manga.isFeatured } : r))
      );
      toast.success(data.manga.isFeatured ? t("toastFeatured") : t("toastUnfeatured"));
      router.refresh();
    } finally {
      setBusySlug(null);
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
            key={row.slug}
            className="flex flex-col gap-3 rounded-lg border border-border bg-background/40 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 flex-1 gap-3">
              <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded border border-border bg-muted">
                {row.coverImage ? (
                  <Image src={row.coverImage} alt="" fill className="object-cover" sizes="56px" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">—</div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{row.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("colUploader")}: {row.uploaderLabel}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {t("colDate")}:{" "}
                  {formatDistanceToNow(new Date(row.createdAt), {
                    addSuffix: true,
                    locale: dfLocale,
                  })}
                </p>
                <Link
                  href={`/${locale}/manga/${row.slug}`}
                  className="mt-1 inline-block text-xs text-primary hover:underline"
                >
                  {t("openManga")}
                </Link>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {row.reviewStatus === "APPROVED" ? (
                <Button
                  type="button"
                  size="sm"
                  variant={row.isFeatured ? "default" : "outline"}
                  disabled={busySlug === row.slug}
                  onClick={() => void toggleFeatured(row.slug)}
                  title={row.isFeatured ? t("unfeature") : t("feature")}
                >
                  <Star className={`h-3.5 w-3.5 ${row.isFeatured ? "fill-current" : ""}`} />
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                disabled={busySlug === row.slug}
                onClick={() => void patchReview(row.slug, "APPROVED")}
              >
                {t("approve")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busySlug === row.slug}
                onClick={() => setRejectSlug(row.slug)}
              >
                {t("reject")}
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {rejectSlug && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg">
            <h3 className="text-lg font-semibold text-foreground">{t("rejectTitle")}</h3>
            <label className="mt-3 block text-sm text-muted-foreground" htmlFor="reject-reason">
              {t("rejectReasonLabel")}
            </label>
            <textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25"
              placeholder={t("rejectReasonPlaceholder")}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setRejectSlug(null)}>
                {t("cancel")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={busySlug === rejectSlug}
                onClick={() => void patchReview(rejectSlug, "REJECTED", rejectReason.trim() || undefined)}
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
