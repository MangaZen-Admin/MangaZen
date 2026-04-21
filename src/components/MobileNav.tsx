"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { BookOpen, Newspaper, Users, Search, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import NavbarSearch from "@/components/NavbarSearch";

type MobileNavProps = {
  isAuthenticated: boolean;
};

export function MobileNav({ isAuthenticated: _isAuthenticated }: MobileNavProps) {
  const locale = useLocale();
  const tCat = useTranslations("catalog");
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);

  // Ocultar en el lector
  if (pathname.includes("/read/")) return null;

  const isActive = (href: string) =>
    pathname === `/${locale}${href}` || pathname === href;

  return (
    <>
      {/* Barra inferior */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md md:hidden touch-manipulation pb-[env(safe-area-inset-bottom)]">
        <div className="flex h-14 items-center justify-around px-2">
          <Link
            href={`/${locale}`}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
              isActive("") || pathname === `/${locale}`
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Home className="h-5 w-5" />
            <span>{tCat("navHome")}</span>
          </Link>

          <Link
            href={`/${locale}/library`}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
              isActive("/library") ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <BookOpen className="h-5 w-5" />
            <span>{tCat("browseLibrary")}</span>
          </Link>

          <button
            type="button"
            onClick={() => setSearchOpen((p) => !p)}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors touch-manipulation",
              searchOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Search className="h-5 w-5" />
            <span>{tCat("navSearch")}</span>
          </button>

          <Link
            href={`/${locale}/news`}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
              isActive("/news") ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Newspaper className="h-5 w-5" />
            <span>{tCat("navUpdates")}</span>
          </Link>

          <Link
            href={`/${locale}/community`}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
              isActive("/community") ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="h-5 w-5" />
            <span>{tCat("navCommunity")}</span>
          </Link>
        </div>
      </div>

      {/* Panel de búsqueda expandible */}
      {searchOpen && (
        <div className="fixed bottom-14 left-0 right-0 z-50 border-t border-border bg-card/95 p-3 backdrop-blur-md md:hidden pb-[env(safe-area-inset-bottom)]">
          <NavbarSearch />
        </div>
      )}

      {/* Spacer para que el contenido no quede tapado por la barra */}
      <div className="h-14 md:hidden" />
    </>
  );
}
