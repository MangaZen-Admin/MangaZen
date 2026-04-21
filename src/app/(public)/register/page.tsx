import Link from "next/link";
import { cookies, headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth-password";
import { issueLoginSession } from "@/lib/auth-session";
import { PasswordInput } from "@/components/auth/PasswordInput";

type RegisterPageProps = {
  searchParams: Promise<{
    next?: string;
    error?: string;
  }>;
};

function normalizeNext(next: string | undefined): string {
  if (!next) return "/";
  if (!next.startsWith("/")) return "/";
  if (next.startsWith("//")) return "/";
  return next;
}

async function registerAction(formData: FormData) {
  "use server";

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const image = String(formData.get("image") ?? "").trim();
  const next = normalizeNext(String(formData.get("next") ?? "/"));

  if (!name || !email || password.length < 6) {
    redirect(`/register?error=invalid_data&next=${encodeURIComponent(next)}`);
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    redirect(`/login?error=user_exists&next=${encodeURIComponent(next)}`);
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      image:
        image ||
        `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(name)}`,
    },
    select: { id: true },
  });
  await prisma.$executeRaw`
    UPDATE "User"
    SET "passwordHash" = ${hashPassword(password)}
    WHERE id = ${user.id}
  `;

  const cookieStore = await cookies();
  const headerList = await headers();
  await issueLoginSession(user.id, cookieStore, headerList);

  redirect(next);
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const next = normalizeNext(params.next);
  const error = params.error;
  const tAuth = await getTranslations("auth");
  const tProfile = await getTranslations("profile");

  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center px-4 py-8">
      <section className="w-full rounded-xl border border-border bg-card p-5 shadow-lg dark:shadow-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">{tAuth("registerTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{tAuth("registerSubtitle")}</p>

        {error === "invalid_data" && (
          <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-foreground">
            {tAuth("errorInvalidRegisterData")}
          </div>
        )}

        <form action={registerAction} className="mt-4 space-y-3">
          <input type="hidden" name="next" value={next} />

          <div className="space-y-1">
            <label htmlFor="name" className="text-sm text-muted-foreground">
              {tAuth("nameLabel")}
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder={tAuth("placeholderYourName")}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/25"
            />
          </div>

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
            <PasswordInput
              id="password"
              name="password"
              minLength={6}
              placeholder={tAuth("placeholderPasswordMin6")}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="image" className="text-sm text-muted-foreground">
              {tAuth("imageLabelOptional")}
            </label>
            <input
              id="image"
              name="image"
              type="url"
              placeholder={tAuth("placeholderImageUrl")}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/25"
            />
          </div>

          <button
            type="submit"
            className="h-10 w-full rounded-lg border border-border bg-primary text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            {tProfile("register")}
          </button>
        </form>

        <p className="mt-4 text-sm text-muted-foreground">
          {tAuth("registerFooterPrompt")}{" "}
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="font-medium text-primary hover:underline"
          >
            {tProfile("login")}
          </Link>
        </p>
      </section>
    </main>
  );
}
