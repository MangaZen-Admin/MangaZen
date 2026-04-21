"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, BarChart3, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "@/i18n/navigation";
import { dateFnsLocaleFromAppLocale } from "@/lib/date-fns-locale";
import { getPublicProfileUrlKey } from "@/lib/public-profile-url";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  AdminScanDetailResponse,
  AdminScanStatsListResponse,
  AdminScanStatsSortKey,
} from "@/types/admin-scan-stats";

function ListSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-10 rounded-lg bg-muted/60" />
      <div className="h-64 rounded-xl border border-border bg-muted/40" />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 w-40 rounded-lg bg-muted/60" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-border bg-muted/50" />
        ))}
      </div>
      <div className="h-56 rounded-xl border border-border bg-muted/50" />
    </div>
  );
}

function UploadsBarTooltip({
  active,
  payload,
  label,
  uploadsLabel,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ name?: string | number; value?: number | string; color?: string }>;
  label?: string | number;
  uploadsLabel: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold text-foreground">{label != null ? String(label) : ""}</p>
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
          style={{ backgroundColor: row.color ?? "var(--primary)" }}
          aria-hidden
        />
        <span className="text-muted-foreground">{uploadsLabel}</span>
        <span className="ml-auto tabular-nums font-medium text-foreground">{row.value}</span>
      </div>
    </div>
  );
}

export function AdminScanStatsTab() {
  const t = useTranslations("admin.scanStats");
  const locale = useLocale();
  const dfLocale = useMemo(() => dateFnsLocaleFromAppLocale(locale), [locale]);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [listLoading, setListLoading] = useState(true);
  const [list, setList] = useState<AdminScanStatsListResponse | null>(null);
  const [sort, setSort] = useState<AdminScanStatsSortKey>("views");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [qInput, setQInput] = useState("");
  const [qDebounced, setQDebounced] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setQDebounced(qInput.trim()), 300);
    return () => clearTimeout(id);
  }, [qInput]);

  const fetchList = useCallback(async () => {
    setListLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("sort", sort);
      sp.set("order", order);
      if (qDebounced) sp.set("q", qDebounced);
      const res = await fetch(`/api/admin/scan-stats?${sp.toString()}`);
      if (!res.ok) {
        toast.error(t("toastLoadError"));
        return;
      }
      const data = (await res.json()) as AdminScanStatsListResponse;
      setList(data);
    } finally {
      setListLoading(false);
    }
  }, [sort, order, qDebounced, t]);

  useEffect(() => {
    if (selectedUserId) return;
    void fetchList();
  }, [fetchList, selectedUserId]);

  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<AdminScanDetailResponse | null>(null);
  const [viewsPeriod, setViewsPeriod] = useState<"today" | "week" | "month">("week");
  const [busyChapterId, setBusyChapterId] = useState<string | null>(null);
  const [rejectChapterId, setRejectChapterId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");

  const loadDetail = useCallback(async (userId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/scan-stats/${encodeURIComponent(userId)}`);
      if (!res.ok) {
        toast.error(t("toastLoadError"));
        setSelectedUserId(null);
        return;
      }
      setDetail((await res.json()) as AdminScanDetailResponse);
    } finally {
      setDetailLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!selectedUserId) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedUserId);
  }, [selectedUserId, loadDetail]);

  async function patchReview(chapterId: string, status: "APPROVED" | "REJECTED", notes?: string) {
    setBusyChapterId(chapterId);
    try {
      const res = await fetch(`/api/admin/chapters/${encodeURIComponent(chapterId)}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...(notes ? { notes } : {}) }),
      });
      if (!res.ok) {
        toast.error(t("toastReviewError"));
        return;
      }
      toast.success(status === "APPROVED" ? t("toastApproved") : t("toastRejected"));
      if (selectedUserId) await loadDetail(selectedUserId);
      await fetchList();
    } finally {
      setBusyChapterId(null);
      setRejectChapterId(null);
      setRejectNotes("");
    }
  }

  const chartData = useMemo(() => {
    if (!detail) return [];
    return detail.uploadsByDay.map((d) => ({
      ...d,
      label: new Date(d.day + "T12:00:00Z").toLocaleDateString(locale, { month: "short", day: "numeric" }),
    }));
  }, [detail, locale]);

  const periodViews = detail
    ? viewsPeriod === "today"
      ? detail.viewsByPeriod.today
      : viewsPeriod === "week"
        ? detail.viewsByPeriod.week
        : detail.viewsByPeriod.month
    : 0;

  if (selectedUserId) {
    return (
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setSelectedUserId(null)}
          >
            <ArrowLeft className="h-4 w-4" />
            {t("detailBack")}
          </Button>
          {detail && (
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                {detail.user.image ? (
                  <Image src={detail.user.image} alt="" fill className="object-cover" sizes="44px" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm font-semibold text-foreground">
                    {(detail.user.name ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">
                  {detail.user.name ?? t("unnamed")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {detail.user.role} ·{" "}
                  <Link
                    href={`/user/${encodeURIComponent(
                      getPublicProfileUrlKey({ id: detail.user.id, username: detail.user.username })
                    )}`}
                    className="text-primary hover:underline"
                  >
                    {t("detailProfileLink")}
                  </Link>
                </p>
              </div>
            </div>
          )}
        </div>

        {detailLoading || !detail ? (
          <div className="mt-6">
            <DetailSkeleton />
          </div>
        ) : (
          <div className="mt-6 space-y-8">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-border bg-background/50 p-4">
                <p className="text-xs text-muted-foreground">{t("cardApproved")}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                  {detail.totals.approved}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background/50 p-4">
                <p className="text-xs text-muted-foreground">{t("cardViewsTotal")}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                  {detail.totals.totalViews}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background/50 p-4">
                <p className="text-xs text-muted-foreground">{t("cardZen")}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                  {detail.user.zenPoints.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background/50 p-4">
                <p className="text-xs text-muted-foreground">{t("cardPending")}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                  {detail.totals.pending}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{t("viewsPeriodLabel")}</p>
                <Select
                  value={viewsPeriod}
                  onValueChange={(v) => setViewsPeriod(v as "today" | "week" | "month")}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">{t("periodToday")}</SelectItem>
                    <SelectItem value="week">{t("periodWeek")}</SelectItem>
                    <SelectItem value="month">{t("periodMonth")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg border border-primary/25 bg-primary/10 px-4 py-2">
                <p className="text-xs text-muted-foreground">{t("viewsInPeriod")}</p>
                <p className="text-xl font-semibold tabular-nums text-foreground">{periodViews}</p>
              </div>
            </div>

            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <BarChart3 className="h-4 w-4 text-primary" />
                {t("uploadsChartTitle")}
              </h3>
              <div className="h-56 w-full rounded-xl border border-border bg-background/30 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" width={32} />
                    <Tooltip
                      cursor={{ fill: "var(--muted)", opacity: 0.15 }}
                      content={(tooltipProps) => {
                        const props = tooltipProps as {
                          active?: boolean;
                          payload?: ReadonlyArray<{
                            name?: string | number;
                            value?: string | number;
                            color?: string;
                          }>;
                          label?: string | number;
                        };
                        return (
                          <UploadsBarTooltip
                            active={props.active}
                            payload={props.payload}
                            label={props.label}
                            uploadsLabel={t("chartUploadsSeries")}
                          />
                        );
                      }}
                    />
                    <Bar dataKey="count" name={t("chartUploadsSeries")} fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground">{t("topChaptersTitle")}</h3>
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">{t("colChapter")}</th>
                        <th className="px-3 py-2 text-right">{t("colViews")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {detail.topChapters.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="px-3 py-4 text-muted-foreground">
                            {t("emptyTop")}
                          </td>
                        </tr>
                      ) : (
                        detail.topChapters.map((row) => (
                          <tr key={row.chapterId} className="bg-card">
                            <td className="px-3 py-2 text-foreground">
                              <span className="font-medium">{row.mangaTitle}</span>
                              <span className="text-muted-foreground">
                                {" "}
                                · {t("chapterShort", { n: row.chapterNumber })}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-foreground">{row.views}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground">{t("topMangasTitle")}</h3>
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">{t("colManga")}</th>
                        <th className="px-3 py-2 text-right">{t("colViews")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {detail.topMangas.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="px-3 py-4 text-muted-foreground">
                            {t("emptyTop")}
                          </td>
                        </tr>
                      ) : (
                        detail.topMangas.map((row) => (
                          <tr key={row.mangaId} className="bg-card">
                            <td className="px-3 py-2">
                              <Link
                                href={`/manga/${encodeURIComponent(row.slug)}`}
                                className="font-medium text-primary hover:underline"
                              >
                                {row.title}
                              </Link>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-foreground">{row.views}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">{t("pendingTitle")}</h3>
              {detail.pendingChapters.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("pendingEmpty")}</p>
              ) : (
                <ul className="space-y-2">
                  {detail.pendingChapters.map((row) => (
                    <li
                      key={row.uploadId}
                      className="flex flex-col gap-2 rounded-lg border border-border bg-background/40 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{row.mangaTitle}</p>
                        <p className="text-sm text-muted-foreground">
                          {t("chapterLine", {
                            number: row.chapterNumber,
                            title: row.chapterTitle?.trim() ? row.chapterTitle : "—",
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(row.submittedAt), {
                            addSuffix: true,
                            locale: dfLocale,
                          })}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
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
              )}
            </div>

            {rejectChapterId && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-sm font-medium text-foreground">{t("rejectTitle")}</p>
                <textarea
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  rows={2}
                  placeholder={t("rejectNotesPlaceholder")}
                />
                <div className="mt-2 flex gap-2">
                  <Button type="button" size="sm" variant="ghost" onClick={() => setRejectChapterId(null)}>
                    {t("cancel")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={busyChapterId != null}
                    onClick={() => void patchReview(rejectChapterId, "REJECTED", rejectNotes)}
                  >
                    {t("confirmReject")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-10 w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-primary/30"
            aria-label={t("searchPlaceholder")}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={sort} onValueChange={(v) => setSort(v as AdminScanStatsSortKey)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t("sortLabel")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="views">{t("sortViews")}</SelectItem>
              <SelectItem value="uploads">{t("sortUploads")}</SelectItem>
              <SelectItem value="zen">{t("sortZen")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={order} onValueChange={(v) => setOrder(v as "asc" | "desc")}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">{t("orderDesc")}</SelectItem>
              <SelectItem value="asc">{t("orderAsc")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {listLoading || !list ? (
        <div className="mt-6">
          <ListSkeleton />
        </div>
      ) : list.rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">{t("listEmpty")}</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-3 text-left">{t("colUser")}</th>
                <th className="px-3 py-3 text-left">{t("colRole")}</th>
                <th className="px-3 py-3 text-right">{t("colUploaded")}</th>
                <th className="px-3 py-3 text-right">{t("colApproved")}</th>
                <th className="px-3 py-3 text-right">{t("colRejected")}</th>
                <th className="px-3 py-3 text-right">{t("colViews")}</th>
                <th className="px-3 py-3 text-right">{t("colZen")}</th>
                <th className="px-3 py-3 text-left">{t("colLastUpload")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.rows.map((row) => (
                <tr
                  key={row.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedUserId(row.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedUserId(row.id);
                    }
                  }}
                  className="cursor-pointer transition-colors hover:bg-muted/40"
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                        {row.image ? (
                          <Image src={row.image} alt="" fill className="object-cover" sizes="36px" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs font-semibold">
                            {(row.name ?? "?").slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <Link
                        href={`/user/${encodeURIComponent(getPublicProfileUrlKey(row))}`}
                        className="font-medium text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {row.name ?? t("unnamed")}
                      </Link>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-foreground">{row.role}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-foreground">{row.totalUploads}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-foreground">{row.approvedUploads}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{row.rejectedUploads}</td>
                  <td className="px-3 py-3 text-right tabular-nums font-medium text-foreground">
                    {row.totalViews}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-foreground">
                    {row.zenPoints.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {row.lastUploadAt
                      ? formatDistanceToNow(new Date(row.lastUploadAt), {
                          addSuffix: true,
                          locale: dfLocale,
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
