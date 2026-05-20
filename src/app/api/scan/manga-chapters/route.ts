import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { requireScanAccess } from "@/lib/scan-access";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const gate = await requireScanAccess(await headers());
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug")?.trim() ?? "";

  if (!slug) return NextResponse.json({ error: "MISSING_SLUG" }, { status: 400 });

  const manga = await prisma.manga.findUnique({
    where: { slug },
    select: {
      uploaderId: true,
      chapters: {
        orderBy: { number: "asc" },
        select: {
          id: true,
          number: true,
          title: true,
          status: true,
          locale: true,
          titleTranslations: {
            select: { locale: true, title: true },
          },
          pages: {
            orderBy: { pageNumber: "asc" },
            select: {
              id: true,
              pageNumber: true,
              imageUrl: true,
              isSingleInDoublePage: true,
            },
          },
        },
      },
    },
  });

  if (!manga) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  if (manga.uploaderId !== gate.user.id && gate.user.role !== "ADMIN") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  return NextResponse.json({ chapters: manga.chapters });
}
