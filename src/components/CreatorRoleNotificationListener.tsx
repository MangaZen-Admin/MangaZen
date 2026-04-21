"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

type RequestPayload = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
} | null;

/**
 * Sondeo ligero: si una solicitud CREATOR deja de estar PENDING, avisa una vez por id (localStorage).
 */
export function CreatorRoleNotificationListener() {
  const t = useTranslations("community.creatorRequest");
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    function storageKey(id: string, status: string) {
      return `mangazen-creator-req-${id}-${status}-toast`;
    }

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/user/creator-role-request", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { request: RequestPayload };
        const req = data.request;
        if (!req || req.status === "PENDING") return;

        const key = storageKey(req.id, req.status);
        if (typeof window !== "undefined" && localStorage.getItem(key)) return;
        if (seenRef.current.has(key)) return;

        if (req.status === "APPROVED") {
          toast.success(t("toastApproved"));
        } else if (req.status === "REJECTED") {
          toast.error(t("toastRejected"));
        }
        seenRef.current.add(key);
        try {
          localStorage.setItem(key, "1");
        } catch {
          /* private mode */
        }
      } catch {
        /* ignore */
      }
    }

    void poll();
    const id = window.setInterval(poll, 25000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [t]);

  return null;
}
