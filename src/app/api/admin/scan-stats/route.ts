import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminJson } from "@/lib/admin-api-auth";
import type { AdminScanStatsListResponse, AdminScanStatsSortKey } from "@/types/admin-scan-stats";

export const runtime = "nodejs";

function parseSort(raw: string | null): AdminScanStatsSortKey {
  if (raw === "uploads" || raw === "zen") return raw;
  return "views";
}

function parseOrder(raw: string | null): "asc" | "desc" {
  return raw === "asc" ? "asc" : "desc";
}

export async function GET(request: Request) {
  const gate = await requireAdminJson(request);
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const sort = parseSort(searchParams.get("sort"));
  const order = parseOrder(searchParams.get("order"));
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();

  const scans = await prisma.user.findMany({
    where: { role: { in: ["SCAN", "CREATOR"] } },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      image: true,
      role: true,
      zenPoints: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const emailLowerById = new Map(scans.map((s) => [s.id, (s.email ?? "").toLowerCase()]));

  if (scans.length === 0) {
    const body: AdminScanStatsListResponse = { sort, order, query: q, rows: [] };
    return NextResponse.json(body);
  }

  const userIds = scans.map((u) => u.id);

  const uploads = await prisma.chapterUpload.findMany({
    where: { uploaderId: { in: userIds } },
    select: {
      uploaderId: true,
      chapterId: true,
      status: true,
      submittedAt: true,
    },
  });

  type Agg = {
    totalUploads: number;
    approvedUploads: number;
    rejectedUploads: number;
    chapterIds: Set<string>;
    lastUploadAt: Date | null;
  };

  const byUser = new Map<string, Agg>();
  for (const uid of userIds) {
    byUser.set(uid, {
      totalUploads: 0,
      approvedUploads: 0,
      rejectedUploads: 0,
      chapterIds: new Set(),
      lastUploadAt: null,
    });
  }

  for (const u of uploads) {
    const agg = byUser.get(u.uploaderId);
    if (!agg) continue;
    agg.totalUploads += 1;
    agg.chapterIds.add(u.chapterId);
    if (u.status === "APPROVED") agg.approvedUploads += 1;
    else if (u.status === "REJECTED") agg.rejectedUploads += 1;
    const t = u.submittedAt;
    if (!agg.lastUploadAt || t > agg.lastUploadAt) agg.lastUploadAt = t;
  }

  const allChapterIds = [...new Set(uploads.map((u) => u.chapterId))];
  const viewCountByChapter = new Map<string, number>();

  if (allChapterIds.length > 0) {
    const grouped = await prisma.mangaProgress.groupBy({
      by: ["lastChapterId"],
      where: { lastChapterId: { in: allChapterIds } },
      _count: { _all: true },
    });
    for (const row of grouped) {
      if (row.lastChapterId) {
        viewCountByChapter.set(row.lastChapterId, row._count._all);
      }
    }
  }

  const rows = scans.map((u) => {
    const agg = byUser.get(u.id)!;
    let totalViews = 0;
    for (const chId of agg.chapterIds) {
      totalViews += viewCountByChapter.get(chId) ?? 0;
    }
    return {
      id: u.id,
      name: u.name,
      username: u.username,
      image: u.image,
      role: u.role as "SCAN" | "CREATOR",
      totalUploads: agg.totalUploads,
      approvedUploads: agg.approvedUploads,
      rejectedUploads: agg.rejectedUploads,
      totalViews,
      zenPoints: u.zenPoints,
      lastUploadAt: agg.lastUploadAt?.toISOString() ?? null,
    };
  });

  const filtered = q
    ? rows.filter((r) => {
        const hay = `${(r.name ?? "").toLowerCase()} ${(r.username ?? "").toLowerCase()} ${emailLowerById.get(r.id) ?? ""}`;
        return hay.includes(q);
      })
    : rows;

  const mult = order === "asc" ? 1 : -1;
  filtered.sort((a, b) => {
    if (sort === "zen") return mult * (a.zenPoints - b.zenPoints);
    if (sort === "uploads") return mult * (a.totalUploads - b.totalUploads);
    return mult * (a.totalViews - b.totalViews);
  });

  const body: AdminScanStatsListResponse = {
    sort,
    order,
    query: q,
    rows: filtered,
  };

  return NextResponse.json(body);
}
