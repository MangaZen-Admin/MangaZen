"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, LogOut, ScanLine, Shield, User } from "lucide-react";

type UserMenuProps = {
  displayName: string;
  image: string | null;
  isAdmin: boolean;
  /** Viene de `canAccessScanPanel(role)` en Navbar (SCAN, ADMIN o CREATOR). */
  showScanPanel?: boolean;
  /** Cola de revisión: mangas + capítulos pendientes (solo admin). */
  adminReviewQueueCount?: number;
};

export default function UserMenu({
  displayName,
  image,
  isAdmin,
  showScanPanel = false,
  adminReviewQueueCount = 0,
}: UserMenuProps) {
  const locale = useLocale();
  const t = useTranslations("userMenu");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full border border-border bg-card px-2 py-1 text-foreground transition hover:border-primary hover:bg-primary/10 hover:shadow-none dark:hover:bg-card dark:hover:shadow-[0_0_14px_rgba(157,78,221,0.35)]"
      >
        <div className="relative h-8 w-8 overflow-hidden rounded-full border border-border">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={`Avatar de ${displayName}`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-background text-xs font-semibold text-muted-foreground">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <span className="hidden max-w-28 truncate text-sm text-foreground sm:inline">{displayName}</span>
        <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-xl border border-border bg-card p-1.5 shadow-lg dark:shadow-2xl">
          <Link
            href={`/${locale}/profile`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition hover:bg-muted"
          >
            <User className="h-4 w-4" />
            {t("profile")}
          </Link>

          {showScanPanel && (
            <Link
              href={`/${locale}/scan`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition hover:bg-muted"
            >
              <ScanLine className="h-4 w-4" />
              {t("scanPanel")}
            </Link>
          )}

          {isAdmin && (
            <Link
              href={`/${locale}/admin`}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition hover:bg-muted"
            >
              <span className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {t("adminPanel")}
              </span>
              {adminReviewQueueCount > 0 ? (
                <span className="min-w-[1.25rem] rounded-full bg-destructive px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none text-destructive-foreground">
                  {adminReviewQueueCount > 99 ? "99+" : adminReviewQueueCount}
                </span>
              ) : null}
            </Link>
          )}

          <form action={`/${locale}/logout`} method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition hover:bg-muted"
            >
              <LogOut className="h-4 w-4" />
              {t("logout")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
