import type { Prisma, ZenTransactionType } from "@prisma/client";
import { prisma } from "@/lib/db";

export const SHARDS_TO_COINS_RATE = 100;

export class InsufficientBalanceError extends Error {
  constructor(public readonly currency: "coins" | "shards") {
    super(currency === "coins" ? "INSUFFICIENT_COINS" : "INSUFFICIENT_SHARDS");
    this.name = "InsufficientBalanceError";
  }
}

type TxClient = Prisma.TransactionClient;

function utcDayStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

async function awardZenCoinsTx(
  tx: TxClient,
  userId: string,
  amount: number,
  type: ZenTransactionType,
  description?: string,
  paymentId?: string,
) {
  if (amount <= 0) throw new Error("INVALID_AMOUNT");

  const user = await tx.user.update({
    where: { id: userId },
    data: { zenCoins: { increment: amount } },
    select: { zenCoins: true },
  });

  const created = await tx.zenTransaction.create({
    data: {
      userId,
      currency: "COINS",
      type,
      amount,
      balanceAfter: user.zenCoins,
      description,
      ...(paymentId ? { paymentId } : {}),
    },
  });

  return { balanceAfter: user.zenCoins, transaction: created };
}

async function awardZenShardsTx(
  tx: TxClient,
  userId: string,
  amount: number,
  type: ZenTransactionType,
  description?: string,
) {
  if (amount <= 0) throw new Error("INVALID_AMOUNT");

  const user = await tx.user.update({
    where: { id: userId },
    data: { zenShards: { increment: amount } },
    select: { zenShards: true },
  });

  const created = await tx.zenTransaction.create({
    data: {
      userId,
      currency: "SHARDS",
      type,
      amount,
      balanceAfter: user.zenShards,
      description,
    },
  });

  return { balanceAfter: user.zenShards, transaction: created };
}

export async function spendZenCoinsTx(
  tx: TxClient,
  userId: string,
  amount: number,
  type: ZenTransactionType,
  description?: string,
) {
  if (amount <= 0) throw new Error("INVALID_AMOUNT");

  const updated = await tx.user.updateMany({
    where: { id: userId, zenCoins: { gte: amount } },
    data: { zenCoins: { decrement: amount } },
  });
  if (updated.count !== 1) throw new InsufficientBalanceError("coins");

  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { zenCoins: true },
  });
  const balanceAfter = user?.zenCoins ?? 0;

  const created = await tx.zenTransaction.create({
    data: {
      userId,
      currency: "COINS",
      type,
      amount: -amount,
      balanceAfter,
      description,
    },
  });

  return { balanceAfter, transaction: created };
}

export async function spendZenShardsTx(
  tx: TxClient,
  userId: string,
  amount: number,
  type: ZenTransactionType,
  description?: string,
) {
  if (amount <= 0) throw new Error("INVALID_AMOUNT");

  const updated = await tx.user.updateMany({
    where: { id: userId, zenShards: { gte: amount } },
    data: { zenShards: { decrement: amount } },
  });
  if (updated.count !== 1) throw new InsufficientBalanceError("shards");

  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { zenShards: true },
  });
  const balanceAfter = user?.zenShards ?? 0;

  const created = await tx.zenTransaction.create({
    data: {
      userId,
      currency: "SHARDS",
      type,
      amount: -amount,
      balanceAfter,
      description,
    },
  });

  return { balanceAfter, transaction: created };
}

export async function awardZenCoins(
  userId: string,
  amount: number,
  type: ZenTransactionType,
  description?: string,
  paymentId?: string,
) {
  return prisma.$transaction((tx) => awardZenCoinsTx(tx, userId, amount, type, description, paymentId));
}

export async function awardZenShards(
  userId: string,
  amount: number,
  type: ZenTransactionType,
  description?: string,
) {
  return prisma.$transaction((tx) => awardZenShardsTx(tx, userId, amount, type, description));
}

export async function spendZenCoins(
  userId: string,
  amount: number,
  type: ZenTransactionType,
  description?: string,
) {
  return prisma.$transaction((tx) => spendZenCoinsTx(tx, userId, amount, type, description));
}

export async function spendZenShards(
  userId: string,
  amount: number,
  type: ZenTransactionType,
  description?: string,
) {
  return prisma.$transaction((tx) => spendZenShardsTx(tx, userId, amount, type, description));
}

export async function awardDailyLoginShardsIfEligible(userId: string, now = new Date()) {
  const dayStart = utcDayStart(now);
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { lastDailyLoginAt: true },
    });
    if (!user) return { awarded: false as const };

    const alreadyAwarded =
      user.lastDailyLoginAt != null && user.lastDailyLoginAt.getTime() >= dayStart.getTime();
    if (alreadyAwarded) return { awarded: false as const };

    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        lastDailyLoginAt: now,
        zenShards: { increment: 2000 },
      },
      select: { zenShards: true },
    });

    await tx.zenTransaction.create({
      data: {
        userId,
        currency: "SHARDS",
        type: "SHARD_DAILY_LOGIN",
        amount: 2000,
        balanceAfter: updated.zenShards,
        description: "daily_login",
      },
    });

    return { awarded: true as const, balanceAfter: updated.zenShards };
  });
}

export async function disableExpiredProIfNeeded(userId: string, now = new Date()) {
  await prisma.user.updateMany({
    where: {
      id: userId,
      isPro: true,
      proExpiresAt: { not: null, lte: now },
    },
    data: {
      isPro: false,
    },
  });
}

