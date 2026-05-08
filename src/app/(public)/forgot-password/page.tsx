import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

type ForgotPasswordPageProps = {
  searchParams: Promise<{
    sent?: string;
    error?: string;
  }>;
};

async function forgotPasswordAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    redirect("/forgot-password?error=invalid_email");
  }

  try {
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "https://mangazen-ar.vercel.app";
    await fetch(`${appUrl}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  } catch {
    // Silenciar errores — respuesta siempre genérica
  }

  redirect("/forgot-password?sent=1");
}

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const params = await searchParams;
  const t = await getTranslations("forgotPassword");

  if (params.sent) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center px-4 py-8">
        <section className="w-full rounded-xl border border-border bg-card p-5 shadow-lg dark:shadow-2xl">
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <div className="mt-4 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-foreground">
            {t("sentMessage")}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-primary hover:underline">
              {t("backToLogin")}
            </Link>
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center px-4 py-8">
      <section className="w-full rounded-xl border border-border bg-card p-5 shadow-lg dark:shadow-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>

        {params.error === "invalid_email" && (
          <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-foreground">
            {t("errorInvalidEmail")}
          </div>
        )}

        <form action={forgotPasswordAction} className="mt-4 space-y-3">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm text-muted-foreground">
              {t("emailLabel")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder={t("emailPlaceholder")}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/25"
            />
          </div>

          <button
            type="submit"
            className="h-10 w-full rounded-lg border border-border bg-primary text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            {t("submitButton")}
          </button>
        </form>

        <p className="mt-4 text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-primary hover:underline">
            {t("backToLogin")}
          </Link>
        </p>
      </section>
    </main>
  );
}
