"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { ContinueReadingItem } from "@/lib/get-continue-reading";
import { cn } from "@/lib/utils";

type ContinueReadingCarouselProps = {
  items: ContinueReadingItem[];
  locale: string;
};

function formatChapterLabel(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
}

export function ContinueReadingCarousel({ items, locale }: ContinueReadingCarouselProps) {
  const t = useTranslations("home");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const overflow = scrollWidth > clientWidth + 2;
    setHasOverflow(overflow);
    setCanScrollLeft(overflow && scrollLeft > 4);
    setCanScrollRight(overflow && scrollLeft < scrollWidth - clientWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => updateScrollState());
    ro.observe(el);
    return () => ro.disconnect();
  }, [items, updateScrollState]);

  const scrollByDir = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const delta = Math.min(el.clientWidth * 0.85, 360) * dir;
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => updateScrollState();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [updateScrollState]);

  if (items.length === 0) return null;

  return (
    <section className="mb-8" aria-labelledby="continue-reading-heading">
      <h2
        id="continue-reading-heading"
        className="mb-3 text-base font-medium tracking-tight text-foreground"
      >
        {t("continueReadingTitle")}
      </h2>
      <div className="relative">
        {hasOverflow && canScrollLeft ? (
          <button
            type="button"
            aria-label={t("scrollPrev")}
            onClick={() => scrollByDir(-1)}
            className="absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-border bg-background/90 p-2 text-foreground shadow-md backdrop-blur-sm transition hover:bg-muted/80 sm:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : null}
        {hasOverflow && canScrollRight ? (
          <button
            type="button"
            aria-label={t("scrollNext")}
            onClick={() => scrollByDir(1)}
            className="absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-border bg-background/90 p-2 text-foreground shadow-md backdrop-blur-sm transition hover:bg-muted/80 sm:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        ) : null}

        <div
          ref={scrollerRef}
          className={cn(
            "flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "snap-x snap-mandatory scroll-pl-0",
            "touch-pan-x",
            hasOverflow && "sm:px-10"
          )}
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {items.map((item) => {
            const href = `/${locale}/read/${item.lastChapterId}?page=${item.lastPageNumber}`;
            const capLabel = formatChapterLabel(item.chapterNumber);
            return (
              <article
                key={`${item.manga.slug}-${item.lastChapterId}`}
                className="w-[140px] shrink-0 snap-start sm:w-[160px]"
              >
                <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                  <Link href={href} className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
                    {item.manga.coverImage ? (
                      <Image
                        src={item.manga.coverImage}
                        alt={item.manga.title}
                        fill
                        sizes="160px"
                        className="object-cover transition hover:opacity-95"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                        —
                      </div>
                    )}
                  </Link>
                  <div className="flex min-h-[5.5rem] flex-col gap-1.5 p-2.5">
                    <p className="line-clamp-2 text-xs font-medium leading-snug text-foreground">
                      {item.manga.title}
                    </p>
                    <p className="line-clamp-1 text-[10px] text-muted-foreground">
                      {t("chapterLine", { number: capLabel })}
                      {item.chapterTitle ? ` · ${item.chapterTitle}` : ""}
                    </p>
                    <Link
                      href={href}
                      className="mt-auto inline-flex w-full items-center justify-center rounded-lg border border-primary/45 bg-primary/15 px-2 py-1.5 text-center text-[11px] font-medium text-primary transition hover:bg-primary/25"
                    >
                      {t("continueCta")}
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
