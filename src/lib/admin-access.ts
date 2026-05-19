import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authenticateRequestWithRotation, jsonIfUnauthenticated } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

export async function requireAdminAccess(headerList: Headers) {
  const cookieStore = await cookies();
  const auth = await authenticateRequestWithRotation(cookieStore, headerList);
  const unauth = jsonIfUnauthenticated(auth);
  if (unauth) return { ok: false as const, response: unauth };

  const admin = await prisma.user.findUnique({
    where: { id: auth.userId! },
    select: { role: true },
  });
  if (!admin || admin.role !== "ADMIN") {
    return { ok: false as const, response: NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }) };
  }

  return { ok: true as const, userId: auth.userId! };
}
