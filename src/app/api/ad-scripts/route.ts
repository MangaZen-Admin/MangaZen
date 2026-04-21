import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slotId = searchParams.get("slotId");
  if (!slotId) return NextResponse.json({ script: null });
  const ad = await prisma.adScript.findUnique({
    where: { slotId },
    select: { script: true, isActive: true },
  });
  if (!ad || !ad.isActive) return NextResponse.json({ script: null });
  return NextResponse.json({ script: ad.script });
}
