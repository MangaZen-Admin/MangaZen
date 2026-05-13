"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Search, SlidersHorizontal } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { translateCatalogTagName } from "@/lib/catalog-tag-i18n";

type OrderKey = "latest" | "popular" | "rating" | "title";

const ORDER_KEYS: OrderKey[] = ["latest", "popular", "rating", "title"];

const STATUS_VALUES = ["ONGOING", "COMPLETED", "HIATUS", "CANCELLED"] as const;

type Genre = { name: string; category: string };

type LibraryFilterFormProps = {
  locale: string;
  initialQ: string;
  initialGenres: string[];
  initialStatus: string;
  initialOrder: OrderKey;
  genres: Genre[];
};

function TagTabFilter({
  genres,
  selectedGenres,
  setSelectedGenres,
  labels,
  translateTag,
}: {
  genres: { name: string; category: string }[];
  selectedGenres: string[];
  setSelectedGenres: (fn: (prev: string[]) => string[]) => void;
  labels: Record<string, string>;
  translateTag: (name: string) => string;
}) {
  const categories = (["GENRE", "FORMAT", "THEME", "CONTENT"] as const).filter((cat) =>
    genres.some((g) => g.category === cat),
  );
  const [activeTab, setActiveTab] = useState<string>(categories[0] ?? "GENRE");

  return (
    <div>
      <div className="flex flex-wrap border-b border-border/60">
        {categories.map((cat) => {
          const selectedInCat = genres.filter(
            (g) => g.category === cat && selectedGenres.includes(g.name),
          ).length;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveTab(cat)}
              className={`relative flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === cat
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {labels[cat]}
              {selectedInCat > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {selectedInCat}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-1.5 p-3">
        {genres
          .filter((g) => g.category === activeTab)
          .map((g) => {
            const isSelected = selectedGenres.includes(g.name);
            return (
              <button
                key={g.name}
                type="button"
                onClick={() =>
                  setSelectedGenres((prev) =>
                    prev.includes(g.name) ? prev.filter((x) => x !== g.name) : [...prev, g.name],
                  )
                }
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  isSelected
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {translateTag(g.name)}
              </button>
            );
          })}
      </div>
    </div>
  );
}

export function LibraryFilterForm({
  locale,
  initialQ,
  initialGenres,
  initialStatus,
  initialOrder,
  genres,
}: LibraryFilterFormProps) {
  const tCat = useTranslations("catalog");
  const tStatus = useTranslations("scanPanel.mangaStatus");
  const [selectedGenres, setSelectedGenres] = useState<string[]>(initialGenres);
  const [status, setStatus] = useState(initialStatus);
  const [order, setOrder] = useState<OrderKey>(initialOrder);

  const activeFilterCount = [selectedGenres.length > 0, status].filter(Boolean).length;

  return (
    <aside className="rounded-xl border border-border bg-card p-4 shadow-sm dark:shadow-none">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {tCat("libraryFilters")}
        </h2>
        {activeFilterCount > 0 && (
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {activeFilterCount}
          </span>
        )}
      </div>

      <form method="get" className="space-y-4">
        {selectedGenres.map((g) => (
          <input key={g} type="hidden" name="genre" value={g} />
        ))}
        <input type="hidden" name="status" value={status} />
        <input type="hidden" name="order" value={order} />

        <div>
          <label className="mb-1.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Search className="h-3.5 w-3.5" />
            {tCat("librarySearch")}
          </label>
          <input
            name="q"
            defaultValue={initialQ}
            placeholder={tCat("librarySearchPlaceholder")}
            className="h-9 w-full rounded-lg border border-border/60 bg-card px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-muted-foreground">{tCat("libraryTagFilter")}</label>
          <div className="rounded-lg border border-border/60 bg-card">
            <TagTabFilter
              genres={genres}
              selectedGenres={selectedGenres}
              setSelectedGenres={setSelectedGenres}
              labels={{
                GENRE: tCat("tagCategoryGenre"),
                FORMAT: tCat("tagCategoryFormat"),
                THEME: tCat("tagCategoryTheme"),
                CONTENT: tCat("tagCategoryContent"),
              }}
              translateTag={(name) => translateCatalogTagName(name, (k) => tCat(k))}
            />
          </div>
          {selectedGenres.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedGenres([])}
              className="mt-1.5 text-xs text-primary hover:underline"
            >
              {tCat("libraryGenreClearAll")}
            </button>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-muted-foreground">{tCat("libraryStatus")}</label>
          <Select value={status || "__all__"} onValueChange={(v) => setStatus(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder={tCat("libraryAllOption")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{tCat("libraryAllOption")}</SelectItem>
              {STATUS_VALUES.map((s) => (
                <SelectItem key={s} value={s}>
                  {tStatus(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1 text-xs text-muted-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {tCat("libraryOrder")}
          </label>
          <Select value={order} onValueChange={(v) => setOrder(v as OrderKey)}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORDER_KEYS.map((k) => (
                <SelectItem key={k} value={k}>
                  {tCat(
                    k === "latest"
                      ? "orderLatest"
                      : k === "popular"
                        ? "orderPopular"
                        : k === "rating"
                          ? "orderRating"
                          : "orderTitle"
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="h-9 flex-1 rounded-lg border border-primary bg-primary px-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 active:opacity-75"
          >
            {tCat("libraryApply")}
          </button>
          <Link
            href={`/${locale}/library`}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-muted px-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            {tCat("libraryClear")}
          </Link>
        </div>
      </form>
    </aside>
  );
}
