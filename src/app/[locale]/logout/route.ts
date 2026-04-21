import { hasLocale } from "next-intl";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { revokeRefreshSession } from "@/lib/auth-session";
import { routing } from "@/i18n/routing";

const secure = process.env.NODE_ENV === "production";

/** Mismas opciones que al crear la cookie, para que el navegador la borre de verdad. */
function expireAuthCookie(response: NextResponse, name: string) {
  response.cookies.set(name, "", {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

type RouteContext = { params: Promise<{ locale: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { locale: rawLocale } = await context.params;
  const locale = hasLocale(routing.locales, rawLocale) ? rawLocale : routing.defaultLocale;

  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("mangazen_refresh_token")?.value;
  const userId = cookieStore.get("mangazen_user_id")?.value ?? null;

  if (userId) {
    await prisma.session.deleteMany({ where: { userId } });
  } else {
    await revokeRefreshSession(refreshToken);
  }

  const home = new URL(`/${locale}`, request.url);
  const response = NextResponse.redirect(home, 303);

  expireAuthCookie(response, "mangazen_user_id");
  expireAuthCookie(response, "mangazen_access_token");
  expireAuthCookie(response, "mangazen_refresh_token");

  return response;
}
