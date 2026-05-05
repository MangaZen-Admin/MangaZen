import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireScanAccess } from "@/lib/scan-access";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireScanAccess(request.headers);
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug") ?? "";
  if (!slug) return NextResponse.json({ error: "SLUG_REQUIRED" }, { status: 400 });

  const manga = await prisma.manga.findUnique({
    where: { slug },
    select: {
      title: true,
      description: true,
      author: true,
      artist: true,
      publisher: true,
      country: true,
      releaseYear: true,
      uploaderId: true,
      alternativeTitles: {
        select: { locale: true, title: true },
      },
      tags: {
        select: {
          tag: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!manga || (gate.user.role !== "ADMIN" && manga.uploaderId !== gate.user.id)) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const { tags: mangaTags, ...mangaRest } = manga;
  return NextResponse.json({
    ...mangaRest,
    tags: mangaTags.map((t) => ({ id: t.tag.id, name: t.tag.name })),
  });
}

