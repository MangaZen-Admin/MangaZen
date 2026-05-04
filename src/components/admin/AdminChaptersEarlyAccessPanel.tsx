"use client";

import { useState, useCallback } from "react";
import { Loader2, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export type AdminChapterEaRow = {
  id: string;
  number: number;
  status: string;
  mangaTitle: string;
  isEarlyAccess: boolean;
  earlyAccessUntil: string | null;
  earlyAccessPrice: number | null;
};

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type SearchResult = {
  id: string;
  number: number;
  title: string | null;
  status: string;
  isEarlyAccess: boolean;
  earlyAccessUntil: string | null;
  earlyAccessPrice: number | null;
  manga: { title: string; slug: string };
};

export function AdminChaptersEarlyAccessPanel({
  initialChapters,
}: {
  initialChapters: AdminChapterEaRow[];
}) {
  const t = useTranslations("earlyAccess.admin");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [selectedRow, setSelectedRow] = useState<AdminChapterEaRow | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Últimos 10 capítulos (de initialChapters)
  const recentChapters = initialChapters.slice(0, 10);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/admin/chapters/search?q=${encodeURIComponent(query.trim())}`
      );
      if (!res.ok) { setMessage({ type: "err", text: "Error al buscar" }); return; }
      const data = (await res.json()) as { chapters: SearchResult[] };
      setSearchResults(data.chapters);
    } finally {
      setSearching(false);
    }
  }, [query]);

  async function patchChapter(
    id: string,
    next: { isEarlyAccess: boolean; earlyAccessUntilIso: string | null; earlyAccessPrice: number | null }
  ) {
    setSavingId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/chapters/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isEarlyAccess: next.isEarlyAccess,
          earlyAccessUntil: next.isEarlyAccess ? next.earlyAccessUntilIso : null,
          earlyAccessPrice: next.isEarlyAccess ? next.earlyAccessPrice : null,
        }),
      });
      if (!res.ok) { setMessage({ type: "err", text: t("saveError") }); return; }
      setMessage({ type: "ok", text: t("saved") });
      setSelectedRow(null);
    } finally {
      setSavingId(null);
    }
  }

  const displayRows: AdminChapterEaRow[] = searchResults
    ? searchResults.map((r) => ({
        id: r.id,
        number: r.number,
        status: r.status,
        mangaTitle: r.manga.title,
        isEarlyAccess: r.isEarlyAccess,
        earlyAccessUntil: r.earlyAccessUntil,
        earlyAccessPrice: r.earlyAccessPrice,
      }))
    : recentChapters;

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>

      {/* Buscador */}
      <div className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleSearch()}
            placeholder="Buscar manga o capítulo..."
            className="h-9 w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:ring-2 ring-primary/30"
          />
        </div>
        <Button type="button" size="sm" onClick={() => void handleSearch()} disabled={searching}>
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
        </Button>
        {searchResults && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => { setSearchResults(null); setQuery(""); }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {message && (
        <p className={`mt-2 text-sm ${message.type === "ok" ? "text-primary" : "text-destructive"}`}>
          {message.text}
        </p>
      )}

      {/* Lista */}
      <div className="mt-4">
        <p className="mb-2 text-xs text-muted-foreground">
          {searchResults
            ? `${searchResults.length} resultado(s)`
            : "Últimos 10 capítulos subidos"}
        </p>

        {displayRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <div className="space-y-2">
            {displayRows.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background/60 px-3 py-2.5 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">{row.mangaTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    Cap. {row.number} · {row.status}
                    {row.isEarlyAccess && (
                      <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        Early Access
                      </span>
                    )}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedRow(row)}
                >
                  Configurar
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de edición */}
      {selectedRow && (
        <AdminChapterEaModal
          row={selectedRow}
          saving={savingId === selectedRow.id}
          onCancel={() => setSelectedRow(null)}
          onSave={(next) => void patchChapter(selectedRow.id, next)}
        />
      )}
    </section>
  );
}

function AdminChapterEaModal({
  row,
  saving,
  onCancel,
  onSave,
}: {
  row: AdminChapterEaRow;
  saving: boolean;
  onCancel: () => void;
  onSave: (next: {
    isEarlyAccess: boolean;
    earlyAccessUntilIso: string | null;
    earlyAccessPrice: number | null;
  }) => void;
}) {
  const t = useTranslations("earlyAccess.admin");
  const [ea, setEa] = useState(row.isEarlyAccess);
  const [untilLocal, setUntilLocal] = useState(() => toDatetimeLocalValue(row.earlyAccessUntil));
  const [priceStr, setPriceStr] = useState(
    row.earlyAccessPrice != null ? String(row.earlyAccessPrice) : "50"
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg">
        <h3 className="text-base font-semibold text-foreground mb-1">
          Configurar Early Access
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          {row.mangaTitle} — Cap. {row.number}
        </p>

        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={ea}
              onChange={(e) => setEa(e.target.checked)}
              disabled={saving}
              className="h-4 w-4 accent-primary"
            />
            Activar Early Access
          </label>

          <div>
            <label className="text-xs text-muted-foreground">Disponible hasta</label>
            <input
              type="datetime-local"
              value={untilLocal}
              onChange={(e) => setUntilLocal(e.target.value)}
              disabled={saving || !ea}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 ring-primary/30 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Precio (ZenCoins)</label>
            <input
              type="number"
              min={10}
              max={500}
              value={priceStr}
              onChange={(e) => setPriceStr(e.target.value)}
              disabled={saving || !ea}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 ring-primary/30 disabled:opacity-50"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={() => {
              const price = Number(priceStr);
              const untilIso = untilLocal.trim() === "" ? null : new Date(untilLocal).toISOString();
              onSave({
                isEarlyAccess: ea,
                earlyAccessUntilIso: ea ? untilIso : null,
                earlyAccessPrice: ea ? (Number.isFinite(price) ? Math.round(price) : 50) : null,
              });
            }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
