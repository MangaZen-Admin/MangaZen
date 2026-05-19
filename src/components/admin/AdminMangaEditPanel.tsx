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
  reviewStatus: string;
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
      <h2 className="text-lg font-semibold text-foreground">Editar mangas</h2>
      <p className="mt-1 text-sm text-muted-foreground">Lista completa de mangas. Hacé click en editar para modificar cualquiera.</p>

      <div className="relative mt-4">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar manga..."
          className="w-full rounded-lg border border-border/60 bg-background py-2 pl-8 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
        />
      </div>

      {loading ? (
        <div className="mt-6 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : mangas.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No se encontraron mangas.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {mangas.map((manga) => (
            <div
              key={manga.id}
              className={`flex items-center gap-3 rounded-lg border p-3 transition ${
                editSlug === manga.slug
                  ? "border-primary bg-primary/5"
                  : "border-border bg-background/50"
              }`}
            >
              <div className="relative h-12 w-8 shrink-0 overflow-hidden rounded border border-border bg-muted">
                {manga.coverImage ? (
                  <Image src={manga.coverImage} alt="" fill sizes="32px" className="object-cover" unoptimized />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{manga.title}</p>
                <p className="text-xs text-muted-foreground">{manga.author} · {manga.type} · {manga.status}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/${locale}/manga/${manga.slug}`}
                  className="text-xs text-primary hover:underline"
                  target="_blank"
                >
                  Ver
                </Link>
                <AdminMangaEditModal
                  mangaSlug={manga.slug}
                  initialData={{
                    title: manga.title,
                    description: "",
                    author: manga.author,
                    artist: null,
                    publisher: "",
                    country: "",
                    releaseYear: new Date().getFullYear(),
                    alternativeTitles: [],
                    descriptions: [],
                    tagNames: [],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
