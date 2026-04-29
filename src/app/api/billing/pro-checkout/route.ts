import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authenticateRequestWithRotation } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import { PRO_PLANS, createProCheckout, type ProPlanId } from "@/lib/lemon-squeezy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const { userId } = await authenticateRequestWithRotation(cookieStore, request.headers);
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user?.email) return NextResponse.json({ error: "NO_EMAIL" }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const planId = (body as Record<string, unknown>).planId as ProPlanId;
  const plan = PRO_PLANS.find((p) => p.id === planId);
  if (!plan) return NextResponse.json({ error: "INVALID_PLAN" }, { status: 400 });

  const origin = request.headers.get("origin") ?? "http://localhost:3000";
  const successUrl = `${origin}/billing?pro_success=1&plan=${planId}`;
  const cancelUrl = `${origin}/billing?cancelled=1`;

  try {
    const checkout = await createProCheckout({
      variantId: plan.variantId,
      userId,
      userEmail: user.email,
      planId,
      successUrl,
      cancelUrl,
    });

    return NextResponse.json({
      checkoutUrl: checkout?.data?.attributes?.url ?? null,
    });
  } catch (err) {
    console.error("[pro-checkout]", err);
    return NextResponse.json({ error: "CHECKOUT_FAILED" }, { status: 500 });
  }
}
