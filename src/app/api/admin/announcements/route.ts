import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authenticateRequestWithRotation } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

async function requireAdmin(request: Request) {
  const cookieStore = await cookies();
  const { userId } = await authenticateRequestWithRotation(cookieStore, request.headers);
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!user || user.role !== "ADMIN") return null;
  return userId;
}

type TranslationIn = {
  locale?: unknown;
  title?: unknown;
  body?: unknown;
  imageUrl?: unknown;
};

function parseTranslationRows(
  translations: unknown,
  fallbackImage: string | null
): { locale: string; title: string; body: string; imageUrl: string | null }[] {
  if (!Array.isArray(translations)) return [];
  const rows: { locale: string; title: string; body: string; imageUrl: string | null }[] = [];
  for (const raw of translations) {
    const t = raw as TranslationIn;
    if (typeof t.locale !== "string" || !t.locale.trim()) continue;
    const title = typeof t.title === "string" ? t.title.trim() : "";
    const body = typeof t.body === "string" ? t.body.trim() : "";
    if (!title || !body) continue;
    const own =
      typeof t.imageUrl === "string" && t.imageUrl.trim() ? t.imageUrl.trim() : null;
    const imageUrl = own ?? fallbackImage;
    rows.push({ locale: t.locale.trim(), title, body, imageUrl });
  }
  return rows;
}

export async function GET(request: Request) {
  const adminId = await requireAdmin(request);
  if (!adminId) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const announcements = await prisma.announcement.findMany({
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
    include: { translations: true },
  });

  return NextResponse.json({ announcements });
}

export async function POST(request: Request) {
  const adminId = await requireAdmin(request);
  if (!adminId) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const isPinned = o.isPinned === true;
  const publishedAt =
    typeof o.publishedAt === "string" && o.publishedAt
      ? new Date(o.publishedAt)
      : undefined;
  const fallbackImage =
    typeof o.imageUrl === "string" && o.imageUrl.trim() ? o.imageUrl.trim() : null;

  const rows = parseTranslationRows(o.translations, fallbackImage);
  if (rows.length === 0) {
    return NextResponse.json({ error: "MISSING_TRANSLATIONS" }, { status: 400 });
  }

  const created = await prisma.announcement.create({
    data: {
      isPinned,
      ...(publishedAt ? { publishedAt } : {}),
    },
  });

  await prisma.announcementTranslation.createMany({
    data: rows.map((r) => ({ ...r, announcementId: created.id })),
  });

  const announcement = await prisma.announcement.findUnique({
    where: { id: created.id },
    include: { translations: true },
  });
  if (!announcement) {
    return NextResponse.json({ error: "CREATE_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ announcement });
}
