"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLocale } from "next-intl";
import { Search, Loader2 } from "lucide-react";
import { AdminMangaEditModal } from "@/components/manga/AdminMangaEditModal";

type MangaRow = {
  id: string;
  slug: string;
  title: string;
  coverImage: string | null;
  status: string;
  type: string;
  author: string;
  artist: string | null;
  publisher: string;
  country: string;
  releaseYear: number;
  reviewStatus: string;
  description: string;
  descriptions: { locale: string; description: string }[];
  alternativeTitles: { locale: string; title: string }[];
  tags: { tag: { name: string } }[];
};

const STATUS_COLORS: Record<string, string> = {
  ONGOING: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  COMPLETED: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  HIATUS: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  CANCELLED: "bg-red-500/15 text-red-700 dark:text-red-300",
};

export function AdminMangaEditPanel({ editSlug }: { editSlug?: string | null }) {
  const locale = useLocale();
  const [mangas, setMangas] = useState<MangaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/mangas?q=${encodeURIComponent(q)}`);
      if (!res.ok) return;
      const data = (await res.json()) as { mangas?: MangaRow[] };
      setMangas(data.mangas ?? []);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 300);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">Biblioteca de mangas</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Buscá y editá cualquier manga de la plataforma.
      </p>

      <div className="relative mt-4">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por título o autor..."
          className="w-full rounded-lg border border-border/60 bg-background py-2 pl-8 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
        />
      </div>

      {loading ? (
        <div className="mt-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : mangas.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">No se encontraron mangas.</p>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {mangas.map((manga) => (
            <div
              key={manga.id}
              className={`group relative flex flex-col overflow-hidden rounded-xl border transition ${
                editSlug === manga.slug
                  ? "border-primary shadow-[0_0_12px_rgba(157,78,221,0.3)]"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {/* Portada */}
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
                {manga.coverImage ? (
                  <Image
                    src={manga.coverImage}
                    alt={manga.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    Sin portada
                  </div>
                )}
                {/* Badge de estado */}
                <span className={`absolute left-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[manga.status] ?? "bg-muted text-muted-foreground"}`}>
                  {manga.status}
                </span>
              </div>

              {/* Info */}
              <div className="flex flex-1 flex-col gap-1 bg-card p-2">
                <p className="line-clamp-2 text-xs font-medium leading-tight text-foreground">
                  {manga.title}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">{manga.author}</p>
                <div className="mt-auto flex items-center gap-1.5 pt-1">
                  <Link
                    href={`/${locale}/manga/${manga.slug}`}
                    target="_blank"
                    className="text-[10px] text-primary hover:underline"
                  >
                    Ver
                  </Link>
                  <span className="text-muted-foreground">·</span>
                  <AdminMangaEditModal
                    mangaSlug={manga.slug}
                    initialData={{
                      title: manga.title,
                      description: manga.description,
                      author: manga.author,
                      artist: manga.artist,
                      publisher: manga.publisher,
                      country: manga.country,
                      releaseYear: manga.releaseYear,
                      alternativeTitles: manga.alternativeTitles,
                      descriptions: manga.descriptions,
                      tagNames: manga.tags.map((r) => r.tag.name),
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
