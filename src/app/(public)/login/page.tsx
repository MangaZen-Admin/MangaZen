import Link from "next/link";
import { cookies, headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth-password";
import { issueLoginSession } from "@/lib/auth-session";
import { PasswordInput } from "@/components/auth/PasswordInput";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    error?: string;
    success?: string;
    reason?: string;
  }>;
};

function normalizeNext(next: string | undefined): string {
  if (!next) return "/";
  if (!next.startsWith("/")) return "/";
  if (next.startsWith("//")) return "/";
  return next;
}

async function loginAction(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = normalizeNext(String(formData.get("next") ?? "/"));

  if (!email || !password) {
    redirect(`/login?error=missing_credentials&next=${encodeURIComponent(next)}`);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  const passwordRows = await prisma.$queryRaw<{ id: string; passwordHash: string | null }[]>`
    SELECT id, passwordHash
    FROM "User"
    WHERE email = ${email}
    LIMIT 1
  `;
  const passwordRow = passwordRows[0] ?? null;

  if (!user || !passwordRow?.passwordHash || !verifyPassword(password, passwordRow.passwordHash)) {
    redirect(`/login?error=user_not_found&next=${encodeURIComponent(next)}`);
  }

  const cookieStore = await cookies();
  const headerList = await headers();
  await issueLoginSession(user.id, cookieStore, headerList);

  redirect(next);
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = normalizeNext(params.next);
  const error = params.error;
  const success = params.success;
  const reason = params.reason;
  const tSec = await getTranslations("security");
  const tAuth = await getTranslations("auth");
  const tProfile = await getTranslations("profile");

  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center px-4 py-8">
      <section className="w-full rounded-xl border border-border bg-card p-5 shadow-lg dark:shadow-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">{tAuth("loginTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{tAuth("loginSubtitle")}</p>

        {reason === "ip_change" && (
          <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-foreground">
            {tSec("loginReasonIpChange")}
          </div>
        )}
        {reason === "all_sessions_revoked" && (
          <div className="mt-3 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-foreground">
            {tSec("loginReasonAllSessionsRevoked")}
          </div>
        )}
        {error && (
          <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-foreground">
            {error === "missing_email" && tAuth("errorMissingEmail")}
            {error === "missing_credentials" && tAuth("errorMissingCredentials")}
            {error === "user_not_found" && tAuth("errorUserNotFound")}
            {error === "user_exists" && tAuth("errorUserExists")}
          </div>
        )}
        {success === "registered" && (
          <div className="mt-3 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-foreground">
            {tAuth("successRegistered")}
          </div>
        )}

        <form action={loginAction} className="mt-4 space-y-3">
          <input type="hidden" name="next" value={next} />

          <div className="space-y-1">
            <label htmlFor="email" className="text-sm text-muted-foreground">
              {tProfile("email")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder={tAuth("placeholderEmail")}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/25"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm text-muted-foreground">
              {tAuth("passwordLabel")}
            </label>
            <PasswordInput id="password" name="password" placeholder={tAuth("placeholderPassword")} />
          </div>

          <button
            type="submit"
            className="h-10 w-full rounded-lg border border-border bg-primary text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            {tAuth("continue")}
          </button>
        </form>

        <p className="mt-4 text-sm text-muted-foreground">
          {tAuth("loginFooterPrompt")}{" "}
          <Link
            href={`/register?next=${encodeURIComponent(next)}`}
            className="font-medium text-primary hover:underline"
          >
            {tProfile("register")}
          </Link>
        </p>
      </section>
    </main>
  );
}
