import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { Prisma } from "@prisma/client";
import { authenticateRequestWithRotation } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

type RouteParams = { params: Promise<{ id: string }> };

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

export async function PATCH(request: Request, context: RouteParams) {
  const { id } = await context.params;
  const adminId = await requireAdmin(request);
  if (!adminId) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const data: Prisma.AnnouncementUpdateInput = {};

  if (typeof o.isPinned === "boolean") data.isPinned = o.isPinned;
  if (typeof o.publishedAt === "string" && o.publishedAt) {
    data.publishedAt = new Date(o.publishedAt);
  }

  let translationRows: ReturnType<typeof parseTranslationRows> | null = null;
  if (Array.isArray(o.translations)) {
    const fallbackImage =
      typeof o.imageUrl === "string" && o.imageUrl.trim() ? o.imageUrl.trim() : null;
    translationRows = parseTranslationRows(o.translations, fallbackImage);
    if (translationRows.length === 0) {
      return NextResponse.json({ error: "MISSING_TRANSLATIONS" }, { status: 400 });
    }
  }

  if (Object.keys(data).length > 0) {
    await prisma.announcement.update({ where: { id }, data });
  }

  if (translationRows && translationRows.length > 0) {
    await prisma.announcementTranslation.deleteMany({ where: { announcementId: id } });
    await prisma.announcementTranslation.createMany({
      data: translationRows.map((r) => ({ ...r, announcementId: id })),
    });
  }

  const announcement = await prisma.announcement.findUnique({
    where: { id },
    include: { translations: true },
  });
  if (!announcement) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ announcement });
}

export async function DELETE(request: Request, context: RouteParams) {
  const { id } = await context.params;
  const adminId = await requireAdmin(request);
  if (!adminId) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  await prisma.announcement.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
