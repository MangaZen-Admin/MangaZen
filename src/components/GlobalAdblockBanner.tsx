"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { useAdblockDetection } from "@/hooks/useAdblockDetection";

const STORAGE_KEY = "mangazen-global-adblock-dismissed";

const dismissStoreListeners = new Set<() => void>();

function subscribeDismiss(onStoreChange: () => void) {
  dismissStoreListeners.add(onStoreChange);
  return () => {
    dismissStoreListeners.delete(onStoreChange);
  };
}

function notifyDismissStore() {
  dismissStoreListeners.forEach((fn) => {
    fn();
  });
}

function getDismissedSnapshot() {
  return typeof window !== "undefined" && sessionStorage.getItem(STORAGE_KEY) === "1";
}

function getDismissedServerSnapshot() {
  return true;
}

function isClientSnapshot() {
  return true;
}

function isClientServerSnapshot() {
  return false;
}

function isReaderPath(pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  return parts.length >= 2 && parts[1] === "read";
}

function isProfilePath(pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  return parts.length >= 2 && parts[1] === "profile";
}

export function GlobalAdblockBanner() {
  const t = useTranslations("profile");
  const pathname = usePathname() ?? "";
  const { adblockDetected } = useAdblockDetection();

  const ready = useSyncExternalStore(
    () => () => {},
    isClientSnapshot,
    isClientServerSnapshot
  );

  const dismissed = useSyncExternalStore(
    subscribeDismiss,
    getDismissedSnapshot,
    getDismissedServerSnapshot
  );

  const showBanner =
    ready && !dismissed && adblockDetected && !isReaderPath(pathname) && !isProfilePath(pathname);

  useEffect(() => {
    if (!showBanner) {
      document.body.style.paddingBottom = "";
      return;
    }
    document.body.style.paddingBottom = "44px";
    return () => {
      document.body.style.paddingBottom = "";
    };
  }, [showBanner]);

  const onDismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, "1");
    notifyDismissStore();
  };

  if (!ready) return null;
  if (dismissed || !adblockDetected) return null;
  if (isReaderPath(pathname) || isProfilePath(pathname)) return null;

  return (
    <div
      role="region"
      aria-label={t("globalAdblockBannerAria")}
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 border-t border-primary/25 bg-gradient-to-r from-primary/12 via-card to-primary/10 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_24px_rgba(157,78,221,0.12)] backdrop-blur-md dark:border-primary/30 dark:from-primary/15 dark:via-card dark:to-primary/10 dark:shadow-[0_-4px_28px_rgba(157,78,221,0.18)]"
    >
      <div className="mx-auto flex max-w-5xl items-start gap-2 sm:items-center">
        <p className="min-w-0 flex-1 text-center text-[11px] leading-snug text-foreground sm:text-left sm:text-xs">
          {t("globalAdblockBanner")}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="pointer-events-auto shrink-0 rounded-md p-1 text-muted-foreground transition hover:bg-primary/15 hover:text-foreground"
          aria-label={t("globalAdblockBannerDismiss")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
