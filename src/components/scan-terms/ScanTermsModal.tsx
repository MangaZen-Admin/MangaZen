"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  role: "SCAN" | "CREATOR";
};

export function ScanTermsModal({ role }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleAccept() {
    setBusy(true);
    try {
      await fetch("/api/scan-terms/accept", { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    setBusy(true);
    try {
      await fetch("/api/scan-terms/reject", { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const roleLabel = role === "SCAN" ? "Scan" : "Creator";

  return (
    <Dialog open modal>
      <DialogContent
        showClose={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Descargo de responsabilidad - Rol {roleLabel}
          </DialogTitle>
          <DialogDescription>
            Antes de continuar, leé y aceptá los siguientes términos.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-64 overflow-y-auto space-y-3 rounded-lg border border-border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">Condiciones de uso del rol {roleLabel}:</p>
          <p>
            Al aceptar este rol, declarás ser propietario o tener autorización expresa para subir
            y distribuir el contenido que publiques en MangaZen.
          </p>
          <p>
            MangaZen no se hace responsable por infracciones de derechos de autor u otros
            problemas legales derivados del contenido subido por vos.
          </p>
          <p>
            El incumplimiento de estas condiciones puede resultar en la suspensión o eliminación
            de tu cuenta y el contenido publicado.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" disabled={busy} onClick={handleReject}>
            Rechazar y volver a USER
          </Button>
          <Button type="button" disabled={busy} onClick={handleAccept}>
            Acepto los términos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
