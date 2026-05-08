import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createPasswordResetToken } from "@/lib/email-verification";
import { sendPasswordResetEmail } from "@/lib/email";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 3;
const ipAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    ipAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "TOO_MANY_REQUESTS" },
      { status: 429 }
    );
  }

  let email: string;
  try {
    const body = await req.json();
    email = (body?.email ?? "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 });
  }

  // Respuesta genérica siempre — no revelar si el email existe
  const genericOk = NextResponse.json({ ok: true });

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (!user || !user.email) return genericOk;

  const locale = "es-ar";
  const token = await createPasswordResetToken(user.id, user.email);
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://mangazen-ar.vercel.app";
  const resetUrl = `${appUrl}/${locale}/reset-password?token=${token}`;

  try {
    await sendPasswordResetEmail({ to: user.email, resetUrl, locale });
  } catch (err) {
    console.error("[forgot-password] Error enviando email:", err);
  }

  return genericOk;
}
