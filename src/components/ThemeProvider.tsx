"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

/** Misma clave que usaba next-themes por defecto, para no perder preferencias guardadas. */
const STORAGE_KEY = "theme";

export type AppTheme = "light" | "dark";

type ThemeContextValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  resolvedTheme: AppTheme;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyThemeClass(next: AppTheme) {
  const root = document.documentElement;
  if (next === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

function subscribe(onStoreChange: () => void) {
  const el = document.documentElement;
  const obs = new MutationObserver(() => onStoreChange());
  obs.observe(el, { attributes: true, attributeFilter: ["class"] });
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    obs.disconnect();
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): AppTheme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerSnapshot(): AppTheme {
  return "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark") {
        applyThemeClass(stored);
      } else {
        applyThemeClass("dark");
      }
    } catch {
      applyThemeClass("dark");
    }
  }, []);

  const setTheme = useCallback((next: AppTheme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode */
    }
    applyThemeClass(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      resolvedTheme: theme,
    }),
    [theme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * API compatible con `next-themes` para migración suave (theme / setTheme / resolvedTheme).
 */
export function useTheme(): {
  theme: AppTheme | undefined;
  setTheme: (theme: string | ((t: AppTheme | undefined) => AppTheme)) => void;
  resolvedTheme: AppTheme | undefined;
} {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: undefined,
      setTheme: () => {},
      resolvedTheme: undefined,
    };
  }

  return {
    theme: ctx.theme,
    resolvedTheme: ctx.resolvedTheme,
    setTheme: (next) => {
      if (typeof next === "function") {
        const resolved = next(ctx.theme);
        if (resolved === "light" || resolved === "dark") ctx.setTheme(resolved);
        return;
      }
      if (next === "light" || next === "dark") ctx.setTheme(next);
    },
  };
}
