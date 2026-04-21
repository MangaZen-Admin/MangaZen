import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth-password";

export type ReauthAction = "SPEND_ZEN" | "CHANGE_EMAIL" | "CHANGE_PASSWORD";

export type ReauthRequiredPayload = {
  error: "REAUTH_REQUIRED";
  reauthType: "password" | "email_code";
  message?: string;
};

export async function requireReauth(
  userId: string,
  action: ReauthAction,
  body: Record<string, unknown>
): Promise<NextResponse | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      requirePasswordForPoints: true,
      requireEmailCodeForPoints: true,
      passwordHash: true,
      email: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (action === "SPEND_ZEN" && user.requirePasswordForPoints) {
    const pwd = typeof body.reauth_password === "string" ? body.reauth_password : "";
    if (!pwd || !user.passwordHash || !verifyPassword(pwd, user.passwordHash)) {
      const payload: ReauthRequiredPayload = {
        error: "REAUTH_REQUIRED",
        reauthType: "password",
      };
      return NextResponse.json(payload, { status: 403 });
    }
    return null;
  }

  if ((action === "CHANGE_EMAIL" || action === "CHANGE_PASSWORD") && user.requireEmailCodeForPoints) {
    const code = typeof body.reauth_code === "string" ? body.reauth_code.trim() : "";
    if (!code) {
      const payload: ReauthRequiredPayload = {
        error: "REAUTH_REQUIRED",
        reauthType: "email_code",
      };
      return NextResponse.json(payload, { status: 403 });
    }
    if (!user.email) {
      const payload: ReauthRequiredPayload = {
        error: "REAUTH_REQUIRED",
        reauthType: "email_code",
        message: "NO_EMAIL",
      };
      return NextResponse.json(payload, { status: 403 });
    }
    const valid = await prisma.verificationToken.findFirst({
      where: {
        identifier: user.email,
        token: code,
        expires: { gt: new Date() },
      },
    });
    if (!valid) {
      const payload: ReauthRequiredPayload = {
        error: "REAUTH_REQUIRED",
        reauthType: "email_code",
      };
      return NextResponse.json(payload, { status: 403 });
    }
    return null;
  }

  return null;
}
