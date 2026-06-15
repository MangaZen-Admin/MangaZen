"use client";

import { useState, useEffect } from "react";
import { Loader2, X, GripVertical, ChevronDown, ChevronUp, ArrowLeft, ArrowRight, BookOpen, BookMarked } from "lucide-react";
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
  isEarlyAccess: boolean;
  earlyAccessUntil: string | null;
  earlyAccessPrice: number | null;
  titleTranslations: { locale: string; title: string }[];
  pages: Page[];
};

type MangaInfo = {
  createdAt: string;
  totalChapters: number;
  lastChapterAt: string | null;
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

type View = "info" | "manga" | "chapters";

const LOCALES = ["es-ar","es-es","en-us","en-gb","pt-br","ja-jp","ko-kr","zh-cn","ru-ru"] as const;

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdminMangaEditModal({ mangaSlug, initialData }: Props) {
  const t = useTranslations("scanPanel");
  const tCatalog = useTranslations("catalog");
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("info");

  // Info básica
  const [mangaInfo, setMangaInfo] = useState<MangaInfo | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);

  // Manga edit
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
    isEarlyAccess: boolean;
    earlyAccessUntil: string;
    earlyAccessPrice: string;
    titleTranslations: { locale: string; title: string }[];
    pages: Page[];
    titleTab: string;
  } | null>(null);
  const [chapterBusy, setChapterBusy] = useState(false);
  const [deletingChapterId, setDeletingChapterId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [savingEaId, setSavingEaId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    // Cargar info básica
    setInfoLoading(true);
    void fetch(`/api/admin/manga-chapters?slug=${encodeURIComponent(mangaSlug)}`)
      .then((r) => r.json())
      .then((d: { chapters?: Chapter[] }) => {
        const chs = d.chapters ?? [];
        const sorted = [...chs].sort((a, b) => new Date(b.pages[0]?.pageNumber ?? 0).valueOf() - new Date(a.pages[0]?.pageNumber ?? 0).valueOf());
        setMangaInfo({
          createdAt: new Date().toISOString(),
          totalChapters: chs.length,
          lastChapterAt: sorted[0] ? new Date().toISOString() : null,
        });
        setChapters(chs);
      })
      .catch(() => {})
      .finally(() => setInfoLoading(false));

    // Cargar tags
    void fetch("/api/scan/tags")
      .then((r) => r.json())
      .then((d: { tags?: Tag[] }) => {
        const tags = d.tags ?? [];
        setAvailableTags(tags);
        const ids = new Set(tags.filter((tg) => initialData.tagNames.includes(tg.name)).map((tg) => tg.id));
        setSelectedTagIds(ids);
      })
      .catch(() => {});

    // Cargar capítulos con EA
    setChaptersLoading(true);
    void fetch(`/api/admin/manga-chapters?slug=${encodeURIComponent(mangaSlug)}`)
      .then((r) => r.json())
      .then((d: { chapters?: Chapter[] }) => setChapters(d.chapters ?? []))
      .catch(() => {})
      .finally(() => setChaptersLoading(false));
  }, [open, initialData.tagNames, mangaSlug]);

  function handleClose() {
    setOpen(false);
    setView("info");
  }

  function getLeftAction() {
    if (view === "info") return handleClose;
    return () => setView("info");
  }

  function getRightAction() {
    if (view === "manga") return () => setView("chapters");
    if (view === "chapters") return () => setView("manga");
    return null;
  }

  function getRightLabel() {
    if (view === "manga") return "Editar capítulos";
    if (view === "chapters") return "Editar manga";
    return null;
  }

  function startEditChapter(chapter: Chapter) {
    setEditingChapter({
      id: chapter.id,
      number: String(chapter.number),
      title: chapter.title ?? "",
      locale: chapter.locale,
      isEarlyAccess: chapter.isEarlyAccess,
      earlyAccessUntil: toDatetimeLocal(chapter.earlyAccessUntil),
      earlyAccessPrice: chapter.earlyAccessPrice != null ? String(chapter.earlyAccessPrice) : "50",
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
          titleTranslations: editingChapter.titleTranslations.filter((tr) => tr.title.trim()),
          pageUpdates,
        }),
      });

      if (res.ok) {
        setChapters((prev) => prev.map((c) =>
          c.id === editingChapter.id
            ? { ...c, number: Number(editingChapter.number), title: editingChapter.title.trim() || null, locale: editingChapter.locale, titleTranslations: editingChapter.titleTranslations.filter((tr) => tr.title.trim()), pages: editingChapter.pages }
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

  async function handleSaveEarlyAccess(chapterId: string) {
    if (!editingChapter || editingChapter.id !== chapterId) return;
    setSavingEaId(chapterId);
    try {
      const price = Number(editingChapter.earlyAccessPrice);
      const untilIso = editingChapter.earlyAccessUntil.trim() === "" ? null : new Date(editingChapter.earlyAccessUntil).toISOString();
      const res = await fetch(`/api/admin/chapters/${encodeURIComponent(chapterId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isEarlyAccess: editingChapter.isEarlyAccess,
          earlyAccessUntil: editingChapter.isEarlyAccess ? untilIso : null,
          earlyAccessPrice: editingChapter.isEarlyAccess ? (Number.isFinite(price) ? Math.round(price) : 50) : null,
        }),
      });
      if (res.ok) {
        setChapters((prev) => prev.map((c) =>
          c.id === chapterId
            ? { ...c, isEarlyAccess: editingChapter.isEarlyAccess, earlyAccessUntil: untilIso, earlyAccessPrice: editingChapter.isEarlyAccess ? Math.round(price) : null }
            : c
        ));
        toast.success("Early Access actualizado.");
      } else {
        toast.error("Error al guardar Early Access.");
      }
    } catch {
      toast.error("Error al guardar Early Access.");
    } finally {
      setSavingEaId(null);
    }
  }

  async function handleReorderPages() {
    if (!editingChapter) return;
    setReordering(true);
    try {
      const pageOrder = editingChapter.pages.map((p, i) => ({ pageId: p.id, pageNumber: i + 1 }));
      const res = await fetch(`/api/scan/chapter/${editingChapter.id}/reorder-pages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageOrder }),
      });
      if (res.ok) {
        setEditingChapter((prev) => prev ? { ...prev, pages: prev.pages.map((p, i) => ({ ...p, pageNumber: i + 1 })) } : prev);
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

  async function handleSaveManga() {
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
    } catch {
      toast.error(t("edit.saveError"));
    } finally {
      setBusy(false);
    }
  }

  const rightAction = getRightAction();
  const rightLabel = getRightLabel();

  return (
    <>
      <button type="button" onClick={() => { setOpen(true); setView("info"); }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/60 px-2.5 py-1 text-[10px] font-medium text-foreground transition hover:border-primary/40">
        Editar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-border bg-card shadow-lg scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">

            {/* Header con flechas */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-5 py-3">
              <button type="button" onClick={getLeftAction()}
                className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground">
                <ArrowLeft className="h-3.5 w-3.5" />
                {view === "info" ? "Cerrar" : "Volver"}
              </button>

              <h3 className="text-sm font-semibold text-foreground">
                {view === "info" && initialData.title}
                {view === "manga" && "Editar manga"}
                {view === "chapters" && "Editar capítulos"}
              </h3>

              {rightAction ? (
                <button type="button" onClick={rightAction}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground">
                  {rightLabel}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button type="button" onClick={handleClose}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="p-5">

              {/* ── VISTA INFO ── */}
              {view === "info" && (
                <div className="space-y-4">
                  {infoLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                  ) : (
                    <>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-border bg-background/50 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Total de capítulos</p>
                          <p className="mt-1 text-2xl font-bold text-foreground">{chapters.length}</p>
                        </div>
                        <div className="rounded-lg border border-border bg-background/50 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Capítulos con Early Access</p>
                          <p className="mt-1 text-2xl font-bold text-foreground">{chapters.filter((c) => c.isEarlyAccess).length}</p>
                        </div>
                        <div className="rounded-lg border border-border bg-background/50 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Capítulos aprobados</p>
                          <p className="mt-1 text-2xl font-bold text-foreground">{chapters.filter((c) => c.status === "APPROVED").length}</p>
                        </div>
                        <div className="rounded-lg border border-border bg-background/50 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Capítulos pendientes</p>
                          <p className="mt-1 text-2xl font-bold text-foreground">{chapters.filter((c) => c.status === "PENDING").length}</p>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        <button type="button" onClick={() => setView("manga")}
                          className="flex items-center gap-3 rounded-xl border border-border bg-background/50 p-4 text-left transition hover:border-primary/50 hover:bg-primary/5">
                          <BookOpen className="h-8 w-8 shrink-0 text-primary" />
                          <div>
                            <p className="text-sm font-semibold text-foreground">Editar manga</p>
                            <p className="text-xs text-muted-foreground">Título, autor, sinopsis, tags, títulos alternativos</p>
                          </div>
                          <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
                        </button>

                        <button type="button" onClick={() => setView("chapters")}
                          className="flex items-center gap-3 rounded-xl border border-border bg-background/50 p-4 text-left transition hover:border-primary/50 hover:bg-primary/5">
                          <BookMarked className="h-8 w-8 shrink-0 text-primary" />
                          <div>
                            <p className="text-sm font-semibold text-foreground">Editar capítulos</p>
                            <p className="text-xs text-muted-foreground">Número, idioma, páginas, Early Access</p>
                          </div>
                          <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── VISTA MANGA ── */}
              {view === "manga" && (
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
                    <div className="sm:col-span-2">
                      <label className="text-xs text-muted-foreground">Año</label>
                      <input type="number" value={releaseYear} onChange={(e) => setReleaseYear(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25" />
                    </div>
                  </div>

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

                  {availableTags.length > 0 && (
                    <div>
                      <label className="text-xs text-muted-foreground">Tags</label>
                      <div className="mt-2 max-h-48 space-y-3 overflow-y-auto rounded-lg border border-border bg-background p-3">
                        {(["GENRE", "FORMAT", "THEME", "CONTENT"] as const).map((cat) => {
                          const catTags = availableTags.filter((tg) => tg.category === cat);
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

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setView("info")} disabled={busy}>
                      Cancelar
                    </Button>
                    <Button type="button" onClick={() => void handleSaveManga()} disabled={busy}>
                      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Guardar manga
                    </Button>
                  </div>
                </div>
              )}

              {/* ── VISTA CAPÍTULOS ── */}
              {view === "chapters" && (
                <div>
                  {chaptersLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                  ) : chapters.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay capítulos.</p>
                  ) : (
                    <>
                    <div className="space-y-2">
                      {chapters.sort((a, b) => a.number - b.number).map((chapter) => {
                        const isEditing = editingChapter?.id === chapter.id;
                        const isExpanded = expandedChapterId === chapter.id;
                        return (
                          <div key={chapter.id} className="rounded-lg border border-border bg-background/50">
                            <div className="flex items-center gap-2 p-2">
                              <span className="flex-1 text-xs font-medium text-foreground">
                                Cap. {chapter.number}{chapter.title ? ` — ${chapter.title}` : ""}
                                <span className="ml-2 text-[10px] text-muted-foreground">{chapter.locale}</span>
                                {chapter.isEarlyAccess && <span className="ml-2 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">EA</span>}
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

                            {isExpanded && isEditing && editingChapter && (
                              <div className="border-t border-border p-3 space-y-3">
                                {/* Número, Idioma, Título base — mismo tamaño */}
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="flex flex-col">
                                    <label className="text-[10px] text-muted-foreground">Número</label>
                                    <input type="number" step={0.1} value={editingChapter.number}
                                      onChange={(e) => setEditingChapter((p) => p ? { ...p, number: e.target.value } : p)}
                                      className="mt-0.5 h-8 w-full rounded border border-border bg-background px-2 text-xs outline-none" />
                                  </div>
                                  <div className="flex flex-col">
                                    <label className="text-[10px] text-muted-foreground">Idioma</label>
                                    <select value={editingChapter.locale}
                                      onChange={(e) => setEditingChapter((p) => p ? { ...p, locale: e.target.value } : p)}
                                      className="mt-0.5 h-8 w-full rounded border border-border bg-background px-2 text-xs outline-none">
                                      {LOCALES.map((l) => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                  </div>
                                  <div className="flex flex-col">
                                    <label className="text-[10px] text-muted-foreground">Título base</label>
                                    <input value={editingChapter.title}
                                      onChange={(e) => setEditingChapter((p) => p ? { ...p, title: e.target.value } : p)}
                                      placeholder="Opcional"
                                      className="mt-0.5 h-8 w-full rounded border border-border bg-background px-2 text-xs outline-none" />
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
                                          if (existing) return { ...p, titleTranslations: p.titleTranslations.map((tr) => tr.locale === p.titleTab ? { ...tr, title: val } : tr) };
                                          return { ...p, titleTranslations: [...p.titleTranslations, { locale: p.titleTab, title: val }] };
                                        });
                                      }}
                                      placeholder="Título en este idioma (opcional)"
                                      className="w-full bg-transparent px-3 py-2 text-xs outline-none"
                                    />
                                  </div>
                                </div>

                                {/* Early Access */}
                                <div className="rounded-lg border border-border bg-background p-3 space-y-3">
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Early Access</p>
                                  <label className="flex items-center gap-2 text-xs">
                                    <input type="checkbox" checked={editingChapter.isEarlyAccess}
                                      onChange={(e) => setEditingChapter((p) => p ? { ...p, isEarlyAccess: e.target.checked } : p)}
                                      className="h-3.5 w-3.5 accent-primary" />
                                    Activar Early Access
                                  </label>
                                  {editingChapter.isEarlyAccess && (
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="flex flex-col">
                                        <label className="text-[10px] text-muted-foreground">Disponible hasta</label>
                                        <input type="datetime-local" value={editingChapter.earlyAccessUntil}
                                          onChange={(e) => setEditingChapter((p) => p ? { ...p, earlyAccessUntil: e.target.value } : p)}
                                          className="mt-0.5 h-8 w-full rounded border border-border bg-background px-2 text-xs outline-none" />
                                      </div>
                                      <div className="flex flex-col">
                                        <label className="text-[10px] text-muted-foreground">Precio (ZS)</label>
                                        <input type="number" min={10} max={500} value={editingChapter.earlyAccessPrice}
                                          onChange={(e) => setEditingChapter((p) => p ? { ...p, earlyAccessPrice: e.target.value } : p)}
                                          className="mt-0.5 h-8 w-full rounded border border-border bg-background px-2 text-xs outline-none" />
                                      </div>
                                    </div>
                                  )}
                                  <Button type="button" size="sm" variant="outline" disabled={savingEaId === chapter.id}
                                    onClick={() => void handleSaveEarlyAccess(chapter.id)}>
                                    {savingEaId === chapter.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                                    Guardar EA
                                  </Button>
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
                                      <div key={page.id} draggable
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
                                              setEditingChapter((p) => p ? { ...p, pages: p.pages.map((pg) => pg.id === page.id ? { ...pg, isSingleInDoublePage: checked } : pg) } : p);
                                            }} />
                                          Página sola
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                </div>

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
                      <div className="mt-4 flex justify-end">
                        <Button type="button" variant="outline" onClick={() => setView("info")}>
                          Volver al inicio
                        </Button>
                      </div>                    </>                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}