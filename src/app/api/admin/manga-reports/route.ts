import { NextResponse } from "next/server";
import { requireAdminJson } from "@/lib/admin-api-auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireAdminJson(request);
  if (!gate.ok) return gate.response;

  const reports = await prisma.mangaReport.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      mangaId: true,
      reason: true,
      details: true,
      createdAt: true,
      manga: { select: { title: true, slug: true } },
      user: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({
    reports: reports.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
