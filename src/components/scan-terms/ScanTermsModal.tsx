"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("scanTerms");
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
            {t("title", { role: roleLabel })}
          </DialogTitle>
          <DialogDescription>
            {t("intro")}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-64 overflow-y-auto space-y-3 rounded-lg border border-border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">{t("conditions", { role: roleLabel })}</p>
          <p>{t("term1")}</p>
          <p>{t("term2")}</p>
          <p>{t("term3")}</p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" disabled={busy} onClick={handleReject}>
            {t("reject")}
          </Button>
          <Button type="button" disabled={busy} onClick={handleAccept}>
            {t("accept")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
