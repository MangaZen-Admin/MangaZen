import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const BYPASS_PATTERNS = [
  /^\/_next/,
  /^\/api\/auth/,
  /^\/api\/webhooks/,
  /^\/favicon/,
  /\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|css|js)$/,
];

const ALLOWED_BANNED_PATHS = ["/login", "/register", "/banned", "/suspended"];

const LOCALE_PATTERN = /^\/(es-ar|es-es|en-us|en-gb|pt-br|ja-jp|ko-kr|zh-cn)/;

const PROTECTED_PREFIXES = ["/admin", "/scan"];

function isProtectedRoute(pathWithoutLocale: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) =>
      pathWithoutLocale === prefix ||
      pathWithoutLocale.startsWith(`${prefix}/`)
  );
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (BYPASS_PATTERNS.some((p) => p.test(pathname))) {
    return intlMiddleware(request);
  }

  const locale = pathname.match(LOCALE_PATTERN)?.[1] ?? "es-ar";
  const pathWithoutLocale = pathname.replace(LOCALE_PATTERN, "") || "/";

  // Protección de rutas admin y scan — verificar cookies antes de llegar al componente
  if (isProtectedRoute(pathWithoutLocale)) {
    const userId = request.cookies.get("mangazen_user_id")?.value;
    const accessToken = request.cookies.get("mangazen_access_token")?.value;
    if (!userId || !accessToken) {
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  const sessionToken =
    request.cookies.get("session_token")?.value ??
    request.cookies.get("accessToken")?.value ??
    null;

  if (sessionToken) {
    const cachedStatus = request.cookies.get("_mod_status")?.value;

    let isBanned = false;
    let suspendedUntil: string | null = null;
    let needsFetch = true;

    if (cachedStatus) {
      try {
        const parsed = JSON.parse(cachedStatus) as {
          b: boolean;
          s: string | null;
          exp: number;
        };
        if (parsed.exp > Date.now()) {
          isBanned = parsed.b;
          suspendedUntil = parsed.s;
          needsFetch = false;
        }
      } catch {
        // cache inválido, refetch
      }
    }

    if (needsFetch) {
      try {
        const statusUrl = new URL("/api/user/moderation-status", request.url);
        const statusRes = await fetch(statusUrl, {
          headers: { cookie: request.headers.get("cookie") ?? "" },
        });
        if (statusRes.ok) {
          const data = (await statusRes.json()) as {
            isBanned?: boolean;
            suspendedUntil?: string | null;
          };
          isBanned = data.isBanned ?? false;
          suspendedUntil = data.suspendedUntil ?? null;
        }
      } catch {
        // fail open
      }
    }

    const isAllowed = ALLOWED_BANNED_PATHS.some(
      (p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(p + "/")
    );

    if (!isAllowed) {
      if (isBanned) {
        return NextResponse.redirect(new URL(`/${locale}/banned`, request.url));
      }

      if (suspendedUntil && new Date(suspendedUntil) > new Date()) {
        return NextResponse.redirect(new URL(`/${locale}/suspended`, request.url));
      }
    }

    if (needsFetch) {
      const response = intlMiddleware(request);
      const cacheValue = JSON.stringify({
        b: isBanned,
        s: suspendedUntil,
        exp: Date.now() + 5 * 60 * 1000,
      });
      if (response instanceof Response) {
        response.headers.append(
          "Set-Cookie",
          `_mod_status=${encodeURIComponent(cacheValue)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=300`
        );
      }
      return response;
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
