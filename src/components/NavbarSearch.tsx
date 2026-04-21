"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

type Suggestion = {
  id: string;
  title: string;
  slug: string;
  coverImage: string | null;
};

function isReaderRoute(pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  return parts[0] === "manga" && parts.length >= 3;
}

export default function NavbarSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("navbar");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const hidden = useMemo(() => isReaderRoute(pathname), [pathname]);

  useEffect(() => {
    if (hidden) return;
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
        if (!res.ok) return;
        const data = (await res.json()) as Suggestion[];
        setResults(data);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, hidden]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (hidden) return null;

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const q = query.trim();
          if (!q) return;
          setOpen(false);
          router.push(`/library?q=${encodeURIComponent(q)}`);
        }}
        className="relative"
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground dark:text-zinc-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          type="search"
          placeholder={t("searchPlaceholder")}
          className="h-10 w-full rounded-xl border border-border/60 bg-card px-10 text-sm text-foreground outline-none backdrop-blur-md transition placeholder:text-muted-foreground focus:border-primary dark:border-zinc-700/70 dark:bg-zinc-900/70 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
        />
      </form>

      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-xl border border-border/60 bg-card shadow-lg backdrop-blur-md dark:border-zinc-700/80 dark:bg-zinc-900/85 dark:shadow-2xl">
          {loading ? (
            <p className="px-3 py-2 text-sm text-muted-foreground dark:text-zinc-400">{t("searchLoading")}</p>
          ) : results.length === 0 ? (
            <EmptyState
              compact
              className="px-2"
              icon={Search}
              title={t("searchNoResultsTitle")}
              description={t("searchNoResultsDescription")}
            />
          ) : (
            <ul>
              {results.map((result) => (
                <li key={result.id}>
                  <Link
                    href={`/manga/${result.slug}`}
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                    }}
                    className="flex items-center gap-3 px-3 py-2 text-popover-foreground transition hover:bg-accent hover:text-accent-foreground dark:hover:bg-zinc-800/80"
                  >
                    <div className="h-10 w-7 shrink-0 overflow-hidden rounded border border-border bg-muted dark:border-zinc-700 dark:bg-zinc-800">
                      {result.coverImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={result.coverImage}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <span className="line-clamp-1 text-sm">{result.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
