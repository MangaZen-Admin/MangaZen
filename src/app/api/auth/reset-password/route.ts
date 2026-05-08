import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { consumePasswordResetToken, validatePasswordResetToken } from "@/lib/email-verification";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let token: string;
  let password: string;

  try {
    const body = await req.json();
    token = (body?.token ?? "").trim();
    password = body?.password ?? "";
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json({ error: "MISSING_TOKEN" }, { status: 400 });
  }

  if (!password || password.length < 8) {
    return NextResponse.json({ error: "PASSWORD_TOO_SHORT" }, { status: 400 });
  }

  const result = await validatePasswordResetToken(token);
  if (result) await consumePasswordResetToken(token);
  if (!result) {
    return NextResponse.json(
      { error: "INVALID_OR_EXPIRED_TOKEN" },
      { status: 400 }
    );
  }

  const passwordHash = await hash(password, 12);

  await prisma.user.update({
    where: { id: result.userId },
    data: { passwordHash },
  });

  // Revocar todas las sesiones activas del usuario por seguridad
  await prisma.session.deleteMany({
    where: { userId: result.userId },
  });

  return NextResponse.json({ ok: true });
}
