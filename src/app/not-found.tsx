import Link from "next/link";
import { BookX } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <main className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center px-4 text-center">
      <div className="relative mb-6">
        <BookX className="h-24 w-24 text-primary/20" />
        <span className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-primary">
          404
        </span>
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {t("title")}
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        {t("body")}
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          {t("backHome")}
        </Link>
        <Link
          href="/library"
          className="rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition hover:border-primary/40 hover:bg-primary/5"
        >
          {t("viewLibrary")}
        </Link>
      </div>
    </main>
  );
}
