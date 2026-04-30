import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { CommunityRankingEntry, CommunityRankingsPayload } from "@/types/community-rankings";

function inferProPlan(
  isPro: boolean,
  proPlan: string | null
): "bronze" | "silver" | "gold" | "platinum" | null {
  if (!isPro || !proPlan) return null;
  const valid = ["bronze", "silver", "gold", "platinum"];
  return valid.includes(proPlan)
    ? (proPlan as "bronze" | "silver" | "gold" | "platinum")
    : "gold";
}

async function usersByIds(
  ids: string[],
  select: {
    id: true;
    name: true;
    image: true;
    username: true;
    isPro: true;
    proPlan: true;
  }
): Promise<
  Map<
    string,
    {
      id: string;
      name: string | null;
      image: string | null;
      username: string | null;
      isPro: boolean;
      proPlan: string | null;
    }
  >
> {
  if (ids.length === 0) {
    return new Map();
  }
  const rows = await prisma.user.findMany({
    where: { id: { in: ids } },
    select,
  });
  return new Map(rows.map((u) => [u.id, u]));
}

export async function GET() {
  try {
    const [readerGroups, donorRows, scanGroups] = await Promise.all([
      prisma.mangaProgress.groupBy({
        by: ["userId"],
        where: {
          lastChapterId: { not: null },
          user: { hideFromRankings: false },
        },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
      prisma.user.findMany({
        where: { hideFromRankings: false },
        orderBy: { zenPoints: "desc" },
        take: 10,
        select: {
          id: true,
          name: true,
          image: true,
          username: true,
          zenPoints: true,
          isPro: true,
          proPlan: true,
        },
      }),
      prisma.chapterUpload.groupBy({
        by: ["uploaderId"],
        where: {
          uploader: {
            role: { in: ["SCAN", "CREATOR"] },
            hideFromRankings: false,
          },
        },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
    ]);

    const readerIds = readerGroups.map((g) => g.userId);
    const scanIds = scanGroups.map((g) => g.uploaderId);
    const userMap = await usersByIds([...new Set([...readerIds, ...scanIds])], {
      id: true,
      name: true,
      image: true,
      username: true,
      isPro: true,
      proPlan: true,
    });

    const topReaders: CommunityRankingEntry[] = readerGroups.map((g) => {
      const u = userMap.get(g.userId);
      return {
        userId: g.userId,
        name: u?.name ?? null,
        image: u?.image ?? null,
        username: u?.username ?? null,
        count: g._count.id,
        isPro: u?.isPro ?? false,
        proPlan: inferProPlan(u?.isPro ?? false, u?.proPlan ?? null),
      };
    });

    const topDonors: CommunityRankingEntry[] = donorRows.map((u) => ({
      userId: u.id,
      name: u.name,
      image: u.image,
      username: u.username ?? null,
      count: u.zenPoints,
      isPro: u.isPro,
      proPlan: inferProPlan(u.isPro, u.proPlan),
    }));

    const topScans: CommunityRankingEntry[] = scanGroups.map((g) => {
      const u = userMap.get(g.uploaderId);
      return {
        userId: g.uploaderId,
        name: u?.name ?? null,
        image: u?.image ?? null,
        username: u?.username ?? null,
        count: g._count.id,
        isPro: u?.isPro ?? false,
        proPlan: inferProPlan(u?.isPro ?? false, u?.proPlan ?? null),
      };
    });

    const payload: CommunityRankingsPayload = {
      topReaders,
      topDonors,
      topScans,
    };

    return NextResponse.json(payload);
  } catch (e) {
    console.error("[community/rankings]", e);
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}


