import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminJson } from "@/lib/admin-api-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireAdminJson(request);
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ chapters: [] });

  const chapters = await prisma.chapter.findMany({
    where: {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { manga: { title: { contains: q, mode: "insensitive" } } },
      ],
    },
    take: 20,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      number: true,
      title: true,
      status: true,
      isEarlyAccess: true,
      earlyAccessUntil: true,
      earlyAccessPrice: true,
      manga: { select: { title: true, slug: true } },
    },
  });

  return NextResponse.json({
    chapters: chapters.map((c) => ({
      ...c,
      earlyAccessUntil: c.earlyAccessUntil?.toISOString() ?? null,
    })),
  });
}
