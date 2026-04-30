import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authenticateRequestWithRotation } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import {
  ZEN_PACKAGES,
  getVariantId,
  createZenCheckout,
  type ZenPackageId,
} from "@/lib/lemon-squeezy";

export const runtime = "nodejs";

type AttemptRecord = { timestamps: number[] };
const _checkoutAttempts = new Map<string, AttemptRecord>();
function getCheckoutAttempts() {
  return _checkoutAttempts;
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const { userId } = await authenticateRequestWithRotation(
    cookieStore,
    request.headers
  );
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const checkoutAttempts = getCheckoutAttempts();
  const key = `checkout:${ip}`;
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const maxAttempts = 10;

  const record = checkoutAttempts.get(key);
  if (record) {
    record.timestamps = record.timestamps.filter((t) => now - t < windowMs);
    if (record.timestamps.length >= maxAttempts) {
      return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
    }
    record.timestamps.push(now);
  } else {
    checkoutAttempts.set(key, { timestamps: [now] });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user?.email) {
    return NextResponse.json({ error: "NO_EMAIL" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const packageId = (body as Record<string, unknown>).packageId as string;
  const pkg = ZEN_PACKAGES.find((p) => p.id === packageId);
  if (!pkg) {
    return NextResponse.json({ error: "INVALID_PACKAGE" }, { status: 400 });
  }

  const variantId = getVariantId(pkg);
  if (!variantId || variantId === "your_variant_id_here") {
    return NextResponse.json(
      { error: "PAYMENT_NOT_CONFIGURED" },
      { status: 503 }
    );
  }

  const origin = request.headers.get("origin") ?? "http://localhost:3000";
  const successUrl = `${origin}/billing?success=1&package=${pkg.id}`;
  const cancelUrl = `${origin}/billing?cancelled=1`;

  try {
    const checkout = await createZenCheckout({
      variantId,
      userId,
      userEmail: user.email,
      packageId: pkg.id as ZenPackageId,
      successUrl,
      cancelUrl,
    });

    return NextResponse.json({
      checkoutUrl: checkout?.data?.attributes?.url ?? null,
    });
  } catch (err) {
    console.error("[billing/checkout]", err);
    return NextResponse.json({ error: "CHECKOUT_FAILED" }, { status: 500 });
  }
}
