import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { validatePasswordResetToken } from "@/lib/email-verification";
import { PasswordInput } from "@/components/auth/PasswordInput";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    token?: string;
    error?: string;
    success?: string;
  }>;
};

async function resetPasswordAction(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!token) {
    redirect("/reset-password?error=missing_token");
  }

  if (!password || password.length < 8) {
    redirect(`/reset-password?token=${token}&error=password_too_short`);
  }

  if (password !== confirm) {
    redirect(`/reset-password?token=${token}&error=passwords_mismatch`);
  }

  try {
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "https://mangazen-ar.vercel.app";
    const res = await fetch(`${appUrl}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    if (!res.ok) {
      redirect(`/reset-password?token=${token}&error=invalid_token`);
    }
  } catch {
    redirect(`/reset-password?token=${token}&error=invalid_token`);
  }

  redirect("/login?success=password_reset");
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;
  const t = await getTranslations("resetPassword");
  const token = params.token ?? "";

  // Si no hay token o ya está usado/expirado, mostrar error
  if (!token) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center px-4 py-8">
        <section className="w-full rounded-xl border border-border bg-card p-5 shadow-lg dark:shadow-2xl">
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-foreground">
            {t("errorInvalidToken")}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            <Link href="/forgot-password" className="font-medium text-primary hover:underline">
              {t("requestNewLink")}
            </Link>
          </p>
        </section>
      </main>
    );
  }

  const valid = await validatePasswordResetToken(token);

  if (!valid) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center px-4 py-8">
        <section className="w-full rounded-xl border border-border bg-card p-5 shadow-lg dark:shadow-2xl">
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-foreground">
            {t("errorExpiredToken")}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            <Link href="/forgot-password" className="font-medium text-primary hover:underline">
              {t("requestNewLink")}
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

        {params.error === "password_too_short" && (
          <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-foreground">
            {t("errorPasswordTooShort")}
          </div>
        )}
        {params.error === "passwords_mismatch" && (
          <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-foreground">
            {t("errorPasswordsMismatch")}
          </div>
        )}
        {params.error === "invalid_token" && (
          <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-foreground">
            {t("errorInvalidToken")}
          </div>
        )}

        <form action={resetPasswordAction} className="mt-4 space-y-3">
          <input type="hidden" name="token" value={token} />

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm text-muted-foreground">
              {t("newPasswordLabel")}
            </label>
            <PasswordInput
              id="password"
              name="password"
              minLength={8}
              placeholder={t("newPasswordPlaceholder")}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="confirm" className="text-sm text-muted-foreground">
              {t("confirmPasswordLabel")}
            </label>
            <PasswordInput
              id="confirm"
              name="confirm"
              minLength={8}
              placeholder={t("confirmPasswordPlaceholder")}
            />
          </div>

          <button
            type="submit"
            className="h-10 w-full rounded-lg border border-border bg-primary text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            {t("submitButton")}
          </button>
        </form>
      </section>
    </main>
  );
}
