"use client";

import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Props = {
  mangaSlug: string;
  isAuthenticated: boolean;
  initialReportCount: number;
};

const REASONS = [
  { value: "WRONG_INFO", label: "Información incorrecta" },
  { value: "WRONG_COVER", label: "Portada incorrecta" },
  { value: "DUPLICATE", label: "Manga duplicado" },
  { value: "INAPPROPRIATE", label: "Contenido inapropiado" },
  { value: "OTHER", label: "Otro" },
];

const MAX_REPORTS = 5;

export function MangaReportButton({ mangaSlug, isAuthenticated, initialReportCount }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("WRONG_INFO");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [reported, setReported] = useState(false);
  const [reportCount] = useState(initialReportCount);

  if (reportCount >= MAX_REPORTS) {
    return (
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Flag className="h-3.5 w-3.5 text-destructive" />
        Este manga ya fue reportado y está siendo revisado por el equipo.
      </p>
    );
  }

  if (reported) {
    return (
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Flag className="h-3.5 w-3.5 text-primary" />
        Gracias por tu reporte. Lo revisaremos pronto.
      </p>
    );
  }

  async function handleSubmit() {
    if (!isAuthenticated) {
      toast.error("Necesitás iniciar sesión para reportar");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/manga/${mangaSlug}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, details }),
      });
      if (res.status === 409) {
        const data = (await res.json()) as { error: string };
        if (data.error === "ALREADY_REPORTED") {
          toast.error("Ya reportaste este manga anteriormente");
        } else {
          toast.error("Este manga ya fue reportado por suficientes usuarios");
        }
        return;
      }
      if (!res.ok) {
        toast.error("Error al enviar el reporte");
        return;
      }
      setReported(true);
      setOpen(false);
      toast.success("Reporte enviado correctamente");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-destructive"
      >
        <Flag className="h-3.5 w-3.5" />
        Reportar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-lg">
            <h3 className="mb-3 text-base font-semibold">Reportar manga</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Motivo</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
                >
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Detalles (opcional)</label>
                <textarea
                  rows={3}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  maxLength={500}
                  placeholder="Describí el problema..."
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void handleSubmit()}
                disabled={busy}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar reporte"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
