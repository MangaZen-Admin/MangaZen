import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { requireScanAccess } from "@/lib/scan-access";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const gate = await requireScanAccess(await headers());
  if (!gate.ok) return gate.response;

  const user = await prisma.user.findUnique({
    where: { id: gate.user.id },
    select: { startsWithSinglePageDefault: true },
  });

  return NextResponse.json({ startsWithSinglePageDefault: user?.startsWithSinglePageDefault ?? false });
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const gate = await requireScanAccess(request.headers);
  if (!gate.ok) return gate.response;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const { startsWithSinglePageDefault } = body as { startsWithSinglePageDefault?: boolean };
  if (typeof startsWithSinglePageDefault !== "boolean") {
    return NextResponse.json({ error: "INVALID_VALUE" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: gate.user.id },
    data: { startsWithSinglePageDefault },
  });

  return NextResponse.json({ ok: true, startsWithSinglePageDefault });
}
