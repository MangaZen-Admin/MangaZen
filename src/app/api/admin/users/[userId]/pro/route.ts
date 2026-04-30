import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authenticateRequestWithRotation } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

async function requireAdminFromRequest(request: Request) {
  const cookieStore = await cookies();
  const { userId: adminId } = await authenticateRequestWithRotation(cookieStore, request.headers);
  if (!adminId) return { error: NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }) };
  const admin = await prisma.user.findUnique({
    where: { id: adminId },
    select: { role: true },
  });
  if (!admin || admin.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }) };
  }
  return { adminId };
}

// GET — obtener estado Pro actual del usuario
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const gate = await requireAdminFromRequest(request);
  if ("error" in gate) return gate.error;

  const { userId } = await params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, username: true, isPro: true, proExpiresAt: true },
  });
  if (!user) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(user);
}

// PATCH — activar/desactivar Pro
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const gate = await requireAdminFromRequest(request);
  if ("error" in gate) return gate.error;

  const { userId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const { isPro, proExpiresAt } = body as { isPro: boolean; proExpiresAt?: string | null };
  if (typeof isPro !== "boolean") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      isPro,
      proExpiresAt: isPro ? (proExpiresAt ? new Date(proExpiresAt) : null) : null,
    },
    select: { id: true, isPro: true, proExpiresAt: true },
  });

  return NextResponse.json(updated);
}
