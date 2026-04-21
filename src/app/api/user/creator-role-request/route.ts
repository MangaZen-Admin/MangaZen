import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { authenticateRequestWithRotation } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

/** Última solicitud del usuario (para formulario Comunidad y notificaciones). */
export async function GET() {
  const cookieStore = await cookies();
  const headerList = await headers();
  const { userId } = await authenticateRequestWithRotation(cookieStore, headerList);
  if (!userId) {
    return NextResponse.json({ request: null }, { status: 200 });
  }

  const request = await prisma.creatorRoleRequest.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      projectName: true,
      createdAt: true,
      reviewedAt: true,
    },
  });

  return NextResponse.json({ request });
}
