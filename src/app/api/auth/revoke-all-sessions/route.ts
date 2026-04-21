import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  authenticateRequestWithRotation,
  clearAuthCookies,
  jsonIfUnauthenticated,
} from "@/lib/auth-session";
import { localeFromRequestReferer } from "@/lib/locale-from-request";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const auth = await authenticateRequestWithRotation(cookieStore, request.headers);
  const unauth = jsonIfUnauthenticated(auth);
  if (unauth) return unauth;

  await prisma.session.deleteMany({ where: { userId: auth.userId! } });
  clearAuthCookies(cookieStore);

  const locale = localeFromRequestReferer(request);
  return NextResponse.redirect(new URL(`/${locale}/login?reason=all_sessions_revoked`, request.url));
}
