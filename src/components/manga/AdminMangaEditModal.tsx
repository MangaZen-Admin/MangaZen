"use client";

import { useState, useEffect } from "react";
import { Loader2, Pencil, X, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type Tag = { id: string; name: string; category: string };

type Page = {
  id: string;
  pageNumber: number;
  imageUrl: string;
  isSingleInDoublePage: boolean;
};

type Chapter = {
  id: string;
  number: number;
  title: string | null;
  status: string;
  locale: string;
  titleTranslations: { locale: string; title: string }[];
  pages: Page[];
};

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

  // Capítulos
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [expandedChapterId, setExpandedChapterId] = useState<string | null>(null);
  const [editingChapter, setEditingChapter] = useState<{
    id: string;
    number: string;
    title: string;
    locale: string;
    titleTranslations: { locale: string; title: string }[];
    pages: Page[];
    titleTab: string;
  } | null>(null);
  const [chapterBusy, setChapterBusy] = useState(false);
  const [deletingChapterId, setDeletingChapterId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    void fetch("/api/scan/tags")
      .then((r) => r.json())
      .then((d: { tags?: Tag[] }) => {
        const tags = d.tags ?? [];
        setAvailableTags(tags);
        const ids = new Set(tags.filter((t) => initialData.tagNames.includes(t.name)).map((t) => t.id));
        setSelectedTagIds(ids);
      })
      .catch(() => {});

    setChaptersLoading(true);
    void fetch(`/api/admin/manga-chapters?slug=${encodeURIComponent(mangaSlug)}`)
      .then((r) => r.json())
      .then((d: { chapters?: Chapter[] }) => setChapters(d.chapters ?? []))
      .catch(() => {})
      .finally(() => setChaptersLoading(false));
  }, [open, initialData.tagNames, mangaSlug]);

  function startEditChapter(chapter: Chapter) {
    setEditingChapter({
      id: chapter.id,
      number: String(chapter.number),
      title: chapter.title ?? "",
      locale: chapter.locale,
      titleTranslations: [...chapter.titleTranslations],
      pages: [...chapter.pages],
      titleTab: "es-ar",
    });
    setExpandedChapterId(chapter.id);
  }

  async function handleSaveChapter() {
    if (!editingChapter) return;
    setChapterBusy(true);
    try {
      const pageUpdates = editingChapter.pages.map((p) => ({
        pageId: p.id,
        isSingleInDoublePage: p.isSingleInDoublePage,
      }));

      const res = await fetch(`/api/scan/chapter/${editingChapter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: Number(editingChapter.number),
          title: editingChapter.title.trim() || null,
          locale: editingChapter.locale,
          titleTranslations: editingChapter.titleTranslations.filter((t) => t.title.trim()),
          pageUpdates,
        }),
      });

      if (res.ok) {
        setChapters((prev) => prev.map((c) =>
          c.id === editingChapter.id
            ? {
                ...c,
                number: Number(editingChapter.number),
                title: editingChapter.title.trim() || null,
                locale: editingChapter.locale,
                titleTranslations: editingChapter.titleTranslations.filter((t) => t.title.trim()),
                pages: editingChapter.pages,
              }
            : c
        ));
        setEditingChapter(null);
        toast.success("Capítulo actualizado.");
      } else {
        toast.error("Error al guardar el capítulo.");
      }
    } catch {
      toast.error("Error al guardar el capítulo.");
    } finally {
      setChapterBusy(false);
    }
  }

  async function handleReorderPages() {
    if (!editingChapter) return;
    setReordering(true);
    try {
      const pageOrder = editingChapter.pages.map((p, i) => ({
        pageId: p.id,
        pageNumber: i + 1,
      }));
      const res = await fetch(`/api/scan/chapter/${editingChapter.id}/reorder-pages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageOrder }),
      });
      if (res.ok) {
        setEditingChapter((prev) =>
          prev ? { ...prev, pages: prev.pages.map((p, i) => ({ ...p, pageNumber: i + 1 })) } : prev
        );
        toast.success("Páginas reordenadas.");
      } else {
        toast.error("Error al reordenar páginas.");
      }
    } catch {
      toast.error("Error al reordenar páginas.");
    } finally {
      setReordering(false);
    }
  }

  function onDragStart(index: number) { setDragFrom(index); }
  function onDrop(toIndex: number) {
    if (dragFrom == null || dragFrom === toIndex || !editingChapter) return;
    const pages = [...editingChapter.pages];
    const [moved] = pages.splice(dragFrom, 1);
    pages.splice(toIndex, 0, moved);
    setEditingChapter((prev) => prev ? { ...prev, pages } : prev);
    setDragFrom(null);
  }

  async function handleDeleteChapter(chapterId: string) {
    if (!window.confirm("¿Eliminar este capítulo? Esta acción no se puede deshacer.")) return;
    setDeletingChapterId(chapterId);
    try {
      const upload = await fetch(`/api/admin/chapter-upload?chapterId=${chapterId}`).then((r) => r.json()) as { uploadId?: string };
      if (upload.uploadId) {
        const res = await fetch(`/api/scan/my-uploads?id=${encodeURIComponent(upload.uploadId)}`, { method: "DELETE" });
        if (res.ok) {
          setChapters((prev) => prev.filter((c) => c.id !== chapterId));
          if (editingChapter?.id === chapterId) setEditingChapter(null);
          toast.success("Capítulo eliminado.");
        } else {
          toast.error("Error al eliminar el capítulo.");
        }
      } else {
        toast.error("No se encontró el upload del capítulo.");
      }
    } catch {
      toast.error("Error al eliminar el capítulo.");
    } finally {
      setDeletingChapterId(null);
    }
  }

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
      const res = await fetch(`/api/scan/manga/${mangaSlug}`, { method: "PATCH", body: form });
      if (!res.ok) { toast.error(t("edit.saveError")); return; }
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
      <button type="button" onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/8 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-blue-500/15">
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
              {/* Info básica */}
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

              {/* Sinopsis */}
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

              {/* Capítulos */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Capítulos</label>
                {chaptersLoading ? (
                  <div className="mt-2 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                ) : chapters.length === 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">No hay capítulos.</p>
                ) : (
                  <div className="mt-2 space-y-1.5">
                    {chapters.sort((a, b) => a.number - b.number).map((chapter) => {
                      const isEditing = editingChapter?.id === chapter.id;
                      const isExpanded = expandedChapterId === chapter.id;
                      return (
                        <div key={chapter.id} className="rounded-lg border border-border bg-background/50">
                          {/* Header del capítulo */}
                          <div className="flex items-center gap-2 p-2">
                            <span className="flex-1 text-xs font-medium text-foreground">
                              Cap. {chapter.number}{chapter.title ? ` — ${chapter.title}` : ""}
                              <span className="ml-2 text-[10px] text-muted-foreground">{chapter.locale}</span>
                            </span>
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                              chapter.status === "APPROVED" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" :
                              chapter.status === "PENDING" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" :
                              "bg-red-500/15 text-red-700 dark:text-red-300"
                            }`}>{chapter.status}</span>
                            <button type="button" onClick={() => { startEditChapter(chapter); setExpandedChapterId(isExpanded && !isEditing ? null : chapter.id); }}
                              className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:border-primary/40">
                              {isEditing ? "Editando" : "Editar"}
                            </button>
                            <button type="button" disabled={deletingChapterId === chapter.id}
                              onClick={() => void handleDeleteChapter(chapter.id)}
                              className="rounded border border-destructive/40 px-1.5 py-0.5 text-[10px] text-destructive hover:bg-destructive/10">
                              {deletingChapterId === chapter.id ? "..." : "Borrar"}
                            </button>
                            <button type="button" onClick={() => setExpandedChapterId(isExpanded ? null : chapter.id)}
                              className="text-muted-foreground hover:text-foreground">
                              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>
                          </div>

                          {/* Panel de edición expandible */}
                          {isExpanded && isEditing && editingChapter && (
                            <div className="border-t border-border p-3 space-y-3">
                              {/* Número, locale */}
                              <div className="grid gap-2 sm:grid-cols-3">
                                <div>
                                  <label className="text-[10px] text-muted-foreground">Número</label>
                                  <input type="number" step={0.1} value={editingChapter.number}
                                    onChange={(e) => setEditingChapter((p) => p ? { ...p, number: e.target.value } : p)}
                                    className="mt-0.5 w-full rounded border border-border bg-background px-2 py-1.5 text-xs outline-none" />
                                </div>
                                <div>
                                  <label className="text-[10px] text-muted-foreground">Idioma</label>
                                  <select value={editingChapter.locale}
                                    onChange={(e) => setEditingChapter((p) => p ? { ...p, locale: e.target.value } : p)}
                                    className="mt-0.5 w-full rounded border border-border bg-background px-2 py-1.5 text-xs outline-none">
                                    {LOCALES.map((l) => <option key={l} value={l}>{l}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[10px] text-muted-foreground">Título base</label>
                                  <input value={editingChapter.title}
                                    onChange={(e) => setEditingChapter((p) => p ? { ...p, title: e.target.value } : p)}
                                    placeholder="Opcional"
                                    className="mt-0.5 w-full rounded border border-border bg-background px-2 py-1.5 text-xs outline-none" />
                                </div>
                              </div>

                              {/* Títulos multiidioma */}
                              <div>
                                <label className="text-[10px] text-muted-foreground">Títulos por idioma</label>
                                <div className="mt-1 rounded-lg border border-border bg-background">
                                  <div className="flex flex-wrap border-b border-border">
                                    {LOCALES.map((loc) => (
                                      <button key={loc} type="button"
                                        onClick={() => setEditingChapter((p) => p ? { ...p, titleTab: loc } : p)}
                                        className={`px-2.5 py-1 text-[10px] font-medium transition-colors ${editingChapter.titleTab === loc ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                                        {loc}
                                        {editingChapter.titleTranslations.find((tr) => tr.locale === loc)?.title && <span className="ml-1 text-primary">•</span>}
                                      </button>
                                    ))}
                                  </div>
                                  <input
                                    value={editingChapter.titleTranslations.find((tr) => tr.locale === editingChapter.titleTab)?.title ?? ""}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setEditingChapter((p) => {
                                        if (!p) return p;
                                        const existing = p.titleTranslations.find((tr) => tr.locale === p.titleTab);
                                        if (existing) {
                                          return { ...p, titleTranslations: p.titleTranslations.map((tr) => tr.locale === p.titleTab ? { ...tr, title: val } : tr) };
                                        }
                                        return { ...p, titleTranslations: [...p.titleTranslations, { locale: p.titleTab, title: val }] };
                                      });
                                    }}
                                    placeholder="Título en este idioma (opcional)"
                                    className="w-full bg-transparent px-3 py-2 text-xs outline-none"
                                  />
                                </div>
                              </div>

                              {/* Páginas */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-[10px] text-muted-foreground">Páginas ({editingChapter.pages.length})</label>
                                  <button type="button" disabled={reordering} onClick={() => void handleReorderPages()}
                                    className="text-[10px] text-primary hover:underline disabled:opacity-50">
                                    {reordering ? "Guardando..." : "Guardar orden"}
                                  </button>
                                </div>
                                <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-border bg-background p-2">
                                  {editingChapter.pages.map((page, index) => (
                                    <div key={page.id}
                                      draggable
                                      onDragStart={() => onDragStart(index)}
                                      onDragOver={(e) => e.preventDefault()}
                                      onDrop={() => onDrop(index)}
                                      className="flex items-center gap-2 rounded border border-border bg-card/50 p-1.5 cursor-grab">
                                      <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                      <span className="w-6 text-center text-[10px] text-muted-foreground font-mono">{index + 1}</span>
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={page.imageUrl} alt="" className="h-8 w-6 rounded object-cover" />
                                      <label className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer ml-auto">
                                        <input type="checkbox" checked={page.isSingleInDoublePage}
                                          onChange={(e) => {
                                            const checked = e.target.checked;
                                            setEditingChapter((p) => p ? {
                                              ...p,
                                              pages: p.pages.map((pg) => pg.id === page.id ? { ...pg, isSingleInDoublePage: checked } : pg)
                                            } : p);
                                          }} />
                                        Página sola
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Botones guardar capítulo */}
                              <div className="flex gap-2 pt-1">
                                <Button type="button" size="sm" disabled={chapterBusy} onClick={() => void handleSaveChapter()}>
                                  {chapterBusy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                                  Guardar capítulo
                                </Button>
                                <Button type="button" size="sm" variant="outline" onClick={() => setEditingChapter(null)}>
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button>
              <Button type="button" onClick={() => void handleSave()} disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Guardar manga
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
