"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BarChart3 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import type { ScanStatsPeriod } from "@/types/scan-stats";

type StatsPayload = {
  period: ScanStatsPeriod;
  range: { start: string; end: string };
  totals: {
    totalChaptersUploaded: number;
    totalMangasParticipated: number;
    byStatus: { PENDING: number; APPROVED: number; REJECTED: number };
    zenCoins: number;
    zenShards: number;
  };
  periodMetrics: {
    chaptersUploaded: number;
    approximateViews: number;
    boostSpend: number;
  };
  chart: { bucketStartIso: string; uploads: number }[];
  topChapters: {
    chapterId: string;
    chapterNumber: number;
    chapterTitle: string | null;
    mangaTitle: string;
    mangaSlug: string;
    views: number;
    uploadStatus: string;
  }[];
  topMangas: {
    mangaId: string;
    title: string;
    slug: string;
    coverImage: string | null;
    chaptersUploaded: number;
    totalViews: number;
  }[];
};

function formatBucketLabel(iso: string, period: ScanStatsPeriod, locale: string): string {
  const d = new Date(iso);
  if (period === "today") {
    return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

/** Recharts default tooltip uses a dark box; render with theme tokens instead. */
function UploadsBarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ name?: string; value?: number | string; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-semibold leading-tight text-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
          style={{ backgroundColor: row.color ?? "var(--primary)" }}
          aria-hidden
        />
        <span className="text-muted-foreground">{row.name}</span>
        <span className="ml-auto tabular-nums font-medium text-foreground">{row.value}</span>
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl border border-border bg-muted/60" />
        ))}
      </div>
      <div className="h-64 rounded-xl border border-border bg-muted/60" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-48 rounded-xl border border-border bg-muted/60" />
        <div className="h-48 rounded-xl border border-border bg-muted/60" />
      </div>
    </div>
  );
}

export function ScanStatsPanel() {
  const t = useTranslations("scanPanel.stats");
  const locale = useLocale();
  const [period, setPeriod] = useState<ScanStatsPeriod>("week");
  const [data, setData] = useState<StatsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/scan/stats?period=${encodeURIComponent(period)}`);
      if (!res.ok) {
        setError(t("loadError"));
        setData(null);
        return;
      }
      const json = (await res.json()) as StatsPayload;
      setData(json);
    } catch {
      setError(t("loadError"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.chart.map((row) => ({
      name: formatBucketLabel(row.bucketStartIso, data.period, locale),
      uploads: row.uploads,
    }));
  }, [data, locale]);

  const periodTabs: { id: ScanStatsPeriod; label: string }[] = [
    { id: "today", label: t("period.today") },
    { id: "week", label: t("period.week") },
    { id: "month", label: t("period.month") },
  ];

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="text-lg font-semibold text-foreground">{t("heading")}</h2>
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("periodAria")}>
          {periodTabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={period === id}
              onClick={() => setPeriod(id)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm font-medium transition",
                period === id
                  ? "border-primary bg-primary/15 text-foreground shadow-sm dark:shadow-[0_0_12px_rgba(157,78,221,0.25)]"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && <StatsSkeleton />}
      {!loading && error && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {!loading && !error && data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <StatCard
              label={t("cards.chaptersInPeriod")}
              value={data.periodMetrics.chaptersUploaded}
              accent="violet"
            />
            <StatCard
              label={t("cards.viewsInPeriod")}
              value={data.periodMetrics.approximateViews}
              accent="lavender"
            />
            <StatCard label={t("cards.zenCoins")} value={data.totals.zenCoins} accent="zen" />
            <StatCard label={t("cards.zenShards")} value={data.totals.zenShards} accent="lavender" />
            <StatCard
              label={t("cards.boostSpend")}
              value={data.periodMetrics.boostSpend}
              accent="balance"
            />
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">{t("zenDisclaimer")}</p>

          <div className="rounded-xl border border-primary/15 bg-card p-4 shadow-sm dark:border-border dark:shadow-none">
            <h3 className="text-sm font-semibold text-foreground">{t("chartTitle")}</h3>
            <div className="mt-4 h-64 w-full min-w-0">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      strokeOpacity={0.65}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      interval={period === "month" ? 2 : 0}
                      angle={period === "month" ? -35 : 0}
                      textAnchor={period === "month" ? "end" : "middle"}
                      height={period === "month" ? 48 : 28}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      width={32}
                    />
                    <Tooltip
                      cursor={{ fill: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
                      content={<UploadsBarTooltip />}
                    />
                    <Bar
                      dataKey="uploads"
                      name={t("chartSeriesUploads")}
                      fill="hsl(271 81% 56%)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={period === "today" ? 16 : 32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">{t("chartEmpty")}</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-4 dark:bg-muted/10">
            <h3 className="text-sm font-semibold text-foreground">{t("statusHeading")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t("statusSubtitle")}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <StatusPill count={data.totals.byStatus.APPROVED} label={t("status.APPROVED")} variant="approved" />
              <StatusPill count={data.totals.byStatus.PENDING} label={t("status.PENDING")} variant="pending" />
              <StatusPill count={data.totals.byStatus.REJECTED} label={t("status.REJECTED")} variant="rejected" />
            </div>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-2 rounded-lg border border-border/80 bg-background/60 px-3 py-2 dark:bg-card/50">
                <dt className="text-muted-foreground">{t("totalsChapters")}</dt>
                <dd className="font-semibold tabular-nums text-foreground">{data.totals.totalChaptersUploaded}</dd>
              </div>
              <div className="flex justify-between gap-2 rounded-lg border border-border/80 bg-background/60 px-3 py-2 dark:bg-card/50">
                <dt className="text-muted-foreground">{t("totalsMangas")}</dt>
                <dd className="font-semibold tabular-nums text-foreground">{data.totals.totalMangasParticipated}</dd>
              </div>
            </dl>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm dark:shadow-none">
              <h3 className="text-sm font-semibold text-foreground">{t("topChaptersTitle")}</h3>
              {data.topChapters.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">{t("emptyTopChapters")}</p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[320px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="pb-2 pr-2 font-medium">{t("colChapter")}</th>
                        <th className="pb-2 pr-2 font-medium">{t("colManga")}</th>
                        <th className="pb-2 pr-2 font-medium">{t("colViews")}</th>
                        <th className="pb-2 font-medium">{t("colStatus")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topChapters.map((row) => (
                        <tr key={row.chapterId} className="border-b border-border/60 last:border-0">
                          <td className="py-2 pr-2 font-medium text-foreground">
                            {t("chapterLabel", { n: row.chapterNumber })}
                            {row.chapterTitle ? (
                              <span className="block text-xs font-normal text-muted-foreground">{row.chapterTitle}</span>
                            ) : null}
                          </td>
                          <td className="py-2 pr-2 text-muted-foreground">{row.mangaTitle}</td>
                          <td className="py-2 pr-2 tabular-nums text-primary">{row.views}</td>
                          <td className="py-2">
                            <span
                              className={cn(
                                "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                                row.uploadStatus === "APPROVED" &&
                                  "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
                                row.uploadStatus === "PENDING" &&
                                  "bg-amber-500/15 text-amber-900 dark:text-amber-200",
                                row.uploadStatus === "REJECTED" &&
                                  "bg-red-500/15 text-red-800 dark:text-red-200"
                              )}
                            >
                              {t(`uploadStatus.${row.uploadStatus as "APPROVED" | "PENDING" | "REJECTED"}`)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-sm dark:shadow-none">
              <h3 className="text-sm font-semibold text-foreground">{t("topMangasTitle")}</h3>
              {data.topMangas.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">{t("emptyTopMangas")}</p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[300px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="pb-2 pr-2 font-medium">{t("colCover")}</th>
                        <th className="pb-2 pr-2 font-medium">{t("colTitle")}</th>
                        <th className="pb-2 pr-2 font-medium">{t("colChaptersUploaded")}</th>
                        <th className="pb-2 font-medium">{t("colViews")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topMangas.map((row) => (
                        <tr key={row.mangaId} className="border-b border-border/60 last:border-0">
                          <td className="py-2 pr-2">
                            <Link
                              href={`/${locale}/manga/${row.slug}`}
                              className="relative block h-11 w-8 overflow-hidden rounded border border-border bg-muted"
                            >
                              {row.coverImage ? (
                                <Image
                                  src={row.coverImage}
                                  alt=""
                                  fill
                                  sizes="32px"
                                  className="object-cover"
                                  unoptimized
                                />
                              ) : (
                                <span className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-primary">
                                  {row.title.slice(0, 1).toUpperCase()}
                                </span>
                              )}
                            </Link>
                          </td>
                          <td className="py-2 pr-2">
                            <Link
                              href={`/${locale}/manga/${row.slug}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {row.title}
                            </Link>
                          </td>
                          <td className="py-2 pr-2 tabular-nums text-muted-foreground">{row.chaptersUploaded}</td>
                          <td className="py-2 tabular-nums text-foreground">{row.totalViews}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function StatCard({
  label,
  value,
  accent,
  decimals,
}: {
  label: string;
  value: number;
  accent: "violet" | "lavender" | "zen" | "balance";
  decimals?: boolean;
}) {
  const accentRing =
    accent === "violet"
      ? "from-primary/25 via-card to-primary/5 dark:from-primary/20"
      : accent === "lavender"
        ? "from-violet-400/20 via-card to-fuchsia-500/10 dark:from-violet-500/15"
        : accent === "zen"
          ? "from-amber-400/20 via-card to-amber-600/10 dark:from-amber-500/10"
          : "from-sky-400/15 via-card to-sky-600/10 dark:from-sky-500/10";

  const display =
    decimals && !Number.isInteger(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(value);

  return (
    <div
      className={cn(
        "rounded-xl border border-primary/15 bg-gradient-to-br p-4 shadow-sm dark:border-border dark:shadow-none",
        accentRing
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">{display}</p>
    </div>
  );
}

function StatusPill({
  count,
  label,
  variant,
}: {
  count: number;
  label: string;
  variant: "approved" | "pending" | "rejected";
}) {
  const styles = {
    approved: "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
    pending: "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100",
    rejected: "border-red-500/40 bg-red-500/10 text-red-900 dark:text-red-100",
  }[variant];

  return (
    <div
      className={cn(
        "flex min-w-[7rem] flex-1 flex-col rounded-lg border px-3 py-2 sm:min-w-[8rem]",
        styles
      )}
    >
      <span className="text-xs font-medium opacity-90">{label}</span>
      <span className="text-xl font-bold tabular-nums">{count}</span>
    </div>
  );
}
