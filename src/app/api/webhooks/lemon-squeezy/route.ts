import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { ZEN_PACKAGES } from "@/lib/lemon-squeezy";

export const runtime = "nodejs";

function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(hmac);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] LEMON_SQUEEZY_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 500 });
  }

  const signature = request.headers.get("x-signature") ?? "";
  const rawBody = await request.text();

  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    console.warn("[webhook] Invalid signature");
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const event = payload as {
    meta?: {
      event_name?: string;
      custom_data?: {
        user_id?: string;
        package_id?: string;
      };
    };
    data?: {
      id?: string;
      attributes?: {
        status?: string;
        identifier?: string;
      };
    };
  };

  const eventName = event.meta?.event_name;

  if (eventName !== "order_created") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const status = event.data?.attributes?.status;
  if (status !== "paid") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const userId = event.meta?.custom_data?.user_id;
  const packageId = event.meta?.custom_data?.package_id;
  const orderId = event.data?.id ?? event.data?.attributes?.identifier ?? "";

  if (!userId || !packageId) {
    console.error("[webhook] Missing custom_data", { userId, packageId });
    return NextResponse.json({ error: "MISSING_CUSTOM_DATA" }, { status: 400 });
  }

  const pkg = ZEN_PACKAGES.find((p) => p.id === packageId);
  if (!pkg) {
    console.error("[webhook] Unknown package", packageId);
    return NextResponse.json({ error: "UNKNOWN_PACKAGE" }, { status: 400 });
  }

  const existing = await prisma.zenTransaction.findFirst({
    where: {
      paymentProvider: "LEMON_SQUEEZY",
      paymentId: orderId,
    },
    select: { id: true },
  });

  if (existing) {
    console.log("[webhook] Order already processed", orderId);
    return NextResponse.json({ ok: true, duplicate: true });
  }

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: { zenCoins: { increment: pkg.zenCoins } },
      select: { zenCoins: true },
    });

    await tx.zenTransaction.create({
      data: {
        userId,
        currency: "COINS",
        type: "COIN_PURCHASE",
        amount: pkg.zenCoins,
        balanceAfter: user.zenCoins,
        description: `Compra paquete ${pkg.id} (${pkg.zenCoins} ZC)`,
        paymentProvider: "LEMON_SQUEEZY",
        paymentId: orderId,
      },
    });
  });

  console.log(`[webhook] Acreditados ${pkg.zenCoins} ZC a usuario ${userId}`);
  return NextResponse.json({ ok: true });
}
