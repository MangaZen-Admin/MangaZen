import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authenticateRequestWithRotation } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

type RouteParams = { params: Promise<{ slug: string }> };

export async function PATCH(request: Request, context: RouteParams) {
  const { slug } = await context.params;
  const cookieStore = await cookies();
  const { userId: adminId } = await authenticateRequestWithRotation(cookieStore, request.headers);
  if (!adminId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const admin = await prisma.user.findUnique({
    where: { id: adminId },
    select: { role: true },
  });
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const manga = await prisma.manga.findUnique({
    where: { slug },
    select: { id: true, isFeatured: true, reviewStatus: true },
  });
  if (!manga) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (manga.reviewStatus !== "APPROVED") {
    return NextResponse.json({ error: "MANGA_NOT_APPROVED" }, { status: 400 });
  }

  const updated = await prisma.manga.update({
    where: { id: manga.id },
    data: { isFeatured: !manga.isFeatured },
    select: { slug: true, isFeatured: true },
  });

  return NextResponse.json({ ok: true, manga: updated });
}
