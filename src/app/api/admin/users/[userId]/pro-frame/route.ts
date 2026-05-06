import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminJson } from "@/lib/admin-api-auth";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const gate = await requireAdminJson(request);
  if (!gate.ok) return gate.response;

  const { userId } = await params;
  const body = (await request.json()) as { proPlan: string | null };
  const { proPlan } = body;

  const validPlans = ["bronze", "silver", "gold", "platinum", null];
  if (!validPlans.includes(proPlan)) {
    return NextResponse.json({ error: "INVALID_PLAN" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      proPlan,
      isPro: proPlan !== null,
    },
    select: { id: true, proPlan: true, isPro: true },
  });

  return NextResponse.json({ user: updated });
}
