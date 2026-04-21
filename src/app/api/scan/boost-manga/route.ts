import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireScanAccess } from "@/lib/scan-access";
import { spendZenCoinsTx, spendZenShardsTx, SHARDS_TO_COINS_RATE } from "@/lib/zen-currency";
import type { ZenTransactionType } from "@prisma/client";

export const runtime = "nodejs";

type Days = 1 | 7 | 30;
type Currency = "coins" | "shards";

const PRICE_COINS: Record<Days, number> = {
  1: 500,
  7: 2500,
  30: 8000,
};

function isDays(v: unknown): v is Days {
  return v === 1 || v === 7 || v === 30;
}

function isCurrency(v: unknown): v is Currency {
  return v === "coins" || v === "shards";
}

export async function POST(request: Request) {
  const gate = await requireScanAccess(await headers());
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const b = body as { mangaSlug?: unknown; days?: unknown; currency?: unknown } | null;
  const mangaSlug = typeof b?.mangaSlug === "string" ? b.mangaSlug.trim() : "";
  const days = b?.days;
  const currency = b?.currency;

  if (!mangaSlug || !isDays(days) || !isCurrency(currency)) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const owns = await prisma.chapterUpload.findFirst({
    where: {
      uploaderId: gate.user.id,
      chapter: {
        manga: {
          slug: mangaSlug,
        },
      },
    },
    select: { id: true },
  });
  if (!owns && gate.user.role !== "ADMIN") {
    return NextResponse.json({ error: "NOT_OWNER" }, { status: 403 });
  }

  const priceCoins = PRICE_COINS[days];
  const priceShards = priceCoins * SHARDS_TO_COINS_RATE;

  const now = new Date();
  try {
    const result = await prisma.$transaction(async (tx) => {
      const manga = await tx.manga.findUnique({
        where: { slug: mangaSlug },
        select: { id: true, boostExpiresAt: true },
      });
      if (!manga) {
        return { ok: false as const, response: NextResponse.json({ error: "NOT_FOUND" }, { status: 404 }) };
      }

      const base =
        manga.boostExpiresAt != null && manga.boostExpiresAt.getTime() > now.getTime()
          ? manga.boostExpiresAt
          : now;
      const next = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

      const txType: ZenTransactionType =
        currency === "coins" ? "COIN_BOOST_AD" : "SHARD_BOOST_AD";
      const spendAmount = currency === "coins" ? priceCoins : priceShards;
      const spend =
        currency === "coins"
          ? await spendZenCoinsTx(tx, gate.user.id, spendAmount, txType, `Boost ${days} day(s): ${mangaSlug}`)
          : await spendZenShardsTx(tx, gate.user.id, spendAmount, txType, `Boost ${days} day(s): ${mangaSlug}`);

      const updated = await tx.manga.update({
        where: { id: manga.id },
        data: { boostExpiresAt: next },
        select: { boostExpiresAt: true },
      });

      const user = await tx.user.findUnique({
        where: { id: gate.user.id },
        select: { zenCoins: true, zenShards: true },
      });

      return {
        ok: true as const,
        boostExpiresAt: updated.boostExpiresAt?.toISOString() ?? null,
        balances: {
          zenCoins: user?.zenCoins ?? 0,
          zenShards: user?.zenShards ?? 0,
        },
        spent: {
          currency,
          amount: spendAmount,
          balanceAfter: spend.balanceAfter,
        },
      };
    });

    if (!result.ok) return result.response;
    return NextResponse.json(result);
  } catch (e: unknown) {
    const code = e instanceof Error ? e.message : "";
    if (code === "INSUFFICIENT_COINS" || code === "INSUFFICIENT_SHARDS") {
      return NextResponse.json({ error: code }, { status: 409 });
    }
    return NextResponse.json({ error: "GENERIC" }, { status: 500 });
  }
}

