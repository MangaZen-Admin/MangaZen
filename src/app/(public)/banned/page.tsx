import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function BannedPage() {
  const t = await getTranslations("moderation");
  const locale = await getLocale();
  return (
    <main className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-destructive/30 bg-card p-8 text-center shadow-sm">
        <div className="mb-4 text-4xl">🚫</div>
        <h1 className="text-xl font-semibold text-foreground">{t("bannedTitle")}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {t("bannedBody")}
        </p>
        <Link
          href={`/${locale}/login`}
          className="mt-6 inline-block text-sm text-primary hover:underline"
        >
          {t("bannedCta")}
        </Link>
      </div>
    </main>
  );
}
