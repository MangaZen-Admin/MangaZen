import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = ["/admin", "/scan"];

function getLocaleFromPath(pathname: string): string {
  const parts = pathname.split("/");
  return parts[1] ?? "";
}

function isProtectedRoute(pathname: string): boolean {
  const withoutLocale = pathname.replace(/^\/[a-z]{2}-[a-z]{2}/, "");
  return PROTECTED_PREFIXES.some((prefix) => 
    withoutLocale === prefix || withoutLocale.startsWith(`${prefix}/`)
  );
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (!isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  const userId = request.cookies.get("mangazen_user_id")?.value;
  const accessToken = request.cookies.get("mangazen_access_token")?.value;

  if (!userId || !accessToken) {
    const locale = getLocaleFromPath(pathname);
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
