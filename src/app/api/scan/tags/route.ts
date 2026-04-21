import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireScanAccess } from "@/lib/scan-access";

export async function GET() {
  const gate = await requireScanAccess(await headers());
  if (!gate.ok) return gate.response;

  const tags = await prisma.tag.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: { id: true, name: true, category: true },
  });

  return NextResponse.json({ tags });
}
