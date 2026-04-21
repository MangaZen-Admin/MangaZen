import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { getAuthenticatedUserIdServer } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

export default async function SuspendedPage() {
  const t = await getTranslations("moderation");
  const locale = await getLocale();
  const userId = await getAuthenticatedUserIdServer();

  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { suspendedUntil: true, suspendReason: true },
      })
    : null;

  const until = user?.suspendedUntil;
  const reason = user?.suspendReason;

  return (
    <main className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-card p-8 text-center shadow-sm">
        <div className="mb-4 text-4xl">⏸️</div>
        <h1 className="text-xl font-semibold text-foreground">{t("suspendedTitle")}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {t("suspendedBody")}
        </p>
        {until && (
          <p className="mt-2 text-sm font-medium text-amber-700 dark:text-amber-300">
            {t("suspendedUntil", { date: new Date(until).toLocaleDateString(locale) })}
          </p>
        )}
        {reason && (
          <p className="mt-2 text-xs italic text-muted-foreground">{reason}</p>
        )}
        <Link
          href={`/${locale}/login`}
          className="mt-6 inline-block text-sm text-primary hover:underline"
        >
          {t("suspendedCta")}
        </Link>
      </div>
    </main>
  );
}
