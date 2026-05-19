import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { requireAdminAccess } from "@/lib/admin-access";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const gate = await requireAdminAccess(await headers());
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug")?.trim() ?? "";

  if (!slug) return NextResponse.json({ error: "MISSING_SLUG" }, { status: 400 });

  const manga = await prisma.manga.findUnique({
    where: { slug },
    select: {
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

  return NextResponse.json({ chapters: manga.chapters });
}
