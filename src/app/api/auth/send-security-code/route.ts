import { NextRequest, NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { authenticateRequestWithRotation } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import { createSecurityCode } from "@/lib/email-verification";
import { sendSecurityCodeEmail } from "@/lib/email";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 3;
const attempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const cookieStore = await cookies();
  const headerList = await headers();
  const auth = await authenticateRequestWithRotation(cookieStore, headerList);

  if (!auth.userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  if (!checkRateLimit(auth.userId)) {
    return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, { status: 429 });
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { email: true, requireEmailCodeForPoints: true },
  });

  if (!user?.email) {
    return NextResponse.json({ error: "NO_EMAIL" }, { status: 400 });
  }

  if (!user.requireEmailCodeForPoints) {
    return NextResponse.json({ error: "NOT_REQUIRED" }, { status: 400 });
  }

  let locale = "es-ar";
  try {
    const body = await req.json();
    if (typeof body?.locale === "string") locale = body.locale;
  } catch {
    // usar locale por defecto
  }

  const code = await createSecurityCode(auth.userId, user.email);

  try {
    await sendSecurityCodeEmail({ to: user.email, code, locale });
  } catch (err) {
    console.error("[send-security-code] Error enviando email:", err);
    return NextResponse.json({ error: "EMAIL_SEND_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
