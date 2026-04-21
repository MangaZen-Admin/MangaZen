import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { awardBadgeIfEarned } from "@/lib/badges/award-badge";
import { authenticateRequestWithRotation, jsonIfUnauthenticated } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import { isEarlyAccessWindowActive, resolveEarlyAccessPrice } from "@/lib/chapter-access";
import { requireReauth } from "@/lib/require-reauth";
import {
  InsufficientBalanceError,
  SHARDS_TO_COINS_RATE,
  spendZenCoinsTx,
  spendZenShardsTx,
} from "@/lib/zen-currency";

type UnlockBody = {
  reauth_password?: string;
  reauth_code?: string;
  currency?: "coins" | "shards";
};

export async function POST(request: Request, ctx: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await ctx.params;
  const cookieStore = await cookies();
  const auth = await authenticateRequestWithRotation(cookieStore, request.headers);
  const unauth = jsonIfUnauthenticated(auth);
  if (unauth) return unauth;
  const userId = auth.userId!;

  let body: UnlockBody = {};
  try {
    body = (await request.json()) as UnlockBody;
  } catch {
    body = {};
  }

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: {
      id: true,
      status: true,
      isEarlyAccess: true,
      earlyAccessUntil: true,
      earlyAccessPrice: true,
      manga: {
        select: {
          uploader: {
            select: { role: true },
          },
        },
      },
    },
  });

  if (!chapter || chapter.status !== "APPROVED") {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (!isEarlyAccessWindowActive(chapter)) {
    return NextResponse.json({ error: "NOT_EARLY_ACCESS" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPro: true, zenCoins: true, zenShards: true },
  });
  if (!user) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (user.isPro) {
    return NextResponse.json({ error: "PRO_NO_UNLOCK_NEEDED" }, { status: 400 });
  }

  const existing = await prisma.chapterUnlock.findUnique({
    where: { userId_chapterId: { userId, chapterId } },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "ALREADY_UNLOCKED" }, { status: 409 });
  }

  const price = resolveEarlyAccessPrice(chapter);
  const chosenCurrency = body.currency === "shards" ? "shards" : "coins";
  const isCreatorEarlyAccess = chapter.manga.uploader.role === "CREATOR";

  if (chosenCurrency === "shards" && isCreatorEarlyAccess) {
    return NextResponse.json({ error: "SHARDS_NOT_ALLOWED_FOR_CREATOR" }, { status: 400 });
  }

  const requiredAmount = chosenCurrency === "coins" ? price : price * SHARDS_TO_COINS_RATE;
  if (chosenCurrency === "coins" && user.zenCoins < requiredAmount) {
    return NextResponse.json(
      { error: "INSUFFICIENT_COINS", required: requiredAmount, current: user.zenCoins },
      { status: 400 },
    );
  }
  if (chosenCurrency === "shards" && user.zenShards < requiredAmount) {
    return NextResponse.json(
      { error: "INSUFFICIENT_SHARDS", required: requiredAmount, current: user.zenShards },
      { status: 400 },
    );
  }

  const reauthBlock = await requireReauth(userId, "SPEND_ZEN", body as Record<string, unknown>);
  if (reauthBlock) return reauthBlock;

  try {
    const balances = await prisma.$transaction(async (tx) => {
      if (chosenCurrency === "coins") {
        await spendZenCoinsTx(
          tx,
          userId,
          requiredAmount,
          "COIN_UNLOCK_CHAPTER",
          `early_access_unlock:${chapterId}`,
        );
      } else {
        await spendZenShardsTx(
          tx,
          userId,
          requiredAmount,
          "SHARD_UNLOCK_CHAPTER",
          `early_access_unlock:${chapterId}`,
        );
      }
      await tx.chapterUnlock.create({
        data: { userId, chapterId },
      });
      const row = await tx.user.findUnique({
        where: { id: userId },
        select: { zenCoins: true, zenShards: true },
      });
      return { zenCoins: row?.zenCoins ?? 0, zenShards: row?.zenShards ?? 0 };
    });

    const badgesEarned = await awardBadgeIfEarned(userId, "ZEN_POINTS_UPDATED", {
      zenCoins: balances.zenCoins,
    });

    return NextResponse.json({
      ok: true,
      spentCurrency: chosenCurrency,
      spentAmount: requiredAmount,
      balances,
      badgesEarned,
    });
  } catch (e) {
    if (e instanceof InsufficientBalanceError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[unlock]", e);
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
