import { authenticateRequestWithRotation } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import { canUseScanPanel } from "@/lib/roles";
import type { UserRole } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export type ScanAccessUser = {
  id: string;
  role: UserRole;
  isPro: boolean;
};

/**
 * Usuario autenticado con rol SCAN o ADMIN para `/api/scan/*`.
 */
export async function requireScanAccess(requestHeaders: Headers): Promise<
  { ok: true; user: ScanAccessUser } | { ok: false; response: NextResponse }
> {
  const cookieStore = await cookies();
  const { userId } = await authenticateRequestWithRotation(cookieStore, requestHeaders);
  if (!userId) {
    return { ok: false, response: NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isPro: true, isBanned: true, suspendedUntil: true },
  });

  if (!user || !canUseScanPanel(user.role)) {
    return { ok: false, response: NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }) };
  }

  if (user.isBanned) {
    return { ok: false, response: NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }) };
  }

  if (user.suspendedUntil && user.suspendedUntil > new Date()) {
    return { ok: false, response: NextResponse.json({ error: "SUSPENDED" }, { status: 403 }) };
  }

  return { ok: true, user: { id: user.id, role: user.role, isPro: user.isPro } };
}
