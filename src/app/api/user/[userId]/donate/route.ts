import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authenticateRequestWithRotation, jsonIfUnauthenticated } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import { requireReauth } from "@/lib/require-reauth";
import { InsufficientBalanceError, spendZenCoinsTx, spendZenShardsTx } from "@/lib/zen-currency";

type DonateBody = {
  currency: "coins" | "shards";
  amount: number;
  reauth_password?: string;
  reauth_code?: string;
};

const MIN_DONATION = 10;
const MAX_DONATION = 10000;

export async function POST(
  request: Request,
  ctx: { params: Promise<{ userId: string }> }
) {
  const { userId: recipientId } = await ctx.params;
  const cookieStore = await cookies();
  const auth = await authenticateRequestWithRotation(cookieStore, request.headers);
  const unauth = jsonIfUnauthenticated(auth);
  if (unauth) return unauth;
  const donorId = auth.userId!;

  if (donorId === recipientId) {
    return NextResponse.json({ error: "CANNOT_DONATE_TO_SELF" }, { status: 400 });
  }

  let body: DonateBody;
  try {
    body = (await request.json()) as DonateBody;
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const { currency, amount } = body;

  if (currency !== "coins" && currency !== "shards") {
    return NextResponse.json({ error: "INVALID_CURRENCY" }, { status: 400 });
  }

  if (!Number.isFinite(amount) || amount < MIN_DONATION || amount > MAX_DONATION) {
    return NextResponse.json(
      { error: "INVALID_AMOUNT", min: MIN_DONATION, max: MAX_DONATION },
      { status: 400 }
    );
  }

  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { id: true, role: true, isProfilePublic: true },
  });

  if (!recipient || !["SCAN", "CREATOR", "ADMIN"].includes(recipient.role)) {
    return NextResponse.json({ error: "RECIPIENT_NOT_FOUND" }, { status: 404 });
  }

  // SCANs solo pueden recibir ZS, no ZC
  if (recipient.role === "SCAN" && currency === "coins") {
    return NextResponse.json({ error: "COINS_NOT_ALLOWED_FOR_SCAN" }, { status: 400 });
  }

  const donor = await prisma.user.findUnique({
    where: { id: donorId },
    select: { zenCoins: true, zenShards: true },
  });

  if (!donor) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (currency === "coins" && donor.zenCoins < amount) {
    return NextResponse.json(
      { error: "INSUFFICIENT_COINS", current: donor.zenCoins },
      { status: 400 }
    );
  }

  if (currency === "shards" && donor.zenShards < amount) {
    return NextResponse.json(
      { error: "INSUFFICIENT_SHARDS", current: donor.zenShards },
      { status: 400 }
    );
  }

  const reauthBlock = await requireReauth(donorId, "SPEND_ZEN", body as Record<string, unknown>);
  if (reauthBlock) return reauthBlock;

  try {
    const balances = await prisma.$transaction(async (tx) => {
      // Descontar del donante
      if (currency === "coins") {
        await spendZenCoinsTx(tx, donorId, amount, "COIN_DONATION", `donation:${recipientId}`);
      } else {
        await spendZenShardsTx(tx, donorId, amount, "SHARD_ACTIVITY_READ", `donation:${recipientId}`);
      }

      // Acreditar al receptor
      if (currency === "coins") {
        await tx.user.update({
          where: { id: recipientId },
          data: { zenCoins: { increment: amount } },
        });
        await tx.zenTransaction.create({
          data: {
            userId: recipientId,
            currency: "COINS",
            type: "COIN_DONATION",
            amount,
            balanceAfter: (await tx.user.findUnique({ where: { id: recipientId }, select: { zenCoins: true } }))?.zenCoins ?? 0,
            description: `donation_received:${donorId}`,
          },
        });
      } else {
        await tx.user.update({
          where: { id: recipientId },
          data: { zenShards: { increment: amount } },
        });
        await tx.zenTransaction.create({
          data: {
            userId: recipientId,
            currency: "SHARDS",
            type: "SHARD_ADMIN_GRANT",
            amount,
            balanceAfter: (await tx.user.findUnique({ where: { id: recipientId }, select: { zenShards: true } }))?.zenShards ?? 0,
            description: `donation_received:${donorId}`,
          },
        });
      }

      const row = await tx.user.findUnique({
        where: { id: donorId },
        select: { zenCoins: true, zenShards: true },
      });
      return { zenCoins: row?.zenCoins ?? 0, zenShards: row?.zenShards ?? 0 };
    });

    return NextResponse.json({ ok: true, currency, amount, balances });
  } catch (e) {
    if (e instanceof InsufficientBalanceError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[donate]", e);
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
