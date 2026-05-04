"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Check, X, Loader2, FileEdit, Flag } from "lucide-react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { dateFnsLocaleFromAppLocale } from "@/lib/date-fns-locale";

type ChangeRequest = {
  id: string;
  type: "MANGA_EDIT" | "CHAPTER_EDIT";
  entityId: string;
  previousData: Record<string, unknown>;
  newData: Record<string, unknown>;
  createdAt: string;
  requester: {
    id: string;
    name: string | null;
    email: string | null;
    username: string | null;
  };
};

type MangaReport = {
  id: string;
  mangaId: string;
  manga: { title: string; slug: string };
  reason: string;
  details: string | null;
  createdAt: string;
  user: { name: string | null; email: string | null };
};

export function AdminEditionsPanel() {
  const locale = useLocale();
  const dfLocale = useMemo(() => dateFnsLocaleFromAppLocale(locale), [locale]);
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [reports, setReports] = useState<MangaReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [crRes, rpRes] = await Promise.all([
        fetch("/api/admin/change-requests"),
        fetch("/api/admin/manga-reports"),
      ]);
      if (crRes.ok) {
        const d = (await crRes.json()) as { requests: ChangeRequest[] };
        setRequests(d.requests);
      }
      if (rpRes.ok) {
        const d = (await rpRes.json()) as { reports: MangaReport[] };
        setReports(d.reports);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAction(id: string, action: "approve" | "reject") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/change-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, adminNote: adminNote[id] ?? "" }),
      });
      if (!res.ok) {
        toast.error("Error al procesar la solicitud");
        return;
      }
      toast.success(action === "approve" ? "Cambio aprobado" : "Cambio rechazado");
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  async function handleReportReviewed(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/manga-reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REVIEWED" }),
      });
      if (!res.ok) {
        toast.error("Error");
        return;
      }
      setReports((prev) => prev.filter((r) => r.id !== id));
      toast.success("Denuncia marcada como revisada");
    } finally {
      setBusyId(null);
    }
  }

  const REASON_LABELS: Record<string, string> = {
    WRONG_INFO: "Información incorrecta",
    WRONG_COVER: "Portada incorrecta",
    DUPLICATE: "Manga duplicado",
    INAPPROPRIATE: "Contenido inapropiado",
    OTHER: "Otro",
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <FileEdit className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Solicitudes de edición</h2>
          {requests.length > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
              {requests.length}
            </span>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay solicitudes pendientes.</p>
        ) : (
          <div className="space-y-4">
            {requests.map((cr) => (
              <div key={cr.id} className="rounded-lg border border-border bg-background/60 p-4">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {cr.type === "MANGA_EDIT" ? "Edición de manga" : "Edición de capítulo"}
                    </span>
                    <p className="mt-0.5 text-sm font-medium text-foreground">
                      Por {cr.requester.name ?? cr.requester.email ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(cr.createdAt), {
                        addSuffix: true,
                        locale: dfLocale,
                      })}
                    </p>
                  </div>
                </div>

                <div className="mb-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                    <p className="mb-1 text-xs font-semibold text-destructive">Antes</p>
                    {Object.entries(cr.previousData)
                      .filter(([key, val]) => val !== cr.newData[key])
                      .map(([key, val]) => (
                        <p key={key} className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{key}:</span>{" "}
                          {String(val ?? "—")}
                        </p>
                      ))}
                  </div>
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <p className="mb-1 text-xs font-semibold text-primary">Después</p>
                    {Object.entries(cr.newData)
                      .filter(([key, val]) => val !== cr.previousData[key])
                      .map(([key, val]) => (
                        <p key={key} className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{key}:</span>{" "}
                          {String(val ?? "—")}
                        </p>
                      ))}
                  </div>
                </div>

                <input
                  value={adminNote[cr.id] ?? ""}
                  onChange={(e) => setAdminNote((prev) => ({ ...prev, [cr.id]: e.target.value }))}
                  placeholder="Nota para el scan (opcional)..."
                  className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
                />

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={busyId === cr.id}
                    onClick={() => void handleAction(cr.id, "approve")}
                  >
                    {busyId === cr.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="mr-1 h-3.5 w-3.5" />
                    )}
                    Aprobar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busyId === cr.id}
                    onClick={() => void handleAction(cr.id, "reject")}
                  >
                    <X className="mr-1 h-3.5 w-3.5" />
                    Rechazar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Flag className="h-5 w-5 text-destructive" />
          <h2 className="text-lg font-semibold">Denuncias de mangas</h2>
          {reports.length > 0 && (
            <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground">
              {reports.length}
            </span>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay denuncias pendientes.</p>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-background/60 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{r.manga.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {REASON_LABELS[r.reason] ?? r.reason}
                    {r.details && ` — ${r.details}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Por {r.user.name ?? r.user.email ?? "—"} ·{" "}
                    {formatDistanceToNow(new Date(r.createdAt), {
                      addSuffix: true,
                      locale: dfLocale,
                    })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/${locale}/manga/${r.manga.slug}`} target="_blank" rel="noreferrer">
                      Ver manga
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    disabled={busyId === r.id}
                    onClick={() => void handleReportReviewed(r.id)}
                  >
                    {busyId === r.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Revisado"
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
