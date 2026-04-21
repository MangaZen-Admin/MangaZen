import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireScanAccess } from "@/lib/scan-access";

export const runtime = "nodejs";

/** Precios canónicos del boost; el cliente los recibe para no hardcodear. */
const BOOST_PRICES = {
  1: { coins: 500, shards: 50_000 },
  7: { coins: 2500, shards: 250_000 },
  30: { coins: 8000, shards: 800_000 },
} as const;

export async function GET() {
  const gate = await requireScanAccess(await headers());
  if (!gate.ok) return gate.response;

  const [user, mangas] = await Promise.all([
    prisma.user.findUnique({
      where: { id: gate.user.id },
      select: { zenCoins: true, zenShards: true },
    }),
    prisma.manga.findMany({
      where: {
        reviewStatus: "APPROVED",
        OR: [
          { uploaderId: gate.user.id },
          {
            chapters: {
              some: {
                uploads: {
                  some: { uploaderId: gate.user.id },
                },
              },
            },
          },
        ],
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        coverImage: true,
        boostExpiresAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    zenCoins: user?.zenCoins ?? 0,
    zenShards: user?.zenShards ?? 0,
    mangas: mangas.map((m) => ({
      id: m.id,
      slug: m.slug,
      title: m.title,
      coverImage: m.coverImage,
      boostExpiresAt: m.boostExpiresAt ? m.boostExpiresAt.toISOString() : null,
    })),
    prices: BOOST_PRICES,
  });
}

