"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Globe2,
  Languages,
  Moon,
  Settings,
  Sun,
  X,
} from "lucide-react";
import { notifyBadgesEarned } from "@/components/badges/notify-badges-earned";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { getPlatform } from "@/lib/donation-platforms";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import {
  ReaderChapterLanguageMenu,
  getReaderLocaleDisplayName,
  type ChapterLanguageOption,
} from "@/components/read/ReaderChapterLanguageMenu";
import { AdSlot } from "@/components/AdSlot";

type ReaderPage = {
  id: string;
  pageNumber: number;
  imageUrl: string;
  isSingleInDoublePage?: boolean;
};

type SinglePageMap = Record<number, boolean>;

type ReaderClientProps = {
  mangaId: string;
  /** Slug del manga para presencia en ficha / contadores. */
  mangaSlug: string;
  chapterId: string;
  /** Locale del contenido del capítulo (p. ej. es-ar). */
  chapterLocale: string;
  /** Capítulo equivalente por locale de UI (mismo número); `chapterId` null = no publicado en ese idioma. */
  chapterLanguageOptions: ChapterLanguageOption[];
  /** Si es true, persiste capítulo/página en servidor (debounce 3s). */
  syncProgress: boolean;
  mangaTitle: string;
  chapterNumber: number;
  pages: ReaderPage[];
  /** Si es true, en doble página la pág. 1 va sola; si es false, el primer spread es 1–2. */
  chapterStartsWithSinglePage?: boolean;
  initialPage: number;
  backHref: string;
  prevChapterHref: string | null;
  nextChapterHref: string | null;
  nextChapterLocale: string | null;
  nextChapterNumber?: number | null;
  nextChapterTitle?: string | null;
  nextChapterPreviewImage?: string | null;
  uploaderDonationLinks?: { id: string; platform: string; url: string }[];
  uploaderLegacyDonationLink?: string | null;
  /** Si es false, no se muestra el slot al final del capítulo (p. ej. usuario Pro). */
  showAds?: boolean;
};

type ReadingMode = "waterfall" | "single-page" | "double-page";
type FitMode = "width" | "height";
type ReadingDirection = "ltr" | "rtl";

const STORAGE_READING_MODE = "mangazen-reader-reading-mode";
const STORAGE_FIT_MODE = "mangazen-reader-fit-mode";
const STORAGE_BRIGHTNESS = "mangazen-reader-brightness";
const STORAGE_READING_DIRECTION = "mangazen-reader-reading-direction";
const STORAGE_IGNORE_LOCALE_CHANGE = "mangazen-reader-ignore-locale-change";

function parseStoredReadingMode(value: string | null): ReadingMode | null {
  return value === "waterfall" || value === "single-page" || value === "double-page" ? value : null;
}

/**
 * Anclas de spread: con portada sola en pág. 1 → [1], luego 2,4,6…;
 * sin portada sola → 1,3,5… (pares 1–2, 3–4…).
 */
function buildSpreadAnchors(
  total: number,
  startsWithSinglePage: boolean,
  singlePageMap: SinglePageMap = {}
): number[] {
  if (total <= 0) return [];

  const anchors: number[] = [];
  let p = 1;

  if (startsWithSinglePage || singlePageMap[1]) {
    anchors.push(1);
    p = 2;
  }

  while (p <= total) {
    anchors.push(p);
    if (singlePageMap[p]) {
      p += 1;
    } else if (p + 1 <= total && singlePageMap[p + 1]) {
      p += 1;
    } else {
      p += 2;
    }
  }
  return anchors;
}

function snapToSpreadAnchor(
  page: number,
  total: number,
  startsWithSinglePage: boolean,
  singlePageMap: SinglePageMap = {}
): number {
  const anchors = buildSpreadAnchors(total, startsWithSinglePage, singlePageMap);
  if (anchors.length === 0) return 1;
  let best = anchors[0]!;
  for (const a of anchors) {
    if (a <= page) best = a;
  }
  return best;
}

function nextSpreadAnchor(
  anchor: number,
  total: number,
  startsWithSinglePage: boolean,
  singlePageMap: SinglePageMap = {}
): number {
  const a = buildSpreadAnchors(total, startsWithSinglePage, singlePageMap);
  const i = a.indexOf(anchor);
  if (i < 0 || i >= a.length - 1) return anchor;
  return a[i + 1]!;
}

function prevSpreadAnchor(
  anchor: number,
  total: number,
  startsWithSinglePage: boolean,
  singlePageMap: SinglePageMap = {}
): number {
  const a = buildSpreadAnchors(total, startsWithSinglePage, singlePageMap);
  const i = a.indexOf(anchor);
  if (i <= 0) return anchor;
  return a[i - 1]!;
}

function getDoubleVisiblePageNumbers(
  anchor: number,
  total: number,
  startsWithSinglePage: boolean,
  singlePageMap: SinglePageMap = {}
): number[] {
  if (total === 0) return [];
  if ((startsWithSinglePage && anchor === 1) || singlePageMap[anchor]) return [anchor];
  if (anchor + 1 <= total) return [anchor, anchor + 1];
  return [anchor];
}

function parseStoredFitMode(value: string | null): FitMode | null {
  return value === "width" || value === "height" ? value : null;
}

function parseStoredBrightness(value: string | null): number | null {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(150, Math.max(50, Math.round(n)));
}

function parseStoredReadingDirection(value: string | null): ReadingDirection | null {
  return value === "ltr" || value === "rtl" ? value : null;
}

const PROGRESS_DEBOUNCE_MS = 3000;
const PAGED_FADE_MS = 200;

/** Espacio aproximado para la barra superior del lector (y franja de progreso en una página). */
const READER_CHROME_TOP_PX = 56;
/** Espacio reservado bajo la imagen cuando la barra inferior va fija al viewport. */
const READER_CHROME_BOTTOM_PX = 56;

/** Doble página: un solo contenedor fijo + `img` nativos y `object-position` para unir las páginas en el centro. */
function DoublePageFixedSpread({
  pages,
  rtl,
  brightnessStyle,
  getAlt,
  fadeOverlayClassName,
}: {
  pages: ReaderPage[];
  rtl: boolean;
  brightnessStyle?: CSSProperties;
  getAlt: (page: ReaderPage) => string;
  /** Transición de opacidad en el mismo nodo fijo (evita envolver en un padre que rompa `position:fixed`). */
  fadeOverlayClassName?: string;
}) {
  const containerStyle: CSSProperties = {
    position: "fixed",
    top: READER_CHROME_TOP_PX,
    bottom: READER_CHROME_BOTTOM_PX,
    left: 0,
    right: 0,
    display: "flex",
    flexDirection: "row",
    alignItems: "stretch",
    zIndex: 10,
    overflow: "hidden",
    ...brightnessStyle,
  };

  if (pages.length === 0) return null;

  if (pages.length === 1) {
    const p = pages[0]!;
    return (
      <div className={cn("pointer-events-none bg-zinc-950", fadeOverlayClassName)} style={containerStyle}>
        {/* eslint-disable-next-line @next/next/no-img-element -- object-position / sin wrapper de next/image */}
        <img
          src={p.imageUrl}
          alt={getAlt(p)}
          loading="eager"
          decoding="async"
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            objectPosition: "center center",
            pointerEvents: "none",
          }}
        />
      </div>
    );
  }

  const [leftPage, rightPage] = pages;
  const firstPage = rtl ? rightPage : leftPage;
  const secondPage = rtl ? leftPage : rightPage;

  return (
    <div className={cn("pointer-events-none bg-zinc-950", fadeOverlayClassName)} style={containerStyle}>
      {/* eslint-disable-next-line @next/next/no-img-element -- object-position / sin wrapper de next/image */}
      <img
        src={firstPage.imageUrl}
        alt={getAlt(firstPage)}
        loading="eager"
        decoding="async"
        draggable={false}
        style={{
          width: "50%",
          height: "100%",
          flexShrink: 0,
          objectFit: "contain",
          objectPosition: "right center",
          pointerEvents: "none",
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- object-position / sin wrapper de next/image */}
      <img
        src={secondPage.imageUrl}
        alt={getAlt(secondPage)}
        loading="eager"
        decoding="async"
        draggable={false}
        style={{
          width: "50%",
          height: "100%",
          flexShrink: 0,
          objectFit: "contain",
          objectPosition: "left center",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

function controlButtonClass(active: boolean) {
  return cn(
    "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
    active
      ? "bg-primary text-primary-foreground"
      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
  );
}

export default function ReaderClient({
  mangaId,
  mangaSlug,
  chapterId,
  chapterLocale,
  chapterLanguageOptions,
  syncProgress,
  mangaTitle,
  chapterNumber,
  pages,
  chapterStartsWithSinglePage = true,
  initialPage,
  backHref,
  prevChapterHref,
  nextChapterHref,
  nextChapterLocale,
  nextChapterNumber = null,
  nextChapterTitle = null,
  nextChapterPreviewImage = null,
  uploaderDonationLinks = [],
  uploaderLegacyDonationLink = null,
  showAds = true,
}: ReaderClientProps) {
  const t = useTranslations("reader");
  const tBadges = useTranslations("badges");
  const tEnd = useTranslations("readerChapterEnd");
  const tDon = useTranslations("donation");
  const [uiVisible, setUiVisible] = useState(true);
  /** Solo modo cascada: el CTA al final depende del IntersectionObserver (no se deriva de currentPage). */
  const [waterfallEndCtaVisible, setWaterfallEndCtaVisible] = useState(false);
  const waterfallEndRef = useRef<HTMLDivElement>(null);
  const waterfallWasIntersectingRef = useRef(false);

  // Fallback de capítulo vacío: `pages` es estable por montaje gracias a `key={chapter.id}` en el padre,
  // así que el early return no altera el orden de hooks entre renders del mismo mount.
  if (pages.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <p className="text-4xl">📭</p>
        <h2 className="text-lg font-semibold text-foreground">{t("emptyChapterTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("emptyChapterBody")}</p>
        <Link
          href={backHref}
          className="rounded-full border border-border bg-muted px-5 py-2 text-sm text-foreground transition-colors hover:bg-muted/80"
        >
          {t("backToDetail")}
        </Link>
      </div>
    );
  }

  useEffect(() => {
    async function presencePing() {
      try {
        await fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mangaSlug }),
        });
      } catch {
        /* ignore */
      }
    }
    void presencePing();
    const id = window.setInterval(presencePing, 60_000);
    return () => window.clearInterval(id);
  }, [mangaSlug]);

  useEffect(() => {
    // Registrar vista real del capítulo — se dispara una sola vez por montaje.
    void fetch("/api/chapter/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterId }),
    }).catch(() => {});
  }, [chapterId]);

  const [currentPage, setCurrentPageImmediate] = useState(() =>
    pages.length === 0 ? 1 : Math.min(Math.max(initialPage, 1), pages.length)
  );
  const [transitioning, setTransitioning] = useState(false);
  const fadeTimerRef = useRef<number | null>(null);
  const transitioningRef = useRef(false);
  const currentPageRef = useRef(1);
  const [chapterLanguageOpen, setChapterLanguageOpen] = useState(false);
  const [readingMode, setReadingMode] = useState<ReadingMode>("waterfall");
  const [fitMode, setFitMode] = useState<FitMode>("width");
  const [brightness, setBrightness] = useState(100);
  const [readingDirection, setReadingDirection] = useState<ReadingDirection>("ltr");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prefsHydrated, setPrefsHydrated] = useState(false);
  const [sheetSide, setSheetSide] = useState<"right" | "bottom">("right");
  const [ignoreLocaleChange, setIgnoreLocaleChange] = useState(false);
  const [nextLocaleDialogOpen, setNextLocaleDialogOpen] = useState(false);
  const [rememberLocaleChoice, setRememberLocaleChoice] = useState(false);
  const [currentChapterLocale, setCurrentChapterLocale] = useState(() => chapterLocale.toLowerCase());
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = (resolvedTheme ?? "dark") === "dark";
  const singlePageMap = useMemo(
    () => Object.fromEntries(pages.map((p) => [p.pageNumber, p.isSingleInDoublePage ?? false])),
    [pages]
  );

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
    };
  }, []);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setSheetSide(mq.matches ? "right" : "bottom");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  /** Preferencias desde localStorage: solo en el cliente, antes del primer paint (evita mismatch SSR y layout roto tras F5). */
  useLayoutEffect(() => {
    try {
      const storedMode = parseStoredReadingMode(localStorage.getItem(STORAGE_READING_MODE));
      const storedFit = parseStoredFitMode(localStorage.getItem(STORAGE_FIT_MODE));
      const storedBrightness = parseStoredBrightness(localStorage.getItem(STORAGE_BRIGHTNESS));
      const storedDir = parseStoredReadingDirection(localStorage.getItem(STORAGE_READING_DIRECTION));
      if (storedBrightness != null) setBrightness(storedBrightness);
      if (storedDir != null) setReadingDirection(storedDir);
      if (storedMode === "single-page") {
        setReadingMode("single-page");
        setFitMode(storedFit ?? "width");
      } else if (storedMode === "double-page") {
        setReadingMode("double-page");
        setFitMode(storedFit ?? "width");
        setCurrentPageImmediate((cp) =>
          snapToSpreadAnchor(cp, pages.length, chapterStartsWithSinglePage, singlePageMap)
        );
      } else {
        setReadingMode("waterfall");
        setFitMode("width");
      }
    } catch {
      /* private mode / quota */
    }
    setPrefsHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hidratar una vez al montar (valores por defecto alineados con SSR)
  }, []);

  useEffect(() => {
    setCurrentChapterLocale(chapterLocale.toLowerCase());
  }, [chapterId, chapterLocale]);

  useEffect(() => {
    try {
      setIgnoreLocaleChange(localStorage.getItem(STORAGE_IGNORE_LOCALE_CHANGE) === "1");
    } catch {
      setIgnoreLocaleChange(false);
    }
  }, []);

  useEffect(() => {
    if (!prefsHydrated) return;
    try {
      localStorage.setItem(STORAGE_READING_MODE, readingMode);
      const fitToStore = readingMode === "waterfall" ? "width" : fitMode;
      localStorage.setItem(STORAGE_FIT_MODE, fitToStore);
      localStorage.setItem(STORAGE_BRIGHTNESS, String(brightness));
      localStorage.setItem(STORAGE_READING_DIRECTION, readingDirection);
    } catch {
      /* ignore */
    }
  }, [prefsHydrated, readingMode, fitMode, brightness, readingDirection]);

  // Solo hacer scroll en cascada despues de cargar preferencias (evita scroll innecesario si el usuario usa single-page guardado).
  useEffect(() => {
    if (!prefsHydrated || readingMode !== "waterfall" || pages.length === 0) return;
    const safePage = Math.min(Math.max(initialPage, 1), pages.length);
    const id = window.setTimeout(() => {
      const target = document.querySelector<HTMLElement>(`[data-page='${safePage}']`);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => window.clearTimeout(id);
  }, [initialPage, pages.length, prefsHydrated, readingMode]);

  /** Página a página + ajuste al ancho: al cambiar de página, el scroll vuelve arriba (antes del paint). */
  useLayoutEffect(() => {
    if (readingMode !== "single-page" || fitMode !== "width") return;
    window.scrollTo(0, 0);
  }, [currentPage, readingMode, fitMode]);

  useEffect(() => {
    const onMove = () => {
      setUiVisible(true);
      window.clearTimeout((onMove as unknown as { t?: number }).t);
      (onMove as unknown as { t?: number }).t = window.setTimeout(() => setUiVisible(false), 1700);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchstart", onMove, { passive: true });
    onMove();
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchstart", onMove);
    };
  }, []);

  useEffect(() => {
    if (readingMode !== "waterfall") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const page = Number((visible.target as HTMLElement).dataset.page);
        if (Number.isFinite(page)) setCurrentPageImmediate(page);
      },
      { threshold: [0.35, 0.6, 0.85] }
    );

    const nodes = Array.from(document.querySelectorAll("[data-reader-page='true']"));
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [pages.length, readingMode]);

  /** Fin de capítulo en cascada: sentinel al final; evita falso positivo si el contenido cabe en pantalla. */
  useEffect(() => {
    if (readingMode !== "waterfall" || !prefsHydrated || pages.length === 0) return;
    const el = waterfallEndRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        const intersecting = entry.isIntersecting;
        if (intersecting && !waterfallWasIntersectingRef.current) {
          const scrollable =
            document.documentElement.scrollHeight > window.innerHeight + 24;
          const scrolled = window.scrollY > 64;
          if (!scrollable && !scrolled) {
            waterfallWasIntersectingRef.current = intersecting;
            return;
          }
          setWaterfallEndCtaVisible(true);
        }
        if (!intersecting) {
          setWaterfallEndCtaVisible(false);
        }
        waterfallWasIntersectingRef.current = intersecting;
      },
      { root: null, threshold: 0, rootMargin: "0px 0px 180px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [pages.length, prefsHydrated, readingMode]);

  const totalPages = useMemo(() => pages.length, [pages.length]);
  const activePage = pages[Math.max(0, Math.min(currentPage - 1, totalPages - 1))] ?? null;

  const doubleVisibleNums = useMemo(() => {
    if (readingMode !== "double-page" || totalPages === 0) return [];
    return getDoubleVisiblePageNumbers(
      currentPage,
      totalPages,
      chapterStartsWithSinglePage,
      singlePageMap
    );
  }, [readingMode, currentPage, totalPages, chapterStartsWithSinglePage, singlePageMap]);

  const doubleVisiblePages = useMemo(() => {
    return doubleVisibleNums
      .map((n) => pages.find((p) => p.pageNumber === n))
      .filter((p): p is ReaderPage => p != null);
  }, [doubleVisibleNums, pages]);

  const pagedProgressPercent = useMemo(() => {
    if (totalPages <= 0) return 0;
    if (readingMode === "double-page") {
      const nums = getDoubleVisiblePageNumbers(
        currentPage,
        totalPages,
        chapterStartsWithSinglePage,
        singlePageMap
      );
      const hi = Math.max(...nums);
      return Math.min(100, Math.max(0, (hi / totalPages) * 100));
    }
    if (readingMode === "single-page") {
      return Math.min(100, Math.max(0, (currentPage / totalPages) * 100));
    }
    return 0;
  }, [readingMode, totalPages, currentPage, chapterStartsWithSinglePage, singlePageMap]);

  const pagedEndCtaVisible = useMemo(() => {
    if (totalPages <= 0) return false;
    if (readingMode === "single-page") return currentPage >= totalPages;
    if (readingMode === "double-page") {
      const nums = getDoubleVisiblePageNumbers(
        currentPage,
        totalPages,
        chapterStartsWithSinglePage,
        singlePageMap
      );
      return Math.max(...nums) >= totalPages;
    }
    return false;
  }, [readingMode, totalPages, currentPage, chapterStartsWithSinglePage, singlePageMap]);

  const chapterEndCtaVisible =
    pagedEndCtaVisible || (readingMode === "waterfall" && waterfallEndCtaVisible);

  const resolvedNextLocale = useMemo(() => {
    if (nextChapterLocale) return nextChapterLocale.toLowerCase();
    if (!nextChapterHref) return null;
    const parts = nextChapterHref.split("/").filter(Boolean);
    return parts[0]?.toLowerCase() ?? null;
  }, [nextChapterHref, nextChapterLocale]);

  const nextLocaleKind = useMemo<"same" | "base" | "different">(() => {
    if (!resolvedNextLocale) return "same";
    const cur = currentChapterLocale;
    const nxt = resolvedNextLocale;
    if (cur === nxt) return "same";
    const curBase = cur.split("-")[0] ?? cur;
    const nxtBase = nxt.split("-")[0] ?? nxt;
    if (curBase === nxtBase) return "base";
    return "different";
  }, [currentChapterLocale, resolvedNextLocale]);

  const nextLocaleName = resolvedNextLocale ? getReaderLocaleDisplayName(resolvedNextLocale) : "";

  const handleNavigateNext = useCallback(() => {
    if (!nextChapterHref) return;
    if (ignoreLocaleChange || nextLocaleKind === "same") {
      router.push(nextChapterHref);
      return;
    }
    setNextLocaleDialogOpen(true);
  }, [ignoreLocaleChange, nextLocaleKind, nextChapterHref, router]);

  const confirmNextLocaleNavigation = useCallback(() => {
    if (!nextChapterHref) return;
    if (rememberLocaleChoice) {
      try {
        localStorage.setItem(STORAGE_IGNORE_LOCALE_CHANGE, "1");
        setIgnoreLocaleChange(true);
      } catch {
        // ignore storage errors
      }
    }
    setNextLocaleDialogOpen(false);
    router.push(nextChapterHref);
  }, [nextChapterHref, rememberLocaleChoice, router]);

  const goToPage = useCallback(
    (next: number) => {
      if (totalPages === 0) return;
      const safePage = Math.max(1, Math.min(next, totalPages));
      if (readingMode === "waterfall") {
        setCurrentPageImmediate(safePage);
        return;
      }
      if (readingMode !== "single-page" && readingMode !== "double-page") {
        setCurrentPageImmediate(safePage);
        return;
      }
      if (transitioningRef.current) return;
      if (currentPageRef.current === safePage) return;
      transitioningRef.current = true;
      setTransitioning(true);
      if (fadeTimerRef.current) window.clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = window.setTimeout(() => {
        setCurrentPageImmediate(safePage);
        fadeTimerRef.current = null;
        requestAnimationFrame(() => {
          transitioningRef.current = false;
          setTransitioning(false);
        });
      }, PAGED_FADE_MS);
    },
    [totalPages, readingMode]
  );

  const advanceSinglePage = useCallback(() => {
    if (totalPages === 0) return;
    if (currentPage >= totalPages) {
      return;
    }
    goToPage(currentPage + 1);
  }, [currentPage, goToPage, totalPages]);

  const retreatSinglePage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const rtl = readingDirection === "rtl";

  /** En LTR: izquierda = atrás, derecha = adelante. En RTL (manga): izquierda = adelante, derecha = atrás. */
  const singlePageLeftAction = useCallback(() => {
    if (rtl) advanceSinglePage();
    else retreatSinglePage();
  }, [advanceSinglePage, retreatSinglePage, rtl]);

  const singlePageRightAction = useCallback(() => {
    if (rtl) retreatSinglePage();
    else advanceSinglePage();
  }, [advanceSinglePage, retreatSinglePage, rtl]);

  const advanceDoublePage = useCallback(() => {
    if (totalPages === 0) return;
    const next = nextSpreadAnchor(
      currentPage,
      totalPages,
      chapterStartsWithSinglePage,
      singlePageMap
    );
    if (next !== currentPage) goToPage(next);
  }, [chapterStartsWithSinglePage, currentPage, totalPages, goToPage, singlePageMap]);

  const retreatDoublePage = useCallback(() => {
    if (totalPages === 0) return;
    const prev = prevSpreadAnchor(
      currentPage,
      totalPages,
      chapterStartsWithSinglePage,
      singlePageMap
    );
    if (prev !== currentPage) goToPage(prev);
  }, [chapterStartsWithSinglePage, currentPage, totalPages, goToPage, singlePageMap]);

  const doublePageLeftAction = useCallback(() => {
    if (rtl) advanceDoublePage();
    else retreatDoublePage();
  }, [advanceDoublePage, retreatDoublePage, rtl]);

  const doublePageRightAction = useCallback(() => {
    if (rtl) retreatDoublePage();
    else advanceDoublePage();
  }, [advanceDoublePage, retreatDoublePage, rtl]);

  function changeReadingMode(nextMode: ReadingMode) {
    if (nextMode === readingMode) return;
    if (nextMode === "waterfall") {
      setFitMode("width");
    }
    if (nextMode === "double-page") {
      setCurrentPageImmediate((cp) =>
        snapToSpreadAnchor(cp, totalPages, chapterStartsWithSinglePage, singlePageMap)
      );
    }
    setReadingMode(nextMode);
    if (nextMode === "waterfall") {
      const safePage = Math.max(1, Math.min(currentPage, totalPages));
      window.setTimeout(() => {
        const target = document.querySelector<HTMLElement>(`[data-page='${safePage}']`);
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  }

  useEffect(() => {
    if (!syncProgress || pages.length === 0) return;
    const timer = window.setTimeout(() => {
      void fetch("/api/user/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mangaId,
          chapterId,
          pageNumber:
            readingMode === "double-page"
              ? Math.max(
                  ...getDoubleVisiblePageNumbers(
                    currentPage,
                    totalPages,
                    chapterStartsWithSinglePage,
                    singlePageMap
                  )
                )
              : currentPage,
        }),
      })
        .then(async (res) => {
          if (!res.ok) return;
          const data = (await res.json()) as {
            badgesEarned?: { name: string; description: string }[];
          };
          notifyBadgesEarned(data.badgesEarned ?? [], tBadges);
        })
        .catch(() => {});
    }, PROGRESS_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [
    chapterId,
    chapterStartsWithSinglePage,
    currentPage,
    mangaId,
    pages.length,
    readingMode,
    singlePageMap,
    syncProgress,
    tBadges,
    totalPages,
  ]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (readingMode === "waterfall") {
        if (event.key === "ArrowDown" || event.key === "ArrowRight") {
          event.preventDefault();
          window.scrollBy({ top: window.innerHeight * 0.85, behavior: "smooth" });
        }
        if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
          event.preventDefault();
          window.scrollBy({ top: -window.innerHeight * 0.85, behavior: "smooth" });
        }
        return;
      }
      if (transitioningRef.current) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (readingMode === "single-page") {
          if (rtl) retreatSinglePage();
          else advanceSinglePage();
        } else {
          if (rtl) retreatDoublePage();
          else advanceDoublePage();
        }
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (readingMode === "single-page") {
          if (rtl) advanceSinglePage();
          else retreatSinglePage();
        } else {
          if (rtl) advanceDoublePage();
          else retreatDoublePage();
        }
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (readingMode === "single-page") advanceSinglePage();
        else advanceDoublePage();
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        if (readingMode === "single-page") retreatSinglePage();
        else retreatDoublePage();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    advanceDoublePage,
    advanceSinglePage,
    readingMode,
    retreatDoublePage,
    retreatSinglePage,
    rtl,
  ]);

  const brightnessFilter = brightness / 100;
  /** No aplicar `filter` en `<main>`: crearía bloque de contención y rompería `position:fixed` (p. ej. doble página). */
  const brightnessStyle =
    brightnessFilter !== 1
      ? ({ filter: `brightness(${brightnessFilter})` } satisfies CSSProperties)
      : undefined;

  const barWrapClass = cn(
    "transition-opacity duration-200",
    uiVisible ? "opacity-100" : "opacity-0 pointer-events-none"
  );

  const pagedImageFadeClass = useMemo(
    () =>
      cn(
        "transition-opacity duration-200 ease-out",
        transitioning ? "opacity-0" : "opacity-100"
      ),
    [transitioning]
  );

  /** Solo cascada: barra inferior en flujo para no dejar hueco con flex-1 del layout. */
  const useInFlowBottomBar = useMemo(() => readingMode === "waterfall", [readingMode]);

  const pageTapChromeInset: CSSProperties = useMemo(
    () => ({
      top: READER_CHROME_TOP_PX,
      bottom: useInFlowBottomBar ? 0 : READER_CHROME_BOTTOM_PX,
    }),
    [useInFlowBottomBar]
  );

  return (
    <div className="min-h-0 w-full bg-background text-foreground">
      <div className="fixed inset-x-0 top-0 z-40 border-b border-border/50 bg-background/90 backdrop-blur-md">
        <div
          className={cn("mx-auto flex max-w-5xl items-center gap-3 px-4 py-3", barWrapClass)}
        >
          <Link
            href={backHref}
            className="shrink-0 rounded-md border border-border/50 bg-muted px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
          >
            {t("backToDetail")}
          </Link>
          <p className="min-w-0 flex-1 truncate text-center text-sm text-foreground">
            {t("chapterTitle", { title: mangaTitle, number: chapterNumber })}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            {uploaderDonationLinks.length > 0
              ? uploaderDonationLinks.map((link) => {
                  const platform = getPlatform(link.platform);
                  const label = platform?.name ?? link.platform;
                  return (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={label}
                      title={label}
                      className="rounded-md border border-border/50 bg-muted p-2 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                    >
                      <Coffee className="h-4 w-4" aria-hidden />
                    </a>
                  );
                })
              : uploaderLegacyDonationLink ? (
                  <a
                    href={uploaderLegacyDonationLink}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={tDon("supportScanButton")}
                    className="rounded-md border border-border/50 bg-muted p-2 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                  >
                    <Coffee className="h-4 w-4" aria-hidden />
                  </a>
                ) : null}
            <ReaderChapterLanguageMenu
              chapterLocale={chapterLocale}
              options={chapterLanguageOptions}
              currentPage={currentPage}
              open={chapterLanguageOpen}
              onOpenChange={(next) => {
                setChapterLanguageOpen(next);
                if (next) setSettingsOpen(false);
              }}
            />
            <Sheet
              open={settingsOpen}
              onOpenChange={(open) => {
                setSettingsOpen(open);
                if (open) setChapterLanguageOpen(false);
              }}
            >
              <button
                type="button"
                aria-label={t("settingsAria")}
                onClick={() => setSettingsOpen(true)}
                className="rounded-md border border-border/50 bg-muted p-2 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
              >
                <Settings className="h-4 w-4" />
              </button>
            <SheetContent
              side={sheetSide}
              showCloseButton={false}
              className="flex flex-col gap-0 p-0 sm:rounded-none"
            >
              <SheetHeader className="flex flex-row items-center justify-between gap-2 border-b border-border/50 px-4 py-4 pr-12">
                <SheetTitle>{t("settingsTitle")}</SheetTitle>
                <SheetClose asChild>
                  <button
                    type="button"
                    className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={t("close")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </SheetClose>
              </SheetHeader>
              <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-5">
                <section className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("readingMode")}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => changeReadingMode("waterfall")}
                      className={controlButtonClass(readingMode === "waterfall")}
                    >
                      {t("modeWaterfall")}
                    </button>
                    <button
                      type="button"
                      onClick={() => changeReadingMode("single-page")}
                      className={controlButtonClass(readingMode === "single-page")}
                    >
                      {t("modeSinglePage")}
                    </button>
                    <button
                      type="button"
                      onClick={() => changeReadingMode("double-page")}
                      className={cn(
                        controlButtonClass(readingMode === "double-page"),
                        "col-span-2 sm:col-span-1"
                      )}
                    >
                      {t("modeDoublePage")}
                    </button>
                  </div>
                </section>

                {readingMode === "single-page" ? (
                  <section className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("imageFit")}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFitMode("width")}
                        className={controlButtonClass(fitMode === "width")}
                      >
                        {t("fitWidth")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFitMode("height")}
                        className={controlButtonClass(fitMode === "height")}
                      >
                        {t("fitHeight")}
                      </button>
                    </div>
                  </section>
                ) : null}

                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("brightness")}
                    </p>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {t("brightnessPercent", { value: brightness })}
                    </span>
                  </div>
                  <Slider
                    min={50}
                    max={150}
                    step={1}
                    value={[brightness]}
                    onValueChange={(v) => setBrightness(v[0] ?? 100)}
                    className="w-full"
                  />
                </section>

                <section className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("readingDirection")}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setReadingDirection("ltr")}
                      className={controlButtonClass(readingDirection === "ltr")}
                    >
                      {t("directionLtr")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReadingDirection("rtl")}
                      className={controlButtonClass(readingDirection === "rtl")}
                    >
                      {t("directionRtl")}
                    </button>
                  </div>
                </section>

                <section className="space-y-2 border-t border-border/50 pt-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("themeLabel")}
                  </p>
                  <div className="rounded-xl border border-border bg-muted/40 p-1.5">
                    <div className="relative grid grid-cols-2 gap-1">
                      <span
                        aria-hidden
                        className={cn(
                          "absolute inset-y-0 w-[calc(50%-2px)] rounded-lg bg-primary/20 ring-1 ring-primary/40 transition-transform duration-300",
                          isDark ? "translate-x-[calc(100%+4px)]" : "translate-x-0"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setTheme("light")}
                        className={cn(
                          "relative z-10 inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                          !isDark ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                        aria-pressed={!isDark}
                      >
                        <Sun className="h-4 w-4" />
                        {t("themeCurrentLight")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme("dark")}
                        className={cn(
                          "relative z-10 inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                          isDark ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                        aria-pressed={isDark}
                      >
                        <Moon className="h-4 w-4" />
                        {t("themeCurrentDark")}
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            </SheetContent>
          </Sheet>
          </div>
        </div>
        {(readingMode === "single-page" || readingMode === "double-page") && totalPages > 0 ? (
          <div
            className="h-0.5 w-full bg-muted/60"
            role="progressbar"
            aria-valuenow={Math.round(pagedProgressPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-primary transition-[width] duration-300 ease-out"
              style={{ width: `${pagedProgressPercent}%` }}
            />
          </div>
        ) : null}
      </div>

      <main
        className={cn(
          "min-h-0",
          readingMode === "waterfall" && "mx-auto max-w-5xl py-14",
          readingMode === "single-page" && fitMode === "width" && "w-full max-w-none py-0",
          (readingMode !== "waterfall" && !(readingMode === "single-page" && fitMode === "width")) &&
            "mx-auto max-w-5xl h-auto py-0"
        )}
      >
        {readingMode === "waterfall" ? (
          <div className="bg-zinc-950" style={brightnessStyle}>
            {pages.map((page) => (
              <section
                key={page.id}
                data-reader-page="true"
                data-page={page.pageNumber}
                className="relative mx-auto mb-2 w-full"
              >
                <div className="relative overflow-hidden bg-zinc-950">
                  <Image
                    src={page.imageUrl}
                    alt={t("pageAlt", { number: page.pageNumber })}
                    width={1600}
                    height={2400}
                    loading="lazy"
                    className="mx-auto h-auto w-full max-w-3xl object-contain"
                  />
                </div>
              </section>
            ))}
            <div
              ref={waterfallEndRef}
              data-chapter-end-sentinel
              className="h-px w-full shrink-0"
              aria-hidden
            />
          </div>
        ) : readingMode === "single-page" && activePage ? (
          fitMode === "width" ? (
            <>
              <div
                className={cn(
                  "group fixed left-0 z-20 w-1/2 cursor-pointer",
                  transitioning && "pointer-events-none"
                )}
                style={pageTapChromeInset}
                onClick={singlePageLeftAction}
              >
                <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/35 p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <ChevronLeft className="h-6 w-6 text-white/85" />
                </div>
              </div>
              <div
                className={cn(
                  "group fixed right-0 z-20 w-1/2 cursor-pointer",
                  transitioning && "pointer-events-none"
                )}
                style={pageTapChromeInset}
                onClick={singlePageRightAction}
              >
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/35 p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <ChevronRight className="h-6 w-6 text-white/85" />
                </div>
              </div>

              <section
                className={cn("relative z-10 w-full bg-zinc-950", pagedImageFadeClass)}
                style={{
                  paddingTop: READER_CHROME_TOP_PX,
                  paddingBottom: READER_CHROME_BOTTOM_PX,
                  ...brightnessStyle,
                }}
              >
                <div className="mx-auto w-full max-w-[75vw]">
                  <Image
                    src={activePage.imageUrl}
                    alt={t("pageAlt", { number: activePage.pageNumber })}
                    width={1600}
                    height={2400}
                    loading="eager"
                    sizes="75vw"
                    className="pointer-events-none h-auto w-full object-contain"
                  />
                </div>
              </section>
            </>
          ) : (
            <>
              <div
                className={cn(
                  "pointer-events-none fixed inset-x-0 z-10 flex items-center justify-center overflow-hidden bg-zinc-950",
                  pagedImageFadeClass
                )}
                style={{ ...pageTapChromeInset, ...brightnessStyle }}
              >
                <Image
                  src={activePage.imageUrl}
                  alt={t("pageAlt", { number: activePage.pageNumber })}
                  width={1600}
                  height={2400}
                  loading="eager"
                  sizes="75vw"
                  className="pointer-events-none mx-auto h-auto max-h-full w-auto max-w-[75vw] object-contain"
                />
              </div>
              <div
                className={cn(
                  "group fixed left-0 z-20 w-1/2 cursor-pointer",
                  transitioning && "pointer-events-none"
                )}
                style={pageTapChromeInset}
                onClick={singlePageLeftAction}
              >
                <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/35 p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <ChevronLeft className="h-6 w-6 text-white/85" />
                </div>
              </div>
              <div
                className={cn(
                  "group fixed right-0 z-20 w-1/2 cursor-pointer",
                  transitioning && "pointer-events-none"
                )}
                style={pageTapChromeInset}
                onClick={singlePageRightAction}
              >
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/35 p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <ChevronRight className="h-6 w-6 text-white/85" />
                </div>
              </div>
            </>
          )
        ) : readingMode === "double-page" && doubleVisiblePages.length > 0 ? (
          fitMode === "width" ? (
            <>
              <div
                className={cn(
                  "group fixed left-0 z-20 w-1/2 cursor-pointer",
                  transitioning && "pointer-events-none"
                )}
                style={pageTapChromeInset}
                onClick={doublePageLeftAction}
              >
                <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/35 p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <ChevronLeft className="h-6 w-6 text-white/85" />
                </div>
              </div>
              <div
                className={cn(
                  "group fixed right-0 z-20 w-1/2 cursor-pointer",
                  transitioning && "pointer-events-none"
                )}
                style={pageTapChromeInset}
                onClick={doublePageRightAction}
              >
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/35 p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <ChevronRight className="h-6 w-6 text-white/85" />
                </div>
              </div>

              <DoublePageFixedSpread
                pages={doubleVisiblePages}
                rtl={rtl}
                brightnessStyle={brightnessStyle}
                fadeOverlayClassName={pagedImageFadeClass}
                getAlt={(p) => t("pageAlt", { number: p.pageNumber })}
              />
            </>
          ) : (
            <>
              <DoublePageFixedSpread
                pages={doubleVisiblePages}
                rtl={rtl}
                brightnessStyle={brightnessStyle}
                fadeOverlayClassName={pagedImageFadeClass}
                getAlt={(p) => t("pageAlt", { number: p.pageNumber })}
              />
              <div
                className={cn(
                  "group fixed left-0 z-20 w-1/2 cursor-pointer",
                  transitioning && "pointer-events-none"
                )}
                style={pageTapChromeInset}
                onClick={doublePageLeftAction}
              >
                <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/35 p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <ChevronLeft className="h-6 w-6 text-white/85" />
                </div>
              </div>
              <div
                className={cn(
                  "group fixed right-0 z-20 w-1/2 cursor-pointer",
                  transitioning && "pointer-events-none"
                )}
                style={pageTapChromeInset}
                onClick={doublePageRightAction}
              >
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/35 p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <ChevronRight className="h-6 w-6 text-white/85" />
                </div>
              </div>
            </>
          )
        ) : null}
      </main>

      {chapterEndCtaVisible && (
        <div
          className="pointer-events-auto fixed inset-x-0 bottom-[4.5rem] z-[45] flex justify-center px-4 animate-in fade-in slide-in-from-bottom-3 duration-500"
          role="region"
          aria-label={tEnd("nextChapterAria")}
        >
          <div className="flex flex-col items-center gap-3">
            {showAds ? <AdSlot slotId="reader-end-of-chapter" height="h-20" /> : null}
            {nextChapterHref && nextChapterPreviewImage && (
              <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/90 px-4 py-2.5 shadow-lg backdrop-blur-md">
                <Image
                  src={nextChapterPreviewImage}
                  alt=""
                  width={36}
                  height={50}
                  className="h-[50px] w-[36px] rounded object-cover opacity-80"
                />
                <div className="text-left">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {tEnd("upNext")}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {tEnd("chapterLabel", { number: nextChapterNumber ?? "" })}
                    {nextChapterTitle ? ` — ${nextChapterTitle}` : ""}
                  </p>
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Link
                href={nextChapterHref ?? backHref}
                onClick={(e) => {
                  if (!nextChapterHref) return;
                  if (ignoreLocaleChange || nextLocaleKind === "same") return;
                  e.preventDefault();
                  handleNavigateNext();
                }}
                className="rounded-full border border-border/50 bg-background/90 px-5 py-2.5 text-sm font-medium text-foreground shadow-lg backdrop-blur-md transition hover:bg-muted"
              >
                {nextChapterHref ? tEnd("nextChapterButton") : tEnd("noMoreChaptersButton")}
              </Link>
              {uploaderDonationLinks.length > 0
                ? uploaderDonationLinks.map((link) => {
                    const platform = getPlatform(link.platform);
                    return (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/15 px-5 py-2.5 text-sm font-medium text-foreground shadow-lg backdrop-blur-md transition hover:bg-primary/20"
                      >
                        <Coffee className="h-4 w-4 text-primary" aria-hidden />
                        {platform?.name ?? link.platform}
                      </a>
                    );
                  })
                : uploaderLegacyDonationLink ? (
                    <a
                      href={uploaderLegacyDonationLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/15 px-5 py-2.5 text-sm font-medium text-foreground shadow-lg backdrop-blur-md transition hover:bg-primary/20"
                    >
                      <Coffee className="h-4 w-4 text-primary" aria-hidden />
                      {tDon("supportScanButton")}
                    </a>
                  ) : null}
            </div>
          </div>
        </div>
      )}

      <div
        className={cn(
          "z-40 border-t border-border/50 bg-background/90 px-4 py-3 backdrop-blur-md transition-opacity duration-200",
          useInFlowBottomBar ? "relative w-full shrink-0" : "fixed inset-x-0 bottom-0",
          uiVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            {prevChapterHref ? (
              <Link
                href={prevChapterHref}
                className="rounded-md border border-border/50 bg-muted px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
              >
                {t("prevChapter")}
              </Link>
            ) : (
              <span className="rounded-md border border-border/50 bg-muted/50 px-3 py-1.5 text-muted-foreground/60">
                {t("noPrevChapter")}
              </span>
            )}
            {nextChapterHref ? (
              <button
                type="button"
                onClick={handleNavigateNext}
                className="rounded-md border border-border/50 bg-muted px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
              >
                {t("nextChapter")}
              </button>
            ) : (
              <span className="rounded-md border border-border/50 bg-muted/50 px-3 py-1.5 text-muted-foreground/60">
                {t("noNextChapter")}
              </span>
            )}
          </div>
          <p className="text-muted-foreground">
            {readingMode === "double-page" && doubleVisibleNums.length === 2
              ? t("pageIndicatorRange", {
                  from: doubleVisibleNums[0]!,
                  to: doubleVisibleNums[1]!,
                  total: totalPages,
                })
              : t("pageIndicator", {
                  current:
                    readingMode === "double-page" && doubleVisibleNums.length === 1
                      ? doubleVisibleNums[0]!
                      : currentPage,
                  total: totalPages,
                })}
          </p>
        </div>
      </div>

      {nextLocaleDialogOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-background p-5 shadow-xl">
            {/* Badge indicador de tipo de cambio */}
            <div
              className={cn(
                "mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
                nextLocaleKind === "base"
                  ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
                  : "border-orange-500/30 bg-orange-500/10 text-orange-300"
              )}
            >
              {nextLocaleKind === "base" ? (
                <>
                  <Languages className="h-3.5 w-3.5" />
                  <span>{t("localeChangeDialectBadge")}</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>{t("localeChangeDifferentBadge")}</span>
                </>
              )}
            </div>
            {/* Título del modal */}
            <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
              {nextLocaleKind === "base" ? (
                <Languages className="h-4 w-4 text-yellow-400" />
              ) : (
                <Globe2 className="h-4 w-4 text-orange-400" />
              )}
              <span>{t("localeChangeDialogTitle")}</span>
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {nextLocaleKind === "base"
                ? t("localeChangeDialogDialectBody", { locale: nextLocaleName })
                : t("localeChangeDialogDifferentLanguageBody", { locale: nextLocaleName })}
            </p>
            <label className="mt-3 flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={rememberLocaleChoice}
                onChange={(e) => setRememberLocaleChoice(e.target.checked)}
              />
              {t("localeChangeDialogRemember")}
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNextLocaleDialogOpen(false)}
                className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground"
              >
                {t("localeChangeDialogCancel")}
              </button>
              <button
                type="button"
                onClick={confirmNextLocaleNavigation}
                className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
              >
                {t("localeChangeDialogContinue")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
