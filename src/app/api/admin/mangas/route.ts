import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { requireAdminAccess } from "@/lib/admin-access";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireAdminAccess(await headers());
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const mangas = await prisma.manga.findMany({
    where: q.length > 0 ? {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { author: { contains: q, mode: "insensitive" } },
      ],
    } : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      slug: true,
      title: true,
      coverImage: true,
      status: true,
      type: true,
      author: true,
      artist: true,
      publisher: true,
      country: true,
      releaseYear: true,
      reviewStatus: true,
      description: true,
      descriptions: {
        select: { locale: true, description: true },
      },
      alternativeTitles: {
        select: { locale: true, title: true },
      },
      tags: {
        select: { tag: { select: { name: true } } },
      },
    },
  });

  return NextResponse.json({ mangas });
}
