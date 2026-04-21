import { getLocale, getTranslations } from "next-intl/server";
import { NewsPageClient } from "@/components/news/NewsPageClient";
import { getAuthenticatedUserIdServer } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

export async function generateMetadata() {
  const t = await getTranslations("news");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export const revalidate = 120;

export default async function NewsPage() {
  const locale = await getLocale();
  const t = await getTranslations("news");
  const userId = await getAuthenticatedUserIdServer();
  const viewer = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { isPro: true } })
    : null;
  const showAds = !viewer?.isPro;
  return (
    <main className="mx-auto min-h-[calc(100vh-5rem)] w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {t("pageTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("pageSubtitle")}</p>
      </header>
      <NewsPageClient locale={locale} showAds={showAds} />
    </main>
  );
}
