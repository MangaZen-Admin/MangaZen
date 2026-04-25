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

type MsgIn = { locale?: unknown; message?: unknown };

function parseMessages(translations: unknown) {
  if (!Array.isArray(translations)) return [];
  const rows: { locale: string; message: string }[] = [];
  for (const raw of translations) {
    const t = raw as MsgIn;
    if (typeof t.locale !== "string" || !t.locale.trim()) continue;
    const message = typeof t.message === "string" ? t.message.trim() : "";
    if (!message) continue;
    rows.push({ locale: t.locale.trim(), message });
  }
  return rows;
}

export async function GET(request: Request) {
  const adminId = await requireAdmin(request);
  if (!adminId) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const banner = await prisma.globalBanner.findFirst({
    orderBy: { createdAt: "desc" },
    include: { translations: true },
  });
  return NextResponse.json({ banner: banner ?? null });
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
  const type = ["info", "warning", "urgent"].includes(o.type as string)
    ? (o.type as string)
    : "info";
  const isDismissible = o.isDismissible !== false;
  const expiresAt =
    typeof o.expiresAt === "string" && o.expiresAt ? new Date(o.expiresAt) : null;

  const rows = parseMessages(o.translations);
  if (rows.length === 0) {
    return NextResponse.json({ error: "MISSING_MESSAGE" }, { status: 400 });
  }

  await prisma.globalBanner.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });

  const created = await prisma.globalBanner.create({
    data: {
      type,
      isDismissible,
      expiresAt,
      isActive: true,
    },
  });

  await prisma.globalBannerTranslation.createMany({
    data: rows.map((r) => ({ ...r, bannerId: created.id })),
  });

  const banner = await prisma.globalBanner.findUnique({
    where: { id: created.id },
    include: { translations: true },
  });
  if (!banner) {
    return NextResponse.json({ error: "CREATE_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ banner });
}

export async function DELETE(request: Request) {
  const adminId = await requireAdmin(request);
  if (!adminId) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  await prisma.globalBanner.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });

  return NextResponse.json({ ok: true });
}
