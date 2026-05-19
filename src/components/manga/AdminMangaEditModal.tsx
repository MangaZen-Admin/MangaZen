"use client";

import { useState, useEffect } from "react";
import { Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type Tag = { id: string; name: string; category: string };

type Props = {
  mangaSlug: string;
  initialData: {
    title: string;
    description: string;
    author: string;
    artist: string | null;
    publisher: string;
    country: string;
    releaseYear: number;
    alternativeTitles: { locale: string; title: string }[];
    descriptions: { locale: string; description: string }[];
    tagNames: string[];
  };
};

const LOCALES = ["es-ar","es-es","en-us","en-gb","pt-br","ja-jp","ko-kr","zh-cn","ru-ru"] as const;

export function AdminMangaEditModal({ mangaSlug, initialData }: Props) {
  const t = useTranslations("scanPanel");
  const tCatalog = useTranslations("catalog");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [descTab, setDescTab] = useState<string>("es-ar");

  const [title, setTitle] = useState(initialData.title);
  const [author, setAuthor] = useState(initialData.author);
  const [artist, setArtist] = useState(initialData.artist ?? "");
  const [publisher, setPublisher] = useState(initialData.publisher);
  const [country, setCountry] = useState(initialData.country);
  const [releaseYear, setReleaseYear] = useState(String(initialData.releaseYear));
  const [descriptions, setDescriptions] = useState<Record<string, string>>(
    Object.fromEntries(initialData.descriptions.map((d) => [d.locale, d.description]))
  );
  const [altTitles, setAltTitles] = useState(initialData.alternativeTitles);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    void fetch("/api/scan/tags")
      .then((r) => r.json())
      .then((d: { tags?: Tag[] }) => {
        const tags = d.tags ?? [];
        setAvailableTags(tags);
        // Seleccionar los tags que ya tiene el manga por nombre
        const ids = new Set(
          tags.filter((t) => initialData.tagNames.includes(t.name)).map((t) => t.id)
        );
        setSelectedTagIds(ids);
      })
      .catch(() => {});
  }, [open, initialData.tagNames]);

  async function handleSave() {
    setBusy(true);
    try {
      const form = new FormData();
      form.set("title", title.trim());
      form.set("author", author.trim());
      form.set("artist", artist.trim());
      form.set("publisher", publisher.trim());
      form.set("country", country.trim());
      form.set("releaseYear", releaseYear);
      form.set("tagIds", JSON.stringify(Array.from(selectedTagIds)));

      altTitles.forEach((at, i) => {
        form.append(`altTitles[${i}][locale]`, at.locale);
        form.append(`altTitles[${i}][title]`, at.title);
      });

      Object.entries(descriptions).forEach(([locale, desc], i) => {
        if (desc.trim()) {
          form.append(`descriptions[${i}][locale]`, locale);
          form.append(`descriptions[${i}][description]`, desc.trim());
        }
      });

      const res = await fetch(`/api/scan/manga/${mangaSlug}`, {
        method: "PATCH",
        body: form,
      });

      if (!res.ok) {
        toast.error(t("edit.saveError"));
        return;
      }

      toast.success(t("edit.saveSuccess"));
      setOpen(false);
    } catch {
      toast.error(t("edit.saveError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/8 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-blue-500/15"
      >
        <Pencil className="h-3.5 w-3.5 text-blue-500" />
        Editar manga
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-lg scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Editar manga</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-xs text-muted-foreground">Título</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Autor</label>
                  <input value={author} onChange={(e) => setAuthor(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Artista</label>
                  <input value={artist} onChange={(e) => setArtist(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Editorial</label>
                  <input value={publisher} onChange={(e) => setPublisher(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">País</label>
                  <input value={country} onChange={(e) => setCountry(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Año</label>
                  <input type="number" value={releaseYear} onChange={(e) => setReleaseYear(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25" />
                </div>
              </div>

              {/* Sinopsis multiidioma */}
              <div>
                <label className="text-xs text-muted-foreground">Sinopsis</label>
                <div className="mt-1 rounded-lg border border-border bg-background">
                  <div className="flex flex-wrap border-b border-border">
                    {LOCALES.map((loc) => (
                      <button key={loc} type="button" onClick={() => setDescTab(loc)}
                        className={`px-3 py-1.5 text-xs font-medium transition-colors ${descTab === loc ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                        {loc}{descriptions[loc] && <span className="ml-1 text-primary">•</span>}
                      </button>
                    ))}
                  </div>
                  <textarea rows={3} value={descriptions[descTab] ?? ""}
                    onChange={(e) => setDescriptions((p) => ({ ...p, [descTab]: e.target.value }))}
                    className="w-full rounded-b-lg bg-transparent px-3 py-2 text-sm outline-none" />
                </div>
              </div>

              {/* Títulos alternativos */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">Títulos alternativos</label>
                  <button type="button" onClick={() => setAltTitles((p) => [...p, { locale: "en-us", title: "" }])} className="text-xs text-primary hover:underline">+ Agregar</button>
                </div>
                <div className="mt-2 space-y-2">
                  {altTitles.map((at, i) => (
                    <div key={i} className="flex gap-2">
                      <select value={at.locale} onChange={(e) => setAltTitles((p) => p.map((a, j) => j === i ? { ...a, locale: e.target.value } : a))}
                        className="rounded-lg border border-border bg-background px-2 py-2 text-sm outline-none">
                        {LOCALES.map((l) => <option key={l} value={l}>{l}</option>)}
                      </select>
                      <input value={at.title} onChange={(e) => setAltTitles((p) => p.map((a, j) => j === i ? { ...a, title: e.target.value } : a))}
                        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" />
                      <button type="button" onClick={() => setAltTitles((p) => p.filter((_, j) => j !== i))}
                        className="rounded-lg border border-border px-2 text-destructive hover:bg-destructive/10">✕</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags */}
              {availableTags.length > 0 && (
                <div>
                  <label className="text-xs text-muted-foreground">Tags</label>
                  <div className="mt-2 max-h-48 space-y-3 overflow-y-auto rounded-lg border border-border bg-background p-3">
                    {(["GENRE", "FORMAT", "THEME", "CONTENT"] as const).map((cat) => {
                      const catTags = availableTags.filter((t) => t.category === cat);
                      if (catTags.length === 0) return null;
                      const catLabel: Record<string, string> = {
                        GENRE: tCatalog("tagCategoryGenre"),
                        FORMAT: tCatalog("tagCategoryFormat"),
                        THEME: tCatalog("tagCategoryTheme"),
                        CONTENT: tCatalog("tagCategoryContent"),
                      };
                      return (
                        <div key={cat}>
                          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{catLabel[cat]}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {catTags.map((tag) => (
                              <button key={tag.id} type="button"
                                onClick={() => setSelectedTagIds((p) => { const n = new Set(p); n.has(tag.id) ? n.delete(tag.id) : n.add(tag.id); return n; })}
                                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${selectedTagIds.has(tag.id) ? "border-primary bg-primary/20 text-foreground" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                                {tag.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button>
              <Button type="button" onClick={() => void handleSave()} disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Guardar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
