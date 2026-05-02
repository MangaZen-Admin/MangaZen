"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { UserRole } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookPlus,
  Coins,
  Gem,
  GripVertical,
  Info,
  Loader2,
  Trash2,
  Upload,
  Library,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { notifyBadgesEarned } from "@/components/badges/notify-badges-earned";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getApiErrorMessage, resolveApiErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { routing } from "@/i18n/routing";
import { getLocaleFlagIconUrl } from "@/lib/locale-flags";
import {
  SCAN_CONTENT_RATINGS,
  SCAN_DEMOGRAPHICS,
  SCAN_MANGA_STATUS,
  SCAN_MANGA_TYPES,
} from "@/lib/scan-manga-constants";
import { ScanStatsPanel } from "@/components/scan/ScanStatsPanel";

type TabId = "stats" | "upload" | "myUploads" | "boost" | "newManga";

type MangaHit = { id: string; title: string; slug: string; coverImage: string | null };

type PageFile = {
  id: string;
  file: File;
  previewUrl: string;
  isSingleInDoublePage: boolean;
};

type UploadRow = {
  uploadId: string;
  uploadStatus: string;
  submittedAt: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string | null;
  chapterLocale: string;
  chapterLanguage: string;
  chapterStatus: string;
  mangaTitle: string;
  mangaSlug: string;
};

type TagRow = { id: string; name: string; category: string };

type BoostMangaRow = {
  id: string;
  slug: string;
  title: string;
  coverImage: string | null;
  boostExpiresAt: string | null;
};

function postFormDataWithProgress(
  url: string,
  formData: FormData,
  onProgress: (pct: number) => void
): Promise<{ ok: boolean; status: number; body: Record<string, unknown> | null }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) {
        onProgress(Math.min(99, Math.round((100 * e.loaded) / e.total)));
      }
    };
    xhr.onload = () => {
      let body: Record<string, unknown> | null = null;
      try {
        body = xhr.responseText ? (JSON.parse(xhr.responseText) as Record<string, unknown>) : null;
      } catch {
        body = null;
      }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, body });
    };
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(formData);
  });
}

const VALID_TABS: TabId[] = ["stats", "upload", "myUploads", "boost", "newManga"];

export default function ScanPanelClient({ role }: { role: UserRole }) {
  const t = useTranslations("scanPanel");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [uploadDirty, setUploadDirty] = useState(false);

  const tabParam = searchParams.get("tab");
  const tab: TabId = VALID_TABS.includes(tabParam as TabId)
    ? (tabParam as TabId)
    : "upload";

  function handleTabChange(next: TabId) {
    if (uploadDirty && tab === "upload" && next !== "upload") {
      if (!window.confirm(t("tabs.unsavedWarning"))) return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.push(`?${params.toString()}`, { scroll: false });
  }

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-background px-4 py-8 transition-colors duration-200 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-xl border border-primary/20 bg-card p-5 shadow-sm dark:border-border dark:shadow-none">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("header.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("header.subtitle")}</p>
          <nav className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
            <TabButton
              active={tab === "stats"}
              onClick={() => handleTabChange("stats")}
              icon={BarChart3}
              label={t("tabs.stats")}
            />
            <TabButton
              active={tab === "upload"}
              onClick={() => handleTabChange("upload")}
              icon={Upload}
              label={t("tabs.upload")}
            />
            <TabButton
              active={tab === "myUploads"}
              onClick={() => handleTabChange("myUploads")}
              icon={Library}
              label={t("tabs.myUploads")}
            />
            <TabButton
              active={tab === "boost"}
              onClick={() => handleTabChange("boost")}
              icon={Zap}
              label={t("tabs.boost")}
            />
            <TabButton
              active={tab === "newManga"}
              onClick={() => handleTabChange("newManga")}
              icon={BookPlus}
              label={t("tabs.newManga")}
            />
          </nav>
        </header>

        {tab === "stats" && <ScanStatsPanel />}
        {tab === "upload" && <UploadChapterSection role={role} onDirtyChange={setUploadDirty} />}
        {tab === "myUploads" && <MyUploadsSection />}
        {tab === "boost" && <BoostSection />}
        {tab === "newManga" && <NewMangaSection />}
      </section>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
        active
          ? "border-primary bg-primary/15 text-foreground shadow-sm dark:shadow-[0_0_12px_rgba(157,78,221,0.25)]"
          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function translateError(t: { has: (key: string) => boolean; (key: string): string }, code: string) {
  const key = `errors.${code}`;
  return t.has(key) ? t(key) : t("errors.GENERIC");
}

function UploadChapterSection({
  role,
  onDirtyChange,
}: {
  role: UserRole;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const t = useTranslations("scanPanel");
  const tEa = useTranslations("earlyAccess");
  const tBadges = useTranslations("badges");
  const locale = useLocale();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<MangaHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<MangaHit | null>(null);
  const [chapterNumber, setChapterNumber] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterLocale, setChapterLocale] = useState(locale);
  const [source, setSource] = useState<"files" | "zip">("files");
  const [pageFiles, setPageFiles] = useState<PageFile[]>([]);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [startsWithSinglePage, setStartsWithSinglePage] = useState(true);
  const [earlyAccessEnabled, setEarlyAccessEnabled] = useState(false);
  const [earlyAccessDays, setEarlyAccessDays] = useState("7");
  const [earlyAccessPrice, setEarlyAccessPrice] = useState("50");
  const [earlyAccessCurrency, setEarlyAccessCurrency] = useState<"coins" | "shards">("shards");
  const canUseCoins = role === "CREATOR" || role === "ADMIN";
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageFilesRef = useRef(pageFiles);
  pageFilesRef.current = pageFiles;
  useEffect(() => {
    return () => {
      pageFilesRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  const isDirty = selected !== null || pageFiles.length > 0 || zipFile !== null;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    if (!canUseCoins) setEarlyAccessCurrency("shards");
  }, [canUseCoins]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const runSearch = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/scan/mangas/search?q=${encodeURIComponent(query.trim())}`);
      if (!res.ok) {
        setHits([]);
        toast.error(await getApiErrorMessage(res, t, "errors.GENERIC"));
        return;
      }
      const data = (await res.json()) as { mangas?: MangaHit[] };
      setHits(data.mangas ?? []);
    } catch {
      setHits([]);
      toast.error(t("errors.GENERIC"));
    } finally {
      setSearching(false);
    }
  }, [t]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      void runSearch(q);
    }, 320);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [q, runSearch]);

  function onPickFiles(list: FileList | null) {
    if (!list?.length) return;
    const next: PageFile[] = [];
    for (let i = 0; i < list.length; i += 1) {
      const file = list[i];
      if (file.type.startsWith("image/")) {
        next.push({
          id: `${Date.now()}-${i}-${file.name}`,
          file,
          previewUrl: URL.createObjectURL(file),
          isSingleInDoublePage: false,
        });
      }
    }
    setPageFiles((prev) => [...prev, ...next]);
  }

  function removePage(id: string) {
    setPageFiles((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  function onReorderDrop(toIndex: number) {
    if (dragFrom == null || dragFrom === toIndex) return;
    setPageFiles((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragFrom, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setDragFrom(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) {
      toast.error(t("upload.pickManga"));
      return;
    }
    const num = Number(chapterNumber);
    if (!Number.isFinite(num) || num <= 0) {
      toast.error(t("upload.invalidNumber"));
      return;
    }
    if (source === "files" && pageFiles.length === 0) {
      toast.error(t("upload.noPages"));
      return;
    }
    if (source === "zip" && !zipFile) {
      toast.error(t("upload.noZip"));
      return;
    }

    const form = new FormData();
    form.set("mangaId", selected.id);
    form.set("number", String(num));
    if (chapterTitle.trim()) form.set("title", chapterTitle.trim());
    form.set("locale", chapterLocale);
    form.set("source", source);
    form.set("startsWithSinglePage", startsWithSinglePage ? "1" : "0");
    form.set("earlyAccess", earlyAccessEnabled ? "1" : "0");
    if (earlyAccessEnabled) {
      form.set("earlyAccessDays", earlyAccessDays.trim());
      form.set("earlyAccessPrice", earlyAccessPrice.trim());
      form.set("earlyAccessCurrency", canUseCoins ? earlyAccessCurrency : "shards");
    }
    if (source === "zip" && zipFile) {
      form.set("zip", zipFile);
    } else {
      pageFiles.forEach((p, i) => {
        form.append("pages", p.file);
        form.append(`pages[${i}][isSingleInDoublePage]`, p.isSingleInDoublePage ? "1" : "0");
      });
    }

    setBusy(true);
    setProgress(0);
    try {
      const { ok, body } = await postFormDataWithProgress("/api/scan/chapter", form, setProgress);
      if (ok) {
        setProgress(100);
        toast.success(t("upload.success"));
        const rawEarned = body?.badgesEarned;
        if (Array.isArray(rawEarned)) {
          notifyBadgesEarned(
            rawEarned.filter(
              (x): x is { name: string; description: string } =>
                x != null &&
                typeof x === "object" &&
                typeof (x as { name?: unknown }).name === "string" &&
                typeof (x as { description?: unknown }).description === "string"
            ),
            tBadges
          );
        }
        setChapterNumber("");
        setChapterTitle("");
        setSelected(null);
        setQ("");
        pageFiles.forEach((p) => URL.revokeObjectURL(p.previewUrl));
        setPageFiles([]);
        setZipFile(null);
        setStartsWithSinglePage(true);
        setEarlyAccessEnabled(false);
        onDirtyChange?.(false);
      } else {
        setProgress(0);
        const code = typeof body?.error === "string" ? body.error : "GENERIC";
        if (code === "EARLY_ACCESS_DAYS") {
          toast.error(tEa("invalidDays"));
        } else if (code === "EARLY_ACCESS_PRICE") {
          toast.error(tEa("invalidPrice"));
        } else if (code === "EARLY_ACCESS_CURRENCY_FORBIDDEN") {
          toast.error(t("errors.FORBIDDEN"));
        } else {
          toast.error(translateError(t, code));
        }
      }
    } catch {
      setProgress(0);
      toast.error(t("errors.GENERIC"));
    } finally {
      setBusy(false);
      setTimeout(() => setProgress(0), 600);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">{t("upload.heading")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("upload.hint")}</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <div>
          <label className="text-sm font-medium text-foreground">{t("upload.mangaSearch")}</label>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("upload.mangaSearchPlaceholder")}
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
            disabled={busy}
          />
          {searching && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t("upload.searching")}
            </p>
          )}
          {hits.length > 0 && !selected && (
            <ul className="mt-2 max-h-48 overflow-auto rounded-lg border border-border bg-background text-sm">
              {hits.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-muted"
                    onClick={() => {
                      setSelected(m);
                      setHits([]);
                      setQ("");
                    }}
                  >
                    {m.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.coverImage} alt="" className="h-10 w-7 rounded object-cover" />
                    ) : (
                      <div className="h-10 w-7 rounded bg-muted" />
                    )}
                    <span className="font-medium text-foreground">{m.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selected && (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-sm">
              <span className="font-medium text-foreground">{selected.title}</span>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => setSelected(null)}
                disabled={busy}
              >
                {t("upload.clearManga")}
              </button>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-foreground">{t("upload.chapterNumber")}</label>
            <input
              type="number"
              min={1}
              step={1}
              required
              value={chapterNumber}
              onChange={(e) => setChapterNumber(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
              disabled={busy}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">{t("upload.chapterTitleOptional")}</label>
            <input
              type="text"
              value={chapterTitle}
              onChange={(e) => setChapterTitle(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
              disabled={busy}
            />
          </div>
        </div>

        <div>
          <span className="text-sm font-medium text-foreground">{t("upload.localeLabel")}</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {routing.locales.map((loc) => (
              <button
                key={loc}
                type="button"
                title={t(`localeOption.${loc}`)}
                onClick={() => setChapterLocale(loc)}
                disabled={busy}
                className={`rounded-lg border p-2 transition ${
                  chapterLocale === loc
                    ? "border-primary bg-primary/15 ring-2 ring-primary/30"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <Image
                  src={getLocaleFlagIconUrl(loc)}
                  alt={loc}
                  width={22}
                  height={22}
                  className="h-5 w-5 rounded-[3px]"
                />
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background/40 p-4">
          <div className="flex items-start gap-3">
            <input
              id="scan-starts-with-single-page"
              type="checkbox"
              checked={startsWithSinglePage}
              onChange={(e) => setStartsWithSinglePage(e.target.checked)}
              disabled={busy}
              className="mt-1 rounded border-border"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <label
                  htmlFor="scan-starts-with-single-page"
                  className="cursor-pointer text-sm font-medium text-foreground"
                >
                  {t("upload.startsWithSinglePageLabel")}
                </label>
                <button
                  type="button"
                  className="inline-flex shrink-0 rounded-md text-muted-foreground transition-colors hover:text-foreground"
                  title={t("upload.startsWithSinglePageTooltip")}
                  aria-label={t("upload.startsWithSinglePageTooltip")}
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-primary/15 bg-gradient-to-b from-primary/5 to-card p-4 shadow-sm dark:border-border dark:from-primary/10 dark:to-card">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={earlyAccessEnabled}
              onChange={(e) => setEarlyAccessEnabled(e.target.checked)}
              disabled={busy}
              className="mt-1 rounded border-border"
            />
            <span>
              <span className="block text-sm font-medium text-foreground">{tEa("scanToggle")}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{tEa("scanHint")}</span>
            </span>
          </label>
          {earlyAccessEnabled && (
            <div className="mt-4 space-y-4">
              {canUseCoins && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {tEa("currencyLabel")}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEarlyAccessCurrency("shards")}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        earlyAccessCurrency === "shards"
                          ? "border-primary bg-primary/15 text-foreground"
                          : "border-border bg-background/60 text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      <Gem className="h-3.5 w-3.5 text-primary" /> ZS
                    </button>
                    <button
                      type="button"
                      onClick={() => setEarlyAccessCurrency("coins")}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        earlyAccessCurrency === "coins"
                          ? "border-primary bg-primary/15 text-foreground"
                          : "border-border bg-background/60 text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      <Coins className="h-3.5 w-3.5 text-yellow-500" /> ZC
                    </button>
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-background/60 p-3">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="ea-days">
                    {tEa("scanDays")}
                  </label>
                  <input
                    id="ea-days"
                    type="number"
                    min={3}
                    max={30}
                    required
                    value={earlyAccessDays}
                    onChange={(e) => setEarlyAccessDays(e.target.value)}
                    disabled={busy}
                    className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">{tEa("daysHint")}</p>
                </div>
                <div className="rounded-lg border border-border bg-background/60 p-3">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="ea-price">
                    {tEa("scanPrice")} ({earlyAccessCurrency === "coins" ? "ZC" : "ZS"})
                  </label>
                  <input
                    id="ea-price"
                    type="number"
                    min={10}
                    max={500}
                    required
                    value={earlyAccessPrice}
                    onChange={(e) => setEarlyAccessPrice(e.target.value)}
                    disabled={busy}
                    className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">{tEa("priceHint")}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <span className="text-sm font-medium text-foreground">{t("upload.sourceLabel")}</span>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setSource("files")}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                source === "files"
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {t("upload.sourceFiles")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setSource("zip")}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                source === "zip"
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {t("upload.sourceZip")}
            </button>
          </div>
        </div>

        {source === "files" ? (
          <div>
            <label className="text-sm font-medium text-foreground">{t("upload.pagesLabel")}</label>
            <div className="mt-1.5 flex items-center gap-3">
              <label className="cursor-pointer rounded-lg border-0 bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90">
                {t("upload.chooseFiles")}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => onPickFiles(e.target.files)}
                  disabled={busy}
                />
              </label>
              <span className="text-sm text-muted-foreground">
                {pageFiles.length > 0
                  ? t("upload.filesSelected", { count: pageFiles.length })
                  : t("upload.noFilesSelected")}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t("upload.reorderHint")}</p>
            {pageFiles.length > 0 && (
              <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {pageFiles.map((p, index) => (
                  <li
                    key={p.id}
                    draggable
                    onDragStart={() => setDragFrom(index)}
                    onDragOver={(ev) => ev.preventDefault()}
                    onDrop={() => onReorderDrop(index)}
                    className="relative rounded-lg border border-border bg-background p-1"
                  >
                    <div className="flex items-center justify-between gap-1 text-muted-foreground">
                      <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab" />
                      <span className="text-[10px] font-mono">{index + 1}</span>
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.previewUrl} alt="" className="mt-1 h-24 w-full rounded object-cover" />
                    <label className="mt-1 flex cursor-pointer select-none items-center gap-1.5 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={p.isSingleInDoublePage}
                        onChange={() => {
                          setPageFiles((prev) =>
                            prev.map((item) =>
                              item.id === p.id
                                ? { ...item, isSingleInDoublePage: !item.isSingleInDoublePage }
                                : item
                            )
                          );
                        }}
                      />
                      Página sola
                    </label>
                    <button
                      type="button"
                      className="absolute right-1 top-6 rounded bg-background/90 p-0.5 text-destructive hover:bg-destructive/10"
                      onClick={() => removePage(p.id)}
                      disabled={busy}
                      aria-label={t("upload.removePage")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div>
            <label className="text-sm font-medium text-foreground">{t("upload.zipLabel")}</label>
            <div className="mt-1.5 flex items-center gap-3">
              <label className="cursor-pointer rounded-lg border-0 bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90">
                {t("upload.chooseFile")}
                <input
                  type="file"
                  accept=".zip,application/zip"
                  className="hidden"
                  onChange={(e) => setZipFile(e.target.files?.[0] ?? null)}
                  disabled={busy}
                />
              </label>
              <span className="text-sm text-muted-foreground">
                {zipFile ? zipFile.name : t("upload.noFileSelected")}
              </span>
            </div>
          </div>
        )}

        {busy && (
          <div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t("upload.progress", { pct: progress })}</p>
          </div>
        )}

        <Button type="submit" disabled={busy} className="bg-primary text-primary-foreground hover:opacity-90">
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("upload.submitting")}
            </>
          ) : (
            t("upload.submit")
          )}
        </Button>
      </form>
    </div>
  );
}

function MyUploadsSection() {
  const t = useTranslations("scanPanel");
  const locale = useLocale();
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setPage(1);
    setLoading(true);
    try {
      const res = await fetch("/api/scan/my-uploads");
      if (!res.ok) {
        toast.error(await getApiErrorMessage(res, t, "errors.GENERIC"));
        return;
      }
      const data = (await res.json()) as { uploads?: UploadRow[] };
      setRows(data.uploads ?? []);
    } catch {
      toast.error(t("errors.GENERIC"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  function statusLabel(prefix: "status" | "chapterStatus", value: string) {
    const key = `${prefix}.${value}`;
    return t.has(key) ? t(key) : value;
  }

  async function onDelete(uploadId: string) {
    setDeletingId(uploadId);
    try {
      const res = await fetch(`/api/scan/my-uploads?id=${encodeURIComponent(uploadId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success(t("myUploads.deleted"));
        setRows((prev) => prev.filter((r) => r.uploadId !== uploadId));
        setConfirmId(null);
      } else {
        let body: Record<string, unknown> = {};
        try {
          body = (await res.json()) as Record<string, unknown>;
        } catch {
          /* ignore */
        }
        toast.error(resolveApiErrorMessage(body, t, "errors.GENERIC"));
      }
    } catch {
      toast.error(t("errors.GENERIC"));
    } finally {
      setDeletingId(null);
    }
  }

  const paginatedRows = rows.slice(0, page * PAGE_SIZE);
  const hasMore = rows.length > page * PAGE_SIZE;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">{t("myUploads.heading")}</h2>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("myUploads.refresh")}
        </Button>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">{t("myUploads.loading")}</p>
      ) : rows.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={Upload}
          title={t("myUploads.emptyTitle")}
          description={t("myUploads.emptyDescription")}
        />
      ) : (
        <>
          <p className="mt-3 text-xs text-muted-foreground">
            {t("myUploads.showingCount", { shown: paginatedRows.length, total: rows.length })}
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">{t("myUploads.colManga")}</th>
                  <th className="py-2 pr-3 font-medium">{t("myUploads.colChapter")}</th>
                  <th className="py-2 pr-3 font-medium">{t("myUploads.colLocale")}</th>
                  <th className="py-2 pr-3 font-medium">{t("myUploads.colDate")}</th>
                  <th className="py-2 pr-3 font-medium">{t("myUploads.colStatus")}</th>
                  <th className="py-2 font-medium">{t("myUploads.colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((r) => (
                  <tr key={r.uploadId} className="border-b border-border/80">
                    <td className="py-2 pr-3 text-foreground">{r.mangaTitle}</td>
                    <td className="py-2 pr-3 text-foreground">
                      #{r.chapterNumber}
                      {r.chapterTitle ? ` — ${r.chapterTitle}` : ""}
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">{r.chapterLocale}</td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {new Date(r.submittedAt).toLocaleString(locale)}
                    </td>
                    <td className="py-2 pr-3">
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                        {statusLabel("status", r.uploadStatus)} / {statusLabel("chapterStatus", r.chapterStatus)}
                      </span>
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/${locale}/read/${r.chapterId}`}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          {t("myUploads.read")}
                        </Link>
                        {confirmId === r.uploadId ? (
                          <>
                            <button
                              type="button"
                              className="text-xs font-medium text-destructive hover:underline"
                              disabled={deletingId === r.uploadId}
                              onClick={() => void onDelete(r.uploadId)}
                            >
                              {t("myUploads.confirmDelete")}
                            </button>
                            <button
                              type="button"
                              className="text-xs text-muted-foreground hover:underline"
                              onClick={() => setConfirmId(null)}
                            >
                              {t("myUploads.cancelDelete")}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="text-xs font-medium text-destructive hover:underline"
                            onClick={() => setConfirmId(r.uploadId)}
                          >
                            {t("myUploads.delete")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasMore && (
            <div className="mt-4 flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
              >
                {t("myUploads.loadMore")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

type BoostPrices = {
  1: { coins: number; shards: number };
  7: { coins: number; shards: number };
  30: { coins: number; shards: number };
};

function BoostSection() {
  const tBoost = useTranslations("boost");
  const locale = useLocale();

  const [boostLoading, setBoostLoading] = useState(true);
  const [boostMangas, setBoostMangas] = useState<BoostMangaRow[]>([]);
  const [zenCoins, setZenCoins] = useState(0);
  const [zenShards, setZenShards] = useState(0);
  const [boostPrices, setBoostPrices] = useState<BoostPrices>({
    1: { coins: 500, shards: 50_000 },
    7: { coins: 2500, shards: 250_000 },
    30: { coins: 8000, shards: 800_000 },
  });

  const [boostDialogOpen, setBoostDialogOpen] = useState(false);
  const [selectedBoostManga, setSelectedBoostManga] = useState<BoostMangaRow | null>(null);
  const [boostDays, setBoostDays] = useState<1 | 7 | 30>(7);
  const [boostCurrency, setBoostCurrency] = useState<"coins" | "shards">("shards");
  const [boostPassword, setBoostPassword] = useState("");
  const [boostSubmitting, setBoostSubmitting] = useState(false);

  const loadBoost = useCallback(async () => {
    setBoostLoading(true);
    try {
      const res = await fetch("/api/scan/boost-mangas");
      if (!res.ok) {
        toast.error(tBoost("errors.generic"));
        return;
      }
      const data = (await res.json()) as {
        zenCoins?: number;
        zenShards?: number;
        mangas?: BoostMangaRow[];
        prices?: BoostPrices;
      };
      setZenCoins(typeof data.zenCoins === "number" ? data.zenCoins : 0);
      setZenShards(typeof data.zenShards === "number" ? data.zenShards : 0);
      setBoostMangas(Array.isArray(data.mangas) ? data.mangas : []);
      if (data.prices) setBoostPrices(data.prices);
    } catch {
      toast.error(tBoost("errors.generic"));
    } finally {
      setBoostLoading(false);
    }
  }, [tBoost]);

  useEffect(() => {
    void loadBoost();
  }, [loadBoost]);

  function openBoostDialog(m: BoostMangaRow) {
    setSelectedBoostManga(m);
    setBoostDays(7);
    setBoostCurrency("shards");
    setBoostPassword("");
    setBoostDialogOpen(true);
  }

  const priceCoins = boostPrices[boostDays].coins;
  const priceShards = boostPrices[boostDays].shards;
  const price = boostCurrency === "coins" ? priceCoins : priceShards;
  const balance = boostCurrency === "coins" ? zenCoins : zenShards;
  const canAfford = balance >= price;

  async function confirmBoost() {
    if (!selectedBoostManga) return;
    if (!canAfford) {
      toast.error(tBoost("errors.insufficientBalance"));
      return;
    }
    setBoostSubmitting(true);
    try {
      const res = await fetch("/api/scan/boost-manga", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mangaSlug: selectedBoostManga.slug,
          days: boostDays,
          currency: boostCurrency,
          ...(boostCurrency === "coins" ? { reauth_password: boostPassword } : {}),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        boostExpiresAt?: string | null;
        balances?: { zenCoins: number; zenShards: number };
        error?: string;
      };
      if (!res.ok || !data.ok) {
        const code = data.error ?? "GENERIC";
        if (code === "INSUFFICIENT_COINS" || code === "INSUFFICIENT_SHARDS") {
          toast.error(tBoost("errors.insufficientBalance"));
        } else if (code === "NOT_OWNER") {
          toast.error(tBoost("errors.notOwner"));
        } else {
          toast.error(tBoost("errors.generic"));
        }
        return;
      }
      if (data.balances) {
        setZenCoins(data.balances.zenCoins);
        setZenShards(data.balances.zenShards);
      }
      setBoostMangas((prev) =>
        prev.map((m) => (m.slug === selectedBoostManga.slug ? { ...m, boostExpiresAt: data.boostExpiresAt ?? null } : m))
      );
      toast.success(tBoost("toastBoosted"));
      setBoostPassword("");
      setBoostDialogOpen(false);
    } catch {
      toast.error(tBoost("errors.generic"));
    } finally {
      setBoostSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{tBoost("panelTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{tBoost("panelSubtitle")}</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-2.5 py-1 text-muted-foreground">
              <Coins className="h-3.5 w-3.5 text-yellow-500" aria-hidden /> {zenCoins.toLocaleString()} ZC
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-2.5 py-1 text-muted-foreground">
              <Gem className="h-3.5 w-3.5 text-primary" aria-hidden /> {zenShards.toLocaleString()} ZS
            </span>
          </div>
        </div>

        {boostLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">{tBoost("loading")}</p>
        ) : boostMangas.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{tBoost("empty")}</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {boostMangas.map((m) => {
              const activeUntil =
                m.boostExpiresAt && new Date(m.boostExpiresAt).getTime() > Date.now()
                  ? new Date(m.boostExpiresAt).toLocaleString(locale)
                  : null;
              return (
                <li key={m.id} className="rounded-xl border border-border bg-background/50 p-3">
                  <div className="flex items-start gap-3">
                    {m.coverImage ? (
                      <Image
                        src={m.coverImage}
                        alt={m.title}
                        width={48}
                        height={64}
                        className="h-16 w-12 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="h-16 w-12 shrink-0 rounded bg-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{m.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {activeUntil ? tBoost("activeUntil", { date: activeUntil }) : tBoost("inactive")}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {activeUntil ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-900 dark:text-amber-100">
                            <Zap className="h-3 w-3 text-amber-600 dark:text-amber-300" aria-hidden />
                            {tBoost("badgePromoted")}
                          </span>
                        ) : null}
                        <Button type="button" size="sm" onClick={() => openBoostDialog(m)}>
                          {tBoost("promoteButton")}
                        </Button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog
        open={boostDialogOpen}
        onOpenChange={(open) => {
          setBoostDialogOpen(open);
          if (!open) setBoostPassword("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tBoost("dialogTitle")}</DialogTitle>
            <DialogDescription>
              {selectedBoostManga ? tBoost("dialogSubtitle", { title: selectedBoostManga.title }) : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{tBoost("durationLabel")}</p>
              <div className="flex flex-wrap gap-2">
                {[1, 7, 30].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setBoostDays(d as 1 | 7 | 30)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      boostDays === d
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-border bg-background/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {d === 1 ? tBoost("duration1d") : d === 7 ? tBoost("duration7d") : tBoost("duration30d")}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{tBoost("currencyLabel")}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setBoostCurrency("coins")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    boostCurrency === "coins"
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border bg-background/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  <Coins className="h-3.5 w-3.5 text-yellow-500" aria-hidden /> ZC
                </button>
                <button
                  type="button"
                  onClick={() => setBoostCurrency("shards")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    boostCurrency === "shards"
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border bg-background/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  <Gem className="h-3.5 w-3.5 text-primary" aria-hidden /> ZS
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-background/40 p-3 text-sm">
              <p className="text-foreground">
                {tBoost("priceLine", {
                  price: (boostCurrency === "coins" ? priceCoins : priceShards).toLocaleString(),
                  currency: boostCurrency === "coins" ? "ZC" : "ZS",
                })}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {tBoost("balanceLine", {
                  balance: balance.toLocaleString(),
                  currency: boostCurrency === "coins" ? "ZC" : "ZS",
                })}
              </p>
              {!canAfford ? (
                <p className="mt-2 text-xs font-medium text-destructive">{tBoost("errors.insufficientBalance")}</p>
              ) : null}
            </div>

            {boostCurrency === "coins" && (
              <div className="mt-3">
                <label className="text-xs font-medium text-muted-foreground">{tBoost("reauthLabel")}</label>
                <input
                  type="password"
                  value={boostPassword}
                  onChange={(e) => setBoostPassword(e.target.value)}
                  placeholder={tBoost("reauthPlaceholder")}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBoostDialogOpen(false)} disabled={boostSubmitting}>
              {tBoost("cancel")}
            </Button>
            <Button type="button" onClick={() => void confirmBoost()} disabled={boostSubmitting || !selectedBoostManga}>
              {boostSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {tBoost("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NewMangaSection() {
  const t = useTranslations("scanPanel");
  const [tags, setTags] = useState<TagRow[]>([]);
  const [tagIds, setTagIds] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [alternativeTitle, setAlternativeTitle] = useState("");
  const [description, setDescription] = useState("");
  const [author, setAuthor] = useState("");
  const [artist, setArtist] = useState("");
  const [releaseYear, setReleaseYear] = useState("");
  const [publisher, setPublisher] = useState("");
  const [country, setCountry] = useState("");
  const [customCountry, setCustomCountry] = useState("");
  const [altTitles, setAltTitles] = useState<{ locale: string; title: string }[]>([]);
  const [status, setStatus] = useState<string>(SCAN_MANGA_STATUS[0]);
  const [type, setType] = useState<string>(SCAN_MANGA_TYPES[0]);
  const [demographic, setDemographic] = useState("");
  const [contentRating, setContentRating] = useState<string>(SCAN_CONTENT_RATINGS[0]);
  const [cover, setCover] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/scan/tags");
        const data = (await res.json()) as { tags?: TagRow[] };
        setTags(data.tags ?? []);
      } catch {
        setTags([]);
      }
    })();
  }, []);

  function toggleTag(id: string) {
    setTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cover) {
      toast.error(t("newManga.coverRequired"));
      return;
    }
    const formData = new FormData();
    formData.set("title", title.trim());
    if (alternativeTitle.trim()) formData.set("alternativeTitle", alternativeTitle.trim());
    if (description.trim()) formData.set("description", description.trim());
    if (author.trim()) formData.set("author", author.trim());
    if (artist.trim()) formData.set("artist", artist.trim());
    formData.set("status", status);
    formData.set("type", type);
    if (demographic) formData.set("demographic", demographic);
    formData.set("contentRating", contentRating);
    formData.set("tagIds", JSON.stringify(Array.from(tagIds)));
    formData.set("cover", cover);

    formData.append("releaseYear", releaseYear);
    formData.append("publisher", publisher);
    formData.append("country", country === "OTHER" ? customCountry : country);
    altTitles.forEach((at, i) => {
      formData.append(`altTitles[${i}][locale]`, at.locale);
      formData.append(`altTitles[${i}][title]`, at.title);
    });

    setBusy(true);
    setProgress(0);
    try {
      const { ok, body } = await postFormDataWithProgress("/api/scan/manga", formData, setProgress);
      if (ok) {
        setProgress(100);
        toast.success(t("newManga.success"));
        setTitle("");
        setAlternativeTitle("");
        setDescription("");
        setAuthor("");
        setArtist("");
        setTagIds(new Set());
        setCover(null);
        setReleaseYear("");
        setPublisher("");
        setCountry("");
        setCustomCountry("");
        setAltTitles([]);
      } else {
        setProgress(0);
        const code = typeof body?.error === "string" ? body.error : "GENERIC";
        toast.error(translateError(t, code));
      }
    } catch {
      setProgress(0);
      toast.error(t("errors.GENERIC"));
    } finally {
      setBusy(false);
      setTimeout(() => setProgress(0), 600);
    }
  }

  const statusOptions = useMemo(() => [...SCAN_MANGA_STATUS], []);
  const typeOptions = useMemo(() => [...SCAN_MANGA_TYPES], []);
  const demoOptions = useMemo(() => [...SCAN_DEMOGRAPHICS], []);
  const ratingOptions = useMemo(() => [...SCAN_CONTENT_RATINGS], []);

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">{t("newManga.heading")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("newManga.hint")}</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-foreground">{t("newManga.title")}</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
              disabled={busy}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-foreground">{t("newManga.alternativeTitle")}</label>
            <input
              value={alternativeTitle}
              onChange={(e) => setAlternativeTitle(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
              disabled={busy}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-foreground">{t("newManga.description")}</label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
              disabled={busy}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">{t("newManga.author")}</label>
            <input
              required
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
              disabled={busy}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">{t("newManga.artist")}</label>
            <input
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
              disabled={busy}
            />
          </div>
        </div>

        {/* Campos nuevos obligatorios */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-sm font-medium text-foreground">
              Año de lanzamiento <span className="text-destructive">*</span>
            </label>
            <input
              required
              type="number"
              min={1900}
              max={new Date().getFullYear()}
              value={releaseYear}
              onChange={(e) => setReleaseYear(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
              disabled={busy}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">
              Editorial <span className="text-destructive">*</span>
            </label>
            <input
              required
              value={publisher}
              onChange={(e) => setPublisher(e.target.value)}
              placeholder="Ej: Shueisha, Webtoon..."
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
              disabled={busy}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">
              País de origen <span className="text-destructive">*</span>
            </label>
            <select
              required
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                if (e.target.value !== "OTHER") setCustomCountry("");
              }}
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
              disabled={busy}
            >
              <option value="">Seleccionar...</option>
              <option value="JP">Japón 🇯🇵</option>
              <option value="KR">Corea del Sur 🇰🇷</option>
              <option value="CN">China 🇨🇳</option>
              <option value="US">Estados Unidos 🇺🇸</option>
              <option value="FR">Francia 🇫🇷</option>
              <option value="OTHER">Otro...</option>
            </select>

            {country === "OTHER" && (
              <input
                required
                value={customCountry}
                onChange={(e) => setCustomCountry(e.target.value)}
                placeholder="Escribí el país..."
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
                disabled={busy}
              />
            )}
          </div>
        </div>

        {/* Títulos alternativos opcionales */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              Títulos alternativos <span className="text-xs text-muted-foreground">(opcional)</span>
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => setAltTitles((prev) => [...prev, { locale: "en-us", title: "" }])}
              className="text-xs text-primary hover:underline"
            >
              + Agregar título
            </button>
          </div>
          {altTitles.length > 0 && (
            <div className="mt-2 space-y-2">
              {altTitles.map((at, i) => (
                <div key={i} className="flex gap-2">
                  <select
                    value={at.locale}
                    onChange={(e) =>
                      setAltTitles((prev) =>
                        prev.map((a, j) => (j === i ? { ...a, locale: e.target.value } : a)),
                      )
                    }
                    className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
                    disabled={busy}
                  >
                    <option value="en-us">Inglés (US)</option>
                    <option value="en-gb">Inglés (GB)</option>
                    <option value="es-ar">Español (AR)</option>
                    <option value="es-es">Español (ES)</option>
                    <option value="pt-br">Portugués (BR)</option>
                    <option value="ja-jp">Japonés</option>
                    <option value="ko-kr">Coreano</option>
                    <option value="zh-cn">Chino (CN)</option>
                    <option value="fr-fr">Francés</option>
                  </select>
                  <input
                    value={at.title}
                    onChange={(e) =>
                      setAltTitles((prev) =>
                        prev.map((a, j) => (j === i ? { ...a, title: e.target.value } : a)),
                      )
                    }
                    placeholder="Título alternativo..."
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
                    disabled={busy}
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setAltTitles((prev) => prev.filter((_, j) => j !== i))}
                    className="rounded-lg border border-border px-2 py-2 text-xs text-destructive hover:bg-destructive/10"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-foreground">{t("newManga.status")}</label>
            <Select value={status} onValueChange={setStatus} disabled={busy}>
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`mangaStatus.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">{t("newManga.type")}</label>
            <Select value={type} onValueChange={setType} disabled={busy}>
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((ty) => (
                  <SelectItem key={ty} value={ty}>
                    {t(`mangaType.${ty}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">{t("newManga.demographic")}</label>
            <Select
              value={demographic || "__none__"}
              onValueChange={(v) => setDemographic(v === "__none__" ? "" : v)}
              disabled={busy}
            >
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t("newManga.demographicNone")}</SelectItem>
                {demoOptions.map((d) => (
                  <SelectItem key={d} value={d}>
                    {t(`demographic.${d}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">{t("newManga.contentRating")}</label>
            <Select value={contentRating} onValueChange={setContentRating} disabled={busy}>
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ratingOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {t(`contentRating.${c}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <span className="text-sm font-medium text-foreground">{t("newManga.tags")}</span>
          <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-border bg-background p-2">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  disabled={busy}
                  onClick={() => toggleTag(tag.id)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                    tagIds.has(tag.id)
                      ? "border-primary bg-primary/20 text-foreground"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground">{t("newManga.cover")}</label>
          <div className="mt-1.5 flex items-center gap-3">
            <label className="cursor-pointer rounded-lg border-0 bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90">
              {t("upload.chooseFile")}
              <input
                type="file"
                accept="image/*"
                required
                className="hidden"
                onChange={(e) => setCover(e.target.files?.[0] ?? null)}
                disabled={busy}
              />
            </label>
            <span className="text-sm text-muted-foreground">
              {cover ? cover.name : t("upload.noFileSelected")}
            </span>
          </div>
        </div>

        {busy && (
          <div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t("newManga.progress", { pct: progress })}</p>
          </div>
        )}

        <Button type="submit" disabled={busy} className="bg-primary text-primary-foreground hover:opacity-90">
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("newManga.submitting")}
            </>
          ) : (
            t("newManga.submit")
          )}
        </Button>
      </form>
    </div>
  );
}
