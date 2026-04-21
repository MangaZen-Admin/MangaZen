import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LiveOnlineCounter } from "@/components/LiveOnlineCounter";
import { getLegalTranslations } from "@/lib/get-legal-translations";

export async function SiteFooter() {
  const tCat = await getTranslations("catalog");
  const tLegal = await getLegalTranslations();

  return (
    <footer
      id="site-footer"
      className="mt-auto border-t border-border/80 bg-card/30 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-4 sm:flex-row sm:items-center">
        <LiveOnlineCounter />
        <nav
          className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-muted-foreground"
          aria-label="Footer"
        >
          <Link href="/" className="transition-colors hover:text-primary">
            {tCat("navHome")}
          </Link>
          <Link href="/library" className="transition-colors hover:text-primary">
            {tCat("browseLibrary")}
          </Link>
          <Link href="/profile" className="transition-colors hover:text-primary">
            {tCat("navProfile")}
          </Link>
          <Link href="/community" className="transition-colors hover:text-primary">
            {tCat("navCommunity")}
          </Link>
          <span className="hidden h-3 w-px bg-border sm:inline" aria-hidden />
          <Link href="/legal/terms" className="transition-colors hover:text-primary">
            {tLegal("footerTerms")}
          </Link>
          <Link href="/legal/privacy" className="transition-colors hover:text-primary">
            {tLegal("footerPrivacy")}
          </Link>
          <Link href="/legal/dmca" className="transition-colors hover:text-primary">
            {tLegal("footerDmca")}
          </Link>
          <Link href="/legal/cookies" className="transition-colors hover:text-primary">
            {tLegal("footerCookies")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
